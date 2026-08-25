/** Apple-style tri-tone notification chime (Web Audio API). */
let sharedCtx: AudioContext | null = null;

let lastPlayMs = 0;

export function playNotificationSound() {
  const now = Date.now();
  if (now - lastPlayMs < 900) return;
  lastPlayMs = now;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedCtx) sharedCtx = new Ctx();
    const ctx = sharedCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const start = ctx.currentTime;
    const tones = [
      { freq: 784, at: 0, dur: 0.22 },
      { freq: 988, at: 0.1, dur: 0.28 },
      { freq: 1175, at: 0.2, dur: 0.32 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, start + tone.at);
      gain.gain.setValueAtTime(0.0001, start + tone.at);
      gain.gain.exponentialRampToValueAtTime(0.12, start + tone.at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + tone.at);
      osc.stop(start + tone.at + tone.dur + 0.05);
    }
  } catch {
    /* autoplay or audio unsupported */
  }
}
