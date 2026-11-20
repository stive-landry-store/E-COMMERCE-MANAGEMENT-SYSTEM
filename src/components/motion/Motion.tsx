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

/** Big kinetic marquee strip. */
export function KineticMarquee({ items, reverse = false, className }: { items: string[]; reverse?: boolean; className?: string }) {
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
    <div className={cn("kinetic-marquee", reverse && "is-reverse", className)} data-no-reveal>
      <div className="kinetic-track">
        {row}
        {row}
      </div>
    </div>
  );
}
