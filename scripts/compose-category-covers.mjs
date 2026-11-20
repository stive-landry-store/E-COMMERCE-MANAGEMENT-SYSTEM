// Builds clean "studio" category covers from the official product photos in public/products.
//   node scripts/compose-category-covers.mjs
import sharp from "sharp";
import fs from "node:fs";

const S = 900;
const SRC = "public/products";
const OUT = "public/categories";

// x = horizontal centre (0..1), b = bottom edge (0..1), h = height (0..1), w = max width (0..1)
const COVERS = {
  iphone: [
    { stem: "iphone-17-lavender", x: 0.26, b: 0.62, h: 0.5, w: 0.3 },
    { stem: "iphone-air-sky-blue", x: 0.74, b: 0.62, h: 0.5, w: 0.3 },
    { stem: "iphone-17-pro-max", x: 0.5, b: 0.7, h: 0.62, w: 0.42 },
  ],
  "android-phones": [
    { stem: "google-pixel-8-pro", x: 0.27, b: 0.62, h: 0.5, w: 0.3 },
    { stem: "samsung-galaxy-s23-ultra", x: 0.73, b: 0.62, h: 0.5, w: 0.3 },
    { stem: "samsung-galaxy-s25-ultra", x: 0.5, b: 0.7, h: 0.62, w: 0.36 },
  ],
  macbook: [
    { stem: "macbook-pro-14-m5", x: 0.62, b: 0.5, h: 0.34, w: 0.66 },
    { stem: "macbook-air-m5-15-inch", x: 0.44, b: 0.7, h: 0.42, w: 0.84 },
  ],
  "mac-desktop": [
    { stem: "imac-24-m4", x: 0.44, b: 0.66, h: 0.56, w: 0.7 },
    { stem: "mac-studio-m4-max", x: 0.82, b: 0.7, h: 0.18, w: 0.3 },
  ],
  ipad: [
    { stem: "ipad-10", x: 0.26, b: 0.62, h: 0.44, w: 0.36 },
    { stem: "ipad-mini-a17-pro", x: 0.8, b: 0.66, h: 0.34, w: 0.26 },
    { stem: "ipad-pro-13-m4", x: 0.52, b: 0.7, h: 0.6, w: 0.5 },
  ],
  tablets: [
    { stem: "ipad-mini-a17-pro", x: 0.22, b: 0.66, h: 0.42, w: 0.3 },
    { stem: "samsung-galaxy-tab-s5e", x: 0.58, b: 0.7, h: 0.6, w: 0.6 },
  ],
  audio: [
    { stem: "homepod-2", x: 0.8, b: 0.68, h: 0.32, w: 0.28 },
    { stem: "airpods-max-2", x: 0.42, b: 0.6, h: 0.48, w: 0.62 },
    { stem: "airpods-pro-3", x: 0.3, b: 0.72, h: 0.22, w: 0.3 },
  ],
  accessories: [
    { stem: "usb-c-lightning-cable", x: 0.68, b: 0.62, h: 0.48, w: 0.5 },
    { stem: "anker-20w-charger", x: 0.32, b: 0.7, h: 0.44, w: 0.4 },
  ],
  wearables: [
    { stem: "apple-watch-series-9", x: 0.5, b: 0.72, h: 0.66, w: 0.5 },
  ],
};

function source(stem) {
  for (const ext of ["png", "webp", "jpg"]) {
    const p = `${SRC}/${stem}.${ext}`;
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`missing ${stem}`);
}

async function cutout(stem) {
  // Flatten on white, trim the empty margins, then knock out the near-white background.
  const flat = await sharp(source(stem)).flatten({ background: "#ffffff" }).trim({ background: "#ffffff", threshold: 30 }).toBuffer();
  const { data, info } = await sharp(flat).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.min(data[i], data[i + 1], data[i + 2]);
    if (m > 246) data[i + 3] = 0;
    else if (m > 236) data[i + 3] = Math.round(((246 - m) / 10) * 255);
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.65" stop-color="#f2f3f7"/>
      <stop offset="1" stop-color="#dfe2ea"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

for (const [name, items] of Object.entries(COVERS)) {
  const layers = [];
  for (const it of items) {
    const buf = await cutout(it.stem);
    const meta = await sharp(buf).metadata();
    const scale = Math.min((it.h * S) / meta.height, (it.w * S) / meta.width);
    const w = Math.round(meta.width * scale);
    const h = Math.round(meta.height * scale);
    const left = Math.round(it.x * S - w / 2);
    const top = Math.round(it.b * S - h);
    const shadow = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><ellipse cx="${it.x * S}" cy="${it.b * S + 6}" rx="${w * 0.42}" ry="${Math.max(8, w * 0.05)}" fill="rgba(20,16,46,0.28)"/></svg>`,
    );
    layers.push({ input: await sharp(shadow).blur(14).png().toBuffer(), left: 0, top: 0 });
    layers.push({ input: await sharp(buf).resize(w, h).png().toBuffer(), left, top });
  }
  const img = sharp(bg).composite(layers);
  const png = await img.png().toBuffer();
  await sharp(png).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
  await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
  console.log("cover", name);
}
