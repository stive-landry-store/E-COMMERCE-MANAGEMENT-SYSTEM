import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/LanguageContext";
import { localizedService } from "@/i18n/serviceCatalog";
import type { DigitalService, PromoFlyer } from "@/types";

export function serviceDashboardPath(slug: string) {
  return `/services/${slug}`;
}

export function serviceLogoUrl(service: Pick<DigitalService, "slug" | "logo_url">, flyer?: PromoFlyer | null) {
  const url = flyer?.logo_url || service.logo_url;
  if (url) return url;
  if (service.slug.includes("netflix")) return "/services/netflix.png";
  if (service.slug.includes("capcut")) return "/services/capcut.png";
  if (service.slug.includes("icloud")) return "/services/icloud.png";
  return "/logo.webp";
}

export function DigitalServiceCard({
  service,
  flyer,
}: {
  service: DigitalService;
  flyer?: PromoFlyer | null;
}) {
  const { t, lang } = useI18n();
  const loc = localizedService(service.slug, lang);
  const from = flyer?.accent_from || service.accent_from;
  const to = flyer?.accent_to || service.accent_to;
  const title = loc?.name || flyer?.title || service.name;
  const headline = loc?.headline || flyer?.headline || service.subtitle;

  return (
    <Link
      to={serviceDashboardPath(service.slug)}
      className="group relative overflow-hidden rounded-3xl border border-white/10 p-5 transition hover:-translate-y-1"
      style={{ background: `linear-gradient(150deg, ${from}33, #0a0818 60%)` }}
    >
      <div className="flex items-center gap-3">
        <img src={serviceLogoUrl(service, flyer)} alt="" className="h-12 w-12 rounded-xl object-contain" />
        <div>
          <h3 className="text-lg font-extrabold text-white">{title}</h3>
          {headline ? <p className="text-sm text-white/70">{headline}</p> : null}
        </div>
      </div>
      {flyer?.promo_code ? (
        <p className="mt-4 font-mono text-xs font-bold tracking-widest text-white/80">
          {flyer.promo_code}
          {flyer.discount_percent ? ` · −${flyer.discount_percent}%` : ""}
        </p>
      ) : null}
      <span className="gradient-text mt-4 inline-block text-sm font-bold">{t("subscribeNow")} →</span>
    </Link>
  );
}
