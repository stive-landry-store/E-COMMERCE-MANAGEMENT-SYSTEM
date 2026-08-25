import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Package, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { useDeskBase } from "@/lib/desk";
import { formatDate } from "@/lib/format";
import { AvailabilityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { cn, variantLabel } from "@/lib/utils";

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

const FILTERS = ["all", "in_stock", "low_stock", "out_of_stock", "preorder"] as const;

export function InventoryPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const base = useDeskBase();
  const { seller, isAdmin } = useAuth();
  const [selected, setSelected] = useState<string>("");
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
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
          product_variants: {
            sku: v.sku,
            storage: v.storage,
            color: v.color,
            products: product ? { name: product.name } : null,
          },
        } satisfies Row;
      });
      if (base === "/seller" && !isAdmin && seller?.id) {
        mapped = mapped.filter((r) => r.seller_id === seller.id);
      }
      return mapped.sort((a, b) =>
        (a.product_variants?.products?.name ?? "").localeCompare(b.product_variants?.products?.name ?? ""),
      );
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
        rows = rows.filter(
          (m: {
            product_variants?: {
              products?: { seller_id?: string | null } | { seller_id?: string | null }[] | null;
            } | null;
          }) => {
            const products = m.product_variants?.products;
            const product = Array.isArray(products) ? products[0] : products;
            return product?.seller_id === seller.id;
          },
        );
      }
      return rows;
    },
  });

  const stats = useMemo(() => {
    const list = inv.data ?? [];
    return {
      total: list.length,
      inStock: list.filter((r) => r.availability === "in_stock").length,
      low: list.filter((r) => r.availability === "low_stock").length,
      out: list.filter((r) => r.availability === "out_of_stock").length,
      units: list.reduce((s, r) => s + Number(r.available_stock || 0), 0),
    };
  }, [inv.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (inv.data ?? []).filter((r) => {
      if (filter !== "all" && r.availability !== filter) return false;
      if (!q) return true;
      const name = r.product_variants?.products?.name?.toLowerCase() ?? "";
      const color = r.product_variants?.color?.toLowerCase() ?? "";
      const storage = r.product_variants?.storage?.toLowerCase() ?? "";
      const label = r.product_variants ? variantLabel(r.product_variants).toLowerCase() : "";
      return name.includes(q) || color.includes(q) || storage.includes(q) || label.includes(q);
    });
  }, [inv.data, filter, search]);

  function qtyFor(id: string) {
    return qtyByVariant[id] ?? "1";
  }

  function setQty(id: string, value: string) {
    setQtyByVariant((prev) => ({ ...prev, [id]: value }));
  }

  async function run(kind: "add" | "remove" | "adjust", variantId: string, amount?: number) {
    if (!variantId) return toast.error(t("selectVariantFirst"));
    setBusy(true);
    setSelected(variantId);
    try {
      if (kind === "add") {
        const quantity = amount ?? Number(qtyFor(variantId));
        if (!quantity || quantity <= 0) throw new Error(t("enterPositiveQty"));
        const { error } = await supabase.rpc("add_stock", {
          p_variant_id: variantId,
          p_quantity: quantity,
          p_reason: reason || t("stockAddedReason"),
        });
        if (error) throw error;
      } else if (kind === "remove") {
        const quantity = amount ?? Number(qtyFor(variantId));
        if (!quantity || quantity <= 0) throw new Error(t("enterPositiveQty"));
        const { error } = await supabase.rpc("remove_stock", {
          p_variant_id: variantId,
          p_quantity: quantity,
          p_reason: reason.trim() || t("stockRemovedReason"),
        });
        if (error) throw error;
      } else {
        if (newTotal === "" || Number(newTotal) < 0) throw new Error(t("enterValidTotal"));
        if (!reason.trim()) throw new Error(t("reasonRequiredAdjust"));
        const { error } = await supabase.rpc("adjust_stock", {
          p_variant_id: variantId,
          p_new_total: Number(newTotal),
          p_reason: reason.trim(),
        });
        if (error) throw error;
      }
      toast.success(kind === "add" ? t("stockAddedToast") : kind === "remove" ? t("stockRemovedToast") : t("stockAdjustedToast"));
      setReason("");
      setNewTotal("");
      qc.invalidateQueries({ queryKey: ["inventory-board"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("stockUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (inv.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-950">{t("inventory")}</h1>
          <p className="mt-1 text-sm text-ink-700/70">{t("inventoryPageHint")}</p>
        </div>
        <Link to={`${base}/products/new`}>
          <Button className="border-0 bg-brand-grad text-white">{t("addProduct")}</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("variants"), value: stats.total },
          { label: t("unitsAvailable"), value: stats.units },
          { label: t("lowStock"), value: stats.low, warn: true },
          { label: t("outOfStock"), value: stats.out, danger: true },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-sm",
              card.warn && "border-amber-200",
              card.danger && "border-rose-200",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-700/50">{card.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-ink-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-700/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchInventory")}
              className="h-11 w-full rounded-xl border border-black/10 bg-sand-50 pl-10 pr-3 text-sm text-ink-950 outline-none ring-[#ff2d95]/30 focus:ring-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold capitalize",
                  filter === f ? "bg-ink-950 text-white" : "border border-black/10 bg-white text-ink-800 hover:bg-sand-50",
                )}
              >
                {f === "all" ? t("all") : f.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-700/50">
          {rows.length} {t("resultsShown")}
          {search.trim() ? ` · “${search.trim()}”` : ""}
        </p>
      </div>

      {!rows.length ? (
        <EmptyState title={t("noInventoryMatch")} hint={t("noInventoryMatchHint")} />
      ) : (
        <div className="space-y-3">
          {/* Mobile / tablet cards */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((r) => {
              const name = r.product_variants?.products?.name ?? "—";
              const variant = r.product_variants ? variantLabel(r.product_variants) : "";
              return (
                <article
                  key={r.variant_id}
                  className={cn(
                    "rounded-2xl border bg-white p-4 shadow-sm",
                    selected === r.variant_id ? "border-[#ff2d95]/40 ring-2 ring-[#ff2d95]/15" : "border-black/5",
                  )}
                  onClick={() => setSelected(r.variant_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-ink-700/40" />
                        <p className="truncate font-bold text-ink-950">{name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-700/60">{variant}</p>
                    </div>
                    <AvailabilityBadge value={r.availability} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-sand-50 py-2">
                      <p className="text-ink-700/50">{t("total")}</p>
                      <p className="text-lg font-bold text-ink-950">{r.total_stock}</p>
                    </div>
                    <div className="rounded-xl bg-sand-50 py-2">
                      <p className="text-ink-700/50">{t("reserved")}</p>
                      <p className="text-lg font-bold text-ink-950">{r.reserved_stock}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 py-2">
                      <p className="text-emerald-700/70">{t("stockAvailableCol")}</p>
                      <p className="text-lg font-bold text-emerald-800">{r.available_stock}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || r.available_stock <= 0}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-ink-900 disabled:opacity-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        void run("remove", r.variant_id, 1);
                      }}
                      aria-label={t("removeOne")}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-700/45">{t("qtyToChange")}</p>
                      <input
                        type="number"
                        min={1}
                        value={qtyFor(r.variant_id)}
                        onChange={(e) => setQty(r.variant_id, e.target.value)}
                        className="h-10 w-full rounded-xl border border-black/10 text-center text-sm font-bold"
                        title={t("qtyToChangeHint")}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-white disabled:opacity-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        void run("add", r.variant_id, 1);
                      }}
                      aria-label={t("addOne")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <Button
                      size="sm"
                      className="ml-auto border-0 bg-brand-grad text-white"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void run("add", r.variant_id);
                      }}
                    >
                      +{qtyFor(r.variant_id)}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || r.available_stock <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void run("remove", r.variant_id);
                      }}
                    >
                      −{qtyFor(r.variant_id)}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-sand-50 text-xs uppercase tracking-wider text-ink-700/55">
                <tr>
                  <th className="px-4 py-3">{t("product")}</th>
                  <th className="px-4 py-3 text-right">{t("total")}</th>
                  <th className="px-4 py-3 text-right">{t("reserved")}</th>
                  <th className="px-4 py-3 text-right">{t("stockAvailableCol")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3">{t("adjustStock")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.variant_id}
                    className={cn(
                      "border-b border-black/5 last:border-0 hover:bg-sand-50/80",
                      selected === r.variant_id && "bg-[#ff2d95]/5",
                    )}
                    onClick={() => setSelected(r.variant_id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-950">{r.product_variants?.products?.name}</p>
                      <p className="text-xs text-ink-700/55">{r.product_variants ? variantLabel(r.product_variants) : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.total_stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-700/60">{r.reserved_stock}</td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-emerald-700">{r.available_stock}</td>
                    <td className="px-4 py-3">
                      <AvailabilityBadge value={r.availability} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={busy || r.available_stock <= 0}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white hover:bg-sand-50 disabled:opacity-40"
                          onClick={() => void run("remove", r.variant_id, 1)}
                          title={t("removeOne")}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-[4.5rem]">
                          <p className="mb-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-ink-700/45">{t("qtyToChange")}</p>
                          <input
                            type="number"
                            min={1}
                            value={qtyFor(r.variant_id)}
                            onChange={(e) => setQty(r.variant_id, e.target.value)}
                            className="h-9 w-full rounded-lg border border-black/10 text-center text-sm font-bold"
                            title={t("qtyToChangeHint")}
                            aria-label={t("qtyToChangeHint")}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-ink-950 text-white hover:brightness-110 disabled:opacity-40"
                          onClick={() => void run("add", r.variant_id, 1)}
                          title={t("addOne")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <Button
                          size="sm"
                          className="ml-1 border-0 bg-emerald-600 text-white hover:bg-emerald-500"
                          disabled={busy}
                          onClick={() => void run("add", r.variant_id)}
                        >
                          +{qtyFor(r.variant_id)}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || r.available_stock <= 0}
                          onClick={() => void run("remove", r.variant_id)}
                        >
                          −{qtyFor(r.variant_id)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-ink-950">{t("bulkAdjustTitle")}</p>
        <p className="mt-1 text-xs text-ink-700/55">{t("bulkAdjustHint")}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            type="number"
            min={0}
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            placeholder={t("newTotalPlaceholder")}
            className="h-11 rounded-xl border border-black/10 px-3 text-sm"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            className="h-11 rounded-xl border border-black/10 px-3 text-sm md:col-span-2"
          />
          <Button
            className="h-11 border-0 bg-brand-grad text-white"
            disabled={busy || !selected}
            onClick={() => void run("adjust", selected)}
          >
            {t("setExactTotal")}
          </Button>
        </div>
        {selected ? (
          <p className="mt-2 text-xs text-ink-700/50">
            {t("selectedVariant")}:{" "}
            <span className="font-mono font-semibold text-ink-800">{selected.slice(0, 8).toUpperCase()}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-700">{t("clickRowToSelect")}</p>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl text-ink-950">{t("recentMovements")}</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-sand-50 text-xs uppercase text-ink-700/55">
              <tr>
                <th className="px-4 py-2">{t("when")}</th>
                <th className="px-4 py-2">{t("type")}</th>
                <th className="px-4 py-2">{t("qty")}</th>
                <th className="px-4 py-2">{t("reason")}</th>
                <th className="px-4 py-2">{t("user")}</th>
              </tr>
            </thead>
            <tbody>
              {(movements.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-700/50">
                    {t("noMovementsYet")}
                  </td>
                </tr>
              ) : (
                (movements.data ?? []).map(
                  (m: {
                    id: string;
                    created_at: string;
                    type: string;
                    quantity: number;
                    reason: string | null;
                    profiles?: { full_name: string } | null;
                  }) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-ink-700/70">{formatDate(m.created_at)}</td>
                      <td className="px-4 py-2 capitalize">{m.type.replaceAll("_", " ")}</td>
                      <td className="px-4 py-2 font-semibold tabular-nums">{m.quantity}</td>
                      <td className="px-4 py-2 text-ink-700/70">{m.reason}</td>
                      <td className="px-4 py-2">{m.profiles?.full_name ?? "System"}</td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
