import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** Smooth area chart that draws itself in when visible. */
export function AreaSpark({ values, className }: { values: number[]; className?: string }) {
  const [ref, seen] = useInView<SVGSVGElement>();
  const id = useId().replace(/:/g, "");
  const w = 600;
  const h = 160;
  const pts = values.length ? values : [0, 0];
  const max = Math.max(...pts, 1);
  const step = w / Math.max(pts.length - 1, 1);
  const xy = pts.map((v, i) => [i * step, h - 8 - (v / max) * (h - 24)] as const);
  const line = xy.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = xy[i - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("chart-svg", seen && "is-in", className)}>
      <defs>
        <linearGradient id={`l${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#ff7a45" />
          <stop offset="50%" stopColor="#ff2d95" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
        <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff2d95" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff2d95" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} className="chart-grid" />
      ))}
      <path d={area} fill={`url(#a${id})`} className="chart-area" />
      <path d={line} fill="none" stroke={`url(#l${id})`} strokeWidth="3" strokeLinecap="round" pathLength={1} className="chart-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Circular gauge (0..1) that sweeps to its value. */
export function RingGauge({ value, className }: { value: number; className?: string }) {
  const [ref, seen] = useInView<SVGSVGElement>();
  const id = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg ref={ref} viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#ff7a45" />
            <stop offset="60%" stopColor="#ff2d95" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: seen ? 1 - v : 1 }}
          className="ring-value"
        />
      </svg>
      <span className="font-display text-3xl font-bold">{Math.round(v * 100)}%</span>
    </div>
  );
}
