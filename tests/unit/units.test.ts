import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLength, formatLengthChange, fromCm, toCm } from "../../src/app/units";

test("inches convert both ways and round sensibly", () => {
  assert.equal(toCm(37.5, "in"), 95.3);
  assert.equal(fromCm(95.3, "in"), 37.5);
  assert.equal(fromCm(101.2, "in"), 39.75);
  assert.equal(formatLength(95, "cm"), "95 cm");
  assert.equal(formatLength(95, "in"), "37.5 in");
  assert.equal(formatLengthChange(-2.5, "in"), "−1 in");
  assert.equal(formatLengthChange(1.2, "cm"), "+1.2 cm");
});
