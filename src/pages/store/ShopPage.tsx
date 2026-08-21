import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/store/ProductCard";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Brand, Category, Product } from "@/types";

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const availability = params.get("availability") ?? "";
  const maxPrice = params.get("max") ?? "";

  const catalogs = useQuery({
    queryKey: ["shop-filters"],
    queryFn: async () => {
      const [{ data: categories }, { data: brands }] = await Promise.all([
        supabase.from("categories").select("*").eq("status", "active"),
        supabase.from("brands").select("*").eq("status", "active"),
      ]);
      return { categories: (categories ?? []) as Category[], brands: (brands ?? []) as Brand[] };
    },
  });

  const products = useQuery({
    queryKey: ["shop", q, category, brand],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, brands(*), categories(*), product_variants(*, inventory:inventory(*))")
        .eq("status", "active")
        .order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      if (category) {
        const cat = catalogs.data?.categories.find((c) => c.slug === category);
        if (cat) query = query.eq("category_id", cat.id);
      }
      if (brand) {
        const b = catalogs.data?.brands.find((x) => x.slug === brand);
        if (b) query = query.eq("brand_id", b.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: catalogs.isSuccess,
  });

  const avail = useQuery({
    queryKey: ["availability"],
    queryFn: async () => {
      const { data } = await supabase.from("variant_availability").select("*");
      return (data ?? []) as { variant_id: string; availability: string; available_stock: number }[];
    },
  });
  const availMap = new Map((avail.data ?? []).map((a) => [a.variant_id, a]));

  const filtered = useMemo(() => {
    return (products.data ?? [])
      .map((p) => {
        const variant = p.product_variants?.[0];
        return { product: p, variant, meta: variant ? availMap.get(variant.id) : undefined };
      })
      .filter(({ product, variant, meta }) => {
        if (maxPrice && Number(variant?.price ?? product.base_price) > Number(maxPrice)) return false;
        if (availability && meta?.availability !== availability) return false;
        return true;
      });
  }, [products.data, availMap, maxPrice, availability]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">All products</h1>
      <p className="mt-2 text-white/60">Filter by category, brand, price and live availability.</p>

      <div className="glass mt-6 grid gap-3 rounded-2xl p-4 md:grid-cols-5">
        <input placeholder="Search phones…" defaultValue={q} onBlur={(e) => set("q", e.target.value)} />
        <select value={category} onChange={(e) => set("category", e.target.value)}>
          <option value="">All categories</option>
          {(catalogs.data?.categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={brand} onChange={(e) => set("brand", e.target.value)}>
          <option value="">All brands</option>
          {(catalogs.data?.brands ?? []).map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={availability} onChange={(e) => set("availability", e.target.value)}>
          <option value="">Any availability</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="preorder">Pre-order</option>
        </select>
        <input type="number" placeholder="Max price (FCFA)" defaultValue={maxPrice} onBlur={(e) => set("max", e.target.value)} />
      </div>

      {products.isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No products match those filters" hint="Try clearing a filter or searching a different model." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map(({ product, variant, meta }) => (
            <ProductCard key={product.id} product={product} variant={variant} availability={meta?.availability} />
          ))}
        </div>
      )}
    </div>
  );
}
