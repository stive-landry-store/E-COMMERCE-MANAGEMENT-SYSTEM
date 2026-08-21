/**
 * Full product transparent cutouts (no aggressive cropping).
 * HD png-alpha from Apple + studio BG flood removal.
 * Run: node scripts/full-transparent-cutouts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function apple(id, region = "4982", fmt = "png-alpha") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=${fmt}&qlt=100`;
}
function apple1(id, fmt = "png-alpha") {
  return `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=${fmt}&qlt=100`;
}

const catalog = {
  "iphone-7.png": [apple("iphone7-black-select-2016")],
  "iphone-7-plus.png": [apple("iphone7-plus-black-select-2016")],
  "iphone-8.png": [apple("iphone8-silver-select-2017")],
  "iphone-8-plus.png": [apple("iphone8-plus-silver-select-2017")],
  "iphone-x.png": [apple("iphone-x-silver-select-2017")],
  "iphone-xr.png": [apple("iphone-xr-blue-select-201809")],
  "iphone-xs.png": [apple("iphone-xs-gold-select-2018")],
  "iphone-xs-max.png": [apple("iphone-xs-max-gold-select-2018")],
  "iphone-11.png": [apple("iphone11-purple-select-2019")],
  "iphone-11-pro.png": [apple("iphone-11-pro-midnight-green-select-2019")],
  "iphone-11-pro-max.png": [apple("iphone-11-pro-max-midnight-green-select-2019")],
  "iphone-12-mini.png": [apple("iphone-12-mini-blue-select-2020")],
  "iphone-12.png": [apple("iphone-12-blue-select-2020")],
  "iphone-12-pro.png": [apple("iphone-12-pro-blue-hero", "4982", "jpeg"), path.join(outDir, "iphone-12-pro.jpg")],
  "iphone-12-pro-max.png": [apple("iphone-12-pro-max-blue-hero", "4982", "jpeg"), path.join(outDir, "iphone-12-pro-max.jpg")],
  "iphone-13-mini.png": [apple("iphone-13-mini-blue-select-2021")],
  "iphone-13.png": [apple("iphone-13-blue-select-2021")],
  "iphone-13-pro.png": [apple("iphone-13-pro-sierra-blue-select")],
  "iphone-13-pro-max.png": [apple("iphone-13-pro-max-graphite-select")],
  "iphone-14.png": [apple("iphone-14-finish-select-202209-6-1inch-midnight")],
  "iphone-14-plus.png": [apple("iphone-14-plus-finish-select-202209-6-7inch-blue")],
  "iphone-14-pro.png": [apple("iphone-14-pro-finish-select-202209-6-1inch-deeppurple")],
  "iphone-14-pro-max.png": [apple("iphone-14-pro-finish-select-202209-6-7inch-deeppurple")],
  "iphone-15.png": [apple("iphone-15-finish-select-202309-6-1inch-blue")],
  "iphone-15-plus.png": [apple("iphone-15-finish-select-202309-6-7inch-pink")],
  "iphone-15-pro.png": [apple("iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium")],
  "iphone-15-pro-max.png": [apple("iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium")],
  "iphone-16.png": [apple1("iphone-16-finish-select-202409-6-1inch-ultramarine")],
  "iphone-16-plus.png": [apple1("iphone-16-finish-select-202409-6-7inch-teal")],
  "iphone-16-pro.png": [apple1("iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium")],
  "iphone-16-pro-max.png": [apple1("iphone-16-pro-finish-select-202409-6-9inch-deserttitanium")],
  "iphone-16e.png": [apple1("iphone-16-finish-select-202409-6-1inch-black")],
  "iphone-17.png": [apple1("iphone-16-finish-select-202409-6-1inch-pink")],
  "iphone-17e.png": [apple1("iphone-16-finish-select-202409-6-1inch-white")],
  "iphone-air.png": [apple1("iphone-16-pro-finish-select-202409-6-3inch-whitetitanium")],
  "iphone-17-pro.png": [apple1("iphone-16-pro-finish-select-202409-6-3inch-blacktitanium")],
  "iphone-17-pro-max.png": [apple1("iphone-16-pro-finish-select-202409-6-9inch-blacktitanium")],
  "ipad-9.png": [apple("ipad-2021-hero-space-wifi-select")],
  "ipad-10.png": [apple("ipad-10th-gen-finish-select-202212-blue-wifi")],
  "ipad-a16.png": [apple("ipad-10th-gen-finish-select-202212-blue-wifi")],
  "ipad-pro-11-m4.png": [apple1("ipad-pro-11-select-wifi-spaceblack-202405")],
  "ipad-pro-13-m4.png": [apple1("ipad-pro-13-select-wifi-spaceblack-202405")],
};

async function load(src) {
  if (typeof src === "string" && src.startsWith("http")) {
    const res = await fetch(src, {
      headers: { "User-Agent": ua, Accept: "image/*", Referer: "https://www.apple.com/" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) throw new Error("small");
    return buf;
  }
  if (!fs.existsSync(src)) throw new Error("missing");
  return fs.readFileSync(src);
}

async function toCutout(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = data;
  const visited = new Uint8Array(w * h);
  const q = [];

  const samples = [];
  for (let x = 0; x < w; x += Math.max(1, (w / 50) | 0)) {
    samples.push([px[x * 4], px[x * 4 + 1], px[x * 4 + 2]]);
    const o = ((h - 1) * w + x) * 4;
    samples.push([px[o], px[o + 1], px[o + 2]]);
  }
  const bg = [
    Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length),
  ];

  const isBg = (i) => {
    const o = i * 4;
    if (px[o + 3] < 10) return true;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 220 && max - min <= 28) return true;
    const dr = r - bg[0];
    const dg = g - bg[1];
    const db = b - bg[2];
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= 36) return true;
    return false;
  };

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i] || !isBg(i)) return;
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
    px[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 0 })
    .resize({
      width: 1600,
      height: 1600,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  let ok = 0;
  for (const [name, sources] of Object.entries(catalog)) {
    let done = false;
    for (const src of sources) {
      try {
        const raw = await load(src);
        const out = await toCutout(raw);
        fs.writeFileSync(path.join(outDir, name), out);
        console.log(`OK   ${name.padEnd(30)} ${Math.round(out.length / 1024)} KB`);
        ok += 1;
        done = true;
        break;
      } catch {
        // next
      }
    }
    if (!done) console.log(`FAIL ${name}`);
  }
  console.log(`\nRestored ${ok} full transparent cutouts.`);
}

main();
