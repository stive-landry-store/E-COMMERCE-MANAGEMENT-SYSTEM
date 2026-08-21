// Full Apple catalogue for Stive Landry Store.
//
// Prices are expressed in FCFA (XAF) for the SMALLEST storage of each model.
// Current Apple products use the manufacturer MSRP converted at 600 XAF / USD.
// Discontinued models (iPhone 7 -> 15, older Macs and iPads) have no MSRP any
// more, so they carry an estimated Cameroon resale price. Adjust any of them
// from the console: Products -> click the price.
//
// Larger storages are priced with a ladder: the Nth storage of a model costs
// base + ladder[N]. Colours never change the price.

export const LADDERS = {
  phone: [0, 60_000, 120_000, 240_000, 480_000],
  tablet: [0, 60_000, 120_000, 240_000, 360_000],
  mac: [0, 120_000, 240_000, 480_000, 720_000, 1_080_000],
  flat: [0, 20_000, 40_000, 60_000],
};

export const CATEGORIES = [
  {
    name: "iPhone",
    slug: "iphone",
    description: "Every iPhone generation, from the iPhone 7 to the iPhone 17 Pro Max.",
    image: "/categories/iphone.jpg",
    sort: 10,
  },
  {
    name: "Laptop / MacBook",
    slug: "laptop-macbook",
    description: "MacBook Air and MacBook Pro, Apple silicon from M1 to M5.",
    image: "/categories/macbook.jpg",
    sort: 20,
  },
  {
    name: "Mac Desktop",
    slug: "mac-desktop",
    description: "iMac, Mac mini, Mac Studio and Mac Pro.",
    image: "/categories/mac-desktop.jpg",
    sort: 30,
  },
  {
    name: "iPad",
    slug: "ipad",
    description: "iPad, iPad mini, iPad Air and iPad Pro.",
    image: "/categories/ipad.jpg",
    sort: 40,
  },
  {
    name: "Wearables",
    slug: "wearables",
    description: "Apple Watch Series, SE and Ultra.",
    image: "/categories/wearables.jpg",
    sort: 50,
  },
  {
    name: "Audio",
    slug: "audio",
    description: "AirPods, AirPods Pro, AirPods Max and HomePod.",
    image: "/categories/audio.jpg",
    sort: 60,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Apple Pencil, Magic accessories, AirTag, chargers, cables, cases and bands.",
    image: "/categories/accessories.jpg",
    sort: 70,
  },
];

// Swatch colours used by the storefront colour picker.
export const COLOR_HEX = {
  Black: "#1f2020",
  "Jet Black": "#0b0b0d",
  Gold: "#f3e2c7",
  "Rose Gold": "#eec4bb",
  Silver: "#e3e4e6",
  "PRODUCT(RED)": "#b8022a",
  "Space Gray": "#56565a",
  White: "#f5f5f7",
  Blue: "#4b6f9c",
  Yellow: "#f0e4a3",
  Coral: "#f8776a",
  Green: "#a8c8b8",
  Purple: "#d5cae0",
  "Midnight Green": "#4e5851",
  "Pacific Blue": "#3a5a72",
  Graphite: "#55514f",
  Starlight: "#f0e9df",
  Midnight: "#2f3642",
  Pink: "#f2d5d8",
  "Alpine Blue": "#46596b",
  "Space Black": "#33322f",
  "Deep Purple": "#5b5470",
  "Natural Titanium": "#c2bcb2",
  "Blue Titanium": "#47576b",
  "White Titanium": "#f2f1ed",
  "Black Titanium": "#3b3b3d",
  "Desert Titanium": "#bfa48f",
  Teal: "#a7c8c9",
  Ultramarine: "#6d7ec8",
  "Mist Blue": "#b8c6d6",
  Lavender: "#d3c7e0",
  Sage: "#c3cdb8",
  "Cosmic Orange": "#e2622a",
  "Deep Blue": "#2c3d5c",
  "Sky Blue": "#b6c6d8",
  Orange: "#f2a05e",
  "Cloud White": "#eeeae4",
  "Light Gold": "#e6d4b4",
  "Slate Titanium": "#4a4a4c",
  "Gold Titanium": "#c9a875",
  "Jet Black Aluminium": "#1c1c1e",
  "Rose Gold Aluminium": "#eec4bb",
};

