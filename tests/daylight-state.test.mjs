import test from 'node:test';
import assert from 'node:assert/strict';
import {beijingHour,resolveCityHour,defaultDaylight,daylightFrame,lightLevel,dayPresets,displayCityTime,isDaylightState} from '../src/daylight-state.mjs';
import {tripPhase} from '../src/travel-state.mjs';

test('automatic city clock follows Beijing time across a UTC day boundary',()=>{
 assert.equal(beijingHour(Date.parse('2026-09-15T16:15:00Z')),.25);
 assert.equal(resolveCityHour(defaultDaylight,Date.parse('2026-09-15T00:00:00Z'),999),8);
 assert.equal(displayCityTime(6.25),'06:15');assert.equal(displayCityTime(24),'00:00');
});
test('a two-minute preview wraps a city day and never advances real trip time',()=>{
 const settings={...defaultDaylight,mode:'cycle',hour:22};
 assert.equal(resolveCityHour(settings,0,15),1);assert.equal(resolveCityHour(settings,0,120),22);
 const wall=Date.parse('2026-09-15T10:00:00Z'),trip={departAt:'2026-09-15T11:00:00Z',endAt:'2026-09-16T11:00:00Z'};
 for(const p of dayPresets){assert.equal(resolveCityHour({...settings,mode:'manual',hour:p.hour},wall,100),p.hour);assert.equal(tripPhase(trip,wall),'upcoming');}
});
test('six distinct profiles remain finite and smoothly join at midnight',()=>{
 for(let h=0;h<24;h+=.01){const f=daylightFrame(h);assert.ok([f.night,f.ambient,f.exposure,f.sunIntensity,...f.sunPosition].every(Number.isFinite));assert.ok(f.night>=0&&f.night<=1);assert.ok(f.ambient>0);}
 assert.equal(new Set(dayPresets.map(p=>daylightFrame(p.hour).sunIntensity)).size,6);
 const a=daylightFrame(23.99999),b=daylightFrame(0);assert.ok(Math.abs(a.ambient-b.ambient)<.00001);assert.ok(Math.hypot(...a.sunPosition.map((v,i)=>v-b.sunPosition[i]))<.0001);
});
test('lights fade away after sunrise and return continuously at dusk',()=>{
 assert.equal(lightLevel(0),1);assert.equal(lightLevel(12),0);assert.equal(lightLevel(22),1);
 assert.ok(lightLevel(6.25)>0&&lightLevel(6.25)<.5);
 for(let h=5.2;h<6.9;h+=.1)assert.ok(lightLevel(h+.1)<=lightLevel(h));
 for(let h=17.05;h<19.05;h+=.1)assert.ok(lightLevel(h+.1)>=lightLevel(h));
});
test('invalid stored preview settings are rejected',()=>{
 assert.ok(isDaylightState(defaultDaylight));
 for(const s of [null,{}, {...defaultDaylight,hour:NaN},{...defaultDaylight,hour:24},{...defaultDaylight,mode:'bad'},{...defaultDaylight,lights:1}])assert.equal(isDaylightState(s),false);
});

test('a real calendar rollover refreshes daily tasks without removing earned facilities',async()=>{
 const {initialState,derived,reduceState}=await import('../src/city-state.mjs');
 const state=reduceState(initialState('2026-09-15'),{type:'complete',task:'read',day:'2026-09-15'});
 const today=derived(state,'2026-09-15'),tomorrow=derived(state,'2026-09-16');
 assert.ok(today.completed>0);assert.equal(tomorrow.completed,0);assert.deepEqual(today.levels,tomorrow.levels);assert.deepEqual(today.growth,tomorrow.growth);
});
