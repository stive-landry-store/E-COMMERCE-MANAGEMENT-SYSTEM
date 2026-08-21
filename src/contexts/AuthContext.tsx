import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { STAFF_ROLES } from "@/lib/constants";
import { isAdminRole, isApprovedSeller } from "@/lib/access";
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

  async function loadProfile(userId: string) {
    const [{ data: profileRow }, { data: sellerRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sellers").select("*").eq("profile_id", userId).maybeSingle(),
    ]);
    setProfile((profileRow as Profile | null) ?? null);
    setSeller((sellerRow as Seller | null) ?? null);
  }

  async function refreshProfile() {
    if (session?.user.id) await loadProfile(session.user.id);
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user.id) {
        loadProfile(next.user.id);
      } else {
        setProfile(null);
        setSeller(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role ?? null;
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      seller,
      role,
      isStaff: Boolean(role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])),
      isAdmin: isAdminRole(role),
      isApprovedSeller: isApprovedSeller(seller) || isAdminRole(role),
      isSellerApplicant: Boolean(seller && seller.status !== "approved"),
      configured: hasSupabaseConfig,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSeller(null);
      },
    };
  }, [loading, session, profile, seller]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
