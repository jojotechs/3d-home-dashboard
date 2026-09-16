import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';

test('module access belongs to the signed-in household member and never returns financial data', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const owner = randomUUID(), member = randomUUID(), unassigned = randomUUID(), household = randomUUID();
  await api.provision(owner, household);
  await api.db.query('insert into auth.users(id) values ($1),($2)', [member, unassigned]);
  await api.db.query('insert into public.household_members(household_id,user_id,display_name) values ($1,$2,$3)', [household, member, '家庭成员']);
  await api.rpc(owner, 'save_balance', [household, randomUUID(), '0', '私密余额', '123456', randomUUID()]);
  const adminAccess = await api.rpc(owner, 'get_access_context');
  assert.equal(adminAccess.user_id, owner); assert.equal(adminAccess.household_id, household);
  assert.equal(adminAccess.is_admin, true); assert.ok(adminAccess.modules.includes('finance'));
  const memberAccess = await api.rpc(member, 'get_access_context');
  assert.deepEqual(memberAccess, {user_id:member,household_id:household,household_name:'测试家庭',display_name:'家庭成员',is_admin:false,
    modules:['habits','home','health','learning','cars','chores','airport','rail','today']});
  assert.ok(!JSON.stringify(memberAccess).includes('123456'));
  await assert.rejects(api.rpc(member, 'get_finances'), {code:'42501'});
  assert.deepEqual((await api.rpc(unassigned, 'get_access_context')).modules, []);
  await assert.rejects(api.rpc(null, 'get_access_context'), {code:'42501'});
  await api.db.query('update public.household_members set finance_access=false where user_id=$1', [owner]);
  assert.ok(!(await api.rpc(owner, 'get_access_context')).modules.includes('finance'));
});
