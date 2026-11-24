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

test("with today's time, the step-up option closest to 15 minutes comes first", () => {
  // 13 min 10 s at two rounds: more reps lands near 15, another round overshoots.
  const p = proposeAfter("easy", fixed, [], 790)!;
  assert.equal(p.options?.length, 2);
  assert.equal(p.options![0].label, "More reps");
  assert.ok(p.options![1].minutes! > 15);
  assert.match(p.detail, /13 min 10 s/);
  // A 9-minute session: another round gets closer to 15.
  assert.equal(proposeAfter("easy", fixed, [], 540)!.options![0].label, "Another round");
});

test("'about right' but well under 15 minutes suggests a little more", () => {
  assert.equal(proposeAfter("right", fixed, [], 600)?.headline, "Room for a little more");
  assert.equal(proposeAfter("right", fixed, [], 860), null);
});

test("one exercise can be set harder than the rest", () => {
  const r = buildRoutine(DEFAULT_ROUTINE, "standard", { ...fixed, bias: { pushup: 2 } }, DAY);
  const base = buildRoutine(DEFAULT_ROUTINE, "standard", fixed, DAY);
  assert.ok(r.find((e) => e.id === "pushup")!.amount > base.find((e) => e.id === "pushup")!.amount);
  assert.equal(r.find((e) => e.id === "squat")!.amount, base.find((e) => e.id === "squat")!.amount);
});

test("adjusting an exercise edits the amount you actually do, at its current difficulty", async () => {
  const { shownAmount, baseForShown } = await import("../../src/app/routine");
  const settings = { ...fixed, level: 2, bias: { pushup: 1 } };
  const push = DEFAULT_ROUTINE.find((e) => e.id === "pushup")!;
  const shown = shownAmount(push, settings);
  assert.equal(shown, buildRoutine(DEFAULT_ROUTINE, "standard", settings, DAY).find((e) => e.id === "pushup")!.amount);
  // Set it to 16: the routine then shows 16 at this difficulty.
  const base = DEFAULT_ROUTINE.map((e) => (e.id === "pushup" ? { ...e, amount: baseForShown(16, e, settings) } : e));
  assert.equal(buildRoutine(base, "standard", settings, DAY).find((e) => e.id === "pushup")!.amount, 16);
  const plankBase = DEFAULT_ROUTINE.map((e) => (e.id === "plank" ? { ...e, amount: baseForShown(45, e, settings) } : e));
  assert.equal(buildRoutine(plankBase, "standard", settings, DAY).find((e) => e.id === "plank")!.amount, 45);
});

test("finishing in about 12 minutes puts another round first, also for 'about right'", () => {
  const easy = proposeAfter("easy", fixed, [], 728)!;
  assert.equal(easy.options![0].label, "Another round");
  assert.equal(easy.options![0].minutes, 17);
  const right = proposeAfter("right", fixed, [], 728)!;
  assert.equal(right.headline, "Room for a little more");
  assert.equal(right.options![0].label, "Another round");
});

test("glute and core slots rotate through more exercises; push-ups stay", () => {
  const names = (id: string) => new Set(Array.from({ length: 14 }, (_, n) => buildRoutine(DEFAULT_ROUTINE, "standard", DEFAULT_SETTINGS, addDays(DAY, n)).find((e) => e.id === id)!.name));
  assert.ok(names("bridge").size >= 3, [...names("bridge")].join(", "));
  assert.ok(names("plank").size >= 5, [...names("plank")].join(", "));
  assert.deepEqual([...names("pushup")], ["Push-ups"]);
});

test("the cardio slot never repeats the marching warm-up", async () => {
  const { buildRoutine, settingsOf } = await import("../../src/app/routine");
  const { DEFAULT_ROUTINE } = await import("../../src/app/data");
  const { emptyStateForTests } = await import("./fixtures");
  const settings = settingsOf(emptyStateForTests());
  for (let d = 1; d <= 9; d++) {
    const list = buildRoutine(DEFAULT_ROUTINE, "standard", settings, `2026-11-${String(d).padStart(2, "0")}`);
    assert.ok(!list.some((e) => e.name === "Standing knee raises"), `day ${d}`);
  }
});

test("cool-down stretches cover every area and change from day to day", async () => {
  const { stepsFor } = await import("../../src/app/data");
  const { hasDemo } = await import("../../src/app/exercises");
  const a = stepsFor("Gentle stretching", "2026-11-23")!.map((x) => x.name);
  const b = stepsFor("Gentle stretching", "2026-11-24")!.map((x) => x.name);
  assert.equal(a.length, 4);
  assert.notDeepEqual(a, b);
  for (let d = 1; d <= 8; d++) for (const st of stepsFor("Gentle stretching", `2026-11-0${d}`)!) assert.ok(hasDemo(st.name), st.name);
});
