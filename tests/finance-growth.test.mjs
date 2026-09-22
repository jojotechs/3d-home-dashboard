import test from 'node:test';
import assert from 'node:assert/strict';
import {financeLevel, financeGrowth, financeProjection, levelFeedback} from '../src/finance/growth.mjs';

test('all ten finance levels compare exact cents and permit immediate multi-level downgrades', () => {
  const thresholds=['1000000','3000000','8000000','15000000','30000000','50000000','80000000','120000000','200000000'];
  assert.equal(financeLevel('-1'),1);
  assert.equal(financeLevel('0'),1);
  thresholds.forEach((threshold,index) => {
    assert.equal(financeLevel((BigInt(threshold)-1n).toString()),index+1);
    assert.equal(financeLevel(threshold),index+2);
    assert.equal(financeLevel((BigInt(threshold)+1n).toString()),index+2);
  });
  const history=['52000000','46000000'].map(net_savings_minor=>({snapshot:{net_savings_minor}}));
  assert.deepEqual(financeGrowth('46000000',history),{currentLevel:6,stage:'区域中心',peakMinor:'52000000',peakLevel:7,nextLevel:7,nextMinor:'50000000',remainingMinor:'4000000'});
  assert.equal(financeGrowth('0',[]).peakMinor,null);
  assert.equal(financeGrowth('-10',[{snapshot:{net_savings_minor:'-10'}}]).peakMinor,'-10');
  assert.equal(financeGrowth('9007199254740993',history).nextLevel,null);
  assert.equal(levelFeedback(7,6),'当前财务等级从 Lv.7 调整为 Lv.6。历史成果单独保留。');
  const growth=financeGrowth('46000000',history);
  assert.deepEqual(financeProjection(growth,9),{actualLevel:6,displayLevel:9,isPreview:true,achieved:false,modelLevel:1,modelReady:false});
  assert.equal(financeProjection(growth).displayLevel,6);
  assert.equal(financeProjection(null,9),null);
});

test('saved Lv.1 and Lv.2 select their own models regardless of the historical peak', () => {
  const history=[{snapshot:{net_savings_minor:'1000000'}}];
  const low=financeProjection(financeGrowth('999999',history));
  const high=financeProjection(financeGrowth('1000000',history));
  assert.equal(low.modelLevel,1);
  assert.equal(low.modelReady,true);
  assert.equal(high.modelLevel,2);
  assert.equal(high.modelReady,true);
  assert.equal(financeProjection(financeGrowth('1000000',history),1).modelLevel,1);
  assert.equal(financeProjection(financeGrowth('3000000',history)).modelReady,false);
});
