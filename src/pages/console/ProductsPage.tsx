import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeskBase } from "@/lib/desk";
import { invalidateStorefront } from "@/lib/catalogCache";
import {
  applyStoragePriceLadder,
  familyFromCategorySlug,
  pickAnchorVariant,
} from "@/lib/storagePriceLadder";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { EditablePriceCell, ProductPhotoCell } from "@/components/console/ProductTableCells";
import type { Product } from "@/types";

export function ProductsPage() {
  const [q, setQ] = useState("");
  const base = useDeskBase();
  const { seller, isAdmin } = useAuth();
  const qc = useQueryClient();
  const sellerDesk = base === "/seller";

  const query = useQuery({
    queryKey: ["admin-products", base, seller?.id, isAdmin],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      let req = supabase.from("products").select("*, brands(*), categories(*), product_variants(*), sellers(shop_name)").order("created_at", { ascending: false });
      if (sellerDesk && !isAdmin && seller?.id) req = req.eq("seller_id", seller.id);
      const { data, error } = await req;
      if (error) throw error;
      return data as Product[];
    },
  });

  const rows = (query.data ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  function refresh() {
    void query.refetch();
    invalidateStorefront(qc);
  }

  async function savePrice(product: Product, next: number) {
    const variants = product.product_variants ?? [];
    const anchor = pickAnchorVariant(variants);
    const family = familyFromCategorySlug(product.categories?.slug);

    const { error } = await supabase.from("products").update({ base_price: next }).eq("id", product.id).select("id").maybeSingle();
    if (error) throw error;

    if (anchor) {
      const { storages } = await applyStoragePriceLadder(variants, anchor.id, next, family, "price");
      if (storages.length > 1) {
        toast.success(`Price saved. Other storages estimated (${storages.join(", ")}).`);
      }
    }
    refresh();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Remove “${product.name}”? This deletes the listing.`)) return;
    const { error: vError } = await supabase.from("product_variants").delete().eq("product_id", product.id);
    if (vError) {
      toast.error(vError.message);
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product removed");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{sellerDesk ? "My products" : "Products"}</h1>
          <p className="text-sm text-ink-700/70">
            Click a photo to replace it, or click a price to change it. Changing 128 Go estimates 256 Go, 512 Go, etc.
          </p>
        </div>
        <Link to={`${base}/products/new`}>
          <Button variant="gold">New product</Button>
        </Link>
      </div>
      <input className="mt-4 max-w-sm" placeholder="Search by product name" value={q} onChange={(e) => setQ(e.target.value)} />
      {query.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No products" hint="Add the first iPhone or accessory." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto surface">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-ink-700/60">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const variants = p.product_variants ?? [];
                const firstVariant = pickAnchorVariant(variants);
                const shopPrice = Number(firstVariant?.price ?? p.base_price);
                return (
                  <tr key={p.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <ProductPhotoCell
                        url={firstVariant?.image_urls?.[0]}
                        variantId={firstVariant?.id}
                        alt={p.name}
                        onSaved={refresh}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`${base}/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-ink-700/60">{p.brands?.name}</div>
                    </td>
                    <td className="px-4 py-3">{p.sellers?.shop_name ?? "Store"}</td>
                    <td className="px-4 py-3">
                      <EditablePriceCell
                        value={shopPrice}
                        onSave={(next) => savePrice(p, next)}
                        hint="Starting storage price (e.g. 128 Go). 256 Go, 512 Go… are estimated automatically."
                      />
                    </td>
                    <td className="px-4 py-3">{variants.length}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs font-bold text-red-600" onClick={() => remove(p)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
