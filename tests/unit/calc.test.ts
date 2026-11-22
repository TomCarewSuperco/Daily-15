import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, bestStreak, currentStreak, suggestTargets, todayKey, trendWeight, weeklyReport } from "../../src/app/calc";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState } from "../../src/app/types";

const base = { age: 42, sex: "male" as const, heightCm: 178, startWeightKg: 92, targetWeightKg: 82, activityLevel: "light" as const };

test("fat-loss target is maintenance less at most 500 kcal or 20%", () => {
  // Mifflin-St Jeor: 10*92 + 6.25*178 - 5*42 + 5 = 1827.5. x1.375 = 2512.8.
  const t = suggestTargets({ ...base, goal: "lose-fat" });
  assert.equal(t.calories, 2010);
  assert.equal(t.steps, 7500);
});

test("calorie target never drops below the floor", () => {
  const t = suggestTargets({ ...base, sex: "female", age: 70, heightCm: 150, startWeightKg: 45, targetWeightKg: 42, activityLevel: "sedentary", goal: "lose-weight" });
  assert.equal(t.calories, 1200);
});

test("maintenance and muscle goals adjust as expected", () => {
  assert.equal(suggestTargets({ ...base, goal: "maintain" }).calories, 2510);
  assert.equal(suggestTargets({ ...base, goal: "build-muscle" }).calories, 2760);
});

test("macros add up to roughly the calorie target", () => {
  const t = suggestTargets({ ...base, goal: "lose-fat" });
  const kcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
  assert.ok(Math.abs(kcal - t.calories) < 15, `macros total ${kcal} vs ${t.calories}`);
});

const day = (n: number) => addDays(todayKey(), -n);
const done = (s: AppState, ...ago: number[]) => ({
  ...s,
  routineLogs: Object.fromEntries(ago.map((n) => [day(n), { date: day(n), mode: "standard" as const, completedIds: [], finished: true }])),
});

test("streak counts back from today, or from yesterday if today isn't done yet", () => {
  assert.equal(currentStreak(done(empty(), 0, 1, 2)), 3);
  assert.equal(currentStreak(done(empty(), 1, 2)), 2);
  // Never miss twice: one missed day is forgiven, two in a row break the streak.
  assert.equal(currentStreak(done(empty(), 0, 2)), 2);
  assert.equal(currentStreak(done(empty(), 0, 3)), 1);
});

test("missing yesterday is flagged; a freeze earned at 14 days covers a second miss", async () => {
  const { streakInfo } = await import("../../src/app/calc");
  const missed = streakInfo(done(empty(), 2, 3, 4));
  assert.equal(missed.current, 3);
  assert.equal(missed.missedYesterday, true);
  // 14 days in a row, then two missed days, then today: the freeze keeps the streak.
  const run = Array.from({ length: 14 }, (_, i) => i + 3);
  const kept = streakInfo(done(empty(), 0, ...run));
  assert.equal(kept.current, 15);
  assert.equal(kept.freezes, 0);
  // Without the freeze (only 5 days), the same gap breaks it.
  assert.equal(streakInfo(done(empty(), 0, 3, 4, 5, 6, 7)).current, 1);
});

test("a planned rest day pauses the streak without breaking it", () => {
  const s = { ...done(empty(), 0, 2, 3), restDays: [day(1)] };
  assert.equal(currentStreak(s), 3);
  assert.equal(bestStreak(s), 3);
});

test("trend weight averages the last seven days", () => {
  const weights = [0, 2, 4, 8].map((n, i) => ({ id: String(i), date: day(n), kg: [90, 91, 92, 99][i] }));
  assert.equal(trendWeight(weights, todayKey()), 91);
});

test("weekly report counts goals and stays within 0 to 100%", () => {
  const s = done({ ...empty(), profile: { targets: suggestTargets({ ...base, goal: "lose-fat" }), startWeightKg: 92, targetWeightKg: 82 } as AppState["profile"] }, 0, 1, 2, 3, 4);
  const r = weeklyReport(s);
  assert.equal(r.routineDays, 5);
  assert.ok(r.goalCompletion >= 0 && r.goalCompletion <= 100);
  assert.ok(r.achievements.some((a) => a.includes("5 of seven")));
});

test("active minutes count the daily routine and workouts, not double with Health", async () => {
  const { activeMinutesOn } = await import("../../src/app/calc");
  const d = "2026-11-21";
  const s = { ...empty(), routineLogs: { [d]: { date: d, mode: "standard", completedIds: [], finished: true, seconds: 790 } } } as AppState;
  assert.equal(activeMinutesOn(s, d), 13);
  const withWorkout = { ...s, workouts: [{ id: "w", date: d, durationMin: 30 } as any] };
  assert.equal(activeMinutesOn(withWorkout, d), 43);
  const health = { ...withWorkout, health: { connected: true }, activity: { [d]: { date: d, steps: 9000, activeMinutes: 50 } as any } };
  assert.equal(activeMinutesOn(health, d), 50);
  const noTime = { ...empty(), routineLogs: { [d]: { date: d, mode: "standard", completedIds: [], finished: true } } } as AppState;
  assert.equal(activeMinutesOn(noTime, d), 15);
});

test("without Health or entered minutes, steps give an estimate of active minutes", async () => {
  const { activeMinutesOn, stepsActiveEstimate } = await import("../../src/app/calc");
  assert.equal(stepsActiveEstimate(11000), 30);
  assert.equal(stepsActiveEstimate(4000), 0);
  const d = "2026-11-21";
  const s = { ...empty(), activity: { [d]: { date: d, steps: 11000 } as any }, routineLogs: { [d]: { date: d, mode: "standard", completedIds: [], finished: true, seconds: 790 } } } as AppState;
  assert.equal(activeMinutesOn(s, d), 43);
  const typed = { ...s, activity: { [d]: { date: d, steps: 11000, activeMinutes: 20 } as any } };
  assert.equal(activeMinutesOn(typed, d), 33);
});
