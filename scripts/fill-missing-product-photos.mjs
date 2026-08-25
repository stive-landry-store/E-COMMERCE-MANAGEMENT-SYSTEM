/**
 * Detect active products without photos, download Ultra HD product shots,
 * save to public/products/{slug}.png, and set product_variants.image_urls.
 *
 * Run: node scripts/fill-missing-product-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const outDir = path.join(ROOT, "public", "products");
fs.mkdirSync(outDir, { recursive: true });

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

function apple(id, region = "4982") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2400&hei=2400&fmt=png-alpha&qlt=100&.v=1`;
}

function appleJpg(id, region = "4982") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2400&hei=2400&fmt=jpeg&qlt=95&.v=1`;
}

function appledb(key, color) {
  const c = encodeURIComponent(color);
  return [
    `https://img.appledb.dev/device@2048/${key}/${c}.png`,
    `https://img.appledb.dev/device@1024/${key}/${c}.png`,
  ];
}

function unsplash(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2400&q=95`;
}

/** Ultra HD candidate URLs per product slug (first success wins). */
const CATALOG = {
  "google-pixel-8": [
    "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8.jpg",
    "https://fdn2.gsmarena.com/vv/pics/google/google-pixel-8-1.jpg",
    "https://fdn2.gsmarena.com/vv/pics/google/google-pixel-8-2.jpg",
    "https://m.media-amazon.com/images/I/71w3oM2idNL._AC_SL1500_.jpg",
    unsplash("photo-1696446701796-da61225697cc"),
    unsplash("photo-1511707171634-5f897ff02aa9"),
  ],
  "google-pixel-8a": [
    "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg",
    "https://fdn2.gsmarena.com/vv/pics/google/google-pixel-8a-1.jpg",
    "https://m.media-amazon.com/images/I/71qjXJ1q0hL._AC_SL1500_.jpg",
    unsplash("photo-1696446701796-da61225697cc"),
    unsplash("photo-1510557880182-3d4d3cba35a5"),
  ],
  "google-pixel-8-pro": [
    "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg",
    "https://fdn2.gsmarena.com/vv/pics/google/google-pixel-8-pro-1.jpg",
    "https://m.media-amazon.com/images/I/71S81EZl2lL._AC_SL1500_.jpg",
    unsplash("photo-1696446701796-da61225697cc"),
    unsplash("photo-1592899677977-9c10ca588bbd"),
  ],
  "samsung-galaxy-s21-ultra": [
    "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-ultra-5g-.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s21-ultra-5g-1.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s21-ultra-5g-2.jpg",
    "https://m.media-amazon.com/images/I/61mLVz0T9qL._AC_SL1500_.jpg",
    unsplash("photo-1610945415295-d9bbf067e59c"),
    unsplash("photo-1511707171634-5f897ff02aa9"),
  ],
  "samsung-galaxy-s23-ultra": [
    "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s23-ultra-5g-1.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s23-ultra-5g-2.jpg",
    "https://m.media-amazon.com/images/I/71TtOM-u5HL._AC_SL1500_.jpg",
    unsplash("photo-1610945415295-d9bbf067e59c"),
    unsplash("photo-1592899677977-9c10ca588bbd"),
  ],
  "samsung-galaxy-s25-ultra": [
    "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s25-ultra-1.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s25-ultra-2.jpg",
    "https://m.media-amazon.com/images/I/71r1nK7wN4L._AC_SL1500_.jpg",
    unsplash("photo-1610945415295-d9bbf067e59c"),
    unsplash("photo-1512499617640-c74ae3a79d37"),
  ],
  "samsung-galaxy-tab-s5e": [
    "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s5e.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-tab-s5e-1.jpg",
    "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-tab-s5e-0.jpg",
    unsplash("photo-1544244015-0df4b3ffc6b0"),
    unsplash("photo-1561154464-82e9adf32764"),
  ],
  "ipad-air-2": [
    apple("ipad-air-2-select-wifi-spacegray-201410"),
    appleJpg("ipad-air-2-select-wifi-spacegray-201410"),
    ...appledb("iPad5,3", "Space Gray"),
    ...appledb("iPad5,4", "Space Gray"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-6th-generation": [
    apple("ipad-9th-gen-select-wifi-space-gray-202109"),
    apple("ipad-10th-gen-finish-unselect-gallery-1-202212"),
    appleJpg("ipad-cell-select-wifi-spacegray-201803"),
    ...appledb("iPad7,5", "Space Gray"),
    ...appledb("iPad7,6", "Space Gray"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "apple-watch-series-9": [
    apple("watch-case-41-aluminum-midnight-nc-s9_VW_PF"),
    apple("watch-case-41-aluminum-midnight-nc-s9"),
    appleJpg("watch-case-41-aluminum-midnight-nc-s9"),
    apple("watch-s9-case-41-aluminum-midnight-nc-se_VW_PF"),
    unsplash("photo-1434493789847-2f02dc6ca35d"),
  ],
};

async function fetchBuffer(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": ua,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("text/html")) throw new Error("HTML page");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error(`Too small (${buf.length})`);
    return buf;
  } finally {
    clearTimeout(t);
  }
}

async function toUltraHdPng(buf) {
  const img = sharp(buf, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const target = 2000;
  let pipeline = sharp(buf, { failOn: "none" }).rotate();
  if (w < target && h < target) {
    pipeline = pipeline.resize({
      width: target,
      height: target,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    });
  } else if (Math.max(w, h) > 2400) {
    pipeline = pipeline.resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  }
  return pipeline.png({ quality: 95, compressionLevel: 8 }).toBuffer();
}

async function downloadSlug(slug, urls) {
  const dest = path.join(outDir, `${slug}.png`);
  for (const url of urls) {
    try {
      const raw = await fetchBuffer(url);
      const png = await toUltraHdPng(raw);
      fs.writeFileSync(dest, png);
      return { ok: true, bytes: png.length, url };
    } catch {
      // next candidate
    }
  }
  return { ok: false };
}

function localExists(slug) {
  return (
    fs.existsSync(path.join(outDir, `${slug}.png`)) ||
    fs.existsSync(path.join(outDir, `${slug}.jpg`))
  );
}

async function listMissingFromDb() {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,status,product_variants(id,sku,image_urls,status)")
    .eq("status", "active");
  if (error) throw error;

  const missing = [];
  for (const p of data ?? []) {
    const hasLocal = localExists(p.slug);
    const variants = (p.product_variants ?? []).filter((v) => v.status === "active");
    const anyEmpty = variants.some((v) => !(v.image_urls?.[0]));
    const anyBroken = variants.some((v) => {
      const u = String(v.image_urls?.[0] ?? "");
      if (!u.startsWith("/products/")) return false;
      const fname = u.split("?")[0].replace(/^\/products\//, "").replace(/\.jpe?g$/i, ".png");
      return !fs.existsSync(path.join(outDir, fname)) && !fs.existsSync(path.join(outDir, fname.replace(/\.png$/, ".jpg")));
    });
    if (!hasLocal || anyEmpty || anyBroken) {
      missing.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        variants,
        hasLocal,
        anyEmpty,
        anyBroken,
      });
    }
  }
  return missing;
}

async function attachImages(product) {
  const url = `/products/${product.slug}.png?v=uhd1`;
  let updated = 0;
  for (const v of product.variants) {
    const { error } = await supabase
      .from("product_variants")
      .update({ image_urls: [url] })
      .eq("id", v.id);
    if (error) {
      console.log(`  DB fail ${v.sku}: ${error.message}`);
    } else {
      updated += 1;
    }
  }
  return updated;
}

async function main() {
  console.log("Scanning products without photos…");
  const missing = await listMissingFromDb();
  console.log(`Found ${missing.length} product(s) needing photos:\n`);
  for (const p of missing) {
    console.log(
      ` - ${p.slug} (${p.name}) local=${p.hasLocal} emptyUrls=${p.anyEmpty} broken=${p.anyBroken}`,
    );
  }

  let dlOk = 0;
  let dlFail = 0;
  let dbOk = 0;

  for (const p of missing) {
    const candidates = CATALOG[p.slug];
    if (!candidates?.length) {
      console.log(`SKIP ${p.slug} — no download sources configured`);
      dlFail += 1;
      continue;
    }

    // Always refresh missing / broken local files
    if (!p.hasLocal || p.anyBroken || !fs.existsSync(path.join(outDir, `${p.slug}.png`))) {
      console.log(`DL   ${p.slug}…`);
      const result = await downloadSlug(p.slug, candidates);
      if (!result.ok) {
        console.log(`FAIL ${p.slug}`);
        dlFail += 1;
        continue;
      }
      console.log(`OK   ${p.slug}  ${(result.bytes / 1024).toFixed(0)} KB  ← ${result.url.slice(0, 80)}…`);
      dlOk += 1;
    } else {
      console.log(`KEEP ${p.slug} (local file already present)`);
      dlOk += 1;
    }

    const n = await attachImages(p);
    console.log(`DB   ${p.slug} → ${n} variant(s) updated`);
    dbOk += n;
  }

  console.log(`\nDone. Downloads OK=${dlOk} FAIL=${dlFail}. Variants updated=${dbOk}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
