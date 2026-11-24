/*
 * A short signal when a timer ends: a vibration where the phone supports it
 * (Android), and two soft beeps (iPhone doesn't let web apps vibrate). The beep
 * needs a tap first, which the timers always have.
 */
let ctx: AudioContext | null = null;

export function primeCue(): void {
  try {
    const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && A) ctx = new A();
    void ctx?.resume();
  } catch {
    /* no audio */
  }
}

export function cue(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* unsupported */
  }
  try {
    if (!ctx) return;
    [0, 0.25].forEach((t) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx!.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx!.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + t + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(ctx!.currentTime + t);
      o.stop(ctx!.currentTime + t + 0.2);
    });
  } catch {
    /* no audio */
  }
}
