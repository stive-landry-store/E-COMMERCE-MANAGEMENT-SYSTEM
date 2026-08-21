import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeskBase } from "@/lib/desk";
import { formatDate } from "@/lib/format";
import { AvailabilityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { variantLabel } from "@/lib/utils";

type Row = {
  variant_id: string;
  availability: string;
  available_stock: number;
  total_stock: number;
  reserved_stock: number;
  min_stock: number;
  seller_id: string | null;
  product_variants: {
    sku: string;
    storage: string | null;
    color: string | null;
    products: { name: string } | null;
  } | null;
};

export function InventoryPage() {
  const qc = useQueryClient();
  const base = useDeskBase();
  const { seller, isAdmin } = useAuth();
  const [selected, setSelected] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const inv = useQuery({
    queryKey: ["inventory-board", base, seller?.id, isAdmin],
    queryFn: async () => {
      const [{ data: variants, error: vError }, { data: avail, error: aError }] = await Promise.all([
        supabase.from("product_variants").select("id, sku, storage, color, products(name, seller_id)"),
        supabase.from("variant_availability").select("*"),
      ]);
      if (vError) throw vError;
      if (aError) throw aError;
      const byId = new Map((avail ?? []).map((a: { variant_id: string } & Record<string, unknown>) => [a.variant_id, a]));
      type VariantRow = {
        id: string;
        sku: string;
        storage: string | null;
        color: string | null;
        products: { name: string; seller_id: string | null } | { name: string; seller_id: string | null }[] | null;
      };
      let mapped = ((variants ?? []) as unknown as VariantRow[]).map((v) => {
        const a = byId.get(v.id) as
          | {
              availability: string;
              available_stock: number;
              total_stock: number;
              reserved_stock: number;
              min_stock: number;
            }
          | undefined;
        const product = Array.isArray(v.products) ? v.products[0] : v.products;
        return {
          variant_id: v.id,
          seller_id: product?.seller_id ?? null,
          availability: a?.availability ?? "out_of_stock",
          available_stock: a?.available_stock ?? 0,
          total_stock: a?.total_stock ?? 0,
          reserved_stock: a?.reserved_stock ?? 0,
          min_stock: a?.min_stock ?? 2,
          product_variants: { sku: v.sku, storage: v.storage, color: v.color, products: product ? { name: product.name } : null },
        } satisfies Row;
      });
      if (base === "/seller" && !isAdmin && seller?.id) {
        mapped = mapped.filter((r) => r.seller_id === seller.id);
      }
      return mapped;
    },
  });

  const movements = useQuery({
    queryKey: ["stock-movements", base, seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, product_variants(sku, products(name, seller_id)), profiles(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      let rows = data ?? [];
      if (base === "/seller" && !isAdmin && seller?.id) {
        rows = rows.filter((m: { product_variants?: { products?: { seller_id?: string | null } | { seller_id?: string | null }[] | null } | null }) => {
          const products = m.product_variants?.products;
          const product = Array.isArray(products) ? products[0] : products;
          return product?.seller_id === seller.id;
        });
      }
      return rows;
    },
  });

  const rows = useMemo(() => {
    const list = inv.data ?? [];
    if (filter === "all") return list;
    return list.filter((r) => r.availability === filter);
  }, [inv.data, filter]);

  async function run(kind: "add" | "remove" | "adjust", variantId = selected, amount?: number) {
    if (!variantId) return toast.error("Select a product variant first");
    setBusy(true);
    try {
      if (kind === "add") {
        const quantity = amount ?? Number(qty);
        if (!quantity || quantity <= 0) throw new Error("Enter a positive quantity");
        const { error } = await supabase.rpc("add_stock", {
          p_variant_id: variantId,
          p_quantity: quantity,
          p_reason: reason || "Stock added",
        });
        if (error) throw error;
      } else if (kind === "remove") {
        const quantity = amount ?? Number(qty);
        if (!quantity || quantity <= 0) throw new Error("Enter a positive quantity");
        if (!(reason || "").trim() && amount == null) throw new Error("A reason is required when removing stock");
        const { error } = await supabase.rpc("remove_stock", {
          p_variant_id: variantId,
          p_quantity: quantity,
          p_reason: reason.trim() || "Stock removed",
        });
        if (error) throw error;
      } else {
        if (newTotal === "" || Number(newTotal) < 0) throw new Error("Enter a valid new total");
        if (!reason.trim()) throw new Error("A reason is required for adjust");
        const { error } = await supabase.rpc("adjust_stock", {
          p_variant_id: variantId,
          p_new_total: Number(newTotal),
          p_reason: reason.trim(),
        });
        if (error) throw error;
      }
      toast.success(kind === "add" ? "Stock added" : kind === "remove" ? "Stock removed" : "Stock adjusted");
      setReason("");
      qc.invalidateQueries({ queryKey: ["inventory-board"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock update failed");
    } finally {
      setBusy(false);
    }
  }

  if (inv.isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Inventory</h1>
          <p className="text-sm text-ink-700/70">Add or remove stock at any time. Available = total − reserved.</p>
        </div>
        <Link to={`${base}/products/new`}>
          <Button variant="gold">Add product</Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["all", "in_stock", "low_stock", "out_of_stock", "preorder"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === f ? "bg-ink-900 text-white" : "border border-black/10 bg-white text-ink-950"}`}
          >
            {f.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {!rows.length ? (
        <div className="mt-6">
          <EmptyState title="No stock rows yet" hint="Create a product first, then add stock here." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-ink-700/60">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Reserved</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Quick</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.variant_id} className={`border-b last:border-0 ${selected === r.variant_id ? "bg-[#ff2d95]/5" : ""}`}>
                  <td className="px-3 py-2">
                    <input type="radio" name="variant" checked={selected === r.variant_id} onChange={() => setSelected(r.variant_id)} />
                  </td>
                  <td className="px-3 py-2">
                    {r.product_variants?.products?.name}
                    <div className="text-xs text-ink-700/60">{r.product_variants ? variantLabel(r.product_variants) : ""}</div>
                  </td>
                  <td className="px-3 py-2">{r.product_variants?.sku}</td>
                  <td className="px-3 py-2">{r.total_stock}</td>
                  <td className="px-3 py-2">{r.reserved_stock}</td>
                  <td className="px-3 py-2 font-medium">{r.available_stock}</td>
                  <td className="px-3 py-2">
                    <AvailabilityBadge value={r.availability} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setSelected(r.variant_id);
                          void run("add", r.variant_id, 1);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || r.available_stock <= 0}
                        onClick={() => {
                          setSelected(r.variant_id);
                          void run("remove", r.variant_id, 1);
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-3 surface p-4 md:grid-cols-4">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required for remove/adjust)" />
        <input type="number" min={0} value={newTotal} onChange={(e) => setNewTotal(e.target.value)} placeholder="New total for adjust" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => run("add")}>
            <Plus className="h-3.5 w-3.5" /> Add stock
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("remove")}>
            <Minus className="h-3.5 w-3.5" /> Remove stock
          </Button>
          <Button size="sm" variant="gold" disabled={busy} onClick={() => run("adjust")}>
            Adjust
          </Button>
        </div>
      </div>

      <h2 className="mt-10 font-medium">Recent stock movements</h2>
      <div className="mt-3 overflow-x-auto surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-ink-700/60">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">User</th>
            </tr>
          </thead>
          <tbody>
            {(movements.data ?? []).map((m: {
              id: string;
              created_at: string;
              type: string;
              quantity: number;
              reason: string | null;
              profiles?: { full_name: string } | null;
            }) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatDate(m.created_at)}</td>
                <td className="px-3 py-2">{m.type.replaceAll("_", " ")}</td>
                <td className="px-3 py-2">{m.quantity}</td>
                <td className="px-3 py-2">{m.reason}</td>
                <td className="px-3 py-2">{m.profiles?.full_name ?? "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
