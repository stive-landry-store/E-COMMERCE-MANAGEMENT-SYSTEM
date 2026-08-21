/**
 * Restore COMPLETE full-frame HD product images (no cropping).
 * Run: node scripts/restore-complete-product-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
fs.mkdirSync(outDir, { recursive: true });

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function apple(id, region = "4982", fmt = "jpeg") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=${fmt}&qlt=95`;
}
function apple1(id, fmt = "jpeg") {
  return `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=${fmt}&qlt=95`;
}

/** Complete product heroes — full frame, no crop. */
const catalog = {
  "iphone-7.png": [apple("iphone7-black-select-2016"), apple("iphone7-black-select-2016", "4982", "png-alpha")],
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
  "iphone-12-pro.png": [apple("iphone-12-pro-blue-hero"), path.join(outDir, "iphone-12-pro.jpg")],
  "iphone-12-pro-max.png": [apple("iphone-12-pro-max-blue-hero"), path.join(outDir, "iphone-12-pro-max.jpg")],
  "iphone-13-mini.png": [apple("iphone-13-mini-blue-select-2021")],
  "iphone-13.png": [apple("iphone-13-blue-select-2021")],
  "iphone-13-pro.png": [
    apple("iphone-13-pro-sierra-blue-select"),
    apple("iphone-13-pro-finish-select-202207-6-1inch-sierrablue"),
    path.join(outDir, "iphone-13-pro.jpg"),
  ],
  "iphone-13-pro-max.png": [
    apple("iphone-13-pro-max-graphite-select"),
    path.join(outDir, "iphone-13-pro-max.jpg"),
  ],
  "iphone-14.png": [apple("iphone-14-finish-select-202209-6-1inch-midnight"), path.join(outDir, "iphone-14.jpg")],
  "iphone-14-plus.png": [
    apple("iphone-14-plus-finish-select-202209-6-7inch-blue"),
    apple("iphone-14-finish-select-202209-6-1inch-blue"),
    path.join(outDir, "iphone-14-plus.jpg"),
  ],
  "iphone-14-pro.png": [
    apple("iphone-14-pro-finish-select-202209-6-1inch-deeppurple"),
    path.join(outDir, "iphone-14-pro.jpg"),
  ],
  "iphone-14-pro-max.png": [
    apple("iphone-14-pro-finish-select-202209-6-7inch-deeppurple"),
    path.join(outDir, "iphone-14-pro-max.jpg"),
  ],
  "iphone-15.png": [apple("iphone-15-finish-select-202309-6-1inch-blue"), path.join(outDir, "iphone-15.jpg")],
  "iphone-15-plus.png": [apple("iphone-15-finish-select-202309-6-7inch-pink"), path.join(outDir, "iphone-15-plus.jpg")],
  "iphone-15-pro.png": [
    apple("iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium"),
    path.join(outDir, "iphone-15-pro.jpg"),
  ],
  "iphone-15-pro-max.png": [
    apple("iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium"),
    path.join(outDir, "iphone-15-pro-max.jpg"),
  ],
  "iphone-16.png": [apple1("iphone-16-finish-select-202409-6-1inch-ultramarine"), path.join(outDir, "iphone-16.jpg")],
  "iphone-16-plus.png": [
    apple1("iphone-16-finish-select-202409-6-7inch-teal"),
    path.join(outDir, "iphone-16-plus.jpg"),
  ],
  "iphone-16-pro.png": [
    apple1("iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium"),
    path.join(outDir, "iphone-16-pro.jpg"),
  ],
  "iphone-16-pro-max.png": [
    apple1("iphone-16-pro-finish-select-202409-6-9inch-deserttitanium"),
    path.join(outDir, "iphone-16-pro-max.jpg"),
  ],
  "iphone-16e.png": [apple1("iphone-16-finish-select-202409-6-1inch-black"), path.join(outDir, "iphone-16e.jpg")],
  "iphone-17.png": [apple1("iphone-16-finish-select-202409-6-1inch-pink"), path.join(outDir, "iphone-17.jpg")],
  "iphone-17e.png": [apple1("iphone-16-finish-select-202409-6-1inch-white"), path.join(outDir, "iphone-17e.jpg")],
  "iphone-air.png": [
    apple1("iphone-16-pro-finish-select-202409-6-3inch-whitetitanium"),
    path.join(outDir, "iphone-air.jpg"),
  ],
  "iphone-17-pro.png": [
    apple1("iphone-16-pro-finish-select-202409-6-3inch-blacktitanium"),
    path.join(outDir, "iphone-17-pro.jpg"),
  ],
  "iphone-17-pro-max.png": [
    apple1("iphone-16-pro-finish-select-202409-6-9inch-blacktitanium"),
    path.join(outDir, "iphone-17-pro-max.jpg"),
  ],
  "ipad-9.png": [apple("ipad-2021-hero-space-wifi-select"), path.join(outDir, "ipad-9.jpg")],
  "ipad-10.png": [apple("ipad-10th-gen-finish-select-202212-blue-wifi"), path.join(outDir, "ipad-10.jpg")],
  "ipad-a16.png": [apple("ipad-10th-gen-finish-select-202212-blue-wifi"), path.join(outDir, "ipad-a16.jpg")],
  "ipad-pro-11-m4.png": [
    apple1("ipad-pro-11-select-wifi-spaceblack-202405"),
    path.join(outDir, "ipad-pro-11-m4.jpg"),
  ],
  "ipad-pro-13-m4.png": [
    apple1("ipad-pro-13-select-wifi-spaceblack-202405"),
    path.join(outDir, "ipad-pro-13-m4.jpg"),
  ],
};

