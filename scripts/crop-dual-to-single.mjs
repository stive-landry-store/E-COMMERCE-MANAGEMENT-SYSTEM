/**
 * For dual front+back heroes, keep only the left (rear) device so the card shows one product.
 * Run: node scripts/crop-dual-to-single.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");

const duals = [
  "iphone-12-pro.png",
  "iphone-12-pro-max.png",
  "iphone-13-pro.png",
  "iphone-14.png",
  "iphone-14-plus.png",
  "iphone-14-pro.png",
  "iphone-14-pro-max.png",
  "iphone-15.png",
  "iphone-15-plus.png",
  "iphone-15-pro.png",
  "iphone-15-pro-max.png",
  "iphone-16.png",
  "iphone-16-plus.png",
  "iphone-16-pro.png",
  "iphone-16-pro-max.png",
  "iphone-17.png",
  "iphone-17e.png",
  "iphone-air.png",
  "iphone-17-pro.png",
  "iphone-17-pro-max.png",
  "ipad-pro-11-m4.png",
  "ipad-pro-13-m4.png",
  "iphone-11.png",
  "iphone-11-pro.png",
  "iphone-11-pro-max.png",
];

async function cropLeftDevice(file) {
  const p = path.join(outDir, file);
  if (!fs.existsSync(p)) return false;

  const meta = await sharp(p).metadata();
  const w = meta.width;
  const h = meta.height;
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // Find opaque bounding box
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return false;

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  // Only crop if content is wider than tall (typical dual side-by-side)
  if (contentW < contentH * 1.15) {
    // already single-ish; just normalize
    const out = await sharp(p)
      .trim({ threshold: 0 })
      .resize({ width: 1400, height: 1400, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    fs.writeFileSync(p, out);
    return "single";
  }

  // Keep left ~52% of content (rear phone)
  const cropW = Math.round(contentW * 0.52);
  const extracted = await sharp(p)
    .extract({
      left: minX,
      top: minY,
      width: Math.min(cropW, w - minX),
      height: contentH,
    })
    .trim({ threshold: 0 })
    .resize({ width: 1400, height: 1400, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(p, extracted);
  return "cropped";
}

async function main() {
  for (const f of duals) {
    try {
      const r = await cropLeftDevice(f);
      console.log(`${String(r).padEnd(8)} ${f}`);
    } catch (e) {
      console.log(`FAIL     ${f}: ${e.message}`);
    }
  }
}

main();
