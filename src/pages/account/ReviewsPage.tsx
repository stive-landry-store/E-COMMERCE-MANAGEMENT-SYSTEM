import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StarRating } from "@/components/StarRating";
import type { Seller, SellerReview } from "@/types";

export function ReviewsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sellerId, setSellerId] = useState("");
  const [rating, setRating] = useState(5);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  /** Sellers this customer bought from (approved shops only). */
  const purchasedSellers = useQuery({
    queryKey: ["purchased-sellers", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_items(product_variants(products(seller_id, sellers(id, shop_name, status, is_verified))))",
        )
        .eq("profile_id", user!.id);
      if (error) throw error;

      const map = new Map<string, Seller>();
      for (const order of data ?? []) {
        const items = (order as { order_items?: unknown }).order_items;
        const list = Array.isArray(items) ? items : items ? [items] : [];
        for (const item of list) {
          const variants = (item as { product_variants?: unknown }).product_variants;
          const v = Array.isArray(variants) ? variants[0] : variants;
          const products = (v as { products?: unknown } | null)?.products;
          const p = Array.isArray(products) ? products[0] : products;
          const sellers = (p as { sellers?: unknown } | null)?.sellers;
          const s = (Array.isArray(sellers) ? sellers[0] : sellers) as Seller | null;
          if (s?.id && s.status === "approved") map.set(s.id, s);
        }
      }
      return [...map.values()].sort((a, b) => a.shop_name.localeCompare(b.shop_name));
    },
  });

  const allApproved = useQuery({
    queryKey: ["approved-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("status", "approved")
        .order("shop_name");
      if (error) throw error;
      return data as Seller[];
    },
  });

  const sellerOptions = useMemo(() => {
    if (purchasedSellers.data?.length) return purchasedSellers.data;
    return allApproved.data ?? [];
  }, [purchasedSellers.data, allApproved.data]);

  const mine = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("*, sellers(id,shop_name,is_verified)")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SellerReview[];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !sellerId) return toast.error(t("chooseSeller"));
    setBusy(true);
    const { error } = await supabase.from("seller_reviews").upsert(
      { seller_id: sellerId, profile_id: user.id, rating, remark: remark || null },
      { onConflict: "seller_id,profile_id" },
    );
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("thankYouRemark"));
      setRemark("");
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-seller-review-stats"] });
    }
  }

  if (purchasedSellers.isLoading || allApproved.isLoading || mine.isLoading) return <Spinner />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="surface p-6">
        <h2 className="text-xl font-bold">{t("rateASellerTitle")}</h2>
        <p className="mt-1 text-sm text-white/55">{t("rateSellerStarsHint")}</p>
        <div className="mt-4 space-y-4">
          <div>
            <label>{t("chooseSeller")}</label>
            <select required value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
              <option value="">{t("chooseSeller")}</option>
              {sellerOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name}
                  {s.is_verified ? " ✓" : ""}
                </option>
              ))}
            </select>
            {purchasedSellers.data?.length ? (
              <p className="mt-1 text-xs text-white/40">{t("ratePurchasedOnly")}</p>
            ) : null}
          </div>
          <div>
            <label>{t("yourStars")}</label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
            <p className="mt-1 text-xs text-white/40">{t("starsScaleHint")}</p>
          </div>
          <div>
            <label>{t("yourRemark")}</label>
            <textarea rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={t("howWasService")} />
          </div>
          <Button type="submit" variant="gold" disabled={busy}>
            {t("sendRemark")}
          </Button>
        </div>
      </form>

      <div>
        <h2 className="text-xl font-bold">{t("yourRemarks")}</h2>
        {!mine.data?.length ? (
          <div className="mt-4">
            <EmptyState title={t("noRemarksYet")} hint={t("noRemarksHint")} />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {mine.data.map((r) => (
              <article key={r.id} className="surface p-4">
                <p className="flex items-center gap-1.5 font-bold">
                  {r.sellers?.shop_name}
                  {(r.sellers as Seller | undefined)?.is_verified ? <VerifiedBadge size="sm" /> : null}
                </p>
                <StarRating value={r.rating} readOnly size="sm" className="mt-1" />
                {r.remark ? <p className="mt-2 text-sm text-white/70">{r.remark}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
