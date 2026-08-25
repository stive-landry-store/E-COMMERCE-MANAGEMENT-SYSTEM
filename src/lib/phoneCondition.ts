import type { ProductVariant } from "@/types";

export type PhoneCondition = "open_box" | "sealed";

/** Open box = non scellé. Sealed uses price_sealed when set. */
export function unitPriceForCondition(
  variant: Pick<ProductVariant, "price" | "price_sealed"> | null | undefined,
  condition: PhoneCondition = "open_box",
): number {
  if (!variant) return 0;
  if (condition === "sealed" && variant.price_sealed != null && Number(variant.price_sealed) > 0) {
    return Number(variant.price_sealed);
  }
  return Number(variant.price ?? 0);
}

export function hasSealedOption(variant: Pick<ProductVariant, "price_sealed"> | null | undefined): boolean {
  return variant?.price_sealed != null && Number(variant.price_sealed) > 0;
}

export function conditionLabel(condition: PhoneCondition, lang: "en" | "fr" = "fr"): string {
  if (condition === "sealed") return lang === "fr" ? "Scellé" : "Sealed";
  return lang === "fr" ? "Open box" : "Open box";
}
