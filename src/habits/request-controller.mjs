import {createServerClock} from './server-clock.mjs';

/** Public browser-to-cloud request session. Only transport and browser storage are injected. */
export function createFarmController({owner, householdId, transport, storage, uuid = () => crypto.randomUUID(), monotonicNow = () => performance.now()}) {
  const key = `family-city-habit-request-v1:${owner}:${householdId}`;
  let stored = null;
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (value?.owner === owner && value?.householdId === householdId && value.request?.p_request_id) stored = value;
  } catch { /* No business data is restored from browser storage. */ }
  let state = {
    farm: null,
    clock: null,
    status: stored?.receipt ? 'confirmed' : ['failed', 'expired'].includes(stored?.status) ? stored.status : stored ? 'unknown' : 'loading',
    request: stored?.request ?? null,
    lastReceipt: stored?.receipt ?? null,
    error: stored?.error ?? null,
    refreshing: false,
  };
  let alive = true;
  let working = false;
  const listeners = new Set();
  const publish = patch => {
    if (!alive) return;
    state = {...state, ...patch};
    listeners.forEach(listener => listener());
  };
  const accessDenied = error => ['42501', 'PGRST301', 'PGRST303'].includes(error?.code) ||
    ['HABIT_AUTH_REQUIRED', 'HABIT_ACCESS_DENIED'].includes(error?.message);
  const clearStored = () => {try {storage.removeItem(key);} catch { /* An old exact request remains safe to replay. */ }};
  const rejectAccess = error => {
    clearStored();
    publish({farm: null, clock: null, request: null, lastReceipt: null, error, status: 'denied'});
  };
  const persist = receipt => storage.setItem(key, JSON.stringify({owner, householdId, request: state.request,
    receipt, status: state.status, error: state.error ? {code: state.error.code, message: state.error.message} : null}));

  async function refresh() {
    if (!alive || working) return;
    working = true;
    publish({refreshing: true});
    try {
      const farm = await transport.read(householdId);
      if (!alive) return;
      const clock = createServerClock(farm.server_now, monotonicNow());
      if (state.lastReceipt && state.request) {
        clearStored();
        publish({farm, clock, status: 'ready', request: null, error: null});
      } else {
        const unresolved = ['expired', 'failed'].includes(state.status) ? state.status : 'unknown';
        publish({farm, clock, status: state.request ? unresolved : 'ready', error: state.request ? state.error : null});
      }
    } catch (error) {
      if (!alive) return;
      if (accessDenied(error)) rejectAccess(error);
      else {
        const unresolved = state.lastReceipt ? 'confirmed' : ['failed', 'expired'].includes(state.status) ? state.status : 'unknown';
        publish({error, status: state.request ? unresolved : 'error'});
      }
    } finally {
      working = false;
      publish({refreshing: false});
    }
  }

  async function retry() {
    if (!alive || working || !state.request) return;
    // Once confirmed, only the current read may unlock another action.
    if (state.lastReceipt) {await refresh(); return;}
    working = true;
    publish({status: 'saving', error: null});
    try {
      const result = await transport.apply(structuredClone(state.request));
      if (!alive) return;
      if (result?.receipt?.request_id !== state.request.p_request_id) throw new Error('Invalid receipt');
      publish({lastReceipt: result.receipt, status: 'confirmed'});
      // The original request was stored before sending. If updating its receipt
      // fails, a reload can still safely recover that same request from the cloud.
      try {persist(result.receipt);} catch {}
      working = false;
      await refresh();
    } catch (error) {
      if (!alive) return;
      if (accessDenied(error)) {rejectAccess(error); return;}
      const message = error?.message || '';
      const status = message === 'HABIT_REQUEST_EXPIRED' ? 'expired' : message.startsWith('HABIT_') ? 'failed' : 'unknown';
      publish({error, status});
      try {persist(state.lastReceipt);} catch {}
    } finally {working = false;}
  }

  async function submit(action) {
    if (!alive || working || state.request || !state.farm || state.status !== 'ready') return;
    const request = {p_household_id: householdId, p_request_id: uuid(), p_action: structuredClone(action)};
    publish({request, lastReceipt: null});
    try {persist(null);} catch {
      publish({status: 'failed', error: {message: 'HABIT_LOCAL_STORAGE_UNAVAILABLE'}});
      return;
    }
    await retry();
  }

  return {
    getSnapshot: () => state,
    subscribe: listener => {listeners.add(listener); return () => listeners.delete(listener);},
    start: refresh, refresh, submit, retry,
    acknowledgeFailure: () => {
      if (working || !['expired', 'failed'].includes(state.status)) return;
      clearStored();
      publish({request: null, lastReceipt: null, error: null, status: state.farm ? 'ready' : 'error'});
    },
    dispose: ({clearPending = false} = {}) => {
      alive = false;
      listeners.clear();
      state = {farm: null, clock: null, status: 'idle', request: null, lastReceipt: null, error: null, refreshing: false};
      if (clearPending) clearStored();
    },
  };
}
