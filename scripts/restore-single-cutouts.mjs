/**
 * Restore phone/iPad cutouts from HD JPGs (or Apple CDN), remove studio BG,
 * and for dual front/back heroes keep only the left (rear) device cleanly.
 * Run: node scripts/restore-single-cutouts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const dualSlugs = [
  "iphone-7", "iphone-7-plus", "iphone-8", "iphone-8-plus", "iphone-x", "iphone-xr",
  "iphone-xs", "iphone-xs-max", "iphone-11", "iphone-11-pro", "iphone-11-pro-max",
  "iphone-12", "iphone-12-mini", "iphone-12-pro", "iphone-12-pro-max",
  "iphone-13", "iphone-13-mini", "iphone-13-pro", "iphone-13-pro-max",
  "iphone-14", "iphone-14-plus", "iphone-14-pro", "iphone-14-pro-max",
  "iphone-15", "iphone-15-plus", "iphone-15-pro", "iphone-15-pro-max",
  "iphone-16", "iphone-16-plus", "iphone-16-pro", "iphone-16-pro-max", "iphone-16e",
  "iphone-17", "iphone-17e", "iphone-air", "iphone-17-pro", "iphone-17-pro-max",
  "ipad-9", "ipad-10", "ipad-a16", "ipad-pro-11-m4", "ipad-pro-13-m4",
];

const appleIds = {
  "iphone-7": "iphone7-black-select-2016",
  "iphone-7-plus": "iphone7-plus-black-select-2016",
  "iphone-8": "iphone8-silver-select-2017",
  "iphone-8-plus": "iphone8-plus-silver-select-2017",
  "iphone-x": "iphone-x-silver-select-2017",
  "iphone-xr": "iphone-xr-blue-select-201809",
  "iphone-xs": "iphone-xs-gold-select-2018",
  "iphone-xs-max": "iphone-xs-max-gold-select-2018",
  "iphone-11": "iphone11-purple-select-2019",
  "iphone-11-pro": "iphone-11-pro-midnight-green-select-2019",
  "iphone-11-pro-max": "iphone-11-pro-max-midnight-green-select-2019",
  "iphone-12": "iphone-12-blue-select-2020",
  "iphone-12-mini": "iphone-12-mini-blue-select-2020",
  "iphone-12-pro": "iphone-12-pro-blue-hero",
  "iphone-12-pro-max": "iphone-12-pro-max-blue-hero",
  "iphone-13": "iphone-13-blue-select-2021",
  "iphone-13-mini": "iphone-13-mini-blue-select-2021",
  "iphone-13-pro": "iphone-13-pro-sierra-blue-select",
  "iphone-13-pro-max": "iphone-13-pro-max-graphite-select",
  "iphone-14": "iphone-14-finish-select-202209-6-1inch-midnight",
  "iphone-14-plus": "iphone-14-plus-finish-select-202209-6-7inch-blue",
  "iphone-14-pro": "iphone-14-pro-finish-select-202209-6-1inch-deeppurple",
  "iphone-14-pro-max": "iphone-14-pro-finish-select-202209-6-7inch-deeppurple",
  "iphone-15": "iphone-15-finish-select-202309-6-1inch-blue",
  "iphone-15-plus": "iphone-15-finish-select-202309-6-7inch-pink",
  "iphone-15-pro": "iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium",
  "iphone-15-pro-max": "iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium",
  "iphone-16": "iphone-16-finish-select-202409-6-1inch-ultramarine",
  "iphone-16-plus": "iphone-16-finish-select-202409-6-7inch-teal",
  "iphone-16-pro": "iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium",
  "iphone-16-pro-max": "iphone-16-pro-finish-select-202409-6-9inch-deserttitanium",
  "iphone-16e": "iphone-16-finish-select-202409-6-1inch-black",
  "iphone-17": "iphone-16-finish-select-202409-6-1inch-pink",
  "iphone-17e": "iphone-16-finish-select-202409-6-1inch-white",
  "iphone-air": "iphone-16-pro-finish-select-202409-6-3inch-whitetitanium",
  "iphone-17-pro": "iphone-16-pro-finish-select-202409-6-3inch-blacktitanium",
  "iphone-17-pro-max": "iphone-16-pro-finish-select-202409-6-9inch-blacktitanium",
  "ipad-9": "ipad-2021-hero-space-wifi-select",
  "ipad-10": "ipad-10th-gen-finish-select-202212-blue-wifi",
  "ipad-a16": "ipad-10th-gen-finish-select-202212-blue-wifi",
  "ipad-pro-11-m4": "ipad-pro-11-select-wifi-spaceblack-202405",
  "ipad-pro-13-m4": "ipad-pro-13-select-wifi-spaceblack-202405",
};

function appleUrl(id) {
  // try region 1 then 4982
  return [
    `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`,
    `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`,
    `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=jpeg&qlt=95`,
  ];
}

async function loadSource(slug) {
  const jpg = path.join(outDir, `${slug}.jpg`);
  const id = appleIds[slug];
  const urls = id ? appleUrl(id) : [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": ua, Accept: "image/*", Referer: "https://www.apple.com/" },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8000) return buf;
    } catch {
      // next
    }
  }
  if (fs.existsSync(jpg)) return fs.readFileSync(jpg);
  throw new Error("no source");
}

async function removeStudioBg(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = data;
  const visited = new Uint8Array(w * h);
  const q = [];

  // sample border color
  const samples = [];
  for (let x = 0; x < w; x += Math.max(1, (w / 60) | 0)) {
    samples.push([px[x * 4], px[x * 4 + 1], px[x * 4 + 2]]);
    const o = ((h - 1) * w + x) * 4;
    samples.push([px[o], px[o + 1], px[o + 2]]);
  }
  const bg = [
    Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length),
    Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length),
  ];

  const dist = (i) => {
    const o = i * 4;
    const dr = px[o] - bg[0];
    const dg = px[o + 1] - bg[1];
    const db = px[o + 2] - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const isBg = (i) => {
    if (px[i * 4 + 3] < 8) return true;
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // light studio OR close to sampled border color
    if (min >= 225 && max - min <= 30) return true;
    if (dist(i) <= 38) return true;
    // near-black studio void used by some heroes after conversion
    if (max <= 18) return true;
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

  return { data: px, width: w, height: h };
}

async function keepLeftDevice(rawImg) {
  const { data, width: w, height: h } = await removeStudioBg(rawImg);

  // opacity column sums
  const cols = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 20) c += 1;
    cols[x] = c;
  }

  let minX = 0;
  let maxX = w - 1;
  while (minX < w && cols[minX] < 2) minX += 1;
  while (maxX > minX && cols[maxX] < 2) maxX -= 1;
  const contentW = maxX - minX + 1;

  // Find deepest valley in middle of content (gap between two phones)
  let gapX = minX + Math.floor(contentW / 2);
  let best = Infinity;
  const from = minX + Math.floor(contentW * 0.32);
  const to = minX + Math.floor(contentW * 0.68);
  for (let x = from; x <= to; x++) {
    // smooth a bit
    const v = cols[x - 1] + cols[x] + cols[x + 1];
    if (v < best) {
      best = v;
      gapX = x;
    }
  }

  // If no clear valley, use geometric left half of the pair
  const avg = cols.slice(minX, maxX + 1).reduce((a, b) => a + b, 0) / contentW;
  const hasGap = best < avg * 0.35 * 3;
  if (!hasGap) gapX = minX + Math.floor(contentW * 0.48);

  // left device bounds
  let left = minX;
  let right = gapX;
  // tighten right edge: walk left while almost empty
  while (right > left + 40 && cols[right] < avg * 0.08) right -= 1;

  let minY = 0;
  let maxY = h - 1;
  for (let y = 0; y < h; y++) {
    let any = false;
    for (let x = left; x <= right; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        any = true;
        break;
      }
    }
    if (any) {
      minY = y;
      break;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    let any = false;
    for (let x = left; x <= right; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        any = true;
        break;
      }
    }
    if (any) {
      maxY = y;
      break;
    }
  }

  const cropW = Math.max(50, right - left + 1);
  const cropH = Math.max(50, maxY - minY + 1);

  // extract from raw buffer
  const cropped = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((minY + y) * w + (left + x)) * 4;
      const di = (y * cropW + x) * 4;
      cropped[di] = data[si];
      cropped[di + 1] = data[si + 1];
      cropped[di + 2] = data[si + 2];
      cropped[di + 3] = data[si + 3];
    }
  }

  return sharp(cropped, { raw: { width: cropW, height: cropH, channels: 4 } })
    .trim({ threshold: 0 })
    .resize({
      width: 1400,
      height: 1400,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  for (const slug of dualSlugs) {
    try {
      const src = await loadSource(slug);
      const out = await keepLeftDevice(src);
      fs.writeFileSync(path.join(outDir, `${slug}.png`), out);
      console.log(`OK   ${slug}.png  ${Math.round(out.length / 1024)} KB`);
    } catch (e) {
      console.log(`FAIL ${slug}: ${e.message}`);
    }
  }
}

main();
