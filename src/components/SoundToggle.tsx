import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { setUiSoundsEnabled, uiSound, uiSoundsEnabled } from "@/lib/feedback";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const [on, setOn] = useState(uiSoundsEnabled);

  useEffect(() => {
    const sync = () => setOn(uiSoundsEnabled());
    window.addEventListener("sls-ui-sounds", sync);
    return () => window.removeEventListener("sls-ui-sounds", sync);
  }, []);

  return (
    <button
      type="button"
      aria-pressed={on}
      title={t("uiSounds")}
      aria-label={t("uiSounds")}
      onClick={() => {
        setUiSoundsEnabled(!on);
        if (!on) uiSound("success", true);
      }}
      className={cn(
        "theme-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/15",
        on && "border-[#ff2d95]/60 text-[#ff2d95]",
        className,
      )}
    >
      {on ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
    </button>
  );
}
