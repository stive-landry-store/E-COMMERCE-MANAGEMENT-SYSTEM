import { useState } from "react";
import { Check, ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { uploadProductImages } from "@/lib/upload";
import { formatMoney } from "@/lib/format";

type PhotoCellProps = {
  url?: string | null;
  variantId?: string | null;
  alt: string;
  onSaved?: () => void;
};

export function ProductPhotoCell({ url, variantId, alt, onSaved }: PhotoCellProps) {
  const [busy, setBusy] = useState(false);

  async function replace(file: File) {
    if (!variantId) {
      toast.error("Add a variant before setting a photo");
      return;
    }
    setBusy(true);
    try {
      const [uploaded] = await uploadProductImages([file]);
      const { error } = await supabase.from("product_variants").update({ image_urls: [uploaded] }).eq("id", variantId);
      if (error) throw error;
      toast.success("Photo updated");
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="grid h-full w-full place-items-center text-ink-700/40">
          <ImagePlus className="h-5 w-5" />
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 grid place-items-center bg-black/55">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </span>
      ) : (
        <input
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          title="Change photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void replace(file);
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
