/**
 * Downloads official-style product hero images into public/products/.
 * Run: node scripts/download-product-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
fs.mkdirSync(outDir, { recursive: true });

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Official Apple CDN + Anker CDN hero shots (model-level). */
const downloads = {
  "iphone-15.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-blue?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-15-pro.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-15-plus.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-7inch-pink?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-15-pro-max.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch_GEO_US?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-14.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-14-plus.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-plus-finish-select-202209-6-7inch-blue?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-14-pro.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-deeppurple?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-14-pro-max.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-13.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-blue?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-13-pro.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-finish-select-202207-6-1inch-sierrablue?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-13-mini.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-mini-finish-select-202207-5-4inch-pink?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-13-pro-max.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-max-finish-select-202207-6-7inch-graphite?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-12.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-finish-select-202207-5-4inch_GEO_EMEA?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-12-pro.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-pro-finish-select-202207-6-1inch-pacificblue?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-11.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone11-purple-select-2019?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-16.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-ultramarine?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "iphone-16-pro.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "airpods-pro-2.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MTJV3?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "airpods-4.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-4-select-202409?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "apple-watch-series-9.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/watch-case-41-aluminum-midnight-nc-s9?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "apple-watch-se-2.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/watch-case-40-aluminum-midnight-nc-se_VW_PF?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "macbook-air-m2-13.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "macbook-air-m3-13.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mba13-m3-select-202402?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "macbook-pro-14-m4.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mbp14-spaceblack-select-202410?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "ipad-10.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-10th-gen-finish-select-202212-blue-wifi?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "ipad-pro-11-m4.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-11-select-wifi-spaceblack-202405?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "mac-mini-m4.jpg":
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mac-mini-202410-gallery-1?wid=1200&hei=1200&fmt=jpeg&qlt=90",
  "imac-24-m3.jpg":
    "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/imac-24-blue-selection-hero-202310?wid=1200&hei=1200&fmt=jpeg&qlt=90",
};

