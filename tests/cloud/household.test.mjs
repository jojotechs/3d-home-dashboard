import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const required=name=>{assert.ok(process.env[name],`Missing ${name}`);return process.env[name];};
assert.equal(required('TEST_ALLOW_WRITES'),'true');
const make=()=>createClient(required('SUPABASE_URL'),required('SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const result=async p=>{const {data,error}=await p;assert.equal(error,null);return data;};
const denied=async p=>{const {error}=await p;assert.equal(error?.code,'42501');};
async function login(prefix){const c=make();await result(c.auth.signInWithPassword({email:required(prefix+'_EMAIL'),password:required(prefix+'_PASSWORD')}));return c;}
test('hosted household boundary: independent member binding, administrator-only grants, revoked RLS and immutable attribution',async t=>{
 const owner=await login('TEST_ADMIN'),member=await login('TEST_MEMBER'),outsider=await login('TEST_OUTSIDER'),anonymous=make();
 t.after(async()=>{await Promise.all([owner,member,outsider].map(c=>c.auth.signOut({scope:'local'})));});
 const household=required('TEST_HOUSEHOLD_ID');
 let roster=await result(owner.rpc('get_household_members'));
 assert.equal(roster.household_id,household);
 let id=roster.members.find(m=>m.user_id===required('TEST_MEMBER_USER_ID'))?.id;
 if(!id){
   id=randomUUID();await result(owner.rpc('add_household_member',{p_household:household,p_member:id,p_name:'接口权限验收成员'}));
   const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
   await result(owner.rpc('issue_household_invite',{p_member:id,p_email:required('TEST_MEMBER_EMAIL'),p_hash:hash,p_request:randomUUID()}));
   await denied(outsider.rpc('accept_household_invite',{p_hash:hash}));
   assert.equal(await result(member.rpc('accept_household_invite',{p_hash:hash})),household);
 }
 await result(owner.rpc('set_finance_access',{p_member:id,p_allowed:false}));
 for(const client of [member,outsider,anonymous]){
   if(client===outsider)assert.notEqual((await result(client.rpc('get_household_members'))).household_id,household);
   else await denied(client.rpc('get_household_members'));
   await denied(client.rpc('set_finance_access',{p_member:id,p_allowed:true}));
   await denied(client.rpc('get_finances',{p_household_id:household}));
   await denied(client.rpc('get_finance_history',{p_household_id:household}));
   const issued=await client.functions.invoke('invite-household',{body:{memberId:id,email:required('TEST_MEMBER_EMAIL'),requestId:randomUUID()}});
   assert.ok(issued.error,'Invitation edge rejects unprivileged callers');
 }
 await result(owner.rpc('set_finance_access',{p_member:id,p_allowed:true}));
 const entry=randomUUID(),request={p_household_id:household,p_changes:[{id:entry,operation:'upsert',kind:'balance',name:'权限验收余额',amount_minor:'12345',expected_version:'0'}],p_request_id:randomUUID()};
 const saved=await result(member.rpc('save_finances',request));
 assert.equal(saved.entries.find(e=>e.id===entry).created_by,required('TEST_MEMBER_USER_ID'));
 await result(owner.rpc('set_finance_access',{p_member:id,p_allowed:false}));
 await denied(member.rpc('get_finances'));await denied(member.rpc('get_finance_history',{p_household_id:household}));
 await denied(member.rpc('save_finances',request)); // Receipt must not bypass revocation.
 for(const table of ['finance_entries','finance_updates','households']){
   const rows=await result(member.from(table).select('*'));assert.deepEqual(rows,[]);
 }
 const context=await result(member.rpc('get_access_context'));assert.ok(!context.modules.includes('finance'));
 assert.ok(!JSON.stringify(context).includes('12345'));
 const history=await result(owner.rpc('get_finance_history',{p_household_id:household}));
 assert.equal(history.at(-1).actor_id,required('TEST_MEMBER_USER_ID'));
 await result(owner.rpc('save_finances',{p_household_id:household,p_changes:[{id:entry,operation:'remove',expected_version:'1'}],p_request_id:randomUUID()}));
 t.diagnostic(`Verified isolated household ${household}; retained provenance after revocation, financial fixture retired.`);
});
