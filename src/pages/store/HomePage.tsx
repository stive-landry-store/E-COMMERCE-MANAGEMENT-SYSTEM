import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarCheck,
  Headphones,
  Laptop,
  MessageCircle,
  Monitor,
  PackageCheck,
  Plug,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  Tablet,
  Truck,
  Wallet,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { CountUp, SplitWords, Typewriter } from "@/components/motion/Motion";
import { Skeleton, SkeletonGrid } from "@/components/ui/Skeleton";
import { FeaturedStack } from "@/components/store/FeaturedStack";
import { MastercardLogo, MtnMomoLogo, OrangeMoneyLogo, VisaLogo } from "@/components/store/PaymentBrandLogos";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { useI18n } from "@/contexts/LanguageContext";
import { categoryImageUrl } from "@/lib/utils";
import { DigitalServiceCard } from "@/components/store/DigitalServiceCard";
import type { Category, DigitalService, Product, PromoFlyer } from "@/types";

const CATEGORY_COVER_FALLBACK: Record<string, string> = {
  "android-phones": "/categories/android-phones.webp",
  tablets: "/categories/tablets.webp",
  "mac-desktop": "/categories/mac-desktop.webp",
  iphone: "/categories/iphone.webp",
  "laptop-macbook": "/categories/macbook.webp",
  audio: "/categories/audio.webp",
  accessories: "/categories/accessories.webp",
  wearables: "/categories/wearables.webp",
  ipad: "/categories/ipad.webp",
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  iphone: Smartphone,
  "android-phones": Smartphone,
  "laptop-macbook": Laptop,
  "mac-desktop": Monitor,
  ipad: Tablet,
  tablets: Tablet,
  audio: Headphones,
  wearables: Watch,
  accessories: Plug,
};

const HERO_PRODUCTS = [
  { src: "/products/thumb/iphone-16-pro-max.webp", label: "iPhone", category: "iphone" },
  { src: "/products/thumb/macbook-air-m5-15-inch.webp", label: "MacBook", category: "laptop-macbook" },
  { src: "/products/thumb/ipad-10.webp", label: "iPad", category: "ipad" },
  { src: "/products/thumb/airpods-pro-3.webp", label: "AirPods", category: "audio" },
];

