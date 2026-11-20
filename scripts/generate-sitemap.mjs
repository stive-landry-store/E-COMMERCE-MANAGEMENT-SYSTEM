// Builds public/sitemap.xml (static pages + live products, categories, services).
// Runs before every build; falls back to static pages when Supabase is unreachable.
import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.SITE_URL || "https://stive-landry-store.vercel.app").replace(/\/$/, "");
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const staticPaths = ["/", "/shop", "/services", "/vendors", "/sell", "/about", "/contact"];

async function rows(table, query) {
  if (!url || !key || url.includes("your-project")) return [];
  try {
    const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const [products, categories, services] = await Promise.all([
  rows("products", "select=slug,updated_at&status=eq.active").then((r) =>
    r.length ? r : rows("products", "select=slug&status=eq.active"),
  ),
  rows("categories", "select=slug&status=eq.active"),
  rows("digital_services", "select=slug&is_active=eq.true"),
]);

const today = new Date().toISOString().slice(0, 10);
const entry = (loc, priority, lastmod = today) =>
  `  <url><loc>${SITE}${loc}</loc><lastmod>${String(lastmod).slice(0, 10)}</lastmod><priority>${priority}</priority></url>`;

const urls = [
  ...staticPaths.map((p) => entry(p, p === "/" ? "1.0" : "0.8")),
  ...categories.filter((c) => c.slug).map((c) => entry(`/shop?category=${encodeURIComponent(c.slug)}`.replace(/&/g, "&amp;"), "0.7")),
  ...services.filter((s) => s.slug).map((s) => entry(`/services/${encodeURIComponent(s.slug)}`, "0.6")),
  ...products.filter((p) => p.slug).map((p) => entry(`/product/${encodeURIComponent(p.slug)}`, "0.7", p.updated_at || today)),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml: ${urls.length} URLs`);
