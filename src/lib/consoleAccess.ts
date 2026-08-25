import type { UserRole } from "@/types";

export type ConsoleAccess = {
  role: string;
  is_main_admin: boolean;
  is_principal_admin: boolean;
  is_co_admin: boolean;
  can_access_console: boolean;
};

export function parseConsoleAccess(raw: unknown): ConsoleAccess | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.role !== "string") return null;
  return {
    role: o.role,
    is_main_admin: Boolean(o.is_main_admin),
    is_principal_admin: Boolean(o.is_principal_admin),
    is_co_admin: Boolean(o.is_co_admin),
    can_access_console: Boolean(o.can_access_console),
  };
}

/** Can this user open a console route that lists these roles? */
export function consoleRoleAllowed(
  required: UserRole[] | undefined,
  role: UserRole | null,
  opts: { isMainAdmin: boolean; isCoAdmin: boolean },
) {
  if (!required?.length) return true;
  if (role && required.includes(role)) return true;
  if (opts.isCoAdmin && required.includes("co_admin")) return true;
  if (opts.isMainAdmin && required.includes("admin")) return true;
  return false;
}
