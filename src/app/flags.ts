import type { FocusGoal, FoodEntry } from "./types";

/*
 * 'High in' tags for the diary, using the UK front-of-pack traffic-light
 * thresholds (Department of Health and Food Standards Agency guidance):
 * per 100 g of food, or per 100 ml of drink, or per portion when the food is
 * logged by the serving (more than 30% of the reference intake). Figures are
 * from general knowledge of that guidance and should be checked against it.
 * Only nutrients in the user's focus areas are tagged, so the diary doesn't nag.
 */

export type HighNutrient = "satFat" | "sugars" | "salt";

const PER_100G: Record<HighNutrient, number> = { satFat: 5, sugars: 22.5, salt: 1.5 };
const PER_100ML: Record<HighNutrient, number> = { satFat: 2.5, sugars: 11.25, salt: 0.75 };
/** 30% of the adult reference intakes: saturates 20 g, sugars 90 g, salt 6 g. */
const PER_PORTION: Record<HighNutrient, number> = { satFat: 6, sugars: 27, salt: 1.8 };

export const HIGH_LABEL: Record<HighNutrient, string> = { satFat: "high sat fat", sugars: "high sugar", salt: "high salt" };

const FOCUS_NUTRIENT: Partial<Record<FocusGoal, HighNutrient>> = { cholesterol: "satFat", sugar: "sugars", salt: "salt" };

export function highIn(entry: FoodEntry, focus: FocusGoal[] = []): HighNutrient[] {
  const wanted = focus.map((f) => FOCUS_NUTRIENT[f]).filter((n): n is HighNutrient => !!n);
  if (!wanted.length || entry.rough) return [];
  const src = entry.source;
  return wanted.filter((n) => {
    if (src && src.baseUnit !== "serving" && src.per === 100) {
      const v = src.base[n];
      return typeof v === "number" && v > (src.baseUnit === "ml" ? PER_100ML : PER_100G)[n];
    }
    const v = entry[n];
    return typeof v === "number" && v > PER_PORTION[n];
  });
}
