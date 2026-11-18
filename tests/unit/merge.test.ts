import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeStates } from "../../src/app/cloud/merge";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState, FoodEntry, WeightEntry } from "../../src/app/types";

const food = (id: string, kcal = 100): FoodEntry => ({ id, date: "2026-11-18", meal: "lunch", name: id, portion: "1", kcal, protein: 1, carbs: 1, fat: 1, fibre: 0, estimated: false });
const weight = (id: string, kg: number): WeightEntry => ({ id, date: `2026-11-${id.padStart(2, "0")}`, kg });
const withFoods = (s: AppState, foods: FoodEntry[]) => ({ ...s, foods });

test("keeps additions from both devices", () => {
  const base = withFoods(empty(), [food("a")]);
  const phone = withFoods(empty(), [food("a"), food("b")]);
  const tablet = withFoods(empty(), [food("a"), food("c")]);
  const ids = mergeStates(base, phone, tablet).foods.map((f) => f.id).sort();
  assert.deepEqual(ids, ["a", "b", "c"]);
});

test("a deletion on one device wins when the other didn't touch the item", () => {
  const base = withFoods(empty(), [food("a"), food("b")]);
  const phone = withFoods(empty(), [food("b")]);
  const tablet = withFoods(empty(), [food("a"), food("b"), food("c")]);
  assert.deepEqual(mergeStates(base, phone, tablet).foods.map((f) => f.id).sort(), ["b", "c"]);
});

test("an edit beats a deletion of the same item", () => {
  const base = withFoods(empty(), [food("a", 100)]);
  const phone = withFoods(empty(), []);
  const tablet = withFoods(empty(), [food("a", 250)]);
  assert.equal(mergeStates(base, phone, tablet).foods[0]?.kcal, 250);
});

test("when both edit the same item, this device wins", () => {
  const base = withFoods(empty(), [food("a", 100)]);
  const merged = mergeStates(base, withFoods(empty(), [food("a", 150)]), withFoods(empty(), [food("a", 200)]));
  assert.equal(merged.foods[0].kcal, 150);
});

test("day records merge day by day", () => {
  const base = { ...empty(), water: { "2026-11-17": 500 } };
  const phone = { ...base, water: { "2026-11-17": 500, "2026-11-18": 250 } };
  const tablet = { ...base, water: { "2026-11-17": 1000 } };
  assert.deepEqual(mergeStates(base, phone, tablet).water, { "2026-11-17": 1000, "2026-11-18": 250 });
});

test("rest days merge as a set", () => {
  const base = { ...empty(), restDays: ["2026-11-10"] };
  const phone = { ...empty(), restDays: ["2026-11-10", "2026-11-12"] };
  const tablet = { ...empty(), restDays: ["2026-11-14"] };
  assert.deepEqual(mergeStates(base, phone, tablet).restDays, ["2026-11-12", "2026-11-14"]);
});

test("profile takes whichever side changed", () => {
  const p = { ...empty(), profile: { name: "A" } as AppState["profile"] };
  const changed = { ...empty(), profile: { name: "B" } as AppState["profile"] };
  assert.equal(mergeStates(p, p, changed).profile?.name, "B");
  assert.equal(mergeStates(p, changed, p).profile?.name, "B");
});

test("photos never come from the other device", () => {
  const base = empty();
  const local = { ...empty(), photos: [{ id: "p", date: "2026-11-18", dataUrl: "x" }] };
  const remote = { ...empty(), photos: [{ id: "q", date: "2026-11-18", dataUrl: "y" }] };
  assert.deepEqual(mergeStates(base, local, remote).photos.map((p) => p.id), ["p"]);
});

test("weights from two devices on different days both survive", () => {
  const base = { ...empty(), weights: [weight("1", 90)] };
  const merged = mergeStates(base, { ...base, weights: [weight("1", 90), weight("2", 89.8)] }, { ...base, weights: [weight("1", 90), weight("3", 89.5)] });
  assert.equal(merged.weights.length, 3);
});
