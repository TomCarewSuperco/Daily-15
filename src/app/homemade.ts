import type { CustomFood, Nutrients } from "./types";

/*
 * Homemade builds: protein balls, energy balls and flapjack. Tick what went in,
 * count spoons and scoops, choose a piece size. The batch is saved as one of
 * 'My foods', measured per ball or per piece.
 *
 * Nutrients per 100 g are CoFID 2021 where it has the food, label averages
 * otherwise (whey, chia, almond butter, maple syrup).
 */

type Per100 = [kcal: number, protein: number, carbs: number, fat: number, fibre: number, satFat: number, sugars: number, salt: number];

export interface Ingredient {
  key: string;
  label: string;
  unit: string;
  plural: string;
  /** Grams in one unit. */
  g: number;
  /** Stepper increment. */
  step: number;
  n: Per100;
}

const I = (key: string, label: string, unit: string, plural: string, g: number, n: Per100, step = 1): Ingredient => ({ key, label, unit, plural, g, step, n });

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries(
  [
    I("oats", "Porridge oats", "mug", "mugs", 100, [381, 10.9, 70.7, 8.1, 7.8, 1.3, 0.3, 0], 0.5),
    I("whey", "Protein powder", "scoop", "scoops", 30, [380, 75, 8, 6, 0, 3, 6, 0.4]),
    I("peanut", "Peanut butter", "tablespoon", "tablespoons", 16, [607, 22.8, 13.1, 51.8, 6.6, 12.8, 6.7, 0.88]),
    I("almondButter", "Almond butter", "tablespoon", "tablespoons", 15, [620, 24, 6, 55, 8, 4.5, 4, 0.01]),
    I("honey", "Honey", "tablespoon", "tablespoons", 20, [288, 0.4, 76.4, 0, 0, 0, 76.4, 0.03]),
    I("maple", "Maple syrup", "tablespoon", "tablespoons", 20, [260, 0, 67, 0, 0, 0, 60, 0.02]),
    I("dates", "Medjool dates", "date", "dates", 22, [235, 2.4, 58.7, 0.6, 7.5, 0.3, 58, 0.03]),
    I("nuts", "Almonds or cashews", "handful", "handfuls", 30, [554, 21.2, 5.3, 49.9, 12.5, 3.8, 4.5, 0], 0.5),
    I("cocoa", "Cocoa powder", "tablespoon", "tablespoons", 6, [312, 18.5, 11.5, 21.7, 12.1, 12.8, 0, 0.05]),
    I("coconut", "Desiccated coconut", "tablespoon", "tablespoons", 6, [604, 5.6, 6.4, 62, 13.7, 53.4, 6.4, 0.07]),
    I("chia", "Chia seeds", "tablespoon", "tablespoons", 12, [486, 17, 8, 31, 34, 3.3, 0, 0.04]),
    I("choc", "Dark chocolate chips", "tablespoon", "tablespoons", 15, [510, 5, 63.5, 28, 2.5, 16.8, 62.6, 0.01]),
    I("raisins", "Raisins", "handful", "handfuls", 30, [256, 3, 62.6, 1, 2.7, 0.1, 62.6, 0.04], 0.5),
    I("milk", "Milk", "tablespoon", "tablespoons", 15, [46, 3.5, 4.7, 1.7, 0, 1.1, 4.7, 0.1]),
    I("butter", "Butter", "quarter block", "quarter blocks", 62.5, [744, 0.6, 0.6, 82.2, 0, 52.1, 0.6, 1.82], 0.5),
    I("syrup", "Golden syrup", "tablespoon", "tablespoons", 20, [298, 0.3, 79, 0, 0, 0, 79, 0.68]),
    I("sugar", "Brown sugar", "tablespoon", "tablespoons", 12, [380, 0.1, 101.3, 0, 0, 0, 101.3, 0.08]),
  ].map((i) => [i.key, i]),
);

export interface PieceSize {
  label: string;
  hint: string;
  g: number;
}

export interface Build {
  key: string;
  title: string;
  /** Saved as this name in My foods. */
  name: string;
  piece: string;
  pieces: string;
  match: RegExp;
  sizes: PieceSize[];
  /** Index into sizes. */
  size: number;
  /** Ingredients offered, with the usual amount. 0 means offered but not ticked. */
  usual: [key: string, qty: number][];
}

const BALLS: PieceSize[] = [
  { label: "Small", hint: "bite size, about 20 g", g: 20 },
  { label: "Medium", hint: "walnut size, about 30 g", g: 30 },
  { label: "Large", hint: "golf ball, about 40 g", g: 40 },
];

