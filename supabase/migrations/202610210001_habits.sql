-- H01: personal daily habits. All business access goes through the two public RPCs.
-- The production clock cannot be overridden by an authenticated request.
create function private.habit_now() returns timestamptz
language sql volatile set search_path = '' as $$ select clock_timestamp() $$;
revoke all on function private.habit_now() from public, anon, authenticated;

create table private.farm_accounts (
  member_id uuid primary key references public.household_members(id),
  household_id uuid not null references public.households(id),
  owner_user_id uuid not null references auth.users(id),
  version bigint not null default 0 check (version >= 0),
  coins bigint not null default 0 check (coins >= 0)
);
alter table private.farm_accounts enable row level security;
revoke all on private.farm_accounts from public, anon, authenticated;

-- Stable catalog identities are independent of habit IDs and presentation slots.
create table private.farm_species (
  id text primary key, seed_item text not null, product_item text not null,
  growth_cost integer not null check (growth_cost > 0)
);
insert into private.farm_species values ('daisy','daisy_seed','daisy_bouquet',3);
create table private.farm_inventory (
  member_id uuid not null references private.farm_accounts(member_id), item_id text not null,
  quantity bigint not null default 0 check (quantity between 0 and 9007199254740991),
  primary key (member_id,item_id)
);
alter table private.farm_species enable row level security;
alter table private.farm_inventory enable row level security;
revoke all on private.farm_species, private.farm_inventory from public, anon, authenticated;

create table private.habits (
  id uuid primary key,
  member_id uuid not null references private.farm_accounts(member_id),
  name text not null check (length(name) between 1 and 100),
  start_day date not null,
  created_at timestamptz not null,
  created_order bigint not null,
  version bigint not null default 1,
  unallocated_growth bigint not null default 0 check (unallocated_growth >= 0),
  species_id text references private.farm_species(id),
  cycle_active boolean not null default false,
  cycle_growth integer not null default 0 check (cycle_growth between 0 and 2),
  ready bigint not null default 0 check (ready >= 0),
  waiting_since timestamptz,
  unique(member_id,created_order)
);
create table private.habit_receipts (
  member_id uuid not null references private.farm_accounts(member_id),
  request_id uuid not null,
  action jsonb not null,
  response jsonb not null,
  primary key (member_id, request_id)
);
alter table private.habits enable row level security;
alter table private.habit_receipts enable row level security;
revoke all on private.habits, private.habit_receipts from public, anon, authenticated;

create table private.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references private.habits(id),
  habit_day date not null,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null,
  undo_until timestamptz not null,
  undone_at timestamptz,
  growth_granted boolean not null default false
);
create unique index habit_one_active_completion on private.habit_entries(habit_id,habit_day) where undone_at is null;
alter table private.habit_entries enable row level security;
revoke all on private.habit_entries from public, anon, authenticated;

-- Apply only already-granted credits. Completing a round enters the global seed queue.
create function private.advance_habit_round(p_habit uuid, p_at timestamptz) returns void
language plpgsql set search_path = '' as $$
declare h private.habits; cost integer; used integer;
begin
  select * into h from private.habits where id=p_habit;
  if not h.cycle_active or h.unallocated_growth=0 then return; end if;
  select growth_cost into cost from private.farm_species where id=h.species_id;
  used := least(h.unallocated_growth,cost-h.cycle_growth);
  if h.cycle_growth+used=cost then
    update private.habits set unallocated_growth=unallocated_growth-used,
      cycle_growth=0,cycle_active=false,ready=ready+1,waiting_since=p_at where id=p_habit;
  else
    update private.habits set unallocated_growth=unallocated_growth-used,cycle_growth=cycle_growth+used where id=p_habit;
  end if;
end $$;
revoke all on function private.advance_habit_round(uuid,timestamptz) from public, anon, authenticated;

