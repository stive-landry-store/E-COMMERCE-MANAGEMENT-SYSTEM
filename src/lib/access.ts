import type { Profile, Seller } from "@/types";
import { STAFF_ROLES } from "@/lib/constants";
import type { TranslationKey } from "@/i18n/translations";

export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "store_owner" || role === "co_admin";
}

export function isMainAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function isPrincipalAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "co_admin";
}

export function isCoAdminRole(role: string | null | undefined) {
  return role === "co_admin";
}

export function isApprovedSeller(seller: Seller | null | undefined) {
  return seller?.status === "approved";
}

/** Account label: admin principal + co-admin only → Compte admin; sellers → Compte vendeur; else client. */
export function accountTypeLabelKey(
  profile: Profile | null | undefined,
  seller: Seller | null | undefined,
): TranslationKey {
  if (isPrincipalAdminRole(profile?.role)) return "adminAccount";
  if (seller) return "sellerAccount";
  return "customerAccount";
}

export function isVerifiedAccount(profile: Profile | null | undefined, seller: Seller | null | undefined) {
  if (isPrincipalAdminRole(profile?.role)) return true;
  if (profile?.role === "store_owner") return true;
  return Boolean(seller?.is_verified);
}

export function isSellerVerified(seller: Seller | null | undefined) {
  return Boolean(seller?.is_verified);
}

export function canAccessConsole(
  profile: Profile | null | undefined,
  serverPrincipalAdmin = false,
) {
  const role = profile?.role;
  if (profile?.status === "inactive") return false;
  if (isPrincipalAdminRole(role) || serverPrincipalAdmin) return true;
  return Boolean(role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]));
}

export function resolvePostLoginPath(profile: Profile | null, seller: Seller | null, from?: string) {
  const role = profile?.role;
  if (isPrincipalAdminRole(role)) return "/console";
  if (role && role !== "customer" && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
    return "/console";
  }
  if (from && !from.startsWith("/console") && !from.startsWith("/seller")) return from;
  return "/account";
}

export function canUseSellerChat(profile: Profile | null | undefined, seller: Seller | null | undefined) {
  return isPrincipalAdminRole(profile?.role) || seller?.status === "approved";
}
