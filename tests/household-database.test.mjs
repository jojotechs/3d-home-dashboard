import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';

test('only the household administrator manages independent members and finance grants', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const owner = randomUUID(), household = randomUUID(), member = randomUUID(), outsider = randomUUID();
  await api.provision(owner, household);
  await api.provision(outsider, randomUUID());
  await api.rpc(owner, 'add_household_member', [household, member, '家人']);
  let roster = await api.rpc(owner, 'get_household_members');
  assert.equal(roster.members.find(m => m.id === member).user_id, null);
  await api.rpc(owner, 'set_finance_access', [member, true]);
  roster = await api.rpc(owner, 'get_household_members');
  assert.equal(roster.members.find(m => m.id === member).finance_access, true);
  await assert.rejects(api.rpc(outsider, 'set_finance_access', [member, false]), {code:'42501'});
  await assert.rejects(api.rpc(null, 'get_household_members'), {code:'42501'});
  await assert.rejects(api.rpc(outsider, 'add_household_member', [household, randomUUID(), '伪造']), {code:'42501'});
});

test('email-bound invitations attach the existing member once and cannot be claimed by another identity', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const owner=randomUUID(), household=randomUUID(), member=randomUUID(), invited=randomUUID(), other=randomUUID();
  await api.provision(owner,household);
  await api.db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'family@example.com',now()),($2,'other@example.com',now())",[invited,other]);
  await api.rpc(owner,'add_household_member',[household,member,'原家庭成员']);
  const hash=createHash('sha256').update('a'.repeat(64)).digest('hex'), request=randomUUID();
  const invitation=await api.rpc(owner,'issue_household_invite',[member,'Family@example.com',hash,request]);
  assert.equal(await api.rpc(owner,'issue_household_invite',[member,'family@example.com',hash,request]),invitation);
  await assert.rejects(api.rpc(other,'accept_household_invite',[hash]),{code:'42501'});
  await assert.rejects(api.rpc(null,'accept_household_invite',[hash]),{code:'42501'});
  assert.equal(await api.rpc(invited,'accept_household_invite',[hash]),household);
  assert.equal(await api.rpc(invited,'accept_household_invite',[hash]),household);
  assert.equal((await api.rpc(invited,'get_access_context')).display_name,'原家庭成员');
  await assert.rejects(api.rpc(invited,'get_finances'),{code:'42501'});
  await assert.rejects(api.rpc(invited,'set_finance_access',[member,true]),{code:'42501'});
  await api.rpc(owner,'set_finance_access',[member,true]);
  const entry=randomUUID();
  await api.rpc(invited,'save_balance',[household,entry,'0','共同储蓄','12345',randomUUID()]);
  await api.rpc(owner,'set_finance_access',[member,false]);
  await assert.rejects(api.rpc(invited,'get_finances'),{code:'42501'});
  await assert.rejects(api.rpc(invited,'get_finance_history',[household]),{code:'42501'});
  await assert.rejects(api.rpc(invited,'save_balance',[household,entry,'1','共同储蓄','99999',randomUUID()]),{code:'42501'});
  assert.equal((await api.rpc(owner,'get_finances')).entries[0].created_by,invited);
  assert.equal((await api.rpc(owner,'get_finance_history',[household]))[0].actor_id,invited);
});

test('resending replaces the old invitation and expired invitations cannot bind a member', async t => {
  const api=await financeDatabase(); t.after(()=>api.db.close());
  const owner=randomUUID(),household=randomUUID(),member=randomUUID(),invited=randomUUID();
  await api.provision(owner,household);
  await api.db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'family@example.com',now())",[invited]);
  await api.rpc(owner,'add_household_member',[household,member,'家人']);
  const issue=hash=>api.rpc(owner,'issue_household_invite',[member,'family@example.com',hash,randomUUID()]);
  const first=await issue('1'.repeat(64));
  await api.db.query("update private.household_invites set expires_at=now()-interval '1 day' where id=$1",[first]);
  await assert.rejects(api.rpc(invited,'accept_household_invite',['1'.repeat(64)]),{code:'PT410'});
  assert.equal((await api.rpc(owner,'get_household_members')).members.find(m=>m.id===member).invitation.status,'expired');
  await issue('2'.repeat(64)); await issue('3'.repeat(64));
  await assert.rejects(api.rpc(invited,'accept_household_invite',['2'.repeat(64)]),{code:'PT410'});
  assert.equal(await api.rpc(invited,'accept_household_invite',['3'.repeat(64)]),household);
});
