import { useRef } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  onChange: (urls: string[]) => void;
  onPickFiles: (files: File[]) => void | Promise<void>;
  uploading?: boolean;
  className?: string;
  label?: string;
};

export function ProductImagePicker({ images, onChange, onPickFiles, uploading, className, label = "Product images" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="mb-0">{label}</label>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#ff2d95]/50 bg-white px-3 py-2 text-sm font-bold text-ink-950 transition hover:border-[#ff2d95] hover:bg-pink-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5 text-[#ff2d95]" />}
          {uploading ? "Uploading…" : "Add images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void onPickFiles(files);
          }}
        />
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 bg-white px-4 py-10 text-sm text-gray-700 transition hover:border-[#ff2d95]/50 hover:text-ink-950"
        >
          <ImagePlus className="h-10 w-10 text-[#ff2d95]" />
          <span className="font-semibold">Click to add product photos</span>
          <span className="text-xs">PNG, JPG up to 5 MB each</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border border-black/10 bg-white">
              <img src={url} alt="" className="h-full w-full object-contain p-2" />
              <button
                type="button"
                title="Remove image"
                onClick={() => onChange(images.filter((u) => u !== url))}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-90 shadow hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-black/15 text-ink-700/50 transition hover:border-[#ff2d95]/50 hover:text-ink-900"
          >
            <ImagePlus className="h-8 w-8 text-[#ff2d95]" />
            <span className="text-xs font-bold">Add more</span>
          </button>
        </div>
      )}
    </div>
  );
}
