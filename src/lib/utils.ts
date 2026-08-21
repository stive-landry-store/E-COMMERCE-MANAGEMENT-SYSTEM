import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function variantLabel(variant: {
  storage?: string | null;
  color?: string | null;
  model?: string | null;
}) {
  return [variant.storage, variant.color].filter(Boolean).join(" · ") || variant.model || "Standard";
}

/** Prefer transparent PNG cutouts; rewrite legacy .jpg product paths. */
export function productImageUrl(url?: string | null, fallbackSlug?: string) {
  const raw = url?.trim() || (fallbackSlug ? `/products/${fallbackSlug}.png` : "");
  if (!raw) return "/placeholder-phone.svg";
  if (!raw.startsWith("/products/")) return raw;
  const base = raw.split("?")[0].replace(/\.jpe?g$/i, ".png");
  const asPng = base.endsWith(".png") ? base : `${base}.png`;
  return `${asPng}?v=fill5`;
}
