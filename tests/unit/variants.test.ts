import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_DB } from "../../src/app/foods";
import { amountOf, collapse, preferred, switchTo, variantsFor } from "../../src/app/variants";

const item = (n: string) => FOOD_DB.find((f) => f.name === n)!;
const pendingOf = (n: string, unitIdx = 0, qty = 1) => {
  const f = item(n);
  return { name: f.name, base: f, per: f.per, baseUnit: f.unit, units: f.units, unitIdx, qty, estimated: true };
};

test("mash offers five versions, cheapest to richest differ several-fold", () => {
  const v = variantsFor("Mashed potato")!;
  assert.equal(v.options.length, 5);
  assert.equal(v.options[v.current].label, "Butter and milk");
  const kcal = v.options.map((o) => o.food.kcal);
  assert.ok(Math.max(...kcal) / Math.min(...kcal) > 2.5);
});

test("switching version keeps the amount on the plate", () => {
  const p = pendingOf("Mashed potato", 2, 1.5);
  const q = switchTo(p, item("Mashed potato, with butter and cream"));
  assert.equal(q.name, "Mashed potato, with butter and cream");
  assert.equal(amountOf(q), amountOf(p));
  const egg = switchTo(pendingOf("Egg", 0, 2), item("Scrambled eggs, with butter and milk"));
  assert.equal(amountOf(egg), 120);
});

test("coffees offer the six milks; plain foods have no versions", () => {
  assert.equal(variantsFor("Flat white, semi-skimmed milk")!.options.length, 6);
  assert.equal(variantsFor("Banana"), null);
});

test("roast potatoes, chips and porridge offer cooking choices", () => {
  assert.equal(variantsFor("Roast potatoes")!.options.length, 4);
  assert.equal(variantsFor("Chip shop chips")!.options.length, 5);
  assert.equal(variantsFor("Porridge, made with water")!.options.length, 5);
  // CoFID rows for the same food get the choice too.
  assert.equal(variantsFor("Potatoes, old, roasted in corn oil")!.options[variantsFor("Potatoes, old, roasted in corn oil")!.current].label, "Roasted in oil");
  const fries = switchTo(pendingOf("Oven chips", 1, 1), item("Fast-food fries"));
  assert.equal(amountOf(fries), 150);
});

test("rice and pasta offer kinds, including CoFID rows", () => {
  assert.equal(variantsFor("White rice, cooked")!.options.length, 5);
  assert.equal(variantsFor("Pasta, cooked")!.options.length, 4);
  const v = variantsFor("Rice, white, long grain, boiled in unsalted water")!;
  assert.equal(v.options[v.current].label, "Boiled white");
  const pouch = switchTo(pendingOf("White rice, cooked", 1, 1), item("Microwave rice, pouch"));
  assert.equal(amountOf(pouch), 180);
});

test("potatoes and noodles offer kinds; roast and mash keep their own choices", () => {
  assert.equal(variantsFor("Potato, boiled")!.options.length, 6);
  assert.equal(variantsFor("Egg noodles, cooked")!.options.length, 6);
  assert.equal(variantsFor("Roast potatoes")!.question, "How was it made?");
  assert.equal(variantsFor("Roast potatoes")!.options[0].label, "Air-fried");
  const news = switchTo(pendingOf("Potato, boiled", 0, 1), item("New potatoes, boiled"));
  assert.equal(news.units[news.unitIdx].name, "portion");
});

test("bread and toast: a slice switches to a slice, so calories compare per slice", () => {
  // Bread kinds differ too little per slice to ask; toast with butter differs a lot.
  assert.equal(variantsFor("White bread"), null);
  assert.equal(variantsFor("White toast")!.options.length, 6);
  const buttered = switchTo(pendingOf("White toast", 0, 2), item("White toast, buttered"));
  assert.equal(buttered.units[buttered.unitIdx].name, "slice");
  assert.equal(buttered.qty, 2);
});