create function private.allocate_habit_seeds(p_member uuid, p_at timestamptz) returns void
language plpgsql set search_path = '' as $$
declare target record;
begin
  loop
    select h.id,s.seed_item into target from private.habits h
      join private.farm_species s on s.id=h.species_id
      join private.farm_inventory i on i.member_id=h.member_id and i.item_id=s.seed_item
      where h.member_id=p_member and not h.cycle_active and h.waiting_since is not null and i.quantity>0
      order by h.waiting_since,h.created_order limit 1;
    exit when not found;
    update private.farm_inventory set quantity=quantity-1 where member_id=p_member and item_id=target.seed_item;
    update private.habits set cycle_active=true,cycle_growth=0,waiting_since=null where id=target.id;
    perform private.advance_habit_round(target.id,p_at);
  end loop;
end $$;
revoke all on function private.allocate_habit_seeds(uuid,timestamptz) from public, anon, authenticated;

create function private.settle_habit_growth(p_member uuid, p_now timestamptz) returns void
language plpgsql set search_path = '' as $$
declare e record;
begin
  for e in select r.* from private.habit_entries r join private.habits h on h.id=r.habit_id
    where h.member_id=p_member and r.undone_at is null and not r.growth_granted and r.undo_until<=p_now
    order by r.undo_until,h.created_order,r.id
  loop
    update private.habit_entries set growth_granted=true where id=e.id;
    update private.habits set unallocated_growth=unallocated_growth+1 where id=e.habit_id;
    perform private.advance_habit_round(e.habit_id,e.undo_until);
    perform private.allocate_habit_seeds(p_member,e.undo_until);
    update private.farm_accounts set version=version+1 where member_id=p_member;
  end loop;
end $$;
revoke all on function private.settle_habit_growth(uuid,timestamptz) from public, anon, authenticated;

-- The member row is the serialization boundary, including authorization changes.
create function private.require_habit_member(p_household_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m uuid;
begin
  if auth.uid() is null then raise exception 'HABIT_AUTH_REQUIRED'; end if;
  -- Household administration locks household then member. Keep that order while
  -- allowing other members' farms to proceed concurrently under a shared lock.
  perform 1 from public.households h where h.id=p_household_id and exists(
    select 1 from public.household_members where household_id=h.id and user_id=auth.uid()) for key share;
  if not found then raise exception 'HABIT_ACCESS_DENIED'; end if;
  select id into m from public.household_members
    where household_id = p_household_id and user_id = auth.uid() for update;
  if m is null then raise exception 'HABIT_ACCESS_DENIED'; end if;
  insert into private.farm_accounts(member_id, household_id, owner_user_id) values (m, p_household_id, auth.uid())
    on conflict (member_id) do nothing;
  if not exists(select 1 from private.farm_accounts where member_id=m
    and household_id=p_household_id and owner_user_id=auth.uid()) then
    raise exception 'HABIT_ACCESS_DENIED';
  end if;
  return m;
end $$;
revoke all on function private.require_habit_member(uuid) from public, anon, authenticated;

create function private.personal_farm_snapshot(p_member uuid, p_now timestamptz) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('server_now', p_now,
    'habit_day', (p_now at time zone 'Asia/Shanghai' - interval '4 hours')::date,
    'household_id', household_id, 'member_id', member_id, 'version', version,
    'coins', coins, 'inventory', jsonb_build_object(
      'daisy_seeds', coalesce((select quantity from private.farm_inventory where member_id=p_member and item_id='daisy_seed'),0),
      'daisy_bouquets', coalesce((select quantity from private.farm_inventory where member_id=p_member and item_id='daisy_bouquet'),0)),
    'animals', '[]'::jsonb, 'facilities', '[]'::jsonb, 'habits', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'visibility', 'private',
        'schedule', 'daily', 'start_day', h.start_day, 'created_at', h.created_at,
        'created_order', h.created_order, 'version', h.version, 'entries', coalesce((
          select jsonb_agg(jsonb_build_object('id', e.id, 'habit_day', e.habit_day,
            'recorded_at', e.recorded_at, 'undo_until', e.undo_until, 'undone_at', e.undone_at,
            'growth_granted', e.growth_granted) order by e.recorded_at,e.id)
          from private.habit_entries e where e.habit_id=h.id), '[]'::jsonb),
        'today', jsonb_build_object('completed', exists(select 1 from private.habit_entries e
          where e.habit_id=h.id and e.undone_at is null
            and e.habit_day=(p_now at time zone 'Asia/Shanghai' - interval '4 hours')::date),
          'can_record', not exists(select 1 from private.habit_entries e where e.habit_id=h.id and e.undone_at is null
            and e.habit_day=(p_now at time zone 'Asia/Shanghai' - interval '4 hours')::date)),
        'pending_growth', (select count(*) from private.habit_entries e where e.habit_id=h.id
          and e.undone_at is null and not e.growth_granted),
        'plot', jsonb_build_object('species_id', h.species_id, 'status', case when h.species_id is null then 'unplanted'
          when h.cycle_active then 'growing' else 'waiting' end, 'growth', h.cycle_growth,
          'unallocated_growth', h.unallocated_growth, 'ready', h.ready, 'waiting_since', h.waiting_since)) order by h.created_order)
      from private.habits h where h.member_id = p_member), '[]'::jsonb))
  from private.farm_accounts where member_id = p_member;
