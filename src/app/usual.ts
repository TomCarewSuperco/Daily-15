import { addDays, sumNutrients } from "./calc";
import type { AppState, FoodEntry, Meal, Nutrients } from "./types";

/*
 * A usual meal: the foods logged at this meal on most days it was logged
 * over the last four weeks. Offered on an empty meal for one-tap logging.
 */

export type Item = Omit<FoodEntry, "id" | "date" | "meal">;

const WINDOW = 28;

export function usualFor(state: AppState, meal: Meal, date: string): { items: Item[]; total: Nutrients; days: number } | null {
  const from = addDays(date, -WINDOW);
  const recent = state.foods.filter((f) => f.meal === meal && !f.rough && f.date < date && f.date >= from);
  const days = new Map<string, FoodEntry[]>();
  for (const f of recent) days.set(f.date, [...(days.get(f.date) ?? []), f]);
  if (days.size < 2) return null;
  // Each food's days, and its most recent entry for the portion.
  const seen = new Map<string, { days: Set<string>; last: FoodEntry }>();
  for (const f of recent) {
    const k = f.name.toLowerCase();
    const s = seen.get(k) ?? { days: new Set<string>(), last: f };
    s.days.add(f.date);
    if (f.date >= s.last.date) s.last = f;
    seen.set(k, s);
  }
  const core = [...seen.values()].filter((s) => s.days.size >= 2 && s.days.size * 2 >= days.size);
  if (!core.length) return null;
  // Keep the order they were logged in.
  const order = recent.map((f) => f.name.toLowerCase());
  core.sort((a, b) => order.indexOf(a.last.name.toLowerCase()) - order.indexOf(b.last.name.toLowerCase()));
  const items = core.map(({ last }) => strip(last));
  const daysWithAll = [...days.values()].filter((d) => core.every((c) => d.some((f) => f.name === c.last.name))).length;
  return { items, total: sumNutrients(items), days: daysWithAll };
}

export function strip(f: FoodEntry): Item {
  const { id: _i, date: _d, meal: _m, ...rest } = f;
  return rest;
}

/** 'Egg, Greek-style yoghurt and Korean Style Kimichi'. */
export function listNames(items: { name: string }[]): string {
  const names = items.map((i) => i.name.split(",")[0]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
}
