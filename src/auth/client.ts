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

let loginController: AbortController | null = null;
export const appClient = url && /^https:\/\//.test(url) && key && isPublicKey(key)
  ? createClient(url, key, {global: {fetch: (input, init) => {
    const signals = [AbortSignal.timeout(15000)];
    if (init?.signal) signals.push(init.signal);
    const requestUrl = new URL(input instanceof Request ? input.url : String(input));
    if (requestUrl.pathname.endsWith('/token') && requestUrl.searchParams.get('grant_type') === 'password' && loginController) signals.push(loginController.signal);
    return fetch(input, {...init, signal: AbortSignal.any(signals)});
  }}, auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: authChannel, storage: authStorage}})
  : null;

const incoming = new URLSearchParams(location.search);
const fragment = new URLSearchParams(location.hash.slice(1));
const incomingFlow = incoming.get('setup') === '1' || fragment.get('type') === 'invite' ? 'invite' : incoming.get('recovery') === '1' || fragment.get('type') === 'recovery' ? 'recovery' : null;

type AuthState = {status: 'checking' | 'signedIn' | 'signedOut' | 'signingOut' | 'signingIn'; session: Session | null; flow?: 'invite' | 'recovery' | null; linkError?: string | null};
let authState: AuthState = {status: appClient ? 'checking' : 'signedOut', session: null, flow: incomingFlow, linkError: fragment.get('error_description') || incoming.get('error_description')};
const authListeners = new Set<() => void>();
function publishAuth(value: AuthState) {
  authState = value;
  authListeners.forEach(listener => listener());
}
appClient?.auth.onAuthStateChange((event, session) => {
  if (authState.status !== 'signingOut' && authState.status !== 'signingIn') publishAuth({...authState, status: session ? 'signedIn' : 'signedOut', session, flow: event === 'PASSWORD_RECOVERY' ? 'recovery' : authState.flow, linkError: authState.linkError || (!session && authState.flow ? '邮件链接已失效' : null)});
});
export const getAuth = () => authState;
export function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => {authListeners.delete(listener);};
}
let signingOut: Promise<void> | null = null;
export function signOut(): Promise<void> {
  if (signingOut) return signingOut;
  // This gate outlives panel unmounts: outgoing money disappears immediately and
  // no new login can race an unfinished SDK logout, including during a remount.
  window.sessionStorage.setItem(LOGOUT_PENDING_KEY, '1');
  publishAuth({status: 'signingOut', session: null});
  signingOut = (async () => {
    try { await appClient?.auth.signOut({scope: 'local'}); }
    finally {
      clearCredentials();
      window.sessionStorage.removeItem(LOGOUT_PENDING_KEY);
      signingOut = null;
      publishAuth({status: 'signedOut', session: null});
    }
  })();
  return signingOut;
}


let loginAttempt: {cancelled: boolean} | null = null;
export function cancelSignIn() {
  if (!loginAttempt) return;
  loginAttempt.cancelled = true;
  // Also protects a refresh between SDK persistence and cancellation cleanup.
  window.sessionStorage.setItem(LOGOUT_PENDING_KEY, '1');
  loginController?.abort();
}
export async function signIn(email: string, password: string): Promise<{error: unknown; cancelled?: boolean}> {
  if (!appClient || loginAttempt || signingOut) return {error: new Error('Authentication is busy')};
  const attempt = {cancelled: false};
  loginAttempt = attempt;
  loginController = new AbortController();
  publishAuth({status: 'signingIn', session: null});
  try {
    const result = await appClient.auth.signInWithPassword({email, password});
    if (attempt.cancelled) return {error: null, cancelled: true};
    publishAuth({status: result.data.session ? 'signedIn' : 'signedOut', session: result.data.session});
    return {error: result.error};
  } catch (error) {
    return {error, cancelled: attempt.cancelled};
  } finally {
    if (attempt.cancelled) {
      // The SDK may already have persisted a response. Keep new login blocked
      // until its local session is cleared; no late A response can overwrite B.
      try {await appClient.auth.signOut({scope: 'local'});} catch { /* Local credentials are cleared below. */ } finally {
        clearCredentials();
        window.sessionStorage.removeItem(LOGOUT_PENDING_KEY);
      }
    }
    loginAttempt = null;
    loginController = null;
    if (authState.status === 'signingIn') publishAuth({status: 'signedOut', session: null});
  }
}

export function isAccessError(error: unknown): boolean {
  return ['42501', 'PGRST301', 'PGRST303'].includes((error as {code?: string})?.code ?? '');
}

export function finishPassword() {
  const url=new URL(location.href); url.searchParams.delete('setup'); url.searchParams.delete('recovery');
  url.searchParams.delete('error'); url.searchParams.delete('error_description');
  history.replaceState(null,'',url.pathname+url.search);
  publishAuth({...authState,flow:null,linkError:null});
}
