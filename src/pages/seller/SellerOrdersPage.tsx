import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/ui/Badge";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Order } from "@/types";

export function SellerOrdersPage() {
  const query = useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No orders yet" hint="Orders that include your products will show here." />;

  return (
    <div>
      <h1 className="font-display text-3xl">Orders</h1>
      <p className="text-sm text-ink-700/70">Orders for products you listed. Fulfillment is completed with the store team.</p>
      <div className="mt-6 space-y-4">
        {query.data.map((order) => (
          <article key={order.id} className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-sm text-ink-700/60">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <StatusPill value={order.order_status} />
                <StatusPill value={order.payment_status} />
              </div>
            </div>
            <ul className="mt-3 text-sm text-ink-700/80">
              {order.order_items?.map((item) => (
                <li key={item.id}>
                  {item.product_name} {item.variant_label ? `· ${item.variant_label}` : ""} × {item.quantity}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">{formatMoney(order.total)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
