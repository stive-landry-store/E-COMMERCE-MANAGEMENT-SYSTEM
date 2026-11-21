import { useEffect, useState } from "react";

export const SPLASH_SESSION_KEY = "sls-splash-v3";
export const APP_READY_EVENT = "sls-app-ready";

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
    // Particle intro runs from index.html; leave as soon as it says it's done (or after 3 s at most)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      boot.classList.add("boot-splash-exit");
      markReady();
      t = window.setTimeout(() => {
        boot.remove();
        setPhase("done");
      }, reduce ? 150 : EXIT_MS);
    };
    if ((window as unknown as { __slsIntroDone?: boolean }).__slsIntroDone) leave();
    window.addEventListener("sls-intro-done", leave);
    const safety = window.setTimeout(leave, Math.max(0, 3000 - performance.now()));
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.clearTimeout(safety);
      window.removeEventListener("sls-intro-done", leave);
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
