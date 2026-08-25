import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useI18n } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Props = {
  reference: string;
  onReferenceChange: (v: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  className?: string;
  disabled?: boolean;
};

export function PaymentProofForm({
  reference,
  onReferenceChange,
  file,
  onFileChange,
  className,
  disabled,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pickFile(f: File | null) {
    onFileChange(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-sm font-semibold text-white">{t("paymentProofTitle")}</p>
        <p className="mt-1 text-xs text-white/50">{t("paymentProofHint")}</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-white/45">{t("transactionReference")}</label>
        <input
          required
          minLength={4}
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder={t("transactionReferencePlaceholder")}
          disabled={disabled}
          className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white placeholder:text-white/30"
        />
        <p className="mt-1 text-[11px] text-white/40">{t("transactionReferenceHint")}</p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-white/45">{t("paymentScreenshot")}</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        {!preview ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 transition hover:border-[#ff2d95]/50 hover:bg-white/5"
          >
            <ImagePlus className="h-8 w-8 text-[#ff2d95]" />
            <span className="text-sm font-semibold text-white">{t("uploadPaymentScreenshot")}</span>
            <span className="text-xs text-white/45">{t("uploadPaymentScreenshotHint")}</span>
          </button>
        ) : (
          <div className="relative mt-1.5 overflow-hidden rounded-2xl border border-white/15 bg-black/40">
            <img src={preview} alt="" className="max-h-56 w-full object-contain" />
            <button
              type="button"
              disabled={disabled}
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
              onClick={() => pickFile(null)}
              aria-label={t("remove")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
