import test from 'node:test';
import assert from 'node:assert/strict';
import {historyTotals, trendPoints} from '../src/finance/history.mjs';

test('history totals and a chronological trend retain exact values without inventing empty points', () => {
  assert.deepEqual(trendPoints([]), []);
  assert.deepEqual(historyTotals([{kind:'balance',amount_minor:'9007199254740993'},{kind:'debt',amount_minor:'9007199254741000'}]), {balance:'9007199254740993',debt:'9007199254741000',net:'-7'});
  const history = [0,1,2].map((n) => ({saved_at:`2026-09-22T0${n}:00:00Z`,snapshot:{net_savings_minor:['-100','0','100'][n]}}));
  assert.deepEqual(trendPoints(history), [{x:0,y:100},{x:50,y:50},{x:100,y:0}]);
  assert.deepEqual(trendPoints([history[0]]), [{x:50,y:50}]);
});
