import { test } from "node:test";
import assert from "node:assert/strict";
import { bodyFat } from "../../src/app/bodyfat";
import type { Profile } from "../../src/app/types";

const profile = (over: Partial<Profile> = {}): Profile => ({ name: "", age: 45, sex: "male", heightCm: 178, startWeightKg: 88, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 }, ...over });

test("5 ft 10, 87.5 kg, 95 cm waist: about 27%, about 7 kg to lose", () => {
  const e = bodyFat(profile(), 95, 87.5)!;
  assert.equal(e.pct, 27);
  assert.equal(e.fatKg, 23);
  assert.deepEqual(e.range, [11, 21]);
  assert.equal(e.toLoseKg, 7);
  assert.equal(e.targetWeightKg, 80);
  assert.equal(e.targetWaistCm, 81);
  assert.equal(e.weeks, 14);
});

test("already in range: nothing to lose; women use their own formula and range", () => {
  assert.equal(bodyFat(profile(), 80, 75)!.toLoseKg, 0);
  const f = bodyFat(profile({ sex: "female", heightCm: 165, age: 35 }), 80, 70)!;
  assert.equal(f.pct, 35);
  assert.deepEqual(f.range, [21, 32]);
  assert.ok(f.toLoseKg > 0);
  assert.equal(bodyFat(profile({ age: 16 }), 80, 70), null);
});
