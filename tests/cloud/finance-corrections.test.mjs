import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const required=name=>{assert.ok(process.env[name],`Missing ${name}; use the isolated T07 household.`);return process.env[name];};
assert.equal(required('TEST_ALLOW_WRITES'),'true');
const household=required('TEST_HOUSEHOLD_ID');
const ok=async promise=>{const {data,error}=await promise;assert.equal(error,null);return data;};

test('real cloud corrections serialize with saves, preserve attribution, reject revoked access and recover a lost response exactly once',async t=>{
  let loseNext=false;
  const make=(fault=false)=>createClient(required('SUPABASE_URL'),required('SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const response=await fetch(input,init);
    if(fault&&loseNext&&String(input).endsWith('/rpc/correct_finance_history')&&response.ok){loseNext=false;await response.arrayBuffer();throw new TypeError('Acceptance: response lost after correction committed');}
    return response;
  }}});
  const admin=make(true),editor=make(),outsider=make();
  for(const [client,prefix] of [[admin,'TEST_ADMIN'],[editor,'TEST_EDITOR'],[outsider,'TEST_OUTSIDER']]) await ok(client.auth.signInWithPassword({email:required(`${prefix}_EMAIL`),password:required(`${prefix}_PASSWORD`)}));
  const read=()=>ok(admin.rpc('get_finance_book',{p_household_id:household}));
  const id=randomUUID();
  const save=async(client,amount,version)=>ok(client.rpc('save_finances',{p_household_id:household,p_changes:[{id,operation:'upsert',kind:'balance',name:'T07 接口纠错验收',amount_minor:amount,expected_version:version}],p_request_id:randomUUID()}));
  const request=(book,amount)=>({p_household_id:household,p_update_id:book.history.at(-1).id,p_expected_revision:book.history.at(-1).revision,p_expected_book_version:book.current.version,p_changes:[{id,amount_minor:amount}],p_request_id:randomUUID()});
  t.after(async()=>{
    await ok(admin.rpc('set_finance_access',{p_member:required('TEST_EDITOR_MEMBER_ID'),p_allowed:true}));
    const book=await read(),entry=book.current.entries.find(row=>row.id===id);
    if(entry) await ok(admin.rpc('save_finances',{p_household_id:household,p_changes:[{id,operation:'remove',expected_version:entry.version}],p_request_id:randomUUID()}));
  });
  await save(admin,'100000','0');let book=await read();const initialHistory=book.history.length;
  const race=await Promise.all([admin.rpc('correct_finance_history',request(book,'110000')),editor.rpc('correct_finance_history',request(book,'120000'))]);
  assert.equal(race.filter(result=>!result.error).length,1);assert.equal(race.find(result=>result.error).error.code,'PT409');
  book=await read();assert.equal(book.history.length,initialHistory);assert.equal(book.history.at(-1).revisions.length,1);
  const invalid=request(book,'125000');invalid.p_changes.push({id:randomUUID(),amount_minor:'1'});
  assert.equal((await admin.rpc('correct_finance_history',invalid)).error.code,'22023');assert.deepEqual(await read(),book);
  const lost=request(book,'130000');loseNext=true;
  const hidden=await admin.rpc('correct_finance_history',lost);assert.ok(hidden.error);assert.equal(hidden.data,null);
  const committed=await read();assert.equal(committed.current.entries.find(row=>row.id===id).amount_minor,'130000');assert.equal(committed.history.at(-1).revisions.length,2);
  await save(editor,'140000',committed.current.entries.find(row=>row.id===id).version);
  const later=await read();
  const receipts=await Promise.all([ok(admin.rpc('correct_finance_history',lost)),ok(admin.rpc('correct_finance_history',lost))]);assert.deepEqual(receipts[0],receipts[1]);
  assert.deepEqual(await read(),later);assert.equal(later.current.entries.find(row=>row.id===id).created_by,required('TEST_ADMIN_USER_ID'));
  assert.equal(later.current.entries.find(row=>row.id===id).updated_by,required('TEST_EDITOR_USER_ID'));
  assert.equal(later.history.at(-2).revisions.length,2);
  // A newer ordinary save makes the original correction target old; stale context must be reviewed.
  assert.equal((await editor.rpc('correct_finance_history',{...lost,p_request_id:randomUUID()})).error.code,'PT409');
  const noOp=request(later,'140000');await ok(editor.rpc('correct_finance_history',noOp));assert.deepEqual(await read(),later);
  await ok(admin.rpc('set_finance_access',{p_member:required('TEST_EDITOR_MEMBER_ID'),p_allowed:false}));
  for(const client of [editor,outsider]){
    for(const name of ['get_finance_history','get_finance_book']) assert.equal((await client.rpc(name,{p_household_id:household})).error.code,'42501');
    assert.equal((await client.rpc('correct_finance_history',request(later,'1'))).error.code,'42501');
  }
  t.diagnostic('Same-revision race, atomic invalid patch, real lost response + later save + parallel retry, no-op, creator/editor and revoked/cross-household history/correction access passed.');
});
