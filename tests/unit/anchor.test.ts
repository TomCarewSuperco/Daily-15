import { test } from "node:test";
import assert from "node:assert/strict";
import { ANCHORS, anchorPhrase, reminderBody, withAnchor } from "../../src/app/anchor";
import { DEFAULT_REMINDERS } from "../../src/app/data";
import { emptyStateForTests as empty } from "./fixtures";
import type { AppState } from "../../src/app/types";

test("anchor phrases speak to the user", () => {
  assert.equal(anchorPhrase(ANCHORS.find((a) => a.id === "coffee")!), "After your morning coffee");
  assert.equal(anchorPhrase(ANCHORS.find((a) => a.id === "wake")!), "As soon as you're up");
});

test("choosing an anchor moves and switches on the workout reminder, worded in the user's terms", () => {
  const s = { ...empty(), reminders: DEFAULT_REMINDERS.map((r) => ({ ...r, enabled: false })), profile: { name: "", targets: {} } } as unknown as AppState;
  const home = ANCHORS.find((a) => a.id === "home")!;
  const next = withAnchor(s, home);
  const w = next.reminders.find((r) => r.type === "workout")!;
  assert.equal(w.time, "18:00");
  assert.equal(w.enabled, true);
  assert.equal(reminderBody(next, w), "When you get home from work: your 15 is ready.");
  assert.equal(reminderBody(next, next.reminders.find((r) => r.type === "food")!), "Take a minute to log today's food.");
});
