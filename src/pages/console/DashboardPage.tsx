import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/contexts/LanguageContext";
import { StatusPill } from "@/components/ui/Badge";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import { CountUp, SplitWords } from "@/components/motion/Motion";
import { AreaSpark, RingGauge } from "@/components/console/MotionCharts";

const DAY = 86_400_000;

type RecentOrder = {
  id: string;
  order_number: string | null;
  total: number | null;
  order_status: string;
  created_at: string;
};

async function count(table: string, apply: (q: any) => any) {
  const { count: c } = await apply(supabase.from(table).select("*", { count: "exact", head: true }));
  return c ?? 0;
}

export function DashboardPage() {
  const { t } = useI18n();

  const stats = useQuery({
    queryKey: ["dashboard-v2"],
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * DAY);
      since.setHours(0, 0, 0, 0);

      const [orders, pending, products, low, inStock, reservations, preorders, paid, recent] = await Promise.all([
        count("orders", (q) => q),
        count("orders", (q) => q.eq("order_status", "pending")),
        count("products", (q) => q),
        count("variant_availability", (q) => q.in("availability", ["low_stock", "out_of_stock", "preorder"])),
        count("variant_availability", (q) => q.eq("availability", "in_stock")),
        count("reservations", (q) => q.eq("status", "active")),
        count("preorders", (q) => q.eq("status", "pending")),
        supabase.from("orders").select("total,created_at").or("payment_status.eq.paid,order_status.eq.completed"),
        supabase
          .from("orders")
          .select("id,order_number,total,order_status,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const paidRows = (paid.data ?? []) as { total: number | null; created_at: string }[];
      const sales = paidRows.reduce((s, o) => s + Number(o.total ?? 0), 0);

      const days = Array.from({ length: 30 }, () => 0);
      for (const o of paidRows) {
        const idx = Math.floor((new Date(o.created_at).getTime() - since.getTime()) / DAY);
        if (idx >= 0 && idx < 30) days[idx] += Number(o.total ?? 0);
      }

      return {
        orders,
        pending,
        sales,
        products,
        low,
        inStock,
        reservations,
        preorders,
        days,
        recent: (recent.data ?? []) as RecentOrder[],
      };
    },
  });

  const s = stats.data;

  const cards = [
    { label: t("dashOrders"), value: s?.orders ?? 0, to: "/console/orders", icon: ShoppingCart },
    { label: t("dashPending"), value: s?.pending ?? 0, to: "/console/orders", icon: Clock },
    { label: t("dashSales"), value: s?.sales ?? 0, money: true, to: "/console/reports", icon: TrendingUp },
    { label: t("dashProducts"), value: s?.products ?? 0, to: "/console/products", icon: Package },
    { label: t("dashLowStock"), value: s?.low ?? 0, to: "/console/inventory", icon: AlertTriangle },
    { label: t("dashReservations"), value: s?.reservations ?? 0, to: "/console/reservations", icon: CalendarClock },
    { label: t("dashPreorders"), value: s?.preorders ?? 0, to: "/console/preorders", icon: ClipboardList },
  ];

  const totalStock = (s?.inStock ?? 0) + (s?.low ?? 0);
  const health = totalStock > 0 ? (s?.inStock ?? 0) / totalStock : 0;

  return (
    <div>
      <p className="section-index">
        <b>01</b> — {t("dashOverview")}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
        <SplitWords text={t("dashboard")} />
      </h1>
      <p className="mt-2 text-sm text-ink-700/70">{t("dashSubtitle")}</p>

      {stats.isLoading ? (
        <div className="mt-8">
          <SkeletonGrid count={8} className="sm:grid-cols-2 xl:grid-cols-4" itemClassName="h-36" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c, i) => {
              const Icon = c.icon;
              const featured = i === 2;
              return (
                <Link
                  key={c.to + c.label}
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
                    <p
                      className={
                        featured
                          ? "text-xs font-semibold uppercase tracking-[0.16em] text-white/85"
                          : "text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60"
                      }
                    >
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
                  <span
                    className={
                      featured
                        ? "relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/85"
                        : "relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-700/60"
                    }
                  >
                    {t("dashOpen")}
                    <ArrowUpRight className="h-3.5 w-3.5 transition duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="surface p-5 lg:col-span-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60">{t("dashSalesTrend")}</p>
                <p className="font-display text-lg font-bold">
                  {formatMoney((s?.days ?? []).reduce((a, b) => a + b, 0))}
                </p>
              </div>
              <AreaSpark values={s?.days ?? []} className="mt-4 h-40 w-full" />
            </div>

            <div className="surface flex flex-col items-center justify-center p-5">
              <p className="self-start text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60">
                {t("dashStockHealth")}
              </p>
              <RingGauge value={health} className="mt-4 h-36 w-36" />
              <div className="mt-4 flex gap-4 text-xs text-ink-700/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ff2d95]" /> {t("dashInStock")} · {s?.inStock ?? 0}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-black/20" /> {t("dashAttention")} · {s?.low ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60">{t("dashRecent")}</p>
              <Link to="/console/orders" className="gradient-text text-xs font-bold">
                {t("seeAll")}
              </Link>
            </div>
            {s?.recent.length ? (
              <ul className="mt-3">
                {s.recent.map((o, i) => (
                  <li
                    key={o.id}
                    className="dash-row flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3 text-sm"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{o.order_number ?? o.id.slice(0, 8)}</span>
                      <span className="text-xs text-ink-700/60">{formatDate(o.created_at)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <StatusPill value={o.order_status} />
                      <span className="font-display font-bold">{formatMoney(Number(o.total ?? 0))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-6 pt-3 text-sm text-ink-700/60">{t("dashNoOrders")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
