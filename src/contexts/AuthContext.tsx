// src/contexts/AuthContext.tsx
//
// Session management plus the signed-in user's profile row.
//
// The profile row is created by the `on_auth_user_created` trigger in
// `supabase/migrations` (see `handle_new_user`). Sign-up still writes the row
// explicitly as a fallback for projects created before that trigger existed.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  fetchProfile,
  supabase,
  updateProfile as updateProfileRow,
  type Profile,
  type SkinType,
} from '../lib/supabase';

export type { SkinType };

/** Result of a sign-up attempt. */
export type SignUpResult = {
  /** True when Supabase requires the user to confirm their email first. */
  needsEmailConfirmation: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  /** True while the initial session lookup is in flight. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, skinType?: SkinType) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateProfile: (patch: { full_name?: string; skin_type?: string | null; phone?: string | null }) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

/** Optional — only surfaced in the UI when the provider is configured in Supabase. */
export const googleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === 'true';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Map a raw Supabase Auth error onto something worth showing a shopper. */
function humanizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'That email and password combination does not match our records.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email address before signing in.';
  if (lower.includes('already registered') || lower.includes('already been registered'))
    return 'An account with that email already exists. Try signing in instead.';
  if (lower.includes('password should be at least')) return 'Please choose a password with at least 6 characters.';
  if (lower.includes('rate limit') || lower.includes('too many requests'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (lower.includes('failed to fetch') || lower.includes('fetch'))
    return 'We could not reach the server. Check your connection and try again.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await fetchProfile(userId));
    } catch {
      // A missing/unreadable profile row should not lock the user out.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setUser(session?.user ?? null);
        return loadProfile(session?.user?.id ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(humanizeAuthError(error.message));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, skinType?: SkinType): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        // Populates `raw_user_meta_data` so the `handle_new_user` trigger can
        // create the profile row even when email confirmation is required.
        options: { data: { full_name: fullName, skin_type: skinType ?? null } },
      });
      if (error) throw new Error(humanizeAuthError(error.message));

      const created = data.user;
      // Email confirmation required: no session yet, so nothing more to do.
      if (!created || !data.session) {
        return { needsEmailConfirmation: true };
      }

      // Fallback for projects without the trigger. Idempotent thanks to the
      // `on conflict do nothing` in the migration's trigger function.
      try {
        await supabase.from('profiles').insert([
          { id: created.id, full_name: fullName, skin_type: skinType ?? null },
        ]);
      } catch {
        // The trigger most likely already created the row.
      }

      await loadProfile(created.id);
      return { needsEmailConfirmation: false };
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    if (error) throw new Error(humanizeAuthError(error.message));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const redirectTo =
      typeof window === 'undefined' ? undefined : `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw new Error(humanizeAuthError(error.message));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = typeof window === 'undefined' ? undefined : window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: false },
    });
    if (error) throw new Error(humanizeAuthError(error.message));
  }, []);

  const updateProfile = useCallback(
    async (patch: { full_name?: string; skin_type?: string | null; phone?: string | null }) => {
      if (!user) throw new Error('You need to be signed in to update your profile.');
      const saved = await updateProfileRow(user.id, patch);
      setProfile(saved);
    },
    [user]
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(user?.id ?? null);
  }, [loadProfile, user?.id]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      signInWithGoogle,
      updateProfile,
      refreshProfile,
    }),
    [
      loading,
      profile,
      refreshProfile,
      sendPasswordReset,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      updateProfile,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
