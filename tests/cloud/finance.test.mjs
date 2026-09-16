import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

// This suite deliberately refuses to pass or skip without real hosted resources.
const required = name => {
  assert.ok(process.env[name], `Missing ${name}; configure an isolated cloud test household.`);
  return process.env[name];
};
const url = required('SUPABASE_URL');
const key = required('SUPABASE_PUBLISHABLE_KEY');
const household = required('TEST_HOUSEHOLD_ID');
assert.equal(required('TEST_ALLOW_WRITES'), 'true', 'Run only against the explicitly designated test household.');
const makeClient = () => createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
const result = async promise => {const response = await promise; assert.equal(response.error, null); return response.data;};
const denied = async promise => {const response = await promise; assert.ok(response.error); assert.ok(['42501','PGRST301','PGRST303'].includes(response.error.code));};
async function signIn(prefix) {
  const client = makeClient();
  await result(client.auth.signInWithPassword({email: required(`${prefix}_EMAIL`), password: required(`${prefix}_PASSWORD`)}));
  return client;
}

test('hosted finance: login, exact save, retry, isolated read, conflict, authorization and logout', async t => {
  const owner = await signIn('TEST_ADMIN');
  const otherSession = await signIn('TEST_ADMIN');
  const outsider = await signIn('TEST_OUTSIDER');
  t.after(async () => {await Promise.all([owner, otherSession, outsider].map(client => client.auth.signOut({scope:'local'})));});
  const before = await result(owner.rpc('get_finances'));
  assert.equal(before.household_id, household);
  assert.notEqual((await result(outsider.rpc('get_finances'))).household_id, household);
  const settings = await fetch(`${url}/auth/v1/settings`, {headers:{apikey:key}});
  assert.equal((await settings.json()).disable_signup, true);
  const entry = before.entries.find(item => item.kind === 'balance');
  const request = {p_household_id: household, p_entry_id: entry?.id ?? randomUUID(),
    p_expected_version: entry?.version ?? '0', p_name: 'T01 云端验收余额',
    p_amount_minor: '123456', p_request_id: randomUUID()};
  const historyBefore = await result(owner.rpc('get_finance_history', {p_household_id:household}));
  const saved = await result(owner.rpc('save_balance', request));
  assert.equal(saved.entries.find(item => item.id === request.p_entry_id).amount_minor, '123456');
  assert.deepEqual(await result(owner.rpc('save_balance', request)), saved);
  assert.deepEqual(await result(otherSession.rpc('get_finances')), saved);
  const history = await result(owner.rpc('get_finance_history', {p_household_id:household}));
  assert.equal(history.length, historyBefore.length + 1);
  assert.deepEqual(history.at(-1).snapshot, saved);
  const anonymous = makeClient();
  for (const client of [anonymous, outsider]) {
    await denied(client.rpc('get_finances', {p_household_id:household}));
    await denied(client.rpc('get_finance_history', {p_household_id:household}));
    await denied(client.rpc('save_balance', request));
  }
  const directRead = await outsider.from('finance_entries').select('*').eq('household_id',household);
  assert.equal(directRead.error, null); assert.deepEqual(directRead.data, []);
  await denied(owner.from('finance_entries').update({amount_minor:1}).eq('id',request.p_entry_id));
  const currentEntry = saved.entries.find(item => item.id === request.p_entry_id);
  const edits = await Promise.all([owner, otherSession].map(client => client.rpc('save_balance', {
    ...request, p_expected_version:currentEntry.version, p_request_id:randomUUID(), p_amount_minor:'234567',
  })));
  assert.equal(edits.filter(item => !item.error).length, 1);
  assert.equal(edits.find(item => item.error).error.code, 'PT409');
  await owner.auth.signOut({scope:'local'});
  await denied(owner.rpc('get_finances', {p_household_id:household}));
  await result(owner.auth.signInWithPassword({email:required('TEST_ADMIN_EMAIL'),password:required('TEST_ADMIN_PASSWORD')}));
  assert.deepEqual(await result(owner.rpc('get_finances')), await result(otherSession.rpc('get_finances')));
});
