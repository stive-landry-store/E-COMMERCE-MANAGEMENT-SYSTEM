/** Detect phone OS so layouts can adapt safe areas (iPhone Dynamic Island, Android notches). */

export type AppPlatform = "ios" | "android" | "other";

export function detectPlatform(): AppPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
  if (iOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** Apply `data-platform` on <html> for CSS hooks. */
export function applyPlatformClass() {
  const platform = detectPlatform();
  document.documentElement.dataset.platform = platform;
  return platform;
}

/** Minimum top inset when env() is 0 but status bar still covers content (some WebViews). */
export function safeTopClass() {
  return "pt-[max(0.75rem,env(safe-area-inset-top,0px))]";
}
