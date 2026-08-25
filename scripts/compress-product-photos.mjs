/**
 * Compress product + category photos to high-quality WebP (visually lossless).
 * Keeps originals if WebP is not smaller.
 *
 *   node scripts/compress-product-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = [path.join(ROOT, "public", "products"), path.join(ROOT, "public", "categories")];
const MAX_EDGE = 1800;
const WEBP_QUALITY = 88;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((name) => /\.(png|jpe?g)$/i.test(name) && !name.startsWith("."));
  const hasPng = new Set(
    names.filter((name) => /\.png$/i.test(name)).map((name) => name.replace(/\.png$/i, "").toLowerCase()),
  );
  return names
    .filter((name) => {
      if (!/\.jpe?g$/i.test(name)) return true;
      const stem = name.replace(/\.jpe?g$/i, "").toLowerCase();
      return !hasPng.has(stem);
    })
    .map((name) => path.join(dir, name));
}

async function compressOne(src) {
  const dest = src.replace(/\.(png|jpe?g)$/i, ".webp");
  const input = fs.readFileSync(src);
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const w = meta.width || MAX_EDGE;
  const h = meta.height || MAX_EDGE;

  let pipeline = sharp(input, { failOn: "none", sequentialRead: true }).rotate();
  if (Math.max(w, h) > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  }

  const webp = await pipeline
    .webp({
      quality: WEBP_QUALITY,
      alphaQuality: 90,
      smartSubsample: true,
      effort: 5,
    })
    .toBuffer();

  const origKb = input.length / 1024;
  const newKb = webp.length / 1024;
  if (webp.length >= input.length * 0.95) {
    return { skipped: true, src, origKb, newKb };
  }

  fs.writeFileSync(dest, webp);
  return { skipped: false, src, dest, origKb, newKb };
}

async function main() {
  const files = DIRS.flatMap(listImages);
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  let before = 0;
  let after = 0;

  console.log(`Compressing ${files.length} images → WebP q${WEBP_QUALITY}, max ${MAX_EDGE}px\n`);

  for (const src of files) {
    try {
      const r = await compressOne(src);
      before += r.origKb;
      after += r.skipped ? r.origKb : r.newKb;
      if (r.skipped) {
        skipped += 1;
        console.log(`KEEP  ${path.basename(src)}  ${r.origKb.toFixed(0)}KB (webp not smaller)`);
      } else {
        saved += 1;
        const pct = Math.round((1 - r.newKb / r.origKb) * 100);
        console.log(
          `OK    ${path.basename(src)}  ${r.origKb.toFixed(0)}KB → ${r.newKb.toFixed(0)}KB  (−${pct}%)`,
        );
      }
    } catch (err) {
      failed += 1;
      console.log(`FAIL  ${path.basename(src)}  ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `\nDone. webp=${saved} keep=${skipped} fail=${failed}. ${ (before / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(1)}MB transferred if all webp used.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
