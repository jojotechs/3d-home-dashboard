import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/city-state.mjs';
import {projectToday} from '../src/habits/city-projection.mjs';

test('an empty personal farm never inherits local habit examples in any today count', () => {
  const state=initialState('2026-10-21');
  const today=projectToday(state,null,'2026-10-21');
  assert.equal(today.habits.total,0);
  assert.deepEqual(today.habits.pending,[]);
  assert.equal(today.demo.total,6);
  assert.equal(today.demo.completed,3);
  assert.equal(today.total,6);
  assert.equal(today.completed,3);
  assert.deepEqual(today.demo.pending.map(t=>t.id),['kitchen','tire-a','clean-b']);
});

test('only the authorized farm feeds real habit counts without changing permanent demo facilities', () => {
  const state=initialState('2026-10-21'),before=structuredClone(state);
  const farm={habit_day:'2026-10-20',habits:[
    {id:'a',name:'每天运动',today:{completed:true}},
    {id:'b',name:'每天阅读',today:{completed:false}},
  ]};
  const today=projectToday(state,farm,'2026-10-21');
  assert.equal(today.habits.total,2);
  assert.equal(today.habits.completed,1);
  assert.deepEqual(today.habits.pending.map(t=>[t.id,t.title,t.district]),[['b','每天阅读','habits']]);
  assert.equal(today.total,8);
  assert.equal(today.completed,4);
  assert.deepEqual(state,before);
  assert.equal(projectToday(state,null,'2026-10-21').habits.total,0,'logout clears all personal counts');
});
