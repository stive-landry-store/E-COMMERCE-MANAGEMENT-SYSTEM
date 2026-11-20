import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { onProductImageError, productImageUrl, cn } from "@/lib/utils";

type Props = {
  urls: string[];
  slug: string;
  alt: string;
  index: number;
  onIndexChange: (i: number) => void;
};

/**
 * Swipe / drag gallery with inertia (native scroll-snap), hover zoom that follows
 * the cursor, and a shared-element name so the card image morphs into it.
 */
export function ProductGallery({ urls, slug, alt, index, onIndexChange }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState<{ i: number; x: number; y: number } | null>(null);
  const slides = urls.length ? urls : [""];

  // Keep the scroll position in sync when a thumbnail is clicked
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) el.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    if (i !== index) onIndexChange(i);
  }

  function onPointerDown(e: RPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || slides.length < 2) return;
    drag.current = { x: e.clientX, left: track.current!.scrollLeft, moved: false };
    track.current!.classList.add("is-dragging");
  }

  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      track.current!.scrollLeft = d.left - dx;
      setZoom(null);
      return;
    }
    if (e.pointerType !== "mouse") return;
    const img = (e.target as HTMLElement).closest("[data-slide]") as HTMLElement | null;
    if (!img) return;
    const r = img.getBoundingClientRect();
    setZoom({ i: Number(img.dataset.slide), x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  function endDrag() {
    const el = track.current;
    const d = drag.current;
    drag.current = null;
    if (!el || !d) return;
    el.classList.remove("is-dragging");
    const i = Math.round(el.scrollLeft / el.clientWidth);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    onIndexChange(Math.max(0, Math.min(slides.length - 1, i)));
  }

  return (
    <div>
      <div
        ref={track}
        className="gallery-track"
        data-cursor={slides.length > 1 ? "drag" : "view"}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag();
          setZoom(null);
        }}
      >
        {slides.map((url, i) => (
          <div key={`${url}-${i}`} className="gallery-slide" data-slide={i}>
            <img
              src={productImageUrl(url, slug)}
              alt={i === 0 ? alt : ""}
              draggable={false}
              data-product-hero={i === index ? "" : undefined}
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={cn("gallery-img", zoom?.i === i && "is-zoomed")}
              style={{
                viewTransitionName: i === index ? "product-hero" : undefined,
                transformOrigin: zoom?.i === i ? `${zoom.x}% ${zoom.y}%` : undefined,
              }}
              onError={(e) => onProductImageError(e, url, slug)}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {slides.map((_, i) => (
              <span key={i} className={cn("gallery-dot", i === index && "is-active")} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {slides.map((url, i) => (
              <button
                key={`${url}-t${i}`}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`${alt} ${i + 1}`}
                className={cn(
                  "h-16 w-16 overflow-hidden rounded-xl border bg-black/20 p-1 transition duration-300 hover:-translate-y-0.5",
                  i === index ? "border-[#ff2d95] shadow-glow" : "border-white/10 hover:border-white/30",
                )}
              >
                <img
                  src={productImageUrl(url, slug)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                  onError={(e) => onProductImageError(e, url, slug)}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
