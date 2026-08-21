import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [orders, products, low, reservations, preorders] = await Promise.all([
        supabase.from("orders").select("id,total,order_status,payment_status,created_at"),
        supabase.from("products").select("id,status"),
        supabase.from("variant_availability").select("variant_id,availability,available_stock").in("availability", ["low_stock", "out_of_stock", "preorder"]),
        supabase.from("reservations").select("id,status").eq("status", "active"),
        supabase.from("preorders").select("id,status").eq("status", "pending"),
      ]);
      const orderRows = orders.data ?? [];
      const paid = orderRows.filter((o) => o.payment_status === "paid" || o.order_status === "completed");
      const sales = paid.reduce((s, o) => s + Number(o.total ?? 0), 0);
      return {
        orders: orderRows.length,
        pendingOrders: orderRows.filter((o) => o.order_status === "pending").length,
        sales,
        products: products.data?.length ?? 0,
        low: low.data?.length ?? 0,
        reservations: reservations.data?.length ?? 0,
        preorders: preorders.data?.length ?? 0,
        recent: orderRows.slice(0, 8),
      };
    },
  });

  if (stats.isLoading) return <Spinner />;
  const s = stats.data;

  const cards = [
    { label: "Orders", value: s?.orders ?? 0, to: "/console/orders" },
    { label: "Pending orders", value: s?.pendingOrders ?? 0, to: "/console/orders" },
    { label: "Recorded sales", value: formatMoney(s?.sales ?? 0), to: "/console/reports" },
    { label: "Catalog products", value: s?.products ?? 0, to: "/console/products" },
    { label: "Low / out of stock", value: s?.low ?? 0, to: "/console/inventory" },
    { label: "Active reservations", value: s?.reservations ?? 0, to: "/console/reservations" },
    { label: "Open pre-orders", value: s?.preorders ?? 0, to: "/console/preorders" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-700/70">Live view of sales, stock pressure and fulfillment work.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface p-5 hover:border-[#ff2d95]">
            <p className="text-xs uppercase tracking-wide text-ink-700/60">{c.label}</p>
            <p className="mt-2 font-display text-3xl">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
