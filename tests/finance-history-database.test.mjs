import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';

test('history retains the actor name and complete snapshots even after all entries are removed and the member renamed', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID(), id = randomUUID();
  await api.provision(actor, household);
  assert.deepEqual(await api.rpc(actor, 'get_finance_history', [household]), []);
  const first = await api.rpc(actor, 'save_finances', [household, JSON.stringify([{id,operation:'upsert',kind:'balance',name:'工资卡',amount_minor:'12345',expected_version:'0'}]), randomUUID()]);
  await api.rpc(actor, 'save_finances', [household, JSON.stringify([{id,operation:'remove',expected_version:'1'}]), randomUUID()]);
  await api.db.query('update public.household_members set display_name=$1 where user_id=$2', ['新的昵称',actor]);
  const history = await api.rpc(actor, 'get_finance_history', [household]);
  assert.equal(history.length, 2);
  assert.equal(history[0].actor_name, '管理员');
  assert.equal(history[1].actor_name, '管理员');
  assert.deepEqual(history[0].snapshot, first);
  assert.equal(history[1].snapshot.net_savings_minor, '0');
  assert.deepEqual(history[1].snapshot.entries, []);
  for (const user of [null, randomUUID()]) await assert.rejects(api.rpc(user,'get_finance_history',[household]), {code:'42501'});
});
