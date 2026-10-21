import {financeDatabase} from './finance-database.mjs';

// Isolated PGlite only. Production has no clock argument or executable clock setter.
export async function habitsDatabase(now = '2026-10-21T04:00:00.000Z') {
  const api = await financeDatabase();
  async function setNow(instant) {
    const iso = new Date(instant).toISOString();
    await api.db.exec(`create or replace function private.habit_now() returns timestamptz
      language sql volatile set search_path = '' as $$ select '${iso}'::timestamptz $$;`);
  }
  await setNow(now);
  return {...api, setNow,
    read: (actor, household) => api.rpc(actor, 'get_personal_farm', [household]),
    act: (actor, household, request, action) => api.rpc(actor, 'apply_habit_action', [household, request, JSON.stringify(action)]),
    async addMember(actor, household, name = '成员') {
      await api.db.query('insert into auth.users(id) values ($1)', [actor]);
      await api.db.query('insert into public.household_members(household_id,user_id,display_name) values ($1,$2,$3)', [household, actor, name]);
    },
  };
}
