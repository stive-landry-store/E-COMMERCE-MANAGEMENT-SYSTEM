/**
 * Aggressive cutout: sample border color and remove similar pixels (handles gray/dark studio BGs).
 * Run: node scripts/improve-cutouts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");

const targets = [
  "mac-pro-2023.png",
  "ipad-air-m2-11.png",
  "ipad-air-m2-13.png",
  "ipad-air-m3-11.png",
  "smart-folio-ipad.png",
  "ipad-pro-11-m4.png",
  "ipad-pro-13-m4.png",
  "iphone-11.png",
  "iphone-11-pro.png",
  "iphone-11-pro-max.png",
  "apple-watch-ultra-2.png",
  "apple-watch-ultra-3.png",
  "ipad-mini-a17-pro.png",
];

function colorDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function cutoutByBorder(file) {
  const input = fs.readFileSync(path.join(outDir, file));
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = data;

  // Sample border pixels for background color
  const samples = [];
  const sample = (x, y) => {
    const o = (y * w + x) * 4;
    samples.push([px[o], px[o + 1], px[o + 2]]);
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 80))) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 80))) {
    sample(0, y);
    sample(w - 1, y);
  }
  const bg = [
    Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length),
  ];

  const threshold = 42;
  const visited = new Uint8Array(w * h);
  const q = [];
  const isBg = (i) => {
    const o = i * 4;
    if (px[o + 3] < 10) return true;
    return colorDist([px[o], px[o + 1], px[o + 2]], bg) <= threshold;
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    if (!isBg(i)) return;
    visited[i] = 1;
    q.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  let qi = 0;
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % w;
    const y = (i / w) | 0;
    px[i * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let cleared = 0;
  for (let i = 0; i < visited.length; i++) if (visited[i]) cleared += 1;

  // Trim transparent edges for a tighter product-only frame
  const buf = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 0 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(outDir, file), buf);
  return { ratio: cleared / (w * h), kb: Math.round(buf.length / 1024), bg };
}

async function main() {
  for (const file of targets) {
    if (!fs.existsSync(path.join(outDir, file))) {
      console.log(`SKIP ${file}`);
      continue;
    }
    try {
      const r = await cutoutByBorder(file);
      console.log(
        `OK   ${file.padEnd(34)} ${String(r.kb).padStart(5)} KB  α=${Math.round(r.ratio * 100)}%  bg=rgb(${r.bg.join(",")})`,
      );
    } catch (e) {
      console.log(`FAIL ${file}: ${e.message}`);
    }
  }

  // Rewrite seed image paths jpg → png cutout
  const seedPath = path.join(__dirname, "..", "supabase", "seed_apple_catalog.sql");
  let seed = fs.readFileSync(seedPath, "utf8");
  const next = seed.replace(/\/products\/([^'"?]+)\.jpe?g(\?v=[^']*)?/g, "/products/$1.png?v=cutout");
  if (next !== seed) {
    fs.writeFileSync(seedPath, next);
    console.log("\nSeed updated to .png?v=cutout");
  } else {
    console.log("\nSeed already using png cutouts (or no jpg paths)");
  }
}

main();
