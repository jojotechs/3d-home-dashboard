import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft, draftChanges, draftTotals, refreshDraft, rowChanged} from '../src/finance/draft.mjs';

test('draft lists total exact cents and submit only added, changed and removed rows', () => {
  const saved = [{id:'bank',kind:'balance',name:'银行',amount_minor:'9007199254740993',version:'7'},
    {id:'wallet',kind:'balance',name:'微信',amount_minor:'20000',version:'1'},
    {id:'debt',kind:'debt',name:'房贷',amount_minor:'50000',version:'3'}];
  const draft = createDraft(saved);
  assert.deepEqual(draftChanges(draft), []);
  draft[0].name = ' 银行储蓄 ';
  draft[1].removed = true;
  draft.push({id:'fund',kind:'balance',name:'公积金',amount:'0.07',base:null,removed:false});
  assert.deepEqual(draftChanges(draft), [
    {id:'bank',operation:'upsert',expected_version:'7',kind:'balance',name:'银行储蓄',amount_minor:'9007199254740993'},
    {id:'wallet',operation:'remove',expected_version:'1'},
    {id:'fund',operation:'upsert',expected_version:'0',kind:'balance',name:'公积金',amount_minor:'7'}]);
  assert.deepEqual(draftTotals(draft), {balance:'9007199254741000',debt:'50000',net:'9007199254691000'});
  assert.equal(saved[0].name, '银行'); assert.equal(saved.length, 3);
  draft[3].amount = '1.001';
  assert.throws(() => draftTotals(draft)); assert.throws(() => draftChanges(draft));
  draft[3].removed = true;
  assert.equal(draftChanges(draft).length, 2);
  draft[2].amount = '0';
  assert.throws(() => draftChanges(draft), /负债/);
});

test('a remotely removed row stays an unresolved draft even if its input returns to the original value', () => {
  const draft = createDraft([{id:'bank',kind:'balance',name:'银行',amount_minor:'10000',version:'1'}]);
  draft[0].amount = '90';
  const refreshed = refreshDraft(draft, []);
  refreshed[0].amount = '100';
  assert.equal(refreshed.some(rowChanged), true);
  assert.throws(() => draftChanges(refreshed), /已被其他成员移除/);
  refreshed[0].removed = true;
  assert.deepEqual(draftChanges(refreshed), []);
  assert.equal(refreshed.some(rowChanged), false);
  assert.equal(draftTotals(refreshed).net, '0');
});

test('an explicit refresh keeps local edits while showing fresh unrelated rows and retired conflicts', () => {
  const bank = {id:'bank',kind:'balance',name:'银行',amount_minor:'10000',version:'1'};
  const wallet = {id:'wallet',kind:'balance',name:'微信',amount_minor:'5000',version:'1'};
  const draft = createDraft([bank,wallet]); draft[0].amount = '90';
  const freshWallet = {...wallet,amount_minor:'6000',version:'2'};
  const reloaded = refreshDraft(draft, [bank,freshWallet]);
  assert.equal(draftTotals(reloaded).net, '15000');
  assert.deepEqual(draftChanges(reloaded), [{id:'bank',operation:'upsert',expected_version:'1',kind:'balance',name:'银行',amount_minor:'9000'}]);
  const conflict = refreshDraft(draft, [{...bank,amount_minor:'11000',version:'2'},freshWallet]);
  assert.equal(conflict.find(row => row.id === 'bank').base.amount_minor, '11000');
  assert.equal(draftChanges(conflict)[0].expected_version, '2');
  const removed = refreshDraft(draft, [freshWallet]);
  assert.throws(() => draftChanges(removed), /已被其他成员移除/);
  removed.find(row => row.id === 'bank').removed = true;
  assert.deepEqual(draftChanges(removed), []);
  assert.equal(draftTotals(refreshDraft(removed, [freshWallet])).net, '6000');
});
