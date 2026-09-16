import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTransportSchedule,transportAt,transportPose,transportDuration} from '../src/transport-state.mjs';
const time=Date.parse('2026-09-16T10:00:00Z');
const trip=(id,mode='air',delay=0)=>({id,mode,members:id,destination:'目的地',departAt:new Date(time+delay).toISOString(),endAt:new Date(time+86400000).toISOString()});
test('scheduled departures start at the real instant and historical trips do not replay',()=>{
 const jobs=buildTransportSchedule([trip('a'),trip('r','rail')]);
 assert.equal(transportAt(jobs,'air',time-1).active,null);
 assert.equal(transportAt(jobs,'air',time).elapsed,0);
 assert.equal(transportAt(jobs,'air',time+20000).elapsed,20);
 assert.equal(transportAt(jobs,'air',time+84000).active,null);
 assert.equal(transportAt(jobs,'rail',time+39000).active,null);
 assert.equal(transportAt(jobs,'air',time+86400000).active,null);
});
test('refresh reconstructs the current pose, while the two modes depart independently',()=>{
 const trips=[trip('a'),trip('r','rail')];
 const before=transportAt(buildTransportSchedule(trips),'air',time+18000);
 const after=transportAt(buildTransportSchedule(JSON.parse(JSON.stringify(trips))),'air',time+18000);
 assert.deepEqual(before,after);assert.equal(transportAt(buildTransportSchedule(trips),'rail',time+18000).active.mode,'rail');
});
test('shared departure uses one vehicle and adjacent services queue until replenishment',()=>{
 const trips=[trip('b','air',5000),trip('a'),trip('c'),trip('r','rail')];
 const jobs=buildTransportSchedule(trips);
 assert.equal(jobs.air.length,2);assert.deepEqual(jobs.air[0].tripIds,['a','c']);
 assert.equal(jobs.air[1].startAt,time+84000);
 assert.equal(transportAt(jobs,'air',time+6000).queued,1);
 assert.equal(transportAt(jobs,'air',time+84000).active.tripIds[0],'b');
 assert.equal(jobs.rail[0].startAt,time);
});
test('editing or removing a future trip immediately changes its departure schedule',()=>{
 const a=trip('a','air',60000);
 assert.equal(transportAt(buildTransportSchedule([a]),'air',time).active,null);
 assert.equal(transportAt(buildTransportSchedule([]),'air',time+60000).active,null);
 const later={...a,departAt:new Date(time+120000).toISOString()};
 assert.equal(transportAt(buildTransportSchedule([later]),'air',time+60000).active,null);
});
test('aircraft taxis onto the runway, rises, clears, returns, and parks without visible position jumps',()=>{
 assert.equal(transportPose('air',2).phase,'pushback');assert.equal(transportPose('air',24).phase,'lineup');
 assert.equal(transportPose('air',28).y,-66);assert.equal(transportPose('air',28).z,0);
 assert.ok(transportPose('air',38).z>8);assert.equal(transportPose('air',44).visible,false);
 assert.equal(transportPose('air',49).phase,'approach');assert.equal(transportPose('air',59).phase,'landing');
 assert.deepEqual(transportPose('air',84),transportPose('air'));
 for(let t=0;t<84;t+=.02){const a=transportPose('air',t),b=transportPose('air',t+.02);
  assert.ok([a.x,a.y,a.z,a.heading,a.pitch].every(Number.isFinite));assert.ok(a.z>=0);
  if(a.visible&&b.visible)assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1,`${t}: discontinuous aircraft path`);
 }
});
test('train stays on its real track and clears both tunnel clipping boundaries',()=>{
 for(let t=0;t<transportDuration.rail;t+=.1){const p=transportPose('rail',t);assert.equal(p.y,11.2);assert.equal(p.z,0);assert.equal(p.heading,0);}
 assert.ok(28+transportPose('rail',15.999).x-26.3>157.2);
 assert.ok(28+transportPose('rail',21).x+26.3< -141.2);
 assert.deepEqual(transportPose('rail',39),transportPose('rail'));
});
