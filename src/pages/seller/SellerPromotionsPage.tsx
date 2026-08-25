import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Product, SellerPromoCode } from "@/types";

type FormState = {
  id?: string;
  code: string;
  description: string;
  discount_percent: string;
  max_uses: string;
  is_active: boolean;
  product_ids: string[];
};

const emptyForm = (): FormState => ({
  code: "",
  description: "",
  discount_percent: "10",
  max_uses: "",
  is_active: true,
  product_ids: [],
});

export function SellerPromotionsPage() {
  const { t } = useI18n();
  const { seller } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const promosQ = useQuery({
    queryKey: ["seller-promo-codes", seller?.id],
    enabled: Boolean(seller?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_promo_codes")
        .select("*, seller_promo_code_products(product_id)")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (SellerPromoCode & { seller_promo_code_products?: { product_id: string }[] })[];
    },
  });

  const productsQ = useQuery({
    queryKey: ["seller-promo-products", seller?.id],
    enabled: Boolean(seller?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, listing_type, status")
        .eq("seller_id", seller!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Pick<Product, "id" | "name" | "listing_type" | "status">[];
    },
  });

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQ.data ?? []) map.set(p.id, p.name);
    return map;
  }, [productsQ.data]);

  function editPromo(row: SellerPromoCode & { seller_promo_code_products?: { product_id: string }[] }) {
    setForm({
      id: row.id,
      code: row.code,
      description: row.description ?? "",
      discount_percent: String(row.discount_percent),
      max_uses: row.max_uses != null ? String(row.max_uses) : "",
      is_active: row.is_active,
      product_ids: (row.seller_promo_code_products ?? []).map((r) => r.product_id),
    });
    setShowForm(true);
  }

  function toggleProduct(productId: string) {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(productId)
        ? f.product_ids.filter((id) => id !== productId)
        : [...f.product_ids, productId],
    }));
  }

  async function savePromo() {
    if (!seller?.id) return;
    const code = form.code.trim().toUpperCase();
    const discount = Number(form.discount_percent);
    if (!code) {
      toast.error(t("sellerPromoCodeRequired"));
      return;
    }
    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      toast.error(t("sellerPromoDiscountInvalid"));
      return;
    }

    setBusy(true);
    try {
      const payload = {
        seller_id: seller.id,
        code,
        description: form.description.trim() || null,
        discount_percent: discount,
        max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
        is_active: form.is_active,
      };

      let promoId = form.id;

      if (form.id) {
        const { error } = await supabase.from("seller_promo_codes").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("seller_promo_codes").insert(payload).select("id").single();
        if (error) throw error;
        promoId = data.id as string;
      }

      if (!promoId) throw new Error("Missing promo id");

      await supabase.from("seller_promo_code_products").delete().eq("promo_code_id", promoId);

      if (form.product_ids.length > 0) {
        const { error: linkError } = await supabase.from("seller_promo_code_products").insert(
          form.product_ids.map((product_id) => ({ promo_code_id: promoId!, product_id })),
        );
        if (linkError) throw linkError;
      }

      toast.success(form.id ? t("sellerPromoUpdated") : t("sellerPromoCreated"));
      setForm(emptyForm());
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ["seller-promo-codes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sellerPromoSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function deletePromo(id: string) {
    if (!window.confirm(t("sellerPromoDeleteConfirm"))) return;
    const { error } = await supabase.from("seller_promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("sellerPromoDeleted"));
      await qc.invalidateQueries({ queryKey: ["seller-promo-codes"] });
    }
  }

  async function toggleActive(row: SellerPromoCode) {
    const { error } = await supabase
      .from("seller_promo_codes")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else await qc.invalidateQueries({ queryKey: ["seller-promo-codes"] });
  }

  if (!seller) return <EmptyState title={t("sellerPromoNoShop")} />;
  if (promosQ.isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{t("sellerPromotionsTitle")}</h1>
          <p className="mt-1 text-sm text-ink-700/70">{t("sellerPromotionsHint")}</p>
        </div>
        <Button
          variant="gold"
          onClick={() => {
            setForm(emptyForm());
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("sellerPromoNew")}
        </Button>
      </div>

      {showForm ? (
        <div className="mt-6 surface space-y-4 p-6">
          <h2 className="font-medium">{form.id ? t("sellerPromoEdit") : t("sellerPromoNew")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label>{t("promoCodeLabel")}</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
              />
            </div>
            <div>
              <label>{t("discountPercent")}</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label>{t("sellerPromoDescription")}</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("sellerPromoDescriptionPlaceholder")}
              />
            </div>
            <div>
              <label>{t("sellerPromoMaxUses")}</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder={t("sellerPromoMaxUsesOptional")}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                {t("sellerPromoActive")}
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">{t("sellerPromoProductsScope")}</p>
            <p className="text-xs text-ink-700/60">{t("sellerPromoProductsScopeHint")}</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-black/5 p-3">
              {(productsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-ink-700/60">{t("sellerPromoNoProducts")}</p>
              ) : (
                (productsQ.data ?? []).map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.product_ids.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                    />
                    <span>
                      {p.name}
                      <span className="ml-1 text-xs text-ink-700/50">
                        ({p.listing_type === "service" ? t("listingService") : t("listingProduct")})
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="gold" disabled={busy} onClick={() => void savePromo()}>
              {form.id ? t("save") : t("create")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {!promosQ.data?.length ? (
          <EmptyState title={t("sellerPromoEmpty")} hint={t("sellerPromoEmptyHint")} />
        ) : (
          promosQ.data.map((row) => {
            const scopedIds = (row.seller_promo_code_products ?? []).map((r) => r.product_id);
            const scopeLabel =
              scopedIds.length === 0
                ? t("sellerPromoAllProducts")
                : scopedIds.map((id) => productNameById.get(id) ?? id).join(", ");

            return (
              <article key={row.id} className="surface flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-xl">
                    <Megaphone className="h-5 w-5 gradient-text" />
                    <span>{row.code}</span>
                    <span className="rounded-full bg-brand-grad px-2 py-0.5 text-xs font-bold text-white">
                      −{row.discount_percent}%
                    </span>
                  </p>
                  {row.description ? <p className="mt-1 text-sm text-ink-700/70">{row.description}</p> : null}
                  <p className="mt-2 text-xs text-ink-700/55">
                    {t("sellerPromoAppliesTo")}: {scopeLabel}
                  </p>
                  <p className="mt-1 text-xs text-ink-700/55">
                    {t("sellerPromoUses")}: {row.used_count}
                    {row.max_uses != null ? ` / ${row.max_uses}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}
                    onClick={() => void toggleActive(row)}
                  >
                    {row.is_active ? t("active") : t("inactive")}
                  </button>
                  <Button variant="ghost" onClick={() => editPromo(row)}>
                    {t("edit")}
                  </Button>
                  <button
                    type="button"
                    className="rounded-xl p-2 text-red-600 hover:bg-red-50"
                    aria-label={t("delete")}
                    onClick={() => void deletePromo(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
