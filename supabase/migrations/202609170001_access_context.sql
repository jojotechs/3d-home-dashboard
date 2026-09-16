-- App-wide entry permission checks must not fetch a financial snapshot.
-- The living districts remain demos available to household members; finance
-- retains its separate grant. Unknown/new modules are denied until added here.
create function public.get_access_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_context jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'user_id', v_actor, 'household_id', m.household_id, 'household_name', h.name,
    'display_name', m.display_name, 'is_admin', m.is_admin,
    'modules', to_jsonb(array['habits','home','health','learning','cars','chores','airport','rail','today']::text[]
      || case when m.finance_access then array['finance']::text[] else array[]::text[] end))
    into v_context from public.household_members m
    join public.households h on h.id = m.household_id where m.user_id = v_actor;
  return coalesce(v_context, jsonb_build_object('user_id', v_actor, 'household_id', null,
    'household_name', null, 'display_name', null, 'is_admin', false, 'modules', '[]'::jsonb));
end;
$$;
revoke all on function public.get_access_context() from public, anon, authenticated;
grant execute on function public.get_access_context() to authenticated;
