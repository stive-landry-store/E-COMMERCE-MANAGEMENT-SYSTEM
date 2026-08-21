// Downloads official product photography from Apple's own CDN.
//
// Apple's image tokens are not guessable (the date period and the colour-slug
// order change between generations), so instead of building URLs we harvest the
// real tokens from Apple's public pages and then match them to our catalogue.
//
//   node scripts/download-apple-images.mjs
//
// Images land in public/products/ and a manifest is written to
// scripts/apple-image-manifest.json so the SQL generator knows which
// product/colour pairs actually have a photo.
//
// Apple no longer publishes images for long-discontinued models (iPhone 7 to
// iPhone 11, the older iPads, early Apple Watch). Those simply get no photo and
// fall back to the placeholder in the UI.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PRODUCTS, slugify } from "./apple-catalog.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "products");
const CACHE = path.join(import.meta.dirname, ".cache-apple-tokens.json");
const MANIFEST = path.join(import.meta.dirname, "apple-image-manifest.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const PAGES = [
  "https://www.apple.com/shop/buy-iphone",
  "https://www.apple.com/shop/buy-iphone/iphone-17-pro",
  "https://www.apple.com/shop/buy-iphone/iphone-17",
  "https://www.apple.com/shop/buy-iphone/iphone-air",
  "https://www.apple.com/shop/buy-iphone/iphone-16e",
  "https://www.apple.com/shop/buy-iphone/iphone-16-pro",
  "https://www.apple.com/shop/buy-iphone/iphone-16",
  "https://www.apple.com/shop/buy-iphone/iphone-15",
  "https://www.apple.com/iphone/",
  // The refurbished store is the only place Apple still publishes photos of
  // previous-generation hardware.
  "https://www.apple.com/shop/refurbished/iphone",
  "https://www.apple.com/shop/refurbished/mac",
  "https://www.apple.com/shop/refurbished/ipad",
  "https://www.apple.com/shop/refurbished/watch",
  "https://www.apple.com/shop/refurbished/appletv",
  "https://www.apple.com/shop/buy-mac",
  "https://www.apple.com/shop/buy-mac/macbook-air",
  "https://www.apple.com/shop/buy-mac/macbook-air/13-inch-m4",
  "https://www.apple.com/shop/buy-mac/macbook-pro",
  "https://www.apple.com/shop/buy-mac/macbook-pro/14-inch",
  "https://www.apple.com/shop/buy-mac/macbook-pro/16-inch",
  "https://www.apple.com/shop/buy-mac/imac",
  "https://www.apple.com/shop/buy-mac/mac-mini",
  "https://www.apple.com/shop/buy-mac/mac-studio",
  "https://www.apple.com/shop/buy-mac/mac-pro",
  "https://www.apple.com/mac/",
  "https://www.apple.com/shop/buy-ipad/ipad-pro",
  "https://www.apple.com/shop/buy-ipad/ipad-air",
  "https://www.apple.com/shop/buy-ipad/ipad",
  "https://www.apple.com/shop/buy-ipad/ipad-mini",
  "https://www.apple.com/ipad/",
  "https://www.apple.com/shop/buy-watch/apple-watch",
  "https://www.apple.com/shop/buy-watch/apple-watch-ultra",
  "https://www.apple.com/shop/buy-watch/apple-watch-se",
  "https://www.apple.com/watch/",
  "https://www.apple.com/shop/buy-airpods/airpods-pro",
  "https://www.apple.com/shop/buy-airpods/airpods-4",
  "https://www.apple.com/shop/buy-airpods/airpods-max",
  "https://www.apple.com/airpods/",
  "https://www.apple.com/shop/buy-homepod/homepod",
  "https://www.apple.com/shop/buy-homepod/homepod-mini",
  "https://www.apple.com/shop/buy-airpods",
  "https://www.apple.com/shop/buy-tv/apple-tv-4k",
  "https://www.apple.com/shop/accessories/all",
  "https://www.apple.com/shop/iphone/accessories",
  "https://www.apple.com/shop/mac/mac-accessories",
  "https://www.apple.com/shop/ipad/ipad-accessories",
  "https://www.apple.com/shop/watch/watch-accessories",
  "https://www.apple.com/shop/watch/bands",
  "https://www.apple.com/shop/iphone/iphone-accessories/cases-protection",
  "https://www.apple.com/shop/iphone/iphone-accessories/power-cables",
  "https://www.apple.com/shop/mac/mac-accessories/keyboards-mice-trackpads",
  "https://www.apple.com/shop/ipad/ipad-accessories/apple-pencil",
];

