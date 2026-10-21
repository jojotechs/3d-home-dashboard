import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmController} from '../src/habits/request-controller.mjs';

const farm=(day='2026-10-20',version=0)=>({household_id:'home-a',member_id:'member-a',habit_day:day,server_now:'2026-10-20T12:00:00Z',version,habits:[],inventory:{daisy_seeds:0,daisy_bouquets:0}});
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const setup=(transport,store=storage())=>createFarmController({owner:'user-a',householdId:'home-a',transport,storage:store,uuid:()=> 'request-1'});

test('lost confirmation survives reload and replays the original request before reading the current day',async()=>{
 const store=storage();const writes=[];let first=true;let current=farm();
 const receipt={request_id:'request-1',type:'record',habit_day:'2026-10-20',applied_at:'2026-10-20T19:59:50Z',result:{entry_id:'entry-1'}};
 const transport={read:async()=>current,apply:async request=>{writes.push(structuredClone(request));if(first){first=false;throw new TypeError('response lost');}return {...farm(),receipt};}};
 const original=setup(transport,store);await original.start();
 await original.submit({type:'record',habit_id:'habit-1',habit_day:'2026-10-20'});
 assert.equal(original.getSnapshot().status,'unknown');
 original.dispose();current=farm('2026-10-21',2);
 const restored=setup(transport,store);await restored.start();
 assert.equal(restored.getSnapshot().status,'unknown');
 await restored.retry();
 assert.deepEqual(writes[1],writes[0]);
 assert.equal(restored.getSnapshot().farm.habit_day,'2026-10-21');
 assert.equal(restored.getSnapshot().lastReceipt.habit_day,'2026-10-20');
 assert.equal(restored.getSnapshot().request,null);
 assert.equal(restored.getSnapshot().status,'ready');
});

test('a never-applied request that expires keeps its old day and requires an explicit fresh submission',async()=>{
 const writes=[];let online=false;let current=farm();
 const controller=setup({read:async()=>current,apply:async request=>{writes.push(structuredClone(request));if(!online)throw new TypeError('offline');throw {code:'P0001',message:'HABIT_REQUEST_EXPIRED'};}});
 await controller.start();await controller.submit({type:'create',id:'habit-new',name:'早睡',habit_day:'2026-10-20'});
 online=true;current=farm('2026-10-21');await controller.refresh();await controller.retry();
 assert.equal(controller.getSnapshot().status,'expired');
 assert.equal(controller.getSnapshot().request.p_action.name,'早睡');
 await controller.submit({type:'create',id:'habit-newer',name:'早睡',habit_day:'2026-10-21'});
 assert.equal(writes.length,2,'unacknowledged expiry cannot silently become today');
 assert.equal(writes[1].p_action.habit_day,'2026-10-20');
 controller.acknowledgeFailure();assert.equal(controller.getSnapshot().request,null);
 assert.equal(controller.getSnapshot().farm.habit_day,'2026-10-21');
});

test('a confirmed receipt survives a failed current read and reload without resubmitting the action',async()=>{
 const store=storage();let readCount=0,writes=0,allowRead=false;
 const receipt={request_id:'request-1',type:'claim_seeds',habit_day:'2026-10-20',applied_at:'2026-10-20T12:00:00Z',result:{quantity:2}};
 const transport={read:async()=>{readCount++;if(readCount>1&&!allowRead)throw new TypeError('read offline');return {...farm('2026-10-21',3),inventory:{daisy_seeds:2,daisy_bouquets:0}};},apply:async()=>{writes++;return {...farm(),receipt};}};
 const first=setup(transport,store);await first.start();await first.submit({type:'claim_seeds',quantity:2,habit_day:'2026-10-20'});
 assert.equal(first.getSnapshot().status,'confirmed');assert.equal(first.getSnapshot().lastReceipt.result.quantity,2);
 first.dispose();allowRead=true;
 const restored=setup(transport,store);await restored.start();
 assert.equal(restored.getSnapshot().farm.inventory.daisy_seeds,2);assert.equal(writes,1);
 assert.equal(restored.getSnapshot().status,'ready');
});

