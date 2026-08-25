import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { STAFF_ROLES } from "@/lib/constants";
import {
  isAdminRole,
  isApprovedSeller,
  isMainAdminRole,
  isPrincipalAdminRole,
  isCoAdminRole,
  canAccessConsole as deriveConsoleAccess,
} from "@/lib/access";
import { parseConsoleAccess, type ConsoleAccess } from "@/lib/consoleAccess";
import type { Profile, Seller, UserRole } from "@/types";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  seller: Seller | null;
  role: UserRole | null;
  isStaff: boolean;
  isAdmin: boolean;
  isMainAdmin: boolean;
  isPrincipalAdmin: boolean;
  isCoAdmin: boolean;
  canAccessConsole: boolean;
  isApprovedSeller: boolean;
  isSellerApplicant: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [consoleAccess, setConsoleAccess] = useState<ConsoleAccess | null>(null);

  async function loadProfile(userId: string, sessionUser?: User | null) {
    const [{ data: profileRow, error: profileError }, { data: sellerRow }, accessRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sellers").select("*").eq("profile_id", userId).maybeSingle(),
      supabase.rpc("get_my_console_access"),
    ]);

    let access = parseConsoleAccess(accessRes.data);

    if (!access && !accessRes.error) {
      const { data: isPrincipal } = await supabase.rpc("is_principal_admin");
      access = {
        role: (profileRow as Profile | null)?.role ?? "customer",
        is_main_admin: (profileRow as Profile | null)?.role === "admin",
        is_principal_admin: Boolean(isPrincipal),
        is_co_admin: (profileRow as Profile | null)?.role === "co_admin",
        can_access_console:
          Boolean(isPrincipal) ||
          Boolean(
            (profileRow as Profile | null)?.role &&
              STAFF_ROLES.includes((profileRow as Profile).role as (typeof STAFF_ROLES)[number]),
          ),
      };
    }

    if (profileError) {
      console.warn("profile load:", profileError.message);
    }

    let mergedProfile = (profileRow as Profile | null) ?? null;

    if (access?.role) {
      const serverRole = access.role as UserRole;
      if (mergedProfile) {
        mergedProfile = { ...mergedProfile, role: serverRole };
      } else if (sessionUser) {
        mergedProfile = {
          id: userId,
          email: sessionUser.email ?? null,
          full_name: sessionUser.user_metadata?.full_name ?? sessionUser.email?.split("@")[0] ?? "User",
          phone: null,
          country: null,
          role: serverRole,
          status: "active",
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
      }
    }

    setProfile(mergedProfile);
    setSeller((sellerRow as Seller | null) ?? null);
    setConsoleAccess(access);
  }

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await loadProfile(session.user.id, session.user);
  }, [session?.user]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        loadProfile(data.session.user.id, data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user.id) {
        void loadProfile(next.user.id, next.user);
      } else {
        setProfile(null);
        setSeller(null);
        setConsoleAccess(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    const onFocus = () => {
      void loadProfile(session.user.id, session.user);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => {
    const role = (consoleAccess?.role as UserRole | undefined) ?? profile?.role ?? null;
    const principalAdmin = consoleAccess?.is_principal_admin ?? isPrincipalAdminRole(role);
    const mainAdmin = consoleAccess?.is_main_admin ?? isMainAdminRole(role);
    const coAdmin = consoleAccess?.is_co_admin ?? isCoAdminRole(role);
    const consoleOk =
      consoleAccess?.can_access_console ?? deriveConsoleAccess(profile, principalAdmin);

    return {
      loading,
      session,
      user: session?.user ?? null,
      profile: profile && role ? { ...profile, role } : profile,
      seller,
      role,
      isStaff:
        Boolean(role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) || principalAdmin,
      isAdmin: isAdminRole(role) || principalAdmin,
      isMainAdmin: mainAdmin,
      isPrincipalAdmin: principalAdmin,
      isCoAdmin: coAdmin,
      canAccessConsole: consoleOk && (profile?.status ?? "active") !== "inactive",
      isApprovedSeller: isApprovedSeller(seller) || isAdminRole(role) || principalAdmin,
      isSellerApplicant: Boolean(seller && seller.status !== "approved"),
      configured: hasSupabaseConfig,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSeller(null);
        setConsoleAccess(null);
      },
    };
  }, [loading, session, profile, seller, consoleAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
