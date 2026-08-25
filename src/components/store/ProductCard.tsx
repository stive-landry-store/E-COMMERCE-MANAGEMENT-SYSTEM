import { formatMoney } from "@/lib/format";
import { productImageUrl, variantLabel } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/ui/Badge";
import type { Availability, Product, ProductVariant } from "@/types";
import { Link } from "react-router-dom";
import { ShoppingBag, Wrench } from "lucide-react";
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
  const seller = product.sellers;
  const isService = product.listing_type === "service";

  return (
    <article className="product-card group flex h-full flex-col overflow-hidden rounded-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 sm:rounded-2xl lg:rounded-3xl">
      <Link
        to={href}
        className="product-card-media relative block aspect-square w-full overflow-hidden bg-black/30"
      >
        {isService ? (
          <span className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold sm:left-2 sm:top-2 sm:gap-1 sm:px-2 sm:py-1 sm:text-[11px] lg:left-3 lg:top-3 lg:px-2.5">
            <Wrench className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">{t("listingService")}</span>
          </span>
        ) : availability === "low_stock" ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-brand-grad px-1.5 py-0.5 text-[9px] font-bold sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[11px] lg:left-3 lg:top-3 lg:px-2.5">
            {t("lowStock")}
          </span>
        ) : availability === "preorder" ? (
          <span className="absolute left-1 top-1 z-10 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[11px] lg:left-3 lg:top-3 lg:px-2.5">
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
      <div className="flex flex-1 flex-col p-1.5 sm:p-3 lg:p-4">
        <Link to={href}>
          <h3 className="line-clamp-2 text-[11px] font-bold leading-snug sm:text-sm lg:text-base">{product.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-white/55 sm:mt-1 sm:text-sm">{label}</p>
        </Link>
        {seller?.shop_name ? (
          <Link
            to={`/vendor/${seller.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 line-clamp-1 text-[9px] font-medium text-white/45 transition hover:gradient-text sm:mt-2 sm:text-xs"
          >
            {t("soldBy")} {seller.shop_name}
          </Link>
        ) : null}
        {(colors.length > 0 || storages.length > 0) && (
          <p className="mt-1 hidden text-[11px] text-white/45 sm:mt-2 sm:block">
            {colors.length ? `${colors.length} ${t("coloursCount")}` : null}
            {colors.length && storages.length ? " · " : null}
            {storages.length ? `${storages.length} ${t("storagesCount")}` : null}
          </p>
        )}
        <div className="mt-1 scale-90 origin-left sm:mt-2 sm:scale-100">
          <AvailabilityBadge value={availability} />
        </div>
        <p className="mt-1.5 text-xs font-extrabold sm:mt-3 sm:text-lg lg:text-xl">{formatMoney(price)}</p>
        <div className="flex-1" />
        <Link
          to={href}
          className="mt-2 flex h-8 items-center justify-center gap-1 rounded-lg bg-brand-grad text-[10px] font-bold text-white transition hover:brightness-110 sm:mt-4 sm:h-11 sm:gap-2 sm:rounded-xl sm:text-sm"
        >
          <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" stroke="white" />
          <span className="truncate px-0.5">
            {availability === "preorder" || availability === "out_of_stock" ? t("viewPreorder") : t("chooseOptions")}
          </span>
        </Link>
      </div>
    </article>
  );
}
