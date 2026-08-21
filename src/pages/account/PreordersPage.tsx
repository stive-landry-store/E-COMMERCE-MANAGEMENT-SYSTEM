import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/Badge";
import { EmptyState, Spinner } from "@/components/ui/Spinner";
import { variantLabel } from "@/lib/utils";
import type { Preorder } from "@/types";

export function PreordersPage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-preorders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preorders")
        .select("*, product_variants(*, products(*))")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Preorder[];
    },
    enabled: Boolean(user),
  });

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No pre-orders" hint="Pre-order when a product is out of stock." />;

  return (
    <div className="space-y-4">
      {query.data.map((row) => (
        <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 surface p-5">
          <div>
            <p className="font-medium">{row.product_variants?.products?.name}</p>
            <p className="text-sm text-white/60">
              {row.product_variants ? variantLabel(row.product_variants) : ""} · Qty {row.quantity}
            </p>
            <p className="text-xs text-white/45">Submitted {formatDate(row.created_at)}</p>
          </div>
          <StatusPill value={row.status} />
        </article>
      ))}
    </div>
  );
}
