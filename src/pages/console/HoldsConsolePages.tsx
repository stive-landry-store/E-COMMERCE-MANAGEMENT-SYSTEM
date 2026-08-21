import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Preorder, Reservation } from "@/types";

export function ReservationsConsolePage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, product_variants(*, products(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });

  async function expire() {
    const { error } = await supabase.rpc("expire_reservations");
    if (error) toast.error(error.message);
    else {
      toast.success("Expired holds released");
      qc.invalidateQueries({ queryKey: ["staff-reservations"] });
    }
  }

  async function convert(id: string) {
    const { error } = await supabase.rpc("convert_reservation_to_order", { p_reservation_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Converted to order");
      qc.invalidateQueries({ queryKey: ["staff-reservations"] });
    }
  }

  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_reservation", { p_reservation_id: id });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["staff-reservations"] });
  }

  if (query.isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Reservations</h1>
        <Button size="sm" variant="secondary" onClick={expire}>
          Release expired holds
        </Button>
      </div>
      {!query.data?.length ? (
        <div className="mt-6">
          <EmptyState title="No reservations" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {query.data.map((r) => (
            <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
              <div>
                <p className="font-medium">{r.product_variants?.products?.name}</p>
                <p className="text-sm text-ink-700/70">
                  Qty {r.quantity} · expires {formatDate(r.expires_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill value={r.status} />
                {r.status === "active" ? (
                  <>
                    <Button size="sm" onClick={() => convert(r.id)}>
                      Convert to order
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => cancel(r.id)}>
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function PreordersConsolePage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-preorders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preorders")
        .select("*, product_variants(*, products(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Preorder[];
    },
  });

  async function setStatus(id: string, status: Preorder["status"]) {
    const { error } = await supabase.from("preorders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["staff-preorders"] });
  }

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No pre-orders" />;

  return (
    <div>
      <h1 className="font-display text-3xl">Pre-orders</h1>
      <div className="mt-6 space-y-3">
        {query.data.map((r) => (
          <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
            <div>
              <p className="font-medium">{r.product_variants?.products?.name}</p>
              <p className="text-sm text-ink-700/70">
                Qty {r.quantity} · {formatDate(r.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill value={r.status} />
              <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as Preorder["status"])} className="w-40">
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="fulfilled">fulfilled</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
