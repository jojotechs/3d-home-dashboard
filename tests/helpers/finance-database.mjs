import {PGlite} from '@electric-sql/pglite';
import {readFile, readdir} from 'node:fs/promises';

// Local PostgreSQL contract check only. Supabase Auth/HTTP and deployed E2E need cloud runs.
export async function financeDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  for (const name of (await readdir('supabase/migrations')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
  }
  return {
    db,
    async provision(user, household) {
      await db.query('insert into auth.users(id) values ($1)', [user]);
      await db.query('select public.bootstrap_household($1, $2, $3, $4)', [user, household, '测试家庭', '管理员']);
    },
    async rpc(user, name, args = []) {
      return db.transaction(async tx => {
        await tx.exec(`set local role ${user ? 'authenticated' : 'anon'}`);
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user || '']);
        const result = await tx.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as value`, args);
        return result.rows[0].value;
      });
    },
  };
}
