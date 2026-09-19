import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';

const put = (id, kind, name, amount, version = '0') => ({id, operation:'upsert', kind, name, amount_minor:amount, expected_version:version});
const save = (api, actor, household, changes, request = randomUUID()) => api.rpc(actor, 'save_finances', [household, JSON.stringify(changes), request]);
const remove = (id, version) => ({id, operation:'remove', expected_version:version});

test('one finance update saves multiple balances and positive debt as an exact complete household snapshot', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID();
  await api.provision(actor, household);
  const changes = [put(randomUUID(),'balance','银行','10001'), put(randomUUID(),'balance','支付宝 / 微信','20002'),
    put(randomUUID(),'balance','公积金','30003'), put(randomUUID(),'debt','房贷','70007')];
  const saved = await save(api, actor, household, changes);
  assert.equal(saved.net_savings_minor, '-10001');
  assert.equal(saved.version, '1');
  assert.equal(saved.entries.length, 4);
  for (const entry of saved.entries) {
    assert.equal(entry.created_by, actor); assert.equal(entry.updated_by, actor);
    assert.equal(entry.version, '1'); assert.equal(entry.updated_at, saved.saved_at);
  }
  assert.deepEqual(await api.rpc(actor, 'get_finances'), saved);
  const history = await api.rpc(actor, 'get_finance_history', [household]);
  assert.equal(history.length, 1); assert.deepEqual(history[0].snapshot, saved);
});

test('a member renames, adjusts and removes rows together without losing creators or earlier history', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const owner = randomUUID(), editor = randomUUID(), household = randomUUID(), bank = randomUUID(), debt = randomUUID();
  await api.provision(owner, household);
  await api.db.query('insert into auth.users(id) values ($1)', [editor]);
  await api.db.query('insert into public.household_members(household_id,user_id,display_name,finance_access) values ($1,$2,$3,true)', [household, editor, '共同编辑者']);
  const first = await save(api, owner, household, [put(bank,'balance','工资卡','10000'), put(debt,'debt','房贷','20000')]);
  const second = await save(api, editor, household, [put(bank,'balance','银行储蓄','9007199254740993','1'), remove(debt,'1')]);
  assert.equal(second.net_savings_minor, '9007199254740993');
  assert.equal(second.version, '2'); assert.equal(second.entries.length, 1);
  const entry = second.entries[0];
  assert.equal(entry.name, '银行储蓄'); assert.equal(entry.version, '2');
  assert.equal(entry.created_by, owner); assert.equal(entry.creator_name, '管理员');
  assert.equal(entry.updated_by, editor); assert.equal(entry.editor_name, '共同编辑者');
  assert.equal(entry.created_at, first.entries.find(row => row.id === bank).created_at);
  assert.equal(entry.updated_at, second.saved_at);
  const history = await api.rpc(editor, 'get_finance_history', [household]);
  assert.equal(history.length, 2); assert.equal(history[1].actor_id, editor);
  assert.deepEqual(history[0].snapshot, first); assert.deepEqual(history[1].snapshot, second);
});

test('a bad or stale row rejects the entire transfer without changing entries, versions or history', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID(), bank = randomUUID(), wallet = randomUUID();
  await api.provision(actor, household);
  const before = await save(api, actor, household, [put(bank,'balance','银行','10000'), put(wallet,'balance','微信','5000')]);
  const debit = put(bank,'balance','银行','9000','1');
  for (const amount of ['-1','1.5','NaN','Infinity','1e3','',null,100]) {
    await assert.rejects(save(api, actor, household, [debit, put(wallet,'balance','微信',amount,'1')]), {code:'22023'});
  }
  for (const bad of [put(randomUUID(),'debt','零负债','0'), {...debit, expected_version:null},
    {...debit, name:' '}, {...debit, operation:'unknown'}, {...debit, kind:'stock'}, {...debit, id:null}]) {
    await assert.rejects(save(api, actor, household, [debit, bad]), {code:'22023'});
  }
  for (const invalid of [null, {}, 'changes', [debit, {...debit, id:bank.toUpperCase()}]]) {
    await assert.rejects(save(api, actor, household, invalid), {code:'22023'});
  }
  await assert.rejects(save(api, actor, household, [debit, put(wallet,'balance','微信','6000','0')]), {code:'PT409'});
  assert.deepEqual(await api.rpc(actor, 'get_finances'), before);
  assert.equal((await api.rpc(actor, 'get_finance_history', [household])).length, 1);
  const retired = await save(api, actor, household, [remove(wallet,'1')]);
  await assert.rejects(save(api, actor, household, [debit, put(wallet,'balance','旧微信','5000')]), {code:'PT409'});
  assert.deepEqual(await api.rpc(actor, 'get_finances'), retired);
});

