import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyProfile } from '../data/api';
import { supabase } from '../data/supabase';
import type { Profile } from '../data/types';

export type AuthStatus = 'loading' | 'signed_out' | 'needs_join' | 'member';

interface AuthValue {
  status: AuthStatus;
  profile: Profile | null;
  email: string | null;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setProfile(null);
      setEmail(null);
      setStatus('signed_out');
      return;
    }
    setEmail(session.user.email ?? null);
    try {
      const p = await getMyProfile();
      setProfile(p);
      setStatus(p ? 'member' : 'needs_join');
    } catch {
      setStatus('needs_join');
    }
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await load();
  }, [load]);

  return (
    <AuthContext.Provider value={{ status, profile, email, refresh: load, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
