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
  assert.deepEqual(unitsFor("Cheese sauce, made with semi-skimmed milk, homemade", "g", null, "SN").map((x) => x.g), [20, 60]);
  assert.equal(first("Black pudding, dry-fried", "MI").g, 40);
  assert.equal(first("Raisins, dried", "FA", "dried").g, 30);
  assert.equal(first("Pakora/bhajia, onion, fried in vegetable oil, homemade", "DR").g, 50);
  assert.equal(first("Vermouth, dry", "QG", null, "ml").g, 50);
  assert.equal(first("Chicken tikka masala, homemade", "MR").g, 350);
});

test("bakery: croissants and Danish pastries have a piece unit", () => {
  assert.equal(first("Croissants", "AN").g, 60);
  assert.equal(first("Pastries, Danish, retail", "AN").g, 90);
});

test("salads are side portions, coleslaw by the spoon", () => {
  assert.equal(first("Salad, potato, with French dressing", "DR").g, 100);
  assert.equal(first("Coleslaw, with reduced calorie dressing, retail", "DR").g, 30);
});

test("countable foods: new potatoes, eggs, bacon, crisps, nuts", () => {
  assert.deepEqual(unitsFor("Potatoes, new and salad, boiled in salted water, flesh and skin", "g", null, "DAR")[0], { name: "new potato", plural: "new potatoes", g: 40 });
  assert.equal(first("Potatoes, old, baked, flesh only", "DAR").name, "jacket potato");
  assert.equal(first("Potatoes, old, roasted in lard", "DAR").name, "roast potato");
  assert.equal(first("Eggs, chicken, whole, poached", "CA").name, "egg");
  assert.deepEqual(unitsFor("Eggs, chicken, whole, dried", "g", null, "CA"), []);
  assert.equal(first("Bacon rashers, back, dry-cured, grilled", "MAA").g, 25);
  assert.equal(first("Potato crisps, low fat", "SN").name, "bag");
  assert.equal(first("Peanuts, dry roasted", "GA").g, 30);
  assert.equal(first("Pasta, white, dried, raw", "AD").g, 75);
  assert.equal(first("Drinking chocolate powder, made up with whole milk", "PAA").name, "mug");
  assert.equal(first("Breakfast cereal, oat, instant, plain, fortified, cooked, made up with semi-skimmed milk", "AI").g, 200);
});

test("branded products get spoon measures from their name", async () => {
  const { householdUnitsFor } = await import("../../src/app/cofid");
  assert.equal(householdUnitsFor("Brooklea Greek 10% fat authentic yogurt")[0].name, "heaped tablespoon");
  assert.equal(householdUnitsFor("Sun-Pat Crunchy Peanut Butter")[0].name, "teaspoon");
  assert.equal(householdUnitsFor("Lurpak Spreadable")[0].name, "thin spread");
  assert.equal(householdUnitsFor("Heinz Tomato Ketchup")[0].g, 15);
  assert.equal(householdUnitsFor("Ben & Jerry's ice cream").length, 0);
  assert.deepEqual(householdUnitsFor("Mars bar"), []);
});

test("cooked meat, fish and puddings get everyday units", () => {
  assert.equal(first("Beef, fore-rib/rib-roast, roasted, lean", "MAC").name, "slice");
  assert.equal(first("Chicken, breast, grilled, meat and skin", "MCC").g, 140);
  assert.equal(first("Lamb, loin chops, grilled, lean", "MBG").name, "chop");
  assert.equal(first("Chorizo", "MI").g, 5);
  assert.equal(first("Cheesecake, homemade", "BRC").name, "slice");
  assert.equal(first("Trifle, homemade", "BRC").name, "bowl");
  assert.notEqual(first("Corned beef hash, homemade", "MRA").name, "slice");
});
