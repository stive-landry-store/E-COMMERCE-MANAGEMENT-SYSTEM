import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { TranslationKey } from "@/i18n/translations";

const links: { to: string; labelKey: TranslationKey; end?: boolean }[] = [
  { to: "/account", labelKey: "dashboard", end: true },
  { to: "/account/orders", labelKey: "orders" },
  { to: "/account/reservations", labelKey: "reservations" },
  { to: "/account/preorders", labelKey: "preorders" },
  { to: "/account/reviews", labelKey: "remarks" },
  { to: "/account/profile", labelKey: "profile" },
];

export function AccountLayout() {
  const { profile, signOut, isApprovedSeller, isAdmin } = useAuth();
  const { t } = useI18n();
  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gradient-text font-bold tracking-widest">{t("clientAccount")}</p>
          <h1 className="text-4xl font-extrabold">{profile?.full_name || t("myAccount")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <LanguageSwitcher />
          {isApprovedSeller ? (
            <Link to={isAdmin ? "/console" : "/seller"} className="gradient-text">
              {isAdmin ? t("adminConsole") : t("sellerDesk")}
            </Link>
          ) : null}
          <button className="text-white/60" onClick={() => signOut()}>
            {t("signOut")}
          </button>
        </div>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn("rounded-xl px-4 py-2 text-sm font-bold", isActive ? "bg-brand-grad text-white" : "glass")
            }
          >
            {t(l.labelKey)}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
