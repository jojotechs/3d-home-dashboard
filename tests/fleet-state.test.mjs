import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fleet,departureVariant,transportPose,transportDuration,buildTransportSchedule} from '../src/transport-state.mjs';
import {transportMaterial,updateCabinLight} from '../src/CityTransport.mjs';

function rectangle(p){const c=Math.cos(p.heading),s=Math.sin(p.heading);return [[-13.52,-12.91],[12.21,-12.91],[12.21,12.91],[-13.52,12.91]].map(([x,y])=>[p.x+x*c-y*s,p.y+x*s+y*c]);}
function overlaps(a,b){
 for(const polygon of [a,b])for(let i=0;i<4;i++){
  const p=polygon[i],q=polygon[(i+1)%4],axis=[p[1]-q[1],q[0]-p[0]];
  const project=pts=>pts.map(v=>v[0]*axis[0]+v[1]*axis[1]),aa=project(a),bb=project(b);
  if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;
 }return true;
}
test('all six aircraft routes clear the other two full-size parked aircraft',()=>{
 for(let slot=0;slot<3;slot++)for(const direction of [-1,1])for(let t=0;t<=84;t+=.1){
  const p=transportPose('air',t,{slot,direction});if(!p.visible||p.z>10)continue;
  for(let other=0;other<3;other++)if(other!==slot)assert.equal(overlaps(rectangle(p),rectangle(transportPose('air',null,{slot:other}))),false,`stand ${slot}, direction ${direction}, t=${t}, parked=${other}`);
 }
});
test('all fleet variants have continuous paths and end at their own stand or track',()=>{
 for(const mode of ['air','rail'])for(let slot=0;slot<fleet[mode].length;slot++)for(const direction of [-1,1]){
  const variant={slot,direction};
  for(let t=0;t<transportDuration[mode];t+=.02){const a=transportPose(mode,t,variant),b=transportPose(mode,t+.02,variant);
   assert.ok([a.x,a.y,a.z,a.heading,a.pitch].every(Number.isFinite));
   if(a.visible&&b.visible)assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1,`${mode} ${slot} ${direction} ${t}`);
   if(mode==='rail')assert.equal(a.y,fleet.rail[slot].y);
  }
  assert.deepEqual(transportPose(mode,transportDuration[mode],variant),transportPose(mode,null,variant));
 }
});
test('stable event seeds vary both directions and every vehicle without changing on refresh',()=>{
 for(const mode of ['air','rail']){
  const choices=new Set();
  for(let i=0;i<100;i++){const key=`${mode}:${1789492440000+i*60000}`,a=departureVariant(mode,key);choices.add(`${a.slot}:${a.direction}`);assert.deepEqual(a,departureVariant(mode,key));}
  assert.equal(choices.size,fleet[mode].length*2);
 }
 const trips=[{id:'a',mode:'air',members:'a',destination:'b',departAt:'2026-09-16T12:00:00Z',endAt:'2026-09-17T12:00:00Z'}];
 assert.deepEqual(buildTransportSchedule(trips).air[0].variant,buildTransportSchedule(JSON.parse(JSON.stringify(trips))).air[0].variant);
});
test('cloned cabin material retains night light during motion, dimming and train clipping',()=>{
 const original=new THREE.MeshStandardMaterial();original.name='city_cabin_vertex_color';
 for(const mode of ['air','rail']){
  const copy=transportMaterial(original,mode,1);updateCabinLight(copy,1);assert.equal(copy.emissiveIntensity,1.55);assert.equal(original.emissiveIntensity,1);
  copy.opacity=.4;updateCabinLight(copy,.5);assert.equal(copy.emissiveIntensity,.775);assert.equal(copy.opacity,.4);
  updateCabinLight(copy,0);assert.equal(copy.emissiveIntensity,0);
  if(mode==='rail')assert.equal(copy.clippingPlanes.length,2);
  copy.dispose();
 }
 original.dispose();
});
