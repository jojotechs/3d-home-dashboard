-- T02: changed rows, full history and the household version commit together.
-- Retain retired identities so a stale 'new row' request cannot resurrect them.
alter table public.finance_entries add column removed_at timestamptz;

create or replace function private.finance_snapshot(p_household_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'household_id', h.id, 'household_name', h.name, 'version', h.version::text,
    'saved_at', h.updated_at,
    'net_savings_minor', coalesce((select sum(case when e.kind = 'debt' then -e.amount_minor else e.amount_minor end)
      from public.finance_entries e where e.household_id = h.id and e.removed_at is null), 0)::text,
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'kind', e.kind, 'name', e.name, 'amount_minor', e.amount_minor::text,
      'version', e.version::text, 'created_by', e.created_by, 'updated_by', e.updated_by,
      'creator_name', creator.display_name, 'editor_name', editor.display_name,
      'created_at', e.created_at, 'updated_at', e.updated_at) order by e.created_at, e.id)
      from public.finance_entries e
      join public.household_members creator on creator.user_id = e.created_by
      join public.household_members editor on editor.user_id = e.updated_by
      where e.household_id = h.id and e.removed_at is null), '[]'::jsonb))
  from public.households h where h.id = p_household_id;
$$;

create function public.save_finances(p_household_id uuid, p_changes jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_change jsonb;
  v_now timestamptz;
  v_version bigint;
  v_snapshot jsonb;
  v_entry public.finance_entries;
  v_id uuid;
  v_expected bigint;
  v_ids uuid[] := '{}';
  v_changed boolean := false;
  v_request private.finance_requests;
  v_payload jsonb;
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  perform 1 from public.households where id = p_household_id for update;
  if p_request_id is null or jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'Invalid finance update' using errcode = '22023';
  end if;
  -- Validate the entire patch before applying it, including duplicate identities.
  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) is distinct from 'object'
      or jsonb_typeof(v_change->'id') is distinct from 'string'
      or (v_change->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(v_change->'expected_version') is distinct from 'string'
      or (v_change->>'expected_version') !~ '^(0|[1-9][0-9]*)$'
      or coalesce(v_change->>'operation', '') not in ('upsert', 'remove') then
      raise exception 'Invalid finance change' using errcode = '22023';
    end if;
    v_id := (v_change->>'id')::uuid;
    v_expected := (v_change->>'expected_version')::bigint;
    if v_id = any(v_ids) then
      raise exception 'Duplicate entry in update' using errcode = '22023';
    end if;
    v_ids := array_append(v_ids, v_id);
    if v_change->>'operation' = 'upsert' then
      if coalesce(v_change->>'kind', '') not in ('balance', 'debt')
        or jsonb_typeof(v_change->'name') is distinct from 'string'
        or length(btrim(v_change->>'name')) not between 1 and 100
        or jsonb_typeof(v_change->'amount_minor') is distinct from 'string'
        or (v_change->>'amount_minor') !~ '^(0|[1-9][0-9]*)$'
        or (v_change->>'kind' = 'debt' and v_change->>'amount_minor' = '0') then
        raise exception 'Invalid name or amount' using errcode = '22023';
      end if;
    end if;
  end loop;
  v_payload := jsonb_build_object('changes', p_changes);
  select * into v_request from private.finance_requests
    where household_id = p_household_id and actor_id = v_actor and request_id = p_request_id;
  if found then
    if v_request.payload <> v_payload then
      raise exception 'Retry key already used for different changes' using errcode = 'PT409';
    end if;
    return v_request.response;
  end if;
  v_now := clock_timestamp();
  for v_change in select value from jsonb_array_elements(p_changes) loop
    v_id := (v_change->>'id')::uuid;
    v_expected := (v_change->>'expected_version')::bigint;
    select * into v_entry from public.finance_entries where id = v_id;
    if found then
      if v_entry.household_id <> p_household_id then
        raise exception 'Finance access denied' using errcode = '42501';
      end if;
      if v_entry.version <> v_expected or v_entry.removed_at is not null then
        raise exception 'Entry changed; reload before saving' using errcode = 'PT409';
      end if;
      if v_change->>'operation' = 'remove' then
        update public.finance_entries set removed_at = v_now, version = version + 1,
          updated_by = v_actor, updated_at = v_now where id = v_id;
      else
        if v_entry.kind <> v_change->>'kind' then
          raise exception 'Entry kind cannot change' using errcode = '22023';
        end if;
        if v_entry.name = btrim(v_change->>'name') and v_entry.amount_minor = (v_change->>'amount_minor')::numeric then
          continue;
        end if;
        update public.finance_entries set name = btrim(v_change->>'name'), amount_minor = (v_change->>'amount_minor')::numeric,
          version = version + 1, updated_by = v_actor, updated_at = v_now where id = v_id;
      end if;
    else
      if v_expected <> 0 or v_change->>'operation' = 'remove' then
        raise exception 'Entry changed; reload before saving' using errcode = 'PT409';
      end if;
      insert into public.finance_entries(id, household_id, kind, name, amount_minor, version, created_by, updated_by, created_at, updated_at)
        values (v_id, p_household_id, v_change->>'kind', btrim(v_change->>'name'),
          (v_change->>'amount_minor')::numeric, 1, v_actor, v_actor, v_now, v_now);
    end if;
    v_changed := true;
  end loop;
  if v_changed then
    update public.households set version = version + 1, updated_at = v_now where id = p_household_id returning version into v_version;
  end if;
  v_snapshot := private.finance_snapshot(p_household_id);
  if v_changed then
    insert into public.finance_updates(household_id, version, actor_id, saved_at, snapshot)
      values (p_household_id, v_version, v_actor, v_now, v_snapshot);
  end if;
  insert into private.finance_requests(household_id, actor_id, request_id, payload, response)
    values (p_household_id, v_actor, p_request_id, v_payload, v_snapshot);
  return v_snapshot;
end;
$$;
revoke all on function public.save_finances(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_finances(uuid, jsonb, uuid) to authenticated;

-- Existing deployed tabs can still save one balance, through the same transaction.
-- Honor retry receipts written by T01 before delegating new requests.
create or replace function public.save_balance(p_household_id uuid, p_entry_id uuid, p_expected_version bigint,
  p_name text, p_amount_minor text, p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_request private.finance_requests;
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  perform 1 from public.households where id = p_household_id for update;
  select * into v_request from private.finance_requests
    where household_id = p_household_id and actor_id = auth.uid() and request_id = p_request_id;
  if found and jsonb_typeof(v_request.payload) = 'array' then
    if v_request.payload <> jsonb_build_array(p_entry_id, p_expected_version::text, btrim(p_name), p_amount_minor) then
      raise exception 'Retry key already used for a different balance' using errcode = 'PT409';
    end if;
    return v_request.response;
  end if;
  return public.save_finances(p_household_id, jsonb_build_array(jsonb_build_object(
    'id', p_entry_id, 'operation', 'upsert', 'expected_version', p_expected_version::text,
    'kind', 'balance', 'name', btrim(p_name), 'amount_minor', p_amount_minor)), p_request_id);
end;
$$;
