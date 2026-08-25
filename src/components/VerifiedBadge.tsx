import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
};

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-[1.125rem] w-[1.125rem]",
  lg: "h-6 w-6",
} as const;

/** Facebook-style: solid blue circle + clear white checkmark. */
export function VerifiedBadge({ className, size = "md", withLabel = false }: Props) {
  const { t } = useI18n();
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 align-middle", className)}
      title={t("verifiedAccount")}
      aria-label={t("verifiedAccount")}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(sizeMap[size], "block shrink-0 overflow-visible")}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M16.707 8.293a1 1 0 0 1 0 1.414l-5.5 5.5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 1 1 1.414-1.414L10.5 13.086l4.793-4.793a1 1 0 0 1 1.414 0z"
          clipRule="evenodd"
        />
      </svg>
      {withLabel ? <span className="text-xs font-semibold text-[#1877F2]">{t("verified")}</span> : null}
    </span>
  );
}
