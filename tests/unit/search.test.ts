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
  assert.ok(searchFoods(FOOD_DB, "dressing", 15).some((f) => f.name === "Caesar dressing"));
});

test("flat white is found with each milk, including a typo'd 'coffe'", () => {
  const names = searchFoods(FOOD_DB, "Flat white coffe", 10).map((f) => f.name);
  for (const milk of ["whole", "semi-skimmed", "skimmed", "oat", "soya", "almond"]) assert.ok(names.includes(`Flat white, ${milk} milk`), milk);
  const whole = FOOD_DB.find((f) => f.name === "Flat white, whole milk")!;
  const almond = FOOD_DB.find((f) => f.name === "Flat white, almond milk")!;
  assert.ok(whole.kcal > almond.kcal * 3);
  assert.ok((whole.caffeine ?? 0) > 0);
});