function categoryCover(c: Category) {
  return categoryImageUrl(c.image_url || CATEGORY_COVER_FALLBACK[c.slug] || null);
}

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const featured = useQuery({
    queryKey: ["featured-products"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, base_price, listing_type, featured, brands(name), sellers(id, shop_name), product_variants(id, price, color, storage, model, image_urls, preorder_enabled)",
        )
        .eq("status", "active")
        .eq("featured", true)
        .limit(10);
      if (error) throw error;
      const products = data as unknown as Product[];
      const variantIds = products.flatMap((p) => p.product_variants?.map((v) => v.id) ?? []);
      const availMap = new Map<string, string>();
      if (variantIds.length > 0) {
        const { data: av } = await supabase
          .from("variant_availability")
          .select("variant_id, availability")
          .in("variant_id", variantIds);
        for (const row of av ?? []) {
          availMap.set(row.variant_id, row.availability);
        }
      }
      return { products, availMap };
    },
  });

  const homeServices = useQuery({
    queryKey: ["digital-services"],
    staleTime: 5 * 60_000,
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

  const promoHome = useQuery({
    queryKey: ["promo-flyers-home"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_flyers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PromoFlyer[];
    },
  });

  const categories = useQuery({
    queryKey: ["home-categories"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("status", "active")
        .eq("show_on_home", true)
        .order("sort_order")
        .order("name");
      if (error) {
        const retry = await supabase.from("categories").select("*").eq("status", "active").order("name");
        return (retry.data ?? []) as Category[];
      }
      return (data ?? []) as Category[];
    },
  });

  const stats = useQuery({
    queryKey: ["home-stats"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [p, c, sv] = await Promise.all([
        supabase.from("products").select("id", head).eq("status", "active"),
        supabase.from("categories").select("id", head).eq("status", "active"),
        supabase.from("digital_services").select("id", head).eq("is_active", true),
      ]);
      return { products: p.count ?? 0, categories: c.count ?? 0, services: sv.count ?? 0 };
    },
  });

  const availMap = featured.data?.availMap ?? new Map<string, string>();
  const featuredItems = (featured.data?.products ?? []).map((product) => {
    const variant = product.product_variants?.[0];
    return { product, variant, availability: variant ? availMap.get(variant.id) : undefined };
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  }

  const steps = [
    { icon: Search, title: t("homeStep1Title"), text: t("homeStep1Text") },
    { icon: CalendarCheck, title: t("homeStep2Title"), text: t("homeStep2Text") },
    { icon: Wallet, title: t("homeStep3Title"), text: t("homeStep3Text") },
    { icon: PackageCheck, title: t("homeStep4Title"), text: t("homeStep4Text") },
  ];

  return (
    <div>
      {/* ——— 1. What we are, in one look ——— */}
      <section className="relative overflow-hidden" data-no-reveal>
        <div className="pointer-events-none absolute inset-0 hero-parallax">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-flare-orange/25 blur-3xl" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-flare-pink/20 blur-3xl" />
        </div>

        <div className="container-page relative grid items-center gap-8 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
          <div>
            <p className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <Store className="h-3.5 w-3.5 text-[#ff2d95]" />
              {t("homeKicker")}
            </p>
            <h1 className="mt-4 text-[2.15rem] font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl">
              <SplitWords text={t("homeHeadline1")} delay={60} step={50} wordClassName="gradient-text" />{" "}
              <SplitWords text={t("homeHeadline2")} delay={180} step={40} />
            </h1>
            <p className="hero-fade mt-4 max-w-lg text-base text-white/70 md:text-lg" style={{ "--d": "0.35s" } as CSSProperties}>
              <Typewriter text={t("homeSub")} speed={18} delay={500} />
            </p>

            <div className="hero-fade mt-6 grid gap-3 sm:flex sm:flex-wrap" style={{ "--d": "0.45s" } as CSSProperties}>
              <Link to="/shop">
                <Button variant="gold" size="lg" className="w-full">
                  <Smartphone className="h-5 w-5" /> {t("homeBuy")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-to-buy">
                <Button variant="secondary" size="lg" className="w-full">
                  <CalendarCheck className="h-5 w-5" /> {t("homeReserve")}
                </Button>
              </a>
            </div>

            <form onSubmit={onSearch} className="hero-fade relative mt-5 max-w-lg" style={{ "--d": "0.55s" } as CSSProperties}>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ff2d95]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-14 rounded-2xl pl-12 text-base"
                enterKeyHint="search"
                aria-label={t("searchPlaceholder")}
              />
            </form>

            <div className="hero-fade mt-5 flex flex-wrap items-center gap-3" style={{ "--d": "0.65s" } as CSSProperties}>
              <span className="pay-chip"><OrangeMoneyLogo className="h-6" /></span>
              <span className="pay-chip"><MtnMomoLogo className="h-6" /></span>
              <span className="pay-chip"><VisaLogo className="h-5" /></span>
              <span className="pay-chip"><MastercardLogo className="h-6" /></span>
            </div>
          </div>

          <div className="hero-visual relative mx-auto w-full max-w-[24rem] md:max-w-md">
            <div className="pointer-events-none absolute inset-[8%] rounded-full bg-brand-grad opacity-30 blur-3xl" />
            <div className="hero-tiles relative grid grid-cols-2 gap-3">
              {HERO_PRODUCTS.map((p, i) => (
                <Link key={p.src} to={`/shop?category=${p.category}`} className="hero-tile" style={{ "--i": `${i * 90}ms` } as CSSProperties}>
                  <img src={p.src} alt={p.label} width={480} height={480} decoding="async" fetchPriority={i < 2 ? "high" : "auto"} />
                  <span>{p.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="container-page relative pb-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: t("qualityBeforePrice") },
              { icon: RefreshCcw, label: t("warrantySupport") },
              { icon: Store, label: t("pickupInStore") },
              { icon: Truck, label: t("reservePreorder") },
            ].map((item) => (
              <div key={item.label} className="glass flex items-center gap-2.5 rounded-2xl px-3 py-3 text-xs font-semibold sm:text-sm">
                <item.icon className="h-5 w-5 shrink-0 text-[#ff2d95]" />
                <span className="leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Counters ——— */}
      <section className="container-page pb-4 pt-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Smartphone, value: stats.data?.products ?? 0, label: t("homeStatProducts"), color: "#38bdf8" },
            { icon: Store, value: stats.data?.categories ?? 0, label: t("homeStatCategories"), color: "#ff7a45" },
            { icon: Monitor, value: stats.data?.services ?? 0, label: t("homeStatServices"), color: "#c026d3" },
            { icon: MessageCircle, value: 7, suffix: "j/7", label: t("homeStatSupport"), color: "#ff2d95" },
          ].map((s) => (
            <div key={s.label} className="stat-card glass rounded-2xl p-4 text-center" style={{ "--c": s.color } as CSSProperties}>
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: s.color }}>
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-3xl font-bold" style={{ color: s.color }}>
                <CountUp value={s.value} />
                {s.suffix ?? "+"}
              </p>
              <p className="mt-1 text-xs text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— 2. What we sell ——— */}
      <section className="container-page py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t("homeWhatWeSell")}</h2>
            <p className="mt-1 text-sm text-white/60"><Typewriter text={t("homeWhatWeSellHint")} /></p>
          </div>
          <Link to="/shop" className="gradient-text shrink-0 text-sm font-bold">
            {t("seeAll")} →
          </Link>
        </div>
        {categories.isLoading ? (
          <SkeletonGrid count={6} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" itemClassName="aspect-square rounded-2xl" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(categories.data ?? []).map((c) => {
              const Icon = CATEGORY_ICON[c.slug] ?? Smartphone;
              const cover = categoryCover(c);
              return (
                <Link
                  key={c.id}
                  to={`/shop?category=${c.slug}`}
                  className="cat-tile group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-3 transition duration-500 hover:-translate-y-1 hover:border-[#ff2d95]/50 hover:shadow-glow"
                >
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                  <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-md transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="relative mt-2 text-sm font-bold leading-tight text-white sm:text-base">{c.name}</span>
                </Link>
              );
            })}
            <Link
              to="/services"
              className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl bg-brand-grad p-3 text-white transition duration-500 hover:-translate-y-1 hover:shadow-glow"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                <Monitor className="h-5 w-5" />
              </span>
              <span className="mt-2 text-sm font-bold leading-tight sm:text-base">{t("services")}</span>
              <span className="text-[11px] text-white/85">{t("servicesBadge")}</span>
            </Link>
          </div>
        )}
      </section>

      {/* ——— 3. How to buy / reserve ——— */}
      <section id="how-to-buy" className="container-page scroll-mt-24 py-10">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("homeHowTitle")}</h2>
        <p className="mt-1 text-sm text-white/60"><Typewriter text={t("homeHowHint")} /></p>
        <ol className="how-steps mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="glass relative rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <span className="how-step-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-grad text-white shadow-glow">
                  <s.icon className="h-6 w-6" />
                </span>
                <span className="font-display text-4xl font-bold text-white/15">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ——— 4. Popular products ——— */}
      <section className="container-page py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("homePopular")}</h2>
          <Link to="/shop" className="gradient-text shrink-0 text-sm font-bold">
            {t("seeAll")} →
          </Link>
        </div>
        {featured.isLoading ? (
          <div className="mx-auto max-w-xs">
            <Skeleton className="h-[28rem] w-full rounded-[1.6rem]" />
          </div>
        ) : featuredItems.length === 0 ? null : (
          <FeaturedStack items={featuredItems} />
        )}
      </section>

      {/* ——— 5. Digital services ——— */}
      {(homeServices.data ?? []).length > 0 ? (
        <section className="container-page py-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{t("services")}</h2>
              <p className="mt-1 text-sm text-white/60"><Typewriter text={t("homeServicesHint")} /></p>
            </div>
            <Link to="/services" className="gradient-text shrink-0 text-sm font-bold">
              {t("seeAll")} →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(homeServices.data ?? []).map((service) => (
              <DigitalServiceCard
                key={service.id}
                service={service}
                flyer={(promoHome.data ?? []).find((f) => f.service_id === service.id) ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ——— 6. Help ——— */}
      <section className="container-page py-8 pb-14">
        <div className="glass flex flex-col items-start justify-between gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#25D366]/15 text-[#25D366]">
              <MessageCircle className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{t("homeHelpTitle")}</h2>
              <p className="text-sm text-white/60">{t("homeHelpText")}</p>
            </div>
          </div>
          <WhatsAppSupportButton variant="inline" />
        </div>
      </section>
    </div>
  );
}
