import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Seller, SellerReview } from "@/types";

export function ReviewsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sellerId, setSellerId] = useState("");
  const [rating, setRating] = useState(5);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  const sellers = useQuery({
    queryKey: ["approved-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").eq("status", "approved").order("shop_name");
      if (error) throw error;
      return data as Seller[];
    },
  });

  const mine = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("*, sellers(id,shop_name)")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SellerReview[];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !sellerId) return toast.error("Choose a seller");
    setBusy(true);
    const { error } = await supabase.from("seller_reviews").upsert(
      { seller_id: sellerId, profile_id: user.id, rating, remark: remark || null },
      { onConflict: "seller_id,profile_id" },
    );
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Thank you for your remark");
      setRemark("");
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
    }
  }

  if (sellers.isLoading || mine.isLoading) return <Spinner />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="surface p-6">
        <h2 className="text-xl font-bold">Rate a seller</h2>
        <p className="mt-1 text-sm text-white/55">Note the service of the shop that sold to you.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label>Seller</label>
            <select required value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
              <option value="">Choose a shop</option>
              {(sellers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Note (1–5)</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Remark</label>
            <textarea rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="How was the service?" />
          </div>
          <Button type="submit" variant="gold" disabled={busy}>
            Send remark
          </Button>
        </div>
      </form>

      <div>
        <h2 className="text-xl font-bold">Your remarks</h2>
        {!mine.data?.length ? (
          <div className="mt-4">
            <EmptyState title="No remarks yet" hint="After you buy, tell others how the seller treated you." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {mine.data.map((r) => (
              <article key={r.id} className="surface p-4">
                <p className="font-bold">{r.sellers?.shop_name}</p>
                <p className="gradient-text text-sm font-bold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                {r.remark ? <p className="mt-2 text-sm text-white/70">{r.remark}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
