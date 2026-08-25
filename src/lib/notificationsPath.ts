import { useAuth } from "@/contexts/AuthContext";

/** Notifications page path depends on account type. */
export function resolveNotificationsPath(
  userId: string | undefined,
  opts: { isStaff: boolean; isPrincipalAdmin: boolean },
) {
  if (!userId) return "/login";
  if (opts.isPrincipalAdmin || opts.isStaff) return "/console/notifications";
  return "/account/notifications";
}

export function useNotificationsPath() {
  const { user, isStaff, isPrincipalAdmin } = useAuth();
  return resolveNotificationsPath(user?.id, { isStaff, isPrincipalAdmin });
}
