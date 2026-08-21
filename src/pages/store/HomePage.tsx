import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FeaturedStack } from "@/components/store/FeaturedStack";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { logoStroke } from "@/components/BrandGradient";
import { localizedService } from "@/i18n/serviceCatalog";
import type { Category, Product, PromoFlyer } from "@/types";

export function HomePage() {
  const { t, lang } = useI18n();
  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(*), categories(*), product_variants(*, inventory:inventory(*))")
        .eq("status", "active")
        .eq("featured", true)
        .limit(16);
      if (error) throw error;
      return data as Product[];
    },
  });

  const promoHome = useQuery({
    queryKey: ["promo-flyers-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_flyers")
        .select("*, digital_services(slug)")
        .eq("is_active", true)
        .eq("show_on_home", true)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return (data ?? []) as (PromoFlyer & { digital_services?: { slug: string } | null })[];
    },
  });

  const categories = useQuery({
    queryKey: ["home-categories"],
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

  const availability = useQuery({
    queryKey: ["availability"],
    queryFn: async () => {
      const { data } = await supabase.from("variant_availability").select("*");
      return (data ?? []) as { variant_id: string; availability: string }[];
    },
  });

  const availMap = new Map((availability.data ?? []).map((a) => [a.variant_id, a.availability]));

  const featuredItems =
    (featured.data ?? []).map((product) => {
      const variant = product.product_variants?.[0];
      return {
        product,
        variant,
        availability: variant ? availMap.get(variant.id) : undefined,
      };
    }) ?? [];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 animate-pulse-glow rounded-full bg-flare-orange/30 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 animate-pulse-glow rounded-full bg-flare-pink/25 blur-3xl [animation-delay:1.2s]" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 animate-pulse-glow rounded-full bg-flare-purple/25 blur-3xl [animation-delay:2s]" />
        </div>

        <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" stroke={logoStroke} />
              {STORE.tagline}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              {t("heroTitle1")}
              <span className="gradient-text"> {t("heroTitle2")}</span>
              <br />
              {t("heroTitle3")}
            </h1>
            <p className="mt-5 max-w-md text-base text-white/65 md:text-lg">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop">
                <Button variant="gold" size="lg">
                  {t("shopNow")}
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="secondary" size="lg">
                  {t("visitStore")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mx-auto animate-fade-up [animation-delay:150ms]">
            <div className="absolute inset-8 animate-pulse-glow rounded-full bg-brand-grad opacity-40 blur-2xl" />
            <img
              src="/logo.png?v=2"
              alt={STORE.name}
              className="relative z-10 w-full max-w-md animate-float drop-shadow-[0_20px_60px_rgba(255,45,149,0.35)]"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: t("qualityBeforePrice"), text: t("honestAvailability") },
            { icon: RefreshCcw, title: t("warrantySupport"), text: t("pickupInStore") },
            { icon: Store, title: t("visitStore"), text: t("pickupInStore") },
            { icon: Truck, title: t("reservePreorder"), text: t("liveStock") },
          ].map((item, i) => (
            <div
              key={item.title + i}
              style={{ animationDelay: `${i * 90}ms` }}
              className="glass animate-fade-up rounded-3xl p-5"
            >
              <item.icon className="h-6 w-6" stroke={logoStroke} />
              <h3 className="mt-3 font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-white/60">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t("shop")}</h2>
            <p className="mt-1 text-sm text-white/55">{t("browseByCategory")}</p>
          </div>
          <Link to="/shop" className="gradient-text text-sm font-semibold transition hover:brightness-125">
            {t("seeAll")}
          </Link>
        </div>
        {categories.isLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(categories.data ?? []).map((c, i) => (
              <Link
                key={c.id}
                to={`/shop?category=${c.slug}`}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group animate-fade-up overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-[#ff2d95]/50 hover:shadow-glow"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-brand-grad text-4xl font-extrabold text-white">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-xl font-extrabold text-white">{c.name}</h3>
                    {c.description ? <p className="mt-1 line-clamp-2 text-sm text-white/75">{c.description}</p> : null}
                    <span className="gradient-text mt-3 inline-block text-sm font-bold">{t("explore")} →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container-page py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t("services")}</h2>
            <p className="mt-1 text-sm text-white/55">{t("servicesBadge")}</p>
          </div>
          <Link to="/services" className="gradient-text text-sm font-semibold transition hover:brightness-125">
            {t("seeAll")}
          </Link>
        </div>
        {promoHome.isLoading ? (
          <Spinner />
        ) : (promoHome.data ?? []).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {(promoHome.data ?? []).map((f) => {
              const loc = localizedService(f.digital_services?.slug, lang);
              return (
              <Link
                key={f.id}
                to="/services"
                className="group relative overflow-hidden rounded-3xl border border-white/10 p-5 transition hover:-translate-y-1"
                style={{
                  background: `linear-gradient(150deg, ${f.accent_from}33, #0a0818 60%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  {f.logo_url ? <img src={f.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain" /> : null}
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{loc?.name || f.title}</h3>
                    {(loc?.headline || f.headline) ? (
                      <p className="text-sm text-white/70">{loc?.headline || f.headline}</p>
                    ) : null}
                  </div>
                </div>
                {f.promo_code ? (
                  <p className="mt-4 font-mono text-xs font-bold tracking-widest text-white/80">
                    {f.promo_code}
                    {f.discount_percent ? ` · −${f.discount_percent}%` : ""}
                  </p>
                ) : null}
                <span className="gradient-text mt-4 inline-block text-sm font-bold">{t("subscribeNow")} →</span>
              </Link>
              );
            })}
          </div>
        ) : (
          <Link
            to="/services"
            className="block rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center transition hover:border-[#ff2d95]/40"
          >
            <p className="text-lg font-bold">{t("servicesTitle")}</p>
            <p className="mt-2 text-sm text-white/55">{t("servicesSubtitle")}</p>
          </Link>
        )}
      </section>

      <section className="container-page py-10 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t("featured")}</h2>
            <p className="mt-1 text-sm text-white/55">{t("stackedflowHint")}</p>
          </div>
          <Link to="/shop" className="gradient-text text-sm font-semibold transition hover:brightness-125">
            {t("seeAll")}
          </Link>
        </div>
        {featured.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : featuredItems.length === 0 ? (
          <p className="text-center text-sm text-white/50">{t("noProductsMatch")}</p>
        ) : (
          <FeaturedStack items={featuredItems} />
        )}
      </section>
    </div>
  );
}