$$;
revoke all on function private.personal_farm_snapshot(uuid,timestamptz) from public, anon, authenticated;

create function public.get_personal_farm(p_household_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m uuid; n timestamptz;
begin
  m := private.require_habit_member(p_household_id);
  n := private.habit_now();
  perform private.settle_habit_growth(m,n);
  return private.personal_farm_snapshot(m, n);
end $$;
revoke all on function public.get_personal_farm(uuid) from public, anon, authenticated;
grant execute on function public.get_personal_farm(uuid) to authenticated;

create function public.apply_habit_action(p_household_id uuid, p_request_id uuid, p_action jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m uuid; n timestamptz; d date; kind text; old private.habit_receipts;
  habit uuid; entry uuid; result jsonb; response jsonb; allowed text[]; e private.habit_entries; qty bigint; product text; habit_name text;
begin
  m := private.require_habit_member(p_household_id);
  n := private.habit_now();
  d := (n at time zone 'Asia/Shanghai' - interval '4 hours')::date;
  if p_request_id is null or p_action is null or jsonb_typeof(p_action) <> 'object' then
    raise exception 'HABIT_INVALID_INPUT';
  end if;
  select * into old from private.habit_receipts where member_id = m and request_id = p_request_id;
  if found then
    if old.action <> p_action then raise exception 'HABIT_REQUEST_MISMATCH'; end if;
    return old.response;
  end if;
  kind := p_action ->> 'type';
  if kind is null or kind not in ('create','record','undo','claim_seeds','plant','collect') then raise exception 'HABIT_INVALID_ACTION'; end if;
  allowed := case kind when 'create' then array['type','id','name','habit_day']
    when 'claim_seeds' then array['type','quantity','habit_day']
    when 'collect' then array['type','habit_id']
    when 'undo' then array['type','entry_id'] else array['type','habit_id','habit_day'] end;
  if (p_action - allowed) <> '{}'::jsonb then
    raise exception 'HABIT_INVALID_INPUT';
  end if;
  if kind not in ('undo','collect') then
    if jsonb_typeof(p_action->'habit_day') is distinct from 'string'
      or (p_action->>'habit_day') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'HABIT_INVALID_INPUT'; end if;
    if p_action->>'habit_day' <> d::text then raise exception 'HABIT_REQUEST_EXPIRED'; end if;
  end if;
  perform private.settle_habit_growth(m,n);
  if kind='create' then
    habit_name := regexp_replace(p_action->>'name','^\s+|\s+$','','g');
    if jsonb_typeof(p_action->'id') is distinct from 'string'
    or (p_action->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_action->'name') is distinct from 'string'
    or length(habit_name) not between 1 and 100 then
    raise exception 'HABIT_INVALID_INPUT';
    end if;
    habit := (p_action->>'id')::uuid;
    if exists(select 1 from private.habits where id = habit) then raise exception 'HABIT_INVALID_INPUT'; end if;
    insert into private.habits(id, member_id, name, start_day, created_at, created_order)
      values(habit, m, habit_name, d, n,
        (select coalesce(max(created_order),0)+1 from private.habits where member_id=m));
    result := jsonb_build_object('habit_id', habit);
  elsif kind='claim_seeds' then
    if jsonb_typeof(p_action->'quantity') is distinct from 'number'
      or (p_action->>'quantity') !~ '^[1-9][0-9]*$'
      or (p_action->>'quantity')::numeric > 9007199254740991 then raise exception 'HABIT_INVALID_INPUT'; end if;
    qty := (p_action->>'quantity')::bigint;
    if qty + coalesce((select quantity from private.farm_inventory where member_id=m and item_id='daisy_seed'),0)
      > 9007199254740991 then raise exception 'HABIT_INVALID_INPUT'; end if;
    insert into private.farm_inventory(member_id,item_id,quantity) values(m,'daisy_seed',qty)
      on conflict(member_id,item_id) do update set quantity=private.farm_inventory.quantity+excluded.quantity;
    perform private.allocate_habit_seeds(m,n);
    result := jsonb_build_object('quantity',qty);
  elsif kind='undo' then
    if jsonb_typeof(p_action->'entry_id') is distinct from 'string'
      or (p_action->>'entry_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'HABIT_INVALID_INPUT';
    end if;
    select r.* into e from private.habit_entries r join private.habits h on h.id=r.habit_id
      where r.id=(p_action->>'entry_id')::uuid and h.member_id=m;
    if not found then raise exception 'HABIT_NOT_FOUND'; end if;
    if n>=e.undo_until then raise exception 'HABIT_UNDO_EXPIRED'; end if;
    update private.habit_entries set undone_at=coalesce(undone_at,n) where id=e.id;
    result := jsonb_build_object('habit_id',e.habit_id,'entry_id',e.id);
  else
    if jsonb_typeof(p_action->'habit_id') is distinct from 'string'
      or (p_action->>'habit_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'HABIT_INVALID_INPUT';
    end if;
    habit := (p_action->>'habit_id')::uuid;
    if not exists(select 1 from private.habits where id=habit and member_id=m) then raise exception 'HABIT_NOT_FOUND'; end if;
    if kind='plant' then
      if exists(select 1 from private.habits where id=habit and species_id is not null) then raise exception 'HABIT_ALREADY_PLANTED'; end if;
      update private.farm_inventory set quantity=quantity-1 where member_id=m and item_id='daisy_seed' and quantity>0;
      if not found then raise exception 'HABIT_SEEDS_REQUIRED'; end if;
      update private.habits set species_id='daisy',cycle_active=true where id=habit;
      perform private.advance_habit_round(habit,n);
      perform private.allocate_habit_seeds(m,n);
      result := jsonb_build_object('habit_id',habit);
    elsif kind='collect' then
      select h.ready,s.product_item into qty,product from private.habits h
        left join private.farm_species s on s.id=h.species_id where h.id=habit;
      if qty>0 then
        insert into private.farm_inventory(member_id,item_id,quantity) values(m,product,qty)
          on conflict(member_id,item_id) do update set quantity=private.farm_inventory.quantity+excluded.quantity;
        update private.habits set ready=0 where id=habit;
      end if;
      result := jsonb_build_object('habit_id',habit,'quantity',qty);
    else
      if exists(select 1 from private.habit_entries where habit_id=habit and habit_day=d and undone_at is null) then
        raise exception 'HABIT_ALREADY_RECORDED';
      end if;
      insert into private.habit_entries(habit_id,habit_day,recorded_by,recorded_at,undo_until)
        values(habit,d,auth.uid(),n,n+interval '30 seconds') returning id into entry;
      result := jsonb_build_object('habit_id',habit,'entry_id',entry);
    end if;
  end if;
  update private.farm_accounts set version = version + 1 where member_id = m;
  response := private.personal_farm_snapshot(m,n) || jsonb_build_object('receipt', jsonb_build_object(
    'request_id', p_request_id, 'type', kind, 'habit_day', d, 'applied_at', n, 'result', result));
  insert into private.habit_receipts(member_id,request_id,action,response) values(m,p_request_id,p_action,response);
  return response;
end $$;
revoke all on function public.apply_habit_action(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.apply_habit_action(uuid,uuid,jsonb) to authenticated;
