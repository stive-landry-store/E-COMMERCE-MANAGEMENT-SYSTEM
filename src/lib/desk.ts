import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function useDeskBase() {
  const { pathname } = useLocation();
  return pathname.startsWith("/seller") ? "/seller" : "/console";
}

/** Regular sellers only see their own shop. Admin / co-admin see the whole marketplace. */
export function useSellerDeskScope() {
  const base = useDeskBase();
  const { seller, isPrincipalAdmin } = useAuth();
  return {
    base,
    seller,
    isPrincipalAdmin,
    scoped: base === "/seller" && !isPrincipalAdmin,
    sellerId: seller?.id ?? null,
  };
}
