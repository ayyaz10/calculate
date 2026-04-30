import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabaseClient';
import { getCurrentProfile, normalizeUsername, resolveLoginEmail } from '../services/profileService';

const AuthContext = createContext(null);
const AUTH_BOOT_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 5000;

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  function applySession(nextSession) {
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      return;
    }

    const fallbackProfile = {
      username: nextUser.user_metadata?.username ?? nextUser.email,
    };

    setProfile(fallbackProfile);

    withTimeout(
      getCurrentProfile(),
      PROFILE_TIMEOUT_MS,
      'Profile lookup timed out.',
    )
      .then((nextProfile) => {
        setProfile(nextProfile ?? fallbackProfile);
      })
      .catch(() => {
        setProfile(fallbackProfile);
      });
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setAuthError('App configuration is missing.');
      return undefined;
    }

    let isMounted = true;

    withTimeout(
      supabase.auth.getSession(),
      AUTH_BOOT_TIMEOUT_MS,
      'Saved session expired. Please log in again.',
    )
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setAuthError(error.message);
        }

        applySession(data.session);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthError(error.message);
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
        setIsLoading(false);
        setAuthError('');
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      displayName: profile?.username ?? user?.user_metadata?.username ?? user?.email ?? '',
      isAuthenticated: Boolean(user),
      isLoading,
      authError,
      isConfigured: isSupabaseConfigured,
      async signIn(identifier, password) {
        setAuthError('');
        const client = requireSupabase();
        const email = await resolveLoginEmail(identifier);
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      async signUp(email, password, username) {
        setAuthError('');
        const client = requireSupabase();
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: normalizeUsername(username),
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          throw error;
        }

        return {
          session: data.session,
          user: data.user,
          needsEmailConfirmation: Boolean(data.user && !data.session),
        };
      },
      async signOut() {
        setAuthError('');
        const client = requireSupabase();
        const { error } = await client.auth.signOut();

        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
    }),
    [authError, isLoading, profile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
