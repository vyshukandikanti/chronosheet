// app/lib/AuthProvider.tsx
// =========================
// The "global memory" for which user is signed in.
//
// Wraps the whole app and exposes:
//   - user:    The currently signed-in user (or null)
//   - loading: True while we're checking the session on first load
//   - signOut: Function to log the user out
//
// Any component can read this via the useAuth() hook.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "./supabase";

// The shape of what useAuth() returns
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

// Default value (used before the provider mounts)
const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

// The provider component — wrap your app in this
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase isn't configured, skip auth entirely
    if (!isSupabaseReady) {
      setLoading(false);
      return;
    }

    // Step 1: Check if user is already signed in (on page load)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Step 2: Listen for auth changes (sign in, sign out, token refresh)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      },
    );

    // Cleanup: stop listening when component unmounts
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    if (!isSupabaseReady) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // Memoize so consumers don't re-render unnecessarily
  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, signOut }),
    [user, session, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for any component to read auth state
export function useAuth() {
  return useContext(AuthContext);
}
