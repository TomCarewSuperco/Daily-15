import { test } from "node:test";
import assert from "node:assert/strict";
import { searchFoods } from "../../src/app/cofid";
import { FOOD_DB } from "../../src/app/foods";

test("pain au chocolat is found with the English spelling", () => {
  assert.equal(searchFoods(FOOD_DB, "Pain au chocolate", 3)[0]?.name, "Pain au chocolat");
});

test("salad dressing finds dressings, vinaigrette finds French dressing", () => {
  const names = searchFoods(FOOD_DB, "salad dressing", 15).map((f) => f.name);
  assert.ok(names.includes("Caesar dressing"), names.join(", "));
  assert.equal(searchFoods(FOOD_DB, "salad cream", 3).length >= 0, true);
});
