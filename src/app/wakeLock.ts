import { useEffect } from "react";

/*
 * Keeps the screen on while a workout is open, so the phone doesn't lock between
 * exercises. Uses the Screen Wake Lock API where the browser or app supports it
 * (iPhone from iOS 16.4 in Safari); elsewhere it does nothing. The lock drops when
 * the app is hidden, so it's asked for again on return.
 */
type Sentinel = { release: () => Promise<void> };

export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let lock: Sentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock!.request("screen").then((l) => {
        if (cancelled) void l.release().catch(() => {});
        else lock = l;
      }).catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
