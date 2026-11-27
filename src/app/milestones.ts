import { addDays, foodsOn, isActiveDay, lastNDays, sumNutrients, todayKey, trendWeight } from "./calc";
import { liftProgress, programmeStart, SETTLING_DAYS } from "./review";
import type { AppState } from "./types";

/*
 * Milestones at one week, two weeks and a month: what's changed since the first
 * week, for the moments people are most likely to give up. Plus the message shown
 * after a weigh-in that's higher than the last one. Wording for review by a
 * dietitian and personal trainer.
 */

export interface Milestone {
  day: 7 | 14 | 30;
  title: string;
  lines: string[];
}

const MILESTONES: { day: 7 | 14 | 30; title: string; until: number }[] = [
  { day: 30, title: "Your first month", until: 35 },
  { day: 14, title: "Your first fortnight", until: 18 },
  { day: 7, title: "Your first week", until: 10 },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const kg = (n: number) => `${Math.abs(n).toFixed(1)} kg`;
const between = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

export function daysSinceStart(state: AppState, today = todayKey()): number {
  const start = programmeStart(state);
  return start ? between(start, today) + 1 : 0;
}

export function milestoneFor(state: AppState, today = todayKey()): Milestone | null {
  const start = programmeStart(state);
  if (!start || !state.profile) return null;
  const n = between(start, today) + 1;
  const m = MILESTONES.find((x) => n >= x.day && n <= x.until);
  if (!m) return null;
  const first = lastNDays(7, addDays(start, 6));
  const recent = lastNDays(7, addDays(today, -1));
  const sinceStart = lastNDays(n - 1, addDays(today, -1));
  const lines: string[] = [];

  const activeTotal = sinceStart.filter((d) => isActiveDay(state, d)).length;
  lines.push(`Active on ${activeTotal} of ${sinceStart.length} days so far.`);
  const logged = sinceStart.filter((d) => foodsOn(state, d).some((f) => !f.rough)).length;
  if (logged) lines.push(`Food logged on ${logged} ${logged === 1 ? "day" : "days"}.`);

  if (m.day > 7) {
    const avg = (days: string[], f: (d: string) => number) => {
      const xs = days.map(f).filter((x) => x > 0);
      return xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    };
    const protein = (d: string) => sumNutrients(foodsOn(state, d)).protein;
    const p0 = avg(first, protein);
    const p1 = avg(recent, protein);
    if (p0 !== null && p1 !== null && p1 - p0 >= 5) lines.push(`Protein up from ${fmt(p0)} g to ${fmt(p1)} g a day.`);
    const steps = (d: string) => state.activity[d]?.steps ?? 0;
    const s0 = avg(first, steps);
    const s1 = avg(recent, steps);
    if (s0 !== null && s1 !== null && s1 - s0 >= 500) lines.push(`Steps up from ${fmt(s0)} to ${fmt(s1)} a day.`);
    const lift = liftProgress(state, sinceStart);
    if (lift) lines.push(`${lift.name}: up from ${lift.from} kg to ${lift.to} kg.`);
    const waist = state.measurements.filter((x) => x.waistCm).sort((a, b) => a.date.localeCompare(b.date));
    if (waist.length > 1 && between(waist[0].date, waist[waist.length - 1].date) >= 14) {
      const cm = Math.round((waist[waist.length - 1].waistCm! - waist[0].waistCm!) * 10) / 10;
      if (cm <= -1) lines.push(`Waist down ${Math.abs(cm)} cm.`);
    }
  }

  // Weight, honestly, and only once it means something.
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const now = trendWeight(state.weights, addDays(today, -1));
  const change = weights.length >= 3 && now !== null ? now - weights[0].kg : null;
  if (m.day === 14 && change !== null && change >= 0.3) {
    lines.push(`Weight is up ${kg(change)}. That's common in the first weeks of new training, mostly water in working muscles, and usually settles within two to four weeks.`);
  } else if (m.day === 30 && change !== null) {
    if (change <= -0.5) lines.push(`Weight down ${kg(change)} on the trend since you started.`);
    else if (change >= 0.5) lines.push(`Weight is up ${kg(change)} on the trend. If it's still rising in two weeks, the weekly review will look at portions and drinks with you.`);
    else lines.push("Weight is steady so far. Your waist and your habits show what's changing underneath.");
  }
  return { day: m.day, title: m.title, lines };
}

/** After a weigh-in: a word of context when it's higher than the last one, so one number doesn't knock confidence. */
export function weighInMessage(state: AppState, value: number, date: string): string {
  const prev = [...state.weights].filter((w) => w.date < date).sort((a, b) => a.date.localeCompare(b.date)).pop();
  if (!prev || value - prev.kg < 0.5) return "Weigh-in saved";
  const start = programmeStart(state);
  const n = start ? between(start, date) + 1 : 0;
  return n > 0 && n < SETTLING_DAYS
    ? "Saved. Up a little: in the first weeks of training that's mostly water while muscles adapt. The trend from week four is what counts."
    : "Saved. Daily weight moves by a kilo or more with water, salt and food. Watch the trend line, not one day.";
}
