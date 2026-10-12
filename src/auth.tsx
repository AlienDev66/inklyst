import {
  fetchProfile,
  signInWithPassword,
  signOut as signOutRemote,
  signUpWithPassword,
  updateOnboardingIntent,
  updatePreferredSpace,
  updateProfileName,
  type OnboardingIntent,
  type PreferredSpace,
  type Profile,
  type Session,
  type User,
} from "@pagina/supabase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type AuthState = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<string | null>;
  saveOnboardingIntent: (intent: OnboardingIntent) => Promise<string | null>;
  savePreferredSpace: (space: PreferredSpace) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(supabase, userId));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void loadProfile(data.session?.user.id).finally(() => {
        if (mounted) setReady(true);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return "Supabase não está configurado.";
    const { error } = await signInWithPassword(supabase, email, password);
    return error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (!isSupabaseConfigured) return "Supabase não está configurado.";
    const { error } = await signUpWithPassword(supabase, email, password, displayName);
    return error;
  }, []);

  const signOut = useCallback(async () => {
    await signOutRemote(supabase);
    setProfile(null);
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!isSupabaseConfigured) {
        localStorage.setItem("inklyst-display-name", name.trim());
        return null;
      }
      const userId = session?.user?.id;
      if (!userId) return "Sem sessão.";
      const { profile: next, error } = await updateProfileName(supabase, userId, name);
      if (error) return error;
      setProfile(next);
      return null;
    },
    [session?.user?.id],
  );

  const saveOnboardingIntent = useCallback(
    async (intent: OnboardingIntent) => {
      if (!isSupabaseConfigured) {
        localStorage.setItem("inklyst.onboarding_intent", intent);
        return null;
      }
      const userId = session?.user?.id;
      if (!userId) return "Sem sessão.";
      const { profile: next, error } = await updateOnboardingIntent(supabase, userId, intent);
      if (error) return error;
      setProfile(next);
      return null;
    },
    [session?.user?.id],
  );

  const savePreferredSpace = useCallback(
    async (space: PreferredSpace) => {
      if (!isSupabaseConfigured) {
        localStorage.setItem("inklyst.preferred_space", space);
        return null;
      }
      const userId = session?.user?.id;
      if (!userId) return "Sem sessão.";
      const { profile: next, error } = await updatePreferredSpace(supabase, userId, space);
      if (error) return error;
      setProfile(next);
      return null;
    },
    [session?.user?.id],
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user?.id);
  }, [loadProfile, session?.user?.id]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      signOut,
      updateDisplayName,
      saveOnboardingIntent,
      savePreferredSpace,
      refreshProfile,
    }),
    [
      ready,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      updateDisplayName,
      saveOnboardingIntent,
      savePreferredSpace,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