test("search shows one row per food with versions, opening on last time's choice", () => {
  const results = FOOD_DB.filter((f) => /^(Chips, |Chip shop|Oven chips|Fast-food)/.test(f.name));
  const fresh = collapse(results, "chips", []);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].title, "Chips");
  assert.equal(fresh[0].food.name, "Oven chips");
  const after = collapse(results, "chips", [{ name: "Chip shop chips" }, { name: "Banana" }]);
  assert.equal(after[0].food.name, "Chip shop chips");
  assert.match(after[0].detail!, /last time: chip shop/);
  // A search for one version lists that version.
  assert.equal(collapse(results, "chip shop chips", [])[0].title, undefined);
});

test("milky drinks remember the milk across drinks", () => {
  assert.equal(preferred("Latte, semi-skimmed milk", [{ name: "Flat white, oat milk" }])!.name, "Latte, oat milk");
  assert.equal(preferred("Tea with semi-skimmed milk", [])!.name, "Tea with semi-skimmed milk");
});

test("mash and chips offer the other potatoes; eggs no longer ask", () => {
  const v = variantsFor("Mashed potato")!;
  assert.deepEqual(v.others!.options.map((o) => o.label), ["Boiled", "New, boiled", "Jacket", "Wedges", "Roast"]);
  assert.equal(variantsFor("Egg, fried"), null);
});

test("chicken wraps: homemade to takeaway, compared per wrap", () => {
  const v = variantsFor("Shawarma wrap, chicken")!;
  assert.equal(v.options.length, 5);
  const light = switchTo(pendingOf("Shawarma wrap, chicken", 0, 1), item("Chicken wrap, homemade, light"));
  assert.equal(light.qty, 1);
  assert.equal(Math.round((amountOf(light) * item("Chicken wrap, homemade, light").kcal) / 100), 365);
  const rows = collapse(FOOD_DB.filter((f) => /^(Chicken|Shawarma) wrap/.test(f.name)), "chicken wrap", []);
  assert.deepEqual(rows.map((r) => r.title), ["Chicken wrap"]);
});

test("ham: kinds of slice keep the count of slices", () => {
  assert.equal(variantsFor("Ham, sliced")!.options.length, 5);
  const carved = switchTo(pendingOf("Ham, sliced", 0, 3), item("Ham, gammon joint, carved"));
  assert.equal(carved.qty, 3);
  assert.equal(amountOf(carved), 105);
});

test("dishes can be logged lighter or richer by their fat", async () => {
  const { restyle, styleable, styledName } = await import("../../src/app/variants");
  const soup = { kcal: 55, protein: 1, carbs: 3.7, fat: 4.4, fibre: 1, satFat: 2 };
  assert.ok(styleable("Soup, vegetable, homemade", soup.fat));
  assert.ok(!styleable("Banana", 0.3));
  assert.ok(!styleable("Mashed potato", 4), "foods with their own choice don't get this one");
  assert.equal(restyle(soup, -1).kcal, 35);
  assert.equal(restyle(soup, -1).fat, 2.2);
  assert.equal(restyle(soup, 1).kcal, 79);
  assert.equal(styledName("Soup, vegetable, homemade", -1), "Soup, vegetable, homemade (lighter)");
});

test("sausages: venison and others, found by name, compared per sausage", async () => {
  const { searchFoods } = await import("../../src/app/cofid");
  assert.equal(searchFoods(FOOD_DB, "venison sausage", 1)[0].name, "Venison sausage, grilled");
  assert.equal(searchFoods(FOOD_DB, "veggie sausage", 1)[0].name, "Vegetarian sausage, grilled");
  const v = variantsFor("Pork sausage, grilled")!;
  assert.equal(v.options.length, 7);
  assert.equal(switchTo(pendingOf("Pork sausage, grilled", 0, 2), item("Venison sausage, grilled")).qty, 2);
});
