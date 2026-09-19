import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const required = name => {assert.ok(process.env[name], `Missing ${name}; use the designated T02 test household.`); return process.env[name];};
assert.equal(required('TEST_ALLOW_WRITES'), 'true');
const household = required('TEST_HOUSEHOLD_ID');
const makeClient = () => createClient(required('SUPABASE_URL'), required('SUPABASE_PUBLISHABLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}});
const result = async promise => {const {data,error} = await promise; assert.equal(error,null); return data;};
const reject = async (promise, code) => {const {error} = await promise; assert.ok(error); assert.equal(error.code,code);};
const put = (id,kind,name,amount,version='0') => ({id,operation:'upsert',kind,name,amount_minor:amount,expected_version:version});
const remove = entry => ({id:entry.id,operation:'remove',expected_version:entry.version});
const request = changes => ({p_household_id:household,p_changes:changes,p_request_id:randomUUID()});
async function login(prefix) {
  const client = makeClient();
  await result(client.auth.signInWithPassword({email:required(`${prefix}_EMAIL`),password:required(`${prefix}_PASSWORD`)}));
  return client;
}

test('hosted lists: two household accounts, atomic transfers, exact totals, retries, stale rejection and retained history', async t => {
  const admin = await login('TEST_ADMIN'), editor = await login('TEST_EDITOR'), outsider = await login('TEST_OUTSIDER');
  t.after(async () => {await Promise.all([admin,editor,outsider].map(client => client.auth.signOut({scope:'local'})));});
  const initial = await result(admin.rpc('get_finances'));
  assert.equal(initial.household_id,household);
  assert.equal((await result(editor.rpc('get_finances'))).household_id,household);
  assert.notEqual((await result(outsider.rpc('get_finances'))).household_id,household);
  const bank = randomUUID(), wallet = randomUUID(), fund = randomUUID(), debt = randomUUID();
  const beforeHistory = await result(admin.rpc('get_finance_history',{p_household_id:household}));
  const firstRequest = request([put(bank,'balance','接口验收银行','10001'),put(wallet,'balance','接口验收微信','20002'),
    put(fund,'balance','接口验收公积金','30003'),put(debt,'debt','接口验收负债','70007')]);
  const first = await result(admin.rpc('save_finances',firstRequest));
  assert.equal(BigInt(first.net_savings_minor)-BigInt(initial.net_savings_minor),-10001n);
  assert.deepEqual(await result(admin.rpc('save_finances',firstRequest)),first);
  assert.deepEqual(await result(editor.rpc('get_finances')),first);
  const row = (book,id) => book.entries.find(entry => entry.id===id);
  const history = () => result(admin.rpc('get_finance_history',{p_household_id:household}));
  assert.equal((await history()).length,beforeHistory.length+1);
  assert.deepEqual(await result(editor.rpc('save_finances',request([put(bank,'balance','接口验收银行','10001','1')]))),first);
  assert.equal((await history()).length,beforeHistory.length+1);
  // Each account edits a different row from the same snapshot. Both survive.
  const concurrent = await Promise.all([
    admin.rpc('save_finances',request([put(bank,'balance','接口验收银行','9001','1')])),
    editor.rpc('save_finances',request([put(wallet,'balance','接口验收微信','21002','1')]))]);
  concurrent.forEach(response => assert.equal(response.error,null));
  const combined = await result(editor.rpc('get_finances'));
  assert.equal(row(combined,bank).amount_minor,'9001'); assert.equal(row(combined,wallet).amount_minor,'21002');
  assert.equal(combined.net_savings_minor,first.net_savings_minor);
  const historyCount = (await history()).length;
  // A valid debit followed by a stale credit must roll back the debit as well.
  await reject(editor.rpc('save_finances',request([put(bank,'balance','接口验收银行','8001','2'),put(wallet,'balance','接口验收微信','22002','1')])), 'PT409');
  await reject(editor.rpc('save_finances',request([put(bank,'balance','接口验收银行','8001','2'),put(debt,'debt','接口验收负债','-1','1')])), '22023');
  assert.deepEqual(await result(admin.rpc('get_finances')),combined);
  assert.equal((await history()).length,historyCount);
  const transferRequest = request([put(bank,'balance','接口验收工资卡','8001','2'),put(wallet,'balance','接口验收微信','22002','2'),remove(row(combined,fund))]);
  const transferred = await result(editor.rpc('save_finances',transferRequest));
  assert.equal(row(transferred,bank).created_by,required('TEST_ADMIN_USER_ID'));
  assert.equal(row(transferred,bank).updated_by,required('TEST_EDITOR_USER_ID'));
  assert.equal(row(transferred,bank).creator_name,'列表管理员');
  assert.equal(row(transferred,bank).editor_name,'共同记账成员');
  assert.equal(row(transferred,fund),undefined);
  assert.deepEqual(await result(editor.rpc('save_finances',transferRequest)),transferred);
  const savedHistory = await history();
  assert.equal(savedHistory.length,historyCount+1);
  assert.deepEqual(savedHistory.at(-1).snapshot,transferred);
  assert.equal(savedHistory.at(-1).actor_id,required('TEST_EDITOR_USER_ID'));
  assert.equal(row(savedHistory[beforeHistory.length].snapshot,fund).name,'接口验收公积金');
  assert.equal(row(savedHistory[beforeHistory.length].snapshot,fund).amount_minor,'30003');
  assert.deepEqual(await result(admin.rpc('save_finances',firstRequest)),first);
  assert.deepEqual(await result(admin.rpc('get_finances')),transferred);
  for (const client of [makeClient(),outsider]) {
    await reject(client.rpc('save_finances',transferRequest),'42501');
    await reject(client.rpc('get_finances',{p_household_id:household}),'42501');
    await reject(client.rpc('get_finance_history',{p_household_id:household}),'42501');
  }
  const race = await Promise.all([admin,editor].map(client => client.rpc('save_finances',request([put(bank,'balance','接口验收工资卡','8002','3')]))));
  assert.equal(race.filter(response=>!response.error).length,1);
  assert.equal(race.find(response=>response.error).error.code,'PT409');
  // Retire only this run's disposable entries. Earlier snapshots remain readable.
  const current = await result(admin.rpc('get_finances'));
  const cleanup = await result(admin.rpc('save_finances',request(current.entries.filter(entry=>[bank,wallet,debt].includes(entry.id)).map(remove))));
  assert.equal(cleanup.net_savings_minor,initial.net_savings_minor);
  assert.deepEqual(cleanup.entries,initial.entries);
  t.diagnostic(`Verified household ${household}; two named operators, ${beforeHistory.length} prior snapshots retained.`);
});