/** Copy fallbacks for models without a unique CDN URL yet */
const copies = {
  "iphone-7.jpg": "iphone-8.jpg",
  "iphone-7-plus.jpg": "iphone-8-plus.jpg",
  "iphone-8.jpg": "iphone-14.jpg",
  "iphone-8-plus.jpg": "iphone-14-plus.jpg",
  "iphone-x.jpg": "iphone-14-pro.jpg",
  "iphone-xr.jpg": "iphone-11.jpg",
  "iphone-xs.jpg": "iphone-14-pro.jpg",
  "iphone-xs-max.jpg": "iphone-14-pro-max.jpg",
  "iphone-11-pro.jpg": "iphone-14-pro.jpg",
  "iphone-11-pro-max.jpg": "iphone-14-pro-max.jpg",
  "iphone-12-mini.jpg": "iphone-13-mini.jpg",
  "iphone-12-pro-max.jpg": "iphone-12-pro.jpg",
  "iphone-16-plus.jpg": "iphone-16.jpg",
  "iphone-16-pro-max.jpg": "iphone-16-pro.jpg",
  "iphone-16e.jpg": "iphone-16.jpg",
  "iphone-17.jpg": "iphone-16.jpg",
  "iphone-17e.jpg": "iphone-16.jpg",
  "iphone-air.jpg": "iphone-16-pro.jpg",
  "iphone-17-pro.jpg": "iphone-16-pro.jpg",
  "iphone-17-pro-max.jpg": "iphone-16-pro.jpg",
  "iphone-15.jpg": "iphone-15.jpg",
  "macbook-air-m1-13.jpg": "macbook-air-m2-13.jpg",
  "macbook-air-m2-15.jpg": "macbook-air-m2-13.jpg",
  "macbook-air-m3-15.jpg": "macbook-air-m3-13.jpg",
  "macbook-air-m4-13.jpg": "macbook-air-m3-13.jpg",
  "macbook-air-m4-15.jpg": "macbook-air-m3-13.jpg",
  "macbook-air-m5-13.jpg": "macbook-air-m3-13.jpg",
  "macbook-air-m5-15.jpg": "macbook-air-m3-13.jpg",
  "macbook-pro-14-m3.jpg": "macbook-pro-14-m4.jpg",
  "macbook-pro-14-m5.jpg": "macbook-pro-14-m4.jpg",
  "macbook-pro-16-m3-pro.jpg": "macbook-pro-14-m4.jpg",
  "macbook-pro-16-m4-pro.jpg": "macbook-pro-14-m4.jpg",
  "imac-24-m1.jpg": "imac-24-m3.jpg",
  "imac-24-m4.jpg": "imac-24-m3.jpg",
  "mac-mini-m1.jpg": "mac-mini-m4.jpg",
  "mac-mini-m2.jpg": "mac-mini-m4.jpg",
  "mac-mini-m4-pro.jpg": "mac-mini-m4.jpg",
  "mac-studio-m2-max.jpg": "mac-mini-m4.jpg",
  "mac-studio-m4-max.jpg": "mac-mini-m4.jpg",
  "mac-pro-2023.jpg": "mac-mini-m4.jpg",
  "ipad-9.jpg": "ipad-10.jpg",
  "ipad-a16.jpg": "ipad-10.jpg",
  "ipad-mini-6.jpg": "ipad-10.jpg",
  "ipad-mini-a17-pro.jpg": "ipad-10.jpg",
  "ipad-air-m2-11.jpg": "ipad-pro-11-m4.jpg",
  "ipad-air-m2-13.jpg": "ipad-pro-11-m4.jpg",
  "ipad-air-m3-11.jpg": "ipad-pro-11-m4.jpg",
  "ipad-pro-13-m4.jpg": "ipad-pro-11-m4.jpg",
  "apple-watch-series-10.jpg": "apple-watch-series-9.jpg",
  "apple-watch-series-11.jpg": "apple-watch-series-9.jpg",
  "apple-watch-ultra-2.jpg": "apple-watch-series-9.jpg",
  "apple-watch-ultra-3.jpg": "apple-watch-series-9.jpg",
  "airpods-2.jpg": "airpods-pro-2.jpg",
  "airpods-3.jpg": "airpods-pro-2.jpg",
  "airpods-4-anc.jpg": "airpods-4.jpg",
  "airpods-pro-3.jpg": "airpods-pro-2.jpg",
  "airpods-max.jpg": "airpods-pro-2.jpg",
  "airpods-max-2.jpg": "airpods-pro-2.jpg",
  "apple-pencil-usb-c.jpg": "anker-20w-charger.jpg",
  "apple-pencil-pro.jpg": "anker-20w-charger.jpg",
  "magic-keyboard.jpg": "anker-20w-charger.jpg",
  "magic-keyboard-touch-id.jpg": "anker-20w-charger.jpg",
  "magic-mouse.jpg": "anker-20w-charger.jpg",
  "magic-trackpad.jpg": "anker-20w-charger.jpg",
  "airtag.jpg": "anker-20w-charger.jpg",
  "homepod-mini.jpg": "airpods-pro-2.jpg",
  "homepod-2.jpg": "airpods-pro-2.jpg",
  "apple-tv-4k.jpg": "anker-20w-charger.jpg",
  "magsafe-charger.jpg": "anker-20w-charger.jpg",
  "magsafe-battery-pack.jpg": "anker-20w-charger.jpg",
  "apple-20w-adapter.jpg": "anker-20w-charger.jpg",
  "usb-c-lightning-cable.jpg": "anker-20w-charger.jpg",
  "usb-c-charge-cable.jpg": "anker-20w-charger.jpg",
  "iphone-silicone-case.jpg": "iphone-15.jpg",
  "smart-folio-ipad.jpg": "ipad-10.jpg",
};

async function get(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": ua } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  for (const [name, url] of Object.entries(downloads)) {
    const dest = path.join(outDir, name);
    try {
      const n = await get(url, dest);
      console.log(`OK   ${name} (${n} bytes)`);
    } catch (err) {
      console.log(`FAIL ${name} :: ${err.message}`);
    }
  }

  // Keep previously downloaded assets
  for (const [destName, srcName] of Object.entries(copies)) {
    const dest = path.join(outDir, destName);
    const src = path.join(outDir, srcName);
    if (fs.existsSync(dest)) continue;
    if (!fs.existsSync(src)) {
      console.log(`SKIP copy ${destName} (missing ${srcName})`);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`COPY ${srcName} -> ${destName}`);
  }

  console.log("Done. Files:", fs.readdirSync(outDir).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