// Products whose slug does not appear in Apple's image tokens need an explicit
// hint (Apple uses "mba13", "mbp14", "ipad-air-11", ... internally).
const HINTS = {
  // The 13" and 15" Air chassis is unchanged across M1-M5, so the generic
  // "mba13" / "mba15" shots are correct for every generation.
  "MBA-M1-13": ["mba13-m1", "mba13"],
  "MBA-M2-13": ["mba13-m2", "mba13"],
  "MBA-M2-15": ["mba15-m2", "mba15"],
  "MBA-M3-13": ["mba13-m3", "mba13"],
  "MBA-M3-15": ["mba15-m3", "mba15"],
  "MBA-M4-13": ["mba13-m4", "mba13"],
  "MBA-M4-15": ["mba15-m4", "mba15"],
  "MBA-M5-13": ["mba13-m5", "mba13"],
  "MBA-M5-15": ["mba15-m5", "mba15"],
  "MBP14-M1P": ["mbp14"],
  "MBP14-M1MX": ["mbp14"],
  "MBP14-M2P": ["mbp14"],
  "MBP14-M2MX": ["mbp14"],
  "MBP14-M3": ["mbp14"],
  "MBP14-M3P": ["mbp14"],
  "MBP14-M3MX": ["mbp14"],
  "MBP14-M4": ["mbp14"],
  "MBP14-M4P": ["mbp14"],
  "MBP14-M4MX": ["mbp14"],
  "MBP14-M5": ["mbp14"],
  "MBP16-M1P": ["mbp16"],
  "MBP16-M1MX": ["mbp16"],
  "MBP16-M2P": ["mbp16"],
  "MBP16-M2MX": ["mbp16"],
  "MBP16-M3P": ["mbp16"],
  "MBP16-M3MX": ["mbp16"],
  "MBP16-M4P": ["mbp16"],
  "MBP16-M4MX": ["mbp16"],
  "IMAC-M1": ["imac-24"],
  "IMAC-M3": ["imac-24"],
  "IMAC-M4": ["imac-24"],
  "MINI-M1": ["mac-mini"],
  "MINI-M2": ["mac-mini"],
  "MINI-M2P": ["mac-mini"],
  "MINI-M4": ["mac-mini"],
  "MINI-M4P": ["mac-mini"],
  "STU-M1MX": ["mac-studio"],
  "STU-M1U": ["mac-studio"],
  "STU-M2MX": ["mac-studio"],
  "STU-M2U": ["mac-studio"],
  "STU-M4MX": ["mac-studio"],
  "STU-M3U": ["mac-studio"],
  "MACPRO-2019": ["mac-pro"],
  "MACPRO-M2U": ["mac-pro"],
  "IPAD-A16": ["ipad-11", "ipad-a16"],
  IPAD10: ["ipad-10"],
  IPAD9: ["ipad-9"],
  "IPADMINI-A17": ["ipad-mini"],
  IPADMINI6: ["ipad-mini"],
  "IPADAIR-M2": ["ipad-air-11", "ipad-air"],
  "IPADAIR-M3": ["ipad-air-11", "ipad-air"],
  "IPADAIR-M4": ["ipad-air-13", "ipad-air"],
  "IPADPRO-11": ["ipad-pro-11"],
  "IPADPRO-129": ["ipad-pro-13", "ipad-pro-12"],
  "IPADPRO-13": ["ipad-pro-13"],
  "AW-S9": ["s9", "series-9"],
  "AW-S10": ["s10", "series-10"],
  "AW-S11": ["s11", "series-11"],
  "AW-SE2": ["se-2", "watch-se"],
  "AW-U2": ["ultra-2"],
  "AW-U3": ["ultra-3", "ultra"],
  APODS4: ["airpods-4"],
  APODS4ANC: ["airpods-4"],
  APODSP2: ["airpods-pro-2", "airpods-pro"],
  APODSP3: ["airpods-pro-3", "airpods-pro"],
  APODSMAX: ["airpods-max"],
  APODSMAX2: ["airpods-max"],
  APODS3: ["airpods-3"],
  APODS2: ["airpods-2", "airpods"],
  HPOD: ["homepod"],
  HPODMINI: ["homepod-mini"],
  PENCIL1: ["apple-pencil"],
  PENCIL2: ["apple-pencil"],
  PENCILC: ["apple-pencil-usb"],
  PENCILPRO: ["apple-pencil-pro"],
  MKEY: ["magic-keyboard"],
  MKEYTID: ["magic-keyboard"],
  MMOUSE: ["magic-mouse"],
  MTRACK: ["magic-trackpad"],
  AIRTAG: ["airtag"],
  ATV4K: ["apple-tv-4k"],
  ATVHD: ["apple-tv"],
  "CABLE-USBC": ["usb-c-charge-cable", "usb-c-cable"],
  "CABLE-LTG": ["lightning", "usb-c-to-lightning"],
  "PWR-20W": ["20w-usb-c-power-adapter", "power-adapter"],
  "PWR-35W": ["35w", "power-adapter"],
  MAGSAFE: ["magsafe-charger"],
  "MAGSAFE-BAT": ["magsafe-battery"],
  FOLIO: ["smart-folio"],
  "CASE-SIL": ["silicone-case"],
  "BAND-SPORT": ["sport-band"],
  "BAND-MILAN": ["milanese"],
};

