// Builds small WebP thumbnails (480px) used by product cards: public/products/thumb/<name>.webp
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "public/products";
const OUT = path.join(SRC, "thumb");
fs.mkdirSync(OUT, { recursive: true });

const byStem = new Map();
for (const f of fs.readdirSync(SRC)) {
  const m = f.match(/^(.*)\.(webp|png|jpe?g)$/i);
  if (!m) continue;
  const rank = { webp: 0, png: 1, jpg: 2, jpeg: 2 }[m[2].toLowerCase()];
  const prev = byStem.get(m[1]);
  if (!prev || rank < prev.rank) byStem.set(m[1], { file: f, rank });
}

let n = 0;
let bytes = 0;
for (const [stem, { file }] of byStem) {
  const out = path.join(OUT, `${stem}.webp`);
  const buf = await sharp(path.join(SRC, file), { failOn: "none" })
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toBuffer();
  fs.writeFileSync(out, buf);
  n++;
  bytes += buf.length;
}
console.log(`${n} thumbnails, ${(bytes / 1e6).toFixed(1)} MB total, avg ${Math.round(bytes / n / 1024)} KB`);
