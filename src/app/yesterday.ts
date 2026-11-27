import { addDays, alcoholUnits, fiveADayOn, foodsOn, isActiveDay, isRestDay, lastNDays, sumNutrients, todayKey } from "./calc";
import { activeCommitments } from "./commitments";
import { bestLifts } from "./review";
import type { AppState } from "./types";

/*
 * Yesterday in brief, on Home each day: up to two things that went well and one
 * small thing for today. Never a verdict on weight, which moves too much day to
 * day to mean anything. Wording for review by a dietitian and personal trainer.
 */

export interface Brief {
  wins: string[];
  today: string | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");

function activeRun(state: AppState, end: string): number {
  let n = 0;
  for (let d = end; n < 365 && (isActiveDay(state, d) || isRestDay(state, d)); d = addDays(d, -1)) if (isActiveDay(state, d)) n++;
  return n;
}

export function yesterdayBrief(state: AppState, today = todayKey()): Brief | null {
  const p = state.profile;
  if (!p) return null;
  const t = p.targets;
  const y = addDays(today, -1);
  const foods = foodsOn(state, y).filter((f) => !f.rough);
  const active = isActiveDay(state, y);
  const steps = state.activity[y]?.steps ?? 0;
  if (!foods.length && !active && !steps) return null;

  const wins: [number, string][] = [];
  const n = sumNutrients(foods);
  const prior = lastNDays(14, addDays(y, -1));

  // A heavier lift than ever before.
  for (const [name, xs] of bestLifts(state)) {
    const todayBest = xs.filter((x) => x.date === y).reduce((m, x) => Math.max(m, x.kg), 0);
    const before = xs.filter((x) => x.date < y).reduce((m, x) => Math.max(m, x.kg), 0);
    if (todayBest > 0 && before > 0 && todayBest > before) {
      wins.push([90, `New best: ${name} at ${todayBest} kg.`]);
      break;
    }
  }
  const run = activeRun(state, y);
  if (run >= 3) wins.push([80, `${run} active days in a row.`]);
  else if (active) wins.push([60, state.routineLogs[y]?.finished ? "Did your 15." : "Workout done."]);

  if (foods.length) {
    const priorProtein = prior.map((d) => sumNutrients(foodsOn(state, d)).protein).filter((x) => x > 0);
    if (n.protein >= t.proteinG * 0.95) {
      const best = priorProtein.length >= 5 && n.protein > Math.max(...priorProtein);
      wins.push([best ? 75 : 70, best ? `Best protein day in two weeks: ${fmt(n.protein)} g.` : `Protein target hit: ${fmt(n.protein)} g.`]);
    }
    if (fiveADayOn(state, y) >= 5) wins.push([62, "Five or more fruit and veg portions."]);
    if ((state.foodDiaryDone ?? []).includes(y)) wins.push([50, "Every meal logged."]);
  }
  if (steps >= t.steps) {
    const priorSteps = prior.map((d) => state.activity[d]?.steps ?? 0).filter((x) => x > 0);
    const best = priorSteps.length >= 5 && steps > Math.max(...priorSteps);
    wins.push([best ? 68 : 65, best ? `Most steps in two weeks: ${fmt(steps)}.` : `${fmt(steps)} steps, over your target.`]);
  }
  const unitsY = alcoholUnits(state, [y]);
  if (unitsY === 0 && alcoholUnits(state, [addDays(y, -1)]) > 0 && foods.length) wins.push([55, "A drink-free day."]);
  if ((state.water[y] ?? 0) >= t.waterMl) wins.push([40, "Water target met."]);
  if (!wins.length && foods.length) wins.push([10, "Food logged. That's the habit that makes the rest work."]);

  // One small thing for today.
  let todayText: string | null = null;
  const commitment = activeCommitments(state, today).find((c) => !c.ticks.includes(y));
  if (commitment) todayText = `${commitment.text}.`;
  else if (unitsY >= 6) todayText = "Plenty of water and a protein breakfast help after a night out.";
  else if (foods.length && n.protein < t.proteinG * 0.8) todayText = "Protein at breakfast: eggs, Greek yoghurt or cottage cheese add 15 to 25 g.";
  else if (steps > 0 && steps < t.steps * 0.7) todayText = "A 15-minute walk adds about 1,500 steps.";
  else if (foods.length && fiveADayOn(state, y) < 3) todayText = "Add a fruit or vegetable to two of today's meals.";
  else if (!active && !isRestDay(state, y)) todayText = "Your 15 minutes. Light mode counts.";

  return { wins: wins.sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, w]) => w), today: todayText };
}
