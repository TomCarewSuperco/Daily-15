import { test } from "node:test";
import assert from "node:assert/strict";
import { describeLast, lastTimeFor, planSession, suggestNext } from "../../src/app/gym";
import type { Workout } from "../../src/app/types";

const w = (date: string, name: string, sets: [number, number][]): Workout => ({ id: date, date, category: "Weight training", name: "Gym", durationMin: 45, intensity: "moderate", exercises: [{ name, sets: sets.map(([reps, weightKg]) => ({ reps, weightKg })) }] });

test("finds the most recent session with that exercise", () => {
  const hist = [w("2026-11-01", "Back squat", [[5, 60]]), w("2026-11-08", "Back squat", [[5, 62.5]]), w("2026-11-10", "Bench press", [[5, 50]])];
  assert.equal(lastTimeFor(hist, "back squat")?.date, "2026-11-08");
  assert.equal(lastTimeFor(hist, "Deadlift"), null);
});

test("hit every rep: suggest the next increment for the equipment", () => {
  assert.equal(suggestNext("Back squat", 5, { date: "x", sets: [{ reps: 5, weightKg: 60 }, { reps: 5, weightKg: 60 }] })?.weightKg, 62.5);
  assert.equal(suggestNext("Goblet squat", 10, { date: "x", sets: [{ reps: 10, weightKg: 16 }] })?.weightKg, 18);
  assert.equal(suggestNext("Leg press", 10, { date: "x", sets: [{ reps: 10, weightKg: 80 }] })?.weightKg, 85);
});

test("missed reps: stay at the same weight", () => {
  const s = suggestNext("Bench press", 5, { date: "x", sets: [{ reps: 5, weightKg: 50 }, { reps: 4, weightKg: 50 }] });
  assert.equal(s?.weightKg, 50);
  assert.match(s!.note, /Stay at 50 kg/);
});

test("no suggestion for bodyweight or first time", () => {
  assert.equal(suggestNext("Push-ups", 10, { date: "x", sets: [{ reps: 10, weightKg: 0 }] }), null);
  assert.equal(suggestNext("Back squat", 5, null), null);
});

test("plan pre-fills weights from the suggestion", () => {
  const plan = planSession([{ name: "Back squat", sets: [{ reps: 5, weightKg: 0 }, { reps: 5, weightKg: 0 }] }], [w("2026-11-08", "Back squat", [[5, 60], [5, 60]])]);
  assert.deepEqual(plan[0].sets.map((s) => s.weightKg), [62.5, 62.5]);
});

test("describes last time briefly", () => {
  assert.equal(describeLast({ date: "x", sets: [{ reps: 10, weightKg: 16 }, { reps: 10, weightKg: 16 }, { reps: 10, weightKg: 16 }] }), "3 × 10 at 16 kg");
  assert.equal(describeLast({ date: "x", sets: [{ reps: 10, weightKg: 16 }, { reps: 8, weightKg: 16 }] }), "10×16, 8×16");
});

test("on the same day, the session logged later counts as last time", () => {
  const hist = [w("2026-11-19", "Goblet squat", [[10, 16], [10, 0], [10, 0]]), w("2026-11-19", "Goblet squat", [[10, 16], [10, 16]])];
  assert.equal(lastTimeFor(hist, "Goblet squat")?.sets.length, 2);
});

test("weights carry over between different workouts; without progression they aren't raised", async () => {
  const { planSession } = await import("../../src/app/gym");
  const past = [{ id: "a", date: "2026-11-20", category: "Weight training", name: "Gym full body A", durationMin: 50, intensity: "moderate" as const, exercises: [{ name: "Back squat", sets: [{ reps: 5, weightKg: 50 }, { reps: 5, weightKg: 50 }] }] }];
  const template = [{ name: "Back squat", sets: [{ reps: 5, weightKg: 0 }, { reps: 5, weightKg: 0 }, { reps: 5, weightKg: 0 }] }];
  assert.deepEqual(planSession(template, past, false)[0].sets.map((s) => s.weightKg), [50, 50, 50]);
  assert.deepEqual(planSession(template, past, true)[0].sets.map((s) => s.weightKg), [52.5, 52.5, 52.5]);
});

test("rest starts by type of exercise", async () => {
  const { defaultRest } = await import("../../src/app/gym");
  assert.equal(defaultRest("Back squat"), 150);
  assert.equal(defaultRest("Goblet squat"), 90);
  assert.equal(defaultRest("Bicep curl"), 60);
  assert.equal(defaultRest("Plank"), 60);
});
