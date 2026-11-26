import { test } from "node:test";
import assert from "node:assert/strict";
import { activityOn, savedByTraining, totalMatches } from "../../src/app/activity";
import { emptyStateForTests as empty } from "./fixtures";

test("activity adds the daily 15, strength, cardio and walking, matching active minutes", () => {
  const s = empty();
  s.routineLogs["2026-11-23"] = { date: "2026-11-23", mode: "standard", completedIds: [], finished: true, seconds: 900 };
  s.workouts.push({ id: "a", date: "2026-11-23", category: "Swimming", name: "Swim", durationMin: 30, intensity: "light", exercises: [] });
  s.workouts.push({ id: "b", date: "2026-11-23", category: "Weight training", name: "Gym", durationMin: 25, intensity: "moderate", exercises: [] });
  s.activity["2026-11-23"] = { date: "2026-11-23", steps: 1500, distanceKm: 1, activeMinutes: 0, activityKcal: 0 };
  const d = activityOn(s, "2026-11-23");
  assert.deepEqual([d.daily15, d.strength, d.cardio, d.walking, d.total], [15, 25, 30, 0, 70]);
  assert.ok(totalMatches(s, "2026-11-23"));
  assert.equal(savedByTraining([d], 7500, 30), 1, "low steps, but training met the target");
});
