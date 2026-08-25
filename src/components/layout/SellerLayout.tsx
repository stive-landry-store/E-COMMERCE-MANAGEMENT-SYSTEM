import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Boxes, LayoutDashboard, LogOut, Megaphone, Menu, MessageCircle, Package, ShoppingCart, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { accountTypeLabelKey } from "@/lib/access";
import type { TranslationKey } from "@/i18n/translations";

const links: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { to: "/seller", labelKey: "dashboard", icon: LayoutDashboard },
  { to: "/seller/products", labelKey: "myProducts", icon: Package },
  { to: "/seller/inventory", labelKey: "stock", icon: Boxes },
  { to: "/seller/orders", labelKey: "orders", icon: ShoppingCart },
  { to: "/seller/promotions", labelKey: "sellerPromotionsNav", icon: Megaphone },
  { to: "/seller/chat", labelKey: "sellerChat", icon: MessageCircle },
];

export function SellerLayout() {
  const { profile, seller, isPrincipalAdmin, signOut, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const showVerified = isPrincipalAdmin || Boolean(seller?.is_verified);
  const displayName = seller?.shop_name || profile?.full_name;
  const accountLabel = isPrincipalAdmin ? "adminAccount" : accountTypeLabelKey(profile, seller);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function doSignOut() {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  }

  const accountBlock = (
    <div className="border-t border-white/10 p-4">
      <LanguageSwitcher className="mb-3" />
      <div className="mb-3">
        <ThemeToggle variant="dark" />
      </div>
      {user ? (
        <>
          <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
            <ProfileAvatar profile={profile} size="sm" />
            <span className="truncate">{displayName}</span>
            {showVerified ? <VerifiedBadge size="sm" /> : null}
          </p>
          <p className="text-xs text-white/50">{t(accountLabel)}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
            onClick={doSignOut}
          >
            <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
          </button>
        </>
      ) : (
        <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm font-semibold gradient-text">
          {t("signIn")}
        </Link>
      )}
    </div>
  );

  return (
    <div className="console-app bg-sand-50 md:flex md:h-[100dvh] md:overflow-hidden">
      <aside className="hidden border-r border-white/5 bg-ink-950 text-white md:flex md:h-full md:w-[240px] md:shrink-0 md:flex-col md:overflow-hidden">
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-lg">
            {STORE.short}
            <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("seller")}</span>
          </Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/seller"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
        {accountBlock}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
        <header className="safe-top z-20 flex shrink-0 items-center justify-between border-b border-black/5 bg-white px-3 pb-3 md:px-8 md:pt-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 text-ink-950 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t("settingsMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="min-w-0 truncate text-sm text-ink-700/70">
              {t("sellerDesk")} · {seller?.shop_name || STORE.name}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <LanguageSwitcher variant="light" className="hidden sm:flex" />
            <ThemeToggle variant="light" />
            <NotificationBell variant="light" />
            {isPrincipalAdmin ? (
              <Link to="/console" className="hidden gradient-text hover:underline sm:inline">
                {t("adminConsole")}
              </Link>
            ) : null}
            <Link to="/" className="hidden gradient-text hover:underline sm:inline">
              {t("viewStorefront")}
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/55" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-ink-950 text-white shadow-2xl">
            <div className="safe-top flex items-center justify-between border-b border-white/10 px-4 pb-3">
              <span className="font-display text-lg">
                {STORE.short}
                <span className="ml-2 text-[10px] uppercase tracking-widest gradient-text">{t("seller")}</span>
              </span>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/seller"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
            <div className="safe-bottom">{accountBlock}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
