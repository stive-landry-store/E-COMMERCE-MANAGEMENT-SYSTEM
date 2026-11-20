import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Package,
  KeyRound,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  FileBarChart,
  Bell,
  Shield,
  CalendarClock,
  Bookmark,
  Store,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { DeskShell } from "@/components/layout/DeskShell";
import type { TranslationKey } from "@/i18n/translations";

const links: {
  to: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  roles: string[];
}[] = [
  { to: "/console", labelKey: "dashboard", icon: LayoutDashboard, roles: ["admin", "co_admin", "store_owner", "inventory_manager", "sales_staff", "it_support"] },
  { to: "/console/sellers", labelKey: "verifySellersTitle", icon: Store, roles: ["admin", "co_admin"] },
  { to: "/console/products", labelKey: "products", icon: Package, roles: ["admin", "co_admin"] },
  { to: "/console/categories", labelKey: "categories", icon: Tags, roles: ["admin", "co_admin"] },
  { to: "/console/brands", labelKey: "brands", icon: Bookmark, roles: ["admin", "co_admin"] },
  { to: "/console/promotions", labelKey: "promotions", icon: Megaphone, roles: ["admin", "co_admin"] },
  { to: "/console/digital-accounts", labelKey: "digitalAccounts", icon: KeyRound, roles: ["admin", "co_admin"] },
  { to: "/console/inventory", labelKey: "inventory", icon: Boxes, roles: ["admin", "co_admin", "inventory_manager"] },
  { to: "/console/orders", labelKey: "orders", icon: ShoppingCart, roles: ["admin", "co_admin", "sales_staff", "store_owner"] },
  { to: "/console/reservations", labelKey: "reservations", icon: CalendarClock, roles: ["admin", "co_admin", "sales_staff"] },
  { to: "/console/preorders", labelKey: "preorders", icon: ClipboardList, roles: ["admin", "co_admin", "sales_staff"] },
  { to: "/console/customers", labelKey: "customers", icon: Users, roles: ["admin", "co_admin", "sales_staff"] },
  { to: "/console/users", labelKey: "staffUsers", icon: Shield, roles: ["admin", "it_support"] },
  { to: "/console/reports", labelKey: "reports", icon: FileBarChart, roles: ["admin", "co_admin", "store_owner"] },
  { to: "/console/audit", labelKey: "auditLog", icon: Shield, roles: ["admin", "co_admin", "it_support", "store_owner"] },
  { to: "/console/notifications", labelKey: "notifications", icon: Bell, roles: ["admin", "co_admin", "store_owner", "inventory_manager", "sales_staff", "it_support"] },
  { to: "/console/settings", labelKey: "storeSettings", icon: Settings, roles: ["admin"] },
];

export function ConsoleLayout() {
  const { role, refreshProfile, isMainAdmin, isCoAdmin, isPrincipalAdmin, profile, user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const visible = links.filter((l) => {
    if (role && l.roles.includes(role)) return true;
    if (isMainAdmin && l.roles.includes("admin")) return true;
    if (isCoAdmin && l.roles.includes("co_admin")) return true;
    if (isPrincipalAdmin && !isMainAdmin && l.roles.includes("co_admin")) return true;
    return false;
  });

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return (
    <DeskShell
      badge={t("console")}
      context={`${t("operations")} · ${STORE.name}`}
      links={visible.map((l) => ({ to: l.to, label: t(l.labelKey), icon: l.icon, end: l.to === "/console" }))}
      topLinks={[
        { to: "/seller", label: t("sellerDesk") },
        { to: "/", label: t("viewStorefront") },
      ]}
      account={{
        signedIn: Boolean(user),
        profile: profile ?? null,
        name: profile?.full_name,
        subtitle: role?.replaceAll("_", " "),
        verified: isPrincipalAdmin,
        onSignOut: async () => {
          await signOut();
          navigate("/");
        },
      }}
    />
  );
}
