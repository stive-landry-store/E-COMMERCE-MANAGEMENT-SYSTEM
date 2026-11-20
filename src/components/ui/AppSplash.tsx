import { useEffect, useState } from "react";

export const SPLASH_SESSION_KEY = "sls-splash-v3";
export const APP_READY_EVENT = "sls-app-ready";

const COUNT_MS = 0;
const EXIT_MS = 220;

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
    // Show the page right away: the boot splash just fades out
    const counter = document.getElementById("boot-count");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    let t = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (reduce ? 1 : COUNT_MS));
      if (counter) counter.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100));
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
