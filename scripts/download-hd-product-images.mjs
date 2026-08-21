/**
 * Replace all product images with HD official-quality shots.
 * Sources (in order): Apple Store CDN @2000px → appledb.dev @1024 → Unsplash HD.
 * Run: node scripts/download-hd-product-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "products");
fs.mkdirSync(outDir, { recursive: true });

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function apple(id, region = "4982") {
  return `https://store.storeimages.cdn-apple.com/${region}/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=jpeg&qlt=95&.v=1`;
}

function apple1(id) {
  return `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/${id}?wid=2000&hei=2000&fmt=jpeg&qlt=95`;
}

function appledb(key, color = "Silver") {
  const c = encodeURIComponent(color);
  return [
    `https://img.appledb.dev/device@1024/${key}/${c}.png`,
    `https://img.appledb.dev/device@512/${key}/${c}.png`,
    `https://img.appledb.dev/device@256/${key}/${c}.png`,
  ];
}

function unsplash(photoId) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=2000&q=90`;
}

/**
 * Each product: ordered list of candidate URLs (first success wins).
 * Prefer unique HD shots; no low-res placeholders.
 */
const catalog = {
  // ——— iPhone ———
  "iphone-7.jpg": [
    apple("iphone7-black-select-2016"),
    ...appledb("iPhone9,3", "Black"),
    unsplash("photo-1511707171634-5f897ff02aa9"),
  ],
  "iphone-7-plus.jpg": [
    apple("iphone7-plus-black-select-2016"),
    ...appledb("iPhone9,4", "Black"),
    unsplash("photo-1511707171634-5f897ff02aa9"),
  ],
  "iphone-8.jpg": [
    apple("iphone8-silver-select-2017"),
    ...appledb("iPhone10,1", "Silver"),
    unsplash("photo-1510557880182-3d4d3cba35a5"),
  ],
  "iphone-8-plus.jpg": [
    apple("iphone8-plus-silver-select-2017"),
    ...appledb("iPhone10,2", "Silver"),
    unsplash("photo-1510557880182-3d4d3cba35a5"),
  ],
  "iphone-x.jpg": [
    apple("iphone-x-silver-select-2017"),
    ...appledb("iPhone10,6", "Silver"),
    unsplash("photo-1512499617640-c74ae3a79d37"),
  ],
  "iphone-xr.jpg": [
    apple("iphone-xr-blue-select-201809"),
    ...appledb("iPhone11,8", "Blue"),
    unsplash("photo-1556656793-08538906a9f8"),
  ],
  "iphone-xs.jpg": [
    apple("iphone-xs-gold-select-2018"),
    ...appledb("iPhone11,2", "Gold"),
    unsplash("photo-1512499617640-c74ae3a79d37"),
  ],
  "iphone-xs-max.jpg": [
    apple("iphone-xs-max-gold-select-2018"),
    ...appledb("iPhone11,6", "Gold"),
    unsplash("photo-1512499617640-c74ae3a79d37"),
  ],
  "iphone-11.jpg": [
    apple("iphone11-purple-select-2019"),
    ...appledb("iPhone12,1", "Purple"),
    unsplash("photo-1574751660796-8d0a5f0a8f2a"),
  ],
  "iphone-11-pro.jpg": [
    apple("iphone-11-pro-midnight-green-select-2019"),
    ...appledb("iPhone12,3", "Midnight Green"),
    unsplash("photo-1592899677977-9c10ca588bbd"),
  ],
  "iphone-11-pro-max.jpg": [
    apple("iphone-11-pro-max-midnight-green-select-2019"),
    ...appledb("iPhone12,5", "Midnight Green"),
    unsplash("photo-1592899677977-9c10ca588bbd"),
  ],
  "iphone-12-mini.jpg": [
    apple("iphone-12-mini-blue-select-2020"),
    ...appledb("iPhone13,1", "Blue"),
    unsplash("photo-1603921326210-6edd2d60ec0d"),
  ],
  "iphone-12.jpg": [
    apple("iphone-12-blue-select-2020"),
    ...appledb("iPhone13,2", "Blue"),
    unsplash("photo-1603921326210-6edd2d60ec0d"),
  ],
  "iphone-12-pro.jpg": [
    apple("iphone-12-pro-blue-hero"),
    ...appledb("iPhone13,3", "Pacific Blue"),
    unsplash("photo-1611472173362-318cc493a405"),
  ],
  "iphone-12-pro-max.jpg": [
    apple("iphone-12-pro-max-blue-hero"),
    ...appledb("iPhone13,4", "Pacific Blue"),
    unsplash("photo-1611472173362-318cc493a405"),
  ],
  "iphone-13-mini.jpg": [
    apple("iphone-13-mini-blue-select-2021"),
    ...appledb("iPhone14,4", "Blue"),
    unsplash("photo-1632661674596-df8beab8a0b5"),
  ],
  "iphone-13.jpg": [
    apple("iphone-13-blue-select-2021"),
    apple("iphone-13-finish-select-202207-6-1inch-blue"),
    ...appledb("iPhone14,5", "Blue"),
    unsplash("photo-1632661674596-df8beab8a0b5"),
  ],
  "iphone-13-pro.jpg": [
    apple("iphone-13-pro-sierra-blue-select"),
    apple("iphone-13-pro-finish-select-202207-6-1inch-sierrablue"),
    ...appledb("iPhone14,2", "Sierra Blue"),
    unsplash("photo-1635870720329-0b0c4b0c0c0c"),
  ],
  "iphone-13-pro-max.jpg": [
    apple("iphone-13-pro-max-graphite-select"),
    ...appledb("iPhone14,3", "Graphite"),
    unsplash("photo-1632661674596-df8beab8a0b5"),
  ],
  "iphone-14.jpg": [
    apple("iphone-14-finish-select-202209-6-1inch-midnight"),
    ...appledb("iPhone14,7", "Midnight"),
    unsplash("photo-1663499900239-ba3d5e6f0c8d"),
  ],
  "iphone-14-plus.jpg": [
    apple("iphone-14-plus-finish-select-202209-6-7inch-blue"),
    apple("iphone-14-finish-select-202209-6-1inch-blue"),
    ...appledb("iPhone14,8", "Blue"),
    unsplash("photo-1663499900239-ba3d5e6f0c8d"),
  ],
  "iphone-14-pro.jpg": [
    apple("iphone-14-pro-finish-select-202209-6-1inch-deeppurple"),
    ...appledb("iPhone15,2", "Deep Purple"),
    unsplash("photo-1663499480120-0c8f2a0e3f2a"),
  ],
  "iphone-14-pro-max.jpg": [
    apple("iphone-14-pro-finish-select-202209-6-7inch-deeppurple"),
    ...appledb("iPhone15,3", "Deep Purple"),
    unsplash("photo-1663499480120-0c8f2a0e3f2a"),
  ],
  "iphone-15.jpg": [
    apple("iphone-15-finish-select-202309-6-1inch-blue"),
    ...appledb("iPhone15,4", "Blue"),
    unsplash("photo-1695048133142-1a20484d2569"),
  ],
  "iphone-15-plus.jpg": [
    apple("iphone-15-finish-select-202309-6-7inch-pink"),
    ...appledb("iPhone15,5", "Pink"),
    unsplash("photo-1695048133142-1a20484d2569"),
  ],
  "iphone-15-pro.jpg": [
    apple("iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium"),
    ...appledb("iPhone16,1", "Natural Titanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-15-pro-max.jpg": [
    apple("iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium"),
    apple("iphone-15-pro-finish-select-202309-6-7inch_GEO_US"),
    ...appledb("iPhone16,2", "Natural Titanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-16.jpg": [
    apple1("iphone-16-finish-select-202409-6-1inch-ultramarine"),
    ...appledb("iPhone17,3", "Ultramarine"),
    unsplash("photo-1726587899589-0f0f0f0f0f0f"),
  ],
  "iphone-16-plus.jpg": [
    apple1("iphone-16-finish-select-202409-6-7inch-teal"),
    apple1("iphone-16-finish-select-202409-6-1inch-teal"),
    ...appledb("iPhone17,4", "Teal"),
    unsplash("photo-1695048133142-1a20484d2569"),
  ],
  "iphone-16-pro.jpg": [
    apple1("iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium"),
    ...appledb("iPhone17,1", "Natural Titanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-16-pro-max.jpg": [
    apple1("iphone-16-pro-finish-select-202409-6-9inch-deserttitanium"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-deserttitanium"),
    ...appledb("iPhone17,2", "Desert Titanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-16e.jpg": [
    apple1("iphone-16e-finish-select-202502-black"),
    apple1("iphone-16-finish-select-202409-6-1inch-black"),
    ...appledb("iPhone17,5", "Black"),
    unsplash("photo-1511707171634-5f897ff02aa9"),
  ],
  "iphone-17.jpg": [
    apple1("iphone-17-finish-select-202509-6-3inch-lavender"),
    apple1("iphone-16-finish-select-202409-6-1inch-pink"),
    unsplash("photo-1695048133142-1a20484d2569"),
  ],
  "iphone-17e.jpg": [
    apple1("iphone-16-finish-select-202409-6-1inch-white"),
    unsplash("photo-1510557880182-3d4d3cba35a5"),
  ],
  "iphone-air.jpg": [
    apple1("iphone-air-finish-select-202509"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-whitetitanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-17-pro.jpg": [
    apple1("iphone-17-pro-finish-select-202509-cosmic-orange"),
    apple1("iphone-16-pro-finish-select-202409-6-3inch-blacktitanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],
  "iphone-17-pro-max.jpg": [
    apple1("iphone-17-pro-max-finish-select-202509-deep-blue"),
    apple1("iphone-16-pro-finish-select-202409-6-9inch-blacktitanium"),
    unsplash("photo-1696425725876-0e60990a5d3d"),
  ],

  // ——— MacBook ———
  "macbook-air-m1-13.jpg": [
    apple("macbook-air-space-gray-select-201810"),
    ...appledb("MacBookAir10,1", "Space Gray"),
    unsplash("photo-1517336714731-489689fd1ca8"),
  ],
  "macbook-air-m2-13.jpg": [
    apple("macbook-air-midnight-select-20220606"),
    ...appledb("Mac14,2", "Midnight"),
    unsplash("photo-1611186871348-b1ce696e52c9"),
  ],
  "macbook-air-m2-15.jpg": [
    apple("macbook-air-15-midnight-select-202306"),
    apple("macbook-air-midnight-select-20220606"),
    unsplash("photo-1611186871348-b1ce696e52c9"),
  ],
  "macbook-air-m3-13.jpg": [
    apple1("mba13-midnight-select-202402"),
    apple("macbook-air-midnight-select-20220606"),
    unsplash("photo-1541807084-5c52b6b3adef"),
  ],
  "macbook-air-m3-15.jpg": [
    apple1("mba15-midnight-select-202402"),
    apple("macbook-air-midnight-select-20220606"),
    unsplash("photo-1541807084-5c52b6b3adef"),
  ],
  "macbook-air-m4-13.jpg": [
    apple1("mba13-skyblue-select-202503"),
    apple1("mba13-midnight-select-202402"),
    unsplash("photo-1517336714731-489689fd1ca8"),
  ],
  "macbook-air-m4-15.jpg": [
    apple1("mba15-skyblue-select-202503"),
    unsplash("photo-1517336714731-489689fd1ca8"),
  ],
  "macbook-air-m5-13.jpg": [
    apple1("mba13-skyblue-select-202503"),
    unsplash("photo-1611186871348-b1ce696e52c9"),
  ],
  "macbook-air-m5-15.jpg": [
    apple1("mba15-skyblue-select-202503"),
    unsplash("photo-1611186871348-b1ce696e52c9"),
  ],
  "macbook-pro-14-m3.jpg": [
    apple("mbp14-spaceblack-select-202310"),
    unsplash("photo-1517336714731-489689fd1ca8"),
  ],
  "macbook-pro-14-m4.jpg": [
    apple1("mbp14-spaceblack-select-202410"),
    unsplash("photo-1496181133206-80ce9b88a853"),
  ],
  "macbook-pro-14-m5.jpg": [
    apple1("mbp14-spaceblack-select-202410"),
    unsplash("photo-1496181133206-80ce9b88a853"),
  ],
  "macbook-pro-16-m3-pro.jpg": [
    apple("mbp16-spaceblack-select-202310"),
    unsplash("photo-1517336714731-489689fd1ca8"),
  ],
  "macbook-pro-16-m4-pro.jpg": [
    apple1("mbp16-spaceblack-select-202410"),
    unsplash("photo-1496181133206-80ce9b88a853"),
  ],

  // ——— Desktop ———
  "imac-24-m1.jpg": [
    apple("imac-24-blue-selection-hero-202104"),
    unsplash("photo-1527443224154-c4a3942d3acf"),
  ],
  "imac-24-m3.jpg": [
    apple("imac-24-blue-selection-hero-202310"),
    unsplash("photo-1527443224154-c4a3942d3acf"),
  ],
  "imac-24-m4.jpg": [
    apple1("imac-24-blue-selection-hero-202410"),
    apple("imac-24-blue-selection-hero-202310"),
    unsplash("photo-1527443224154-c4a3942d3acf"),
  ],
  "mac-mini-m1.jpg": [
    apple("mac-mini-hero-202011"),
    unsplash("photo-1593640408182-31c70c8268f5"),
  ],
  "mac-mini-m2.jpg": [
    apple("mac-mini-hero-202301"),
    unsplash("photo-1593640408182-31c70c8268f5"),
  ],
  "mac-mini-m4.jpg": [
    apple1("mac-mini-202410-gallery-1"),
    unsplash("photo-1593640408182-31c70c8268f5"),
  ],
  "mac-mini-m4-pro.jpg": [
    apple1("mac-mini-202410-gallery-1"),
    unsplash("photo-1593640408182-31c70c8268f5"),
  ],
  "mac-studio-m2-max.jpg": [
    apple("mac-studio-select-202306"),
    unsplash("photo-1597872200969-2b65d56bd16b"),
  ],
  "mac-studio-m4-max.jpg": [
    apple1("mac-studio-select-202503"),
    apple("mac-studio-select-202306"),
    unsplash("photo-1597872200969-2b65d56bd16b"),
  ],
  "mac-pro-2023.jpg": [
    apple("mac-pro-2019-gallery-1"),
    unsplash("photo-1597872200969-2b65d56bd16b"),
  ],

  // ——— iPad ———
  "ipad-9.jpg": [
    apple("ipad-2021-hero-space-wifi-select"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-10.jpg": [
    apple("ipad-10th-gen-finish-select-202212-blue-wifi"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-a16.jpg": [
    apple1("ipad-2025-hero-blue-wifi-select"),
    apple("ipad-10th-gen-finish-select-202212-blue-wifi"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-mini-6.jpg": [
    apple("ipad-mini-select-wifi-purple-202109"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-mini-a17-pro.jpg": [
    apple1("ipad-mini-select-wifi-blue-202410"),
    apple("ipad-mini-select-wifi-purple-202109"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-air-m2-11.jpg": [
    apple1("ipad-air-select-wifi-blue-202405"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-air-m2-13.jpg": [
    apple1("ipad-air-13-select-wifi-blue-202405"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-air-m3-11.jpg": [
    apple1("ipad-air-select-wifi-blue-202503"),
    apple1("ipad-air-select-wifi-blue-202405"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-pro-11-m4.jpg": [
    apple1("ipad-pro-11-select-wifi-spaceblack-202405"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "ipad-pro-13-m4.jpg": [
    apple1("ipad-pro-13-select-wifi-spaceblack-202405"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],

  // ——— Watch ———
  "apple-watch-se-2.jpg": [
    apple("watch-case-40-aluminum-midnight-nc-se_VW_PF"),
    unsplash("photo-1434493789847-2f02dc6ca35d"),
  ],
  "apple-watch-series-9.jpg": [
    apple("watch-case-41-aluminum-midnight-nc-s9"),
    unsplash("photo-1434493789847-2f02dc6ca35d"),
  ],
  "apple-watch-series-10.jpg": [
    apple1("watch-case-42-aluminum-jetblack-nc-s10"),
    apple("watch-case-41-aluminum-midnight-nc-s9"),
    unsplash("photo-1434493789847-2f02dc6ca35d"),
  ],
  "apple-watch-series-11.jpg": [
    apple1("watch-case-42-aluminum-black-nc-s11"),
    apple("watch-case-41-aluminum-midnight-nc-s9"),
    unsplash("photo-1434493789847-2f02dc6ca35d"),
  ],
  "apple-watch-ultra-2.jpg": [
    apple("watch-case-49-titanium-orange-ultra2_VW_PF"),
    apple("watch-ultra2-nav-202309"),
    unsplash("photo-1579586337278-3befd40fd17a"),
  ],
  "apple-watch-ultra-3.jpg": [
    apple1("watch-case-49-titanium-natural-ultra3"),
    unsplash("photo-1579586337278-3befd40fd17a"),
  ],

  // ——— Audio ———
  "airpods-2.jpg": [
    apple("MV7N2"),
    unsplash("photo-1600294037681-c80b4cb5b434"),
  ],
  "airpods-3.jpg": [
    apple("MME73"),
    unsplash("photo-1600294037681-c80b4cb5b434"),
  ],
  "airpods-4.jpg": [
    apple1("airpods-4-select-202409"),
    unsplash("photo-1600294037681-c80b4cb5b434"),
  ],
  "airpods-4-anc.jpg": [
    apple1("airpods-4-anc-select-202409"),
    apple1("airpods-4-select-202409"),
    unsplash("photo-1600294037681-c80b4cb5b434"),
  ],
  "airpods-pro-2.jpg": [
    apple("MTJV3"),
    unsplash("photo-1606220945770-b5b6c2c55bf1"),
  ],
  "airpods-pro-3.jpg": [
    apple1("airpods-pro-3-hero-202509"),
    apple("MTJV3"),
    unsplash("photo-1606220945770-b5b6c2c55bf1"),
  ],
  "airpods-max.jpg": [
    apple("airpods-max-select-skyblue-202011"),
    unsplash("photo-1618366712010-f4ae9c647dcb"),
  ],
  "airpods-max-2.jpg": [
    apple1("airpods-max-2-select-202509"),
    apple("airpods-max-select-skyblue-202011"),
    unsplash("photo-1618366712010-f4ae9c647dcb"),
  ],
  "homepod-mini.jpg": [
    apple("homepod-mini-select-yellow-202110"),
    unsplash("photo-1589003077984-894e133dabab"),
  ],
  "homepod-2.jpg": [
    apple("homepod-select-midnight-202210"),
    unsplash("photo-1589003077984-894e133dabab"),
  ],

  // ——— Accessories ———
  "apple-pencil-usb-c.jpg": [
    apple("apple-pencil-usb-c-202310"),
    unsplash("photo-1587825140708-dfaf72ae4b04"),
  ],
  "apple-pencil-pro.jpg": [
    apple1("apple-pencil-pro-202405"),
    unsplash("photo-1587825140708-dfaf72ae4b04"),
  ],
  "magic-keyboard.jpg": [
    apple("magic-keyboard-numeric-us-english"),
    unsplash("photo-1587829741301-dc798b83add3"),
  ],
  "magic-keyboard-touch-id.jpg": [
    apple("magic-keyboard-touch-id-numeric-us-english"),
    unsplash("photo-1587829741301-dc798b83add3"),
  ],
  "magic-mouse.jpg": [
    apple("magicmouse2-white-gallery-2024"),
    apple("magic-mouse-2-white"),
    unsplash("photo-1527864550417-7fd91fc51a46"),
  ],
  "magic-trackpad.jpg": [
    apple("magic-trackpad-white"),
    unsplash("photo-1527864550417-7fd91fc51a46"),
  ],
  "airtag.jpg": [
    apple("airtag-double-select-202104"),
    unsplash("photo-1611532736597-de2d4265fba3"),
  ],
  "apple-tv-4k.jpg": [
    apple("apple-tv-4k-hero-select-202210"),
    unsplash("photo-1593359672878-f0c0c0c0c0c0"),
  ],
  "magsafe-charger.jpg": [
    apple("magsafe-charger-202010"),
    unsplash("photo-1609091839311-b140b7a3d6d2"),
  ],
  "magsafe-battery-pack.jpg": [
    apple("magsafe-battery-pack-202107"),
    unsplash("photo-1609091839311-b140b7a3d6d2"),
  ],
  "apple-20w-adapter.jpg": [
    apple("MU7V2"),
    unsplash("photo-1583863788434-e43a8e7d0e3d"),
  ],
  "usb-c-lightning-cable.jpg": [
    apple("MQGJ2"),
    unsplash("photo-1625948515291-69613efd103f"),
  ],
  "usb-c-charge-cable.jpg": [
    apple("MQ4H2"),
    unsplash("photo-1625948515291-69613efd103f"),
  ],
  "iphone-silicone-case.jpg": [
    apple("MQ003"),
    unsplash("photo-1601784551446-20c9e07cdbdb"),
  ],
  "smart-folio-ipad.jpg": [
    apple("smart-folio-ipad-10th-gen-blue"),
    unsplash("photo-1544244015-0df4b3ffc6b0"),
  ],
  "anker-20w-charger.jpg": [
    "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A2637116_TD01_V1_1e30e3ad-4e1f-495f-abde-9246b1e1ea78.png?width=2000",
    unsplash("photo-1583863788434-e43a8e7d0e3d"),
  ],
};

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
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
  if (buf.length < 8000) throw new Error(`Too small (${buf.length})`);
  return buf;
}

async function downloadOne(name, urls) {
  const dest = path.join(outDir, name);
  for (const url of urls) {
    try {
      const buf = await fetchBuffer(url);
      fs.writeFileSync(dest, buf);
      return { ok: true, bytes: buf.length, url };
    } catch {
      // try next
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
      console.log(`OK   ${name.padEnd(32)} ${(result.bytes / 1024).toFixed(0)} KB`);
    } else {
      fail += 1;
      console.log(`FAIL ${name}`);
    }
  }
  console.log(`\nDone: ${ok} HD images, ${fail} failed. Total files: ${fs.readdirSync(outDir).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
