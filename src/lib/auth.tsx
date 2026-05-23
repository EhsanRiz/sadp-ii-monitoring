import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppRole =
  | 'super_admin'
  | 'team_leader'
  | 'me_officer'
  | 'field_supervisor';

interface JwtClaims {
  user_role?: AppRole;
  organization_id?: string | null;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  organizationId: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Decode the JWT payload (no signature check — Supabase does that server-side).
 * We use this to read the `user_role` and `organization_id` claims injected by
 * the `custom_access_token_hook` PG function.
 */
function decodeJwtPayload(token: string | undefined | null): JwtClaims {
  if (!token) return {};
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    return JSON.parse(json) as JwtClaims;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    unsub = () => data.subscription.unsubscribe();

    return () => unsub?.();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { error: error.message } : {};
  }, []);

  const claims = useMemo<JwtClaims>(
    () => decodeJwtPayload(session?.access_token),
    [session?.access_token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role: claims.user_role ?? null,
      organizationId: claims.organization_id ?? null,
      isSuperAdmin: claims.user_role === 'super_admin',
      loading,
      signIn,
      signOut,
      sendPasswordReset,
    }),
    [session, claims, loading, signIn, signOut, sendPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
