import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/ui/Badge";
import { EmptyState, Spinner } from "@/components/ui/Spinner";
import { OrderPaymentProofPanel } from "@/components/store/OrderPaymentProofPanel";
import type { Order } from "@/types";

export function OrdersPage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: Boolean(user),
  });

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No orders yet" hint="When you checkout, they will appear here." />;

  return (
    <div className="space-y-4">
      {query.data.map((order) => (
        <article key={order.id} className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{order.order_number}</p>
              <p className="text-sm text-white/50">{formatDate(order.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <StatusPill value={order.order_status} />
              <StatusPill value={order.payment_status} />
            </div>
          </div>
          <ul className="mt-3 text-sm text-white/70">
            {order.order_items?.map((item) => (
              <li key={item.id}>
                {item.product_name} {item.variant_label ? `· ${item.variant_label}` : ""} × {item.quantity}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-semibold">{formatMoney(order.total)}</p>
          <OrderPaymentProofPanel order={order} />
        </article>
      ))}
    </div>
  );
}