test('leaving an identity clears its pending payload and late responses cannot restore its private farm',async()=>{
 const store=storage();let resolveWrite;
 const controller=setup({read:async()=>farm(),apply:()=>new Promise(resolve=>{resolveWrite=resolve;})},store);
 await controller.start();const pending=controller.submit({type:'create',id:'habit-new',name:'私密目标',habit_day:'2026-10-20'});
 controller.dispose({clearPending:true});
 assert.equal(controller.getSnapshot().farm,null);assert.equal(controller.getSnapshot().request,null);
 resolveWrite({...farm(),receipt:{request_id:'request-1',type:'create',habit_day:'2026-10-20',result:{habit_id:'habit-new'}}});await pending;
 const replacement=setup({read:async()=>farm(),apply:async()=>{throw new Error('must not replay');}},store);await replacement.start();
 assert.equal(replacement.getSnapshot().request,null);
 assert.equal(controller.getSnapshot().farm,null);
});

test('a cloud access denial clears previously readable private state and cannot be dismissed into editing',async()=>{
 let denied=false;
 const controller=setup({read:async()=>{if(denied)throw {code:'P0001',message:'HABIT_ACCESS_DENIED'};return farm();},apply:async()=>{throw new Error('must not write');}});
 await controller.start();denied=true;await controller.refresh();
 assert.equal(controller.getSnapshot().status,'denied');assert.equal(controller.getSnapshot().farm,null);
 controller.acknowledgeFailure();assert.equal(controller.getSnapshot().status,'denied');
});

test('unavailable browser storage retains the input and never sends an unrecoverable write',async()=>{
 let writes=0;
 const brokenStorage={getItem:()=>null,setItem:()=>{throw new Error('storage full');},removeItem:()=>{}};
 const controller=setup({read:async()=>farm(),apply:async()=>{writes++;throw new Error('must not write');}},brokenStorage);
 await controller.start();await controller.submit({type:'create',id:'habit-new',name:'保留名称',habit_day:'2026-10-20'});
 assert.equal(writes,0);assert.equal(controller.getSnapshot().status,'failed');
 assert.equal(controller.getSnapshot().request.p_action.name,'保留名称');
});

test('a read delayed by network and member locking keeps the undo time reported by the server',async()=>{
 const {remainingServerSeconds}=await import('../src/habits/server-clock.mjs');
 let monotonic=1000;
 const controller=createFarmController({owner:'user-a',householdId:'home-a',storage:storage(),monotonicNow:()=>monotonic,
  transport:{read:async()=>{monotonic=13000;return {...farm(),server_now:'2026-10-20T12:00:15Z'};},apply:async()=>{throw new Error('unused');}}});
 await controller.start();
 const anchor=controller.getSnapshot().clock;
 assert.equal(remainingServerSeconds('2026-10-20T12:00:30Z',anchor,13000),15,'twelve seconds before the response are not deducted twice');
 assert.equal(remainingServerSeconds('2026-10-20T12:00:30Z',anchor,17000),11);
 assert.equal(remainingServerSeconds('2026-10-20T12:00:30Z',anchor,28000),0);
});

test('an old instance cannot publish a late read or replace the next instance’s server clock',async()=>{
 let resolveOld,oldNotifications=0;
 const old=setup({read:()=>new Promise(resolve=>{resolveOld=resolve;}),apply:async()=>{throw new Error('unused');}});
 old.subscribe(()=>{oldNotifications++;});const pending=old.start();
 old.dispose();const before=oldNotifications;
 const current=createFarmController({owner:'user-a',householdId:'home-a',storage:storage(),monotonicNow:()=>9000,
  transport:{read:async()=>({...farm('2026-10-21'),server_now:'2026-10-21T00:00:00Z'}),apply:async()=>{throw new Error('unused');}}});
 await current.start();const accepted=current.getSnapshot().clock;
 resolveOld({...farm(),server_now:'2026-10-20T12:00:00Z'});await pending;
 assert.equal(old.getSnapshot().farm,null);assert.equal(old.getSnapshot().clock,null);assert.equal(oldNotifications,before);
 assert.equal(current.getSnapshot().clock,accepted);assert.equal(accepted.receivedAt,9000);
 assert.equal(current.getSnapshot().farm.habit_day,'2026-10-21');
});
