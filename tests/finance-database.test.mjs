import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';

test('administrator reads an empty household, saves a balance, and reads its exact confirmed history', async t => {
  const api = await financeDatabase();
  t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID(), entry = randomUUID();
  await api.provision(actor, household);
  const empty = await api.rpc(actor, 'get_finances');
  assert.deepEqual(empty.entries, []);
  assert.equal(empty.net_savings_minor, '0');
  assert.equal(empty.version, '0');
  assert.deepEqual(await api.rpc(actor, 'get_finance_history', [household]), []);
  const saved = await api.rpc(actor, 'save_balance', [household, entry, '0', '银行余额', '123456', randomUUID()]);
  assert.equal(saved.net_savings_minor, '123456');
  assert.equal(saved.entries[0].id, entry);
  assert.equal(saved.entries[0].created_by, actor);
  assert.equal(saved.entries[0].updated_by, actor);
  assert.equal(saved.entries[0].version, '1');
  assert.deepEqual(await api.rpc(actor, 'get_finances', [household]), saved);
  const history = await api.rpc(actor, 'get_finance_history', [household]);
  assert.equal(history.length, 1);
  assert.equal(history[0].actor_id, actor);
  assert.deepEqual(history[0].snapshot, saved);
});

test('retrying a confirmed request writes one history entry; stale edits and reused keys cannot overwrite it', async t => {
  const api = await financeDatabase();
  t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID(), entry = randomUUID();
  await api.provision(actor, household);
  const request = [household, entry, '0', '银行余额', '123456', randomUUID()];
  const saved = await api.rpc(actor, 'save_balance', request);
  assert.deepEqual(await api.rpc(actor, 'save_balance', request), saved);
  const reused = [...request]; reused[4] = '999999';
  await assert.rejects(api.rpc(actor, 'save_balance', reused), {code: 'PT409'});
  await assert.rejects(api.rpc(actor, 'save_balance', [...request.slice(0, 5), randomUUID()]), {code: 'PT409'});
  const changed = await api.rpc(actor, 'save_balance', [household, entry, '1', '工资卡', '9007199254740993', randomUUID()]);
  assert.equal(changed.entries[0].version, '2');
  assert.equal(changed.entries[0].created_by, actor);
  assert.equal(changed.net_savings_minor, '9007199254740993');
  assert.deepEqual(await api.rpc(actor, 'save_balance', request), saved);
  assert.deepEqual(await api.rpc(actor, 'get_finances', [household]), changed);
  assert.equal((await api.rpc(actor, 'get_finance_history', [household])).length, 2);
});

test('anonymous, other-household and unprivileged identities cannot read, write or bootstrap finances', async t => {
  const api = await financeDatabase();
  t.after(() => api.db.close());
  const owner = randomUUID(), outsider = randomUUID(), member = randomUUID();
  const household = randomUUID(), otherHousehold = randomUUID(), entry = randomUUID();
  await api.provision(owner, household); await api.provision(outsider, otherHousehold);
  await api.db.query('insert into auth.users(id) values ($1)', [member]);
  await api.db.query('insert into public.household_members(household_id,user_id,display_name) values ($1,$2,$3)', [household, member, '未授权成员']);
  const request = [household, entry, '0', '银行余额', '123456', randomUUID()];
  const saved = await api.rpc(owner, 'save_balance', request);
  for (const actor of [null, outsider, member]) {
    await assert.rejects(api.rpc(actor, 'get_finances', [household]), {code: '42501'});
    await assert.rejects(api.rpc(actor, 'get_finance_history', [household]), {code: '42501'});
    await assert.rejects(api.rpc(actor, 'save_balance', request), {code: '42501'});
    await assert.rejects(api.rpc(actor, 'bootstrap_household', [actor ?? randomUUID(), randomUUID(), '冒名家庭', '冒名管理员']), {code: '42501'});
  }
  await assert.rejects(api.rpc(outsider, 'save_balance', [otherHousehold, entry, '1', '偷换归属', '1', randomUUID()]), {code: '42501'});
  assert.deepEqual(await api.rpc(owner, 'get_finances', [household]), saved);
  for (const actor of [outsider, member]) {
    await api.db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor]);
      const rows = await tx.query('select * from public.finance_entries where household_id=$1', [household]);
      assert.deepEqual(rows.rows, []);
    });
  }
  await assert.rejects(api.db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [owner]);
    await tx.query('update public.finance_entries set amount_minor=1 where id=$1', [entry]);
  }), {code: '42501'});
});

test('invalid submissions are atomic and an authorized editor never becomes the original creator', async t => {
  const api = await financeDatabase();
  t.after(() => api.db.close());
  const owner = randomUUID(), editor = randomUUID(), household = randomUUID(), entry = randomUUID();
  await api.provision(owner, household);
  await api.db.query('insert into auth.users(id) values ($1)', [editor]);
  await api.db.query('insert into public.household_members(household_id,user_id,display_name,finance_access) values ($1,$2,$3,true)', [household, editor, '共同编辑者']);
  const saved = await api.rpc(owner, 'save_balance', [household, entry, '0', '工资卡', '123456', randomUUID()]);
  for (const invalid of ['-1', '1.5', 'NaN', 'Infinity', '1e9', '']) {
    await assert.rejects(api.rpc(editor, 'save_balance', [household, entry, '1', '工资卡', invalid, randomUUID()]), {code: '22023'});
  }
  assert.deepEqual(await api.rpc(owner, 'get_finances', [household]), saved);
  assert.equal((await api.rpc(owner, 'get_finance_history', [household])).length, 1);
  const changed = await api.rpc(editor, 'save_balance', [household, entry, '1', '工资卡', '0', randomUUID()]);
  assert.equal(changed.entries[0].created_by, owner);
  assert.equal(changed.entries[0].updated_by, editor);
  assert.equal(changed.entries[0].creator_name, '管理员');
  assert.equal(changed.entries[0].editor_name, '共同编辑者');
  assert.equal(changed.net_savings_minor, '0');
  const history = await api.rpc(owner, 'get_finance_history', [household]);
  assert.equal(history[0].snapshot.entries[0].amount_minor, '123456');
  assert.equal(history[1].actor_id, editor);
});
