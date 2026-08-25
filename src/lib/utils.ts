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

const IMAGE_CACHE = "v=cmp1";

function productImagePath(url?: string | null, fallbackSlug?: string) {
  const raw = url?.trim() || (fallbackSlug ? `/products/${fallbackSlug}.png` : "");
  if (!raw) return "";
  return raw.split("?")[0];
}

/** Prefer compressed WebP; fall back to PNG/JPEG if missing. */
export function productImageUrl(url?: string | null, fallbackSlug?: string) {
  const base = productImagePath(url, fallbackSlug);
  if (!base) return "/placeholder-phone.svg";
  if (!base.startsWith("/products/")) return url?.trim() || base;
  const stem = base.replace(/\.(png|jpe?g|webp)$/i, "");
  return `${stem}.webp?${IMAGE_CACHE}`;
}

/** First fallback after WebP: original PNG/JPEG on disk. */
export function productImageFallback(url?: string | null, fallbackSlug?: string) {
  const base = productImagePath(url, fallbackSlug);
  if (!base || !base.startsWith("/products/")) return "/placeholder-phone.svg";
  if (/\.webp$/i.test(base)) return `${base.replace(/\.webp$/i, ".png")}?${IMAGE_CACHE}`;
  return `${base}?${IMAGE_CACHE}`;
}

/** Second fallback: the other raster format. */
export function productImageSecondaryFallback(url?: string | null, fallbackSlug?: string) {
  const first = productImageFallback(url, fallbackSlug).split("?")[0];
  if (/\.png$/i.test(first)) return `${first.replace(/\.png$/i, ".jpg")}?${IMAGE_CACHE}`;
  if (/\.jpe?g$/i.test(first)) return `${first.replace(/\.jpe?g$/i, ".png")}?${IMAGE_CACHE}`;
  return "/placeholder-phone.svg";
}

export function onProductImageError(
  event: { currentTarget: HTMLImageElement },
  url?: string | null,
  fallbackSlug?: string,
) {
  const el = event.currentTarget;
  if (el.src.includes("placeholder-phone")) return;
  const step = Number(el.dataset.imgFb ?? "0");
  if (step === 0) {
    el.dataset.imgFb = "1";
    el.src = productImageFallback(url, fallbackSlug);
    return;
  }
  if (step === 1) {
    el.dataset.imgFb = "2";
    el.src = productImageSecondaryFallback(url, fallbackSlug);
    return;
  }
  el.src = "/placeholder-phone.svg";
}

export function categoryImageUrl(url?: string | null) {
  if (!url?.trim()) return null;
  const raw = url.trim();
  if (!raw.startsWith("/categories/")) return raw;
  const stem = raw.split("?")[0].replace(/\.(png|jpe?g|webp)$/i, "");
  return `${stem}.webp?${IMAGE_CACHE}`;
}
