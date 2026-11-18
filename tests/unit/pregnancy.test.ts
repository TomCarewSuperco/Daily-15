import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, todayKey } from "../../src/app/calc";
import { extrasFor, FOOD_DB } from "../../src/app/foods";
import { exerciseWarning, flagsForFood, pregnancyReview, pregnancyWeek, supplementsFor, trimester } from "../../src/app/pregnancy";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState } from "../../src/app/types";

const due = (weeksPregnant: number) => addDays(todayKey(), Math.round((40 - weeksPregnant) * 7));

test("week and trimester from the due date", () => {
  assert.equal(pregnancyWeek(due(10)), 10);
  assert.equal(trimester(10), 1);
  assert.equal(trimester(20), 2);
  assert.equal(trimester(30), 3);
  assert.equal(pregnancyWeek(undefined), null);
});

test("folic acid until 12 weeks, vitamin D throughout, vitamin D only when breastfeeding", () => {
  assert.deepEqual(supplementsFor({ kind: "pregnant", dueDate: due(8) }).map((s) => s.id), ["folic-acid", "vitamin-d"]);
  assert.deepEqual(supplementsFor({ kind: "pregnant", dueDate: due(20) }).map((s) => s.id), ["vitamin-d"]);
  assert.deepEqual(supplementsFor({ kind: "pregnant" }).map((s) => s.id), ["folic-acid", "vitamin-d"]);
  assert.deepEqual(supplementsFor({ kind: "breastfeeding" }).map((s) => s.id), ["vitamin-d"]);
});

test("foods to avoid are flagged in pregnancy only", () => {
  const preg = { kind: "pregnant" as const };
  assert.equal(flagsForFood(preg, { name: "Brie" })[0]?.level, "avoid");
  assert.equal(flagsForFood(preg, { name: "Chicken liver pâté" }).length, 1);
  assert.equal(flagsForFood(preg, { name: "Cod liver oil capsule" }).length, 1, "matched once, by the supplement rule");
  assert.equal(flagsForFood(preg, { name: "Swordfish steak" })[0]?.level, "avoid");
  assert.equal(flagsForFood(preg, { name: "Red wine", abv: 13 })[0]?.level, "avoid");
  assert.equal(flagsForFood(preg, { name: "Chicken breast, cooked" }).length, 0);
  assert.equal(flagsForFood(null, { name: "Brie" }).length, 0);
  assert.equal(flagsForFood({ kind: "breastfeeding" }, { name: "Brie" }).length, 0);
  assert.equal(flagsForFood({ kind: "breastfeeding" }, { name: "Swordfish" })[0]?.level, "limit");
});

test("lying-on-the-back exercises are flagged from 16 weeks", () => {
  assert.equal(exerciseWarning({ kind: "pregnant", dueDate: due(10) }, "Glute bridges"), null);
  assert.ok(exerciseWarning({ kind: "pregnant", dueDate: due(20) }, "Glute bridges"));
  assert.ok(exerciseWarning({ kind: "pregnant" }, "Dead bug"), "flagged when the week is unknown");
  assert.equal(exerciseWarning({ kind: "pregnant", dueDate: due(20) }, "Air squats"), null);
  assert.equal(exerciseWarning({ kind: "breastfeeding" }, "Glute bridges"), null);
});

test("caffeine is counted from the food list", () => {
  const coffee = FOOD_DB.find((f) => f.name === "Coffee with semi-skimmed milk")!;
  assert.equal(extrasFor(coffee, 250).caffeineMg, 100);
  const tea = FOOD_DB.find((f) => f.name === "Tea with semi-skimmed milk")!;
  assert.equal(extrasFor(tea, 250).caffeineMg, 75);
});

test("pregnancy review never mentions calories or losing weight", () => {
  const s: AppState = { ...empty(), profile: { name: "", age: 32, sex: "female", heightCm: 165, startWeightKg: 70, targetWeightKg: 60, experience: "beginner", activityLevel: "light", goal: "health", targets: {} as never, targetsCustomised: false, lifeStage: { kind: "pregnant", dueDate: due(20) } } };
  const end = addDays(todayKey(), -1);
  for (let n = 0; n < 7; n++) {
    const d = addDays(end, -n);
    s.foods.push({ id: `c${n}`, date: d, meal: "breakfast", name: "Filter coffee", portion: "2 mugs", kcal: 40, protein: 2, carbs: 4, fat: 1, fibre: 0, caffeineMg: n === 0 ? 280 : 140, estimated: true });
    s.supplements![d] = ["vitamin-d"];
  }
  s.foods.push({ id: "brie", date: end, meal: "lunch", name: "Brie", portion: "30 g", kcal: 100, protein: 6, carbs: 0, fat: 8, fibre: 0, estimated: false });
  const r = pregnancyReview(s, end);
  const all = [r.headline, ...r.wins, ...r.watch, ...r.ideas].join(" ").toLowerCase();
  assert.match(r.headline, /Week (19|20)/);
  assert.ok(r.wins.some((w) => w.includes("Vitamin D taken on 7")));
  assert.ok(r.watch.some((w) => w.includes("Caffeine over 200 mg")));
  assert.ok(r.watch.some((w) => w.includes("brie")));
  assert.ok(!/calorie|kcal|lose weight|deficit/.test(all));
});
