import { supabase } from "@/lib/supabase";
import type { ProductVariant } from "@/types";

export type StorageFamily = "phone" | "tablet" | "mac" | "flat";

/** Cameroon street premiums vs a 64 GB (phone) / 256 GB (Mac) baseline, in FCFA. */
const PHONE_BUMP: [number, number][] = [
  [32, 0],
  [64, 0],
  [128, 40_000],
  [256, 90_000],
  [512, 180_000],
  [1024, 320_000],
  [2048, 520_000],
  [4096, 900_000],
];

const TABLET_BUMP: [number, number][] = [
  [64, 0],
  [128, 15_000],
  [256, 30_000],
  [512, 50_000],
  [1024, 80_000],
  [2048, 130_000],
];

const MAC_BUMP: [number, number][] = [
  [256, 0],
  [512, 80_000],
  [1024, 160_000],
  [2048, 280_000],
  [4096, 400_000],
  [8192, 600_000],
];

const FLAT_BUMP: [number, number][] = [
  [64, 0],
  [128, 10_000],
  [256, 20_000],
  [512, 30_000],
  [1024, 50_000],
];

export function familyFromCategorySlug(slug?: string | null): StorageFamily {
  const s = (slug ?? "").toLowerCase();
  if (s === "iphone" || s.includes("phone")) return "phone";
  if (s === "ipad" || s.includes("tablet")) return "tablet";
  if (s.includes("mac") || s.includes("laptop")) return "mac";
  return "flat";
}

/** Parse "128 Go", "256GB", "1 To", "1TB" → gigabytes. */
export function storageToGb(storage?: string | null): number | null {
  if (!storage?.trim()) return null;
  const n = storage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const m = n.match(/([\d.,]+)\s*(to|tb|go|gb)?/);
  if (!m) return null;
  const qty = Number(m[1].replace(",", "."));
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const unit = m[2] ?? "go";
  if (unit === "to" || unit === "tb") return Math.round(qty * 1024);
  return Math.round(qty);
}

function bumpTable(family: StorageFamily): [number, number][] {
  if (family === "phone") return PHONE_BUMP;
  if (family === "tablet") return TABLET_BUMP;
  if (family === "mac") return MAC_BUMP;
  return FLAT_BUMP;
}

function bumpForGb(family: StorageFamily, gb: number): number {
  const table = bumpTable(family);
  if (gb <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i += 1) {
    const [gbHi, bumpHi] = table[i];
    const [gbLo, bumpLo] = table[i - 1];
    if (gb <= gbHi) {
      const t = (gb - gbLo) / (gbHi - gbLo);
      return bumpLo + t * (bumpHi - bumpLo);
    }
  }
  return table[table.length - 1][1];
}

export function roundFcfa(value: number): number {
  return Math.max(0, Math.round(value / 1000) * 1000);
}

/** Sealed ≈ +12% like the live catalog estimates. */
export function estimateSealedFromOpenBox(openBox: number): number {
  return roundFcfa(openBox * 1.12);
}

export function priceForStorageFromAnchor(
  family: StorageFamily,
  anchorStorage: string | null | undefined,
  anchorPrice: number,
  targetStorage: string | null | undefined,
): number {
  const fromGb = storageToGb(anchorStorage);
  const toGb = storageToGb(targetStorage);
  if (fromGb == null || toGb == null || fromGb === toGb) return roundFcfa(anchorPrice);
  return roundFcfa(anchorPrice + bumpForGb(family, toGb) - bumpForGb(family, fromGb));
}

export function pickAnchorVariant<T extends { storage?: string | null; price?: number }>(variants: T[]): T | undefined {
  if (!variants.length) return undefined;
  return [...variants].sort((a, b) => {
    const ga = storageToGb(a.storage);
    const gb = storageToGb(b.storage);
    if (ga == null && gb == null) return 0;
    if (ga == null) return 1;
    if (gb == null) return -1;
    return ga - gb;
  })[0];
}

export type LadderRow = { id: string; price: number; price_sealed: number | null };

export function planStorageLadder(
  variants: Pick<ProductVariant, "id" | "storage" | "price" | "price_sealed">[],
  anchorId: string,
  newPrice: number,
  family: StorageFamily,
  field: "price" | "price_sealed",
): LadderRow[] {
  const anchor = variants.find((v) => v.id === anchorId);
  if (!anchor) return [];
  const next = roundFcfa(newPrice);

  return variants.map((v) => {
    if (field === "price") {
      const openBox = priceForStorageFromAnchor(family, anchor.storage, next, v.storage);
      return { id: v.id, price: openBox, price_sealed: estimateSealedFromOpenBox(openBox) };
    }
    const sealed = priceForStorageFromAnchor(family, anchor.storage, next, v.storage);
    return {
      id: v.id,
      price: Number(v.price ?? 0),
      price_sealed: sealed > 0 ? sealed : null,
    };
  });
}

export async function applyStoragePriceLadder(
  variants: Pick<ProductVariant, "id" | "storage" | "price" | "price_sealed">[],
  anchorId: string,
  newPrice: number,
  family: StorageFamily,
  field: "price" | "price_sealed" = "price",
): Promise<{ count: number; storages: string[]; rows: LadderRow[] }> {
  const plan = planStorageLadder(variants, anchorId, newPrice, family, field);
  if (!plan.length) throw new Error("No variant to update.");

  const results = await Promise.all(
    plan.map((row) =>
      supabase
        .from("product_variants")
        .update({ price: row.price, price_sealed: row.price_sealed })
        .eq("id", row.id)
        .select("id"),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  if (results.some((r) => !r.data?.length)) {
    throw new Error("The shop price was not saved. Confirm you are signed in as admin.");
  }

  const storages = [
    ...new Set(
      variants
        .map((v) => v.storage?.trim())
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  return { count: plan.length, storages, rows: plan };
}
