import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Spinner } from "@/components/ui/Spinner";
import { variantLabel } from "@/lib/utils";
import type { Reservation } from "@/types";

export function ReservationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["my-reservations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, product_variants(*, products(*))")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: Boolean(user),
  });

  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_reservation", { p_reservation_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Reservation cancelled");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    }
  }

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No reservations" hint="Reserve an in-stock item from a product page." />;

  return (
    <div className="space-y-4">
      {query.data.map((row) => (
        <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 surface p-5">
          <div>
            <p className="font-medium">{row.product_variants?.products?.name}</p>
            <p className="text-sm text-white/60">
              {row.product_variants ? variantLabel(row.product_variants) : ""} · Qty {row.quantity}
            </p>
            <p className="text-xs text-white/45">Holds until {formatDate(row.expires_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill value={row.status} />
            {row.status === "active" ? (
              <Button size="sm" variant="secondary" onClick={() => cancel(row.id)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
