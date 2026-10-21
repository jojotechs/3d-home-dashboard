import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {habitsDatabase} from './helpers/habits-database.mjs';

async function setup(t, now) {
  const api = await habitsDatabase(now); t.after(() => api.db.close());
  const actor = randomUUID(), household = randomUUID();
  await api.provision(actor, household);
  return {api, actor, household};
}
const action = (api, actor, household, payload, request = randomUUID()) => api.act(actor, household, request, payload);
const create = (api, actor, household, name = '阅读', id = randomUUID(), day = '2026-10-21') => action(api, actor, household, {type:'create', id, name, habit_day:day});

async function recordAt(api, actor, household, habit, day, time = '04:00:00') {
  await api.setNow(`${day}T${time}Z`);
  return action(api, actor, household, {type:'record',habit_id:habit,habit_day:day});
}

test('a household member without finance access starts with an empty personal farm; other households and signed-out callers cannot read it', async t => {
  const {api, actor, household} = await setup(t);
  const member = randomUUID(), outsider = randomUUID(), other = randomUUID();
  await api.addMember(member, household); await api.provision(outsider, other);
  const farm = await api.read(member, household);
  assert.equal(farm.household_id, household); assert.ok(farm.member_id);
  assert.equal(new Date(farm.server_now).toISOString(), '2026-10-21T04:00:00.000Z');
  assert.equal(farm.habit_day, '2026-10-21'); assert.equal(farm.version, 0);
  assert.deepEqual(farm.inventory, {daisy_seeds:0, daisy_bouquets:0});
  assert.equal(farm.coins, 0); assert.deepEqual(farm.habits, []);
  assert.deepEqual(farm.animals, []); assert.deepEqual(farm.facilities, []);
  assert.notEqual((await api.read(actor, household)).member_id, farm.member_id);
  await assert.rejects(api.read(outsider, household), /HABIT_ACCESS_DENIED/);
  await assert.rejects(api.read(null, household));
});

test('creating same-named habits keeps separate private identities and exact request receipts without planting', async t => {
  const {api, actor, household} = await setup(t);
  const first = randomUUID(), request = randomUUID();
  const payload = {type:'create', id:first, name:' 阅读 ', habit_day:'2026-10-21'};
  const saved = await action(api, actor, household, payload, request);
  assert.equal(saved.receipt.request_id, request); assert.equal(saved.receipt.result.habit_id, first);
  assert.equal(saved.habits[0].name, '阅读'); assert.equal(saved.habits[0].visibility, 'private');
  assert.equal(saved.habits[0].schedule, 'daily'); assert.equal(saved.habits[0].start_day, '2026-10-21');
  assert.deepEqual(saved.habits[0].entries, []); assert.equal(saved.habits[0].plot.status, 'unplanted');
  await create(api, actor, household);
  await api.setNow('2026-10-22T04:00:00Z');
  assert.deepEqual(await action(api, actor, household, payload, request), saved);
  const current = await api.read(actor, household);
  assert.equal(current.habits.length, 2); assert.equal(current.version, 2);
  assert.ok(current.habits[0].created_order < current.habits[1].created_order);
  await assert.rejects(action(api, actor, household, {...payload, name:'运动'}, request), /HABIT_REQUEST_MISMATCH/);
  const family = randomUUID(); await api.addMember(family, household);
  assert.deepEqual((await api.read(family, household)).habits, []);
});

test('personal creation order does not expose another family member’s private habit count', async t => {
  const {api, actor, household} = await setup(t);
  const member = randomUUID(); await api.addMember(member, household);
  await create(api, actor, household); await create(api, actor, household);
  const own = await create(api, member, household);
  assert.equal(own.habits[0].created_order, 1);
  await create(api, actor, household);
  const next = await create(api, member, household);
  assert.deepEqual(next.habits.map(h => h.created_order), [1,2]);
});

