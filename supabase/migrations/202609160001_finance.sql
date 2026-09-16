-- T01: all financial mutations enter through save_balance, one PostgreSQL transaction.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.households (
  id uuid primary key,
  name text not null check (length(btrim(name)) between 1 and 100),
  version bigint not null default 0 check (version >= 0),
  updated_at timestamptz
);
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id),
  user_id uuid unique references auth.users(id),
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  is_admin boolean not null default false,
  finance_access boolean not null default false
);
create index household_members_household_idx on public.household_members(household_id);
create table public.finance_entries (
  id uuid primary key,
  household_id uuid not null references public.households(id),
  kind text not null check (kind in ('balance', 'debt')),
  name text not null check (length(btrim(name)) between 1 and 100),
  amount_minor numeric not null check (amount_minor >= 0 and amount_minor = trunc(amount_minor) and amount_minor <> 'NaN'::numeric and amount_minor <> 'Infinity'::numeric),
  version bigint not null check (version > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index finance_entries_household_idx on public.finance_entries(household_id);
create table public.finance_updates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id),
  version bigint not null,
  actor_id uuid not null references auth.users(id),
  saved_at timestamptz not null,
  snapshot jsonb not null,
  unique(household_id, version)
);

create table private.finance_requests (
  household_id uuid not null references public.households(id),
  actor_id uuid not null references auth.users(id),
  request_id uuid not null,
  payload jsonb not null,
  response jsonb not null,
  primary key(household_id, actor_id, request_id)
);
alter table private.finance_requests enable row level security;
revoke all on private.finance_requests from public, anon, authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.finance_entries enable row level security;
alter table public.finance_updates enable row level security;
revoke all on public.households, public.household_members, public.finance_entries, public.finance_updates from public, anon, authenticated;
grant select on public.households, public.household_members, public.finance_entries, public.finance_updates to authenticated;

create function private.has_finance_access(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = auth.uid() and m.finance_access);
$$;
revoke all on function private.has_finance_access(uuid) from public, anon, authenticated;
grant execute on function private.has_finance_access(uuid) to authenticated;
create policy household_finance_read on public.households for select to authenticated
  using (private.has_finance_access(id));
create policy member_read on public.household_members for select to authenticated
  using (user_id = auth.uid() or private.has_finance_access(household_id));
create policy entry_finance_read on public.finance_entries for select to authenticated
  using (private.has_finance_access(household_id));
create policy history_finance_read on public.finance_updates for select to authenticated
  using (private.has_finance_access(household_id));

-- Internal formatter: integer amounts and versions travel as decimal strings in JSON.
create function private.finance_snapshot(p_household_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'household_id', h.id, 'household_name', h.name, 'version', h.version::text,
    'saved_at', h.updated_at,
    'net_savings_minor', coalesce((select sum(case when e.kind = 'debt' then -e.amount_minor else e.amount_minor end)
      from public.finance_entries e where e.household_id = h.id), 0)::text,
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'kind', e.kind, 'name', e.name, 'amount_minor', e.amount_minor::text,
      'version', e.version::text, 'created_by', e.created_by, 'updated_by', e.updated_by,
      'creator_name', creator.display_name, 'editor_name', editor.display_name,
      'created_at', e.created_at, 'updated_at', e.updated_at) order by e.created_at, e.id)
      from public.finance_entries e
      join public.household_members creator on creator.user_id = e.created_by
      join public.household_members editor on editor.user_id = e.updated_by
      where e.household_id = h.id), '[]'::jsonb))
  from public.households h where h.id = p_household_id;
$$;
revoke all on function private.finance_snapshot(uuid) from public, anon, authenticated;

create function public.get_finances(p_household_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_household uuid;
begin
  v_household := coalesce(p_household_id, (select m.household_id from public.household_members m where m.user_id = auth.uid()));
  if not private.has_finance_access(v_household) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  return private.finance_snapshot(v_household);
end;
$$;

create function public.get_finance_history(p_household_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'actor_id', u.actor_id,
    'saved_at', u.saved_at, 'version', u.version::text, 'snapshot', u.snapshot) order by u.version), '[]'::jsonb)
    from public.finance_updates u where u.household_id = p_household_id);
