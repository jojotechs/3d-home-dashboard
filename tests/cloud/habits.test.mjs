import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const required=name=>{assert.ok(process.env[name],`Missing ${name}; use the isolated H01 test configuration.`);return process.env[name];};
assert.equal(required('TEST_ALLOW_WRITES'),'true');
const household=required('TEST_HOUSEHOLD_ID');
const client=()=>createClient(required('SUPABASE_URL'),required('SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const value=async promise=>{const {data,error}=await promise;assert.equal(error,null);return data;};
const denied=async(promise,message)=>{const {error}=await promise;assert.ok(error);if(message)assert.ok(error.message.includes(message),error.message);};
async function login(role){const api=client();await value(api.auth.signInWithPassword({email:required(`TEST_${role}_EMAIL`),password:required(`TEST_${role}_PASSWORD`)}));return api;}
const read=api=>value(api.rpc('get_personal_farm',{p_household_id:household}));
const request=action=>({p_household_id:household,p_request_id:randomUUID(),p_action:action});
const apply=(api,input)=>value(api.rpc('apply_habit_action',input));

test('hosted personal farm: private ownership, real undo deadline, stable growth and duplicate HTTP requests',async t=>{
  const owner=await login('ADMIN'),member=await login('EDITOR'),outsider=await login('OUTSIDER');
  t.after(async()=>{await Promise.all([owner,member,outsider].map(api=>api.auth.signOut({scope:'local'})));});
  const initial=await read(owner),memberBefore=await read(member);
  assert.equal(initial.household_id,household);
  assert.equal(initial.coins,0);
  assert.deepEqual(initial.animals,[]);assert.deepEqual(initial.facilities,[]);
  const day=initial.habit_day,id=randomUUID(),undoHabit=randomUUID();
  const created=await apply(owner,request({type:'create',id,name:'H01 接口每日运动',habit_day:day}));
  const find=farm=>farm.habits.find(habit=>habit.id===id);
  assert.equal(find(created).visibility,'private');
  assert.equal(find(created).plot.status,'unplanted');
  await apply(owner,request({type:'create',id:undoHabit,name:'H01 接口撤销验证',habit_day:day}));
  const seedRequest=request({type:'claim_seeds',quantity:2,habit_day:day});
  const seeds=await Promise.all([apply(owner,seedRequest),apply(owner,seedRequest)]);
  assert.deepEqual(seeds[0],seeds[1]);
  assert.equal((await read(owner)).inventory.daisy_seeds,initial.inventory.daisy_seeds+2);
  await denied(owner.rpc('apply_habit_action',{...seedRequest,p_action:{...seedRequest.p_action,quantity:3}}),'REQUEST_MISMATCH');
  await apply(owner,request({type:'plant',habit_id:id,habit_day:day}));
  assert.equal(find(await read(owner)).plot.growth,0);

  const undoRecord=await apply(owner,request({type:'record',habit_id:undoHabit,habit_day:day}));
  const undoneEntry=undoRecord.habits.find(habit=>habit.id===undoHabit).entries.at(-1);
  assert.equal(Date.parse(undoneEntry.undo_until)-Date.parse(undoneEntry.recorded_at),30000);
  await apply(owner,request({type:'undo',entry_id:undoneEntry.id}));
  assert.equal((await read(owner)).habits.find(habit=>habit.id===undoHabit).today.completed,false);

  const recordRequest=request({type:'record',habit_id:id,habit_day:day});
  const competingRequests=[recordRequest,request({...recordRequest.p_action})];
  const race=await Promise.all(competingRequests.map(input=>owner.rpc('apply_habit_action',input)));
  assert.equal(race.filter(result=>!result.error).length,1);
  assert.ok(race.find(result=>result.error).error.message.includes('ALREADY_RECORDED'));
  const successfulIndex=race.findIndex(result=>!result.error);
  const saved=race[successfulIndex].data;
  const entry=find(saved).entries.at(-1);
  assert.equal(find(saved).pending_growth,1);
  assert.equal(find(saved).plot.growth,0);
  assert.equal(find(saved).plot.ready,0);
  const committedRequest=competingRequests[successfulIndex];
  // Discard the first response and recover the same receipt, whichever request won.
  assert.deepEqual(await apply(owner,committedRequest),saved);
  await denied(member.rpc('apply_habit_action',request({type:'collect',habit_id:id})),'NOT_FOUND');
  assert.deepEqual((await read(member)).habits,memberBefore.habits);
  await denied(outsider.rpc('get_personal_farm',{p_household_id:household}));
  await denied(client().rpc('get_personal_farm',{p_household_id:household}));
  await denied(outsider.rpc('apply_habit_action',recordRequest));
  await denied(owner.rpc('apply_habit_action',request({type:'record',habit_id:undoHabit,habit_day:'2000-01-01'})),'REQUEST_EXPIRED');

  // A real wall-clock deadline against hosted Postgres, not a simulated clock.
  const milliseconds=Math.max(0,Date.parse(entry.undo_until)-Date.now())+1500;
  assert.ok(milliseconds<=32000);
  await new Promise(resolve=>setTimeout(resolve,milliseconds));
  const settled=await read(owner),grown=find(settled);
  assert.equal(grown.pending_growth,0);
  assert.equal(grown.plot.growth,1);
  assert.equal(grown.plot.ready,0);
  assert.equal(grown.entries.at(-1).growth_granted,true);
  await denied(owner.rpc('apply_habit_action',request({type:'undo',entry_id:entry.id})),'UNDO_EXPIRED');
  assert.equal(find(await read(owner)).plot.growth,1);
  assert.equal((await read(owner)).habits.find(habit=>habit.id===undoHabit).plot.unallocated_growth,0);
  assert.deepEqual(await apply(owner,committedRequest),saved,'original receipt survives settlement');
  const evidence={checkedAt:new Date().toISOString(),household,initialHabitCount:initial.habits.length,memberHabitCount:memberBefore.habits.length,
    realDeadlineMs:30000,recordedAt:entry.recorded_at,undoUntil:entry.undo_until,readAt:settled.server_now,
    confirmedGrowth:grown.plot.growth,ready:grown.plot.ready,duplicateClaimOnce:true,concurrentRecordOnce:true,privateIsolation:true,
    undoWithinWindow:true,undoAfterDeadlineRejected:true,source:'Actual hosted Auth and public RPC; current day and real elapsed time.'};
  await writeFile('docs/verification/h01/cloud-current-day.json',JSON.stringify(evidence,null,2)+'\n');
  t.diagnostic(`Verified isolated household ${household}: real current-day 30-second expiry and private farm boundary.`);
});
