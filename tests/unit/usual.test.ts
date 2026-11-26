import { test } from "node:test";
import assert from "node:assert/strict";
import { listNames, usualFor } from "../../src/app/usual";
import type { FoodEntry } from "../../src/app/types";
import { emptyStateForTests } from "./fixtures";

const e = (date: string, name: string, kcal: number, meal: FoodEntry["meal"] = "breakfast"): FoodEntry => ({ id: `${date}-${name}`, date, meal, name, portion: "1", estimated: false, kcal, protein: 1, carbs: 1, fat: 1, fibre: 0 });

test("a breakfast eaten most days becomes the usual, with the latest portion", () => {
  const s = emptyStateForTests();
  s.foods = [
    e("2026-11-20", "Egg", 160), e("2026-11-20", "Greek yoghurt", 80), e("2026-11-20", "Kimchi", 48),
    e("2026-11-22", "Egg", 172), e("2026-11-22", "Greek yoghurt", 80), e("2026-11-22", "Kimchi", 48), e("2026-11-22", "Banana", 90),
    e("2026-11-24", "Egg", 172), e("2026-11-24", "Greek yoghurt", 80), e("2026-11-24", "Kimchi", 48),
    e("2026-11-24", "Pasta", 600, "dinner"),
  ];
  const u = usualFor(s, "breakfast", "2026-11-26")!;
  assert.deepEqual(u.items.map((i) => i.name), ["Egg", "Greek yoghurt", "Kimchi"]);
  assert.equal(u.total.kcal, 300);
  assert.equal(u.days, 3);
  assert.equal(usualFor(s, "dinner", "2026-11-26"), null);
});

test("no usual from one day, or from foods older than four weeks", () => {
  const s = emptyStateForTests();
  s.foods = [e("2026-11-25", "Egg", 172)];
  assert.equal(usualFor(s, "breakfast", "2026-11-26"), null);
  s.foods = [e("2026-09-01", "Egg", 172), e("2026-09-02", "Egg", 172)];
  assert.equal(usualFor(s, "breakfast", "2026-11-26"), null);
});

test("names read as a list", () => {
  assert.equal(listNames([{ name: "Egg" }, { name: "Greek-style yoghurt, full fat (10%)" }, { name: "Kimchi" }]), "Egg, Greek-style yoghurt and Kimchi");
});
