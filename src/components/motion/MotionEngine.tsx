import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/contexts/LanguageContext";
import { haptic, uiSound } from "@/lib/feedback";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

/**
 * Site-wide motion layer:
 *  - Lenis smooth scrolling (desktop / fine pointer, storefront only)
 *  - Scroll-triggered reveals (auto-tagged + [data-reveal])
 *  - Scroll progress bar, custom cursor, magnetic buttons, card spotlight
 *  - Route change: scroll to top + curtain wipe
 */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const AUTO_REVEAL = [
  "[data-reveal]",
  ".store-shell main section",
  ".store-shell main .product-card",
  ".store-shell main .glass",
  ".store-shell main .surface",
  ".store-shell footer .container-page > div",
  ".console-page > *",
  ".console-app .surface",
].join(",");

let lenisInstance: Lenis | null = null;

export function getLenis() {
  return lenisInstance;
}

function useRevealObserver(pathname: string) {
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;

    let batch: HTMLElement[] = [];
    let raf = 0;

    const flush = () => {
      raf = 0;
      batch
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.top - rb.top || ra.left - rb.left;
        })
        .forEach((el, i) => {
          el.style.setProperty("--rv-delay", `${Math.min(i, 8) * 70}ms`);
          el.classList.add("rv-in");
        });
      batch = [];
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          batch.push(el);
        }
        if (batch.length && !raf) raf = requestAnimationFrame(flush);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const onEnd = (e: AnimationEvent) => {
      const el = e.target as HTMLElement;
      if (e.animationName === "rv-in" && el.classList.contains("rv-in")) {
        el.classList.remove("rv", "rv-in");
        el.classList.add("rv-done");
        el.style.removeProperty("--rv-delay");
      }
    };
    document.addEventListener("animationend", onEnd);

    const observed = new WeakSet<Element>();
    const tag = (root: ParentNode) => {
      const nodes = root.querySelectorAll<HTMLElement>(AUTO_REVEAL);
      nodes.forEach((el) => {
        if (observed.has(el) || el.classList.contains("rv-done") || el.classList.contains("rv-in")) return;
        if (!el.classList.contains("rv")) {
          if (el.closest("[data-no-reveal]")) return;
          if (/\banimate-/.test(el.className)) return;
          // Don't double-animate children of something still revealing
          if (el.parentElement?.closest(".rv")) return;
          el.classList.add("rv");
        }
        observed.add(el);
        io.observe(el);
      });
    };

    tag(document);
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        tag(document);
      }, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (pending) clearTimeout(pending);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("animationend", onEnd);
    };
  }, [pathname]);
}

function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion() || !finePointer()) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      allowNestedScroll: true,
      autoRaf: true,
      prevent: (node) => !!node.closest?.("[data-lenis-prevent], [role='dialog'], .fixed"),
    });
    lenisInstance = lenis;
    document.documentElement.classList.add("lenis-on");

    // Stop smooth scroll while a menu/modal locks the body
    const sync = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      mo.disconnect();
      lenis.destroy();
      lenisInstance = null;
      document.documentElement.classList.remove("lenis-on");
    };
  }, [enabled]);
}

function useScrollProgress(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${p})`;
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}

function usePointerFx(enabled: boolean, cursorLabels: Record<string, string>) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion() || !finePointer()) return;
    const dot = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    const label = ring?.querySelector<HTMLElement>("span") ?? null;
    document.documentElement.classList.add("has-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let magnet: HTMLElement | null = null;

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      document.documentElement.classList.add("cursor-visible");
      const target = e.target as HTMLElement | null;

      // Hover state for the ring
      const interactive = target?.closest?.("a, button, [role='button'], input, select, textarea, label");
      ring?.classList.toggle("is-hover", !!interactive);
      const labelled = target?.closest?.<HTMLElement>("[data-cursor], .product-card-media");
      const kind = labelled ? labelled.dataset.cursor || "view" : "";
      ring?.classList.toggle("is-view", !!labelled);
      if (label && kind && label.dataset.kind !== kind) {
        label.dataset.kind = kind;
        label.textContent = cursorLabels[kind] ?? kind;
      }

      // Spotlight on cards
      const card = target?.closest?.<HTMLElement>(".product-card, .glass, .surface, .spotlight");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      // Magnetic buttons
      const m = target?.closest?.<HTMLElement>("[data-magnetic], .store-shell .ui-btn[data-variant='gold']");
      if (m !== magnet) {
        if (magnet) magnet.style.translate = "";
        magnet = m ?? null;
      }
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        magnet.style.translate = `${dx}px ${dy}px`;
      }
    };
    const onLeave = () => document.documentElement.classList.remove("cursor-visible");
    const onDown = () => ring?.classList.add("is-down");
    const onUp = () => ring?.classList.remove("is-down");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      if (magnet) magnet.style.translate = "";
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.classList.remove("has-cursor", "cursor-visible");
    };
  }, [enabled, cursorLabels]);
}

function useRouteCurtain(pathname: string, enabled: boolean) {
  const first = useRef(true);
  useEffect(() => {
    // Always start new pages at the top
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((el) => (el.scrollTop = 0));

    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled || prefersReducedMotion()) return;
    // Product pages morph in with a view transition instead of the curtain
    if (pathname.startsWith("/product/") && "startViewTransition" in document) return;
    const curtain = document.getElementById("route-curtain");
    if (!curtain) return;
    curtain.classList.remove("is-playing");
    void curtain.offsetWidth;
    curtain.classList.add("is-playing");
    const id = window.setTimeout(() => curtain.classList.remove("is-playing"), 1100);
    return () => clearTimeout(id);
  }, [pathname, enabled]);
}

/** Tiny haptic + click sound on buttons (mobile vibration / native app, sounds only if enabled). */
function useTapFeedback() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("button, .ui-btn, a[data-cart-target]");
      if (!el || (el as HTMLButtonElement).disabled) return;
      uiSound("tap");
      if (e.pointerType !== "mouse") void haptic("light");
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
}

export function MotionEngine() {
  const { pathname } = useLocation();
  const isDesk = pathname.startsWith("/console") || pathname.startsWith("/seller");
  const store = !isDesk;

  useSmoothScroll(store);
  useRevealObserver(pathname);
  useScrollProgress(store);
  const { t } = useI18n();
  const cursorLabels = useMemo(
    () => ({ view: t("cursorView"), drag: t("cursorDrag"), add: t("cursorAdd"), open: t("cursorOpen") }),
    [t],
  );
  usePointerFx(store, cursorLabels);
  useTapFeedback();
  useRouteCurtain(pathname, store);

  return (
    <>
      {store ? <div id="scroll-progress" aria-hidden /> : null}
      {store ? (
        <div id="route-curtain" aria-hidden>
          <div className="route-curtain-panel route-curtain-a" />
          <div className="route-curtain-panel route-curtain-b">
            <img src="/logo.webp" alt="" width={72} height={72} />
          </div>
        </div>
      ) : null}
      {store ? (
        <>
          <div id="cursor-ring" aria-hidden>
            <span>View</span>
          </div>
          <div id="cursor-dot" aria-hidden />
        </>
      ) : null}
    </>
  );
}
