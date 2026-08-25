import { useEffect, useState } from "react";
import { Check, ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { uploadProductImages } from "@/lib/upload";
import { formatMoney } from "@/lib/format";
import { onProductImageError, productImageUrl } from "@/lib/utils";

type PhotoCellProps = {
  url?: string | null;
  urls?: string[] | null;
  productId?: string | null;
  variantId?: string | null;
  alt: string;
  onSaved?: (nextUrls?: string[]) => void;
};

export function ProductPhotoCell({ url, urls, productId, variantId, alt, onSaved }: PhotoCellProps) {
  const [busy, setBusy] = useState(false);
  const count = urls?.length ?? (url ? 1 : 0);

  async function addPhotos(files: File[]) {
    if (!variantId && !productId) {
      toast.error("Add a variant before setting a photo");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadProductImages(files);
      let prev = urls ?? (url ? [url] : []);
      if (variantId) {
        const { data } = await supabase.from("product_variants").select("image_urls").eq("id", variantId).single();
        prev = (data?.image_urls as string[] | null) ?? prev;
      } else if (productId) {
        const { data } = await supabase
          .from("product_variants")
          .select("image_urls")
          .eq("product_id", productId)
          .limit(1)
          .maybeSingle();
        prev = (data?.image_urls as string[] | null) ?? prev;
      }
      const next = [...prev, ...uploaded.filter((u) => !prev.includes(u))];
      const query = supabase.from("product_variants").update({ image_urls: next });
      const { error } = productId ? await query.eq("product_id", productId) : await query.eq("id", variantId!);
      if (error) throw error;
      toast.success(uploaded.length > 1 ? `${uploaded.length} photos added` : "Photo added");
      onSaved?.(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
      {url ? (
        <img
          src={productImageUrl(url)}
          alt={alt}
          className="h-full w-full object-contain p-1"
          onError={(e) => onProductImageError(e, url)}
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-ink-700/40">
          <ImagePlus className="h-5 w-5" />
        </span>
      )}
      {count > 1 ? (
        <span className="absolute bottom-0.5 right-0.5 z-20 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
          {count}
        </span>
      ) : null}
      {busy ? (
        <span className="absolute inset-0 grid place-items-center bg-black/55">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </span>
      ) : (
        <input
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
          multiple
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          title="Add photos"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void addPhotos(files);
          }}
        />
      )}
    </div>
  );
}

type PriceCellProps = {
  value: number;
  onSave: (next: number) => Promise<void>;
  hint?: string;
};

export function EditablePriceCell({ value, onSave, hint }: PriceCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  async function commit() {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) {
      toast.error("Enter a valid price in FCFA");
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(next);
      toast.success("Price updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save price");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        title={hint ?? "Click to change the price"}
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="group inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left font-medium transition hover:bg-black/5"
      >
        {formatMoney(value)}
        <Pencil className="h-3.5 w-3.5 text-ink-700/40 transition group-hover:text-[#ff2d95]" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="number"
        min={0}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-28 px-2 py-1 text-sm"
      />
      <button
        type="button"
        title="Save price"
        onClick={() => void commit()}
        disabled={busy}
        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        title="Cancel"
        onClick={() => setEditing(false)}
        disabled={busy}
        className="rounded-lg bg-black/10 p-1.5 text-ink-950 hover:bg-black/20 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
