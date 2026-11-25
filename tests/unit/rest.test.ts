import { test } from "node:test";
import assert from "node:assert/strict";
import { restAllowed, restDaysThisWeek } from "../../src/app/rest";

test("two rest days a week pause the streak; days off ill don't count", () => {
  const s = { restDays: ["2026-11-20", "2026-11-22", "2026-11-23"], sickDays: ["2026-11-23"] };
  assert.equal(restDaysThisWeek(s, "2026-11-25"), 2);
  assert.equal(restAllowed(s, "2026-11-25", "tired"), false);
  assert.equal(restAllowed(s, "2026-11-25", "unwell"), true);
  assert.equal(restAllowed(s, "2026-11-28", null), true, "the oldest rest day has dropped out of the week");
});
