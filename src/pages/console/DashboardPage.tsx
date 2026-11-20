import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { CountUp, SplitWords } from "@/components/motion/Motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

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
    { label: "Orders", value: s?.orders ?? 0, to: "/console/orders", icon: ShoppingCart },
    { label: "Pending orders", value: s?.pendingOrders ?? 0, to: "/console/orders", icon: Clock },
    { label: "Recorded sales", value: s?.sales ?? 0, money: true, to: "/console/reports", icon: TrendingUp },
    { label: "Catalog products", value: s?.products ?? 0, to: "/console/products", icon: Package },
    { label: "Low / out of stock", value: s?.low ?? 0, to: "/console/inventory", icon: AlertTriangle },
    { label: "Active reservations", value: s?.reservations ?? 0, to: "/console/reservations", icon: CalendarClock },
    { label: "Open pre-orders", value: s?.preorders ?? 0, to: "/console/preorders", icon: ClipboardList },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-index">
            <b>01</b> — Overview
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            <SplitWords text="Dashboard" />
          </h1>
          <p className="mt-2 text-sm text-ink-700/70">Live view of sales, stock pressure and fulfillment work.</p>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const featured = i === 2;
          return (
            <Link
              key={c.label}
              to={c.to}
              className={
                featured
                  ? "group relative overflow-hidden rounded-[1.1rem] bg-brand-grad p-5 text-white shadow-glow transition duration-500 hover:-translate-y-1 sm:col-span-2 xl:col-span-2"
                  : "surface group relative overflow-hidden p-5"
              }
            >
              {featured ? (
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl transition duration-700 group-hover:scale-150" />
              ) : null}
              <div className="relative flex items-start justify-between gap-3">
                <p className={featured ? "text-xs font-semibold uppercase tracking-[0.16em] text-white/85" : "text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60"}>
                  {c.label}
                </p>
                <span
                  className={
                    featured
                      ? "grid h-10 w-10 place-items-center rounded-xl bg-white/20"
                      : "grid h-10 w-10 place-items-center rounded-xl bg-[#ff2d95]/10 text-[#ff2d95] transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110"
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="relative mt-4 font-display text-4xl font-bold tracking-tight">
                <CountUp value={Number(c.value)} format={c.money ? (n) => formatMoney(n) : undefined} />
              </p>
              <span className={featured ? "relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/85" : "relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-700/60"}>
                Open
                <ArrowUpRight className="h-3.5 w-3.5 transition duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
