import { REMINDER_MESSAGES } from "./data";
import type { AppState, HabitAnchor, Reminder } from "./types";

/*
 * Tying the 15 to something the user already does every day ('after my
 * morning coffee') makes it far more likely to happen (implementation
 * intentions). The reminder is set for that time and worded in their terms.
 */
export const ANCHORS: HabitAnchor[] = [
  { id: "wake", text: "as soon as I'm up", time: "07:00" },
  { id: "coffee", text: "after my morning coffee", time: "07:30" },
  { id: "school-run", text: "after the school run", time: "09:15" },
  { id: "lunch", text: "before lunch", time: "12:30" },
  { id: "home", text: "when I get home from work", time: "18:00" },
  { id: "kids-bed", text: "once the kids are in bed", time: "20:00" },
];

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** 'after my morning coffee' → 'After your morning coffee'. */
export function anchorPhrase(a: HabitAnchor): string {
  return cap(a.text.replace(/\bI'm\b/g, "you're").replace(/\bmy\b/g, "your").replace(/\bI\b/g, "you"));
}

export function reminderBody(state: AppState, r: Reminder): string {
  const a = state.profile?.anchor;
  if (r.type === "workout" && a?.text.trim()) return `${anchorPhrase(a)}: your 15 is ready.`;
  return REMINDER_MESSAGES[r.type];
}

/** Set the anchor and move the daily workout reminder to its time (switched on). */
export function withAnchor(state: AppState, anchor: HabitAnchor): AppState {
  if (!state.profile) return state;
  return {
    ...state,
    profile: { ...state.profile, anchor },
    reminders: state.reminders.map((r) => (r.type === "workout" ? { ...r, time: anchor.time, enabled: true } : r)),
  };
}
