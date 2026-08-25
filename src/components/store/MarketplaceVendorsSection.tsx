import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { Spinner } from "@/components/ui/Spinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { logoStroke } from "@/components/BrandGradient";

type PublicVendor = {
  id: string;
  profile_id: string;
  shop_name: string;
  bio: string | null;
  shop_location: string | null;
  work_area: string | null;
  is_verified: boolean;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  listing_count: number;
};

export function MarketplaceVendorsSection({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  const vendors = useQuery({
    queryKey: ["marketplace-vendors", compact],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_public_sellers", {
        p_limit: compact ? 4 : 24,
      });
      if (!error && data) {
        return (data as PublicVendor[]).map((row) => ({
          ...row,
          listing_count: Number(row.listing_count ?? 0),
        }));
      }

      // Fallback if migration 025 is not applied yet
      const { data: sellers, error: sellersError } = await supabase
        .from("sellers")
        .select("*")
        .eq("status", "approved")
        .order("shop_name")
        .limit(compact ? 4 : 12);
      if (sellersError) throw sellersError;

      const rows = sellers ?? [];
      if (rows.length === 0) return [] as PublicVendor[];

      const ids = rows.map((s) => s.id as string);
      const { data: products } = await supabase
        .from("products")
        .select("seller_id")
        .in("seller_id", ids)
        .eq("status", "active");

      const counts = new Map<string, number>();
      for (const p of products ?? []) {
        if (p.seller_id) counts.set(p.seller_id, (counts.get(p.seller_id) ?? 0) + 1);
      }

      return rows.map((s) => ({
        id: s.id as string,
        profile_id: s.profile_id as string,
        shop_name: s.shop_name as string,
        bio: (s.bio as string | null) ?? null,
        shop_location: (s.shop_location as string | null) ?? null,
        work_area: (s.work_area as string | null) ?? null,
        is_verified: Boolean(s.is_verified),
        created_at: s.created_at as string,
        full_name: null,
        avatar_url: null,
        listing_count: counts.get(s.id as string) ?? 0,
      }));
    },
  });

  if (vendors.isLoading) return compact ? null : <Spinner />;

  const list = vendors.data ?? [];
  if (list.length === 0) {
    if (compact) return null;
    return (
      <section className="container-page py-10">
        <div className="glass rounded-3xl p-8 text-center">
          <Store className="mx-auto h-10 w-10" stroke={logoStroke} />
          <h2 className="mt-4 text-2xl font-bold">{t("ourVendors")}</h2>
          <p className="mt-2 text-sm text-white/55">{t("noVendorsYet")}</p>
          <Link to="/sell" className="mt-4 inline-block gradient-text text-sm font-semibold">
            {t("applyToBeFirst")} →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t("ourVendors")}</h2>
          <p className="mt-1 text-sm text-white/55">{t("vendorShopsHint")}</p>
        </div>
        {!compact ? (
          <Link to="/vendors" className="gradient-text text-sm font-semibold transition hover:brightness-125">
            {t("seeAll")}
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((v, i) => (
          <Link
            key={v.id}
            to={`/vendor/${v.id}`}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group animate-fade-up glass rounded-3xl p-5 transition hover:-translate-y-1 hover:border-[#ff2d95]/40"
          >
            <div className="flex items-start justify-between gap-2">
              <ProfileAvatar
                profile={{
                  full_name: v.full_name ?? v.shop_name,
                  email: null,
                  avatar_url: v.avatar_url,
                }}
                size="md"
                className="!h-12 !w-12 !text-lg"
              />
              {v.is_verified ? <VerifiedBadge size="sm" /> : null}
            </div>
            <h3 className="mt-4 line-clamp-1 font-bold group-hover:gradient-text">{v.shop_name}</h3>
            {v.full_name ? <p className="mt-0.5 line-clamp-1 text-xs text-white/45">{v.full_name}</p> : null}
            {v.work_area ? <p className="mt-1 text-xs text-white/50">{v.work_area}</p> : null}
            {v.shop_location ? (
              <p className="mt-2 flex items-center gap-1 text-xs text-white/45">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{v.shop_location}</span>
              </p>
            ) : null}
            <p className="mt-3 text-sm font-semibold text-white/70">
              {v.listing_count} {t("listingsCount")}
            </p>
            <span className="gradient-text mt-2 inline-block text-xs font-bold">{t("seeVendorShop")} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