test('daily completion is a 30-second preview before exactly one unplanted growth credit becomes usable', async t => {
  const {api, actor, household} = await setup(t);
  const id = randomUUID(); await create(api, actor, household, '运动', id);
  const saved = await action(api, actor, household, {type:'record', habit_id:id, habit_day:'2026-10-21'});
  const h = saved.habits[0];
  assert.equal(h.today.completed, true); assert.equal(h.today.can_record, false);
  assert.equal(h.pending_growth, 1); assert.equal(h.plot.unallocated_growth, 0);
  assert.equal(new Date(h.entries[0].undo_until).toISOString(), '2026-10-21T04:00:30.000Z');
  await assert.rejects(action(api, actor, household, {type:'record', habit_id:id, habit_day:'2026-10-21'}), /HABIT_ALREADY_RECORDED/);
  await api.setNow('2026-10-21T04:00:29.999Z');
  assert.equal((await api.read(actor, household)).habits[0].plot.unallocated_growth, 0);
  await api.setNow('2026-10-21T04:00:30Z');
  const stable = await api.read(actor, household);
  assert.equal(stable.habits[0].pending_growth, 0);
  assert.equal(stable.habits[0].entries[0].growth_granted, true);
  assert.equal(stable.habits[0].plot.unallocated_growth, 1);
  assert.equal(stable.habits[0].plot.ready, 0);
  assert.deepEqual(await api.read(actor, household), stable);
});

test('the original undo deadline survives the 04:00 boundary without permitting a new backdated record', async t => {
  const {api, actor, household} = await setup(t, '2026-10-20T19:59:50Z');
  const id = randomUUID(); await create(api, actor, household, '00:30 前睡觉', id, '2026-10-20');
  const request = randomUUID(), payload = {type:'record', habit_id:id, habit_day:'2026-10-20'};
  const saved = await action(api, actor, household, payload, request);
  const entry = saved.receipt.result.entry_id;
  await api.setNow('2026-10-20T20:00:10Z');
  assert.equal((await api.read(actor, household)).habit_day, '2026-10-21');
  assert.deepEqual(await action(api, actor, household, payload, request), saved);
  const undone = await action(api, actor, household, {type:'undo', entry_id:entry});
  assert.ok(undone.habits[0].entries[0].undone_at);
  assert.equal(undone.habits[0].pending_growth, 0);
  await assert.rejects(action(api, actor, household, payload), /HABIT_REQUEST_EXPIRED/);
  const next = await action(api, actor, household, {type:'record', habit_id:id, habit_day:'2026-10-21'});
  await api.setNow('2026-10-20T20:00:40Z');
  await assert.rejects(action(api, actor, household, {type:'undo',entry_id:next.receipt.result.entry_id}), /HABIT_UNDO_EXPIRED/);
  assert.equal((await api.read(actor, household)).habits[0].plot.unallocated_growth, 1);
  assert.deepEqual(await action(api, actor, household, payload, request), saved);
});

test('claiming a finite number of free seeds never plants until the owner explicitly starts one round', async t => {
  const {api, actor, household} = await setup(t);
  const id = randomUUID(); await create(api, actor, household, '阅读', id);
  const plant = {type:'plant',habit_id:id,habit_day:'2026-10-21'};
  await assert.rejects(action(api, actor, household, plant), /HABIT_SEEDS_REQUIRED/);
  const request = randomUUID(), claim = {type:'claim_seeds',quantity:2,habit_day:'2026-10-21'};
  const received = await action(api, actor, household, claim, request);
  assert.equal(received.inventory.daisy_seeds, 2); assert.equal(received.coins, 0);
  assert.equal(received.habits[0].plot.status, 'unplanted');
  assert.deepEqual(await action(api, actor, household, claim, request), received);
  const planted = await action(api, actor, household, plant);
  assert.equal(planted.inventory.daisy_seeds, 1);
  assert.equal(planted.habits[0].plot.species_id, 'daisy');
  assert.equal(planted.habits[0].plot.status, 'growing'); assert.equal(planted.habits[0].plot.growth, 0);
  await assert.rejects(action(api, actor, household, plant), /HABIT_ALREADY_PLANTED/);
  assert.equal((await api.read(actor, household)).inventory.daisy_seeds, 1);
});

