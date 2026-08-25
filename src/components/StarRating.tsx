import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md" | "lg";
  /** Allow choosing 0 (very poor) */
  allowZero?: boolean;
  className?: string;
  readOnly?: boolean;
};

const sizeClass = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

/** Interactive or display stars. 5 = excellent, 0 = very poor. */
export function StarRating({ value, onChange, size = "md", allowZero = true, className, readOnly }: Props) {
  const interactive = Boolean(onChange) && !readOnly;
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1", className)} role={interactive ? "radiogroup" : "img"} aria-label={`${value} of 5 stars`}>
      {allowZero && interactive ? (
        <button
          type="button"
          className={cn("rounded-lg px-2 py-1 text-xs font-bold", value === 0 ? "bg-white/15 text-white" : "text-white/45 hover:text-white")}
          onClick={() => onChange?.(0)}
          aria-label="0 stars — very poor"
        >
          0
        </button>
      ) : null}
      {stars.map((n) => {
        const filled = n <= value;
        const cls = cn(
          sizeClass[size],
          "leading-none transition",
          filled ? "text-amber-400" : "text-white/25",
          interactive && "hover:scale-110",
        );
        if (!interactive) {
          return (
            <span key={n} className={cls} aria-hidden>
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            className={cls}
            onClick={() => onChange?.(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-checked={value === n}
            role="radio"
          >
            ★
          </button>
        );
      })}
      <span className="ml-1 text-xs font-semibold text-white/55">{value}/5</span>
    </div>
  );
}
