import { useEffect, useState } from "react";

export const SPLASH_SESSION_KEY = "sls-splash-v3";
export const APP_READY_EVENT = "sls-app-ready";

const EXIT_MS = 180;

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
    boot.classList.add("boot-splash-exit");
    const t = window.setTimeout(() => {
      boot.remove();
      markReady();
      setPhase("done");
    }, EXIT_MS);
    return () => window.clearTimeout(t);
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
