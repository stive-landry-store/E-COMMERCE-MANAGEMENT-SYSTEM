import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { onProductThumbError, productThumbUrl, variantLabel } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import { AvailabilityBadge } from "@/components/ui/Badge";
import { haptic } from "@/lib/feedback";
import type { Product, ProductVariant } from "@/types";

type Item = {
  product: Product;
  variant?: ProductVariant;
  availability?: string;
};

const FLY_MS = 420;
const AUTOPLAY_MS = 4500;

/**
 * "Three-leaf clover" deck: one card in front, the previous and next ones fanned
 * out left and right behind it. Drag / swipe the front card left or right — it
 * follows the finger, flies off, and the deck springs into its new shape.
 */
export function FeaturedStack({ items }: { items: Item[] }) {
  const { t } = useI18n();
  const n = items.length;
  const [active, setActive] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fly, setFly] = useState<-1 | 1 | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const lastTouch = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const width = useRef(320);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (n < 2 || fly) return;
      setFly(dir);
      void haptic("light");
      window.setTimeout(() => {
        setActive((i) => (i + dir + n) % n);
        setFly(null);
        setDx(0);
      }, FLY_MS);
    },
    [fly, n],
  );

  // Gentle autoplay, paused right after any interaction
  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (Date.now() - lastTouch.current < 8000 || dragging || document.hidden) return;
      go(1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [n, go, dragging]);

  if (n === 0) return null;

  function onDown(e: RPointerEvent<HTMLDivElement>) {
    if (fly || n < 2) return;
    lastTouch.current = Date.now();
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
    width.current = stage.current?.clientWidth ?? 320;
  }

  function onMove(e: RPointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    const y = e.clientY - s.y;
    if (!moved.current) {
      if (Math.abs(x) < 8) return;
      if (Math.abs(y) > Math.abs(x)) {
        start.current = null; // vertical scroll wins
        return;
      }
      moved.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDx(x);
  }

  function onUp() {
    const wasDrag = moved.current;
    start.current = null;
    setDragging(false);
    lastTouch.current = Date.now();
    if (!wasDrag) return;
    const threshold = Math.min(110, width.current * 0.22);
    if (dx < -threshold) go(1);
    else if (dx > threshold) go(-1);
    else setDx(0);
  }

  const progress = Math.max(-1, Math.min(1, dx / 220));

  return (
    <div className="clover">
      <div
        ref={stage}
        className={`clover-stage${dragging ? " is-dragging" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        data-cursor="drag"
      >
        {items.map((item, idx) => {
          const depth = (idx - active + n) % n;
          const slot = depth === 0 ? 0 : depth === 1 ? 1 : depth === n - 1 ? -1 : 2; // 0 front, 1 right leaf, -1 left leaf, 2 hidden
          const { product, variant } = item;
          const image = productThumbUrl(variant?.image_urls?.[0], product.slug);
          const price = variant?.price ?? product.base_price;
          const href = `/product/${product.slug}${variant ? `?v=${variant.id}` : ""}`;

          let x = 0;
          let y = 0;
          let r = 0;
          let s = 1;
          let o = 1;
          let z = 3;
          if (slot === 0) {
            x = fly ? fly * -160 : dx;
            r = fly ? fly * -24 : dx * 0.06;
            y = fly ? -20 : Math.abs(dx) * -0.05;
            o = fly ? 0 : 1;
            z = 4;
          } else if (slot === 1 || slot === -1) {
            // Leaves drift toward the centre as the front card is dragged / flies away
            const pull = fly ? (fly === slot ? 1 : 0) : Math.max(0, -progress * slot);
            x = slot * (26 - 26 * pull);
            y = 18 - 18 * pull;
            r = slot * (11 - 11 * pull);
            s = 0.88 + 0.12 * pull;
            z = fly === slot ? 3 : 2;
          } else {
            s = 0.8;
            o = 0;
            z = 1;
          }

          const style = {
            "--x": slot === 0 ? `${x}px` : `${x}%`,
            "--y": `${y}px`,
            "--r": `${r}deg`,
            "--s": s,
            opacity: o,
            zIndex: z,
          } as CSSProperties;

          return (
            <article
              key={product.id}
              className={`clover-card clover-slot-${slot === -1 ? "l" : slot === 1 ? "r" : slot === 0 ? "f" : "h"}`}
              style={style}
              aria-hidden={slot !== 0}
              onClick={(e) => {
                if (moved.current) {
                  e.preventDefault();
                  return;
                }
                if (slot === 1) go(1);
                if (slot === -1) go(-1);
              }}
            >
              <div className="stackedflow-card-face">
                <Link
                  to={href}
                  className="stackedflow-media block"
                  tabIndex={slot === 0 ? 0 : -1}
                  onClick={(e) => {
                    if (moved.current || slot !== 0) e.preventDefault();
                  }}
                  draggable={false}
                >
                  <img
                    src={image}
                    alt={product.name}
                    draggable={false}
                    loading={slot === 2 ? "lazy" : "eager"}
                    decoding="async"
                    onError={(e) => onProductThumbError(e, variant?.image_urls?.[0], product.slug)}
                  />
                </Link>
                <div className="stackedflow-body">
                  <div className="flex items-center justify-between gap-2">
                    <p className="stackedflow-kicker">{t("featured")}</p>
                    <AvailabilityBadge value={item.availability} />
                  </div>
                  <h3>{product.name}</h3>
                  <p className="stackedflow-meta">{variant ? variantLabel(variant) : product.name}</p>
                  <p className="stackedflow-price">{formatMoney(price)}</p>
                  <Link
                    to={href}
                    className="stackedflow-cta"
                    tabIndex={slot === 0 ? 0 : -1}
                    onClick={(e) => {
                      if (moved.current || slot !== 0) e.preventDefault();
                    }}
                    draggable={false}
                  >
                    <ShoppingBag className="h-4 w-4" stroke="white" />
                    {item.availability === "preorder" || item.availability === "out_of_stock"
                      ? t("viewPreorder")
                      : t("chooseOptions")}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="stackedflow-controls">
        <button type="button" className="stackedflow-nav grid place-items-center" onClick={() => go(-1)} aria-label={t("previous")} disabled={n < 2}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="stackedflow-dots" aria-hidden>
          {items.map((it, i) => (
            <span key={it.product.id} className={`stackedflow-dot${i === active ? " is-active" : ""}`} />
          ))}
        </div>
        <button type="button" className="stackedflow-nav grid place-items-center" onClick={() => go(1)} aria-label={t("next")} disabled={n < 2}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="stackedflow-hint">{t("stackedflowHint")}</p>
    </div>
  );
}