test('three controlled due days mature one bouquet and reseed from finite stock before a separate idempotent collection', async t => {
  const {api, actor, household} = await setup(t);
  const id = randomUUID(); await create(api, actor, household, '阅读', id);
  await action(api, actor, household, {type:'claim_seeds',quantity:3,habit_day:'2026-10-21'});
  await action(api, actor, household, {type:'plant',habit_id:id,habit_day:'2026-10-21'});
  for (const [day,expectedGrowth,expectedReady] of [['21',1,0],['22',2,0],['23',0,1]]) {
    await api.setNow(`2026-10-${day}T04:00:00Z`);
    await action(api, actor, household, {type:'record',habit_id:id,habit_day:`2026-10-${day}`});
    const preview = await action(api, actor, household, {type:'collect',habit_id:id});
    assert.equal(preview.receipt.result.quantity, 0);
    await api.setNow(`2026-10-${day}T04:00:30Z`);
    const farm = await api.read(actor, household);
    assert.equal(farm.habits[0].plot.growth, expectedGrowth);
    assert.equal(farm.habits[0].plot.ready, expectedReady);
  }
  const mature = await api.read(actor, household);
  assert.equal(mature.habits[0].plot.status, 'growing');
  assert.equal(mature.inventory.daisy_seeds, 1); assert.equal(mature.inventory.daisy_bouquets, 0);
  const request = randomUUID(), payload = {type:'collect',habit_id:id};
  const collected = await action(api, actor, household, payload, request);
  assert.equal(collected.inventory.daisy_bouquets, 1); assert.equal(collected.coins, 0);
  assert.equal(collected.habits[0].plot.ready, 0);
  assert.deepEqual(await action(api, actor, household, payload, request), collected);
  assert.equal((await action(api, actor, household, payload)).inventory.daisy_bouquets, 1);
});

test('delayed settlement orders waiting habits by actual maturity time before stable creation order, independent of reads', async t => {
  const {api, actor, household} = await setup(t);
  const earlier = randomUUID(), later = randomUUID();
  await create(api, actor, household, '较早创建', earlier); await create(api, actor, household, '较晚创建', later);
  await action(api, actor, household, {type:'claim_seeds',quantity:2,habit_day:'2026-10-21'});
  for (const id of [earlier,later]) await action(api, actor, household, {type:'plant',habit_id:id,habit_day:'2026-10-21'});
  for (const day of ['2026-10-21','2026-10-22','2026-10-23']) {
    await recordAt(api, actor, household, later, day);
    await recordAt(api, actor, household, earlier, day, '04:00:10');
  }
  await api.setNow('2026-10-24T04:00:00Z');
  const waiting = await api.read(actor, household);
  assert.deepEqual(waiting.habits.map(h => [h.plot.status,h.plot.ready]), [['waiting',1],['waiting',1]]);
  assert.equal(new Date(waiting.habits[1].plot.waiting_since).toISOString(), '2026-10-23T04:00:30.000Z');
  for (const id of [earlier,later]) await recordAt(api, actor, household, id, '2026-10-24');
  await api.setNow('2026-10-24T04:00:30Z');
  await api.read(actor, household); await api.read(actor, household);
  const claim = {type:'claim_seeds',quantity:1,habit_day:'2026-10-24'}, request = randomUUID();
  const replenished = await action(api, actor, household, claim, request);
  assert.deepEqual(replenished.habits.map(h => [h.plot.status,h.plot.growth,h.plot.unallocated_growth]),
    [['waiting',0,1],['growing',1,0]]);
  assert.equal(replenished.inventory.daisy_seeds, 0);
  assert.deepEqual(await action(api, actor, household, claim, request), replenished);
  const second = await action(api, actor, household, claim);
  assert.deepEqual(second.habits.map(h => [h.plot.status,h.plot.growth]), [['growing',1],['growing',1]]);
});

test('simultaneous maturity uses stable habit creation order even when records arrive in reverse order', async t => {
  const {api, actor, household} = await setup(t);
  const first = randomUUID(), second = randomUUID();
  await create(api, actor, household, 'A', first); await create(api, actor, household, 'B', second);
  await action(api, actor, household, {type:'claim_seeds',quantity:3,habit_day:'2026-10-21'});
  for (const id of [first,second]) await action(api, actor, household, {type:'plant',habit_id:id,habit_day:'2026-10-21'});
  for (const day of ['2026-10-21','2026-10-22','2026-10-23']) {
    for (const id of [second,first]) await recordAt(api, actor, household, id, day);
  }
  await api.setNow('2026-10-23T04:00:30Z');
  const farm = await api.read(actor, household);
  assert.deepEqual(farm.habits.map(h => [h.plot.status,h.plot.ready]), [['growing',1],['waiting',1]]);
  assert.equal(farm.inventory.daisy_seeds, 0);
});

