import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Copy, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/contexts/LanguageContext";
import { localizedService } from "@/i18n/serviceCatalog";
import { SubscriptionPaymentModal } from "@/components/store/SubscriptionPaymentModal";
import type { DigitalService, PromoFlyer } from "@/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const DEFAULT_PROMO = "STIVELANDRY16STORE";

function discounted(price: number, percent: number) {
  return Math.round(price * (1 - percent / 100));
}

function ServiceFlyer({
  service,
  flyer,
  promoPercent,
  promoCode,
  promoApplied,
  onSubscribe,
}: {
  service: DigitalService;
  flyer?: PromoFlyer | null;
  promoPercent: number;
  promoCode: string;
  promoApplied: boolean;
  onSubscribe: (service: DigitalService, amount: number, original: number) => void;
}) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const loc = localizedService(service.slug, lang);
  const from = flyer?.accent_from || service.accent_from;
  const to = flyer?.accent_to || service.accent_to;
  const logo = flyer?.logo_url || service.logo_url || `/services/${service.slug.includes("netflix") ? "netflix" : service.slug.includes("capcut") ? "capcut" : "icloud"}.png`;
  const first = service.price_first_month;
  const monthly = Number(service.price_monthly);
  const basePrice = first != null ? Number(first) : monthly;
  const pct = promoApplied ? promoPercent : 0;
  const payAmount = pct > 0 ? discounted(basePrice, pct) : basePrice;

  const title = loc?.name || flyer?.title || service.name;
  const subtitle = loc?.subtitle || service.subtitle || t("digitalService");
  const headline =
    loc?.headline ||
    flyer?.headline ||
    (first != null ? `${t("firstSubscription")} · ${formatMoney(first)}` : `${formatMoney(monthly)} / ${t("month")}`);
  const body = loc?.body || flyer?.body || loc?.description || service.description;
  const badge = loc?.badge || service.badge;
  const features = loc?.features?.length ? loc.features : Array.isArray(service.features) ? service.features : [];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(promoCode || DEFAULT_PROMO);
      setCopied(true);
      toast.success(t("promoCopied"));
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <article
      className="service-flyer group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10"
      style={{ background: `linear-gradient(160deg, ${from}22 0%, #0a0818 42%, #07051a 100%)` }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${to}, transparent 70%)` }}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40">
              <img src={logo} alt="" className="h-14 w-14 object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">{subtitle}</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h2>
            </div>
          </div>
          {badge ? (
            <span
              className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
              style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <p className="mt-5 text-lg font-semibold text-white/90">{headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {first != null ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{t("firstSubscription")}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{formatMoney(promoApplied ? payAmount : first)}</p>
              {promoApplied ? (
                <p className="mt-1 text-xs text-white/45 line-through">{formatMoney(first)}</p>
              ) : null}
              <p className="mt-1 text-xs text-white/45">
                {t("then")} {formatMoney(monthly)} / {t("mo")}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{t("monthlyRate")}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{formatMoney(payAmount)}</p>
              {promoApplied ? <p className="mt-1 text-xs text-white/45 line-through">{formatMoney(monthly)}</p> : null}
            </div>
          )}
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
              <Tag className="h-3.5 w-3.5" />
              {t("firstRechargePromo")}
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white transition hover:bg-black/55"
            >
              {DEFAULT_PROMO}
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/50" />}
            </button>
            <p className="mt-2 text-sm font-semibold" style={{ color: from }}>
              −25% → {formatMoney(discounted(basePrice, 25))}
            </p>
          </div>
        </div>

        {features.length > 0 ? (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <span
                  className="grid h-5 w-5 place-items-center rounded-full"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            className="min-w-[10rem] border-0 text-white"
            style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
            onClick={() => onSubscribe(service, payAmount, basePrice)}
          >
            {t("subscribeNow")}
          </Button>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            {t("copyCode")}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ServicesPage() {
  const { t } = useI18n();
  const [codeDraft, setCodeDraft] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [payService, setPayService] = useState<DigitalService | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payOriginal, setPayOriginal] = useState(0);

  const servicesQ = useQuery({
    queryKey: ["digital-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        features: Array.isArray(s.features) ? s.features : [],
      })) as DigitalService[];
    },
  });

  const flyersQ = useQuery({
    queryKey: ["promo-flyers-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_flyers")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_services", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PromoFlyer[];
    },
  });

  const codesQ = useQuery({
    queryKey: ["promo-codes-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_codes").select("*").eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const activePromo = useMemo(() => {
    if (!appliedCode) return null;
    return (codesQ.data ?? []).find((c) => c.code.toLowerCase() === appliedCode.toLowerCase()) ?? null;
  }, [codesQ.data, appliedCode]);

  const flyerByService = useMemo(() => {
    const map = new Map<string, PromoFlyer>();
    for (const f of flyersQ.data ?? []) {
      if (f.service_id) map.set(f.service_id, f);
    }
    return map;
  }, [flyersQ.data]);

  function applyPromo() {
    const code = codeDraft.trim().toUpperCase();
    const match = (codesQ.data ?? []).find((c) => c.code.toUpperCase() === code);
    if (!match) {
      setAppliedCode(null);
      toast.error(t("promoInvalid"));
      return;
    }
    setAppliedCode(match.code);
    toast.success(`${t("promoApplied")} −${match.discount_percent}%`);
  }

  if (servicesQ.isLoading || flyersQ.isLoading) {
    return (
      <div className="container-page flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(900px 420px at 20% 0%, rgba(255,45,149,0.22), transparent 55%), radial-gradient(700px 400px at 90% 20%, rgba(255,122,69,0.16), transparent 50%)",
          }}
        />
        <div className="container-page relative py-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-[#ff2d95]" />
            {t("servicesBadge")}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("servicesTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/60 sm:text-lg">{t("servicesSubtitle")}</p>

          <div className="mt-8">
            {!showCodeBox ? (
              <Button className="border-0 bg-brand-grad text-white" onClick={() => setShowCodeBox(true)}>
                {t("enterPromoCode")}
              </Button>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:max-w-xl sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">{t("promoCodeLabel")}</label>
                  <input
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                    className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 font-mono tracking-widest text-white"
                    placeholder={DEFAULT_PROMO}
                  />
                </div>
                <Button className="border-0 bg-brand-grad text-white" onClick={applyPromo}>
                  {t("applyPromo")}
                </Button>
              </div>
            )}
            {activePromo ? (
              <p className="mt-3 text-sm font-bold text-emerald-400">
                {activePromo.code} · −{activePromo.discount_percent}% {t("firstRecharge")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container-page mt-10 grid gap-8">
        {(servicesQ.data ?? []).map((service) => (
          <ServiceFlyer
            key={service.id}
            service={service}
            flyer={flyerByService.get(service.id)}
            promoPercent={Number(activePromo?.discount_percent ?? 25)}
            promoCode={activePromo?.code ?? DEFAULT_PROMO}
            promoApplied={Boolean(activePromo)}
            onSubscribe={(s, amount, original) => {
              setPayService(s);
              setPayAmount(amount);
              setPayOriginal(original);
            }}
          />
        ))}
      </section>

      <section className="container-page mt-14 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
        <h3 className="text-2xl font-extrabold">{t("servicesHowTitle")}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-white/60">{t("servicesHowBody")}</p>
        <Link to="/contact" className="mt-6 inline-block">
          <Button className="bg-brand-grad border-0 text-white">{t("contactUs")}</Button>
        </Link>
      </section>

      {payService ? (
        <SubscriptionPaymentModal
          open
          onClose={() => setPayService(null)}
          service={payService}
          amount={payAmount}
          originalAmount={payOriginal}
          promoCode={activePromo?.code ?? null}
          discountPercent={Number(activePromo?.discount_percent ?? 0)}
        />
      ) : null}
    </div>
  );
}
