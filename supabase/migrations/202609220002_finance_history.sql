-- Keep the display identity at the time of the update, including an empty book.
alter table public.finance_updates add column actor_name text;
update public.finance_updates u set actor_name = coalesce(
  (select e->>'editor_name' from jsonb_array_elements(u.snapshot->'entries') e
    where e->>'updated_by' = u.actor_id::text and e->>'updated_at' = u.snapshot->>'saved_at' limit 1),
  (select m.display_name from public.household_members m where m.user_id = u.actor_id));
alter table public.finance_updates alter column actor_name set not null;
create function private.stamp_finance_actor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actor_name := (select display_name from public.household_members where user_id = new.actor_id);
  return new;
end;
$$;
revoke all on function private.stamp_finance_actor() from public, anon, authenticated;
create trigger finance_update_actor before insert on public.finance_updates
  for each row execute function private.stamp_finance_actor();

create or replace function public.get_finance_history(p_household_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_finance_access(p_household_id) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'actor_id', u.actor_id,
    'actor_name', u.actor_name, 'saved_at', u.saved_at, 'version', u.version::text,
    'snapshot', u.snapshot) order by u.version), '[]'::jsonb)
    from public.finance_updates u where u.household_id = p_household_id);
end;
$$;
