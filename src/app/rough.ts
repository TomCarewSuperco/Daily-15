import { addDays, foodsOn, uid } from "./calc";
import type { AppState, FoodEntry, Meal, Nutrients, RoughLevel } from "./types";

/*
 * Estimates for days, or parts of days, that weren't logged, so the weekly
 * picture isn't left with gaps. Measured against the user's own typical day:
 * the average of fully logged (completed) days over the last four weeks, or
 * their calorie target until they have a few of those. Estimates, shown as such.
 */

export const ROUGH_LEVELS: { value: RoughLevel; label: string; factor: number }[] = [
  { value: "lighter", label: "Lighter than usual", factor: 0.85 },
  { value: "typical", label: "Typical", factor: 1 },
  { value: "heavier", label: "Heavier than usual", factor: 1.2 },
  { value: "blowout", label: "Blow-out", factor: 1.5 },
];

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snacks"];
const DEFAULT_SHARES: Record<Meal, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.35, snacks: 0.1 };
/** Completed days needed before the typical day comes from the user's own logging. */
export const MIN_TYPICAL_DAYS = 3;
/** Roughly a mix of beer and wine: alcohol 56 kcal a unit plus some carbohydrate. */
const KCAL_PER_UNIT = 85;

export interface TypicalDay extends Nutrients {
  /** Completed days the average is based on; 0 means the calorie target was used. */
  days: number;
  shares: Record<Meal, number>;
}

const realFoods = (state: AppState, date: string) => foodsOn(state, date).filter((f) => !f.rough);

export function typicalDay(state: AppState, before: string): TypicalDay {
  const done = new Set(state.foodDiaryDone ?? []);
  const days: string[] = [];
  for (let i = 1; i <= 28; i++) {
    const d = addDays(before, -i);
    if (done.has(d) && realFoods(state, d).length) days.push(d);
  }
  if (days.length < MIN_TYPICAL_DAYS) {
    const t = state.profile!.targets;
    // Fibre, saturates, sugars and salt aren't known from a target, so they're left out rather than guessed.
    return { kcal: t.calories, protein: t.proteinG, carbs: t.carbsG, fat: t.fatG, fibre: 0, days: 0, shares: DEFAULT_SHARES };
  }
  const sum: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  // Per limit: [amount, calories of the food that stated it].
  const extra = { satFat: [0, 0], sugars: [0, 0], salt: [0, 0] } as Record<"satFat" | "sugars" | "salt", [number, number]>;
  const byMeal: Record<Meal, number> = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
  for (const d of days) {
    for (const f of realFoods(state, d)) {
      sum.kcal += f.kcal;
      sum.protein += f.protein;
      sum.carbs += f.carbs;
      sum.fat += f.fat;
      sum.fibre += f.fibre;
      byMeal[f.meal] += f.kcal;
      for (const k of ["satFat", "sugars", "salt"] as const) if (typeof f[k] === "number") extra[k] = [extra[k][0] + (f[k] as number), extra[k][1] + f.kcal];
    }
  }
  const n = days.length;
  const total = Object.values(byMeal).reduce((a, b) => a + b, 0) || 1;
  const shares = Object.fromEntries(MEALS.map((m) => [m, byMeal[m] / total])) as Record<Meal, number>;
  const out: TypicalDay = { kcal: sum.kcal / n, protein: sum.protein / n, carbs: sum.carbs / n, fat: sum.fat / n, fibre: sum.fibre / n, days: n, shares };
  // Only carry a limit when most of the food (by calories) had it, scaled up for the rest, so gaps don't look like good news.
  for (const k of ["satFat", "sugars", "salt"] as const) {
    const share = sum.kcal ? extra[k][1] / sum.kcal : 0;
    if (share >= 0.6) out[k] = extra[k][0] / share / n;
  }
  return out;
}

/** Meals with nothing logged on the day. */
export function emptyMeals(state: AppState, date: string): Meal[] {
  const logged = new Set(realFoods(state, date).map((f) => f.meal));
  return MEALS.filter((m) => !logged.has(m));
}

export function hasRough(state: AppState, date: string): boolean {
  return foodsOn(state, date).some((f) => f.rough);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Estimated entries for a day: one per meal, sized by the user's usual share
 * of the day at that meal. 'rest' fills only the meals with nothing logged.
 */
export function roughEntries(state: AppState, date: string, level: RoughLevel, scope: "day" | "rest", drinksUnits = 0): FoodEntry[] {
  const typical = typicalDay(state, date);
  const factor = ROUGH_LEVELS.find((l) => l.value === level)!.factor;
  const meals = scope === "day" ? MEALS : emptyMeals(state, date);
  const label = ROUGH_LEVELS.find((l) => l.value === level)!.label.toLowerCase();
  const entries: FoodEntry[] = meals
    .filter((m) => typical.shares[m] > 0)
    .map((meal) => {
      const k = typical.shares[meal] * factor;
      const e: FoodEntry = {
        id: uid(),
        date,
        meal,
        name: scope === "day" ? `Estimated day: ${label}` : `Rest of day estimated: ${label}`,
        portion: "share of a typical day",
        estimated: true,
        rough: level,
        roughScope: scope,
        kcal: Math.round(typical.kcal * k),
        protein: round1(typical.protein * k),
        carbs: round1(typical.carbs * k),
        fat: round1(typical.fat * k),
        fibre: round1(typical.fibre * k),
      };
      for (const x of ["satFat", "sugars", "salt"] as const) if (typeof typical[x] === "number") e[x] = round1((typical[x] as number) * k);
      return e;
    });
  if (drinksUnits > 0) {
    entries.push({
      id: uid(),
      date,
      meal: "dinner",
      name: "Drinks (estimated)",
      portion: `${drinksUnits} ${drinksUnits === 1 ? "unit" : "units"} of alcohol`,
      estimated: true,
      rough: level,
      roughScope: scope,
      kcal: Math.round(drinksUnits * KCAL_PER_UNIT),
      protein: 0,
      carbs: round1(drinksUnits * 7),
      fat: 0,
      fibre: 0,
      sugars: round1(drinksUnits * 2),
      alcoholUnits: drinksUnits,
    });
  }
  return entries;
}