test('six saved credits and two seeds produce exactly two rounds for that habit, then shortage preserves later credits and mature products', async t => {
  const {api, actor, household} = await setup(t);
  const id = randomUUID(); await create(api, actor, household, '阅读', id);
  for (const day of ['21','22','23','24','25','26']) await recordAt(api, actor, household, id, `2026-10-${day}`);
  await api.setNow('2026-10-26T04:00:30Z');
  const bank = await api.read(actor, household);
  assert.equal(bank.habits[0].plot.unallocated_growth, 6); assert.equal(bank.habits[0].plot.ready, 0);
  const claimed = await action(api, actor, household, {type:'claim_seeds',quantity:2,habit_day:'2026-10-26'});
  assert.equal(claimed.habits[0].plot.status, 'unplanted');
  const grown = await action(api, actor, household, {type:'plant',habit_id:id,habit_day:'2026-10-26'});
  assert.equal(grown.inventory.daisy_seeds, 0); assert.equal(grown.habits[0].plot.ready, 2);
  assert.equal(grown.habits[0].plot.unallocated_growth, 0); assert.equal(grown.habits[0].plot.status, 'waiting');
  await recordAt(api, actor, household, id, '2026-10-27');
  await api.setNow('2026-11-02T04:00:00Z');
  const waiting = await api.read(actor, household);
  assert.equal(waiting.habits[0].plot.unallocated_growth, 1); assert.equal(waiting.habits[0].plot.ready, 2);
  assert.equal(waiting.habits[0].plot.status, 'waiting'); assert.equal(waiting.coins, 0);
  const collected = await action(api, actor, household, {type:'collect',habit_id:id});
  assert.equal(collected.inventory.daisy_bouquets, 2); assert.equal(collected.habits[0].plot.unallocated_growth, 1);
  const replanted = await action(api, actor, household, {type:'claim_seeds',quantity:1,habit_day:'2026-11-02'});
  assert.equal(replanted.habits[0].plot.growth, 1); assert.equal(replanted.habits[0].plot.unallocated_growth, 0);
});

test('the public boundary rejects blank names, malformed counts, injected fields and capabilities beyond daily H01', async t => {
  const {api, actor, household} = await setup(t);
  const id = randomUUID();
  for (const name of ['', ' \n\t ', '字'.repeat(101), null, 1]) {
    await assert.rejects(create(api, actor, household, name, id), /HABIT_INVALID_INPUT/);
  }
  for (const quantity of [0,-1,1.5,'2',null,9007199254740992]) {
    await assert.rejects(action(api, actor, household, {type:'claim_seeds',quantity,habit_day:'2026-10-21'}), /HABIT_INVALID_INPUT/);
  }
  for (const extra of [{server_now:'2020-01-01'}, {member_id:randomUUID()}, {growth:99}, {visibility:'household'}, {schedule:'weekly'}]) {
    await assert.rejects(action(api, actor, household, {type:'create',id,name:'阅读',habit_day:'2026-10-21',...extra}), /HABIT_INVALID_INPUT/);
  }
  for (const type of ['set','delete','backfill','sell','archive']) {
    await assert.rejects(action(api, actor, household, {type}), /HABIT_INVALID_ACTION/);
  }
  await assert.rejects(action(api, actor, household, {type:'claim_seeds',quantity:1}), /HABIT_INVALID_INPUT/);
  const empty = await api.read(actor, household);
  assert.deepEqual(empty.habits, []); assert.equal(empty.inventory.daisy_seeds, 0); assert.equal(empty.version, 0);
});

test('authorization precedes receipt replay and neither an admin nor a rebound account can inherit another person’s farm', async t => {
  const {api, actor:admin, household} = await setup(t);
  const owner = randomUUID(); await api.addMember(owner, household);
  const id = randomUUID(), request = randomUUID();
  const payload = {type:'create',id,name:'私密阅读',habit_day:'2026-10-21'};
  const saved = await action(api, owner, household, payload, request);
  assert.deepEqual((await api.read(admin, household)).habits, []);
  for (const mutation of [{type:'record',habit_id:id,habit_day:'2026-10-21'}, {type:'collect',habit_id:id}]) {
    await assert.rejects(action(api, admin, household, mutation), /HABIT_NOT_FOUND/);
  }
  await api.db.query('update public.household_members set user_id=null where id=$1', [saved.member_id]);
  await assert.rejects(action(api, owner, household, payload, request), /HABIT_ACCESS_DENIED/);
  await assert.rejects(api.read(owner, household), /HABIT_ACCESS_DENIED/);
  const replacement = randomUUID();
  await api.db.query('insert into auth.users(id) values ($1)', [replacement]);
  await api.db.query('update public.household_members set user_id=$1 where id=$2', [replacement,saved.member_id]);
  await assert.rejects(api.read(replacement, household), /HABIT_ACCESS_DENIED/);
  await assert.rejects(action(api, replacement, household, payload, request), /HABIT_ACCESS_DENIED/);
});

