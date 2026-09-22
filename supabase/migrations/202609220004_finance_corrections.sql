-- Effective snapshots stay in finance_updates; every correction retains an audit record.
alter table public.finance_updates add column revision bigint not null default 1 check (revision > 0);
create table private.finance_revisions (
  update_id uuid not null references public.finance_updates(id),
  revision bigint not null,
  actor_id uuid not null references auth.users(id),
  actor_name text not null,
  revised_at timestamptz not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  primary key(update_id, revision)
);
alter table private.finance_revisions enable row level security;
revoke all on private.finance_revisions from public, anon, authenticated;

create or replace function public.get_finance_history(p_household_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'actor_id', u.actor_id,
    'actor_name', u.actor_name, 'saved_at', u.saved_at, 'version', u.version::text,
    'snapshot', u.snapshot, 'revision', u.revision::text,
    'revisions', coalesce((select jsonb_agg(jsonb_build_object('revision', r.revision::text,
      'actor_id', r.actor_id, 'actor_name', r.actor_name, 'revised_at', r.revised_at) order by r.revision)
      from private.finance_revisions r where r.update_id = u.id), '[]'::jsonb)) order by u.version), '[]'::jsonb)
    from public.finance_updates u where u.household_id = p_household_id);
end;
$$;

create function public.correct_finance_history(p_household_id uuid, p_update_id uuid,
  p_expected_revision bigint, p_expected_book_version bigint, p_changes jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_update public.finance_updates;
  v_book_version bigint;
  v_request private.finance_requests;
  v_payload jsonb;
  v_change jsonb;
  v_entry jsonb;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_entries jsonb;
  v_snapshot jsonb;
  v_net numeric;
  v_latest boolean;
  v_changed boolean := false;
  v_now timestamptz;
  v_response jsonb;
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  select version into v_book_version from public.households where id = p_household_id for update;
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  if p_update_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision < 1
    or p_expected_book_version is null or p_expected_book_version < 0
    or jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'Invalid correction' using errcode = '22023';
  end if;
  v_payload := jsonb_build_object('correction',p_update_id,'revision',p_expected_revision::text,
    'book_version',p_expected_book_version::text,'changes',p_changes);
  select * into v_request from private.finance_requests
    where household_id=p_household_id and actor_id=v_actor and request_id=p_request_id;
  if found then
    if v_request.payload <> v_payload then
      raise exception 'Retry key already used for different changes' using errcode = 'PT409';
    end if;
    return v_request.response;
  end if;
  select * into v_update from public.finance_updates where id=p_update_id and household_id=p_household_id;
  if not found then raise exception 'Finance access denied' using errcode = '42501'; end if;
  if v_update.revision <> p_expected_revision or v_book_version <> p_expected_book_version then
    raise exception 'History or current book changed; review before correcting' using errcode = 'PT409';
  end if;
  v_latest := p_update_id = (select id from public.finance_updates where household_id=p_household_id order by version desc limit 1);
  v_entries := v_update.snapshot->'entries';
  -- Only amounts of existing historical rows may change. Names and creators remain historical.
  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) is distinct from 'object'
      or jsonb_typeof(v_change->'id') is distinct from 'string'
      or (v_change->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(v_change->'amount_minor') is distinct from 'string'
      or (v_change->>'amount_minor') !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Invalid correction amount' using errcode = '22023';
    end if;
    v_id := (v_change->>'id')::uuid;
    if v_id = any(v_ids) then raise exception 'Duplicate correction row' using errcode = '22023'; end if;
    v_ids := array_append(v_ids,v_id);
    select value into v_entry from jsonb_array_elements(v_entries) where value->>'id'=v_id::text;
    if not found or (v_entry->>'kind'='debt' and v_change->>'amount_minor'='0') then
      raise exception 'Invalid historical row' using errcode = '22023';
    end if;
    if v_entry->>'amount_minor' = v_change->>'amount_minor' then continue; end if;
    v_changed := true;
    select jsonb_agg(case when value->>'id'=v_id::text then jsonb_set(value,'{amount_minor}',v_change->'amount_minor') else value end order by ordinal)
      into v_entries from jsonb_array_elements(v_entries) with ordinality as row(value,ordinal);
  end loop;
  if v_changed then
    v_now := clock_timestamp();
    select coalesce(sum(case when value->>'kind'='debt' then -(value->>'amount_minor')::numeric else (value->>'amount_minor')::numeric end),0)
      into v_net from jsonb_array_elements(v_entries);
    v_snapshot := jsonb_set(jsonb_set(v_update.snapshot,'{entries}',v_entries),'{net_savings_minor}',to_jsonb(v_net::text));
    if v_latest then
      -- Same household lock as ordinary saves: correcting a formerly-latest record
      -- cannot race a new update and silently change its meaning.
      update public.finance_entries e set amount_minor=(row.value->>'amount_minor')::numeric,
        version=e.version+1, updated_by=v_actor, updated_at=v_now
        from jsonb_array_elements(v_entries) row(value)
        where e.household_id=p_household_id and e.id=(row.value->>'id')::uuid and e.removed_at is null
          and e.amount_minor <> (row.value->>'amount_minor')::numeric;
    end if;
    update public.finance_updates set snapshot=v_snapshot, revision=revision+1 where id=p_update_id;
    insert into private.finance_revisions(update_id,revision,actor_id,actor_name,revised_at,before_snapshot,after_snapshot)
      values(p_update_id,v_update.revision+1,v_actor,(select display_name from public.household_members where user_id=v_actor),v_now,v_update.snapshot,v_snapshot);
    -- The book token covers corrections too; old-history fixes keep current amounts/time intact.
    update public.households set version=version+1, updated_at=case when v_latest then v_now else updated_at end where id=p_household_id;
  end if;
  v_response := jsonb_build_object('update_id',p_update_id,'revision',(v_update.revision+case when v_changed then 1 else 0 end)::text,
    'current_changed',v_changed and v_latest);
  insert into private.finance_requests(household_id,actor_id,request_id,payload,response)
    values(p_household_id,v_actor,p_request_id,v_payload,v_response);
  return v_response;
end;
$$;
revoke all on function public.correct_finance_history(uuid,uuid,bigint,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.correct_finance_history(uuid,uuid,bigint,bigint,jsonb,uuid) to authenticated;
