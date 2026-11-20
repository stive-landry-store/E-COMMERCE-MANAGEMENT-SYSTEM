import { useEffect, useState } from "react";

export const SPLASH_SESSION_KEY = "sls-splash-v3";
export const APP_READY_EVENT = "sls-app-ready";

const COUNT_MS = 1250;
const EXIT_MS = 560;

function markReady() {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.appReady = "1";
  window.dispatchEvent(new Event(APP_READY_EVENT));
}

/**
 * Fades the HTML boot splash as soon as JS is ready.
 * Return visits in the same tab skip it entirely.
 */
export function AppSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"exit" | "done">(() => {
    if (typeof window === "undefined") return "done";
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) ? "done" : "exit";
    } catch {
      return "exit";
    }
  });

  useEffect(() => {
    if (phase !== "exit") {
      document.getElementById("boot-splash")?.remove();
      markReady();
      return;
    }
    const boot = document.getElementById("boot-splash");
    if (!boot) {
      markReady();
      setPhase("done");
      return;
    }
    // Logo intro (~1.2 s, first open of the session only), then the splash zooms out
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    const tick = (now: number) => {
      // Time since the page started loading, so slow networks never add extra wait
      const p = Math.min(1, now / (reduce ? 1 : COUNT_MS));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      boot.classList.add("boot-splash-exit");
      markReady();
      t = window.setTimeout(() => {
        boot.remove();
        setPhase("done");
      }, reduce ? 200 : EXIT_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  return children;
}
