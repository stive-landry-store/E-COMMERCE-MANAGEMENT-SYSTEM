import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { onProductImageError, productImageUrl, variantLabel } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import type { Product, ProductVariant } from "@/types";

type Item = {
  product: Product;
  variant?: ProductVariant;
  availability?: string;
};

type Props = {
  items: Item[];
};

const VISIBLE = 4;

export function FeaturedStack({ items }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = items.length;

  const advance = useCallback(
    (dir: 1 | -1 = 1) => {
      if (n < 2 || busy) return;
      setBusy(true);
      setExiting(dir === 1 ? "left" : "right");
      window.setTimeout(() => {
        setActive((i) => (i + dir + n) % n);
        setExiting(null);
        setBusy(false);
      }, 480);
    },
    [busy, n],
  );

  if (n === 0) return null;

  const ordered = Array.from({ length: Math.min(VISIBLE, n) }, (_, depth) => {
    const idx = (active + depth) % n;
    return { item: items[idx], depth, idx };
  });

  return (
    <div className="stackedflow">
      <div
        className={`stackedflow-stage${hovered ? " is-spread" : ""}${exiting ? ` is-exit-${exiting}` : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) < 48) return;
          advance(dx < 0 ? 1 : -1);
        }}
      >
        {[...ordered].reverse().map(({ item, depth }) => {
          const { product, variant } = item;
          const image = productImageUrl(variant?.image_urls?.[0], product.slug);
          const price = variant?.price ?? product.base_price;
          const label = variant ? variantLabel(variant) : product.name;
          const href = `/product/${product.slug}${variant ? `?v=${variant.id}` : ""}`;
          const isFront = depth === 0;

          return (
            <article
              key={product.id}
              className={`stackedflow-card stackedflow-card--d${depth}${isFront && exiting ? ` stackedflow-card--exit-${exiting}` : ""}`}
              style={{ zIndex: VISIBLE - depth }}
              onClick={() => advance(1)}
              role="button"
              tabIndex={isFront ? 0 : -1}
              aria-label={product.name}
              onKeyDown={(e) => {
                if (!isFront) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  advance(1);
                }
              }}
            >
              <div className="stackedflow-card-face">
                <div className="stackedflow-media">
                  <img
                    src={image}
                    alt={product.name}
                    draggable={false}
                    loading={isFront ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={isFront ? "high" : "auto"}
                    onError={(e) => onProductImageError(e, variant?.image_urls?.[0], product.slug)}
                  />
                </div>
                <div className="stackedflow-body">
                  <p className="stackedflow-kicker">{t("featured")}</p>
                  <h3>{product.name}</h3>
                  <p className="stackedflow-meta">{label}</p>
                  <p className="stackedflow-price">{formatMoney(price)}</p>
                  {isFront ? (
                    <Link
                      to={href}
                      className="stackedflow-cta"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ShoppingBag className="h-4 w-4" stroke="white" />
                      {item.availability === "preorder" || item.availability === "out_of_stock"
                        ? t("viewPreorder")
                        : t("chooseOptions")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="stackedflow-controls">
        <button type="button" className="stackedflow-nav" onClick={() => advance(-1)} aria-label={t("previous")} disabled={n < 2 || busy}>
          ‹
        </button>
        <div className="stackedflow-dots" role="tablist" aria-label={t("featured")}>
          {items.map((it, i) => (
            <button
              key={it.product.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`stackedflow-dot${i === active ? " is-active" : ""}`}
              onClick={() => {
                if (busy || i === active) return;
                setActive(i);
              }}
            />
          ))}
        </div>
        <button type="button" className="stackedflow-nav" onClick={() => advance(1)} aria-label={t("next")} disabled={n < 2 || busy}>
          ›
        </button>
      </div>
      <p className="stackedflow-hint">{t("stackedflowHint")}</p>
    </div>
  );
}