export const BUILDS: Build[] = [
  {
    key: "protein-balls",
    title: "Protein balls",
    name: "Protein balls, homemade",
    piece: "ball",
    pieces: "balls",
    match: /\bprotein (balls?|bites?|bombs?)\b/,
    sizes: BALLS,
    size: 1,
    usual: [["oats", 1], ["whey", 2], ["peanut", 4], ["honey", 3], ["almondButter", 0], ["maple", 0], ["dates", 0], ["cocoa", 0], ["coconut", 0], ["chia", 0], ["choc", 0], ["milk", 0]],
  },
  {
    key: "energy-balls",
    title: "Energy balls",
    name: "Energy balls, homemade",
    piece: "ball",
    pieces: "balls",
    match: /\b(energy|bliss|date|oat) (balls?|bites?)\b/,
    sizes: BALLS,
    size: 1,
    usual: [["dates", 8], ["nuts", 2], ["cocoa", 2], ["oats", 0], ["peanut", 0], ["almondButter", 0], ["coconut", 0], ["chia", 0], ["choc", 0], ["honey", 0], ["maple", 0], ["raisins", 0]],
  },
  {
    key: "flapjack",
    title: "Flapjack",
    name: "Flapjack, homemade",
    piece: "piece",
    pieces: "pieces",
    match: /\b(flapjacks?|oat bars?)\b/,
    sizes: [
      { label: "Small square", hint: "about 35 g", g: 35 },
      { label: "Bar", hint: "about 60 g", g: 60 },
      { label: "Large slice", hint: "about 90 g", g: 90 },
    ],
    size: 1,
    usual: [["oats", 2.5], ["butter", 2], ["sugar", 8], ["syrup", 3], ["raisins", 0], ["choc", 0], ["coconut", 0], ["peanut", 0], ["honey", 0]],
  },
];

/** A build for a search such as 'protein balls' or 'flapjack'. */
export function buildFor(query: string): Build | undefined {
  const q = query.trim().toLowerCase();
  // Part-typed titles count once past the first word ('protein b'), or for one-word titles ('flapj').
  const prefix = (t: string) => q.length >= 5 && t.startsWith(q) && (q.includes(" ") || !t.includes(" "));
  return BUILDS.find((b) => b.match.test(q) || prefix(b.title.toLowerCase()));
}

export type Amounts = Record<string, number>;

/** Any ingredient with grams per unit and per-100 g nutrients, including ones added from search. */
export interface Part {
  label: string;
  qty: number;
  g: number;
  n: Nutrients;
}

export function partsOf(amounts: Amounts): Part[] {
  return Object.entries(amounts)
    .filter(([k, q]) => q > 0 && INGREDIENTS[k])
    .map(([k, qty]) => {
      const i = INGREDIENTS[k];
      const [kcal, protein, carbs, fat, fibre, satFat, sugars, salt] = i.n;
      return { label: i.label, qty, g: i.g, n: { kcal, protein, carbs, fat, fibre, satFat, sugars, salt } };
    });
}

/** Batch weight and nutrients per 100 g. */
export function batchOf(parts: Part[]): { grams: number; per100: Nutrients } {
  const grams = parts.reduce((t, p) => t + p.qty * p.g, 0);
  const keys = ["kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt"] as const;
  const per100 = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 } as Nutrients;
  for (const k of keys) {
    const sum = parts.reduce((t, p) => t + ((p.n[k] ?? 0) * p.qty * p.g) / 100, 0);
    const v = grams ? (sum / grams) * 100 : 0;
    const dp = k === "kcal" ? 1 : k === "salt" ? 100 : 10;
    per100[k] = Math.round(v * dp) / dp;
  }
  return { grams, per100 };
}

/** How many pieces a batch makes, at least one. */
export function piecesFrom(grams: number, size: number): number {
  return Math.max(1, Math.round(grams / size));
}

export function toCustomFood(build: Build, name: string, per100: Nutrients, size: number, id: string): CustomFood {
  return { id, name, per: 100, unit: "g", units: [{ name: build.piece, plural: build.pieces, g: size }], ...per100 };
}

const KEY = "daily15:build:";

export interface Remembered {
  amounts: Amounts;
  size: number;
}

/** Last time's ingredients and size for this build, or the usual recipe. */
export function startingPoint(build: Build): Remembered {
  try {
    const raw = localStorage.getItem(KEY + build.key);
    if (raw) {
      const r = JSON.parse(raw) as Remembered;
      if (r && typeof r.size === "number" && r.amounts) return r;
    }
  } catch {
    /* storage unavailable */
  }
  return { amounts: Object.fromEntries(build.usual.filter(([, q]) => q > 0)), size: build.size };
}

export function remember(build: Build, r: Remembered) {
  try {
    localStorage.setItem(KEY + build.key, JSON.stringify(r));
  } catch {
    /* storage unavailable */
  }
}
