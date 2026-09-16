import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

// Read-only hosted verification with a real member who has no finance grant.
const required = name => {assert.ok(process.env[name], `Missing ${name}`); return process.env[name];};
const url = required('VITE_SUPABASE_URL'), key = required('VITE_SUPABASE_PUBLISHABLE_KEY');
const makeClient = () => createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
test('hosted module gate allows household demos but denies finance without returning money', async t => {
  const member = makeClient(), anonymous = makeClient();
  t.after(() => member.auth.signOut({scope:'local'}));
  assert.equal((await member.auth.signInWithPassword({email:required('TEST_EMAIL'),password:required('TEST_PASSWORD')})).error, null);
  const {data:access,error} = await member.rpc('get_access_context');
  assert.equal(error,null); assert.equal(access.user_id,required('TEST_USER_ID'));
  assert.equal(access.household_id,required('TEST_HOUSEHOLD_ID'));
  assert.equal(access.is_admin,false);
  assert.deepEqual(access.modules,['habits','home','health','learning','cars','chores','airport','rail','today']);
  assert.deepEqual(Object.keys(access).sort(),['display_name','household_id','household_name','is_admin','modules','user_id']);
  assert.equal((await member.rpc('get_finances')).error.code,'42501');
  assert.equal((await member.rpc('get_finance_history',{p_household_id:access.household_id})).error.code,'42501');
  assert.ok((await anonymous.rpc('get_access_context')).error);
});
