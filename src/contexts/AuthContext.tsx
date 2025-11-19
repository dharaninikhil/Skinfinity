// src/context/AuthContext.tsx (or wherever your file lives)
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define allowed skin types (adjust values to match your UI)
export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'other';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // add skinType here
  signUp: (email: string, password: string, fullName: string, skinType?: SkinType) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // updated signUp to accept skinType and return errors if insert fails
  const signUp = async (email: string, password: string, fullName: string, skinType?: SkinType) => {
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;

    // If the auth signup returned a user, create the profile row
    if (data?.user) {
      const profile = {
        id: data.user.id,
        full_name: fullName,
        // use snake_case to match typical Supabase/Postgres column naming
        skin_type: skinType ?? null,
        // add any other profile fields here
      };

      const { error: insertError } = await supabase.from('profiles').insert([profile]);
      if (insertError) {
        // Optionally you may want to rollback the created auth user if profile insert fails
        // await supabase.auth.admin.deleteUser(data.user.id) // requires admin privileges
        throw insertError;
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
