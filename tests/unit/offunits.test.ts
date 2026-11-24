import { test } from "node:test";
import assert from "node:assert/strict";
import { unitsFromOff } from "../../src/app/offUnits";

test("a single small pack comes first and a serving bigger than the pack is ignored", () => {
  const u = unitsFromOff({ name: "Kings Biltons", servingG: 100, packG: 35, quantity: "35 g" });
  assert.equal(u[0].name, "pack (35 g)");
  assert.ok(!u.some((x) => x.name === "serving"));
  assert.ok(u.some((x) => x.name === "handful" && x.g === 15));
});

test("larger packs keep the label serving first and offer half and whole packs", () => {
  const u = unitsFromOff({ name: "Chicken curry", servingG: 200, packG: 400, quantity: "400 g" });
  assert.equal(u[0].name, "serving");
  assert.ok(u.some((x) => x.name.startsWith("pack (400 g)")));
});

test("beer from a listing: bottle, pint and half pint in ml, with alcohol units", async () => {
  const { drinkKind } = await import("../../src/app/components/barcode");
  assert.equal(drinkKind("Estrella Damm", ["en:beverages", "en:alcoholic-beverages", "en:beers", "en:lagers"]), "beer");
  assert.equal(drinkKind("Estrella Damm"), "beer");
  assert.equal(drinkKind("Heineken 0.0"), null);
  const u = unitsFromOff({ name: "Estrella Damm", packG: 330, quantity: "330ml", liquid: true, drink: "beer" });
  assert.deepEqual(u.map((x) => x.name), ["bottle or can (330ml)", "pint", "half pint"]);
  assert.ok(!u.some((x) => /half pack/.test(x.name)));
  const wine = unitsFromOff({ name: "Rioja", packG: 750, quantity: "75cl", liquid: true, drink: "wine" });
  assert.equal(wine[0].g, 175);
});
