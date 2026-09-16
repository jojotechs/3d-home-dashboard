import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {appClient, getAuth, subscribeAuth, signOut, cancelSignIn, isAccessError} from './client';

export interface AccessContext {
  user_id: string;
  household_id: string | null;
  household_name: string | null;
  display_name: string | null;
  is_admin: boolean;
  modules: string[];
}
type Intent = {module: string; title: string; open: () => void};
type Dialog = 'login' | 'checking' | 'denied' | 'error' | null;

// A single gate owns navigation intent and authentication UI. Feature modules do
// not open login forms or assume that a hidden button is a permission boundary.
export function useAccessGate() {
  const auth = useSyncExternalStore(subscribeAuth, getAuth);
  const [profile, setProfile] = useState<AccessContext | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [destination, setDestination] = useState('');
  const pending = useRef<Intent | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; generation.current++;};
  }, []);

  async function authorize(intent: Intent | null) {
    const version = ++generation.current;
    const current = getAuth();
    if (!appClient) {setDialog('error'); return;}
    if (current.status === 'checking' || current.status === 'signingOut' || current.status === 'signingIn') {
      if (intent) setDialog('checking');
      return;
    }
    if (!current.session) {setDialog('login'); return;}
    const userId = current.session.user.id;
    if (intent) setDialog('checking');
    else setDialog(previous => previous === 'login' ? 'checking' : previous);
    try {
      const {data, error} = await appClient.rpc('get_access_context');
      if (!mounted.current || version !== generation.current || getAuth().session?.user.id !== userId) return;
      if (error) throw error;
      const context = data as AccessContext;
      if (context.user_id !== userId || !Array.isArray(context.modules)) throw new Error('Invalid access context');
      setProfile(context);
      pending.current = null;
      if (intent && !context.modules.includes(intent.module)) {setDialog('denied'); return;}
      setDialog(null);
      intent?.open();
    } catch (failure) {
      if (!mounted.current || version !== generation.current || getAuth().session?.user.id !== userId) return;
      setProfile(null);
      if (isAccessError(failure)) {
        // Preserve the requested destination while expired credentials are cleared.
        await signOut().catch(() => {});
        if (mounted.current && version === generation.current) setDialog('login');
      } else setDialog(previous => intent || previous === 'login' || previous === 'checking' ? 'error' : previous);
    }
  }

  useEffect(() => {
    generation.current++;
    if (auth.status === 'signedIn') void authorize(pending.current);
    else {
      setProfile(null);
      if (pending.current && auth.status !== 'signingIn') setDialog(auth.status === 'signedOut' ? 'login' : 'checking');
    }
  }, [auth.status, auth.session?.user.id]);

  function request(module: string, title: string, open: () => void) {
    const intent = {module, title, open};
    pending.current = intent;
    setDestination(title);
    void authorize(intent);
  }
  function dismiss() {
    cancelSignIn();
    generation.current++;
    pending.current = null;
    setDialog(null);
    // Closing navigation UI must not leave a successfully signed-in account
    // without its household identity if its first context read was cancelled.
    if (getAuth().status === 'signedIn' && !profile) void authorize(null);
  }
  function login() {
    dismiss(); setDestination('');
    setDialog(appClient ? 'login' : 'error');
  }
  function logout() {
    dismiss(); setProfile(null);
    void signOut().catch(() => {});
  }
  const currentProfile = auth.session?.user.id === profile?.user_id ? profile : null;
  return {auth, profile: currentProfile, dialog, destination, request, dismiss, login, logout,
    retry: () => {void authorize(pending.current);},
    canOpen: (module: string) => auth.status === 'signedIn' && !!currentProfile?.modules.includes(module)};
}
export type AccessGate = ReturnType<typeof useAccessGate>;
