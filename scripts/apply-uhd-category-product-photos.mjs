/**
 * Copy generated Ultra HD assets into public/ and bump cache versions.
 * Run: node scripts/apply-uhd-category-product-photos.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS =
  "C:/Users/STIVE LANDRY STORE/.cursor/projects/c-Users-STIVE-LANDRY-STORE-Desktop-E-COMMERCE-MANAGEMENT-SYSTEM/assets";

const products = [
  "google-pixel-8.png",
  "google-pixel-8a.png",
  "google-pixel-8-pro.png",
  "samsung-galaxy-s21-ultra.png",
  "samsung-galaxy-s23-ultra.png",
  "samsung-galaxy-s25-ultra.png",
  "samsung-galaxy-tab-s5e.png",
  "ipad-air-2.png",
  "ipad-6th-generation.png",
  "apple-watch-series-9.png",
];

const categories = [
  ["android-phones.jpg", "android-phones.jpg"],
  ["tablets.jpg", "tablets.jpg"],
  ["mac-desktop.jpg", "mac-desktop.jpg"],
];

fs.mkdirSync(path.join(ROOT, "public/products"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "public/categories"), { recursive: true });

async function saveProduct(name) {
  const src = path.join(ASSETS, name);
  if (!fs.existsSync(src)) {
    console.log("MISSING asset", name);
    return;
  }
  const dest = path.join(ROOT, "public/products", name);
  const buf = await sharp(src, { failOn: "none" })
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
  fs.writeFileSync(dest, buf);
  const m = await sharp(dest).metadata();
  console.log("OK product", name, `${m.width}x${m.height}`, `${Math.round(buf.length / 1024)}KB`);
}

async function saveCategory(srcName, destName) {
  const src = path.join(ASSETS, srcName);
  if (!fs.existsSync(src)) {
    console.log("MISSING asset", srcName);
    return;
  }
  const dest = path.join(ROOT, "public/categories", destName);
  const buf = await sharp(src, { failOn: "none" })
    .rotate()
    .resize({
      width: 1920,
      height: 1200,
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(dest, buf);
  const m = await sharp(dest).metadata();
  console.log("OK category", destName, `${m.width}x${m.height}`, `${Math.round(buf.length / 1024)}KB`);
}

for (const p of products) await saveProduct(p);
for (const [s, d] of categories) await saveCategory(s, d);
console.log("Done.");