end;
$$;

create function public.save_balance(p_household_id uuid, p_entry_id uuid, p_expected_version bigint,
  p_name text, p_amount_minor text, p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_entry public.finance_entries;
  v_version bigint;
  v_now timestamptz := clock_timestamp();
  v_snapshot jsonb;
  v_request private.finance_requests;
  v_payload jsonb;
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  -- Serializes household snapshots; callers still compare the edited entry's version.
  perform 1 from public.households where id = p_household_id for update;
  if p_entry_id is null or p_request_id is null or p_expected_version is null or p_expected_version < 0
    or p_name is null or length(btrim(p_name)) not between 1 and 100
    or p_amount_minor is null or p_amount_minor !~ '^(0|[1-9][0-9]*)$' then
    raise exception 'Invalid balance' using errcode = '22023';
  end if;
  v_payload := jsonb_build_array(p_entry_id, p_expected_version::text, btrim(p_name), p_amount_minor);
  select * into v_request from private.finance_requests
    where household_id = p_household_id and actor_id = v_actor and request_id = p_request_id;
  if found then
    if v_request.payload <> v_payload then
      raise exception 'Retry key already used for a different balance' using errcode = 'PT409';
    end if;
    return v_request.response;
  end if;
  v_now := clock_timestamp();
  select * into v_entry from public.finance_entries where id = p_entry_id;
  if found then
    if v_entry.household_id <> p_household_id or v_entry.kind <> 'balance' then
      raise exception 'Finance access denied' using errcode = '42501';
    end if;
    if v_entry.version <> p_expected_version then
      raise exception 'Balance changed; reload before saving' using errcode = 'PT409';
    end if;
    update public.finance_entries set name = btrim(p_name), amount_minor = p_amount_minor::numeric,
      version = version + 1, updated_by = v_actor, updated_at = v_now where id = p_entry_id;
  else
    if p_expected_version <> 0 then
      raise exception 'Balance changed; reload before saving' using errcode = 'PT409';
    end if;
    insert into public.finance_entries(id, household_id, kind, name, amount_minor, version, created_by, updated_by, created_at, updated_at)
      values(p_entry_id, p_household_id, 'balance', btrim(p_name), p_amount_minor::numeric, 1, v_actor, v_actor, v_now, v_now);
  end if;
  update public.households set version = version + 1, updated_at = v_now where id = p_household_id returning version into v_version;
  v_snapshot := private.finance_snapshot(p_household_id);
  insert into public.finance_updates(household_id, version, actor_id, saved_at, snapshot)
    values (p_household_id, v_version, v_actor, v_now, v_snapshot);
  insert into private.finance_requests(household_id, actor_id, request_id, payload, response)
    values (p_household_id, v_actor, p_request_id, v_payload, v_snapshot);
  return v_snapshot;
end;
$$;

-- Privileged CLI only; no password or service credential belongs in the web bundle.
create function public.bootstrap_household(p_user_id uuid, p_household_id uuid, p_household_name text, p_admin_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  -- A deliberate repeat is safe; never promote or reassign an existing membership.
  if exists(select 1 from public.household_members where user_id = p_user_id) then
    if exists(select 1 from public.household_members where user_id = p_user_id and household_id = p_household_id and is_admin) then
      return p_household_id;
    end if;
    raise exception 'Identity already belongs to a household' using errcode = '23505';
  end if;
  insert into public.households(id, name) values (p_household_id, p_household_name);
  insert into public.household_members(household_id, user_id, display_name, is_admin, finance_access)
    values (p_household_id, p_user_id, p_admin_name, true, true);
  return p_household_id;
end;
$$;
revoke all on function public.get_finances(uuid), public.get_finance_history(uuid),
  public.save_balance(uuid, uuid, bigint, text, text, uuid), public.bootstrap_household(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.get_finances(uuid), public.get_finance_history(uuid),
  public.save_balance(uuid, uuid, bigint, text, text, uuid) to authenticated;
grant execute on function public.bootstrap_household(uuid, uuid, text, text) to service_role;
