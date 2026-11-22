import { addDays, foodsOn, sumNutrients, todayKey } from "./calc";
import type { AppState } from "./types";

/*
 * The user's own evidence for the core idea: compare days they did their 15
 * (or another workout) with days they didn't, over the last eight weeks.
 * Reports what the data shows, including 'no real difference'.
 */

export const EVIDENCE_DAYS = 56;
/** Days with food logged needed in each group before comparing intake. */
export const MIN_EACH = 5;

export interface GroupStats {
  days: number;
  /** Share of days with food logged (not estimated). */
  loggedShare: number;
  /** Days with food logged. */
  foodDays: number;
  avgKcal: number | null;
  /** Share of logged days with protein at 90% of target or more. */
  proteinHitShare: number | null;
}

export interface Evidence {
  on: GroupStats;
  off: GroupStats;
  /** Enough logged days in both groups to compare intake. */
  ready: boolean;
  /** Food choices answered on workout days, and how many were done. */
  intentions: { answered: number; done: number };
}

function stats(state: AppState, days: string[]): GroupStats {
  const target = state.profile?.targets.proteinG ?? 0;
  const logged = days.filter((d) => foodsOn(state, d).some((f) => !f.rough));
  const totals = logged.map((d) => sumNutrients(foodsOn(state, d)));
  return {
    days: days.length,
    loggedShare: days.length ? logged.length / days.length : 0,
    foodDays: logged.length,
    avgKcal: totals.length ? totals.reduce((s, n) => s + n.kcal, 0) / totals.length : null,
    proteinHitShare: totals.length && target ? totals.filter((n) => n.protein >= target * 0.9).length / totals.length : null,
  };
}

export function evidence(state: AppState, end = addDays(todayKey(), -1)): Evidence {
  const on: string[] = [];
  const off: string[] = [];
  const workoutDays = new Set(state.workouts.map((w) => w.date));
  for (let i = 0; i < EVIDENCE_DAYS; i++) {
    const d = addDays(end, -i);
    if (state.restDays.includes(d)) continue;
    (state.routineLogs[d]?.finished || workoutDays.has(d) ? on : off).push(d);
  }
  const answered = on.map((d) => state.intentions?.[d]).filter((x) => x && x.done !== undefined);
  const a = stats(state, on);
  const b = stats(state, off);
  return { on: a, off: b, ready: a.foodDays >= MIN_EACH && b.foodDays >= MIN_EACH, intentions: { answered: answered.length, done: answered.filter((x) => x!.done).length } };
}

/** One plain sentence summing up the comparison, honest when there's no clear difference. */
export function evidenceHeadline(e: Evidence): string {
  if (!e.ready) {
    const need = Math.max(0, MIN_EACH - e.on.foodDays) + Math.max(0, MIN_EACH - e.off.foodDays);
    return `Keep logging: about ${need} more days with food logged and we can show how your 15 affects the rest of your day.`;
  }
  const diff = Math.round((e.off.avgKcal! - e.on.avgKcal!) / 10) * 10;
  const logging = Math.round((e.on.loggedShare - e.off.loggedShare) * 100);
  if (Math.abs(diff) < 100 && logging < 15) return "So far, your 15 days and other days look about the same for food. That's useful to know: the 15 is still doing its job for fitness.";
  const parts: string[] = [];
  if (diff >= 100) parts.push(`you ate about ${diff.toLocaleString("en-GB")} kcal less`);
  if (diff <= -100) parts.push(`you ate about ${Math.abs(diff).toLocaleString("en-GB")} kcal more`);
  if (logging >= 15) parts.push(`logged food on ${Math.round(e.on.loggedShare * 100)}% of days, against ${Math.round(e.off.loggedShare * 100)}%`);
  return `On days you did your 15, ${parts.join(" and ")}.`;
}
