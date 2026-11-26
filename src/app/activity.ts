import { activeMinutesBreakdown, lastNDays, stepsActiveEstimate, workoutsOn } from "./calc";
import type { AppState } from "./types";

/*
 * Activity across everything: the daily 15, strength sessions, cardio (machines,
 * swims, rides, classes) and walking. A day with few steps but a swim or a gym
 * session is still an active day. Totals match the active-minutes figure used
 * elsewhere in the app.
 */
export const ACTIVITY_KINDS = [
  { key: "daily15", label: "Daily 15", colour: "#257de0" },
  { key: "strength", label: "Strength and mobility", colour: "#f47230" },
  { key: "cardio", label: "Cardio and sport", colour: "#00b894" },
  { key: "walking", label: "Walking", colour: "#f2a600" },
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]["key"];
export type ActivityDay = Record<ActivityKind, number> & { date: string; total: number; steps: number };

const STRENGTH = /weight training|circuit|home workout|pilates|yoga/i;

export function activityOn(state: AppState, date: string): ActivityDay {
  const r = state.routineLogs[date];
  const daily15 = r?.seconds ? Math.round(r.seconds / 60) : r?.finished ? 15 : 0;
  let strength = 0;
  let cardio = 0;
  let walks = 0;
  for (const w of workoutsOn(state, date)) {
    const m = w.durationMin || 0;
    if (/walking/i.test(w.category)) walks += m;
    else if (STRENGTH.test(w.category)) strength += m;
    else cardio += m;
  }
  const sessions = daily15 + strength + cardio + walks;
  // Everyday walking: synced or entered active minutes, else estimated from steps. A watch's active
  // minutes already include any sessions it recorded, so only the part beyond them is added.
  const a = state.activity[date];
  const fromDay = a?.activeMinutes || (!state.health?.connected ? stepsActiveEstimate(a?.steps ?? 0) : 0);
  const everyday = state.health?.connected ? Math.max(0, fromDay - sessions) : fromDay;
  const walking = walks + everyday;
  const total = daily15 + strength + cardio + walking;
  return { date, daily15, strength, cardio, walking, total, steps: a?.steps ?? 0 };
}

export function activityWeek(state: AppState, end: string): ActivityDay[] {
  return lastNDays(7, end).map((d) => activityOn(state, d));
}

/** Days where steps were under target but other activity still met the active-minutes target. */
export function savedByTraining(week: ActivityDay[], stepTarget: number, minutesTarget: number): number {
  return week.filter((d) => d.steps > 0 && d.steps < stepTarget && d.total >= minutesTarget && d.total - d.walking > 0).length;
}

// Keep in step with the active-minutes figure shown elsewhere.
export const totalMatches = (state: AppState, date: string) => activeMinutesBreakdown(state, date).total === activityOn(state, date).total;
