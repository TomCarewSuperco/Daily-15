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
  assert.equal(searchFoods(FOOD_DB, "Natural yogurt 10", 1)[0].name, "Greek-style yoghurt, full fat (10%)");
  assert.equal(searchFoods(FOOD_DB, "natural yogurt 0%", 1)[0].name, "Greek yoghurt, 0% fat");
  assert.equal(searchFoods(FOOD_DB, "milk", 1)[0].name, "Whole milk");
  assert.notEqual(searchFoods(FOOD_DB, "yogurt", 1)[0].name, "Yogurt-coated raisins");
});

test("'bio me' finds Bio&Me; branded results rank by words matched", async () => {
  const { FOOD_DB } = await import("../../src/app/foods");
  const { searchFoods } = await import("../../src/app/cofid");
  const { rankByQuery } = await import("../../src/app/components/barcode");
  assert.equal(searchFoods(FOOD_DB, "Bio me super nutty")[0]?.name, "Bio&Me Super Nutty Granola");
  const ranked = rankByQuery([{ name: "Marks & Spencer Super Nutty" }, { name: "Bio&Me Mango" }, { name: "Bio&Me Granola Super Nutty" }], "bio me super nutty");
  assert.equal(ranked[0].name, "Bio&Me Granola Super Nutty");
});

test("biltong and jerky: built in, by the handful or bag, typos found", async () => {
  const { householdUnitsFor } = await import("../../src/app/cofid");
  assert.equal(searchFoods(FOOD_DB, "bilton", 1)[0].name, "Biltong");
  assert.equal(FOOD_DB.find((f) => f.name === "Biltong")!.units[0].g, 15);
  assert.equal(householdUnitsFor("Brand Biltong Original")[1].g, 30);
});

test("salad vegetables are common foods with everyday measures", () => {
  for (const [q, want] of [["cucumber", "Cucumber"], ["peppers", "Red pepper"], ["celery", "Celery"], ["radish", "Radishes"], ["spring onion", "Spring onions"]])
    assert.equal(searchFoods(FOOD_DB, q, 1)[0]?.name, want, q);
  assert.equal(FOOD_DB.find((f) => f.name === "Cucumber")!.units[0].name, "slice");
});

test("everyday vegetables come up under their plain names, before dishes", async () => {
  const { loadCofid } = await import("../../src/app/cofid");
  const all = [...FOOD_DB, ...(await loadCofid())];
  for (const [q, want] of [["pakchoi", "Pak choi"], ["bok choy", "Pak choi"], ["corn on the cob", "Corn on the cob"], ["lettuce", "Lettuce"], ["leek", "Leeks"], ["green beans", "Green beans"], ["courgette", "Courgette"], ["tenderstem", "Tenderstem broccoli"], ["carrot", "Carrots"], ["sweet potato", "Sweet potato, baked"]])
    assert.equal(searchFoods(all, q, 1)[0]?.name, want, q);
});

test("yoghurt: '10%' and '0%' find the right one, either spelling", async () => {
  const { collapse } = await import("../../src/app/variants");
  assert.equal(searchFoods(FOOD_DB, "10% fat yogurt", 1)[0].name, "Greek-style yoghurt, full fat (10%)");
  assert.equal(searchFoods(FOOD_DB, "0% yoghurt", 1)[0].name, "Greek yoghurt, 0% fat");
  const rows = collapse(searchFoods(FOOD_DB, "yogurt", 4), "yogurt", []);
  assert.equal(rows[0].title, "Yoghurt");
  assert.equal(FOOD_DB.find((f) => f.name === "Greek-style yoghurt, full fat (10%)")!.units[0].name, "heaped tablespoon");
});

test("lager calories match UK labels (about 40 kcal per 100 ml at 5%)", () => {
  const lager = FOOD_DB.find((f) => f.name === "Lager")!;
  const premium = FOOD_DB.find((f) => f.name === "Lager, premium")!;
  assert.ok(lager.kcal >= 30 && lager.kcal <= 36);
  assert.ok(premium.kcal >= 38 && premium.kcal <= 44);
  assert.equal(premium.abv, 5);
});

test("sausage rolls are found, even half typed, without pushing sausages down", async () => {
  const { collapse } = await import("../../src/app/variants");
  assert.equal(searchFoods(FOOD_DB, "Sausage rol", 1)[0].name, "Sausage roll");
  assert.equal(collapse(searchFoods(FOOD_DB, "sausage", 3), "sausage", [])[0].title, "Sausages");
});

test("KitKat is built in with its bar sizes, however it's typed", async () => {
  const { searchTerms } = await import("../../src/app/components/barcode");
  for (const q of ["kitkat", "Kit Kat", "kitkat chunky"]) assert.equal(searchFoods(FOOD_DB, q, 1)[0]?.name, "KitKat", q);
  assert.deepEqual(FOOD_DB.find((f) => f.name === "KitKat")!.units.map((u) => u.name).slice(0, 3), ["2-finger bar", "4-finger bar", "Chunky"]);
  assert.equal(searchTerms("Kitkat chunky"), "kit kat chunky");
});
