import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/contexts/LanguageContext";
import { applyPageMeta } from "@/lib/pageMeta";
import type { TranslationKey } from "@/i18n/translations";

const TITLES: [string, TranslationKey | null][] = [
  ["/shop", "shop"],
  ["/vendors", "ourVendors"],
  ["/sell", "sellOnStore"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/cart", "cart"],
  ["/checkout", "checkout"],
  ["/login", "signIn"],
  ["/register", "createAccount"],
  ["/forgot-password", "forgotPassword"],
  ["/reset-password", "forgotPassword"],
  ["/account", "account"],
  ["/console", "console"],
  ["/seller", "seller"],
];

/** Title + description for static routes. Product / service / vendor pages set their own. */
export function RouteMeta() {
  const { pathname } = useLocation();
  const { t, lang } = useI18n();

  useEffect(() => {
    if (/^\/(product|vendor|services)(\/|$)/.test(pathname)) return;
    if (pathname === "/") {
      applyPageMeta({ title: null, description: t("heroSubtitle") });
      return;
    }
    const hit = TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
    applyPageMeta({ title: hit?.[1] ? t(hit[1]) : t("notFoundTitle"), description: t("heroSubtitle") });
  }, [pathname, t, lang]);

  return null;
}
