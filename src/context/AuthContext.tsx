import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

const fetchAuthProfile = async (userId: string): Promise<{ is_admin: boolean; blocked: boolean } | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin, blocked")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchAuthProfile: failed to load profile:", error.message);
    return null;
  }
  return data as { is_admin: boolean; blocked: boolean } | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const profileUserIdRef = useRef<string | null>(null);
  const lastAdminRef = useRef(false);
  const lastBlockedRef = useRef(false);

  const updateProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      profileUserIdRef.current = null;
      if (lastAdminRef.current !== false) { lastAdminRef.current = false; setIsAdmin(false); }
      if (lastBlockedRef.current !== false) { lastBlockedRef.current = false; setIsBlocked(false); }
      return;
    }
    const profile = await fetchAuthProfile(userId);
    if (!profile) return;
    if (profileUserIdRef.current !== userId) return;
    if (lastAdminRef.current !== profile.is_admin) { lastAdminRef.current = profile.is_admin; setIsAdmin(profile.is_admin); }
    if (lastBlockedRef.current !== profile.blocked) { lastBlockedRef.current = profile.blocked; setIsBlocked(profile.blocked); }
  }, []);

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setUser(prev => {
          const next = session?.user ?? null;
          if (prev?.id === next?.id) return prev;
          return next;
        });
        if (session?.user) {
          currentUserId = session.user.id;
          profileUserIdRef.current = session.user.id;
          await ensureProfile(session.user);
          if (mounted) await updateProfile(session.user.id);
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
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(prev => {
        const next = session?.user ?? null;
        if (prev?.id === next?.id) return prev;
        return next;
      });
      setLoading(false);
      const userId = session?.user?.id ?? null;
      if (userId !== currentUserId) {
        currentUserId = userId;
        profileUserIdRef.current = userId;
        if (userId) {
          await ensureProfile(session.user!);
        }
        await updateProfile(userId);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [updateProfile]);

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
    isAdmin,
    isBlocked,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, isAdmin, isBlocked, signUp, signIn, signOut]);

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
