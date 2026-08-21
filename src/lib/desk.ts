import { useLocation } from "react-router-dom";

export function useDeskBase() {
  const { pathname } = useLocation();
  return pathname.startsWith("/seller") ? "/seller" : "/console";
}
