import type { FoodItem, FoodUnit } from "./foods";
import { FOOD_DB } from "./foods";
import type { FiveADayKind } from "./types";

/*
 * Full CoFID 2021 list (about 2,650 foods), loaded on first search so it
 * doesn't slow the app's start. Built by scripts/build-cofid.py.
 */

export const COFID_CREDIT = "UK food data from McCance and Widdowson's The Composition of Foods Integrated Dataset 2021, Public Health England. © Crown copyright.";

export type Row = [string, string, string, number, number | null, number | null, number | null, number | null, number | null, number | null, number | null, FiveADayKind | null, number | null, "g" | "ml"];

const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

/*
 * Typical portions so people don't have to weigh. Weights are typical UK
 * amounts from general knowledge and are estimates.
 */
const MEAL: FoodUnit[] = [u("regular portion", 350), u("small portion", 250), u("restaurant or takeaway portion", 450)];

function unitsFor(name: string, unit: "g" | "ml", fiveADay: FiveADayKind | null, group = ""): FoodUnit[] {
  const n = name.toLowerCase();
  if (unit === "g") {
    if (/^soup|, soup|\bsoup\b/.test(n)) return [u("bowl", 300), u("cup", 200)];
    if (/^sandwich/.test(n)) return [u("sandwich", 180)];
    if (/naan/.test(n)) return [u("naan", 160), u("half naan", 80, "half naans")];
    if (/pitta/.test(n)) return [u("pitta", 60)];
    if (/^pizza/.test(n) && !/base/.test(n)) return [u("slice", 80), u("whole pizza", 400, "whole pizzas")];
    if (/samosa/.test(n)) return [u("samosa", 50)];
    if (/pasty|pasties/.test(n)) return [u("pasty", 230)];
    if (/^pie,|, pie\b|pies?,/.test(n) && !/fruit|pastry, raw/.test(n)) return [u("individual pie", 200), u("portion", 250)];
    if (/spring roll/.test(n)) return [u("spring roll", 60)];
    if (/prawn crackers/.test(n)) return [u("bowl", 30)];
    if (/^rice/.test(n) && !/raw|flour/.test(n)) return [u("portion", 180), u("takeaway portion", 300)];
    if (/^(pasta|noodles)/.test(n) && /boiled|cooked/.test(n)) return [u("portion", 180), u("large portion", 250)];
    if (/chips|fries|wedges/.test(n) && group.startsWith("DAP")) return [u("portion", 150), u("takeaway portion", 250)];
    if (/in batter|in breadcrumbs|coated/.test(n) && group.startsWith("J")) return [u("fillet", 140), u("takeaway portion", 220)];
    if (/^(curry|chilli|lasagne|risotto|stew|casserole|chow mein|biryani|moussaka|paella|hotpot|goulash|spaghetti|pasta with|macaroni|shepherd|pie, cottage|enchiladas)/.test(n) || /korma|tikka|masala|balti|madras|bhuna|jalfrezi|sweet and sour/.test(n)) return MEAL;
    if (group.startsWith("MR") || group.startsWith("JR") || group.startsWith("DR")) return MEAL;
    if (/^sausages?/.test(n)) return [u("sausage", 45)];
    if (/^burger/.test(n)) return [u("burger", 100)];
    if (/^bread rolls|^rolls/.test(n)) return [u("roll", 60)];
    if (/^bread/.test(n)) return [u("slice", 40)];
    if (group.startsWith("AI") || /^breakfast cereal/.test(n)) return [u("bowl", 40)];
    if (group.startsWith("AM") || /^biscuits/.test(n)) return [u("biscuit", 15)];
    if (group.startsWith("AN") || /^cake|gateau|cheesecake|brownie/.test(n)) return [u("slice", 70), u("restaurant slice", 120)];
    if (group.startsWith("AS") || /crumble|pudding|pie, fruit|tart/.test(n)) return [u("portion", 150)];
    if (/^cheese/.test(n)) return [u("portion", 30)];
    if (/^yogurt|^yoghurt/.test(n)) return [u("pot", 125)];
    if (/^ice cream/.test(n)) return [u("scoop", 60)];
    if (/^sauce|gravy|ketchup|mayonnaise|dressing/.test(n)) return [u("tablespoon", 15)];
    if (group.startsWith("M") && !/raw/.test(n)) return [u("portion", 120)];
    if (group.startsWith("J") && !/raw/.test(n)) return [u("fillet or portion", 130)];
  }
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

let rowsCache: Promise<Map<string, Row>> | null = null;

/** Every CoFID food by code, including those used in the everyday list. */
export function loadCofidByCode(): Promise<Map<string, Row>> {
  rowsCache ??= import("./data/cofid.json").then((m) => new Map((m.default.foods as Row[]).map((r) => [r[0], r])));
  return rowsCache;
}

/** Sums CoFID foods at given weights into one set of nutrients. Unknown extras are left out. */
export function sumComponents(rows: Map<string, Row>, parts: [string, number][], factor = 1) {
  const out = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, satFat: 0, sugars: 0, salt: 0, fiveADay: 0, grams: 0, missing: [] as string[] };
  for (const [code, grams] of parts) {
    const r = rows.get(code);
    if (!r) {
      out.missing.push(code);
      continue;
    }
    const g = grams * factor;
    const k = g / 100;
    out.grams += g;
    out.kcal += r[3] * k;
    out.protein += (r[4] ?? 0) * k;
    out.carbs += (r[5] ?? 0) * k;
    out.fat += (r[6] ?? 0) * k;
    out.fibre += (r[7] ?? 0) * k;
    out.satFat += (r[8] ?? 0) * k;
    out.sugars += (r[9] ?? 0) * k;
    out.salt += (r[10] ?? 0) * k;
    if (r[11] === "fv" || r[11] === "pulses") out.fiveADay += g / 80;
  }
  return out;
}

