/**
 * Generates supabase/seed_apple_catalog.sql — full Apple lineup with
 * storage × color variants, FCFA prices, and local image paths.
 * Run: node scripts/generate-apple-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "supabase", "seed_apple_catalog.sql");

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function slugify(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function skuPart(s) {
  return slugify(s).replace(/-/g, "").toUpperCase();
}

/** Keep SKUs unique (avoid truncating macbook-air-m2-13 vs macbook-air-m2-15 to the same code). */
function productSku(slug) {
  return `APP-${skuPart(slug)}`.slice(0, 48);
}

function variantSku(productSkuBase, storage, color) {
  const raw = `${productSkuBase}-${skuPart(storage)}-${skuPart(color)}`;
  return raw.slice(0, 64);
}

/** Approximate Cameroon street/MSRP FCFA by product family + storage tier */
function priceFor(base, storage) {
  const bump = {
    "32 Go": 0,
    "64 Go": 0,
    "128 Go": 40000,
    "256 Go": 90000,
    "512 Go": 180000,
    "1 To": 320000,
    "2 To": 520000,
    "4 To": 900000,
    "8 To": 1500000,
    "16 To": 2500000,
  };
  return base + (bump[storage] ?? 0);
}

/**
 * @typedef {{ name: string, slug: string, category: string, base: number, storages: string[], colors: string[], featured?: boolean, stockHint?: number, image?: string }} CatalogProduct
 */

