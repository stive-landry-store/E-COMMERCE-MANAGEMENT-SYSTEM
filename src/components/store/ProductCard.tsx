import { formatMoney } from "@/lib/format";
import { productImageUrl, variantLabel } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/ui/Badge";
import type { Availability, Product, ProductVariant } from "@/types";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";

type Props = {
  product: Product;
  variant?: ProductVariant;
  availability?: Availability | string | null;
};

export function ProductCard({ product, variant, availability }: Props) {
  const { t } = useI18n();
  const image = productImageUrl(variant?.image_urls?.[0], product.slug);
  const price = variant?.price ?? product.base_price;
  const colors = [...new Set((product.product_variants ?? []).map((v) => v.color).filter(Boolean))];
  const storages = [...new Set((product.product_variants ?? []).map((v) => v.storage).filter(Boolean))];
  const label = variant ? variantLabel(variant) : product.name;
  const href = `/product/${product.slug}${variant ? `?v=${variant.id}` : ""}`;

  return (
    <article className="product-card group flex h-full flex-col overflow-hidden rounded-3xl backdrop-blur-xl transition duration-300 hover:-translate-y-1">
      <Link to={href} className="product-card-media relative block aspect-[4/5] w-full overflow-hidden bg-black/30 sm:aspect-square">
        {availability === "low_stock" ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-brand-grad px-2.5 py-1 text-[11px] font-bold">
            {t("lowStock")}
          </span>
        ) : availability === "preorder" ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
            {t("preorder")}
          </span>
        ) : null}
        <img
          src={image}
          alt={product.name}
          className="product-card-img absolute inset-0 h-full w-full object-contain object-center transition duration-500"
          onError={(e) => {
            const el = e.currentTarget;
            if (!el.src.includes("placeholder-phone")) el.src = "/placeholder-phone.svg";
          }}
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to={href}>
          <h3 className="line-clamp-2 font-bold leading-snug">{product.name}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-white/55">{label}</p>
        </Link>
        {(colors.length > 0 || storages.length > 0) && (
          <p className="mt-2 text-[11px] text-white/45">
            {colors.length ? `${colors.length} ${t("coloursCount")}` : null}
            {colors.length && storages.length ? " · " : null}
            {storages.length ? `${storages.length} ${t("storagesCount")}` : null}
          </p>
        )}
        <div className="mt-2">
          <AvailabilityBadge value={availability} />
        </div>
        <p className="mt-3 text-xl font-extrabold">{formatMoney(price)}</p>
        <div className="flex-1" />
        <Link
          to={href}
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-grad text-sm font-bold text-white transition hover:brightness-110"
        >
          <ShoppingBag className="h-4 w-4" stroke="white" />
          {availability === "preorder" || availability === "out_of_stock" ? t("viewPreorder") : t("chooseOptions")}
        </Link>
      </div>
    </article>
  );
}
