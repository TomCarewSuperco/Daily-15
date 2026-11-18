import { useEffect, useRef } from "react";
import { toast } from "../notify";
import { todayKey } from "../calc";
import { REMINDER_MESSAGES } from "../data";
import type { AppState } from "../types";

/**
 * Fires reminders while the app is open. Browsers can't schedule notifications
 * for a closed web page, so background reminders need the native app.
 */
export function useReminders(state: AppState) {
  const fired = useRef(new Set<string>());
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    const check = () => {
      const s = latest.current;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = todayKey();
      for (const r of s.reminders) {
        if (!r.enabled || r.time !== hhmm) continue;
        if (r.weekday !== undefined && r.weekday !== now.getDay()) continue;
        const key = `${r.type}:${today}`;
        if (fired.current.has(key)) continue;
        // Don't nag about something already done today.
        if (r.type === "workout" && s.routineLogs[today]?.finished) continue;
        if (r.type === "food" && s.foods.some((f) => f.date === today)) continue;
        if (r.type === "steps" && s.profile && (s.activity[today]?.steps ?? 0) >= s.profile.targets.steps) continue;
        fired.current.add(key);
        const body = REMINDER_MESSAGES[r.type];
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          try {
            new Notification("DAILY 15", { body });
          } catch {
            toast(body);
          }
        } else toast(body);
      }
    };
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);
}
