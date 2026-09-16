import test from 'node:test';import assert from 'node:assert/strict';
import {initialTravel,tripPhase,tripStatus,fromTimeInput,toTimeInput,validateTrip,reduceTravel,isTravelState,sortedTrips} from '../src/travel-state.mjs';
const now=Date.parse('2026-09-15T06:00:00Z');
const trip={id:'trip-1',mode:'air',members:'家人',origin:'上海',destination:'杭州',purpose:'business',departAt:'2026-09-15T06:00:00Z',endAt:'2026-09-16T06:00:00Z',service:'',note:''};
test('trip state crosses departure and end boundaries exactly',()=>{
 assert.equal(tripPhase(trip,now-1),'upcoming');assert.equal(tripPhase(trip,now),'away');assert.equal(tripPhase(trip,now+86400000),'ended');
 assert.equal(tripStatus(trip,now+7200000).clock,'已出发 2 小时');
});
test('Beijing time inputs do not depend on the computer timezone',()=>{
 assert.equal(fromTimeInput('2026-09-15T14:00'),'2026-09-15T06:00:00.000Z');
 assert.equal(toTimeInput('2026-09-15T06:00:00Z'),'2026-09-15T14:00');
 assert.equal(fromTimeInput('2026-02-30T12:00'),null);assert.equal(fromTimeInput('2026-09-15T25:00'),null);
});
test('invalid schedules and missing details are rejected',()=>{
 assert.ok(validateTrip({...trip,endAt:trip.departAt}));assert.ok(validateTrip({...trip,members:' '}));assert.ok(validateTrip({...trip,departAt:null}));
 assert.equal(isTravelState({version:1,trips:[null]}),false);assert.ok(validateTrip({...trip,note:{text:'bad'}}));
 const s={version:1,trips:[]};assert.equal(reduceTravel(s,{type:'save',trip:{...trip,endAt:'bad'}}),s);
});
test('saved trips can be edited, removed and restored without affecting others',()=>{
 const seed=initialTravel(now),added=reduceTravel(seed,{type:'save',trip});
 const edited=reduceTravel(added,{type:'save',trip:{...trip,destination:'北京'}});
 assert.equal(edited.trips.length,seed.trips.length+1);assert.equal(edited.trips.find(t=>t.id===trip.id).destination,'北京');
 const removed=reduceTravel(edited,{type:'delete',id:trip.id});assert.deepEqual(removed,seed);
 assert.ok(isTravelState(reduceTravel(removed,{type:'save',trip})));
 assert.deepEqual(seed.trips,initialTravel(now).trips);
});
test('air and rail lists stay separate and serialize without moving dates',()=>{
 const seed=initialTravel(now),copy=JSON.parse(JSON.stringify(seed));assert.ok(isTravelState(copy));
 assert.ok(sortedTrips(copy.trips,'air','all',now).every(t=>t.mode==='air'));
 assert.equal(sortedTrips(copy.trips,'rail','ended',now).length,1);
 assert.equal(tripPhase(copy.trips[0],now+6*3600000),'away');
 assert.equal(isTravelState({...copy,trips:[copy.trips[0],copy.trips[0]]}),false);
});
