import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types";

export function SellerDashboardPage() {
  const { seller, isAdmin } = useAuth();

  const stats = useQuery({
    queryKey: ["seller-dashboard", seller?.id, isAdmin],
    queryFn: async () => {
      let productsQuery = supabase.from("products").select("id,status,seller_id");
      if (!isAdmin && seller?.id) productsQuery = productsQuery.eq("seller_id", seller.id);
      const [products, orders] = await Promise.all([
        productsQuery,
        supabase.from("orders").select("id,total,order_status,payment_status,created_at,order_items(product_name,quantity,unit_price)"),
      ]);
      const catalog = (products.data ?? []) as Pick<Product, "id" | "status">[];
      const orderRows = orders.data ?? [];
      return {
        products: catalog.length,
        active: catalog.filter((p) => p.status === "active").length,
        orders: orderRows.length,
        sales: orderRows
          .filter((o) => o.payment_status === "paid" || o.order_status === "completed")
          .reduce((s, o) => s + Number(o.total ?? 0), 0),
        recent: orderRows.slice(0, 6),
      };
    },
  });

  if (stats.isLoading) return <Spinner />;
  const s = stats.data;

  const cards = [
    { label: "Products", value: s?.products ?? 0, to: "/seller/products" },
    { label: "Active listings", value: s?.active ?? 0, to: "/seller/products" },
    { label: "Orders", value: s?.orders ?? 0, to: "/seller/orders" },
    { label: "Recorded sales", value: formatMoney(s?.sales ?? 0), to: "/seller/orders" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Seller dashboard</h1>
      <p className="mt-1 text-sm text-ink-700/70">
        {isAdmin && !seller ? "Administrator view of the full catalog." : `Welcome to ${seller?.shop_name ?? "your shop"}.`}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface p-5 hover:border-[#ff2d95]">
            <p className="text-xs uppercase tracking-wide text-ink-700/60">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-ink-950">{c.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/seller/products/new">
          <Button variant="secondary">Post a product</Button>
        </Link>
        <Link to="/seller/inventory">
          <Button variant="secondary">Update stock</Button>
        </Link>
      </div>
    </div>
  );
}
