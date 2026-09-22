-- One database snapshot supplies the current book and effective history together.
alter function public.get_finances(uuid) stable;
alter function public.get_finance_history(uuid) stable;
create function public.get_finance_book(p_household_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_household uuid;
begin
  v_household := coalesce(p_household_id, (select household_id from public.household_members where user_id = auth.uid()));
  if not private.has_finance_access(v_household) then
    raise exception 'Finance access denied' using errcode = '42501';
  end if;
  return jsonb_build_object('current', private.finance_snapshot(v_household),
    'history', public.get_finance_history(v_household));
end;
$$;
revoke all on function public.get_finance_book(uuid) from public, anon, authenticated;
grant execute on function public.get_finance_book(uuid) to authenticated;
