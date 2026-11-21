import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Re-mounts its children on route change with an enter animation. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className={cn("page-enter", className)}>
      {children}
    </div>
  );
}

/** Splits text into words that rise out of a mask one after another. */
export function SplitWords({
  text,
  className,
  wordClassName,
  delay = 0,
  step = 70,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  step?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={cn("split-words", className)} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span className="sw" aria-hidden>
            <span className={cn("sw-inner", wordClassName)} style={{ "--sw-delay": `${delay + i * step}ms` } as CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

/** Animated number that counts up when it scrolls into view. */
export function CountUp({
  value,
  format,
  duration = 1400,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const run = () => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setShown(value * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const rounded = Number.isInteger(value) ? Math.round(shown) : shown;
  return (
    <span ref={ref} className={className}>
      {format ? format(rounded) : Math.round(rounded).toLocaleString()}
    </span>
  );
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Big kinetic marquee whose speed and skew react to scroll velocity. */
export function KineticMarquee({ items, reverse = false, className }: { items: string[]; reverse?: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || reduced()) return;
    let x = 0;
    let lastY = window.scrollY;
    let vel = 0;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true));
    io.observe(el);
    const dir = reverse ? 1 : -1;
    const loop = () => {
      const y = window.scrollY;
      vel += (y - lastY - vel) * 0.12;
      lastY = y;
      if (visible) {
        const half = el.scrollWidth / 2 || 1;
        x += dir * (0.6 + Math.min(Math.abs(vel), 60) * 0.18);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        const skew = Math.max(-12, Math.min(12, vel * 0.35));
        el.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reverse]);

  const row = (
    <div className="kinetic-row" aria-hidden>
      {items.map((item, i) => (
        <span key={i} className={cn("kinetic-word", i % 2 === 1 && "is-outline")}>
          {item}
          <span className="kinetic-star">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("kinetic-marquee", className)} data-no-reveal>
      <div ref={track} className="kinetic-track is-js">
        {row}
        {row}
      </div>
    </div>
  );
}

/** Paragraph whose words light up one by one as it scrolls through the viewport. */
export function ScrollColorText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLElement>(".scw"));
    if (reduced()) {
      spans.forEach((s) => s.classList.add("is-lit"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("is-lit", i < lit));
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
  }, [text]);

  return (
    <p ref={ref} className={cn("scroll-color-text", className)} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="scw" aria-hidden>
            {w}
          </span>{" "}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Vertical scroll drives a horizontal track (desktop). On touch / small screens
 * it falls back to a native horizontal swipe row.
 */
export function HorizontalScroller({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover)");
    const sync = () => setPinned(mq.matches && !reduced());
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const o = outer.current;
    const t = track.current;
    if (!pinned || !o || !t) {
      if (o) o.style.height = "";
      if (t) t.style.transform = "";
      return;
    }
    let raf = 0;
    const measure = () => {
      const dist = Math.max(0, t.scrollWidth - window.innerWidth);
      o.style.height = `${window.innerHeight + dist}px`;
      return dist;
    };
    let dist = measure();
    const update = () => {
      raf = 0;
      const r = o.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(dist, 1)));
      t.style.transform = `translate3d(${-p * dist}px,0,0)`;
      o.style.setProperty("--hp", String(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      dist = measure();
      onScroll();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(t);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      o.style.height = "";
      t.style.transform = "";
    };
  }, [pinned]);

  return (
    <div ref={outer} className={cn("hscroll", pinned && "is-pinned", className)} data-no-reveal>
      <div className="hscroll-sticky">
        <div ref={track} className="hscroll-track">
          {children}
        </div>
        {pinned ? (
          <div className="hscroll-progress" aria-hidden>
            <span />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Pinned "scrollytelling": the visual stays while the steps scroll past. */
export function PinnedStory({
  kicker,
  title,
  steps,
}: {
  kicker: string;
  title: string;
  steps: { title: string; text: string; image: string }[];
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <section className="container-page py-16 md:py-24" data-no-reveal>
      <p className="section-index">
        <b>✦</b> — {kicker}
      </p>
      <h2 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h2>
      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="story-visual-wrap">
          <div className="story-visual">
            {steps.map((s, i) => (
              <img
                key={s.image}
                src={s.image}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn("story-img", i === active && "is-active")}
              />
            ))}
            <span className="story-count">
              0{active + 1}
              <small>/0{steps.length}</small>
            </span>
            <span className="story-bar" style={{ transform: `scaleX(${(active + 1) / steps.length})` }} />
          </div>
        </div>
        <div>
          {steps.map((s, i) => (
            <div
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className={cn("story-step", i === active && "is-active")}
            >
              <span className="story-step-index">0{i + 1}</span>
              <h3 className="mt-3 text-3xl font-bold sm:text-4xl">{s.title}</h3>
              <p className="mt-4 max-w-md text-lg text-white/60">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Pointer + scroll driven 3D tilt. */
export function Tilt3D({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      const sy = Math.min(window.scrollY, 900) * 0.04;
      el.style.transform = `perspective(1000px) rotateY(${cx * 14 + sy}deg) rotateX(${-cy * 12}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <div ref={ref} className={cn("tilt-3d", className)}>
      {children}
    </div>
  );
}

/** Types its text out (with a blinking caret) once it scrolls into view. */
export function Typewriter({
  text,
  className,
  speed = 28,
  delay = 0,
}: {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      setCount(text.length);
      return;
    }
    let timer = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      let i = 0;
      const tick = () => {
        i += 1;
        setCount(i);
        if (i < text.length) timer = window.setTimeout(tick, speed);
      };
      timer = window.setTimeout(tick, delay);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [text, speed, delay]);

  return (
    <span ref={ref} className={cn("typewriter", className)} aria-label={text}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <i className={cn("typewriter-caret", count >= text.length && "is-done")} aria-hidden />
      {/* reserve the final size so the layout doesn't jump */}
      <span className="typewriter-ghost" aria-hidden>
        {text.slice(count)}
      </span>
    </span>
  );
}