// Apple keeps serving the "finish-select" images of previous iPhones even
// though no current page links to them, so for iPhones we can build the URL
// directly instead of relying on the harvest. Two layouts exist:
//   2019-2024:  {family}-finish-select-{period}-{size}-{colour}
//   2025+:      {family}-finish-select-{colour}-{period}
const IPHONE_DIRECT = {
  IP11: { family: "iphone-11", size: "6-1inch", periods: ["201909"] },
  IP11P: { family: "iphone-11-pro", size: "5-8inch", periods: ["201909"] },
  IP11PM: { family: "iphone-11-pro", size: "6-5inch", periods: ["201909"] },
  IP12MI: { family: "iphone-12", size: "5-4inch", periods: ["202207", "202104", "202010"] },
  IP12: { family: "iphone-12", size: "6-1inch", periods: ["202207", "202104", "202010"] },
  IP12P: { family: "iphone-12-pro", size: "6-1inch", periods: ["202010", "202104"] },
  IP12PM: { family: "iphone-12-pro", size: "6-7inch", periods: ["202010", "202104"] },
  IP13MI: { family: "iphone-13", size: "5-4inch", periods: ["202207", "202109"] },
  IP13: { family: "iphone-13", size: "6-1inch", periods: ["202207", "202209", "202109"] },
  IP13P: { family: "iphone-13-pro", size: "6-1inch", periods: ["202109"] },
  IP13PM: { family: "iphone-13-pro", size: "6-7inch", periods: ["202109"] },
  IP14: { family: "iphone-14", size: "6-1inch", periods: ["202209", "202309"] },
  IP14PL: { family: "iphone-14", size: "6-7inch", periods: ["202209", "202309"] },
  IP14P: { family: "iphone-14-pro", size: "6-1inch", periods: ["202209"] },
  IP14PM: { family: "iphone-14-pro", size: "6-7inch", periods: ["202209"] },
  IP15: { family: "iphone-15", size: "6-1inch", periods: ["202309", "202409"] },
  IP15PL: { family: "iphone-15", size: "6-7inch", periods: ["202309", "202409"] },
  IP15P: { family: "iphone-15-pro", size: "6-1inch", periods: ["202309"] },
  IP15PM: { family: "iphone-15-pro", size: "6-7inch", periods: ["202309"] },
  IP16: { family: "iphone-16", size: "6-1inch", periods: ["202409", "202502"] },
  IP16PL: { family: "iphone-16", size: "6-7inch", periods: ["202409", "202502"] },
  IP16P: { family: "iphone-16-pro", size: "6-3inch", periods: ["202409"] },
  IP16PM: { family: "iphone-16-pro", size: "6-9inch", periods: ["202409"] },
  IP16E: { family: "iphone-16e", size: "6-1inch", periods: ["202502"] },
  IP17: { family: "iphone-17", size: "6-3inch", periods: ["202509"] },
  IP17P: { family: "iphone-17-pro", size: "6-3inch", periods: ["202509"] },
  IP17PM: { family: "iphone-17-pro", size: "6-9inch", periods: ["202509"] },
  IPAIR: { family: "iphone-air", size: "6-5inch", periods: ["202509"] },
};

function directCandidates(product, color) {
  const spec = IPHONE_DIRECT[product.sku];
  if (!spec) return [];
  const slugs = new Set();
  const base = slugify(color).replace(/-/g, "");
  slugs.add(base);
  if (color === "PRODUCT(RED)") {
    slugs.add("red");
    slugs.add("productred");
  }
  const out = [];
  for (const period of spec.periods) {
    for (const cs of slugs) {
      out.push(`${spec.family}-finish-select-${period}-${spec.size}-${cs}`);
      out.push(`${spec.family}-finish-select-${cs}-${period}`);
    }
  }
  return out;
}

/** Colour slug forms Apple may use inside a token. */
function colorTokens(color) {
  const slug = slugify(color);
  const flat = slug.replace(/-/g, "");
  const set = new Set([slug, flat]);
  if (color === "PRODUCT(RED)") {
    set.add("red");
    set.add("productred");
  }
  // "Jet Black Aluminium" -> also try "jetblack"
  const noMaterial = slug.replace(/-(aluminium|aluminum|titanium|steel)$/, "");
  set.add(noMaterial);
  set.add(noMaterial.replace(/-/g, ""));
  return [...set].filter(Boolean).sort((a, b) => b.length - a.length);
}

