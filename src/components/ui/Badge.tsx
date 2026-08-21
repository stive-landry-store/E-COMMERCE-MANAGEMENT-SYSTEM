import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";
import type { Availability } from "@/types";

export function AvailabilityBadge({ value }: { value?: Availability | string | null }) {
  const { t } = useI18n();
  const label =
    value === "in_stock"
      ? t("inStock")
      : value === "low_stock"
        ? t("lowStock")
        : value === "out_of_stock"
          ? t("outOfStock")
          : value === "preorder"
            ? t("preorder")
            : t("loading");

  return (
    <span
      className={cn(
        "availability-badge inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        value === "in_stock" && "bg-gradient-to-r from-[#ff7a45]/25 via-[#ff2d95]/25 to-[#c026d3]/25 text-[#ffb4d4] ring-1 ring-[#ff2d95]/60",
        value === "low_stock" && "bg-[#ff7a45]/20 text-[#ffb08a] ring-1 ring-[#ff7a45]/50",
        value === "out_of_stock" && "bg-black/10 text-current/60",
        value === "preorder" && "bg-[#c026d3]/20 text-[#e9b3ff] ring-1 ring-[#c026d3]/50",
        !value && "bg-black/10 text-current/60",
      )}
    >
      {label}
    </span>
  );
}

export function StatusPill({ value }: { value: string }) {
  return (
    <span className="status-pill inline-flex rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-semibold capitalize text-current">
      {value.replaceAll("_", " ")}
    </span>
  );
}