let cache: Promise<FoodItem[]> | null = null;

export function loadCofid(): Promise<FoodItem[]> {
  cache ??= import("./data/cofid.json").then((m) => {
    const used = new Set(FOOD_DB.map((f) => f.cofid).filter(Boolean));
    return (m.default.foods as Row[])
      .filter((r) => !used.has(r[0]))
      .map(([code, name, group, kcal, protein, carbs, fat, fibre, satFat, sugars, salt, fiveADay, abv, unit]) => ({
        name,
        per: 100,
        unit,
        units: unitsFor(name, unit, fiveADay, group),
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
  alcohol: ["beer", "lager", "cider", "stout", "wine", "prosecco", "gin", "vodka", "whisky", "rum", "brandy", "spirits", "port", "sherry", "liqueur"],
  booze: ["beer", "lager", "wine", "spirits"],
  drink: ["drink", "beer", "lager", "cider", "wine", "cola"],
  whiskey: ["whisky"],
  scotch: ["whisky"],
  bourbon: ["whisky"],
  tequila: ["spirits"],
  champagne: ["sparkling", "prosecco"],
  cava: ["sparkling", "prosecco"],
  fizz: ["sparkling", "prosecco"],
  bubbly: ["sparkling", "prosecco"],
  "g&t": ["gin", "tonic"],
  guinness: ["stout", "guinness"],
  bitter: ["bitter"],
};

const stems = (w: string) => [w, w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w, w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w];
const forms = (w: string) => [...stems(w), ...(SYNONYMS[w] ?? [])];

/** Matches the start of a word in the name, so 'ale' doesn't find 'Wensleydale'. */
const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const wordsOf = (name: string) => fold(name).split(/[^a-z0-9&]+/).filter(Boolean);
const hit = (nameWords: string[], w: string) => forms(w).some((x) => nameWords.some((nw) => nw.startsWith(x)));

/** True if every query word, its singular or a common synonym starts a word in the name. */
export function matchesAll(name: string, query: string): boolean {
  const nw = wordsOf(name);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hit(nw, w));
}

/**
 * Every query word (or its singular or a synonym) must appear. Plain, short
 * names rank first. If nothing matches every word, falls back to foods that
 * match most of them.
 */
export function searchFoods(foods: FoodItem[], query: string, limit = 15): FoodItem[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const strict = rank(foods, words, words.length);
  if (strict.length || words.length === 1) return strict.slice(0, limit);
  return rank(foods, words, Math.ceil(words.length / 2)).slice(0, limit);
}

function rank(foods: FoodItem[], words: string[], need: number): FoodItem[] {
  const scored: { f: FoodItem; score: number }[] = [];
  for (const f of foods) {
    const name = fold(f.name);
    const nw = wordsOf(name);
    const hits = words.filter((w) => hit(nw, w)).length;
    if (hits < need) continue;
    const first = nw[0] ?? "";
    const segment = name.split(",")[0].trim();
    let score = hits * 20;
    // Whole-word matches beat prefixes: 'rose' finds rosé wine before rosemary.
    score += words.filter((w) => forms(w).some((x) => nw.includes(x) || nw.includes(`${x}s`) || nw.includes(`${x}es`))).length * 6;
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
