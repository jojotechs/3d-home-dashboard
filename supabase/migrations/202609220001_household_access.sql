-- Household administration is independent of finance access and account creation.
create function private.require_household_admin(p_household uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.household_members where household_id=p_household and user_id=auth.uid() and is_admin) then
    raise exception '只有家庭管理员可以操作' using errcode='42501';
  end if;
end $$;
revoke all on function private.require_household_admin(uuid) from public,anon,authenticated;

create function public.get_household_members() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id=auth.uid();
  perform private.require_household_admin(h);
  return jsonb_build_object('household_id',h,'members',(select jsonb_agg(jsonb_build_object(
    'id',id,'display_name',display_name,'user_id',user_id,'is_admin',is_admin,'finance_access',finance_access
  ) order by is_admin desc,display_name,id) from public.household_members where household_id=h));
end $$;
create function public.add_household_member(p_household uuid,p_member uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.household_members;
begin
  perform private.require_household_admin(p_household);
  perform 1 from public.households where id=p_household for update;
  if p_member is null or p_name is null or length(btrim(p_name)) not between 1 and 100 then
    raise exception '请输入成员称呼' using errcode='22023';
  end if;
  select * into m from public.household_members where id=p_member;
  if found then
    if m.household_id<>p_household or m.display_name<>btrim(p_name) then
      raise exception '成员标识已使用，请刷新重试' using errcode='PT409';
    end if;
    return m.id;
  end if;
  insert into public.household_members(id,household_id,display_name) values(p_member,p_household,btrim(p_name));
  return p_member;
end $$;
create function public.set_finance_access(p_member uuid,p_allowed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid;
begin
  select household_id into h from public.household_members where id=p_member;
  perform private.require_household_admin(h);
  perform 1 from public.households where id=h for update;
  if p_allowed is null then raise exception '请选择财务权限' using errcode='22023'; end if;
  update public.household_members set finance_access=p_allowed where id=p_member;
end $$;
revoke all on function public.get_household_members(),public.add_household_member(uuid,uuid,text),public.set_finance_access(uuid,boolean) from public,anon,authenticated;
grant execute on function public.get_household_members(),public.add_household_member(uuid,uuid,text),public.set_finance_access(uuid,boolean) to authenticated;

create table private.household_invites (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id),
  member_id uuid not null references public.household_members(id), email text not null,
  token_hash text not null unique, actor_id uuid not null references auth.users(id), request_id uuid not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
  status text not null default 'pending' check(status in ('pending','accepted','revoked')),
  accepted_by uuid references auth.users(id), unique(actor_id,request_id)
);
alter table private.household_invites enable row level security;
revoke all on private.household_invites from public,anon,authenticated;
create function public.issue_household_invite(p_member uuid,p_email text,p_hash text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare m public.household_members; old private.household_invites; result uuid; mail text:=lower(btrim(p_email));
begin
  select * into m from public.household_members where id=p_member;
  perform private.require_household_admin(m.household_id);
  perform 1 from public.households where id=m.household_id for update;
  if mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_request is null then
    raise exception '请输入有效的邀请邮箱' using errcode='22023';
  end if;
  select * into old from private.household_invites where actor_id=auth.uid() and request_id=p_request;
  if found then
    if old.member_id<>p_member or old.email<>mail or old.token_hash<>p_hash then
      raise exception '重试标识已用于其他邀请' using errcode='PT409';
    end if;
    return old.id;
  end if;
  select * into m from public.household_members where id=p_member;
  if m.user_id is not null then raise exception '这位成员已有登录账号' using errcode='PT409'; end if;
  update private.household_invites set status='revoked' where household_id=m.household_id and status='pending' and (member_id=p_member or email=mail);
  insert into private.household_invites(household_id,member_id,email,token_hash,actor_id,request_id)
    values(m.household_id,p_member,mail,p_hash,auth.uid(),p_request) returning id into result;
  return result;
end $$;
create function public.accept_household_invite(p_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare i private.household_invites; mail text; existing public.household_members;
begin
  if auth.uid() is null then raise exception '请先登录受邀邮箱' using errcode='42501'; end if;
  select lower(email) into mail from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into i from private.household_invites where token_hash=p_hash;
  if not found then raise exception '邀请无效，请联系管理员重新发送' using errcode='PT410'; end if;
  if mail is null or mail<>i.email then raise exception '请使用收到邀请的邮箱登录' using errcode='42501'; end if;
  perform 1 from public.households where id=i.household_id for update;
  select * into i from private.household_invites where id=i.id for update;
  if i.status='accepted' and i.accepted_by=auth.uid() then return i.household_id; end if;
  if i.status<>'pending' or i.expires_at<=now() then
    raise exception '邀请已过期或已被替换，请联系管理员重新发送' using errcode='PT410';
  end if;
  select * into existing from public.household_members where user_id=auth.uid();
  if found then raise exception '这个账号已经加入家庭，不能重复绑定' using errcode='PT409'; end if;
  update public.household_members set user_id=auth.uid() where id=i.member_id and user_id is null;
  if not found then raise exception '这位成员已经绑定账号' using errcode='PT409'; end if;
  update private.household_invites set status='accepted',accepted_by=auth.uid() where id=i.id;
  return i.household_id;
end $$;
create or replace function public.get_household_members() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id=auth.uid();
  perform private.require_household_admin(h);
  return jsonb_build_object('household_id',h,'members',(select jsonb_agg(jsonb_build_object(
    'id',m.id,'display_name',m.display_name,'user_id',m.user_id,'is_admin',m.is_admin,'finance_access',m.finance_access,
    'invitation',(select jsonb_build_object('email',i.email,'expires_at',i.expires_at,
      'status',case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end)
      from private.household_invites i where i.member_id=m.id order by i.created_at desc,i.id limit 1)
  ) order by m.is_admin desc,m.display_name,m.id) from public.household_members m where m.household_id=h));
end $$;
revoke all on function public.issue_household_invite(uuid,text,text,uuid),public.accept_household_invite(text) from public,anon,authenticated;
grant execute on function public.issue_household_invite(uuid,text,text,uuid),public.accept_household_invite(text) to authenticated;

-- A server-only outbox makes email retries reuse the same auth link and provider idempotency key.
create table private.invite_deliveries (
 invite_id uuid primary key references private.household_invites(id) on delete cascade,
 href text, lease uuid, lease_until timestamptz, delivered_at timestamptz
);
alter table private.invite_deliveries enable row level security;
revoke all on private.invite_deliveries from public,anon,authenticated;
create function public.claim_household_delivery(p_invite uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare d private.invite_deliveries; token uuid; begin
 if not exists(select 1 from private.household_invites where id=p_invite and status='pending' and expires_at>now()) then raise exception using errcode='22023',message='邀请已失效，请重新邀请'; end if;
 insert into private.invite_deliveries(invite_id) values(p_invite) on conflict do nothing;
 select * into d from private.invite_deliveries where invite_id=p_invite for update;
 if d.delivered_at is not null then return jsonb_build_object('delivered',true); end if;
 if d.lease_until>now() then raise exception using errcode='PT409',message='邀请正在发送，请稍后重试'; end if;
 token:=gen_random_uuid();
 update private.invite_deliveries set lease=token,lease_until=now()+interval '60 seconds' where invite_id=p_invite;
 return jsonb_build_object('lease',token,'href',d.href,'delivered',false);
 end $$;
create function public.store_household_delivery(p_invite uuid,p_lease uuid,p_href text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if length(p_href)>6000 or p_href !~ '^https?://' then raise exception 'invalid delivery link'; end if;
 update private.invite_deliveries set href=p_href where invite_id=p_invite and lease=p_lease and lease_until>now() and delivered_at is null;
 if not found then raise exception 'delivery lease expired'; end if;
 end $$;
create function public.complete_household_delivery(p_invite uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 update private.invite_deliveries set delivered_at=now(),lease_until=null where invite_id=p_invite and lease=p_lease;
 if not found then raise exception 'delivery lease expired'; end if;
 end $$;
create function public.release_household_delivery(p_invite uuid,p_lease uuid) returns void language sql security definer set search_path='' as $$
 update private.invite_deliveries set lease_until=null where invite_id=p_invite and lease=p_lease;
 $$;
revoke all on function public.claim_household_delivery(uuid),public.store_household_delivery(uuid,uuid,text),public.complete_household_delivery(uuid,uuid),public.release_household_delivery(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_household_delivery(uuid),public.store_household_delivery(uuid,uuid,text),public.complete_household_delivery(uuid,uuid),public.release_household_delivery(uuid,uuid) to service_role;

-- App-wide entry permission checks must not fetch a financial snapshot.
-- The living districts remain demos available to household members; finance
-- retains its separate grant. Unknown/new modules are denied until added here.
create or replace function public.get_access_context() returns jsonb
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
      || case when m.finance_access then array['finance']::text[] else array[]::text[] end
      || case when m.is_admin then array['household']::text[] else array[]::text[] end))
    into v_context from public.household_members m
    join public.households h on h.id = m.household_id where m.user_id = v_actor;
  return coalesce(v_context, jsonb_build_object('user_id', v_actor, 'household_id', null,
    'household_name', null, 'display_name', null, 'is_admin', false, 'modules', '[]'::jsonb));
end;
$$;
revoke all on function public.get_access_context() from public, anon, authenticated;
grant execute on function public.get_access_context() to authenticated;
