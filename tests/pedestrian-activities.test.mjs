import test from 'node:test';
import assert from 'node:assert/strict';
import {DistrictActivities} from '../src/activities/DistrictActivities.mjs';
import {PedestrianActivities} from '../src/activities/PedestrianActivities.mjs';
import {createMobility,randomGenerator,walkingRoutes,sampleRoute} from '../src/mobility-sim.mjs';
import plans from '../modeling/finance-activities.json' with {type:'json'};

const provider=level=>new DistrictActivities({id:'finance',origin:[-76,56,0],routeIndex:plans.routeIndex,entrance:plans.entrance,...plans.levels[level]});
const pedestrian=(id=0)=>({id,routeIndex:0,pose:{x:-76,y:31.6,dx:1,dy:0},speed:1.2,phase:0,visible:true});

test('street pedestrians visit real places, stop, emerge with purchases and return continuously to their route',()=>{
  for(const level of [1,2]){
    const activities=new PedestrianActivities({random:randomGenerator(11)});activities.register(provider(level));
    const sim=createMobility(72,0,40,{activities}),states=new Set(),places=new Set();let purchased=false;
    for(let frame=0;frame<60*900;frame++){
      const before=sim.people.map(p=>({...p.pose}));sim.step(1/60);
      for(const p of sim.people){
        assert.ok(Math.hypot(p.pose.x-before[p.id].x,p.pose.y-before[p.id].y)<.023,'No district/street teleport during normal visits');
        if(p.carrying)purchased=true;
      }
      for(const v of activities.snapshot().visitors){states.add(v.state);if(v.place)places.add(v.place);}
    }
    assert.ok(activities.completed>4);assert.ok(states.has('inside'));assert.ok(states.has('leaving'));
    assert.ok(states.has('coffee'));if(level===2)assert.ok(states.has('browsing'));
    assert.ok(purchased);assert.equal(places.size,plans.levels[level].places.length);
    assert.equal(sim.people.length,40,'Visits reuse street people, not duplicate NPCs');
  }
});

test('reservations prevent overlapping stops; district removal safely restores every visiting actor',()=>{
  const activities=new PedestrianActivities({random:()=>0}),district=provider(1),unregister=activities.register(district);
  const people=Array.from({length:5},(_,i)=>pedestrian(i));people.forEach(p=>activities.tryEnter(p));
  assert.equal(activities.snapshot().visitors.length,4);assert.equal(district.occupied.size,4);
  const before=JSON.stringify(activities.snapshot());people.forEach(p=>activities.update(p,0));
  assert.equal(JSON.stringify(activities.snapshot()),before,'Zero time freezes walking and dwell');
  for(let i=0;i<3000;i++)people.forEach(p=>activities.update(p,1/60));
  unregister();assert.deepEqual(activities.snapshot().visitors,[]);assert.equal(district.occupied.size,0);
  assert.ok(people.every(p=>p.visible!==false));
  const newer=provider(2);activities.register(newer);unregister();
  assert.deepEqual(activities.snapshot().districts,['finance'],'Stale cleanup cannot remove a replacement');
  activities.dispose();assert.deepEqual(activities.snapshot().districts,[]);
});

test('a different district can inject a new activity without changing pedestrians or finance code',()=>{
  const activities=new PedestrianActivities({random:()=>0});
  activities.register(new DistrictActivities({id:'library',origin:[0,0,0],routeIndex:4,entrance:'gate',nodes:{gate:[0,0,.72],desk:[0,1,.72]},edges:[['gate','desk']],places:[{id:'reading',node:'desk',action:'reading',dwell:[2,2],facing:[1,0]}]}));
  const p={...pedestrian(),routeIndex:4,pose:{x:0,y:0,dx:0,dy:1}};assert.ok(activities.tryEnter(p));
  for(let i=0;i<60;i++)activities.update(p,1/60);
  assert.equal(activities.snapshot().visitors[0].state,'reading');assert.equal(p.moving,false);assert.equal(p.visible,true);
  for(let i=0;i<300;i++)activities.update(p,1/60);
  assert.equal(activities.completed,1);assert.equal(p.pose.x,0);assert.equal(p.pose.y,0);
});

test('each finance place is reachable from the real sidewalk and all routes are finite',()=>{
  for(const level of [1,2]){
    const district=provider(level),route=walkingRoutes[district.routeIndex];let closest=Infinity;
    for(let s=0;s<route.length;s+=.1){const p=sampleRoute(route,s);closest=Math.min(closest,Math.hypot(p.x-district.entry[0],p.y-district.entry[1]));}
    assert.ok(closest<.1);
    for(const from of [district.entrance,...district.places.map(p=>p.node)])for(const to of district.places.map(p=>p.node)){
      const path=district.path(from,to);assert.ok(path.every(p=>p.length===3&&p.every(Number.isFinite)));
    }
  }
});
