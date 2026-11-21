import { Link } from "react-router-dom";
import { MonitorPlay, Phone, ShoppingBag } from "lucide-react";
import { WHATSAPP_SUPPORT } from "@/lib/constants";
import { useI18n } from "@/contexts/LanguageContext";

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
    </svg>
  );
}

/** Slim vertical rail of quick contacts pinned to the right edge (like the reference). */
export function SideRail() {
  const { t } = useI18n();
  const items = [
    { href: WHATSAPP_SUPPORT.href, label: "WhatsApp", icon: <WhatsAppGlyph />, external: true },
    { href: `tel:+${WHATSAPP_SUPPORT.e164}`, label: WHATSAPP_SUPPORT.display, icon: <Phone className="h-[18px] w-[18px]" />, external: true },
    { href: "/services", label: t("services"), icon: <MonitorPlay className="h-[18px] w-[18px]" /> },
    { href: "/shop", label: t("shop"), icon: <ShoppingBag className="h-[18px] w-[18px]" /> },
  ];
  return (
    <nav className="side-rail" aria-label="Quick links">
      {items.map((it, i) =>
        it.external ? (
          <a key={it.label} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" title={it.label} aria-label={it.label} style={{ animationDelay: `${600 + i * 90}ms` }}>
            {it.icon}
          </a>
        ) : (
          <Link key={it.label} to={it.href} title={it.label} aria-label={it.label} style={{ animationDelay: `${600 + i * 90}ms` }}>
            {it.icon}
          </Link>
        ),
      )}
      <span className="side-rail-line" aria-hidden />
    </nav>
  );
}