// Colour shorthands.
const IP7 = ["Black", "Jet Black", "Gold", "Rose Gold", "Silver", "PRODUCT(RED)"];
const IP8 = ["Gold", "Silver", "Space Gray", "PRODUCT(RED)"];
const IPX = ["Space Gray", "Silver"];
const IPXR = ["Black", "White", "Blue", "Yellow", "Coral", "PRODUCT(RED)"];
const IPXS = ["Gold", "Space Gray", "Silver"];
const IP11 = ["Black", "Green", "Yellow", "Purple", "PRODUCT(RED)", "White"];
const IP11P = ["Midnight Green", "Silver", "Gold", "Space Gray"];
const IP12 = ["Black", "White", "PRODUCT(RED)", "Green", "Blue", "Purple"];
const IP12P = ["Silver", "Graphite", "Gold", "Pacific Blue"];
const IP13 = ["PRODUCT(RED)", "Starlight", "Midnight", "Blue", "Pink", "Green"];
const IP13P = ["Graphite", "Gold", "Silver", "Alpine Blue"];
const IP14 = ["Midnight", "Starlight", "Blue", "Purple", "PRODUCT(RED)", "Yellow"];
const IP14P = ["Space Black", "Silver", "Gold", "Deep Purple"];
const IP15 = ["Black", "Blue", "Green", "Yellow", "Pink"];
const IP15P = ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"];
const IP16 = ["Black", "White", "Pink", "Teal", "Ultramarine"];
const IP16P = ["Black Titanium", "Natural Titanium", "White Titanium", "Desert Titanium"];
const IP17 = ["Black", "White", "Mist Blue", "Lavender", "Sage"];
const IP17P = ["Cosmic Orange", "Deep Blue", "Silver"];
const BW = ["Black", "White"];

const AIR_M1 = ["Space Gray", "Silver", "Gold"];
const AIR_M2 = ["Midnight", "Starlight", "Silver", "Space Gray"];
const AIR_M4 = ["Midnight", "Starlight", "Silver", "Sky Blue"];
const AIR_M5 = ["Sky Blue", "Silver", "Starlight", "Midnight"];
const MBP_PRO = ["Silver", "Space Black"];
const MBP_OLD = ["Silver", "Space Gray"];
const IMAC = ["Green", "Yellow", "Orange", "Pink", "Purple", "Blue", "Silver"];
const SILVER = ["Silver"];

const IPAD_MINI_NEW = ["Blue", "Purple", "Starlight", "Space Gray"];
const IPAD_NEUTRAL = ["Silver", "Space Gray"];
const IPAD_10 = ["Blue", "Pink", "Yellow", "Silver"];
const IPAD_AIR_5 = ["Space Gray", "Starlight", "Pink", "Purple", "Blue"];

const WATCH_ALU = ["Midnight", "Starlight", "Silver", "Space Gray"];
const WATCH_ALU_NEW = ["Jet Black Aluminium", "Rose Gold Aluminium", "Silver", "Space Gray"];
const WATCH_ULTRA = ["Natural Titanium", "Black Titanium"];

const S_32_256 = ["32GB", "128GB", "256GB"];
const S_64_256 = ["64GB", "128GB", "256GB"];
const S_64_512 = ["64GB", "256GB", "512GB"];
const S_64_256_2 = ["64GB", "256GB"];
const S_128_512 = ["128GB", "256GB", "512GB"];
const S_128_1T = ["128GB", "256GB", "512GB", "1TB"];
const S_256_1T = ["256GB", "512GB", "1TB"];
const S_256_512 = ["256GB", "512GB"];
const S_256_2T = ["256GB", "512GB", "1TB", "2TB"];
const S_MAC_256 = ["256GB", "512GB", "1TB", "2TB"];
const S_MAC_512 = ["512GB", "1TB", "2TB", "4TB"];
const S_MAC_PRO = ["512GB", "1TB", "2TB", "4TB", "8TB"];
const S_STUDIO = ["512GB", "1TB", "2TB", "4TB", "8TB"];
const S_ONE = ["Standard"];

/**
 * @param sku    Product SKU prefix, also used to build variant SKUs.
 * @param name   Display name.
 * @param cat    Category slug.
 * @param price  FCFA price of the smallest storage.
 * @param storages Storage / size options, smallest first.
 * @param colors Colour options.
 */
