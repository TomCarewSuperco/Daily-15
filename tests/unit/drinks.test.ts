import { test } from "node:test";
import assert from "node:assert/strict";
import { MIXERS, parseSpirit, spiritDrink, spiritName, withShots } from "../../src/app/drinks";

const mixer = (label: string) => MIXERS.findIndex((m) => m.label === label);

test("names parse into spirit, measure and mixer", () => {
  assert.deepEqual(parseSpirit("Gin and tonic, double"), { spirit: "Gin", measure: 2, mixer: mixer("Tonic"), hasMixer: true });
  assert.deepEqual(parseSpirit("Vodka and diet cola"), { spirit: "Vodka", measure: 0, mixer: mixer("Diet cola"), hasMixer: true });
  assert.deepEqual(parseSpirit("Whisky"), { spirit: "Whisky", measure: 0, mixer: null, hasMixer: false });
  assert.equal(parseSpirit("Gin and slimline tonic")?.mixer, mixer("Slimline tonic"));
  assert.equal(parseSpirit("Ginger beer"), null);
  assert.equal(parseSpirit("Mojito"), null);
});

test("a double gin and slimline tonic: about 113 kcal and 2 units", () => {
  const c = { spirit: "Gin" as const, measure: 2, mixer: mixer("Slimline tonic"), mixerAmount: 1 };
  const d = spiritDrink(c);
  assert.equal(spiritName(c), "Gin and slimline tonic, double");
  assert.equal(d.ml, 200);
  assert.equal(d.n.kcal, 113);
  assert.equal(Math.round(((d.ml * d.abv) / 1000) * 10) / 10, 2);
  // Full-sugar tonic adds about 33 kcal.
  assert.equal(spiritDrink({ ...c, mixer: mixer("Tonic") }).n.kcal, 144);
  // Neat single: 25 ml, 56 kcal, 1 unit.
  const neat = spiritDrink({ spirit: "Whisky", measure: 0, mixer: null, mixerAmount: 1 });
  assert.equal(neat.ml, 25);
  assert.equal(neat.n.kcal, 56);
  assert.equal(spiritName({ spirit: "Whisky", measure: 0, mixer: null, mixerAmount: 1 }), "Whisky");
});

test("an extra shot adds 25 ml of spirit: 56 kcal and a unit", () => {
  const r = withShots({ kcal: 197, protein: 0, carbs: 13.5, fat: 0, fibre: 0 }, 110, 24, 1);
  assert.equal(r.ml, 135);
  assert.equal(r.n.kcal, 253);
  const units = (ml: number, abv: number) => (ml * abv) / 1000;
  assert.ok(Math.abs(units(r.ml, r.abv) - units(110, 24) - 1) < 0.02);
});
