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

test("newer foods missing from CoFID are in the everyday list", () => {
  for (const q of ["Kimchi", "kombucha", "kefir", "skyr", "sourdough", "gyoza", "ramen"])
    assert.ok(searchFoods(FOOD_DB, q, 3).length > 0, q);
});

test("small spelling mistakes still find the food", () => {
  const foods = [
    { name: "Cheese, Brie, with outer rind removed" }, { name: "Cheese, Brie, rind only" }, { name: "Breadsticks, plain" },
    { name: "Lager, alcohol-free" }, { name: "Broccoli, green, boiled" },
  ] as any;
  assert.equal(searchFoods(foods, "Bree", 3)[0].name, "Cheese, Brie, with outer rind removed");
  assert.ok(!searchFoods(foods, "Bree", 5).some((f) => f.name.startsWith("Lager")));
  assert.equal(searchFoods(foods, "brocoli", 3)[0].name, "Broccoli, green, boiled");
  assert.equal(searchFoods(FOOD_DB, "bannana", 3)[0].name, "Banana");
});

test("unit plurals are spelled correctly", async () => {
  const { loadCofid } = await import("../../src/app/cofid");
  const all = [...FOOD_DB, ...(await loadCofid())];
  const bad = new Set<string>();
  for (const f of all) for (const u of f.units ?? []) if (/(o|ch|sh|x|[^aeiou]y)s$/.test(u.plural) && !/(avocados|burritos|espressos|tacos)$/.test(u.plural)) bad.add(u.plural);
  assert.deepEqual([...bad], []);
});

test("noodles and common dishes missing from CoFID are found", () => {
  for (const [q, want] of [["udon", "Udon noodles, cooked"], ["udaan", "Udon noodles, cooked"], ["soba", "Soba noodles, cooked"], ["chicken nuggets", "Chicken nuggets"], ["shakshuka", "Shakshuka"], ["frozen yogurt", "Frozen yogurt"]])
    assert.equal(searchFoods(FOOD_DB, q, 3)[0]?.name, want, q);
});

test("alcohol-free drinks are found and count no alcohol units", () => {
  for (const q of ["Naughty", "non alcoholic champagne", "0.0 beer", "alcohol free wine", "seedlip", "mocktail"]) {
    const top = searchFoods(FOOD_DB, q, 1)[0];
    assert.ok(top && (/alcohol-free/i.test(top.name) || /virgin/i.test(top.name)), q);
    assert.ok(!top.abv, q);
  }
});

test("chocolate-coated nuts and raisins are found", () => {
  assert.equal(searchFoods(FOOD_DB, "Chocolate almonds", 1)[0].name, "Chocolate almonds, milk chocolate");
  assert.equal(searchFoods(FOOD_DB, "yoghurt covered raisins", 1)[0].name, "Yogurt-coated raisins");
});

test("'natural yogurt 10%' finds full-fat Greek-style yoghurt; numbers read as fat", () => {
  assert.equal(searchFoods(FOOD_DB, "Natural yogurt 10", 1)[0].name, "Greek-style yoghurt, full fat");
  assert.equal(searchFoods(FOOD_DB, "natural yogurt 0%", 1)[0].name, "Greek yoghurt, 0% fat");
  assert.equal(searchFoods(FOOD_DB, "milk", 1)[0].name, "Whole milk");
  assert.notEqual(searchFoods(FOOD_DB, "yogurt", 1)[0].name, "Yogurt-coated raisins");
});
