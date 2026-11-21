import { test } from "node:test";
import assert from "node:assert/strict";
import { highIn } from "../../src/app/flags";
import type { FoodEntry } from "../../src/app/types";

const entry = (base: Partial<FoodEntry["source"]>, totals: Partial<FoodEntry> = {}): FoodEntry =>
  ({ id: "1", date: "2026-11-21", meal: "lunch", name: "x", portion: "1", estimated: true, kcal: 300, protein: 10, carbs: 30, fat: 15, fibre: 2, ...totals,
    source: { name: "x", per: 100, baseUnit: "g", units: [], unitIdx: -1, qty: 100, estimated: true, base: { kcal: 300, protein: 10, carbs: 30, fat: 15, fibre: 2 }, ...base } }) as FoodEntry;

test("tags only the user's focus nutrients, by the per-100 g traffic-light threshold", () => {
  const sausageRoll = entry({ base: { kcal: 350, protein: 9, carbs: 25, fat: 24, fibre: 1, satFat: 9, salt: 1.2, sugars: 2 } });
  assert.deepEqual(highIn(sausageRoll, ["cholesterol"]), ["satFat"]);
  assert.deepEqual(highIn(sausageRoll, ["salt"]), []);
  assert.deepEqual(highIn(sausageRoll, []), []);
});

test("drinks use the per-100 ml threshold; servings use 30% of the reference intake", () => {
  const cola = entry({ baseUnit: "ml", base: { kcal: 42, protein: 0, carbs: 10.6, fat: 0, fibre: 0, sugars: 10.6 } });
  assert.deepEqual(highIn(cola, ["sugar"]), []);
  const juice = entry({ baseUnit: "ml", base: { kcal: 48, protein: 0, carbs: 12, fat: 0, fibre: 0, sugars: 12 } });
  assert.deepEqual(highIn(juice, ["sugar"]), ["sugars"]);
  const curry = { ...entry({}), source: undefined, satFat: 14 } as FoodEntry;
  assert.deepEqual(highIn(curry, ["cholesterol"]), ["satFat"]);
});
