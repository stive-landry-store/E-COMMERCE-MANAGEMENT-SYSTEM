import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Profile } from "@/types";

export type DeskLink = { to: string; label: string; icon: LucideIcon; end?: boolean };

type Props = {
  badge: string;
  links: DeskLink[];
  context: string;
  topLinks: { to: string; label: string }[];
  account: {
    signedIn: boolean;
    profile: Profile | null;
    name?: string | null;
    subtitle?: string | null;
    verified?: boolean;
    onSignOut: () => Promise<void> | void;
  };
};

function Brand({ badge, onClick }: { badge: string; onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="group flex items-center gap-2.5">
      <img
        src="/logo.webp"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 object-contain transition-transform duration-700 [transition-timing-function:var(--ease-spring)] group-hover:rotate-[-12deg] group-hover:scale-110"
      />
      <span className="leading-tight">
        <span className="block font-display text-base font-bold tracking-tight">{STORE.short}</span>
        <span className="gradient-text block text-[10px] font-bold uppercase tracking-[0.24em]">{badge}</span>
      </span>
    </Link>
  );
}

function NavList({ links, onNavigate }: { links: DeskLink[]; onNavigate?: () => void }) {
  return (
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2" data-lenis-prevent>
      {links.map((item, i) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            style={{ "--i": `${i * 35}ms` } as CSSProperties}
            className={({ isActive }) => cn("console-nav-link", isActive && "is-active")}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function AccountCard({ account, onDone }: { account: Props["account"]; onDone?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--c-border)" }}>
      {account.signedIn ? (
        <div className="flex items-center gap-3 rounded-2xl p-2" style={{ background: "var(--c-hover)" }}>
          <ProfileAvatar profile={account.profile} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
              <span className="truncate">{account.name}</span>
              {account.verified ? <VerifiedBadge size="sm" /> : null}
            </p>
            {account.subtitle ? (
              <p className="truncate text-[11px] capitalize" style={{ color: "var(--c-muted)" }}>
                {account.subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            title={t("signOut")}
            aria-label={t("signOut")}
            className="console-icon-btn h-9 w-9 shrink-0"
            onClick={async () => {
              await account.onSignOut();
              onDone?.();
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Link to="/login" onClick={onDone} className="gradient-text text-sm font-semibold">
          {t("signIn")}
        </Link>
      )}
    </div>
  );
}

export function DeskShell({ badge, links, context, topLinks, account }: Props) {
  const { t } = useI18n();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="console-app md:flex md:h-[100dvh] md:overflow-hidden">
      <aside className="console-sidebar hidden md:flex md:h-full md:w-[256px] md:shrink-0 md:flex-col md:overflow-hidden">
        <div className="shrink-0 px-5 pb-4 pt-5">
          <Brand badge={badge} />
        </div>
        <NavList links={links} />
        <AccountCard account={account} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
        <header className="console-topbar safe-top sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 px-3 pb-3 sm:gap-4 sm:px-4 md:static md:px-8 md:pt-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="console-icon-btn h-11 w-11 shrink-0 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t("settingsMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="min-w-0 truncate text-xs font-medium sm:text-sm" style={{ color: "var(--c-muted)" }}>
              {context}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {topLinks.map((l) => (
              <Link key={l.to} to={l.to} className="console-link hidden lg:inline-flex">
                {l.label}
              </Link>
            ))}
            <LanguageSwitcher variant="light" className="hidden sm:flex" />
            <ThemeToggle variant="light" />
            <NotificationBell variant="light" />
          </div>
        </header>

        <div
          data-scroll-root
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8"
        >
          <div key={location.pathname} className="console-page mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="console-backdrop absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="console-drawer console-sidebar absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col shadow-2xl">
            <div className="safe-top flex items-center justify-between px-4 pb-3">
              <Brand badge={badge} onClick={() => setMenuOpen(false)} />
              <button
                type="button"
                className="console-icon-btn h-9 w-9"
                onClick={() => setMenuOpen(false)}
                aria-label={t("closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {topLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="console-link">
                  {l.label}
                </Link>
              ))}
              <LanguageSwitcher variant="light" />
            </div>
            <NavList links={links} onNavigate={() => setMenuOpen(false)} />
            <div className="safe-bottom">
              <AccountCard account={account} onDone={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
