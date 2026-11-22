import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, todayKey } from "../../src/app/calc";
import { evidence, evidenceHeadline } from "../../src/app/evidence";
import { suggestedIntentions } from "../../src/app/intentions";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState } from "../../src/app/types";

const END = addDays(todayKey(), -1);
const day = (n: number) => addDays(END, -n);

function make(onKcal: number, offKcal: number, offLogged = 28): AppState {
  const s: AppState = { ...empty(), profile: { focus: [], goal: "lose-fat", targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 65, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } as unknown as AppState["profile"] };
  for (let n = 0; n < 56; n++) {
    const on = n % 2 === 0;
    if (on) s.routineLogs[day(n)] = { date: day(n), mode: "standard", completedIds: [], finished: true };
    if (on || n / 2 < offLogged) s.foods.push({ id: `f${n}`, date: day(n), meal: "lunch", name: "x", portion: "1", kcal: on ? onKcal : offKcal, protein: on ? 150 : 100, carbs: 0, fat: 0, fibre: 0, estimated: false });
  }
  return s;
}

test("compares 15 days with other days and says what the data shows", () => {
  const e = evidence(make(1900, 2300));
  assert.equal(e.ready, true);
  assert.equal(Math.round(e.on.avgKcal!), 1900);
  assert.equal(e.on.proteinHitShare, 1);
  assert.equal(e.off.proteinHitShare, 0);
  assert.match(evidenceHeadline(e), /400 kcal less/);
});

test("no real difference is reported honestly; too little data asks for more", () => {
  assert.match(evidenceHeadline(evidence(make(2000, 2050))), /about the same/);
  const thin = evidence({ ...make(1900, 2300), foods: [] });
  assert.equal(thin.ready, false);
  assert.match(evidenceHeadline(thin), /Keep logging/);
});

test("food choice suggestions put the user's focus areas first", () => {
  const s = { ...empty(), profile: { focus: ["alcohol"], goal: "maintain" } } as unknown as AppState;
  assert.equal(suggestedIntentions(s)[0].id, "alcohol");
});
