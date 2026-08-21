/**
 * Fix remaining failed cutouts + reprocess low-alpha dual-hero shots.
 * Run: node scripts/fix-cutout-failures.mjs
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
function appledb(key, color) {
  return `https://img.appledb.dev/device@1024/${key}/${encodeURIComponent(color)}.png`;
}
function local(name) {
  return path.join(outDir, name);
}

const jobs = {
  "iphone-12-pro.png": [
    apple("iphone-12-pro-blue-hero", "4982", "jpeg"),
    appledb("iPhone13,3", "Pacific Blue"),
    local("iphone-12-pro.jpg"),
  ],
  "iphone-12-pro-max.png": [
    apple("iphone-12-pro-max-blue-hero", "4982", "jpeg"),
    appledb("iPhone13,4", "Pacific Blue"),
    local("iphone-12-pro-max.jpg"),
  ],
  "mac-pro-2023.png": [
    apple("mac-pro-2019-gallery-1", "4982", "jpeg"),
    local("mac-pro-2023.jpg"),
  ],
  "ipad-air-m2-11.png": [
    apple1("ipad-air-select-wifi-blue-202405", "jpeg"),
    apple("ipad-air-select-wifi-blue-202203", "4982", "jpeg"),
    local("ipad-air-m2-11.jpg"),
    local("ipad-10.png"),
  ],
  "ipad-air-m2-13.png": [
    apple1("ipad-air-13-select-wifi-blue-202405", "jpeg"),
    local("ipad-air-m2-13.jpg"),
    local("ipad-pro-13-m4.png"),
  ],
  "ipad-air-m3-11.png": [
    apple1("ipad-air-select-wifi-blue-202503", "jpeg"),
    apple1("ipad-air-select-wifi-blue-202405", "jpeg"),
    local("ipad-air-m3-11.jpg"),
    local("ipad-10.png"),
  ],
  "apple-watch-ultra-2.png": [
    apple("watch-ultra2-nav-202309", "4982", "jpeg"),
    apple("watch-case-49-titanium-orange-ultra2_VW_PF", "4982", "jpeg"),
    local("apple-watch-ultra-2.jpg"),
  ],
  "apple-watch-ultra-3.png": [
    apple1("watch-case-49-titanium-natural-ultra3", "jpeg"),
    apple("watch-ultra2-nav-202309", "4982", "jpeg"),
    local("apple-watch-ultra-3.jpg"),
  ],
  "apple-pencil-usb-c.png": [
    apple("MUW33", "4982", "jpeg"),
    apple("apple-pencil-usb-c-202310", "4982", "jpeg"),
    local("apple-pencil-usb-c.jpg"),
  ],
  "apple-pencil-pro.png": [
    apple1("apple-pencil-pro-202405", "jpeg"),
    apple("MUW33", "4982", "jpeg"),
    local("apple-pencil-pro.jpg"),
  ],
  "magic-keyboard.png": [
    apple("MK2A3", "4982", "jpeg"),
    apple("magic-keyboard-numeric-us-english", "4982", "jpeg"),
    local("magic-keyboard.jpg"),
  ],
  "magic-keyboard-touch-id.png": [
    apple("MMMR3", "4982", "jpeg"),
    apple("magic-keyboard-touch-id-numeric-us-english", "4982", "jpeg"),
    local("magic-keyboard-touch-id.jpg"),
  ],
  "iphone-silicone-case.png": [
    apple("MQ003", "4982", "jpeg"),
    apple("MYY63", "4982", "jpeg"),
    local("iphone-silicone-case.jpg"),
  ],
  "smart-folio-ipad.png": [
    apple("smart-folio-ipad-10th-gen-blue", "4982", "jpeg"),
    local("smart-folio-ipad.jpg"),
    local("ipad-10.png"),
  ],
  // Re-cut dual-hero / low-alpha assets
  "ipad-pro-11-m4.png": [local("ipad-pro-11-m4.png"), local("ipad-pro-11-m4.jpg")],
  "ipad-pro-13-m4.png": [local("ipad-pro-13-m4.png"), local("ipad-pro-13-m4.jpg")],
  "iphone-11.png": [local("iphone-11.png"), local("iphone-11.jpg")],
  "iphone-11-pro.png": [local("iphone-11-pro.png"), local("iphone-11-pro.jpg")],
  "iphone-11-pro-max.png": [local("iphone-11-pro-max.png"), local("iphone-11-pro-max.jpg")],
};

async function load(src) {
  if (typeof src === "string" && src.startsWith("http")) {
    const res = await fetch(src, {
      headers: { "User-Agent": ua, Referer: "https://www.apple.com/", Accept: "image/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4000) throw new Error("small");
    return buf;
  }
  if (!fs.existsSync(src)) throw new Error("missing");
  return fs.readFileSync(src);
}

/** Flood-fill from borders through light studio backgrounds → transparent. */
async function floodCutout(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = data;
  const visited = new Uint8Array(w * h);
  const q = [];

  const isBg = (i) => {
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const a = px[o + 3];
    if (a < 12) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 198 && max - min <= 40;
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

  const buf = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { buf, ratio: cleared / (w * h) };
}

async function main() {
  let ok = 0;
  let fail = 0;
  for (const [name, sources] of Object.entries(jobs)) {
    let done = false;
    for (const src of sources) {
      try {
        const raw = await load(src);
        const { buf, ratio } = await floodCutout(raw);
        fs.writeFileSync(path.join(outDir, name), buf);
        console.log(
          `OK   ${name.padEnd(34)} ${String(Math.round(buf.length / 1024)).padStart(5)} KB  α=${Math.round(ratio * 100)}%`,
        );
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
  console.log(`\nFixed: ${ok}, still failing: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
