import {createClient} from '@supabase/supabase-js';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; keep privileged configuration in ignored .env.bootstrap.`);
  return value;
}

async function main() {
  const url = required('SUPABASE_URL');
  const key = required('SUPABASE_SECRET_KEY');
  const publicKey = required('SUPABASE_PUBLISHABLE_KEY');
  const email = required('ADMIN_EMAIL');
  const household = required('HOUSEHOLD_ID');
  const name = required('HOUSEHOLD_NAME');
  const adminName = required('ADMIN_NAME');
  const settings = await fetch(`${url}/auth/v1/settings`, {headers: {apikey: publicKey}, signal: AbortSignal.timeout(15000)});
  const authSettings = settings.ok ? await settings.json() : null;
  if (authSettings?.disable_signup !== true || authSettings?.external?.email !== true) {
    throw new Error('Disable public signup and enable the email provider in Supabase Auth before initializing a household.');
  }
  const client = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
  let userId = process.env.ADMIN_USER_ID;
  if (userId) {
    const {data, error} = await client.auth.admin.getUserById(userId);
    if (error || data.user.email?.toLowerCase() !== email.toLowerCase() || !data.user.email_confirmed_at) {
      throw new Error('ADMIN_USER_ID must identify the intended confirmed email account.');
    }
  } else {
    const password = required('ADMIN_PASSWORD');
    if (password.length < 16) throw new Error('Use an initial password with at least 16 characters.');
    const {data, error} = await client.auth.admin.createUser({email, password, email_confirm: true});
    if (error) throw new Error('Admin creation failed. For an existing account supply its ADMIN_USER_ID; this script never resets passwords.');
    userId = data.user.id;
    console.log(`Created admin identity ${userId}. Preserve ADMIN_USER_ID for a safe rerun.`);
  }
  const {error} = await client.rpc('bootstrap_household', {
    p_user_id: userId, p_household_id: household, p_household_name: name, p_admin_name: adminName,
  });
  if (error) throw new Error(`Household initialization failed (${error.code}). No finance values have been seeded. Reuse the same IDs when retrying.`);
  console.log(`Initialized household ${household}. Financial records and history remain empty.`);
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
