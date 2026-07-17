import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthProfile {
  id: string;
  is_admin: boolean;
  blocked: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const ensureProfile = async (user: User) => {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (selectError) {
    console.error("ensureProfile: failed to check existing profile:", selectError.message);
    return;
  }
  if (!existing) {
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      pseudo: user.email?.split("@")[0] || user.id.slice(0, 8),
    });
    if (upsertError) {
      console.error("ensureProfile: failed to create profile:", upsertError.message);
    }
  }
};

const fetchAuthProfile = async (userId: string): Promise<AuthProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, is_admin, blocked")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchAuthProfile: failed to load profile:", error.message);
    return null;
  }
  return data as AuthProfile | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureProfile(session.user);
          if (mounted) setAuthProfile(await fetchAuthProfile(session.user.id));
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureProfile(session.user);
        if (mounted) setAuthProfile(await fetchAuthProfile(session.user.id));
      } else {
        setAuthProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isAdmin: authProfile?.is_admin ?? false,
    isBlocked: authProfile?.blocked ?? false,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, authProfile, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