function P(sku, name, cat, price, storages, colors, opts = {}) {
  return {
    sku,
    name,
    slug: name
      .toLowerCase()
      .replace(/[()]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    category: cat,
    basePrice: price,
    storages,
    colors,
    ladder: opts.ladder ?? (cat === "iphone" ? "phone" : cat === "ipad" ? "tablet" : cat.startsWith("mac") || cat === "laptop-macbook" ? "mac" : "flat"),
    featured: opts.featured ?? false,
    description: opts.description ?? `${name}. Genuine Apple product, available at Stive Landry Store.`,
    specs: opts.specs ?? {},
    apple: opts.apple ?? null,
    legacy: opts.legacy ?? false,
  };
}

export const PRODUCTS = [
  // ---------------------------------------------------------------- iPhone
  P("IP7", "iPhone 7", "iphone", 45_000, S_32_256, IP7, { legacy: true }),
  P("IP7PL", "iPhone 7 Plus", "iphone", 60_000, S_32_256, IP7, { legacy: true }),
  P("IP8", "iPhone 8", "iphone", 70_000, S_64_256, IP8, { legacy: true }),
  P("IP8PL", "iPhone 8 Plus", "iphone", 85_000, S_64_256, IP8, { legacy: true }),
  P("IPX", "iPhone X", "iphone", 95_000, S_64_256_2, IPX, { legacy: true }),
  P("IPXR", "iPhone XR", "iphone", 110_000, S_64_256, IPXR, { legacy: true }),
  P("IPXS", "iPhone XS", "iphone", 120_000, S_64_512, IPXS, { legacy: true }),
  P("IPXSM", "iPhone XS Max", "iphone", 140_000, S_64_512, IPXS, { legacy: true }),

  P("IP11", "iPhone 11", "iphone", 160_000, S_64_256, IP11, { legacy: true }),
  P("IP11P", "iPhone 11 Pro", "iphone", 200_000, S_64_512, IP11P, { legacy: true }),
  P("IP11PM", "iPhone 11 Pro Max", "iphone", 230_000, S_64_512, IP11P, { legacy: true }),

  P("IP12MI", "iPhone 12 mini", "iphone", 190_000, S_64_256, IP12, { legacy: true }),
  P("IP12", "iPhone 12", "iphone", 220_000, S_64_256, IP12, { legacy: true }),
  P("IP12P", "iPhone 12 Pro", "iphone", 270_000, S_128_512, IP12P, { legacy: true }),
  P("IP12PM", "iPhone 12 Pro Max", "iphone", 310_000, S_128_512, IP12P, { legacy: true }),

  P("IP13MI", "iPhone 13 mini", "iphone", 260_000, S_128_512, IP13, { legacy: true }),
  P("IP13", "iPhone 13", "iphone", 300_000, S_128_512, IP13, {
    apple: { family: "iphone-13", period: "202207", size: "6-1inch" },
  }),
  P("IP13P", "iPhone 13 Pro", "iphone", 360_000, S_128_1T, IP13P, { legacy: true }),
  P("IP13PM", "iPhone 13 Pro Max", "iphone", 400_000, S_128_1T, IP13P, { legacy: true }),

  P("IP14", "iPhone 14", "iphone", 360_000, S_128_512, IP14, {
    apple: { family: "iphone-14", period: "202209", size: "6-1inch" },
    specs: { display: "6.1-inch Super Retina XDR", chip: "A15 Bionic", camera: "Dual 12MP" },
  }),
  P("IP14PL", "iPhone 14 Plus", "iphone", 400_000, S_128_512, IP14, {
    apple: { family: "iphone-14", period: "202209", size: "6-7inch" },
  }),
  P("IP14P", "iPhone 14 Pro", "iphone", 470_000, S_128_1T, IP14P, { legacy: true }),
  P("IP14PM", "iPhone 14 Pro Max", "iphone", 520_000, S_128_1T, IP14P, { legacy: true }),

  P("IP15", "iPhone 15", "iphone", 480_000, S_128_512, IP15, {
    featured: true,
    apple: { family: "iphone-15", period: "202309", size: "6-1inch" },
    specs: { display: "6.1-inch Super Retina XDR", chip: "A16 Bionic", camera: "48MP Main" },
  }),
  P("IP15PL", "iPhone 15 Plus", "iphone", 540_000, S_128_512, IP15, {
    apple: { family: "iphone-15", period: "202309", size: "6-7inch" },
  }),
  P("IP15P", "iPhone 15 Pro", "iphone", 660_000, S_128_1T, IP15P, {
    featured: true,
    apple: { family: "iphone-15-pro", period: "202309", size: "6-1inch" },
    specs: { chip: "A17 Pro", material: "Titanium", camera: "48MP Pro camera system" },
  }),
  P("IP15PM", "iPhone 15 Pro Max", "iphone", 780_000, S_256_1T, IP15P, {
    apple: { family: "iphone-15-pro", period: "202309", size: "6-7inch" },
  }),

  P("IP16", "iPhone 16", "iphone", 540_000, S_128_512, IP16, {
    featured: true,
    apple: { family: "iphone-16", period: "202409", size: "6-1inch" },
    specs: { chip: "A18", camera: "48MP Fusion", feature: "Camera Control" },
  }),
  P("IP16PL", "iPhone 16 Plus", "iphone", 600_000, S_128_512, IP16, {
    apple: { family: "iphone-16", period: "202409", size: "6-7inch" },
  }),
  P("IP16P", "iPhone 16 Pro", "iphone", 720_000, S_128_1T, IP16P, {
    featured: true,
    apple: { family: "iphone-16-pro", period: "202409", size: "6-3inch" },
    specs: { chip: "A18 Pro", material: "Titanium", camera: "48MP Fusion + 48MP Ultra Wide" },
  }),
  P("IP16PM", "iPhone 16 Pro Max", "iphone", 840_000, S_256_1T, IP16P, {
    apple: { family: "iphone-16-pro", period: "202409", size: "6-9inch" },
  }),
  P("IP16E", "iPhone 16e", "iphone", 360_000, S_128_512, BW, {
    apple: { family: "iphone-16e", period: "202502", size: "6-1inch" },
  }),

  P("IP17", "iPhone 17", "iphone", 600_000, S_256_512, IP17, {
    featured: true,
    apple: { family: "iphone-17", period: "202509", size: "6-3inch" },
    specs: { chip: "A19", display: "6.3-inch Super Retina XDR" },
  }),
  P("IP17E", "iPhone 17e", "iphone", 400_000, S_256_512, BW),
  P("IPAIR", "iPhone Air", "iphone", 720_000, S_256_1T, ["Space Black", "Cloud White", "Light Gold", "Sky Blue"], {
    apple: { family: "iphone-air", period: "202509", size: "6-5inch" },
    specs: { design: "Titanium, 5.6 mm", chip: "A19 Pro" },
  }),
  P("IP17P", "iPhone 17 Pro", "iphone", 780_000, S_256_2T, IP17P, {
    featured: true,
    apple: { family: "iphone-17-pro", period: "202509", size: "6-3inch" },
    specs: { chip: "A19 Pro", camera: "Triple 48MP Pro Fusion" },
  }),
  P("IP17PM", "iPhone 17 Pro Max", "iphone", 900_000, S_256_2T, IP17P, {
    featured: true,
    apple: { family: "iphone-17-pro", period: "202509", size: "6-9inch" },
    specs: { chip: "A19 Pro", camera: "Triple 48MP Pro Fusion" },
  }),

  // ---------------------------------------------------- MacBook Air / Pro
  P("MBA-M1-13", "MacBook Air M1 13-inch", "laptop-macbook", 420_000, S_MAC_256, AIR_M1, {
    specs: { chip: "Apple M1", display: "13.3-inch Retina" },
  }),
  P("MBA-M2-13", "MacBook Air M2 13-inch", "laptop-macbook", 600_000, S_MAC_256, AIR_M2, {
    specs: { chip: "Apple M2", display: "13.6-inch Liquid Retina" },
  }),
  P("MBA-M2-15", "MacBook Air M2 15-inch", "laptop-macbook", 700_000, S_MAC_256, AIR_M2, {
    specs: { chip: "Apple M2", display: "15.3-inch Liquid Retina" },
  }),
  P("MBA-M3-13", "MacBook Air M3 13-inch", "laptop-macbook", 700_000, S_MAC_256, AIR_M2, {
    specs: { chip: "Apple M3", display: "13.6-inch Liquid Retina" },
  }),
  P("MBA-M3-15", "MacBook Air M3 15-inch", "laptop-macbook", 800_000, S_MAC_256, AIR_M2, {
    specs: { chip: "Apple M3", display: "15.3-inch Liquid Retina" },
  }),
  P("MBA-M4-13", "MacBook Air M4 13-inch", "laptop-macbook", 660_000, S_MAC_256, AIR_M4, {
    featured: true,
    apple: { family: "mba13-m4", period: "202503", size: "" },
    specs: { chip: "Apple M4", display: "13.6-inch Liquid Retina" },
  }),
  P("MBA-M4-15", "MacBook Air M4 15-inch", "laptop-macbook", 780_000, S_MAC_256, AIR_M4, {
    specs: { chip: "Apple M4", display: "15.3-inch Liquid Retina" },
  }),
  P("MBA-M5-13", "MacBook Air M5 13-inch", "laptop-macbook", 780_000, ["512GB", "1TB", "2TB", "4TB"], AIR_M5, {
    featured: true,
    specs: { chip: "Apple M5", display: "13.6-inch Liquid Retina" },
  }),
  P("MBA-M5-15", "MacBook Air M5 15-inch", "laptop-macbook", 900_000, ["512GB", "1TB", "2TB", "4TB"], AIR_M5, {
    specs: { chip: "Apple M5", display: "15.3-inch Liquid Retina" },
  }),

  P("MBP14-M1P", "MacBook Pro 14-inch M1 Pro", "laptop-macbook", 1_000_000, S_MAC_512, MBP_OLD),
  P("MBP14-M1MX", "MacBook Pro 14-inch M1 Max", "laptop-macbook", 1_400_000, S_MAC_PRO, MBP_OLD),
  P("MBP14-M2P", "MacBook Pro 14-inch M2 Pro", "laptop-macbook", 1_100_000, S_MAC_512, MBP_OLD),
  P("MBP14-M2MX", "MacBook Pro 14-inch M2 Max", "laptop-macbook", 1_500_000, S_MAC_PRO, MBP_OLD),
  P("MBP14-M3", "MacBook Pro 14-inch M3", "laptop-macbook", 1_000_000, S_MAC_512, MBP_PRO),
  P("MBP14-M3P", "MacBook Pro 14-inch M3 Pro", "laptop-macbook", 1_200_000, S_MAC_512, MBP_PRO),
  P("MBP14-M3MX", "MacBook Pro 14-inch M3 Max", "laptop-macbook", 1_700_000, S_MAC_PRO, MBP_PRO),
  P("MBP14-M4", "MacBook Pro 14-inch M4", "laptop-macbook", 1_100_000, S_MAC_512, MBP_PRO, {
    apple: { family: "mbp14-m4", period: "202410", size: "" },
  }),
  P("MBP14-M4P", "MacBook Pro 14-inch M4 Pro", "laptop-macbook", 1_400_000, S_MAC_512, MBP_PRO),
  P("MBP14-M4MX", "MacBook Pro 14-inch M4 Max", "laptop-macbook", 1_900_000, S_MAC_PRO, MBP_PRO),
  P("MBP14-M5", "MacBook Pro 14-inch M5", "laptop-macbook", 1_200_000, S_MAC_512, MBP_PRO, { featured: true }),

  P("MBP16-M1P", "MacBook Pro 16-inch M1 Pro", "laptop-macbook", 1_300_000, S_MAC_512, MBP_OLD),
  P("MBP16-M1MX", "MacBook Pro 16-inch M1 Max", "laptop-macbook", 1_700_000, S_MAC_PRO, MBP_OLD),
  P("MBP16-M2P", "MacBook Pro 16-inch M2 Pro", "laptop-macbook", 1_450_000, S_MAC_512, MBP_OLD),
  P("MBP16-M2MX", "MacBook Pro 16-inch M2 Max", "laptop-macbook", 1_850_000, S_MAC_PRO, MBP_OLD),
  P("MBP16-M3P", "MacBook Pro 16-inch M3 Pro", "laptop-macbook", 1_600_000, S_MAC_512, MBP_PRO),
  P("MBP16-M3MX", "MacBook Pro 16-inch M3 Max", "laptop-macbook", 2_100_000, S_MAC_PRO, MBP_PRO),
  P("MBP16-M4P", "MacBook Pro 16-inch M4 Pro", "laptop-macbook", 1_750_000, S_MAC_512, MBP_PRO),
  P("MBP16-M4MX", "MacBook Pro 16-inch M4 Max", "laptop-macbook", 2_300_000, S_MAC_PRO, MBP_PRO),

  // -------------------------------------------------------- Mac desktops
  P("IMAC-M1", "iMac 24-inch M1", "mac-desktop", 780_000, S_MAC_256, IMAC),
  P("IMAC-M3", "iMac 24-inch M3", "mac-desktop", 900_000, S_MAC_256, IMAC),
  P("IMAC-M4", "iMac 24-inch M4", "mac-desktop", 960_000, S_MAC_256, IMAC, { featured: true }),

  P("MINI-M1", "Mac mini M1", "mac-desktop", 420_000, S_MAC_256, SILVER),
  P("MINI-M2", "Mac mini M2", "mac-desktop", 480_000, S_MAC_256, SILVER),
  P("MINI-M2P", "Mac mini M2 Pro", "mac-desktop", 780_000, S_MAC_PRO, SILVER),
  P("MINI-M4", "Mac mini M4", "mac-desktop", 360_000, S_MAC_256, SILVER, { featured: true }),
  P("MINI-M4P", "Mac mini M4 Pro", "mac-desktop", 840_000, S_MAC_PRO, SILVER),

  P("STU-M1MX", "Mac Studio M1 Max", "mac-desktop", 1_200_000, S_STUDIO, SILVER),
  P("STU-M1U", "Mac Studio M1 Ultra", "mac-desktop", 2_400_000, S_STUDIO, SILVER),
  P("STU-M2MX", "Mac Studio M2 Max", "mac-desktop", 1_300_000, S_STUDIO, SILVER),
  P("STU-M2U", "Mac Studio M2 Ultra", "mac-desktop", 2_600_000, S_STUDIO, SILVER),
  P("STU-M4MX", "Mac Studio M4 Max", "mac-desktop", 1_400_000, S_STUDIO, SILVER),
  P("STU-M3U", "Mac Studio M3 Ultra", "mac-desktop", 2_800_000, [...S_STUDIO, "16TB"], SILVER),

  P("MACPRO-2019", "Mac Pro 2019 Intel Xeon", "mac-desktop", 3_600_000, S_MAC_PRO, SILVER),
  P("MACPRO-M2U", "Mac Pro M2 Ultra", "mac-desktop", 4_200_000, S_MAC_PRO, SILVER),

  // ---------------------------------------------------------------- iPad
  P("IPAD5", "iPad 5th generation", "ipad", 90_000, ["32GB", "128GB"], IPAD_NEUTRAL, { legacy: true }),
  P("IPAD6", "iPad 6th generation", "ipad", 110_000, ["32GB", "128GB"], IPAD_NEUTRAL, { legacy: true }),
  P("IPAD7", "iPad 7th generation", "ipad", 130_000, ["32GB", "128GB"], IPAD_NEUTRAL, { legacy: true }),
  P("IPAD8", "iPad 8th generation", "ipad", 150_000, ["32GB", "128GB"], IPAD_NEUTRAL, { legacy: true }),
  P("IPAD9", "iPad 9th generation", "ipad", 180_000, ["64GB", "256GB"], IPAD_NEUTRAL),
  P("IPAD10", "iPad 10th generation", "ipad", 220_000, ["64GB", "256GB"], IPAD_10),
  P("IPAD-A16", "iPad A16", "ipad", 240_000, ["128GB", "256GB", "512GB"], IPAD_10, { featured: true }),

  P("IPADMINI4", "iPad mini 4", "ipad", 80_000, ["32GB", "128GB"], IPAD_NEUTRAL, { legacy: true }),
  P("IPADMINI5", "iPad mini 5", "ipad", 130_000, ["64GB", "256GB"], ["Silver", "Space Gray", "Gold"], { legacy: true }),
  P("IPADMINI6", "iPad mini 6", "ipad", 220_000, ["64GB", "256GB"], ["Space Gray", "Pink", "Purple", "Starlight"]),
  P("IPADMINI-A17", "iPad mini A17 Pro", "ipad", 300_000, ["128GB", "256GB", "512GB"], IPAD_MINI_NEW, { featured: true }),

  P("IPADAIR2", "iPad Air 2", "ipad", 70_000, ["16GB", "64GB", "128GB"], ["Silver", "Space Gray", "Gold"], { legacy: true }),
  P("IPADAIR3", "iPad Air 3", "ipad", 140_000, ["64GB", "256GB"], ["Silver", "Space Gray", "Gold"], { legacy: true }),
  P("IPADAIR4", "iPad Air 4", "ipad", 200_000, ["64GB", "256GB"], ["Silver", "Space Gray", "Rose Gold", "Green", "Sky Blue"], { legacy: true }),
  P("IPADAIR5", "iPad Air 5", "ipad", 260_000, ["64GB", "256GB"], IPAD_AIR_5),
  P("IPADAIR-M2", "iPad Air M2 11-inch", "ipad", 340_000, S_128_1T, IPAD_AIR_5),
  P("IPADAIR-M3", "iPad Air M3 11-inch", "ipad", 380_000, S_128_1T, IPAD_AIR_5, { featured: true }),
  P("IPADAIR-M4", "iPad Air M4 13-inch", "ipad", 460_000, S_128_1T, IPAD_AIR_5),

  P("IPADPRO-97", "iPad Pro 9.7-inch", "ipad", 90_000, ["32GB", "128GB", "256GB"], ["Silver", "Space Gray", "Gold", "Rose Gold"], { legacy: true }),
  P("IPADPRO-105", "iPad Pro 10.5-inch", "ipad", 130_000, ["64GB", "256GB", "512GB"], ["Silver", "Space Gray", "Gold", "Rose Gold"], { legacy: true }),
  P("IPADPRO-11", "iPad Pro 11-inch", "ipad", 420_000, S_128_1T, IPAD_NEUTRAL),
  P("IPADPRO-129", "iPad Pro 12.9-inch", "ipad", 540_000, S_128_1T, IPAD_NEUTRAL),
  P("IPADPRO-13", "iPad Pro 13-inch M4", "ipad", 780_000, ["256GB", "512GB", "1TB", "2TB"], ["Silver", "Space Black"], { featured: true }),

  // --------------------------------------------------------- Apple Watch
  P("AW-S1", "Apple Watch Series 1", "wearables", 35_000, ["38mm", "42mm"], ["Space Gray", "Silver", "Gold", "Rose Gold"], { legacy: true }),
  P("AW-S2", "Apple Watch Series 2", "wearables", 45_000, ["38mm", "42mm"], ["Space Gray", "Silver", "Gold"], { legacy: true }),
  P("AW-S3", "Apple Watch Series 3", "wearables", 60_000, ["38mm", "42mm"], ["Space Gray", "Silver"], { legacy: true }),
  P("AW-S4", "Apple Watch Series 4", "wearables", 80_000, ["40mm", "44mm"], ["Space Gray", "Silver", "Gold"], { legacy: true }),
  P("AW-S5", "Apple Watch Series 5", "wearables", 100_000, ["40mm", "44mm"], ["Space Gray", "Silver", "Gold"], { legacy: true }),
  P("AW-S6", "Apple Watch Series 6", "wearables", 120_000, ["40mm", "44mm"], ["Space Gray", "Silver", "Gold", "Blue", "PRODUCT(RED)"], { legacy: true }),
  P("AW-S7", "Apple Watch Series 7", "wearables", 150_000, ["41mm", "45mm"], ["Midnight", "Starlight", "Green", "Blue", "PRODUCT(RED)"], { legacy: true }),
  P("AW-S8", "Apple Watch Series 8", "wearables", 180_000, ["41mm", "45mm"], ["Midnight", "Starlight", "Silver", "PRODUCT(RED)"], { legacy: true }),
  P("AW-S9", "Apple Watch Series 9", "wearables", 240_000, ["41mm", "45mm"], ["Midnight", "Starlight", "Silver", "Pink", "PRODUCT(RED)"]),
  P("AW-S10", "Apple Watch Series 10", "wearables", 280_000, ["42mm", "46mm"], ["Jet Black Aluminium", "Rose Gold Aluminium", "Silver", "Natural Titanium", "Gold Titanium", "Slate Titanium"], { featured: true }),
  P("AW-S11", "Apple Watch Series 11", "wearables", 320_000, ["42mm", "46mm"], WATCH_ALU_NEW, { featured: true }),
  P("AW-SE", "Apple Watch SE", "wearables", 110_000, ["40mm", "44mm"], ["Space Gray", "Silver", "Gold"], { legacy: true }),
  P("AW-SE2", "Apple Watch SE 2", "wearables", 150_000, ["40mm", "44mm"], WATCH_ALU),
  P("AW-U1", "Apple Watch Ultra", "wearables", 420_000, ["49mm"], WATCH_ULTRA, { legacy: true }),
  P("AW-U2", "Apple Watch Ultra 2", "wearables", 480_000, ["49mm"], WATCH_ULTRA),
  P("AW-U3", "Apple Watch Ultra 3", "wearables", 540_000, ["49mm"], WATCH_ULTRA, { featured: true }),

  // --------------------------------------------------------------- Audio
  P("APODS1", "AirPods 1st generation", "audio", 45_000, S_ONE, ["White"], { legacy: true }),
  P("APODS2", "AirPods 2nd generation", "audio", 70_000, S_ONE, ["White"]),
  P("APODS3", "AirPods 3rd generation", "audio", 100_000, S_ONE, ["White"]),
  P("APODS4", "AirPods 4", "audio", 78_000, S_ONE, ["White"], { featured: true }),
  P("APODS4ANC", "AirPods 4 with Active Noise Cancellation", "audio", 108_000, S_ONE, ["White"], { featured: true }),
  P("APODSP1", "AirPods Pro", "audio", 120_000, S_ONE, ["White"], { legacy: true }),
  P("APODSP2", "AirPods Pro 2", "audio", 150_000, S_ONE, ["White"], { featured: true }),
  P("APODSP3", "AirPods Pro 3", "audio", 168_000, S_ONE, ["White"], { featured: true }),
  P("APODSMAX", "AirPods Max", "audio", 330_000, S_ONE, ["Space Gray", "Silver", "Sky Blue", "Green", "Pink"]),
  P("APODSMAX2", "AirPods Max 2", "audio", 360_000, S_ONE, ["Midnight", "Starlight", "Blue", "Purple", "Orange"]),
  P("HPOD", "HomePod", "audio", 180_000, S_ONE, ["White", "Midnight"]),
  P("HPODMINI", "HomePod mini", "audio", 66_000, S_ONE, ["White", "Midnight", "Yellow", "Orange", "Blue"]),

  // --------------------------------------------------------- Accessories
  P("PENCIL1", "Apple Pencil", "accessories", 60_000, S_ONE, ["White"]),
  P("PENCIL2", "Apple Pencil 2", "accessories", 78_000, S_ONE, ["White"]),
  P("PENCILC", "Apple Pencil USB-C", "accessories", 48_000, S_ONE, ["White"]),
  P("PENCILPRO", "Apple Pencil Pro", "accessories", 78_000, S_ONE, ["White"]),
  P("MKEY", "Magic Keyboard", "accessories", 60_000, S_ONE, ["White", "Black"]),
  P("MKEYTID", "Magic Keyboard with Touch ID", "accessories", 90_000, S_ONE, ["White", "Black"]),
  P("MMOUSE", "Magic Mouse", "accessories", 48_000, S_ONE, ["White", "Black"]),
  P("MTRACK", "Magic Trackpad", "accessories", 78_000, S_ONE, ["White", "Black"]),
  P("AIRTAG", "AirTag", "accessories", 18_000, S_ONE, ["White"], { featured: true }),
  P("ATV4K", "Apple TV 4K", "accessories", 90_000, ["64GB", "128GB"], ["Black"]),
  P("ATVHD", "Apple TV HD", "accessories", 60_000, ["32GB"], ["Black"], { legacy: true }),
  P("CABLE-USBC", "USB-C Charge Cable (1 m)", "accessories", 12_000, S_ONE, ["White"]),
  P("CABLE-LTG", "Lightning to USB-C Cable (1 m)", "accessories", 12_000, S_ONE, ["White"]),
  P("PWR-20W", "20W USB-C Power Adapter", "accessories", 12_000, S_ONE, ["White"], { featured: true }),
  P("PWR-35W", "35W Dual USB-C Power Adapter", "accessories", 24_000, S_ONE, ["White"]),
  P("MAGSAFE", "MagSafe Charger", "accessories", 24_000, S_ONE, ["White"]),
  P("MAGSAFE-BAT", "MagSafe Battery Pack", "accessories", 60_000, S_ONE, ["White"]),
  P("FOLIO", "Smart Folio for iPad", "accessories", 48_000, S_ONE, ["Black", "White", "Blue", "Sage"]),
  P("CASE-SIL", "iPhone Silicone Case with MagSafe", "accessories", 30_000, S_ONE, ["Black", "Blue", "Pink", "Sage", "Lavender"]),
  P("BAND-SPORT", "Apple Watch Sport Band", "accessories", 30_000, ["41mm", "45mm", "49mm"], ["Black", "White", "Blue", "Orange", "Pink"]),
  P("BAND-MILAN", "Apple Watch Milanese Loop", "accessories", 60_000, ["41mm", "45mm"], ["Silver", "Space Black", "Gold"]),
];

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/\(|\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STORAGE_CODE = {
  Standard: "STD",
  "16GB": "16",
  "32GB": "32",
  "64GB": "64",
  "128GB": "128",
  "256GB": "256",
  "512GB": "512",
  "1TB": "1T",
  "2TB": "2T",
  "4TB": "4T",
  "8TB": "8T",
  "16TB": "16T",
};

function storageCode(storage) {
  return STORAGE_CODE[storage] ?? storage.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

// Colour codes must stay unique inside one product, so near-identical names
// such as "Blue Titanium" / "Black Titanium" widen until they differ.
function colorCodes(colors) {
  const taken = new Set();
  const map = {};
  for (const color of colors) {
    const words = color.replace(/[()]/g, "").split(/[\s-]+/).filter(Boolean);
    const candidates = [];
    if (words.length === 1) {
      candidates.push(words[0].slice(0, 3), words[0].slice(0, 5));
    } else {
      for (let take = 1; take <= 4; take += 1) {
        candidates.push(words.map((w) => w.slice(0, take)).join(""));
      }
    }
    let code = candidates.find((c) => !taken.has(c.toUpperCase()))?.toUpperCase();
    if (!code) {
      const base = candidates[candidates.length - 1].toUpperCase();
      let n = 2;
      while (taken.has(`${base}${n}`)) n += 1;
      code = `${base}${n}`;
    }
    taken.add(code);
    map[color] = code;
  }
  return map;
}

/** Expand a product into its storage x colour variants. */
export function variantsFor(product) {
  const ladder = LADDERS[product.ladder] ?? LADDERS.flat;
  const codes = colorCodes(product.colors);
  const out = [];
  product.storages.forEach((storage, storageIndex) => {
    const price = product.basePrice + (ladder[storageIndex] ?? ladder[ladder.length - 1]);
    for (const color of product.colors) {
      out.push({
        sku: `${product.sku}-${storageCode(storage)}-${codes[color]}`,
        storage: storage === "Standard" ? null : storage,
        color,
        colorSlug: slugify(color),
        price,
      });
    }
  });
  return out;
}

export function allVariants() {
  return PRODUCTS.flatMap((p) => variantsFor(p).map((v) => ({ ...v, product: p })));
}
