import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { consoleRoleAllowed } from "@/lib/consoleAccess";
import type { UserRole } from "@/types";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function StaffRoute({ roles }: { roles?: UserRole[] }) {
  const { loading, user, canAccessConsole, isMainAdmin, isCoAdmin, role } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canAccessConsole) return <Navigate to="/account" replace />;
  if (!consoleRoleAllowed(roles, role, { isMainAdmin, isCoAdmin })) {
    return <Navigate to="/console" replace />;
  }
  return <Outlet />;
}

export function SellerRoute({ allowPending = false }: { allowPending?: boolean }) {
  const { loading, user, canAccessConsole, isApprovedSeller, seller } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (canAccessConsole || isApprovedSeller) return <Outlet />;
  if (allowPending) return <Outlet />;
  if (seller) return <Navigate to="/seller/pending" replace />;
  return <Navigate to="/account" replace />;
}

export function GuestRoute() {
  const { loading, user, canAccessConsole } = useAuth();
  if (loading) return <Spinner />;
  if (user && canAccessConsole) return <Navigate to="/console" replace />;
  if (user) return <Navigate to="/account" replace />;
  return <Outlet />;
}
