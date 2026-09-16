import {createClient} from '@supabase/supabase-js';
import type {Session} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function isPublicKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true;
  try {
    const claims = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return claims.role === 'anon';
  } catch { return false; }
}

// The SDK channel is unique to this document, even when a duplicated tab copies
// sessionStorage. Map SDK storage to a stable tab-local key for refresh persistence.
export const AUTH_STORAGE_KEY = 'family-city-auth-v1';
const LOGOUT_PENDING_KEY = 'family-city-logout-pending';
function clearCredentials() {
  for (const suffix of ['', '-user', '-code-verifier']) window.sessionStorage.removeItem(AUTH_STORAGE_KEY + suffix);
}
// A refresh may destroy a pending logout's finally block. Never restore its session.
if (window.sessionStorage.getItem(LOGOUT_PENDING_KEY)) {
  clearCredentials();
  window.sessionStorage.removeItem(LOGOUT_PENDING_KEY);
}
const authChannel = `family-city-auth-${crypto.randomUUID()}`;
const storedKey = (key: string) => AUTH_STORAGE_KEY + key.slice(authChannel.length);
const authStorage = {
  getItem: (key: string) => window.sessionStorage.getItem(storedKey(key)),
  setItem: (key: string, value: string) => window.sessionStorage.setItem(storedKey(key), value),
  removeItem: (key: string) => window.sessionStorage.removeItem(storedKey(key)),
};

export const financeClient = url && /^https:\/\//.test(url) && key && isPublicKey(key)
  ? createClient(url, key, {global: {fetch: (input, init) => {
    const signals = [AbortSignal.timeout(15000)];
    if (init?.signal) signals.push(init.signal);
    return fetch(input, {...init, signal: AbortSignal.any(signals)});
  }}, auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: authChannel, storage: authStorage}})
  : null;

type AuthState = {status: 'checking' | 'signedIn' | 'signedOut' | 'signingOut'; session: Session | null};
let authState: AuthState = {status: financeClient ? 'checking' : 'signedOut', session: null};
const authListeners = new Set<() => void>();
function publishAuth(value: AuthState) {
  authState = value;
  authListeners.forEach(listener => listener());
}
financeClient?.auth.onAuthStateChange((_event, session) => {
  if (authState.status !== 'signingOut') publishAuth({status: session ? 'signedIn' : 'signedOut', session});
});
export const getFinanceAuth = () => authState;
export function subscribeFinanceAuth(listener: () => void) {
  authListeners.add(listener);
  return () => {authListeners.delete(listener);};
}
let signingOut: Promise<void> | null = null;
export function signOutFinance(): Promise<void> {
  if (signingOut) return signingOut;
  // This gate outlives panel unmounts: outgoing money disappears immediately and
  // no new login can race an unfinished SDK logout, including during a remount.
  window.sessionStorage.setItem(LOGOUT_PENDING_KEY, '1');
  publishAuth({status: 'signingOut', session: null});
  signingOut = (async () => {
    try { await financeClient?.auth.signOut({scope: 'local'}); }
    finally {
      clearCredentials();
      window.sessionStorage.removeItem(LOGOUT_PENDING_KEY);
      signingOut = null;
      publishAuth({status: 'signedOut', session: null});
    }
  })();
  return signingOut;
}

export interface FinanceEntry {
  id: string;
  kind: 'balance' | 'debt';
  name: string;
  amount_minor: string;
  version: string;
  created_by: string;
  updated_by: string;
  creator_name: string;
  editor_name: string;
  created_at: string;
  updated_at: string;
}
export interface FinanceSnapshot {
  household_id: string;
  household_name: string;
  version: string;
  net_savings_minor: string;
  saved_at: string | null;
  entries: FinanceEntry[];
}
export interface BalanceRequest {
  p_household_id: string;
  p_entry_id: string;
  p_expected_version: string;
  p_name: string;
  p_amount_minor: string;
  p_request_id: string;
}

export function financeError(error: unknown): string {
  const code = (error as {code?: string})?.code;
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return '登录已失效或没有财务访问权限，请重新登录或联系家庭管理员。';
  if (code === 'PT409') return '云端记录已变更。输入已保留，请先读取最新记录并核对，再保存。';
  if (code === '22023' || code === '22003') return '金额或名称格式不正确，请检查后重试。';
  return '未收到云端确认，输入已保留。请检查连接后重试。';
}
