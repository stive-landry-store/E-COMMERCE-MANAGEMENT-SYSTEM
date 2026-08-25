import { useEffect, useState } from "react";
import { WHATSAPP_SUPPORT } from "@/lib/constants";
import { useI18n } from "@/contexts/LanguageContext";
import { APP_READY_EVENT, SPLASH_SESSION_KEY } from "@/components/ui/AppSplash";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Floating corner button vs inline chip */
  variant?: "fab" | "inline";
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="currentColor">
      <path d="M16.01 3C9.39 3 4 8.29 4 14.8c0 2.35.72 4.53 1.96 6.36L4 29l8.05-2.1A12.2 12.2 0 0 0 16.01 26.6C22.63 26.6 28 21.31 28 14.8S22.63 3 16.01 3zm0 21.5c-1.3 0-2.56-.3-3.68-.88l-.26-.14-4.77 1.25 1.27-4.64-.17-.28A9.35 9.35 0 0 1 6.7 14.8c0-5.05 4.2-9.15 9.31-9.15s9.31 4.1 9.31 9.15-4.2 9.15-9.31 9.15zm5.12-6.86c-.28-.14-1.65-.81-1.91-.9-.26-.1-.44-.14-.63.14-.18.28-.72.9-.88 1.08-.16.18-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.18-.28.28-.47.09-.18.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.48h-.54c-.18 0-.48.07-.73.35-.25.28-.96.93-.96 2.27s.98 2.63 1.12 2.81c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32z" />
    </svg>
  );
}

function useAppReady() {
  const [ready, setReady] = useState(() => {
    if (typeof window === "undefined") return false;
    if (document.documentElement.dataset.appReady === "1") return true;
    try {
      return Boolean(sessionStorage.getItem(SPLASH_SESSION_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (ready) return;
    const onReady = () => setReady(true);
    window.addEventListener(APP_READY_EVENT, onReady);
    return () => window.removeEventListener(APP_READY_EVENT, onReady);
  }, [ready]);

  return ready;
}

export function WhatsAppSupportButton({ className, variant = "fab" }: Props) {
  const { t } = useI18n();
  const appReady = useAppReady();
  const href = `${WHATSAPP_SUPPORT.href}?text=${encodeURIComponent(t("whatsappPrefill"))}`;

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110",
          className,
        )}
      >
        <WhatsAppIcon className="h-5 w-5" />
        {t("whatsappSupport")}
      </a>
    );
  }

  if (!appReady) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        variant === "fab" && !className?.includes("static")
          ? "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_28px_rgba(37,211,102,0.55)] transition hover:scale-105 hover:brightness-110 sm:right-6"
          : "flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_28px_rgba(37,211,102,0.55)] transition hover:scale-105 hover:brightness-110",
        className,
      )}
      aria-label={t("whatsappSupport")}
      title={`${t("whatsappSupport")} · ${WHATSAPP_SUPPORT.display}`}
    >
      <WhatsAppIcon className="h-8 w-8" />
    </a>
  );
}
