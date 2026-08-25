import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
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
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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
  { to: "/console/promotions", labelKey: "promotions", icon: Megaphone, roles: ["admin"] },
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

function AccountFooter({
  className,
  onSignedOut,
}: {
  className?: string;
  onSignedOut?: () => void;
}) {
  const { profile, role, signOut, isAdmin, isPrincipalAdmin, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className={cn("border-t border-white/10 p-4", className)}>
      <LanguageSwitcher className="mb-3" />
      <div className="mb-3">
        <ThemeToggle variant="dark" />
      </div>
      {user ? (
        <>
          <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
            <ProfileAvatar profile={profile} size="sm" />
            <span className="truncate">{profile?.full_name}</span>
            {isPrincipalAdmin ? <VerifiedBadge size="sm" /> : null}
          </p>
          <p className="text-xs capitalize text-white/50">{role?.replaceAll("_", " ")}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
            onClick={async () => {
              await signOut();
              onSignedOut?.();
              navigate("/");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
          </button>
        </>
      ) : (
        <Link
          to="/login"
          onClick={onSignedOut}
          className="mt-1 inline-flex text-sm font-semibold gradient-text"
        >
          {t("signIn")}
        </Link>
      )}
    </div>
  );
}

export function ConsoleLayout() {
  const { role, refreshProfile, isMainAdmin, isCoAdmin, isPrincipalAdmin } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="console-app bg-sand-50 md:flex md:h-[100dvh] md:overflow-hidden">
      <aside className="hidden border-r border-white/5 bg-ink-950 text-white md:flex md:h-full md:w-[240px] md:shrink-0 md:flex-col md:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-lg">
            {STORE.short}
            <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("console")}</span>
          </Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/console"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
        <AccountFooter className="shrink-0" />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
        <header className="safe-top z-20 flex shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white px-3 pb-3 sm:gap-4 sm:px-4 md:px-8 md:pt-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 text-ink-950 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t("settingsMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="min-w-0 truncate text-xs text-ink-700/70 sm:text-sm">
              {t("operations")} · {STORE.name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageSwitcher variant="light" className="hidden sm:flex" />
            <ThemeToggle variant="light" />
            <NotificationBell variant="light" />
            <Link to="/seller" className="hidden gradient-text text-sm hover:underline sm:inline">
              {t("sellerDesk")}
            </Link>
            <Link to="/" className="hidden gradient-text text-sm hover:underline sm:inline">
              {t("viewStorefront")}
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-8">
          <Outlet />
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-ink-950 text-white shadow-2xl">
            <div className="safe-top flex items-center justify-between border-b border-white/10 px-4 pb-3">
              <Link to="/" className="font-display text-lg" onClick={() => setMenuOpen(false)}>
                {STORE.short}
                <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("console")}</span>
              </Link>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
                aria-label={t("closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="mb-2 block rounded-xl px-3 py-2.5 text-sm font-semibold gradient-text hover:bg-white/5"
              >
                {t("viewStorefront")}
              </Link>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/console"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
            <AccountFooter className="safe-bottom shrink-0" onSignedOut={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
