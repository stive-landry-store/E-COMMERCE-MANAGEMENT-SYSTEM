import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import type { UserRole } from "@/types";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function StaffRoute({ roles }: { roles?: UserRole[] }) {
  const { loading, user, isStaff, isAdmin, role, profile } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if ((!isStaff && !isAdmin) || profile?.status !== "active") return <Navigate to="/" replace />;
  if (roles && role && !roles.includes(role) && !isAdmin) return <Navigate to="/console" replace />;
  return <Outlet />;
}

export function SellerRoute({ allowPending = false }: { allowPending?: boolean }) {
  const { loading, user, isAdmin, seller } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const approved = isAdmin || seller?.status === "approved";
  if (approved) return <Outlet />;
  if (allowPending) return <Outlet />;
  return <Navigate to="/seller/pending" replace />;
}

export function GuestRoute() {
  const { loading, user, isAdmin, isApprovedSeller } = useAuth();
  if (loading) return <Spinner />;
  if (user && isAdmin) return <Navigate to="/console" replace />;
  if (user && isApprovedSeller) return <Navigate to="/seller" replace />;
  if (user) return <Navigate to="/account" replace />;
  return <Outlet />;
}
