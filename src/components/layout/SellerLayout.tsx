import { useNavigate } from "react-router-dom";
import { Boxes, Bookmark, CalendarClock, LayoutDashboard, Megaphone, MessageCircle, Package, ShoppingCart, Tags } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/LanguageContext";
import { STORE } from "@/lib/constants";
import { accountTypeLabelKey } from "@/lib/access";
import { DeskShell } from "@/components/layout/DeskShell";
import type { TranslationKey } from "@/i18n/translations";

const links: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { to: "/seller", labelKey: "dashboard", icon: LayoutDashboard },
  { to: "/seller/products", labelKey: "myProducts", icon: Package },
  { to: "/seller/categories", labelKey: "categories", icon: Tags },
  { to: "/seller/brands", labelKey: "brands", icon: Bookmark },
  { to: "/seller/inventory", labelKey: "inventory", icon: Boxes },
  { to: "/seller/orders", labelKey: "orders", icon: ShoppingCart },
  { to: "/seller/reservations", labelKey: "reservations", icon: CalendarClock },
  { to: "/seller/promotions", labelKey: "sellerPromotionsNav", icon: Megaphone },
  { to: "/seller/chat", labelKey: "sellerChat", icon: MessageCircle },
];

export function SellerLayout() {
  const { profile, seller, isPrincipalAdmin, signOut, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const showVerified = isPrincipalAdmin || Boolean(seller?.is_verified);
  const displayName = seller?.shop_name || profile?.full_name;
  const accountLabel = isPrincipalAdmin ? "adminAccount" : accountTypeLabelKey(profile, seller);

  return (
    <DeskShell
      badge={t("seller")}
      context={`${t("sellerDesk")} · ${seller?.shop_name || STORE.name}`}
      links={links.map((l) => ({ to: l.to, label: t(l.labelKey), icon: l.icon, end: l.to === "/seller" }))}
      topLinks={[
        ...(isPrincipalAdmin ? [{ to: "/console", label: t("adminConsole") }] : []),
        { to: "/", label: t("viewStorefront") },
      ]}
      account={{
        signedIn: Boolean(user),
        profile: profile ?? null,
        name: displayName,
        subtitle: t(accountLabel),
        verified: showVerified,
        onSignOut: async () => {
          await signOut();
          navigate("/");
        },
      }}
    />
  );
}
