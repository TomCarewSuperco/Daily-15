import type { AppState, FocusGoal, Goal } from "./types";

/*
 * One food choice for the day, picked straight after the daily 15: the habit
 * stack that ties the workout to eating well. Suggestions are ordered by the
 * user's focus areas, then their goal.
 */

export interface IntentionOption {
  id: string;
  text: string;
  focus?: FocusGoal[];
  goals?: Goal[];
}

export const INTENTIONS: IntentionOption[] = [
  { id: "protein", text: "Protein at every meal", focus: ["protein"], goals: ["lose-fat", "lose-weight", "build-muscle", "strength"] },
  { id: "veg", text: "Veg or salad with lunch and dinner", focus: ["fruit-veg", "fibre"] },
  { id: "sat-fat", text: "Swap one fatty meat or cheese for a leaner option", focus: ["cholesterol"] },
  { id: "sugar", text: "No sugary drinks or sweets", focus: ["sugar"], goals: ["lose-fat", "lose-weight"] },
  { id: "salt", text: "No added salt; check labels for salt", focus: ["salt"] },
  { id: "alcohol", text: "No alcohol today", focus: ["alcohol"] },
  { id: "late-snacks", text: "Nothing to eat after 8pm", goals: ["lose-fat", "lose-weight"] },
  { id: "log-all", text: "Log everything I eat today" },
  { id: "water", text: "Two litres of water" },
  { id: "home-cooked", text: "Cook at home, no takeaway" },
];

export function suggestedIntentions(state: AppState, count = 4): IntentionOption[] {
  const p = state.profile;
  const focus = new Set(p?.focus ?? []);
  const score = (o: IntentionOption) => (o.focus?.some((f) => focus.has(f)) ? 2 : 0) + (p && o.goals?.includes(p.goal) ? 1 : 0);
  return [...INTENTIONS].sort((a, b) => score(b) - score(a)).slice(0, count);
}
