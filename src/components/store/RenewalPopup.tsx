import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { Typewriter } from "@/components/motion/Motion";
import { haptic, uiSound } from "@/lib/feedback";
import type { DigitalService } from "@/types";

const SNOOZE_KEY = "sls-renew-snooze";
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const DELAY_MS = 6000;
const HIDDEN_ON = /^\/(services|checkout|cart|login|register|forgot-password|reset-password)/;

const FALLBACK_LOGOS = ["/services/netflix.png", "/services/icloud.png", "/services/capcut.png"];

function snoozed() {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Motion "alert" that invites visitors back to the subscription renewal
 * services (Netflix, iCloud, CapCut…). Shows once, a few seconds after the app
 * opens; "Later" hides it for 24 h.
 */
export function RenewalPopup() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const services = useQuery({
    queryKey: ["digital-services"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("digital_services").select("*").eq("is_active", true).order("sort_order");
      return (data ?? []) as DigitalService[];
    },
  });

  useEffect(() => {
    if (open || snoozed() || HIDDEN_ON.test(pathname)) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(SNOOZE_KEY) === "shown";
    } catch {
      /* ignore */
    }
    if (shown) return;
    const id = window.setTimeout(() => {
      if (HIDDEN_ON.test(window.location.pathname) || document.body.style.overflow === "hidden") return;
      setOpen(true);
      uiSound("tap");
      void haptic("medium");
      try {
        sessionStorage.setItem(SNOOZE_KEY, "shown");
      } catch {
        /* ignore */
      }
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pathname, open]);

  function close(snooze: boolean) {
    setClosing(true);
    if (snooze) {
      try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 420);
  }

  if (!open) return null;

  const logos = (services.data ?? []).map((s) => s.logo_url).filter(Boolean).slice(0, 4) as string[];
  const shownLogos = logos.length ? logos : FALLBACK_LOGOS;

  return (
    <div className={`renew-layer${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="renew-title">
      <button type="button" className="renew-backdrop" aria-label={t("renewLater")} onClick={() => close(true)} />
      <div className="renew-card">
        <span className="renew-glow" aria-hidden />
        <button type="button" className="renew-close" onClick={() => close(true)} aria-label={t("renewLater")}>
          <X className="h-4 w-4" />
        </button>

        <div className="renew-icon" aria-hidden>
          <BellRing className="h-7 w-7" />
          <span className="renew-ping" />
        </div>

        <p className="renew-badge">{t("renewBadge")}</p>
        <h2 id="renew-title" className="renew-title">
          <Typewriter text={t("renewTitle")} speed={26} delay={350} />
        </h2>
        <p className="renew-text">{t("renewText")}</p>

        <div className="renew-logos" aria-hidden>
          {shownLogos.map((src, i) => (
            <span key={src} className="renew-logo" style={{ animationDelay: `${0.45 + i * 0.12}s` }}>
              <img src={src} alt="" loading="eager" />
            </span>
          ))}
        </div>

        <Link to="/services" className="renew-cta" onClick={() => close(false)}>
          {t("renewCta")} →
        </Link>
        <button type="button" className="renew-later" onClick={() => close(true)}>
          {t("renewLater")}
        </button>
      </div>
    </div>
  );
}
