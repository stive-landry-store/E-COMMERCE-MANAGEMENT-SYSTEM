/**
 * Crop product images to the actual device (remove empty black/transparent padding)
 * so cards fill like iPhone 11 / 11 Pro / 11 Pro Max.
 * Run: node scripts/normalize-product-crops.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
const SIZE = 1600;
/** Target: product content covers ~72% of the canvas (like iPhone 11 look). */
const FILL = 0.78;

async function contentBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const a = data[o + 3];
      const nearBlack = r < 22 && g < 22 && b < 22;
      if (a > 18 && !nearBlack) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found || maxX <= minX || maxY <= minY) return null;

  // small padding around product
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, fill: ((maxX - minX) * (maxY - minY)) / (w * h) };
}

async function normalizeFile(file) {
  const srcPath = path.join(outDir, file);
  const input = fs.readFileSync(srcPath);
  const box = await contentBox(input);
  if (!box) return { ok: false, reason: "no-content" };

  // Already filled enough (like iPhone 11) — light normalize only
  const extracted = await sharp(input).extract(box).ensureAlpha().png().toBuffer();

  const meta = await sharp(extracted).metadata();
  const cw = meta.width || 1;
  const ch = meta.height || 1;
  const target = Math.round(SIZE * FILL);
  const scale = Math.min(target / cw, target / ch);
  const nw = Math.max(1, Math.round(cw * scale));
  const nh = Math.max(1, Math.round(ch * scale));

  const out = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(extracted).resize(nw, nh, { fit: "fill" }).png().toBuffer(),
        left: Math.round((SIZE - nw) / 2),
        top: Math.round((SIZE - nh) / 2),
      },
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();

  fs.writeFileSync(srcPath, out);

  // Keep matching jpg for fallbacks
  const jpg = file.replace(/\.png$/i, ".jpg");
  await sharp(out)
    .flatten({ background: "#0a0818" })
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, jpg));

  return { ok: true, before: Math.round(box.fill * 100), after: Math.round(((nw * nh) / (SIZE * SIZE)) * 100) };
}

async function main() {
  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".png"))
    .sort();

  let ok = 0;
  let skip = 0;
  for (const file of files) {
    try {
      const r = await normalizeFile(file);
      if (!r.ok) {
        console.log(`SKIP ${file} (${r.reason})`);
        skip += 1;
        continue;
      }
      console.log(`OK   ${file.padEnd(34)} fill ${r.before}% → ${r.after}%`);
      ok += 1;
    } catch (e) {
      console.log(`FAIL ${file}: ${e.message}`);
      skip += 1;
    }
  }
  console.log(`\nNormalized ${ok} images, ${skip} skipped/failed.`);
}

main();