test('never-executed old-day actions expire while successful seed receipts replay exactly across midnight', async t => {
  const {api, actor, household} = await setup(t, '2026-10-31T19:59:50Z');
  const id = randomUUID(); await create(api, actor, household, '阅读', id, '2026-10-31');
  const request = randomUUID(), claim = {type:'claim_seeds',quantity:1,habit_day:'2026-10-31'};
  const original = await action(api, actor, household, claim, request);
  await api.setNow('2026-10-31T20:00:00Z');
  assert.equal((await api.read(actor, household)).habit_day, '2026-11-01');
  assert.deepEqual(await action(api, actor, household, claim, request), original);
  for (const payload of [claim, {type:'create',id:randomUUID(),name:'旧日',habit_day:'2026-10-31'},
    {type:'plant',habit_id:id,habit_day:'2026-10-31'}, {type:'record',habit_id:id,habit_day:'2026-10-31'},
    {type:'record',habit_id:id,habit_day:'2026-11-02'}]) {
    await assert.rejects(action(api, actor, household, payload), /HABIT_REQUEST_EXPIRED/);
  }
  await assert.rejects(action(api, actor, household, {...claim,quantity:2}, request), /HABIT_REQUEST_MISMATCH/);
  const farm = await api.read(actor, household);
  assert.equal(farm.inventory.daisy_seeds, 1); assert.equal(farm.habits.length, 1);
  assert.deepEqual(farm.habits[0].entries, []);
});

test('competing public requests cannot duplicate seeds, consume one seed twice, double-record a day or collect a bouquet twice', async t => {
  const {api, actor, household} = await setup(t);
  const a = randomUUID(), b = randomUUID();
  await create(api, actor, household, 'A', a); await create(api, actor, household, 'B', b);
  const request = randomUUID(), claim = {type:'claim_seeds',quantity:1,habit_day:'2026-10-21'};
  const claims = await Promise.all([action(api, actor, household, claim, request), action(api, actor, household, claim, request)]);
  assert.deepEqual(claims[0], claims[1]);
  const plants = await Promise.allSettled([a,b].map(id => action(api, actor, household, {type:'plant',habit_id:id,habit_day:'2026-10-21'})));
  assert.equal(plants.filter(p => p.status==='fulfilled').length, 1);
  assert.match(plants.find(p => p.status==='rejected').reason.message, /HABIT_SEEDS_REQUIRED/);
  const id = plants[0].status==='fulfilled' ? a : b;
  const payload = {type:'record',habit_id:id,habit_day:'2026-10-21'};
  const records = await Promise.allSettled([action(api, actor, household, payload), action(api, actor, household, payload)]);
  assert.equal(records.filter(p => p.status==='fulfilled').length, 1);
  assert.match(records.find(p => p.status==='rejected').reason.message, /HABIT_ALREADY_RECORDED/);
  const saved = records.find(p => p.status==='fulfilled').value;
  const undo = {type:'undo',entry_id:saved.receipt.result.entry_id};
  await Promise.all([action(api, actor, household, undo), action(api, actor, household, undo)]);
  await action(api, actor, household, payload);
  for (const day of ['2026-10-22','2026-10-23']) await recordAt(api, actor, household, id, day);
  await api.setNow('2026-10-23T04:00:30Z');
  const collections = await Promise.all([action(api, actor, household, {type:'collect',habit_id:id}), action(api, actor, household, {type:'collect',habit_id:id})]);
  assert.deepEqual(collections.map(c => c.receipt.result.quantity).sort(), [0,1]);
  const farm = await api.read(actor, household);
  assert.deepEqual(farm.inventory, {daisy_seeds:0,daisy_bouquets:1});
  const grown = farm.habits.find(h => h.id===id);
  assert.equal(grown.entries.filter(e => e.growth_granted).length, 3);
  assert.equal(grown.plot.unallocated_growth, 0); assert.equal(grown.plot.ready, 0);
});
