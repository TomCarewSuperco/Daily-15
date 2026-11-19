import type { FoodItem, FoodUnit } from "./foods";
import { FOOD_DB } from "./foods";
import type { FiveADayKind } from "./types";

/*
 * Full CoFID 2021 list (about 2,650 foods), loaded on first search so it
 * doesn't slow the app's start. Built by scripts/build-cofid.py.
 */

export const COFID_CREDIT = "UK food data from McCance and Widdowson's The Composition of Foods Integrated Dataset 2021, Public Health England. © Crown copyright.";

type Row = [string, string, string, number, number | null, number | null, number | null, number | null, number | null, number | null, number | null, FiveADayKind | null, number | null, "g" | "ml"];

const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

function unitsFor(name: string, unit: "g" | "ml", fiveADay: FiveADayKind | null): FoodUnit[] {
  const n = name.toLowerCase();
  if (unit === "ml") {
    if (/^(beer|lager|cider|stout|ale)/.test(n)) return [u("pint", 568), u("bottle", 330)];
    if (/^wine/.test(n)) return [u("medium glass", 175), u("large glass", 250)];
    if (/^spirits|^gin|^vodka|^whisky|^rum|^brandy/.test(n)) return [u("single", 25), u("double", 50)];
    return [u("glass", 175)];
  }
  if (fiveADay === "juice") return [u("glass", 150)];
  if (fiveADay === "fv" || fiveADay === "pulses") return [u("portion", 80)];
  return [];
}

let cache: Promise<FoodItem[]> | null = null;

export function loadCofid(): Promise<FoodItem[]> {
  cache ??= import("./data/cofid.json").then((m) => {
    const used = new Set(FOOD_DB.map((f) => f.cofid).filter(Boolean));
    return (m.default.foods as Row[])
      .filter((r) => !used.has(r[0]))
      .map(([code, name, , kcal, protein, carbs, fat, fibre, satFat, sugars, salt, fiveADay, abv, unit]) => ({
        name,
        per: 100,
        unit,
        units: unitsFor(name, unit, fiveADay),
        typical: 100,
        kcal,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        fibre: fibre ?? 0,
        ...(satFat !== null ? { satFat } : {}),
        ...(sugars !== null ? { sugars } : {}),
        ...(salt !== null ? { salt } : {}),
        ...(fiveADay ? { fiveADay } : {}),
        ...(abv ? { abv } : {}),
        cofid: code,
      }));
  });
  return cache;
}

/** Everyday words that the food names don't use. */
const SYNONYMS: Record<string, string[]> = {
  ale: ["bitter", "beer"],
  pint: ["beer", "lager"],
  fizzy: ["cola", "carbonated"],
  pop: ["cola", "carbonated"],
  soda: ["cola", "carbonated"],
  yoghurt: ["yogurt"],
  yogurt: ["yoghurt"],
  cuppa: ["tea"],
  brew: ["tea"],
  sarnie: ["sandwich"],
  butty: ["sandwich"],
  spuds: ["potatoes"],
  tatties: ["potatoes"],
  chips: ["chips", "fries"],
  fries: ["chips"],
  aubergine: ["aubergine", "eggplant"],
  courgette: ["courgette", "zucchini"],
  prawn: ["prawns", "shrimp"],
};

const stems = (w: string) => [w, w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w, w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w];
const forms = (w: string) => [...stems(w), ...(SYNONYMS[w] ?? [])];

/** Matches the start of a word in the name, so 'ale' doesn't find 'Wensleydale'. */
const wordsOf = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const hit = (nameWords: string[], w: string) => forms(w).some((x) => nameWords.some((nw) => nw.startsWith(x)));

/** True if every query word, its singular or a common synonym starts a word in the name. */
export function matchesAll(name: string, query: string): boolean {
  const nw = wordsOf(name);
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hit(nw, w));
}

/**
 * Every query word (or its singular or a synonym) must appear. Plain, short
 * names rank first. If nothing matches every word, falls back to foods that
 * match most of them.
 */
export function searchFoods(foods: FoodItem[], query: string, limit = 15): FoodItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const strict = rank(foods, words, words.length);
  if (strict.length || words.length === 1) return strict.slice(0, limit);
  return rank(foods, words, Math.ceil(words.length / 2)).slice(0, limit);
}

function rank(foods: FoodItem[], words: string[], need: number): FoodItem[] {
  const scored: { f: FoodItem; score: number }[] = [];
  for (const f of foods) {
    const name = f.name.toLowerCase();
    const nw = wordsOf(name);
    const hits = words.filter((w) => hit(nw, w)).length;
    if (hits < need) continue;
    const first = name.split(/[,\s]/)[0];
    const segment = name.split(",")[0].trim();
    let score = hits * 20;
    if (forms(words[0]).some((x) => first.startsWith(x))) score += 10;
    // 'Eggs, chicken, boiled' before 'Egg fu yung': the first part is just the food.
    if (segment.split(/\s+/).length === 1) score += 4;
    score -= (name.match(/,/g)?.length ?? 0) * 1.5;
    score -= name.length / 25;
    if (/\b(raw|dried|powder|weighed)\b/.test(name)) score -= 2;
    if (/\b(homemade|takeaway|retail)\b/.test(name)) score -= 0.5;
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.f);
}
