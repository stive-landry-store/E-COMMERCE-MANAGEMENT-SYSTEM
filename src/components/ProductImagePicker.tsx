import { ImagePlus, Trash2, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/LanguageContext";

type Props = {
  images: string[];
  onChange: (urls: string[]) => void;
  onPickFiles: (files: File[]) => void | Promise<void>;
  uploading?: boolean;
  className?: string;
  label?: string;
};

function FilePickOverlay({
  onPickFiles,
  disabled,
  capture,
  multiple = true,
}: {
  onPickFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  capture?: boolean;
  multiple?: boolean;
}) {
  return (
    <input
      type="file"
      accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
      multiple={multiple}
      capture={capture ? "environment" : undefined}
      disabled={disabled}
      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length) void onPickFiles(files);
      }}
    />
  );
}

export function ProductImagePicker({
  images,
  onChange,
  onPickFiles,
  uploading,
  className,
  label,
}: Props) {
  const { t } = useI18n();
  const title = label ?? t("productImages");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="mb-0">{title}</label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-xl border border-dashed border-[#ff2d95]/50 bg-white px-3 py-2 text-sm font-bold text-ink-950">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5 text-[#ff2d95]" />}
            {uploading ? t("uploading") : t("addFromGallery")}
            <FilePickOverlay onPickFiles={onPickFiles} disabled={uploading} />
          </span>
          <span className="relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-xl border border-[#ff2d95]/40 bg-pink-50 px-3 py-2 text-sm font-bold text-ink-950">
            <Camera className="h-5 w-5 text-[#ff2d95]" />
            {t("takePhoto")}
            <FilePickOverlay onPickFiles={onPickFiles} disabled={uploading} capture multiple={false} />
          </span>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="relative flex min-h-[180px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-black/20 bg-white px-4 py-10 text-sm text-gray-700">
          <ImagePlus className="h-10 w-10 text-[#ff2d95]" />
          <span className="font-semibold">{t("tapToAddPhotos")}</span>
          <span className="text-center text-xs text-ink-700/55">{t("productPhotosHint")}</span>
          <FilePickOverlay onPickFiles={onPickFiles} disabled={uploading} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border border-black/10 bg-white">
              <img src={url} alt="" className="h-full w-full object-contain p-2" />
              <button
                type="button"
                title={t("remove")}
                onClick={() => onChange(images.filter((u) => u !== url))}
                className="absolute right-2 top-2 z-20 rounded-full bg-red-600 p-2 text-white opacity-90 shadow hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-dashed border-black/15 text-ink-700/50">
            <ImagePlus className="h-8 w-8 text-[#ff2d95]" />
            <span className="text-xs font-bold">{t("addMore")}</span>
            <FilePickOverlay onPickFiles={onPickFiles} disabled={uploading} />
          </div>
        </div>
      )}
    </div>
  );
}
