import test from 'node:test';import assert from 'node:assert/strict';
import {makeRoute,sampleRoute,carRoutes,walkingRoutes,createMobility} from '../src/mobility-sim.mjs';
test('lane paths are continuous at the loop seam and keep right on straight roads',()=>{
 const route=makeRoute([[0,0],[60,0],[60,40],[0,40]]);
 const a=sampleRoute(route,route.length-.001),b=sampleRoute(route,.001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.003);
 const east=sampleRoute(route,20);assert.ok(Math.abs(east.y+1.5)<.01);
 for(const r of [...carRoutes,...walkingRoutes]){assert.ok(r.length>0);for(let s=0;s<r.length;s+=3){const p=sampleRoute(r,s);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(Math.abs(Math.hypot(p.dx,p.dy)-1)<.00001);}}
});
test('traffic and pedestrians advance with bounded speed, and zero time freezes them',()=>{
 const sim=createMobility(22),before=sim.cars.map(c=>c.s),walk=sim.people[0].s;
 for(let i=0;i<1200;i++)sim.step(1/60);
 assert.ok(sim.cars.some((c,i)=>Math.abs(c.s-before[i])>10));assert.notEqual(sim.people[0].s,walk);
 assert.ok(sim.cars.every(c=>c.speed>=0&&c.speed<=c.cruise+.001));
 const frozen=JSON.stringify(sim.cars.map(c=>c.pose));sim.step(0);assert.equal(JSON.stringify(sim.cars.map(c=>c.pose)),frozen);
});
test('randomized spawning avoids cars on top of one another',()=>{
 for(const seed of [1,22,843]){const cars=createMobility(seed).cars;for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)assert.ok(Math.hypot(cars[i].pose.x-cars[j].pose.x,cars[i].pose.y-cars[j].pose.y)>8.9);}
});

test('all road routes keep the calibrated car width on the actual six-metre roads',async()=>{
 const {readFile}=await import('node:fs/promises');const manifest=JSON.parse(await readFile(new URL('../modeling/scene-manifest.json',import.meta.url),'utf8'));
 const paths=[...manifest.roads.map(r=>r.centerline_xy_m),manifest.mobility.airport_access_xy_m];
 const segments=paths.flatMap(points=>points.slice(1).map((p,i)=>[points[i],p]));
 function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);}
 for(const route of carRoutes)for(let s=0;s<route.length;s+=.5){const p=sampleRoute(route,s),edge=Math.min(...segments.map(([a,b])=>distance(p,a,b)))+manifest.mobility.road_car_width_m/2;assert.ok(edge<3,`car width leaves road at ${p.x},${p.y}: ${edge}`);}
});
