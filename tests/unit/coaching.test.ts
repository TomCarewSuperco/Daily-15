import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, todayKey } from "../../src/app/calc";
import { yesterdayBrief } from "../../src/app/yesterday";
import { milestoneFor, weighInMessage } from "../../src/app/milestones";
import { emptyStateForTests } from "./fixtures";
import type { AppState } from "../../src/app/types";

const TODAY = todayKey();
const day = (n: number) => addDays(TODAY, -n);

function base(): AppState {
  const s = emptyStateForTests();
  s.profile = { name: "", age: 40, sex: "male", heightCm: 176, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
    targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } };
  return s;
}
const food = (date: string, protein: number, extra = {}) => ({ id: `${date}-${protein}-${Math.random()}`, date, meal: "lunch" as const, name: "Food", portion: "1", kcal: 600, protein, carbs: 50, fat: 20, fibre: 5, estimated: false, ...extra });

test("yesterday: wins from a run of active days and protein, and one thing for today", () => {
  const s = base();
  for (let n = 1; n <= 4; n++) s.routineLogs[day(n)] = { date: day(n), mode: "standard", completedIds: [], finished: true };
  s.foods.push(food(day(1), 150));
  s.activity[day(1)] = { date: day(1), steps: 3000, distanceKm: 2, activeMinutes: 10, activityKcal: 100 };
  const b = yesterdayBrief(s, TODAY)!;
  assert.equal(b.wins[0], "4 active days in a row.");
  assert.match(b.wins[1], /^Protein target hit: 150 g/);
  assert.equal(b.today, "A 15-minute walk adds about 1,500 steps.");
});

test("yesterday: a new best lift leads; a big night out gets a kind nudge; nothing logged means no card", () => {
  const s = base();
  s.workouts.push({ id: "a", date: day(8), category: "Weight training", name: "Gym", durationMin: 40, intensity: "moderate", exercises: [{ name: "Goblet squat", sets: [{ reps: 10, weightKg: 12 }] }] });
  s.workouts.push({ id: "b", date: day(1), category: "Weight training", name: "Gym", durationMin: 40, intensity: "moderate", exercises: [{ name: "Goblet squat", sets: [{ reps: 8, weightKg: 16 }] }] });
  s.foods.push(food(day(1), 120, { alcoholUnits: 9, name: "Lager" }));
  const b = yesterdayBrief(s, TODAY)!;
  assert.equal(b.wins[0], "New best: Goblet squat at 16 kg.");
  assert.match(b.today ?? "", /after a night out/);
  assert.equal(yesterdayBrief(base(), TODAY), null);
});

test("milestones: a fortnight compares with the first week and explains an early rise", () => {
  const s = base();
  for (let n = 1; n <= 14; n++) {
    s.foods.push(food(day(n), n > 7 ? 90 : 130));
    s.activity[day(n)] = { date: day(n), steps: n > 7 ? 5000 : 7000, distanceKm: 4, activeMinutes: 20, activityKcal: 200 };
    if (n % 2) s.weights.push({ id: `w${n}`, date: day(n), kg: 90 + (14 - n) * 0.12 });
  }
  const m = milestoneFor(s, TODAY)!;
  assert.equal(m.title, "Your first fortnight");
  assert.ok(m.lines.some((l) => /^Protein up from 90 g to 130 g/.test(l)), m.lines.join(" | "));
  assert.ok(m.lines.some((l) => /^Steps up from 5,000 to 7,000/.test(l)), m.lines.join(" | "));
  assert.ok(m.lines.some((l) => /^Weight is up .* usually settles/.test(l)), m.lines.join(" | "));
  // Day 20: no milestone.
  s.foods.push(food(day(20), 100));
  assert.equal(milestoneFor(s, TODAY), null);
});

test("weigh-in message: context for a higher reading, early and later", () => {
  const s = base();
  s.foods.push(food(day(5), 100));
  s.weights.push({ id: "w", date: day(1), kg: 90 });
  assert.match(weighInMessage(s, 90.8, TODAY), /first weeks of training/);
  assert.equal(weighInMessage(s, 90.2, TODAY), "Weigh-in saved");
  s.foods.push(food(day(60), 100));
  assert.match(weighInMessage(s, 90.8, TODAY), /Watch the trend line/);
});