async function load(src) {
  if (typeof src === "string" && src.startsWith("http")) {
    const res = await fetch(src, {
      headers: { "User-Agent": ua, Accept: "image/*", Referer: "https://www.apple.com/" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) throw new Error("small");
    return buf;
  }
  if (!fs.existsSync(src)) throw new Error("missing");
  return fs.readFileSync(src);
}

/** Full frame → PNG with light studio bg made transparent. No cropping. */
async function toFullPng(input) {
  const { data, info } = await sharp(input)
    .resize({ width: 1600, height: 1600, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = data;
  const visited = new Uint8Array(w * h);
  const q = [];

  const isBg = (i) => {
    const o = i * 4;
    if (px[o + 3] < 8) return true;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // only pure / near-white studio backdrop (keep dark product areas)
    return min >= 235 && max - min <= 20;
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
    .png({ compressionLevel: 8 })
    .toBuffer();
}

async function main() {
  // Priority first
  const priority = ["iphone-13-pro.png", "iphone-14-plus.png"];
  const rest = Object.keys(catalog).filter((k) => !priority.includes(k));
  const order = [...priority, ...rest];

  let ok = 0;
  let fail = 0;
  for (const name of order) {
    const sources = catalog[name];
    let done = false;
    for (const src of sources) {
      try {
        const raw = await load(src);
        const out = await toFullPng(raw);
        fs.writeFileSync(path.join(outDir, name), out);
        // also refresh jpg fallback for complete view
        const jpgName = name.replace(/\.png$/, ".jpg");
        await sharp(raw)
          .resize({ width: 1600, height: 1600, fit: "contain", background: "#ffffff" })
          .jpeg({ quality: 92 })
          .toFile(path.join(outDir, jpgName));
        console.log(`OK   ${name.padEnd(28)} ${Math.round(out.length / 1024)} KB`);
        ok += 1;
        done = true;
        break;
      } catch {
        // next source
      }
    }
    if (!done) {
      console.log(`FAIL ${name}`);
      fail += 1;
    }
  }
  console.log(`\nDone: ${ok} complete images, ${fail} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
