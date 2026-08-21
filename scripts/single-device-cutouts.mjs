/**
 * Prefer single-device appledb cutouts; trim empty transparent padding.
 * Run: node scripts/single-device-cutouts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function apple(id) {
  return `https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`;
}
function apple1(id) {
  return `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`;
}
function appledb(key, color) {
  return [
    `https://img.appledb.dev/device@1024/${key}/${encodeURIComponent(color)}.png`,
    `https://img.appledb.dev/device@512/${key}/${encodeURIComponent(color)}.png`,
  ];
}

/** Single-device sources preferred (appledb first). */
const singles = {
  "iphone-7.png": [...appledb("iPhone9,3", "Black"), apple("iphone7-black-select-2016")],
  "iphone-7-plus.png": [...appledb("iPhone9,4", "Black"), apple("iphone7-plus-black-select-2016")],
  "iphone-8.png": [...appledb("iPhone10,1", "Silver"), apple("iphone8-silver-select-2017")],
  "iphone-8-plus.png": [...appledb("iPhone10,2", "Silver"), apple("iphone8-plus-silver-select-2017")],
  "iphone-x.png": [...appledb("iPhone10,6", "Silver"), apple("iphone-x-silver-select-2017")],
  "iphone-xr.png": [...appledb("iPhone11,8", "Blue"), apple("iphone-xr-blue-select-201809")],
  "iphone-xs.png": [...appledb("iPhone11,2", "Gold"), apple("iphone-xs-gold-select-2018")],
  "iphone-xs-max.png": [...appledb("iPhone11,6", "Gold"), apple("iphone-xs-max-gold-select-2018")],
  "iphone-11.png": [...appledb("iPhone12,1", "Purple"), apple("iphone11-purple-select-2019")],
  "iphone-11-pro.png": [
    ...appledb("iPhone12,3", "Midnight Green"),
    apple("iphone-11-pro-midnight-green-select-2019"),
  ],
  "iphone-11-pro-max.png": [
    ...appledb("iPhone12,5", "Midnight Green"),
    apple("iphone-11-pro-max-midnight-green-select-2019"),
  ],
  "iphone-12-mini.png": [...appledb("iPhone13,1", "Blue"), apple("iphone-12-mini-blue-select-2020")],
  "iphone-12.png": [...appledb("iPhone13,2", "Blue"), apple("iphone-12-blue-select-2020")],
  "iphone-12-pro.png": [...appledb("iPhone13,3", "Pacific Blue")],
  "iphone-12-pro-max.png": [...appledb("iPhone13,4", "Pacific Blue")],
  "iphone-13-mini.png": [...appledb("iPhone14,4", "Blue"), apple("iphone-13-mini-blue-select-2021")],
  "iphone-13.png": [...appledb("iPhone14,5", "Blue"), apple("iphone-13-blue-select-2021")],
  "iphone-13-pro.png": [
    ...appledb("iPhone14,2", "Sierra Blue"),
    apple("iphone-13-pro-sierra-blue-select"),
  ],
  "iphone-13-pro-max.png": [
    ...appledb("iPhone14,3", "Graphite"),
    apple("iphone-13-pro-max-graphite-select"),
  ],
  "iphone-14.png": [...appledb("iPhone14,7", "Midnight")],
  "iphone-14-plus.png": [...appledb("iPhone14,8", "Blue")],
  "iphone-14-pro.png": [...appledb("iPhone15,2", "Deep Purple")],
  "iphone-14-pro-max.png": [...appledb("iPhone15,3", "Deep Purple")],
  "iphone-15.png": [...appledb("iPhone15,4", "Blue")],
  "iphone-15-plus.png": [...appledb("iPhone15,5", "Pink")],
  "iphone-15-pro.png": [...appledb("iPhone16,1", "Natural Titanium")],
  "iphone-15-pro-max.png": [...appledb("iPhone16,2", "Natural Titanium")],
  "iphone-16.png": [...appledb("iPhone17,3", "Ultramarine")],
  "iphone-16-plus.png": [...appledb("iPhone17,4", "Teal")],
  "iphone-16-pro.png": [...appledb("iPhone17,1", "Natural Titanium")],
  "iphone-16-pro-max.png": [...appledb("iPhone17,2", "Desert Titanium")],
  "iphone-16e.png": [...appledb("iPhone17,5", "Black"), apple1("iphone-16-finish-select-202409-6-1inch-black")],
};

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": ua, Accept: "image/png,*/*", Referer: "https://www.apple.com/" },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 3000) throw new Error("small");
  return buf;
}

async function processCutout(raw) {
  const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = data;
  const visited = new Uint8Array(w * h);
  const q = [];
  const isBg = (i) => {
    const o = i * 4;
    if (px[o + 3] < 12) return true;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 200 && max - min <= 40;
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
    const x = i % w;
    const y = (i / w) | 0;
    px[i * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 0 })
    .resize({ width: 1600, height: 1600, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  // 1) Prefer single-device sources for phones
  for (const [name, urls] of Object.entries(singles)) {
    let done = false;
    for (const url of urls) {
      try {
        const raw = await fetchBuf(url);
        const out = await processCutout(raw);
        fs.writeFileSync(path.join(outDir, name), out);
        console.log(`OK   ${name.padEnd(28)} ${Math.round(out.length / 1024)} KB  <- ${url.includes("appledb") ? "appledb" : "apple"}`);
        done = true;
        break;
      } catch {
        // next
      }
    }
    if (!done) console.log(`KEEP ${name} (existing)`);
  }

  // 2) Trim all existing PNG cutouts for tighter product framing
  const pngs = fs.readdirSync(outDir).filter((f) => f.endsWith(".png"));
  let trimmed = 0;
  for (const f of pngs) {
    try {
      const p = path.join(outDir, f);
      const buf = await sharp(p)
        .trim({ threshold: 0 })
        .resize({ width: 1600, height: 1600, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(p, buf);
      trimmed += 1;
    } catch {
      // skip
    }
  }
  console.log(`\nTrimmed/normalized ${trimmed} PNG cutouts to 1600x1600 transparent canvas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