test('retries and unchanged saves create no extra history; patches keep unrelated newer rows', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID(), bank = randomUUID(), wallet = randomUUID();
  await api.provision(actor, household);
  const empty = await api.rpc(actor, 'get_finances');
  assert.deepEqual(await save(api, actor, household, []), empty);
  assert.equal((await api.rpc(actor, 'get_finance_history', [household])).length, 0);
  const initial = [put(bank,'balance','银行','10000'), put(wallet,'balance','微信','5000')], request = randomUUID();
  const first = await save(api, actor, household, initial, request);
  assert.deepEqual(await save(api, actor, household, initial, request), first);
  await assert.rejects(save(api, actor, household, [initial[0]], request), {code:'PT409'});
  assert.deepEqual(await save(api, actor, household, [put(bank,'balance',' 银行 ','10000','1')]), first);
  const walletChange = await save(api, actor, household, [put(wallet,'balance','微信','6000','1')]);
  const third = await save(api, actor, household, [put(bank,'balance','银行','9000','1')]);
  assert.equal(third.net_savings_minor, '15000'); assert.equal(third.version, '3');
  assert.deepEqual(third.entries.find(row => row.id === wallet), walletChange.entries.find(row => row.id === wallet));
  assert.deepEqual(await save(api, actor, household, initial, request), first);
  assert.deepEqual(await api.rpc(actor, 'get_finances'), third);
  assert.equal((await api.rpc(actor, 'get_finance_history', [household])).length, 3);
});

test('both save entry points enforce household access, immutable kinds and retired versions', async t => {
  const api = await financeDatabase(); t.after(() => api.db.close());
  const owner = randomUUID(), outsider = randomUUID(), deniedMember = randomUUID(), household = randomUUID(), other = randomUUID(), id = randomUUID();
  await api.provision(owner, household); await api.provision(outsider, other);
  await api.db.query('insert into auth.users(id) values ($1)', [deniedMember]);
  await api.db.query('insert into public.household_members(household_id,user_id,display_name) values ($1,$2,$3)', [household, deniedMember, '未授权成员']);
  const oldRequest = [household,id,'0','银行','10000',randomUUID()];
  const first = await api.rpc(owner, 'save_balance', oldRequest);
  for (const actor of [null, outsider, deniedMember]) {
    await assert.rejects(save(api, actor, household, [put(id,'balance','银行','1','1')]), {code:'42501'});
    await assert.rejects(save(api, actor, household, []), {code:'42501'});
  }
  await assert.rejects(save(api, outsider, other, [remove(id,'1')]), {code:'42501'});
  await assert.rejects(save(api, owner, household, [put(id,'debt','负债','1','1')]), {code:'22023'});
  const retired = await save(api, owner, household, [remove(id,'1')]);
  await assert.rejects(api.rpc(owner, 'save_balance', [household,id,'2','银行','10000',randomUUID()]), {code:'PT409'});
  assert.deepEqual(await api.rpc(owner, 'save_balance', oldRequest), first);
  assert.deepEqual(await api.rpc(owner, 'get_finances'), retired);
  const newId = randomUUID();
  const added = await api.rpc(owner, 'save_balance', [household,newId,'0','银行','10000',randomUUID()]);
  assert.deepEqual(await api.rpc(owner, 'save_balance', [household,newId,'1','银行','10000',randomUUID()]), added);
  assert.equal((await api.rpc(owner, 'get_finance_history', [household])).length, 3);
});
