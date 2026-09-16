import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,reduceState,derived,visibleForNode,isValidState} from '../src/city-state.mjs';
test('a check-in is idempotent and undo removes only its own event',()=>{
 const s=initialState('2026-09-15');const a=reduceState(s,{type:'complete',task:'read'});
 assert.equal(derived(a).growth[0],8);assert.equal(reduceState(a,{type:'complete',task:'read'}),a);
 const b=reduceState(a,{type:'complete',task:'kitchen'});const c=reduceState(b,{type:'undo',id:a.events[0].id});
 assert.equal(derived(c).growth[0],7);assert.equal(derived(c).pending.some(t=>t.id==='kitchen'),false);
});
test('car bay completion does not affect other car',()=>{
 const a=reduceState(initialState(),{type:'complete',task:'tire-a'});
 assert.equal(visibleForNode({kind:'carWork',carId:'car_a'},a),false);
 assert.equal(visibleForNode({kind:'carWork',carId:'car_b'},a),true);
});
test('facility levels are additive and preview never alters earned state',()=>{
 const s={...initialState(),baseHealth:14,baseHome:29};
 assert.equal(derived(s).levels.health,2);assert.equal(derived(s).levels.home,1);
 assert.equal(visibleForNode({kind:'level',district:'health',minLevel:2},s,{health:3}),true);
 assert.equal(visibleForNode({kind:'level',district:'health',minLevel:3},s,{health:3}),true);
 assert.equal(derived(s).levels.health,2);
 const a=reduceState(s,{type:'complete',task:'read'});assert.equal(derived(a).levels.home,2);
});
test('habit capacity caps visible nodes',()=>{
 const s={...initialState(),baseGrowth:[99,0,0,0,0,0]};
 assert.equal(visibleForNode({kind:'growth',plot:0,slot:11},s),true);
 assert.equal(visibleForNode({kind:'growth',plot:0,slot:12},s),false);
});
test('stored demo state must have valid numeric fields and task IDs',()=>{
 assert.ok(isValidState(initialState()));assert.ok(!isValidState({...initialState(),baseGrowth:['x']}));
 assert.ok(!isValidState({...initialState(),events:[{id:'x',task:'unknown',day:'x'}]}));
});
test('finance geometry preview stays separate from cumulative home and health facilities',()=>{
 const s=initialState();
 const stages=[1,2,3].map(n=>({kind:'level',district:'finance',minLevel:n,maxLevel:n}));
 for(const n of [1,2,3]){
  assert.deepEqual(stages.map(node=>visibleForNode(node,s,{finance:n})),[1,2,3].map(x=>x===n));
  assert.equal(derived(s).levels.finance,undefined);
 }
 // Existing parks still accumulate multiple facilities at the same milestone.
 assert.equal(visibleForNode({kind:'level',district:'health',minLevel:2},s,{health:3}),true);
});

test('real finance starts at the base geometry and never reads the demo wealth peak',()=>{
 const legacy={...initialState(),netWorth:328600,highestNetWorth:620000};
 const stages=[1,2,3].map(n=>({kind:'level',district:'finance',minLevel:n,maxLevel:n}));
 assert.deepEqual(stages.map(node=>visibleForNode(node,legacy)),[true,false,false]);
 assert.equal(reduceState(legacy,{type:'finance',value:900000}),legacy);
});
