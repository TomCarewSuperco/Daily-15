import { test } from "node:test";
import assert from "node:assert/strict";
import { unitsFor } from "../../src/app/cofid";

const first = (name: string, group: string, five: any = null, unit: "g" | "ml" = "g") => unitsFor(name, unit, five, group)[0];

test("made-up porridge is a 200 g bowl, dry oats are grams", () => {
  assert.equal(first("Porridge, made with whole milk", "AI").g, 200);
  assert.equal(first("Porridge oats, unfortified, cooked, made up with semi-skimmed milk", "AI").g, 200);
  assert.equal(first("Porridge oats, unfortified", "AI").g, 40);
});

test("foods not eaten as listed have no everyday unit", () => {
  for (const [n, g] of [["Lentils, red, split, dried, raw", "DB"], ["Soup, chicken noodle, dried", "WAE"], ["Rice, white, pudding, raw", "AC"], ["Melon, weighed whole", "FA"], ["Beef, mince, raw", "MAA"]])
    assert.deepEqual(unitsFor(n, "g", null, g), [], n);
});

test("portion rules avoid known traps", () => {
  assert.equal(first("Taramasalata", "JR").g, 30);
  assert.equal(first("Curry powder", "HC").g, 3);
  assert.equal(first("Cheese sauce, made with semi-skimmed milk, homemade", "SN").g, 60);
  assert.equal(first("Black pudding, dry-fried", "MI").g, 40);
  assert.equal(first("Raisins, dried", "FA", "dried").g, 30);
  assert.equal(first("Pakora/bhajia, onion, fried in vegetable oil, homemade", "DR").g, 50);
  assert.equal(first("Vermouth, dry", "QG", null, "ml").g, 50);
  assert.equal(first("Chicken tikka masala, homemade", "MR").g, 350);
});
