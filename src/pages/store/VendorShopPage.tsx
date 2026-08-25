import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { ProductCard } from "@/components/store/ProductCard";
import { MarketplaceVendorsSection } from "@/components/store/MarketplaceVendorsSection";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { Product, Seller } from "@/types";
import { logoStroke } from "@/components/BrandGradient";

type PublicSellerProfile = {
  id: string;
  profile_id: string;
  shop_name: string;
  bio: string | null;
  shop_location: string | null;
  work_area: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
};

export function VendorShopPage() {
  const { sellerId } = useParams();
  const { t } = useI18n();

  const shop = useQuery({
    queryKey: ["vendor-shop", sellerId],
    enabled: Boolean(sellerId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_seller_profile", {
        p_seller_id: sellerId!,
      });
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return row as PublicSellerProfile;
      }

      const { data: fallback, error: fallbackError } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", sellerId!)
        .single();
      if (fallbackError) throw fallbackError;
      const s = fallback as Seller;
      return {
        id: s.id,
        profile_id: s.profile_id,
        shop_name: s.shop_name,
        bio: s.bio,
        shop_location: s.shop_location ?? null,
        work_area: s.work_area ?? null,
        status: s.status,
        is_verified: Boolean(s.is_verified),
        created_at: s.created_at,
        full_name: s.profiles?.full_name ?? null,
        avatar_url: s.profiles?.avatar_url ?? null,
      } satisfies PublicSellerProfile;
    },
  });

  const products = useQuery({
    queryKey: ["vendor-products", sellerId],
    enabled: Boolean(sellerId) && shop.data?.status === "approved",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(*), categories(*), product_variants(*, inventory:inventory(*)), sellers(*)")
        .eq("seller_id", sellerId!)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const avail = useQuery({
    queryKey: ["availability"],
    queryFn: async () => {
      const { data } = await supabase.from("variant_availability").select("*");
      return (data ?? []) as { variant_id: string; availability: string }[];
    },
  });
  const availMap = new Map((avail.data ?? []).map((a) => [a.variant_id, a.availability]));

  if (shop.isLoading) {
    return (
      <div className="py-20">
        <Spinner />
      </div>
    );
  }

  if (shop.isError || !shop.data) {
    return (
      <div className="container-page py-16">
        <EmptyState title={t("vendorNotFound")} hint={t("vendorNotFoundHint")} />
        <Link to="/vendors" className="mt-6 inline-block gradient-text text-sm font-semibold">
          ← {t("allVendors")}
        </Link>
      </div>
    );
  }

  const v = shop.data;
  if (v.status !== "approved") {
    return (
      <div className="container-page py-16">
        <EmptyState title={t("shopNotAvailable")} hint={t("shopNotAvailableHint")} />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <Link to="/vendors" className="text-sm text-white/50 hover:text-white/70">
        ← {t("allVendors")}
      </Link>

      <div className="glass mt-6 rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <ProfileAvatar
            profile={{
              full_name: v.full_name ?? v.shop_name,
              email: null,
              avatar_url: v.avatar_url,
            }}
            size="lg"
            className="!h-20 !w-20 !text-2xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold">{v.shop_name}</h1>
              {v.is_verified ? <VerifiedBadge /> : null}
            </div>
            {v.full_name ? <p className="mt-1 text-sm text-white/55">{v.full_name}</p> : null}
            {v.work_area ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
                <Store className="h-4 w-4" stroke={logoStroke} />
                {v.work_area}
              </p>
            ) : null}
            {v.shop_location ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-white/50">
                <MapPin className="h-4 w-4 shrink-0" />
                {v.shop_location}
              </p>
            ) : null}
            {v.bio ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">{v.bio}</p> : null}
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-bold">{t("shopListings")}</h2>
      <p className="mt-1 text-sm text-white/55">{t("vendorListingsHint")}</p>

      {products.isLoading ? (
        <div className="mt-8">
          <Spinner />
        </div>
      ) : (products.data ?? []).length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t("noListingsYet")} hint={t("noListingsYetHint")} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {(products.data ?? []).map((p) => {
            const variant = p.product_variants?.[0];
            const availability = variant ? availMap.get(variant.id) : undefined;
            return <ProductCard key={p.id} product={p} variant={variant} availability={availability} />;
          })}
        </div>
      )}
    </div>
  );
}

export function VendorsPage() {
  const { t } = useI18n();
  return (
    <div>
      <div className="container-page py-8">
        <h1 className="text-3xl font-extrabold">{t("allVendors")}</h1>
        <p className="mt-2 text-white/60">{t("vendorShopsHint")}</p>
        <Link to="/sell" className="mt-4 inline-block gradient-text text-sm font-semibold">
          {t("sellOnStore")} →
        </Link>
      </div>
      <MarketplaceVendorsSection />
    </div>
  );
}
