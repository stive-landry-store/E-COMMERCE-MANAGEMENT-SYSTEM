import { Languages } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Lang } from "@/i18n/translations";

type Props = {
  variant?: "dark" | "light";
  className?: string;
};

export function LanguageSwitcher({ variant = "dark", className }: Props) {
  const { lang, setLang, t } = useI18n();
  const options: { id: Lang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "fr", label: "FR" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-1",
        variant === "dark" ? "border-white/20 bg-white/10" : "border-black/10 bg-white shadow-sm",
        className,
      )}
      role="group"
      aria-label={t("language")}
    >
      <Languages className={cn("ml-1 h-3.5 w-3.5", variant === "dark" ? "text-white/70" : "text-ink-700/70")} />
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLang(opt.id)}
          aria-pressed={lang === opt.id}
          title={opt.id === "en" ? t("english") : t("french")}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide transition",
            lang === opt.id
              ? "bg-brand-grad text-white shadow"
              : variant === "dark"
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-ink-700/70 hover:bg-black/5 hover:text-ink-900",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
