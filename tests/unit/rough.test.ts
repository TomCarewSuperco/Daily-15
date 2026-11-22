import { test } from "node:test";
import assert from "node:assert/strict";
import { roughEntries, typicalDay, emptyMeals } from "../../src/app/rough";
import { emptyStateForTests as empty } from "./fixtures";
import { addDays as addD } from "../../src/app/calc";
import type { AppState, FoodEntry, Meal } from "../../src/app/types";

const D = "2026-11-21";
const food = (date: string, meal: Meal, kcal: number, extra: Partial<FoodEntry> = {}): FoodEntry =>
  ({ id: `${date}-${meal}-${kcal}`, date, meal, name: "x", portion: "1", estimated: false, kcal, protein: kcal / 20, carbs: kcal / 8, fat: kcal / 30, fibre: 5, ...extra }) as FoodEntry;

const withProfile = (s: AppState): AppState => ({ ...s, profile: { ...(s.profile ?? {}), targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } as AppState["profile"] });

test("with too few completed days, the typical day is the calorie target", () => {
  const t = typicalDay(withProfile(empty()), D);
  assert.equal(t.days, 0);
  assert.equal(t.kcal, 2000);
});

test("the typical day averages completed days, with the user's own meal shares", () => {
  const days = ["2026-11-18", "2026-11-19", "2026-11-20"];
  const foods = days.flatMap((d) => [food(d, "breakfast", 400), food(d, "lunch", 600), food(d, "dinner", 1000), food(d, "snacks", 400)]);
  const s = withProfile({ ...empty(), foods, foodDiaryDone: days });
  const t = typicalDay(s, D);
  assert.equal(t.days, 3);
  assert.equal(Math.round(t.kcal), 2400);
  assert.ok(Math.abs(t.shares.dinner - 1000 / 2400) < 1e-9);
  // A blow-out day is 1.5 times typical, split across the meals.
  const e = roughEntries(s, D, "blowout", "day");
  assert.equal(e.length, 4);
  assert.equal(e.reduce((a, x) => a + x.kcal, 0), 3600);
  assert.ok(e.every((x) => x.rough === "blowout" && x.estimated));
});

test("'rest of day' fills only the meals with nothing logged; drinks add units", () => {
  const s = withProfile({ ...empty(), foods: [food(D, "breakfast", 450), food(D, "lunch", 650)] });
  assert.deepEqual(emptyMeals(s, D), ["dinner", "snacks"]);
  const e = roughEntries(s, D, "typical", "rest", 4);
  assert.deepEqual(e.map((x) => x.meal), ["dinner", "snacks", "dinner"]);
  assert.equal(e.reduce((a, x) => a + x.kcal, 0), Math.round(2000 * 0.35) + Math.round(2000 * 0.1) + 340);
  assert.equal(e.find((x) => x.alcoholUnits)?.alcoholUnits, 4);
});

test("reality check nudges the typical day up when weight doesn't match the logged deficit", async () => {
  const { maintenanceCalories } = await import("../../src/app/calc");
  const { realityAdjustment } = await import("../../src/app/rough");
  const profile = { name: "", age: 40, sex: "male", heightCm: 180, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
    targets: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } as AppState["profile"];
  const maint = maintenanceCalories(profile!, 90);
  const build = (kgPerDay: number): AppState => {
    const days = Array.from({ length: 28 }, (_, i) => addD(D, -(i + 1)));
    return {
      ...empty(),
      profile,
      foodDiaryDone: days,
      foods: days.map((d) => food(d, "dinner", Math.round(maint - 500))),
      weights: days.filter((_, i) => i % 2 === 0).map((d, i) => ({ id: `w${i}`, date: d, kg: 90 + kgPerDay * (Date.parse(d) - Date.parse(D)) / 86400000 })),
    };
  };
  // Weight flat although the log says 500 kcal a day under maintenance: under-logging, nudge up (capped at 25%).
  const flat = realityAdjustment(build(0), D);
  assert.ok(flat > 150 && flat <= (maint - 500) * 0.25 + 1, String(flat));
  assert.ok(typicalDay(build(0), D).realityKcal > 0);
  // Losing about what the log predicts (500 kcal a day is about 0.065 kg a day): no change.
  assert.equal(realityAdjustment(build(-500 / 7700), D), 0);
});
