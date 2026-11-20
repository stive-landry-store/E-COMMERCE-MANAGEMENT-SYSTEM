import { useEffect } from "react";

const SITE = "https://stive-landry-store.vercel.app";
const BRAND = "Stive Landry Store";

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

export function applyPageMeta({
  title,
  description,
  image,
  path,
}: {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  path?: string;
}) {
  const full = title ? `${title} — ${BRAND}` : `${BRAND} — QUALITY BEFORE PRICE`;
  document.title = full;
  setMeta("property", "og:title", full);
  setMeta("name", "twitter:title", full);
  if (description) {
    const d = description.slice(0, 180);
    setMeta("name", "description", d);
    setMeta("property", "og:description", d);
  }
  const url = `${SITE}${path ?? window.location.pathname}`;
  setMeta("property", "og:url", url);
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = url;
  const img = image ? (image.startsWith("http") ? image : `${SITE}${image.startsWith("/") ? "" : "/"}${image}`) : `${SITE}/og-image.jpg`;
  setMeta("property", "og:image", img);
  setMeta("name", "twitter:image", img);
}

/** Sets the document title + social/SEO meta for the current page. */
export function usePageMeta(title?: string | null, description?: string | null, image?: string | null) {
  useEffect(() => {
    if (title === undefined) return;
    applyPageMeta({ title, description, image });
  }, [title, description, image]);
}
