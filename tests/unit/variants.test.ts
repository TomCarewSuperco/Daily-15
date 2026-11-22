import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOD_DB } from "../../src/app/foods";
import { amountOf, switchTo, variantsFor } from "../../src/app/variants";

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
