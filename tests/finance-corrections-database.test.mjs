import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {financeDatabase} from './helpers/finance-database.mjs';
import {financeGrowth} from '../src/finance/growth.mjs';
const save=(api,actor,household,id,amount,version='0')=>api.rpc(actor,'save_finances',[household,JSON.stringify([{id,operation:'upsert',kind:'balance',name:'银行',amount_minor:amount,expected_version:version}]),randomUUID()]);
const correct=(api,actor,household,update,book,changes,key=randomUUID())=>api.rpc(actor,'correct_finance_history',[household,update.id,update.revision,book.current.version,JSON.stringify(changes),key]);

test('correcting old history removes a false peak without overwriting later savings; correcting latest also updates current savings', async t=>{
  const api=await financeDatabase(); t.after(()=>api.db.close());
  const actor=randomUUID(),household=randomUUID(),id=randomUUID(); await api.provision(actor,household);
  await save(api,actor,household,id,'52000000'); await save(api,actor,household,id,'46000000','1');
  let book=await api.rpc(actor,'get_finance_book',[household]);
  await correct(api,actor,household,book.history[0],book,[{id,amount_minor:'42000000'}]);
  book=await api.rpc(actor,'get_finance_book',[household]);
  assert.equal(book.current.net_savings_minor,'46000000'); assert.equal(book.current.entries[0].version,'2');
  assert.equal(book.history[0].snapshot.net_savings_minor,'42000000');
  assert.equal(book.history[0].snapshot.entries[0].creator_name,'管理员');
  assert.equal(book.history[0].revision,'2'); assert.equal(book.history[0].revisions[0].actor_id,actor);
  assert.equal(book.history[0].revisions[0].actor_name,'管理员'); assert.ok(book.history[0].revisions[0].revised_at);
  assert.equal(financeGrowth(book.current.net_savings_minor,book.history).peakLevel,6);
  await correct(api,actor,household,book.history[1],book,[{id,amount_minor:'45000000'}]);
  book=await api.rpc(actor,'get_finance_book',[household]);
  assert.equal(book.current.net_savings_minor,'45000000'); assert.equal(book.current.entries[0].amount_minor,'45000000');
  assert.equal(book.current.entries[0].version,'3'); assert.equal(book.current.entries[0].created_by,actor);
  assert.equal(book.history.length,2); assert.equal(book.history[1].snapshot.net_savings_minor,'45000000');
  assert.equal(financeGrowth(book.current.net_savings_minor,book.history).peakMinor,'45000000');
});

test('corrections reject stale or unauthorized requests atomically, while retries and no-ops cannot create duplicate revisions', async t=>{
  const api=await financeDatabase();t.after(()=>api.db.close());
  const actor=randomUUID(),editor=randomUUID(),denied=randomUUID(),outsider=randomUUID(),household=randomUUID(),other=randomUUID(),id=randomUUID();
  await api.provision(actor,household);await api.provision(outsider,other);
  for(const [user,access] of [[editor,true],[denied,false]]){
    await api.db.query('insert into auth.users(id) values ($1)',[user]);
    await api.db.query('insert into public.household_members(household_id,user_id,display_name,finance_access) values ($1,$2,$3,$4)',[household,user,access?'修订成员':'无权限成员',access]);
  }
  await save(api,actor,household,id,'52000000');
  const before=await api.rpc(actor,'get_finance_book',[household]),update=before.history[0];
  for(const user of [null,denied,outsider]){
    await assert.rejects(correct(api,user,household,update,before,[{id,amount_minor:'1'}]),{code:'42501'});
    if(user) await assert.rejects(api.rpc(user,'get_finance_book',[household]),{code:'42501'});
  }
  for(const changes of [[{id,amount_minor:'1'},{id:randomUUID(),amount_minor:'1'}],[{id,amount_minor:'1'},{id,amount_minor:'2'}],[{id,amount_minor:'-1'}]]){
    await assert.rejects(correct(api,actor,household,update,before,changes),{code:'22023'});
    assert.deepEqual(await api.rpc(actor,'get_finance_book',[household]),before);
  }
  const key=randomUUID(),changes=[{id,amount_minor:'45000000'}];
  const receipt=await correct(api,editor,household,update,before,changes,key);
  const corrected=await api.rpc(actor,'get_finance_book',[household]);
  assert.equal(corrected.history[0].revisions.length,1);assert.equal(corrected.history[0].revisions[0].actor_name,'修订成员');
  assert.equal(corrected.current.entries[0].created_by,actor);assert.equal(corrected.current.entries[0].updated_by,editor);
  await assert.rejects(correct(api,actor,household,update,before,changes),{code:'PT409'});
  await assert.rejects(save(api,actor,household,id,'46000000','1'),{code:'PT409'});
  await correct(api,actor,household,corrected.history[0],corrected,changes);
  assert.deepEqual(await api.rpc(actor,'get_finance_book',[household]),corrected);
  await save(api,actor,household,id,'46000000','2');
  const latest=await api.rpc(actor,'get_finance_book',[household]);
  assert.deepEqual(await correct(api,editor,household,update,before,changes,key),receipt);
  assert.deepEqual(await api.rpc(actor,'get_finance_book',[household]),latest);
  await assert.rejects(correct(api,editor,household,update,before,[{id,amount_minor:'44000000'}],key),{code:'PT409'});
  await assert.rejects(correct(api,actor,household,corrected.history[0],corrected,[{id,amount_minor:'44000000'}]),{code:'PT409'});
});

test('correcting a retired historical entry never resurrects it or erases later revisions', async t=>{
  const api=await financeDatabase();t.after(()=>api.db.close());
  const actor=randomUUID(),household=randomUUID(),id=randomUUID();await api.provision(actor,household);
  await save(api,actor,household,id,'52000000');
  await api.rpc(actor,'save_finances',[household,JSON.stringify([{id,operation:'remove',expected_version:'1'}]),randomUUID()]);
  let book=await api.rpc(actor,'get_finance_book',[household]);
  await correct(api,actor,household,book.history[0],book,[{id,amount_minor:'42000000'}]);
  book=await api.rpc(actor,'get_finance_book',[household]);
  await correct(api,actor,household,book.history[0],book,[{id,amount_minor:'40000000'}]);
  book=await api.rpc(actor,'get_finance_book',[household]);
  assert.deepEqual(book.current.entries,[]);assert.equal(book.current.net_savings_minor,'0');
  assert.equal(book.history[0].revision,'3');assert.equal(book.history[0].revisions.length,2);
  assert.equal(book.history[0].snapshot.entries[0].name,'银行');
  assert.equal(book.history[0].snapshot.entries[0].amount_minor,'40000000');
  assert.equal(book.history[1].snapshot.net_savings_minor,'0');
});
