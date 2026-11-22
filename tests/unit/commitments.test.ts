import { test } from "node:test";
import assert from "node:assert/strict";
import { activeCommitments, addCommitment, finishedCommitments, toggleTick } from "../../src/app/commitments";
import { addDays } from "../../src/app/calc";
import { emptyStateForTests as empty } from "./fixtures";

const D = "2026-11-22";

test("up to two commitments run for seven days and can be ticked daily", () => {
  let s = addCommitment(empty(), "Add a portion of veg at lunch", "veg", D);
  s = addCommitment(s, "Protein at breakfast", "protein", D);
  s = addCommitment(s, "A third", "x", D);
  assert.equal(activeCommitments(s, D).length, 2);
  const id = activeCommitments(s, D)[0].id;
  s = toggleTick(s, id, D);
  s = toggleTick(s, id, addDays(D, 1));
  assert.deepEqual(activeCommitments(s, addDays(D, 1))[0].ticks, [D, addDays(D, 1)]);
  s = toggleTick(s, id, D);
  assert.deepEqual(activeCommitments(s, addDays(D, 1))[0].ticks, [addDays(D, 1)]);
  assert.equal(activeCommitments(s, addDays(D, 7)).length, 0);
  assert.equal(finishedCommitments(s, addDays(D, 7)).length, 2);
});
