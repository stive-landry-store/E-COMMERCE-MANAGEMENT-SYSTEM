import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Bookmark, Star, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function ClientDashboardPage() {
  const { user, profile, seller, isApprovedSeller } = useAuth();
  const { t } = useI18n();

  const counts = useQuery({
    queryKey: ["client-dash", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [orders, reservations, reviews, products] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("profile_id", user!.id),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("profile_id", user!.id).eq("status", "active"),
        supabase.from("seller_reviews").select("id", { count: "exact", head: true }).eq("profile_id", user!.id),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return {
        orders: orders.count ?? 0,
        reservations: reservations.count ?? 0,
        reviews: reviews.count ?? 0,
        products: products.count ?? 0,
      };
    },
  });

  if (counts.isLoading) return <Spinner />;
  const s = counts.data;

  const cards = [
    { label: t("productsInShop"), value: s?.products ?? 0, to: "/shop", icon: Package, hint: t("browseAndBuy") },
    { label: t("myOrders"), value: s?.orders ?? 0, to: "/account/orders", icon: ShoppingBag, hint: t("trackOrders") },
    { label: t("activeReservations"), value: s?.reservations ?? 0, to: "/account/reservations", icon: Bookmark, hint: t("itemsHeld") },
    { label: t("myRemarks"), value: s?.reviews ?? 0, to: "/account/reviews", icon: Star, hint: t("rateSellerServiceShort") },
  ];

  return (
    <div>
      <p className="text-sm text-white/60">
        {t("hello")} {profile?.full_name || "—"} {t("clientDashHint")}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} className="surface p-5 hover:border-[#ff2d95]">
              <Icon className="h-5 w-5 text-[#ff2d95]" />
              <p className="mt-3 text-xs uppercase tracking-wide text-white/50">{c.label}</p>
              <p className="mt-1 text-3xl font-bold">{c.value}</p>
              <p className="mt-1 text-xs text-white/45">{c.hint}</p>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/shop">
          <Button variant="gold">{t("seeProductsOrder")}</Button>
        </Link>
        <Link to="/shop">
          <Button variant="secondary">{t("reserveAnItem")}</Button>
        </Link>
        <Link to="/account/reviews">
          <Button variant="ghost">
            <MessageSquare className="h-4 w-4" /> {t("rateASeller")}
          </Button>
        </Link>
      </div>
      {seller && !isApprovedSeller ? (
        <p className="mt-6 text-sm text-white/55">
          {t("sellerAppStatus")} <span className="font-bold">{seller.status}</span>.{" "}
          <Link to="/seller/pending" className="gradient-text">
            {t("checkStatus")}
          </Link>
        </p>
      ) : null}
      {!seller ? (
        <p className="mt-6 text-sm text-white/55">
          {t("applySellerCta")}{" "}
          <Link to="/seller/pending" className="gradient-text">
            {t("applySellerLink")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
