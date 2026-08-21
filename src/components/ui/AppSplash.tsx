import { useEffect, useState } from "react";
import { LogoSplash } from "@/components/ui/LogoLoader";

const SESSION_KEY = "sls-splash-v2";
const ENTER_MS = 2400;
const EXIT_MS = 700;

/**
 * Smooth logo splash on first load of a browser session.
 * Skipped on later navigations within the same tab session.
 * Then the storefront home (hero) is shown.
 */
export function AppSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"boot" | "show" | "exit" | "done">(() => {
    if (typeof window === "undefined") return "done";
    try {
      return sessionStorage.getItem(SESSION_KEY) ? "done" : "boot";
    } catch {
      return "boot";
    }
  });

  useEffect(() => {
    if (phase !== "boot") return;
    const show = requestAnimationFrame(() => setPhase("show"));
    return () => cancelAnimationFrame(show);
  }, [phase]);

  useEffect(() => {
    if (phase !== "show") return;
    const t = window.setTimeout(() => setPhase("exit"), ENTER_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setPhase("done"), EXIT_MS);
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

  return (
    <>
      {children}
      {phase !== "done" ? <LogoSplash exiting={phase === "exit"} /> : null}
    </>
  );
}
