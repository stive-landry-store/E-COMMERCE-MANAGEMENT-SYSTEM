import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/contexts/LanguageContext";
import { useSellerDeskScope } from "@/lib/desk";
import { formatMoney } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types";

export function SellerDashboardPage() {
  const { t } = useI18n();
  const { seller, scoped, sellerId, isPrincipalAdmin } = useSellerDeskScope();

  const stats = useQuery({
    queryKey: ["seller-dashboard", sellerId, scoped],
    queryFn: async () => {
      let productsQuery = supabase.from("products").select("id,status,seller_id");
      if (scoped && sellerId) productsQuery = productsQuery.eq("seller_id", sellerId);
      const [products, orders, reservations, categories, brands] = await Promise.all([
        productsQuery,
        supabase.from("orders").select("id,total,order_status,payment_status,created_at,order_items(product_name,quantity,unit_price)"),
        supabase.from("reservations").select("id,status,product_variants(products(seller_id))"),
        supabase.from("categories").select("id,seller_id"),
        supabase.from("brands").select("id,seller_id"),
      ]);
      const catalog = (products.data ?? []) as Pick<Product, "id" | "status">[];
      const orderRows = orders.data ?? [];
      let holdRows = reservations.data ?? [];
      if (scoped && sellerId) {
        holdRows = holdRows.filter((r) => {
          const productsRel = (r as { product_variants?: { products?: { seller_id?: string | null } | { seller_id?: string | null }[] } }).product_variants?.products;
          const product = Array.isArray(productsRel) ? productsRel[0] : productsRel;
          return product?.seller_id === sellerId;
        });
      }
      return {
        products: catalog.length,
        categories: scoped && sellerId
          ? (categories.data ?? []).filter((c: { seller_id?: string | null }) => c.seller_id === sellerId).length
          : (categories.data ?? []).length,
        brands: scoped && sellerId
          ? (brands.data ?? []).filter((b: { seller_id?: string | null }) => b.seller_id === sellerId).length
          : (brands.data ?? []).length,
        active: catalog.filter((p) => p.status === "active").length,
        orders: orderRows.length,
        reservations: holdRows.length,
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
    { label: t("myProducts"), value: s?.products ?? 0, to: "/seller/products" },
    { label: t("categories"), value: s?.categories ?? 0, to: "/seller/categories" },
    { label: t("brands"), value: s?.brands ?? 0, to: "/seller/brands" },
    { label: t("inventory"), value: s?.active ?? 0, to: "/seller/inventory" },
    { label: t("orders"), value: s?.orders ?? 0, to: "/seller/orders" },
    { label: t("reservations"), value: s?.reservations ?? 0, to: "/seller/reservations" },
    { label: "Recorded sales", value: formatMoney(s?.sales ?? 0), to: "/seller/orders" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">Seller dashboard</h1>
      <p className="mt-1 text-sm text-ink-700/70">
        {isPrincipalAdmin
          ? t("coAdminSellerDeskHint")
          : `Welcome to ${seller?.shop_name ?? "your shop"}. ${t("sellerDeskScopeHint")}`}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.to + c.label} to={c.to} className="surface p-5 hover:border-[#ff2d95]">
            <p className="text-xs uppercase tracking-wide text-ink-700/60">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-ink-950">{c.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/seller/products/new">
          <Button variant="secondary">Post a product</Button>
        </Link>
        <Link to="/seller/products/new?type=service">
          <Button variant="secondary">Post a service</Button>
        </Link>
        <Link to="/seller/inventory">
          <Button variant="secondary">Update stock</Button>
        </Link>
      </div>
    </div>
  );
}
