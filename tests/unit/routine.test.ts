import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "../../src/app/calc";
import { DEFAULT_ROUTINE } from "../../src/app/data";
import { buildRoutine, DEFAULT_SETTINGS, estimateMinutes, mainOnce, proposeAfter } from "../../src/app/routine";
import type { RoutineLog } from "../../src/app/types";

const DAY = "2026-11-18";
const fixed = { ...DEFAULT_SETTINGS, variety: false };

test("default is a warm-up, two rounds of the main exercises and a stretch, about 15 minutes", () => {
  const r = buildRoutine(DEFAULT_ROUTINE, "standard", fixed, DAY);
  assert.equal(r[0].id, "march");
  assert.equal(r[r.length - 1].id, "stretch");
  assert.equal(r.length, 2 + 5 * 2);
  assert.equal(new Set(r.map((e) => e.id)).size, r.length, "ids are unique across rounds");
  const mins = estimateMinutes(r);
  assert.ok(mins >= 13 && mins <= 17, `about 15 minutes, got ${mins}`);
});

test("one round is shorter", () => {
  assert.ok(estimateMinutes(buildRoutine(DEFAULT_ROUTINE, "standard", { ...fixed, rounds: 1 }, DAY)) < 11);
});

test("difficulty scales the main exercises, not the warm-up or stretch", () => {
  const up = buildRoutine(DEFAULT_ROUTINE, "standard", { ...fixed, level: 2 }, DAY);
  assert.equal(up.find((e) => e.id === "squat")!.amount, 20); // 15 x 1.3 rounded
  assert.equal(up.find((e) => e.id === "plank")!.amount, 25); // 20 x 1.3, nearest 5 s
  assert.equal(up.find((e) => e.id === "march")!.amount, 180);
  const down = buildRoutine(DEFAULT_ROUTINE, "standard", { ...fixed, level: -2 }, DAY);
  assert.equal(down.find((e) => e.id === "pushup")!.amount, 7);
});

test("light mode is one round at half the amounts", () => {
  const r = buildRoutine(DEFAULT_ROUTINE, "light", DEFAULT_SETTINGS, DAY);
  assert.equal(r.length, 7);
  assert.equal(r.find((e) => e.id === "pushup")!.amount, 5);
});

test("variety rotates similar exercises across days", () => {
  const names = new Set<string>();
  for (let n = 0; n < 6; n++) names.add(buildRoutine(DEFAULT_ROUTINE, "standard", DEFAULT_SETTINGS, addDays(DAY, n)).find((e) => e.id === "squat")!.name);
  assert.ok(names.size >= 2, `squat slot varied: ${[...names].join(", ")}`);
  const pushups = new Set<string>();
  for (let n = 0; n < 6; n++) pushups.add(buildRoutine(DEFAULT_ROUTINE, "standard", DEFAULT_SETTINGS, addDays(DAY, n)).find((e) => e.id === "pushup")!.name);
  assert.deepEqual([...pushups], ["Push-ups"]);
});

test("an exercise the user swapped isn't rotated", () => {
  const base = DEFAULT_ROUTINE.map((e) => (e.id === "squat" ? { ...e, name: "Chair sit-to-stand", amount: 12 } : e));
  for (let n = 0; n < 6; n++) assert.equal(buildRoutine(base, "standard", DEFAULT_SETTINGS, addDays(DAY, n)).find((e) => e.id === "squat")!.name, "Chair sit-to-stand");
});

test("too easy steps up; at level 3 it adds a round instead", () => {
  assert.equal(proposeAfter("easy", fixed, [])?.settings.level, 1);
  const p = proposeAfter("easy", { ...fixed, level: 3, rounds: 2 }, []);
  assert.equal(p?.settings.rounds, 3);
  assert.equal(p?.settings.level, 3);
});

test("too hard steps down, then drops a round at the easiest level", () => {
  assert.equal(proposeAfter("hard", fixed, [])?.settings.level, -1);
  assert.equal(proposeAfter("hard", { ...fixed, level: -3, rounds: 2 }, [])?.settings.rounds, 1);
  assert.equal(proposeAfter("hard", { ...fixed, level: -3, rounds: 1 }, []), null);
});

test("three 'about right' sessions in a row suggest a small step up", () => {
  const log = (d: string, feeling: "right" | "easy"): RoutineLog => ({ date: d, mode: "standard", completedIds: [], finished: true, feeling });
  assert.equal(proposeAfter("right", fixed, [log("a", "right"), log("b", "right")]), null);
  assert.equal(proposeAfter("right", fixed, [log("a", "right"), log("b", "right"), log("c", "right")])?.settings.level, 1);
});

test("the preview lists each main exercise once", () => {
  assert.equal(mainOnce(buildRoutine(DEFAULT_ROUTINE, "standard", fixed, DAY)).length, 5);
});
