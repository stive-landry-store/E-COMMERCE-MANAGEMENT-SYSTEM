import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * FLIP list animation: children marked with [data-flip-key] glide from their
 * previous position to the new one, new ones pop in, whenever `deps` change.
 */
export function useFlip(container: RefObject<HTMLElement | null>, deps: unknown[]) {
  const prev = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = root.getBoundingClientRect();
    const next = new Map<string, DOMRect>();
    const items = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-flip-key]"));
    let popIndex = 0;

    for (const el of items) {
      const key = el.dataset.flipKey!;
      const r = el.getBoundingClientRect();
      const rel = new DOMRect(r.left - base.left, r.top - base.top, r.width, r.height);
      next.set(key, rel);
      if (reduce || typeof el.animate !== "function") continue;
      const old = prev.current.get(key);
      if (old) {
        const dx = old.left - rel.left;
        const dy = old.top - rel.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
            duration: 650,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          });
        }
      } else if (prev.current.size > 0 || (popIndex < 12 && rel.top < window.innerHeight)) {
        el.animate(
          [
            { opacity: 0, scale: "0.92", translate: "0 18px" },
            { opacity: 1, scale: "1", translate: "0 0" },
          ],
          { duration: 600, delay: Math.min(popIndex++, 10) * 35, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
        );
      }
    }
    prev.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
