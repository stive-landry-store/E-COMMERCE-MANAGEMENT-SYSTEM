import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "dark" | "light" | "auto";
  className?: string;
};

export function ThemeToggle({ variant = "auto", className }: Props) {
  const { t } = useI18n();
  const { theme, toggleTheme, isDark } = useTheme();
  const look = variant === "auto" ? (isDark ? "dark" : "light") : variant;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? t("switchToDayMode") : t("switchToNightMode")}
      aria-label={theme === "dark" ? t("switchToDayMode") : t("switchToNightMode")}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
        look === "dark"
          ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
          : "border-black/10 bg-white text-ink-900 shadow-sm hover:bg-black/[0.04]",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4.5 w-4.5 h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
