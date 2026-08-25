import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeskBase } from "@/lib/desk";
import { invalidateStorefront } from "@/lib/catalogCache";
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
    const { error } = await supabase.from("products").update({ base_price: next }).eq("id", product.id).select("id").maybeSingle();
    if (error) throw error;

    // The shop shows variant.price, not products.base_price — keep every variant in sync.
    const variantCount = product.product_variants?.length ?? 0;
    if (variantCount > 0) {
      const { data: updated, error: vError } = await supabase
        .from("product_variants")
        .update({ price: next })
        .eq("product_id", product.id)
        .select("id");
      if (vError) throw vError;
      if (!updated?.length) {
        throw new Error("The shop price was not saved. Confirm you are signed in as admin, then try again.");
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
            Click a photo to replace it, or click a price to change it. That price is what customers see in the shop.
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
                const firstVariant = variants[0];
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
                        hint="This is the price shown in the shop. Saving updates every variant of this product."
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
