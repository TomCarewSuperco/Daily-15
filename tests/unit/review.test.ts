import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, suggestTargets, todayKey } from "../../src/app/calc";
import { weeklyReview } from "../../src/app/review";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState, FocusGoal, FoodEntry } from "../../src/app/types";

const END = addDays(todayKey(), -1);
const day = (n: number) => addDays(END, -n);
let id = 0;

function make({ kgPerWeek = -0.6, kcal = 2000, protein = 150, extra = {}, focus = [] as FocusGoal[], sex = "male" as "male" | "female", calories, adjustedAt, weighIns = true, foodDays = 7 }: {
  kgPerWeek?: number; kcal?: number; protein?: number; extra?: Partial<FoodEntry>; focus?: FocusGoal[]; sex?: "male" | "female"; calories?: number; adjustedAt?: string; weighIns?: boolean; foodDays?: number;
} = {}): AppState {
  const targets = suggestTargets({ age: 40, sex, heightCm: 180, startWeightKg: 95, targetWeightKg: 85, activityLevel: "light", goal: "lose-fat" });
  if (calories) targets.calories = calories;
  const s: AppState = { ...empty(), profile: { name: "", age: 40, sex, heightCm: 180, startWeightKg: 95, targetWeightKg: 85, experience: "beginner", activityLevel: "light", goal: "lose-fat", focus, targets, targetsCustomised: false, adjustedAt } };
  for (let n = 0; n < 21; n++) {
    if (weighIns && n % 2 === 0) s.weights.push({ id: `w${n}`, date: day(n), kg: 90 - (kgPerWeek * n) / 7 });
    if (n < foodDays) s.foods.push({ id: `f${++id}`, date: day(n), meal: "lunch", name: "Day's food", portion: "1", kcal, protein, carbs: 200, fat: 60, fibre: 30, estimated: false, ...extra });
    if (n < 7) s.routineLogs[day(n)] = { date: day(n), mode: "standard", completedIds: [], finished: true };
    s.activity[day(n)] = { date: day(n), steps: 9000, distanceKm: 7, activeMinutes: 40, activityKcal: 300 };
    s.water[day(n)] = 2500;
  }
  s.workouts.push({ id: "wk", date: day(2), category: "Weight training", name: "Gym", durationMin: 45, intensity: "moderate", exercises: [] });
  return s;
}

test("steady loss is on track with no change suggested", () => {
  const r = weeklyReview(make({ kgPerWeek: -0.6 }), END);
  assert.equal(r.status, "on-track");
  assert.equal(r.adjustment, null);
  assert.ok(r.wins.some((w) => w.includes("steady rate")));
});

test("losing more than 1% a week suggests eating 150 kcal more", () => {
  const s = make({ kgPerWeek: -1.5 });
  const r = weeklyReview(s, END);
  assert.equal(r.status, "too-fast");
  assert.equal(r.adjustment?.change.calories, s.profile!.targets.calories + 150);
});

test("two flat weeks on target suggests 150 kcal less", () => {
  const s = make({ kgPerWeek: 0, kcal: 2000, calories: 2000 });
  const r = weeklyReview(s, END);
  assert.equal(r.status, "stalled");
  assert.equal(r.adjustment?.change.calories, 1850);
});

test("two flat weeks while eating over target asks to hit the target first", () => {
  const r = weeklyReview(make({ kgPerWeek: 0, kcal: 2400, calories: 2000 }), END);
  assert.equal(r.status, "over-target");
  assert.equal(r.adjustment, null);
  assert.ok(r.lessOf.some((p) => p.id === "calories"));
});

test("never suggests a target below the floor", () => {
  const r = weeklyReview(make({ kgPerWeek: 0, kcal: 1200, calories: 1200, sex: "female" }), END);
  assert.equal(r.adjustment, null);
  assert.ok(r.notes.some((n) => n.includes("minimum")));
});

test("waits two weeks after an accepted change", () => {
  const r = weeklyReview(make({ kgPerWeek: 0, calories: 2000, adjustedAt: day(5) }), END);
  assert.equal(r.adjustment, null);
  assert.ok(r.notes.some((n) => n.includes("recently")));
});

test("too few weigh-ins means no judgement on weight", () => {
  const r = weeklyReview(make({ weighIns: false }), END);
  assert.equal(r.status, "not-enough-data");
  assert.equal(r.adjustment, null);
});

test("cholesterol focus puts saturated fat first, with the foods responsible", () => {
  const s = make({ focus: ["cholesterol"], extra: { satFat: 38, sugars: 40, salt: 4 } });
  s.foods.push({ id: "cheese", date: day(1), meal: "snacks", name: "Cheddar cheese", portion: "30 g", kcal: 125, protein: 7, carbs: 0, fat: 10, fibre: 0, satFat: 6.6, estimated: true });
  const r = weeklyReview(s, END);
  assert.equal(r.lessOf[0].id, "sat-fat");
  assert.equal(r.lessOf[0].focus, true);
  assert.ok(r.lessOf[0].detail?.includes("day's food"));
  assert.ok(r.moreOf.some((p) => p.id === "unsaturated"));
});

test("saturated fat isn't judged when most food has no figure", () => {
  const r = weeklyReview(make({ focus: ["cholesterol"] }), END);
  assert.ok(!r.lessOf.some((p) => p.id === "sat-fat"));
});

test("over 14 units of alcohol is flagged", () => {
  const s = make();
  for (let n = 0; n < 4; n++) s.foods.push({ id: `beer${n}`, date: day(n), meal: "snacks", name: "Beer, 4%", portion: "2 pints", kcal: 488, protein: 6, carbs: 41, fat: 0, fibre: 0, alcoholUnits: 4.5, estimated: true });
  const r = weeklyReview(s, END);
  assert.ok(r.lessOf.some((p) => p.id === "alcohol" && p.text.includes("18 units")));
});

test("low protein at breakfast is called out", () => {
  const s = make({ protein: 90 });
  for (let n = 0; n < 7; n++) s.foods.push({ id: `b${n}`, date: day(n), meal: "breakfast", name: "Toast", portion: "2 slices", kcal: 200, protein: 8, carbs: 38, fat: 2, fibre: 3, estimated: true });
  const r = weeklyReview(s, END);
  const p = r.moreOf.find((x) => x.id === "protein");
  assert.ok(p?.detail?.includes("Breakfast averaged only 8 g"));
});

test("at most three points in each list", () => {
  const r = weeklyReview(make({ protein: 50, extra: { fibre: 5, satFat: 50, sugars: 150, salt: 12 } }), END);
  assert.ok(r.moreOf.length <= 3 && r.lessOf.length <= 3);
});

test("eating over target isn't flagged while weight comes off steadily", () => {
  const r = weeklyReview(make({ kgPerWeek: -0.6, kcal: 2400, calories: 2000 }), END);
  assert.equal(r.status, "on-track");
  assert.ok(!r.lessOf.some((p) => p.id === "calories"));
});
