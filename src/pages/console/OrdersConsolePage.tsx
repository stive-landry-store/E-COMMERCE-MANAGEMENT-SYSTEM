import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { StatusPill } from "@/components/ui/Badge";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import type { Order } from "@/types";

export function OrdersConsolePage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  async function update(id: string, patch: Partial<Order>) {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["staff-orders"] });
    }
  }

  if (query.isLoading) return <Spinner />;
  if (!query.data?.length) return <EmptyState title="No orders yet" />;

  return (
    <div>
      <h1 className="font-display text-3xl">Orders</h1>
      <div className="mt-6 overflow-x-auto surface">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-ink-700/60">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Order status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((o) => (
              <tr key={o.id} className="border-b align-top last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-ink-700/60">{formatDate(o.created_at)}</div>
                </td>
                <td className="px-3 py-3">
                  {o.order_items?.map((i) => (
                    <div key={i.id}>
                      {i.product_name} × {i.quantity}
                    </div>
                  ))}
                </td>
                <td className="px-3 py-3">{formatMoney(o.total)}</td>
                <td className="px-3 py-3">
                  <select
                    value={o.order_status}
                    onChange={(e) => update(o.id, { order_status: e.target.value as Order["order_status"] })}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <select
                    value={o.payment_status}
                    onChange={(e) => update(o.id, { payment_status: e.target.value as Order["payment_status"] })}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1">
                    <StatusPill value={o.payment_method} />
                  </div>
                </td>
                <td className="px-3 py-3 capitalize">{o.fulfillment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
