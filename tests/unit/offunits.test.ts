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
