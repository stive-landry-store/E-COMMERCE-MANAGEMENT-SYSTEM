import { Capacitor } from "@capacitor/core";

/* ——— UI sounds (Web Audio, no files). Off by default, toggled by the user. ——— */
const SOUND_KEY = "sls-ui-sounds";
let ctx: AudioContext | null = null;

export function uiSoundsEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUiSoundsEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("sls-ui-sounds"));
}

type SoundKind = "tap" | "add" | "success" | "error";

const PATTERNS: Record<SoundKind, { f: number; at: number; d: number; type?: OscillatorType }[]> = {
  tap: [{ f: 1200, at: 0, d: 0.05, type: "triangle" }],
  add: [
    { f: 660, at: 0, d: 0.09 },
    { f: 990, at: 0.07, d: 0.14 },
  ],
  success: [
    { f: 784, at: 0, d: 0.16 },
    { f: 988, at: 0.09, d: 0.18 },
    { f: 1319, at: 0.18, d: 0.3 },
  ],
  error: [
    { f: 330, at: 0, d: 0.14, type: "square" },
    { f: 247, at: 0.12, d: 0.2, type: "square" },
  ],
};

export function uiSound(kind: SoundKind, force = false) {
  if (!force && !uiSoundsEnabled()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    for (const n of PATTERNS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.setValueAtTime(n.f, t0 + n.at);
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.04 : 0.08, t0 + n.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.d + 0.03);
    }
  } catch {
    /* audio unavailable */
  }
}

/* ——— Haptics: native on the Capacitor app, vibration API on Android web. ——— */
type HapticKind = "light" | "medium" | "success" | "error";

export async function haptic(kind: HapticKind = "light") {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
      else if (kind === "error") await Haptics.notification({ type: NotificationType.Error });
      else await Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
    if (window.matchMedia("(pointer: coarse)").matches && "vibrate" in navigator) {
      navigator.vibrate(kind === "success" ? [12, 40, 18] : kind === "error" ? [30, 50, 30] : kind === "medium" ? 18 : 8);
    }
  } catch {
    /* ignore */
  }
}

/* ——— Fly-to-cart ——— */
export function flyToCart(source: Element | null) {
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  window.dispatchEvent(new Event("sls-cart-bump"));
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const ghost = (source instanceof HTMLImageElement ? source.cloneNode(true) : document.createElement("div")) as HTMLElement;
  const size = Math.min(from.width, from.height, 220);
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    zIndex: "9996",
    pointerEvents: "none",
    borderRadius: "1.5rem",
    filter: "drop-shadow(0 20px 40px rgba(255,45,149,.45))",
  });
  ghost.style.viewTransitionName = "none";
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 120}px) scale(0.55) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(-24deg)`, opacity: 0.2 },
    ],
    { duration: 900, easing: "cubic-bezier(0.55, 0, 0.25, 1)" },
  );
  anim.onfinish = () => {
    ghost.remove();
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-8deg)" }, { transform: "scale(0.92)" }, { transform: "scale(1)" }],
      { duration: 600, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
  };
}
