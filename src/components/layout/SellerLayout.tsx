import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, LayoutDashboard, LogOut, Package, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { TranslationKey } from "@/i18n/translations";

const links: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { to: "/seller", labelKey: "dashboard", icon: LayoutDashboard },
  { to: "/seller/products", labelKey: "myProducts", icon: Package },
  { to: "/seller/inventory", labelKey: "stock", icon: Boxes },
  { to: "/seller/orders", labelKey: "orders", icon: ShoppingCart },
];

export function SellerLayout() {
  const { profile, seller, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="console-app min-h-screen bg-sand-50 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-black/5 bg-ink-950 text-white md:min-h-screen md:border-b-0 md:border-r md:border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-lg">
            {STORE.short}
            <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("seller")}</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-0.5 md:overflow-visible md:px-2">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/seller"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
          <p className="truncate text-sm">{seller?.shop_name || profile?.full_name}</p>
          <p className="text-xs text-white/50">{isAdmin ? t("administrator") : t("approvedSeller")}</p>
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
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 md:px-8">
          <p className="text-sm text-ink-700/70">
            {t("sellerDesk")} · {seller?.shop_name || STORE.name}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <LanguageSwitcher variant="light" />
            {isAdmin ? (
              <Link to="/console" className="gradient-text hover:underline">
                {t("adminConsole")}
              </Link>
            ) : null}
            <Link to="/" className="gradient-text hover:underline">
              {t("viewStorefront")}
            </Link>
          </div>
        </header>
        <div className="px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
