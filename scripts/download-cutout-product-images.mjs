/**
 * Download full-HD product cutouts (transparent background, product only).
 * Prefer Apple png-alpha + appledb PNGs, then remove light studio backgrounds with sharp.
 * Saves as public/products/{slug}.png
 * Run: node scripts/download-cutout-product-images.mjs
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

function apple(id, region = "4982") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`;
}

function apple1(id) {
  return `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=png-alpha&qlt=100`;
}

function appledb(key, color = "Silver") {
  const c = encodeURIComponent(color);
  return [
    `https://img.appledb.dev/device@1024/${key}/${c}.png`,
    `https://img.appledb.dev/device@512/${key}/${c}.png`,
  ];
}

/** Prefer single-device select cutouts over dual-hero shots. */
const catalog = {
  "iphone-7.png": [apple("iphone7-black-select-2016"), ...appledb("iPhone9,3", "Black")],
  "iphone-7-plus.png": [apple("iphone7-plus-black-select-2016"), ...appledb("iPhone9,4", "Black")],
  "iphone-8.png": [apple("iphone8-silver-select-2017"), ...appledb("iPhone10,1", "Silver")],
  "iphone-8-plus.png": [apple("iphone8-plus-silver-select-2017"), ...appledb("iPhone10,2", "Silver")],
  "iphone-x.png": [apple("iphone-x-silver-select-2017"), ...appledb("iPhone10,6", "Silver")],
  "iphone-xr.png": [apple("iphone-xr-blue-select-201809"), ...appledb("iPhone11,8", "Blue")],
  "iphone-xs.png": [apple("iphone-xs-gold-select-2018"), ...appledb("iPhone11,2", "Gold")],
  "iphone-xs-max.png": [apple("iphone-xs-max-gold-select-2018"), ...appledb("iPhone11,6", "Gold")],
  "iphone-11.png": [apple("iphone11-purple-select-2019"), ...appledb("iPhone12,1", "Purple")],
  "iphone-11-pro.png": [
    apple("iphone-11-pro-midnight-green-select-2019"),
    ...appledb("iPhone12,3", "Midnight Green"),
  ],
  "iphone-11-pro-max.png": [
    apple("iphone-11-pro-max-midnight-green-select-2019"),
    ...appledb("iPhone12,5", "Midnight Green"),
  ],
  "iphone-12-mini.png": [apple("iphone-12-mini-blue-select-2020"), ...appledb("iPhone13,1", "Blue")],
  "iphone-12.png": [apple("iphone-12-blue-select-2020"), ...appledb("iPhone13,2", "Blue")],
  "iphone-12-pro.png": [apple("iphone-12-pro-blue-select"), ...appledb("iPhone13,3", "Pacific Blue")],
  "iphone-12-pro-max.png": [
    apple("iphone-12-pro-max-blue-select"),
    ...appledb("iPhone13,4", "Pacific Blue"),
  ],
  "iphone-13-mini.png": [apple("iphone-13-mini-blue-select-2021"), ...appledb("iPhone14,4", "Blue")],
  "iphone-13.png": [
    apple("iphone-13-blue-select-2021"),
    apple("iphone-13-finish-select-202207-6-1inch-blue"),
    ...appledb("iPhone14,5", "Blue"),
  ],
  "iphone-13-pro.png": [
    apple("iphone-13-pro-sierra-blue-select"),
    apple("iphone-13-pro-finish-select-202207-6-1inch-sierrablue"),
    ...appledb("iPhone14,2", "Sierra Blue"),
  ],
  "iphone-13-pro-max.png": [
    apple("iphone-13-pro-max-graphite-select"),
    ...appledb("iPhone14,3", "Graphite"),
  ],
  "iphone-14.png": [
    apple("iphone-14-finish-select-202209-6-1inch-midnight"),
    ...appledb("iPhone14,7", "Midnight"),
  ],
  "iphone-14-plus.png": [
    apple("iphone-14-plus-finish-select-202209-6-7inch-blue"),
    apple("iphone-14-finish-select-202209-6-1inch-blue"),
    ...appledb("iPhone14,8", "Blue"),
  ],
  "iphone-14-pro.png": [
    apple("iphone-14-pro-finish-select-202209-6-1inch-deeppurple"),
    ...appledb("iPhone15,2", "Deep Purple"),
  ],
  "iphone-14-pro-max.png": [
    apple("iphone-14-pro-finish-select-202209-6-7inch-deeppurple"),
    ...appledb("iPhone15,3", "Deep Purple"),
  ],
  "iphone-15.png": [
    apple("iphone-15-finish-select-202309-6-1inch-blue"),
    ...appledb("iPhone15,4", "Blue"),
  ],
  "iphone-15-plus.png": [
    apple("iphone-15-finish-select-202309-6-7inch-pink"),
    ...appledb("iPhone15,5", "Pink"),
  ],
  "iphone-15-pro.png": [
    apple("iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium"),
    ...appledb("iPhone16,1", "Natural Titanium"),
  ],
  "iphone-15-pro-max.png": [
    apple("iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium"),
    ...appledb("iPhone16,2", "Natural Titanium"),
  ],
  "iphone-16.png": [
    apple1("iphone-16-finish-select-202409-6-1inch-ultramarine"),
    ...appledb("iPhone17,3", "Ultramarine"),
  ],
  "iphone-16-plus.png": [
    apple1("iphone-16-finish-select-202409-6-7inch-teal"),
    apple1("iphone-16-finish-select-202409-6-1inch-teal"),
    ...appledb("iPhone17,4", "Teal"),
  ],
  "iphone-16-pro.png": [
    apple1("iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium"),
    ...appledb("iPhone17,1", "Natural Titanium"),
  ],
  "iphone-16-pro-max.png": [
    apple1("iphone-16-pro-finish-select-202409-6-9inch-deserttitanium"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-deserttitanium"),
    ...appledb("iPhone17,2", "Desert Titanium"),
  ],
  "iphone-16e.png": [
    apple1("iphone-16e-finish-select-202502-black"),
    apple1("iphone-16-finish-select-202409-6-1inch-black"),
    ...appledb("iPhone17,5", "Black"),
  ],
  "iphone-17.png": [
    apple1("iphone-17-finish-select-202509-6-3inch-lavender"),
    apple1("iphone-16-finish-select-202409-6-1inch-pink"),
  ],
  "iphone-17e.png": [apple1("iphone-16-finish-select-202409-6-1inch-white")],
  "iphone-air.png": [
    apple1("iphone-air-finish-select-202509"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-whitetitanium"),
  ],
  "iphone-17-pro.png": [
    apple1("iphone-17-pro-finish-select-202509-cosmic-orange"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-blacktitanium"),
  ],
  "iphone-17-pro-max.png": [
    apple1("iphone-17-pro-max-finish-select-202509-deep-blue"),
    apple1("iphone-16-pro-finish-select-202409-6-9inch-blacktitanium"),
  ],

  "macbook-air-m1-13.png": [
    apple("macbook-air-space-gray-select-201810"),
    ...appledb("MacBookAir10,1", "Space Gray"),
  ],
  "macbook-air-m2-13.png": [
    apple("macbook-air-midnight-select-20220606"),
    ...appledb("Mac14,2", "Midnight"),
  ],
  "macbook-air-m2-15.png": [
    apple("macbook-air-15-midnight-select-202306"),
    apple("macbook-air-midnight-select-20220606"),
  ],
  "macbook-air-m3-13.png": [
    apple1("mba13-midnight-select-202402"),
    apple("macbook-air-midnight-select-20220606"),
  ],
  "macbook-air-m3-15.png": [
    apple1("mba15-midnight-select-202402"),
    apple("macbook-air-midnight-select-20220606"),
  ],
  "macbook-air-m4-13.png": [
    apple1("mba13-skyblue-select-202503"),
    apple1("mba13-midnight-select-202402"),
  ],
  "macbook-air-m4-15.png": [apple1("mba15-skyblue-select-202503")],
  "macbook-air-m5-13.png": [apple1("mba13-skyblue-select-202503")],
  "macbook-air-m5-15.png": [apple1("mba15-skyblue-select-202503")],
  "macbook-pro-14-m3.png": [apple("mbp14-spaceblack-select-202310"), apple1("mbp14-spaceblack-select-202410")],
  "macbook-pro-14-m4.png": [apple1("mbp14-spaceblack-select-202410")],
  "macbook-pro-14-m5.png": [apple1("mbp14-spaceblack-select-202410")],
  "macbook-pro-16-m3-pro.png": [apple("mbp16-spaceblack-select-202310")],
  "macbook-pro-16-m4-pro.png": [apple1("mbp16-spaceblack-select-202410")],

  "imac-24-m1.png": [apple("imac-24-blue-selection-hero-202104")],
  "imac-24-m3.png": [apple("imac-24-blue-selection-hero-202310")],
  "imac-24-m4.png": [apple1("imac-24-blue-selection-hero-202410"), apple("imac-24-blue-selection-hero-202310")],
  "mac-mini-m1.png": [apple("mac-mini-hero-202011")],
  "mac-mini-m2.png": [apple("mac-mini-hero-202301")],
  "mac-mini-m4.png": [apple1("mac-mini-202410-gallery-1")],
  "mac-mini-m4-pro.png": [apple1("mac-mini-202410-gallery-1")],
  "mac-studio-m2-max.png": [apple("mac-studio-select-202306")],
  "mac-studio-m4-max.png": [apple1("mac-studio-select-202503"), apple("mac-studio-select-202306")],
  "mac-pro-2023.png": [apple("mac-pro-2019-gallery-1")],

  "ipad-9.png": [apple("ipad-2021-hero-space-wifi-select")],
  "ipad-10.png": [apple("ipad-10th-gen-finish-select-202212-blue-wifi")],
  "ipad-a16.png": [
    apple1("ipad-2025-hero-blue-wifi-select"),
    apple("ipad-10th-gen-finish-select-202212-blue-wifi"),
  ],
  "ipad-mini-6.png": [apple("ipad-mini-select-wifi-purple-202109")],
  "ipad-mini-a17-pro.png": [
    apple1("ipad-mini-select-wifi-blue-202410"),
    apple("ipad-mini-select-wifi-purple-202109"),
  ],
  "ipad-air-m2-11.png": [apple1("ipad-air-select-wifi-blue-202405")],
  "ipad-air-m2-13.png": [apple1("ipad-air-13-select-wifi-blue-202405")],
  "ipad-air-m3-11.png": [
    apple1("ipad-air-select-wifi-blue-202503"),
    apple1("ipad-air-select-wifi-blue-202405"),
  ],
  "ipad-pro-11-m4.png": [apple1("ipad-pro-11-select-wifi-spaceblack-202405")],
  "ipad-pro-13-m4.png": [apple1("ipad-pro-13-select-wifi-spaceblack-202405")],

  "apple-watch-se-2.png": [apple("watch-case-40-aluminum-midnight-nc-se_VW_PF")],
  "apple-watch-series-9.png": [apple("watch-case-41-aluminum-midnight-nc-s9")],
  "apple-watch-series-10.png": [
    apple1("watch-case-42-aluminum-jetblack-nc-s10"),
    apple("watch-case-41-aluminum-midnight-nc-s9"),
  ],
  "apple-watch-series-11.png": [
    apple1("watch-case-42-aluminum-black-nc-s11"),
    apple("watch-case-41-aluminum-midnight-nc-s9"),
  ],
  "apple-watch-ultra-2.png": [
    apple("watch-case-49-titanium-orange-ultra2_VW_PF"),
    apple("watch-ultra2-nav-202309"),
  ],
  "apple-watch-ultra-3.png": [apple1("watch-case-49-titanium-natural-ultra3")],

  "airpods-2.png": [apple("MV7N2")],
  "airpods-3.png": [apple("MME73")],
  "airpods-4.png": [apple1("airpods-4-select-202409")],
  "airpods-4-anc.png": [apple1("airpods-4-anc-select-202409"), apple1("airpods-4-select-202409")],
  "airpods-pro-2.png": [apple("MTJV3")],
  "airpods-pro-3.png": [apple1("airpods-pro-3-hero-202509"), apple("MTJV3")],
  "airpods-max.png": [apple("airpods-max-select-skyblue-202011")],
  "airpods-max-2.png": [apple1("airpods-max-2-select-202509"), apple("airpods-max-select-skyblue-202011")],
  "homepod-mini.png": [apple("homepod-mini-select-yellow-202110")],
  "homepod-2.png": [apple("homepod-select-midnight-202210")],

  "apple-pencil-usb-c.png": [apple("apple-pencil-usb-c-202310")],
  "apple-pencil-pro.png": [apple1("apple-pencil-pro-202405")],
  "magic-keyboard.png": [apple("magic-keyboard-numeric-us-english")],
  "magic-keyboard-touch-id.png": [apple("magic-keyboard-touch-id-numeric-us-english")],
  "magic-mouse.png": [apple("MK2E3"), apple("magic-mouse-2-white")],
  "magic-trackpad.png": [apple("MK2D3"), apple("magic-trackpad-white")],
  "airtag.png": [apple("airtag-double-select-202104")],
  "apple-tv-4k.png": [apple("apple-tv-4k-hero-select-202210")],
  "magsafe-charger.png": [apple("MHXH3"), apple("MX6X3")],
  "magsafe-battery-pack.png": [apple("MJWY3")],
  "apple-20w-adapter.png": [apple("MU7V2")],
  "usb-c-lightning-cable.png": [apple("MQGJ2")],
  "usb-c-charge-cable.png": [apple("MQ4H2")],
  "iphone-silicone-case.png": [apple("MQ003")],
  "smart-folio-ipad.png": [apple("smart-folio-ipad-10th-gen-blue")],
  "anker-20w-charger.png": [
    "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A2637116_TD01_V1_1e30e3ad-4e1f-495f-abde-9246b1e1ea78.png?width=2000",
  ],
};

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      Accept: "image/png,image/webp,image/*,*/*;q=0.8",
      Referer: "https://www.apple.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("image") && !ctype.includes("octet-stream")) {
    throw new Error(`Not image: ${ctype}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) throw new Error(`Too small (${buf.length})`);
  return buf;
}

/** Make near-white / light-gray studio backgrounds fully transparent. */
async function toTransparentCutout(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = data;
  const n = info.width * info.height;
  let transparent = 0;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const a = px[o + 3];
    if (a < 8) {
      transparent += 1;
      continue;
    }
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    // Light neutral studio backdrop (white / light gray)
    if (min >= 232 && sat <= 28) {
      px[o + 3] = 0;
      transparent += 1;
    } else if (min >= 210 && sat <= 18) {
      px[o + 3] = Math.min(a, Math.round(((232 - min) / 22) * 255));
    }
  }

  // If image was already mostly transparent, keep as-is after pass
  const out = await sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { buf: out, transparentRatio: transparent / n };
}

async function downloadOne(name, urls) {
  const dest = path.join(outDir, name);
  for (const url of urls) {
    try {
      const raw = await fetchBuffer(url);
      const { buf, transparentRatio } = await toTransparentCutout(raw);
      if (buf.length < 4000) continue;
      fs.writeFileSync(dest, buf);
      // Also write .jpg path as PNG bytes won't work; skip — client maps jpg→png
      return { ok: true, bytes: buf.length, transparentRatio, url };
    } catch {
      // next
    }
  }
  return { ok: false };
}

async function main() {
  const names = Object.keys(catalog);
  let ok = 0;
  let fail = 0;
  for (const name of names) {
    const result = await downloadOne(name, catalog[name]);
    if (result.ok) {
      ok += 1;
      console.log(
        `OK   ${name.padEnd(34)} ${(result.bytes / 1024).toFixed(0).padStart(5)} KB  α=${(result.transparentRatio * 100).toFixed(0)}%`,
      );
    } else {
      fail += 1;
      console.log(`FAIL ${name}`);
    }
  }
  console.log(`\nDone: ${ok} cutouts, ${fail} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
