import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const required = name => {assert.ok(process.env[name], `Missing ${name}; use the isolated T02 collaboration household.`); return process.env[name];};
assert.equal(required('TEST_ALLOW_WRITES'),'true');
const household = required('TEST_HOUSEHOLD_ID');
const result = async promise => {const {data,error} = await promise; assert.equal(error,null); return data;};
const request = changes => ({p_household_id:household,p_changes:changes,p_request_id:randomUUID()});
const put = (id,name,amount,version='0') => ({id,operation:'upsert',kind:'balance',name,amount_minor:amount,expected_version:version});
const change = (entry, amount) => put(entry.id,entry.name,amount,entry.version);
const row = (book,id) => {const entry = book.entries.find(item=>item.id===id); assert.ok(entry); return entry;};

test('real household collaboration preserves complete commits and safely recovers a lost HTTP response', async t => {
  let loseNextResponse = false;
  const makeClient = (canLose = false) => createClient(required('SUPABASE_URL'),required('SUPABASE_PUBLISHABLE_KEY'),{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:async (input,init) => {
      const response = await fetch(input,init);
      // Consume a real successful response at the transport boundary, then hide
      // it from the SDK. No mock persistence or test-only business endpoint.
      if (canLose && loseNextResponse && String(input).endsWith('/rpc/save_finances') && response.ok) {
        loseNextResponse = false;
        await response.arrayBuffer();
        throw new TypeError('Acceptance test: connection lost after commit');
      }
      return response;
    }}
  });
  const admin = makeClient(true), editor = makeClient();
  for (const [client,prefix] of [[admin,'TEST_ADMIN'],[editor,'TEST_EDITOR']]) {
    await result(client.auth.signInWithPassword({email:required(`${prefix}_EMAIL`),password:required(`${prefix}_PASSWORD`)}));
    assert.equal((await result(client.rpc('get_finances'))).household_id,household);
  }
  const bank=randomUUID(), wallet=randomUUID(), ids=[bank,wallet];
  const history = () => result(editor.rpc('get_finance_history',{p_household_id:household}));
  const save = (client,payload) => result(client.rpc('save_finances',payload));
  const read = () => result(editor.rpc('get_finances'));
  const initial = await read(), beforeHistory = await history();
  t.after(async () => {
    const current = await read();
    const changes = current.entries.filter(entry=>ids.includes(entry.id)).map(entry=>({id:entry.id,operation:'remove',expected_version:entry.version}));
    if (changes.length) await save(admin,request(changes));
    await Promise.all([admin,editor].map(client=>client.auth.signOut({scope:'local'})));
  });
  const first = await save(admin,request([put(bank,'T04 接口银行','10000'),put(wallet,'T04 接口钱包','5000')]));
  const parallel = await Promise.all([
    save(admin,request([change(row(first,bank),'11000')])),
    save(editor,request([change(row(first,wallet),'7000')]))
  ]);
  const ordered = parallel.sort((a,b)=>Number(BigInt(a.version)-BigInt(b.version)));
  const combined = await read();
  assert.equal(row(combined,bank).amount_minor,'11000');
  assert.equal(row(combined,wallet).amount_minor,'7000');
  assert.equal(BigInt(combined.net_savings_minor)-BigInt(initial.net_savings_minor),18000n);
  const committed = (await history()).slice(beforeHistory.length);
  assert.equal(committed.length,3);
  assert.deepEqual(committed.map(item=>item.snapshot),[first,...ordered]);
  // Every history state is a complete book, not a patch or a stale form.
  for (const book of ordered) assert.equal(book.entries.length,initial.entries.length+2);
  const firstConcurrent = ordered[0];
  assert.ok((row(firstConcurrent,bank).amount_minor==='11000' && row(firstConcurrent,wallet).amount_minor==='5000') ||
    (row(firstConcurrent,bank).amount_minor==='10000' && row(firstConcurrent,wallet).amount_minor==='7000'));
  const race = await Promise.all([admin.rpc('save_finances',request([change(row(combined,bank),'12000')])),
    editor.rpc('save_finances',request([change(row(combined,bank),'13000')]))]);
  assert.equal(race.filter(item=>!item.error).length,1);
  assert.equal(race.find(item=>item.error).error.code,'PT409');
  const winner = await read(), historyAfterRace = await history();
  const stale = await editor.rpc('save_finances',request([change(row(winner,wallet),'8000'),change(row(combined,bank),'14000')]));
  assert.equal(stale.error.code,'PT409');
  assert.deepEqual(await read(),winner);
  assert.equal((await history()).length,historyAfterRace.length);

  const lost = request([change(row(winner,bank),'15000')]);
  loseNextResponse=true;
  const lostResult = await admin.rpc('save_finances',lost);
  assert.ok(lostResult.error); assert.equal(lostResult.data,null);
  const afterLost = await read();
  assert.equal(row(afterLost,bank).amount_minor,'15000');
  const later = await save(editor,request([change(row(afterLost,bank),'16000')]));
  // Retrying after another member has edited returns the original receipt;
  // the following current-book read must retain that member's newer value.
  const retries = await Promise.all([save(admin,lost),save(admin,lost)]);
  for (const receipt of retries) assert.deepEqual(receipt,afterLost);
  assert.deepEqual(await read(),later);
  assert.equal(row(later,bank).created_by,required('TEST_ADMIN_USER_ID'));
  assert.equal(row(later,bank).updated_by,required('TEST_EDITOR_USER_ID'));
  assert.equal(row(later,bank).creator_name,'列表管理员');
  assert.equal(row(later,bank).editor_name,'共同记账成员');
  const finalHistory = await history();
  assert.equal(finalHistory.length,historyAfterRace.length+2);
  assert.equal(finalHistory.at(-1).actor_id,required('TEST_EDITOR_USER_ID'));
  assert.deepEqual(finalHistory.at(-1).snapshot,later);
  assert.deepEqual(await save(editor,request([change(row(later,bank),'16000')])),later);
  assert.deepEqual(await save(editor,request([])),later);
  assert.equal((await history()).length,finalHistory.length);
  t.diagnostic(`Verified ${household}: different-row concurrency, same-row rejection, atomic rollback, lost response, later edits, duplicate retry, no-op and actor attribution.`);
});
