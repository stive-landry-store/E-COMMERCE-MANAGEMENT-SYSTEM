import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
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
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { TranslationKey } from "@/i18n/translations";

const links: {
  to: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  roles: string[];
}[] = [
  { to: "/console", labelKey: "dashboard", icon: LayoutDashboard, roles: ["admin", "store_owner", "inventory_manager", "sales_staff", "it_support"] },
  { to: "/console/sellers", labelKey: "sellers", icon: Store, roles: ["admin", "store_owner"] },
  { to: "/console/products", labelKey: "products", icon: Package, roles: ["admin"] },
  { to: "/console/categories", labelKey: "categories", icon: Tags, roles: ["admin"] },
  { to: "/console/brands", labelKey: "brands", icon: Bookmark, roles: ["admin"] },
  { to: "/console/promotions", labelKey: "promotions", icon: Megaphone, roles: ["admin"] },
  { to: "/console/inventory", labelKey: "inventory", icon: Boxes, roles: ["admin", "inventory_manager"] },
  { to: "/console/orders", labelKey: "orders", icon: ShoppingCart, roles: ["admin", "sales_staff", "store_owner"] },
  { to: "/console/reservations", labelKey: "reservations", icon: CalendarClock, roles: ["admin", "sales_staff"] },
  { to: "/console/preorders", labelKey: "preorders", icon: ClipboardList, roles: ["admin", "sales_staff"] },
  { to: "/console/customers", labelKey: "customers", icon: Users, roles: ["admin", "sales_staff"] },
  { to: "/console/users", labelKey: "staffUsers", icon: Shield, roles: ["admin", "it_support"] },
  { to: "/console/reports", labelKey: "reports", icon: FileBarChart, roles: ["admin", "store_owner"] },
  { to: "/console/audit", labelKey: "auditLog", icon: Shield, roles: ["admin", "it_support", "store_owner"] },
  { to: "/console/notifications", labelKey: "notifications", icon: Bell, roles: ["admin", "store_owner", "inventory_manager", "sales_staff", "it_support"] },
  { to: "/console/settings", labelKey: "storeSettings", icon: Settings, roles: ["admin"] },
];

export function ConsoleLayout() {
  const { profile, role, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const visible = links.filter((l) => (role ? l.roles.includes(role) : false));

  return (
    <div className="console-app min-h-screen min-h-[100dvh] overflow-x-hidden bg-sand-50 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-black/5 bg-ink-950 text-white md:min-h-screen md:border-b-0 md:border-r md:border-white/5">
        <div className="flex items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link to="/" className="font-display text-lg">
            {STORE.short}
            <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("console")}</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto overscroll-x-contain px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-0.5 md:overflow-visible md:px-2">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/console"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white",
                    isActive && "bg-white/10 gradient-text",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 p-4 md:block">
          <LanguageSwitcher className="mb-3" />
          <p className="truncate text-sm">{profile?.full_name}</p>
          <p className="text-xs capitalize text-white/50">{role?.replaceAll("_", " ")}</p>
          <button
            className="mt-3 inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-2 border-b border-black/5 bg-white px-3 py-3 sm:gap-4 sm:px-4 md:px-8">
          <p className="truncate text-xs text-ink-700/70 sm:text-sm">
            {t("operations")} · {STORE.name}
          </p>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageSwitcher variant="light" />
            <Link to="/seller" className="hidden gradient-text text-sm hover:underline sm:inline">
              {t("sellerDesk")}
            </Link>
            <Link to="/" className="gradient-text text-sm hover:underline">
              {t("viewStorefront")}
            </Link>
          </div>
        </header>
        <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
