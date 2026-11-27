import { test } from "node:test";
import assert from "node:assert/strict";
import { batchOf, BUILDS, buildFor, INGREDIENTS, partsOf, piecesFrom, toCustomFood } from "../../src/app/homemade";

const balls = BUILDS.find((b) => b.key === "protein-balls")!;

test("searches find the right build", () => {
  assert.equal(buildFor("protein balls")?.key, "protein-balls");
  assert.equal(buildFor("Protein ball")?.key, "protein-balls");
  assert.equal(buildFor("protein b")?.key, "protein-balls");
  assert.equal(buildFor("bliss balls")?.key, "energy-balls");
  assert.equal(buildFor("flapjacks")?.key, "flapjack");
  assert.equal(buildFor("protein"), undefined);
  assert.equal(buildFor("protein yoghurt"), undefined);
  assert.equal(buildFor("pro"), undefined);
});

test("every offered ingredient exists", () => {
  for (const b of BUILDS) for (const [k] of b.usual) assert.ok(INGREDIENTS[k], `${b.key}: ${k}`);
});

test("batch weight and per-100 g values", () => {
  // 1 mug oats (100 g) + 1 scoop whey (30 g).
  const { grams, per100 } = batchOf(partsOf({ oats: 1, whey: 1, honey: 0 }));
  assert.equal(grams, 130);
  assert.equal(per100.kcal, Math.round(((381 + 0.3 * 380) / 130) * 100));
  assert.equal(per100.protein, Math.round(((10.9 + 0.3 * 75) / 130) * 1000) / 10);
});

test("the usual protein ball is in a sensible range", () => {
  const amounts = Object.fromEntries(balls.usual.filter(([, q]) => q > 0));
  const { grams, per100 } = batchOf(partsOf(amounts));
  const each = (per100.kcal * 30) / 100;
  assert.ok(each > 100 && each < 160, `${each} kcal`);
  assert.equal(piecesFrom(grams, 30), Math.round(grams / 30));
  assert.equal(piecesFrom(10, 40), 1);
});

test("saves per 100 g with a ball unit", () => {
  const f = toCustomFood(balls, "My balls", { kcal: 400, protein: 20, carbs: 40, fat: 15, fibre: 5 }, 40, "x");
  assert.deepEqual(f.units, [{ name: "ball", plural: "balls", g: 40 }]);
  assert.equal(f.per, 100);
  assert.equal(f.unit, "g");
});

test("broth bowl: the chosen broth at the bowl size, leftovers count half the broth and most of the oil", async () => {
  const { bowlParts, LEFT_SOME } = await import("../../src/app/homemade");
  const bowl = BUILDS.find((b) => b.key === "broth")!;
  assert.equal(buildFor("chicken broth")?.key, "broth");
  assert.equal(buildFor("ramen")?.key, "broth");
  const amounts = { brothFat: 1, brothSkimmed: 0, chicken: 1, sesameOil: 2 };
  const all = batchOf(bowlParts(bowl, amounts, 350, false));
  // 350 ml broth + 40 g chicken + 10 g oil.
  assert.equal(all.grams, 400);
  const kcal = (b: { grams: number; per100: { kcal: number } }) => Math.round((b.per100.kcal * b.grams) / 100);
  assert.ok(Math.abs(kcal(all) - Math.round(140 + 61.2 + 89.8)) <= 2, `${kcal(all)}`);
  const left = batchOf(bowlParts(bowl, amounts, 350, true));
  assert.ok(Math.abs(kcal(left) - Math.round(140 * LEFT_SOME.broth + 61.2 + 89.8 * LEFT_SOME.oil)) <= 2, `${kcal(left)}`);
  // With no broth ticked, the first is assumed.
  assert.equal(bowlParts(bowl, { chicken: 1 }, 250, false)[0].label, "Homemade, fat skimmed");
});
