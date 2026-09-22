import test from 'node:test';import assert from 'node:assert/strict';
import {correctionDraft, correctionChanges, refreshCorrection} from '../src/finance/correction.mjs';
test('history correction submits only valid changed amounts and retains edits when reviewing a newer historical snapshot',()=>{
  const entries=[{id:'bank',name:'银行',kind:'balance',amount_minor:'52000000'},{id:'debt',name:'负债',kind:'debt',amount_minor:'10000'}];
  const rows=correctionDraft(entries);rows[0].amount='420000';
  assert.deepEqual(correctionChanges(rows),[{id:'bank',amount_minor:'42000000'}]);
  const latest=entries.map(e=>({...e,amount_minor:e.id==='bank'?'51000000':'20000'}));
  const refreshed=refreshCorrection(rows,latest);
  assert.equal(refreshed[0].amount,'420000');assert.equal(refreshed[0].baseMinor,'51000000');assert.equal(refreshed[1].amount,'200.00');
  refreshed[1].amount='0';assert.throws(()=>correctionChanges(refreshed));
  refreshed[1].amount='200';refreshed[0].amount='1.001';assert.throws(()=>correctionChanges(refreshed));
});