/** @type {CatalogProduct[]} */
const catalog = [
  // ——— iPhone ———
  { name: "iPhone 7", slug: "iphone-7", category: "iphone", base: 65000, storages: ["32 Go", "128 Go", "256 Go"], colors: ["Noir", "Noir de jais", "Or", "Or rose", "Argent", "PRODUCT(RED)"] },
  { name: "iPhone 7 Plus", slug: "iphone-7-plus", category: "iphone", base: 85000, storages: ["32 Go", "128 Go", "256 Go"], colors: ["Noir", "Noir de jais", "Or", "Or rose", "Argent", "PRODUCT(RED)"] },
  { name: "iPhone 8", slug: "iphone-8", category: "iphone", base: 95000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Or", "Argent", "Gris sidéral", "PRODUCT(RED)"] },
  { name: "iPhone 8 Plus", slug: "iphone-8-plus", category: "iphone", base: 115000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Or", "Argent", "Gris sidéral", "PRODUCT(RED)"] },
  { name: "iPhone X", slug: "iphone-x", category: "iphone", base: 140000, storages: ["64 Go", "256 Go"], colors: ["Gris sidéral", "Argent"] },
  { name: "iPhone XR", slug: "iphone-xr", category: "iphone", base: 160000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Noir", "Blanc", "Bleu", "Jaune", "Corail", "PRODUCT(RED)"] },
  { name: "iPhone XS", slug: "iphone-xs", category: "iphone", base: 180000, storages: ["64 Go", "256 Go", "512 Go"], colors: ["Or", "Gris sidéral", "Argent"] },
  { name: "iPhone XS Max", slug: "iphone-xs-max", category: "iphone", base: 210000, storages: ["64 Go", "256 Go", "512 Go"], colors: ["Or", "Gris sidéral", "Argent"] },
  { name: "iPhone 11", slug: "iphone-11", category: "iphone", base: 220000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Noir", "Vert", "Jaune", "Mauve", "PRODUCT(RED)", "Blanc"], featured: true, stockHint: 4 },
  { name: "iPhone 11 Pro", slug: "iphone-11-pro", category: "iphone", base: 280000, storages: ["64 Go", "256 Go", "512 Go"], colors: ["Vert nuit", "Argent", "Or", "Gris sidéral"] },
  { name: "iPhone 11 Pro Max", slug: "iphone-11-pro-max", category: "iphone", base: 320000, storages: ["64 Go", "256 Go", "512 Go"], colors: ["Vert nuit", "Argent", "Or", "Gris sidéral"] },
  { name: "iPhone 12 mini", slug: "iphone-12-mini", category: "iphone", base: 240000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Noir", "Blanc", "PRODUCT(RED)", "Vert", "Bleu", "Mauve"] },
  { name: "iPhone 12", slug: "iphone-12", category: "iphone", base: 270000, storages: ["64 Go", "128 Go", "256 Go"], colors: ["Noir", "Blanc", "PRODUCT(RED)", "Vert", "Bleu", "Mauve"], featured: true, stockHint: 5 },
  { name: "iPhone 12 Pro", slug: "iphone-12-pro", category: "iphone", base: 340000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Argent", "Graphite", "Or", "Bleu Pacifique"] },
  { name: "iPhone 12 Pro Max", slug: "iphone-12-pro-max", category: "iphone", base: 380000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Argent", "Graphite", "Or", "Bleu Pacifique"] },
  { name: "iPhone 13 mini", slug: "iphone-13-mini", category: "iphone", base: 300000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["PRODUCT(RED)", "Lumière stellaire", "Minuit", "Bleu", "Rose", "Vert"] },
  { name: "iPhone 13", slug: "iphone-13", category: "iphone", base: 340000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["PRODUCT(RED)", "Lumière stellaire", "Minuit", "Bleu", "Rose", "Vert"], featured: true, stockHint: 6 },
  { name: "iPhone 13 Pro", slug: "iphone-13-pro", category: "iphone", base: 420000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Graphite", "Or", "Argent", "Bleu alpin"] },
  { name: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", category: "iphone", base: 480000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Graphite", "Or", "Argent", "Bleu alpin"] },
  { name: "iPhone 14", slug: "iphone-14", category: "iphone", base: 360000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Minuit", "Lumière stellaire", "Bleu", "Mauve", "PRODUCT(RED)", "Jaune"], featured: true, stockHint: 8 },
  { name: "iPhone 14 Plus", slug: "iphone-14-plus", category: "iphone", base: 400000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Minuit", "Lumière stellaire", "Bleu", "Mauve", "PRODUCT(RED)", "Jaune"] },
  { name: "iPhone 14 Pro", slug: "iphone-14-pro", category: "iphone", base: 520000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Noir sidéral", "Argent", "Or", "Violet intense"], featured: true, stockHint: 3 },
  { name: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", category: "iphone", base: 580000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Noir sidéral", "Argent", "Or", "Violet intense"] },
  { name: "iPhone 15", slug: "iphone-15", category: "iphone", base: 480000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Noir", "Bleu", "Vert", "Jaune", "Rose"], featured: true, stockHint: 8 },
  { name: "iPhone 15 Plus", slug: "iphone-15-plus", category: "iphone", base: 540000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Noir", "Bleu", "Vert", "Jaune", "Rose"] },
  { name: "iPhone 15 Pro", slug: "iphone-15-pro", category: "iphone", base: 660000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Titane naturel", "Titane bleu", "Titane blanc", "Titane noir"], featured: true, stockHint: 4 },
  { name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", category: "iphone", base: 780000, storages: ["256 Go", "512 Go", "1 To"], colors: ["Titane naturel", "Titane bleu", "Titane blanc", "Titane noir"] },
  { name: "iPhone 16", slug: "iphone-16", category: "iphone", base: 540000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Noir", "Blanc", "Rose", "Sarcelle", "Ultramarin"], featured: true, stockHint: 6 },
  { name: "iPhone 16 Plus", slug: "iphone-16-plus", category: "iphone", base: 600000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Noir", "Blanc", "Rose", "Sarcelle", "Ultramarin"] },
  { name: "iPhone 16 Pro", slug: "iphone-16-pro", category: "iphone", base: 720000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Titane noir", "Titane naturel", "Titane blanc", "Titane désert"], featured: true, stockHint: 3 },
  { name: "iPhone 16 Pro Max", slug: "iphone-16-pro-max", category: "iphone", base: 840000, storages: ["256 Go", "512 Go", "1 To"], colors: ["Titane noir", "Titane naturel", "Titane blanc", "Titane désert"] },
  { name: "iPhone 16e", slug: "iphone-16e", category: "iphone", base: 420000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Noir", "Blanc"] },
  { name: "iPhone 17", slug: "iphone-17", category: "iphone", base: 620000, storages: ["256 Go", "512 Go"], colors: ["Noir", "Blanc", "Bleu brume", "Lavande", "Sauge"], featured: true, stockHint: 2 },
  { name: "iPhone 17e", slug: "iphone-17e", category: "iphone", base: 480000, storages: ["256 Go", "512 Go"], colors: ["Noir", "Blanc"] },
  { name: "iPhone Air", slug: "iphone-air", category: "iphone", base: 700000, storages: ["256 Go", "512 Go", "1 To"], colors: ["Noir", "Blanc", "Bleu", "Or"], featured: true },
  { name: "iPhone 17 Pro", slug: "iphone-17-pro", category: "iphone", base: 820000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Cosmic Orange", "Deep Blue", "Silver"], featured: true, stockHint: 2 },
  { name: "iPhone 17 Pro Max", slug: "iphone-17-pro-max", category: "iphone", base: 960000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Cosmic Orange", "Deep Blue", "Silver"] },

  // ——— MacBook Air ———
  { name: "MacBook Air M1 13 inch", slug: "macbook-air-m1-13", category: "laptop-macbook", base: 420000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Gris sidéral", "Argent", "Or"] },
  { name: "MacBook Air M2 13 inch", slug: "macbook-air-m2-13", category: "laptop-macbook", base: 620000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Gris sidéral"], featured: true, stockHint: 2 },
  { name: "MacBook Air M2 15 inch", slug: "macbook-air-m2-15", category: "laptop-macbook", base: 780000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Gris sidéral"] },
  { name: "MacBook Air M3 13 inch", slug: "macbook-air-m3-13", category: "laptop-macbook", base: 720000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Gris sidéral"], featured: true },
  { name: "MacBook Air M3 15 inch", slug: "macbook-air-m3-15", category: "laptop-macbook", base: 880000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Gris sidéral"] },
  { name: "MacBook Air M4 13 inch", slug: "macbook-air-m4-13", category: "laptop-macbook", base: 820000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Bleu ciel"], featured: true, stockHint: 2 },
  { name: "MacBook Air M4 15 inch", slug: "macbook-air-m4-15", category: "laptop-macbook", base: 980000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Minuit", "Lumière stellaire", "Argent", "Bleu ciel"] },
  { name: "MacBook Air M5 13 inch", slug: "macbook-air-m5-13", category: "laptop-macbook", base: 980000, storages: ["512 Go", "1 To", "2 To", "4 To"], colors: ["Bleu ciel", "Argent", "Lumière stellaire", "Minuit"] },
  { name: "MacBook Air M5 15 inch", slug: "macbook-air-m5-15", category: "laptop-macbook", base: 1180000, storages: ["512 Go", "1 To", "2 To", "4 To"], colors: ["Bleu ciel", "Argent", "Lumière stellaire", "Minuit"] },

  // ——— MacBook Pro ———
  { name: "MacBook Pro 14 inch M3", slug: "macbook-pro-14-m3", category: "laptop-macbook", base: 980000, storages: ["512 Go", "1 To", "2 To", "4 To"], colors: ["Argent", "Noir sidéral"], featured: true },
  { name: "MacBook Pro 14 inch M4", slug: "macbook-pro-14-m4", category: "laptop-macbook", base: 1120000, storages: ["512 Go", "1 To", "2 To", "4 To"], colors: ["Argent", "Space Black"], featured: true, stockHint: 1 },
  { name: "MacBook Pro 14 inch M5", slug: "macbook-pro-14-m5", category: "laptop-macbook", base: 1280000, storages: ["512 Go", "1 To", "2 To", "4 To"], colors: ["Argent", "Space Black"] },
  { name: "MacBook Pro 16 inch M3 Pro", slug: "macbook-pro-16-m3-pro", category: "laptop-macbook", base: 1480000, storages: ["512 Go", "1 To", "2 To", "4 To", "8 To"], colors: ["Argent", "Noir sidéral"] },
  { name: "MacBook Pro 16 inch M4 Pro", slug: "macbook-pro-16-m4-pro", category: "laptop-macbook", base: 1680000, storages: ["512 Go", "1 To", "2 To", "4 To", "8 To"], colors: ["Argent", "Space Black"], featured: true },

  // ——— Desktop Mac ———
  { name: "iMac 24 inch M1", slug: "imac-24-m1", category: "mac-desktop", base: 780000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Vert", "Jaune", "Orange", "Rose", "Violet", "Bleu", "Argent"] },
  { name: "iMac 24 inch M3", slug: "imac-24-m3", category: "mac-desktop", base: 920000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Vert", "Jaune", "Orange", "Rose", "Violet", "Bleu", "Argent"], featured: true },
  { name: "iMac 24 inch M4", slug: "imac-24-m4", category: "mac-desktop", base: 1080000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Bleu", "Violet", "Rose", "Orange", "Jaune", "Vert", "Argent"] },
  { name: "Mac mini M1", slug: "mac-mini-m1", category: "mac-desktop", base: 320000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Argent"] },
  { name: "Mac mini M2", slug: "mac-mini-m2", category: "mac-desktop", base: 380000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Argent"] },
  { name: "Mac mini M4", slug: "mac-mini-m4", category: "mac-desktop", base: 420000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Argent"], featured: true, stockHint: 2 },
  { name: "Mac mini M4 Pro", slug: "mac-mini-m4-pro", category: "mac-desktop", base: 820000, storages: ["512 Go", "1 To", "2 To", "4 To", "8 To"], colors: ["Argent"] },
  { name: "Mac Studio M2 Max", slug: "mac-studio-m2-max", category: "mac-desktop", base: 1280000, storages: ["512 Go", "1 To", "2 To", "4 To", "8 To"], colors: ["Argent"] },
  { name: "Mac Studio M4 Max", slug: "mac-studio-m4-max", category: "mac-desktop", base: 1480000, storages: ["512 Go", "1 To", "2 To", "4 To", "8 To", "16 To"], colors: ["Argent"] },
  { name: "Mac Pro 2023 M2 Ultra", slug: "mac-pro-2023", category: "mac-desktop", base: 4200000, storages: ["1 To", "2 To", "4 To", "8 To"], colors: ["Argent"] },

  // ——— iPad ———
  { name: "iPad 9", slug: "ipad-9", category: "ipad", base: 180000, storages: ["64 Go", "256 Go"], colors: ["Gris sidéral", "Argent"] },
  { name: "iPad 10", slug: "ipad-10", category: "ipad", base: 260000, storages: ["64 Go", "256 Go"], colors: ["Bleu", "Rose", "Jaune", "Argent"], featured: true, stockHint: 4 },
  { name: "iPad A16", slug: "ipad-a16", category: "ipad", base: 320000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Bleu", "Rose", "Jaune", "Argent"] },
  { name: "iPad mini 6", slug: "ipad-mini-6", category: "ipad", base: 340000, storages: ["64 Go", "256 Go"], colors: ["Gris sidéral", "Rose", "Mauve", "Lumière stellaire"] },
  { name: "iPad mini A17 Pro", slug: "ipad-mini-a17-pro", category: "ipad", base: 420000, storages: ["128 Go", "256 Go", "512 Go"], colors: ["Bleu", "Mauve", "Lumière stellaire", "Gris sidéral"], featured: true },
  { name: "iPad Air M2 11 inch", slug: "ipad-air-m2-11", category: "ipad", base: 480000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Bleu", "Mauve", "Lumière stellaire", "Gris sidéral"] },
  { name: "iPad Air M2 13 inch", slug: "ipad-air-m2-13", category: "ipad", base: 620000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Bleu", "Mauve", "Lumière stellaire", "Gris sidéral"] },
  { name: "iPad Air M3 11 inch", slug: "ipad-air-m3-11", category: "ipad", base: 540000, storages: ["128 Go", "256 Go", "512 Go", "1 To"], colors: ["Bleu", "Mauve", "Lumière stellaire", "Gris sidéral"], featured: true },
  { name: "iPad Pro 11 inch M4", slug: "ipad-pro-11-m4", category: "ipad", base: 780000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Argent", "Noir sidéral"], featured: true, stockHint: 2 },
  { name: "iPad Pro 13 inch M4", slug: "ipad-pro-13-m4", category: "ipad", base: 1080000, storages: ["256 Go", "512 Go", "1 To", "2 To"], colors: ["Argent", "Noir sidéral"] },

  // ——— Apple Watch ———
  { name: "Apple Watch SE 2", slug: "apple-watch-se-2", category: "wearables", base: 160000, storages: ["40mm", "44mm"], colors: ["Minuit", "Lumière stellaire", "Argent"], featured: true, stockHint: 5 },
  { name: "Apple Watch Series 9", slug: "apple-watch-series-9", category: "wearables", base: 240000, storages: ["41mm", "45mm"], colors: ["Minuit", "Lumière stellaire", "Rose", "PRODUCT(RED)"], featured: true, stockHint: 3 },
  { name: "Apple Watch Series 10", slug: "apple-watch-series-10", category: "wearables", base: 280000, storages: ["42mm", "46mm"], colors: ["Noir de jais", "Rose", "Argent"], featured: true },
  { name: "Apple Watch Series 11", slug: "apple-watch-series-11", category: "wearables", base: 320000, storages: ["42mm", "46mm"], colors: ["Noir", "Argent", "Or rose"] },
  { name: "Apple Watch Ultra 2", slug: "apple-watch-ultra-2", category: "wearables", base: 520000, storages: ["49mm"], colors: ["Titane naturel", "Titane noir", "Titane bleu"] },
  { name: "Apple Watch Ultra 3", slug: "apple-watch-ultra-3", category: "wearables", base: 580000, storages: ["49mm"], colors: ["Titane naturel", "Titane noir"] },

  // ——— AirPods / Audio ———
  { name: "AirPods 2", slug: "airpods-2", category: "audio", base: 65000, storages: ["Standard"], colors: ["Blanc"] },
  { name: "AirPods 3", slug: "airpods-3", category: "audio", base: 95000, storages: ["Standard"], colors: ["Blanc"] },
  { name: "AirPods 4", slug: "airpods-4", category: "audio", base: 110000, storages: ["Standard"], colors: ["Blanc"], featured: true, stockHint: 10 },
  { name: "AirPods 4 ANC", slug: "airpods-4-anc", category: "audio", base: 140000, storages: ["Standard"], colors: ["Blanc"] },
  { name: "AirPods Pro 2", slug: "airpods-pro-2", category: "audio", base: 150000, storages: ["USB-C"], colors: ["Blanc"], featured: true, stockHint: 12 },
  { name: "AirPods Pro 3", slug: "airpods-pro-3", category: "audio", base: 180000, storages: ["USB-C"], colors: ["Blanc"], featured: true },
  { name: "AirPods Max", slug: "airpods-max", category: "audio", base: 380000, storages: ["Standard"], colors: ["Gris sidéral", "Argent", "Vert", "Bleu ciel", "Rose"] },
  { name: "AirPods Max 2", slug: "airpods-max-2", category: "audio", base: 420000, storages: ["USB-C"], colors: ["Minuit", "Lumière stellaire", "Bleu", "Orange", "Mauve"] },

  // ——— Accessories ———
  { name: "Apple Pencil USB-C", slug: "apple-pencil-usb-c", category: "accessories", base: 55000, storages: ["Standard"], colors: ["Blanc"], stockHint: 15 },
  { name: "Apple Pencil Pro", slug: "apple-pencil-pro", category: "accessories", base: 95000, storages: ["Standard"], colors: ["Blanc"], featured: true, stockHint: 8 },
  { name: "Magic Keyboard", slug: "magic-keyboard", category: "accessories", base: 85000, storages: ["Standard"], colors: ["Blanc", "Noir"] },
  { name: "Magic Keyboard with Touch ID", slug: "magic-keyboard-touch-id", category: "accessories", base: 120000, storages: ["Standard"], colors: ["Blanc", "Noir"] },
  { name: "Magic Mouse", slug: "magic-mouse", category: "accessories", base: 55000, storages: ["Standard"], colors: ["Blanc", "Noir"], stockHint: 10 },
  { name: "Magic Trackpad", slug: "magic-trackpad", category: "accessories", base: 95000, storages: ["Standard"], colors: ["Blanc", "Noir"] },
  { name: "AirTag", slug: "airtag", category: "accessories", base: 25000, storages: ["1 pack", "4 pack"], colors: ["Blanc"], featured: true, stockHint: 20 },
  { name: "HomePod mini", slug: "homepod-mini", category: "audio", base: 75000, storages: ["Standard"], colors: ["Blanc", "Minuit", "Jaune", "Orange", "Bleu"], stockHint: 6 },
  { name: "HomePod 2", slug: "homepod-2", category: "audio", base: 220000, storages: ["Standard"], colors: ["Blanc", "Minuit"] },
  { name: "Apple TV 4K", slug: "apple-tv-4k", category: "accessories", base: 110000, storages: ["64 Go", "128 Go"], colors: ["Noir"] },
  { name: "MagSafe Charger", slug: "magsafe-charger", category: "accessories", base: 28000, storages: ["Standard"], colors: ["Blanc"], stockHint: 25 },
  { name: "MagSafe Battery Pack", slug: "magsafe-battery-pack", category: "accessories", base: 75000, storages: ["Standard"], colors: ["Blanc"] },
  { name: "20W USB-C Power Adapter", slug: "apple-20w-adapter", category: "accessories", base: 15000, storages: ["Standard"], colors: ["Blanc"], stockHint: 40 },
  { name: "USB-C to Lightning Cable", slug: "usb-c-lightning-cable", category: "accessories", base: 12000, storages: ["1 m", "2 m"], colors: ["Blanc"], stockHint: 30 },
  { name: "USB-C Charge Cable", slug: "usb-c-charge-cable", category: "accessories", base: 12000, storages: ["1 m", "2 m"], colors: ["Blanc"], stockHint: 30 },
  { name: "iPhone Silicone Case", slug: "iphone-silicone-case", category: "accessories", base: 28000, storages: ["iPhone 15", "iPhone 16"], colors: ["Noir", "Bleu", "Rose", "Vert", "Orange"], stockHint: 18 },
  { name: "Smart Folio for iPad", slug: "smart-folio-ipad", category: "accessories", base: 55000, storages: ["11 inch", "13 inch"], colors: ["Noir", "Blanc", "Denim"] },
];

const lines = [];
lines.push(`-- Auto-generated Apple catalog for Stive Landry Store`);
lines.push(`-- Generated by scripts/generate-apple-catalog.mjs — do not edit by hand.`);
lines.push(`-- Run AFTER 001_initial.sql, 002_sellers.sql, 003_category_images.sql, 004_payment_methods.sql`);
lines.push(`-- Safe to re-run: upserts by product slug / variant sku.`);
lines.push(``);
lines.push(`-- Clear truncated SKUs from a previous failed seed (e.g. APP-MACBOOKAIRM2 collisions).`);
lines.push(`-- Only removes catalog rows whose sku starts with APP- and is shorter than 20 chars (old generator).`);
lines.push(`delete from public.product_variants`);
lines.push(`where product_id in (`);
lines.push(`  select id from public.products`);
lines.push(`  where sku like 'APP-%' and length(replace(sku, 'APP-', '')) <= 12`);
lines.push(`);`);
lines.push(`delete from public.products`);
lines.push(`where sku like 'APP-%' and length(replace(sku, 'APP-', '')) <= 12;`);
lines.push(``);

lines.push(`insert into public.categories (name, slug, description, image_url, sort_order, show_on_home)`);
lines.push(`values`);
lines.push(`  ('Laptop / MacBook', 'laptop-macbook', 'MacBook Air, MacBook Pro and premium laptops.', '/categories/macbook.jpg', 10, true),`);
lines.push(`  ('iPhone', 'iphone', 'iPhone from 7 to the latest generation.', '/categories/iphone.jpg', 20, true),`);
lines.push(`  ('iPad', 'ipad', 'iPad, iPad Air, iPad mini and iPad Pro.', '/categories/iphone.jpg', 25, true),`);
lines.push(`  ('Mac desktop', 'mac-desktop', 'iMac, Mac mini, Mac Studio and Mac Pro.', '/categories/macbook.jpg', 15, true),`);
lines.push(`  ('Accessories', 'accessories', 'Cases, chargers, cables, Pencil, keyboards.', '/categories/accessories.jpg', 40, true),`);
lines.push(`  ('Audio', 'audio', 'AirPods, HomePod and headphones.', '/categories/audio.jpg', 30, true),`);
lines.push(`  ('Wearables', 'wearables', 'Apple Watch Series, SE and Ultra.', '/categories/wearables.jpg', 50, true)`);
lines.push(`on conflict (slug) do update set`);
lines.push(`  description = excluded.description,`);
lines.push(`  sort_order = excluded.sort_order,`);
lines.push(`  show_on_home = true;`);
lines.push(``);

lines.push(`insert into public.brands (name, slug) values ('Apple', 'apple'), ('Anker', 'anker')`);
lines.push(`on conflict (slug) do nothing;`);
lines.push(``);

let variantCount = 0;
let productCount = 0;

for (const p of catalog) {
  productCount += 1;
  const sku = productSku(p.slug);
  const img = `/products/${p.slug}.png?v=cutout`;
  const desc = `${p.name} — authentic Apple product at Stive Landry Store. Choose storage and colour; live stock and pre-order available.`;

  lines.push(`insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)`);
  lines.push(`select`);
  lines.push(`  '${esc(sku)}',`);
  lines.push(`  '${esc(p.name)}',`);
  lines.push(`  '${esc(p.slug)}',`);
  lines.push(`  b.id,`);
  lines.push(`  c.id,`);
  lines.push(`  '${esc(desc)}',`);
  lines.push(`  '{}'::jsonb,`);
  lines.push(`  ${p.base},`);
  lines.push(`  ${p.featured ? "true" : "false"},`);
  lines.push(`  'active'`);
  lines.push(`from public.brands b, public.categories c`);
  lines.push(`where b.slug = 'apple' and c.slug = '${esc(p.category)}'`);
  lines.push(`on conflict (slug) do update set`);
  lines.push(`  sku = excluded.sku,`);
  lines.push(`  name = excluded.name,`);
  lines.push(`  description = excluded.description,`);
  lines.push(`  base_price = excluded.base_price,`);
  lines.push(`  featured = excluded.featured,`);
  lines.push(`  status = 'active',`);
  lines.push(`  brand_id = excluded.brand_id,`);
  lines.push(`  category_id = excluded.category_id;`);
  lines.push(``);

  let idx = 0;
  for (const storage of p.storages) {
    for (const color of p.colors) {
      variantCount += 1;
      idx += 1;
      const vSku = variantSku(sku, storage, color);
      const price = priceFor(p.base, storage);
      const heroImg = img;

      lines.push(`insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls, reservable, preorder_enabled, status)`);
      lines.push(`select p.id, '${esc(p.name)}', '${esc(storage)}', '${esc(color)}', '${esc(vSku)}', ${price},`);
      lines.push(`  array['${esc(heroImg)}'],`);
      lines.push(`  true, true, 'active'`);
      lines.push(`from public.products p where p.slug = '${esc(p.slug)}'`);
      lines.push(`on conflict (sku) do update set`);
      lines.push(`  model = excluded.model,`);
      lines.push(`  storage = excluded.storage,`);
      lines.push(`  color = excluded.color,`);
      lines.push(`  price = excluded.price,`);
      lines.push(`  image_urls = excluded.image_urls,`);
      lines.push(`  reservable = true,`);
      lines.push(`  preorder_enabled = true,`);
      lines.push(`  status = 'active';`);
      lines.push(``);

      const stock = p.stockHint && idx <= 2 ? p.stockHint : idx === 1 ? 1 : 0;
      if (stock > 0) {
        lines.push(`update public.inventory i`);
        lines.push(`set total_stock = greatest(i.total_stock, ${stock}), min_stock = 1`);
        lines.push(`from public.product_variants v`);
        lines.push(`where v.sku = '${esc(vSku)}' and i.variant_id = v.id;`);
        lines.push(``);
      }
    }
  }
}

lines.push(`-- Catalog summary: ${productCount} products, ${variantCount} variants`);
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

// Sanity: SKUs must be unique
const productSkus = catalog.map((p) => productSku(p.slug));
const dupProducts = productSkus.filter((s, i) => productSkus.indexOf(s) !== i);
if (dupProducts.length) {
  console.error("Duplicate product SKUs:", [...new Set(dupProducts)]);
  process.exit(1);
}
const variantSkus = [];
for (const p of catalog) {
  const base = productSku(p.slug);
  for (const storage of p.storages) {
    for (const color of p.colors) {
      variantSkus.push(variantSku(base, storage, color));
    }
  }
}
const dupVariants = variantSkus.filter((s, i) => variantSkus.indexOf(s) !== i);
if (dupVariants.length) {
  console.error("Duplicate variant SKUs:", [...new Set(dupVariants)].slice(0, 20));
  process.exit(1);
}

console.log(`Wrote ${outPath}`);
console.log(`Products: ${productCount}, Variants: ${variantCount}`);
console.log(`Unique product SKUs: ${new Set(productSkus).size}, Unique variant SKUs: ${new Set(variantSkus).size}`);
