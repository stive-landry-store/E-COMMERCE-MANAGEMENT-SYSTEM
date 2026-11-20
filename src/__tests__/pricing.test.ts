import { describe, expect, it } from "vitest";
import { hasSealedOption, unitPriceForCondition } from "@/lib/phoneCondition";
import { estimateSealedFromOpenBox, roundFcfa, storageToGb } from "@/lib/storagePriceLadder";
import { formatMoney } from "@/lib/format";
import { slugify, variantLabel } from "@/lib/utils";

describe("cart / checkout pricing", () => {
  const variant = { price: 450000, price_sealed: 520000 };

  it("uses the open-box price by default", () => {
    expect(unitPriceForCondition(variant)).toBe(450000);
  });

  it("uses the sealed price only when one is set", () => {
    expect(unitPriceForCondition(variant, "sealed")).toBe(520000);
    expect(unitPriceForCondition({ price: 300000, price_sealed: null }, "sealed")).toBe(300000);
    expect(unitPriceForCondition({ price: 300000, price_sealed: 0 }, "sealed")).toBe(300000);
  });

  it("returns 0 for a missing variant", () => {
    expect(unitPriceForCondition(null)).toBe(0);
  });

  it("detects the sealed option", () => {
    expect(hasSealedOption(variant)).toBe(true);
    expect(hasSealedOption({ price_sealed: null })).toBe(false);
  });

  it("rounds FCFA to the nearest thousand and never goes negative", () => {
    expect(roundFcfa(451499)).toBe(451000);
    expect(roundFcfa(451500)).toBe(452000);
    expect(roundFcfa(-10)).toBe(0);
    expect(estimateSealedFromOpenBox(100000)).toBe(112000);
  });
});

describe("storage parsing", () => {
  it("reads GB / Go / TB / To", () => {
    expect(storageToGb("128 Go")).toBe(128);
    expect(storageToGb("256GB")).toBe(256);
    expect(storageToGb("1 To")).toBe(1024);
    expect(storageToGb("2TB")).toBe(2048);
    expect(storageToGb("")).toBeNull();
    expect(storageToGb("abc")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats FCFA amounts", () => {
    expect(formatMoney(1250000).replace(/\s/g, " ")).toBe("1 250 000 FCFA");
    expect(formatMoney(null)).toBe("0 FCFA");
  });

  it("builds slugs and variant labels", () => {
    expect(slugify("iPhone 15 Pro Max!")).toBe("iphone-15-pro-max");
    expect(variantLabel({ storage: "256 Go", color: "Noir" })).toBe("256 Go · Noir");
    expect(variantLabel({ model: "A2890" })).toBe("A2890");
    expect(variantLabel({})).toBe("Standard");
  });
});
