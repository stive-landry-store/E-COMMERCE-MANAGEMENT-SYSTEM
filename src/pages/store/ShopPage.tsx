import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/store/ProductCard";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useI18n } from "@/contexts/LanguageContext";
import type { Brand, Category, Product, Seller } from "@/types";

export function ShopPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const availability = params.get("availability") ?? "";
  const maxPrice = params.get("max") ?? "";
  const vendor = params.get("vendor") ?? "";
  const listingType = params.get("type") ?? "";

  const catalogs = useQuery({
    queryKey: ["shop-filters"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [{ data: categories }, { data: brands }, { data: sellers }] = await Promise.all([
        supabase.from("categories").select("id, name, slug, status").eq("status", "active"),
        supabase.from("brands").select("id, name, slug, status").eq("status", "active"),
        supabase.from("sellers").select("id, shop_name, status").eq("status", "approved").order("shop_name"),
      ]);
      return {
        categories: (categories ?? []) as Category[],
        brands: (brands ?? []) as Brand[],
        sellers: (sellers ?? []) as Seller[],
      };
    },
  });

  const products = useQuery({
    queryKey: ["shop", q, category, brand, vendor, listingType],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          "id, name, slug, base_price, listing_type, category_id, brand_id, seller_id, brands(name), categories(slug), product_variants(id, price, color, storage, model, image_urls), sellers(id, shop_name)",
        )
        .eq("status", "active")
        .order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      if (category) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", category).maybeSingle();
        if (!cat) return [] as Product[];
        query = query.eq("category_id", cat.id);
      }
      if (brand) {
        const { data: b } = await supabase.from("brands").select("id").eq("slug", brand).maybeSingle();
        if (!b) return [] as Product[];
        query = query.eq("brand_id", b.id);
      }
      if (vendor) query = query.eq("seller_id", vendor);
      if (listingType === "product" || listingType === "service") {
        query = query.eq("listing_type", listingType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const avail = useQuery({
    queryKey: ["availability-slim"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("variant_availability")
        .select("variant_id, availability, available_stock");
      return (data ?? []) as { variant_id: string; availability: string; available_stock: number }[];
    },
  });
  const availMap = new Map((avail.data ?? []).map((a) => [a.variant_id, a]));

  const filtered = useMemo(() => {
    return (products.data ?? [])
      .map((p) => {
        const variant = [...(p.product_variants ?? [])].sort((a, b) => a.price - b.price)[0];
        return { product: p, variant, meta: variant ? availMap.get(variant.id) : undefined };
      })
      .filter(({ product, variant, meta }) => {
        if (maxPrice && Number(variant?.price ?? product.base_price) > Number(maxPrice)) return false;
        if (availability && meta?.availability !== availability) return false;
        return true;
      });
  }, [products.data, availMap, maxPrice, availability]);

  const activeVendor = vendor ? catalogs.data?.sellers.find((s) => s.id === vendor) : null;

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">{t("browseMarketplace")}</h1>
      <p className="mt-2 text-white/60">{t("shopFilterHint")}</p>

      {activeVendor ? (
        <div className="glass mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <p className="text-sm text-white/70">
            {t("filterByVendor")}: <span className="font-bold text-white">{activeVendor.shop_name}</span>
          </p>
          <Link to={`/vendor/${activeVendor.id}`} className="gradient-text text-sm font-semibold">
            {t("seeVendorShop")} →
          </Link>
        </div>
      ) : null}

      <div className="glass mt-6 grid gap-3 rounded-2xl p-4 md:grid-cols-3 lg:grid-cols-6">
        <input placeholder={t("searchProducts")} defaultValue={q} onBlur={(e) => set("q", e.target.value)} />
        <select value={category} onChange={(e) => set("category", e.target.value)}>
          <option value="">{t("allCategories")}</option>
          {(catalogs.data?.categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={brand} onChange={(e) => set("brand", e.target.value)}>
          <option value="">{t("allBrands")}</option>
          {(catalogs.data?.brands ?? []).map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={vendor} onChange={(e) => set("vendor", e.target.value)}>
          <option value="">{t("allVendors")}</option>
          {(catalogs.data?.sellers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.shop_name}
            </option>
          ))}
        </select>
        <select value={listingType} onChange={(e) => set("type", e.target.value)}>
          <option value="">{t("allListingTypes")}</option>
          <option value="product">{t("listingProduct")}</option>
          <option value="service">{t("listingService")}</option>
        </select>
        <select value={availability} onChange={(e) => set("availability", e.target.value)}>
          <option value="">{t("anyAvailability")}</option>
          <option value="in_stock">{t("inStock")}</option>
          <option value="low_stock">{t("lowStock")}</option>
          <option value="out_of_stock">{t("outOfStock")}</option>
          <option value="preorder">{t("preorder")}</option>
        </select>
        <input
          type="number"
          className="md:col-span-2 lg:col-span-1"
          placeholder={t("maxPriceFcfa")}
          defaultValue={maxPrice}
          onBlur={(e) => set("max", e.target.value)}
        />
      </div>

      {products.isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t("noProductsMatch")} hint={t("noProductsMatchHint")} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {filtered.map(({ product, variant, meta }, i) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={variant}
              availability={meta?.availability}
              priority={i < 6}
            />
          ))}
        </div>
      )}
    </div>
  );
}