function hintsFor(product) {
  return HINTS[product.sku] ?? [product.slug];
}

async function harvestTokens() {
  if (existsSync(CACHE)) {
    const cached = JSON.parse(await readFile(CACHE, "utf8"));
    console.log(`Using cached token list (${cached.length} tokens). Delete ${path.basename(CACHE)} to refresh.`);
    return cached;
  }
  const tokens = new Set();
  for (const url of PAGES) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-US,en" } });
      if (!res.ok) {
        console.log(`  skip ${url} (HTTP ${res.status})`);
        continue;
      }
      const html = await res.text();
      const found = html.matchAll(/as-images\.apple\.com\/is\/([a-zA-Z0-9_.-]+)/g);
      let n = 0;
      for (const m of found) {
        tokens.add(m[1]);
        n += 1;
      }
      console.log(`  ${url} -> ${n} refs`);
    } catch (err) {
      console.log(`  fail ${url} :: ${err.message}`);
    }
  }
  const list = [...tokens].sort();
  await writeFile(CACHE, JSON.stringify(list, null, 2));
  console.log(`Harvested ${list.length} unique image tokens.`);
  return list;
}

// Reject a token when it belongs to a more specific sibling product, so the
// "iphone-17" hint never steals an "iphone-17-pro" image.
const ALL_HINTS = PRODUCTS.flatMap(hintsFor);

function isSiblingCollision(token, hint) {
  return ALL_HINTS.some((other) => other.length > hint.length && other.startsWith(hint) && token.includes(other));
}

// "gallery-1" is the main product shot, later gallery frames are detail crops.
// SW_COLOR assets are the little colour swatch dots, not product photography.
const NOISE = /_AV\d|gallery-[2-9]|_GEO_|_SW_|unselect|thumbnail|applecare|logo|banner|-vid\d|chip-select|size-select|category-icon|compare-icon|curatedgrid|featurecard|witb/i;

function pickToken(tokens, product, color) {
  const hints = hintsFor(product);
  const colors = color ? colorTokens(color) : [];
  const scored = [];
  for (const token of tokens) {
    if (NOISE.test(token)) continue;
    const lower = token.toLowerCase();
    const hint = hints.find((h) => lower.includes(h));
    if (!hint) continue;
    if (isSiblingCollision(lower, hint)) continue;
    const colorHit = colors.find((c) => c.length > 2 && lower.includes(c));
    if (color && !colorHit) continue;
    let score = hints.indexOf(hint) * -10;
    if (lower.includes("finish-select")) score += 60;
    else if (lower.includes("select")) score += 40;
    if (colorHit) score += 30 + colorHit.length;
    score -= token.length / 100;
    scored.push({ token, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.token ?? null;
}

async function download(token, dest) {
  const url = `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${token}?wid=1000&hei=1000&fmt=jpeg&qlt=90&.v=1`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) return false;
  await writeFile(dest, buf);
  return true;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tokens = await harvestTokens();

  // sources/ records which Apple asset each file came from, so a bad match can
  // be traced back later.
  const manifest = { products: {}, variants: {}, sources: {} };
  let productHits = 0;
  let colorHits = 0;
  let colorMisses = 0;

  for (const product of PRODUCTS) {
    // Model-level photo (used when a colour has no dedicated shot).
    const modelToken = pickToken(tokens, product, null);
    if (modelToken) {
      const file = `${product.slug}.jpg`;
      const dest = path.join(OUT_DIR, file);
      if (existsSync(dest) || (await download(modelToken, dest))) {
        manifest.products[product.slug] = `/products/${file}`;
        manifest.sources[file] = modelToken;
        productHits += 1;
      }
    }

    for (const color of product.colors) {
      const cs = slugify(color);
      const file = `${product.slug}-${cs}.jpg`;
      const dest = path.join(OUT_DIR, file);
      const key = `${product.slug}|${cs}`;

      if (existsSync(dest)) {
        manifest.variants[key] = `/products/${file}`;
        colorHits += 1;
        continue;
      }

      const scraped = pickToken(tokens, product, color);
      const candidates = [...directCandidates(product, color), ...(scraped ? [scraped] : [])];
      let saved = null;
      for (const candidate of candidates) {
        if (await download(candidate, dest)) {
          saved = candidate;
          break;
        }
      }
      if (saved) {
        manifest.variants[key] = `/products/${file}`;
        manifest.sources[file] = saved;
        colorHits += 1;
      } else {
        colorMisses += 1;
      }
    }
    process.stdout.write(".");
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log("");
  console.log(`Model photos:  ${productHits}/${PRODUCTS.length}`);
  console.log(`Colour photos: ${colorHits} downloaded, ${colorMisses} unavailable`);
  console.log(`Manifest -> ${path.relative(ROOT, MANIFEST)}`);
}

await main();
