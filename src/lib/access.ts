import type { LoginPortal, Profile, Seller } from "@/types";
import { ADMIN_ROLES } from "@/lib/constants";

export function isAdminRole(role: string | null | undefined) {
  return Boolean(role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
}

export function isApprovedSeller(seller: Seller | null | undefined) {
  return seller?.status === "approved";
}

export function homeForSession(portal: LoginPortal, profile: Profile | null, seller: Seller | null) {
  const admin = isAdminRole(profile?.role);

  if (portal === "admin") {
    if (!admin) return { ok: false as const, message: "This account is not an administrator. Sign in as Client or Seller." };
    return { ok: true as const, path: "/console" };
  }

  if (portal === "seller") {
    if (admin) return { ok: true as const, path: "/seller" };
    if (!seller) return { ok: false as const, message: "This account is not registered as a seller. Apply from the seller sign-up." };
    if (seller.status === "approved") return { ok: true as const, path: "/seller" };
    return { ok: true as const, path: "/seller/pending" };
  }

  return { ok: true as const, path: "/account" };
}
