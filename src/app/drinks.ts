import type { Nutrients } from "./types";

/*
 * Spirits with a mixer, built from the measure and the mixer, and cocktails with
 * an extra shot. Spirits are CoFID 'Spirits, 40% volume'; mixers are CoFID where
 * it has them (tonic, cola, diet cola, lemonade, cranberry, orange juice) and
 * typical label values otherwise (slimline tonic, ginger ale, ginger beer).
 */

export const SPIRITS = ["Gin", "Vodka", "Rum", "Whisky", "Tequila", "Brandy"] as const;
export type Spirit = (typeof SPIRITS)[number];

const SPIRIT_KCAL = 2.22; // per ml
export const SPIRIT_ABV = 40.2;

export const MEASURES = [
  { label: "Single", hint: "25 ml", ml: 25, suffix: "" },
  { label: "Large single", hint: "35 ml", ml: 35, suffix: ", large single" },
  { label: "Double", hint: "50 ml", ml: 50, suffix: ", double" },
  { label: "Home pour", hint: "about 70 ml", ml: 70, suffix: ", home pour" },
];

/** Per 100 ml: kcal, sugars (all the carbohydrate), protein, salt. */
export const MIXERS: { label: string; n: [number, number, number, number] }[] = [
  { label: "Tonic", n: [22, 5.9, 0, 0.01] },
  { label: "Slimline tonic", n: [1, 0, 0, 0.01] },
  { label: "Soda water", n: [0, 0, 0, 0.02] },
  { label: "Cola", n: [41, 10.9, 0, 0.01] },
  { label: "Diet cola", n: [1, 0, 0, 0.01] },
  { label: "Lemonade", n: [22, 5.8, 0, 0.02] },
  { label: "Diet lemonade", n: [1, 0, 0, 0.02] },
  { label: "Ginger ale", n: [34, 8.6, 0, 0.02] },
  { label: "Ginger beer", n: [40, 9.8, 0, 0.02] },
  { label: "Orange juice", n: [36, 8.6, 0.9, 0] },
  { label: "Cranberry juice", n: [45, 12.1, 0, 0] },
];

export const MIXER_AMOUNTS = [
  { label: "Splash", ml: 50 },
  { label: "Usual", ml: 150 },
  { label: "Long", ml: 250 },
];

export interface SpiritChoice {
  spirit: Spirit;
  measure: number;
  /** Index into MIXERS, or null for neat or on ice. */
  mixer: number | null;
  mixerAmount: number;
}

const SPIRIT_RE = new RegExp(`^(${SPIRITS.join("|")})(?: and (.+?))?(, (?:double|large single|home pour|single))?$`, "i");
const MIXER_WORDS: [RegExp, string][] = [
  [/^slimline tonic|^diet tonic|^light tonic/, "Slimline tonic"],
  [/^tonic/, "Tonic"],
  [/^soda/, "Soda water"],
  [/^diet cola|^diet coke|^coke zero|^pepsi max/, "Diet cola"],
  [/^cola|^coke/, "Cola"],
  [/^diet lemonade/, "Diet lemonade"],
  [/^lemonade/, "Lemonade"],
  [/^ginger ale/, "Ginger ale"],
  [/^ginger beer/, "Ginger beer"],
  [/^orange/, "Orange juice"],
  [/^cranberry/, "Cranberry juice"],
];

/** A spirit, or a spirit and mixer, from its name. Null for anything else. */
export function parseSpirit(name: string): Omit<SpiritChoice, "mixerAmount"> & { hasMixer: boolean } | null {
  const m = SPIRIT_RE.exec(name.trim());
  if (!m) return null;
  const spirit = SPIRITS.find((s) => s.toLowerCase() === m[1].toLowerCase())!;
  const suffix = (m[3] ?? "").toLowerCase();
  const measure = Math.max(0, MEASURES.findIndex((x) => x.suffix && suffix === x.suffix));
  if (!m[2]) return { spirit, measure, mixer: null, hasMixer: false };
  const word = MIXER_WORDS.find(([re]) => re.test(m[2].toLowerCase()));
  if (!word) return null;
  return { spirit, measure, mixer: MIXERS.findIndex((x) => x.label === word[1]), hasMixer: true };
}

export function spiritName(c: SpiritChoice): string {
  const mixer = c.mixer === null ? "" : ` and ${MIXERS[c.mixer].label.toLowerCase()}`;
  return `${c.spirit}${mixer}${MEASURES[c.measure].suffix}`;
}

/** One drink: its volume, nutrients for that volume and strength. */
export function spiritDrink(c: SpiritChoice): { ml: number; n: Nutrients; abv: number } {
  const spiritMl = MEASURES[c.measure].ml;
  const mixerMl = c.mixer === null ? 0 : MIXER_AMOUNTS[c.mixerAmount].ml;
  const [kcal, sugars, protein, salt] = c.mixer === null ? [0, 0, 0, 0] : MIXERS[c.mixer].n;
  const f = mixerMl / 100;
  const ml = spiritMl + mixerMl;
  return {
    ml,
    n: { kcal: Math.round(spiritMl * SPIRIT_KCAL + kcal * f), protein: Math.round(protein * f * 10) / 10, carbs: Math.round(sugars * f * 10) / 10, fat: 0, fibre: 0, satFat: 0, sugars: Math.round(sugars * f * 10) / 10, salt: Math.round(salt * f * 100) / 100 },
    abv: Math.round(((SPIRIT_ABV * spiritMl) / ml) * 10) / 10,
  };
}

const KEY = "daily15:spirit";

export function rememberedSpirit(): Pick<SpiritChoice, "measure" | "mixer" | "mixerAmount"> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && MEASURES[v.measure] && (v.mixer === null || MIXERS[v.mixer]) && MIXER_AMOUNTS[v.mixerAmount]) return v;
  } catch {
    /* storage unavailable */
  }
  return { measure: 0, mixer: 0, mixerAmount: 1 };
}

export function rememberSpirit(c: SpiritChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ measure: c.measure, mixer: c.mixer, mixerAmount: c.mixerAmount }));
  } catch {
    /* storage unavailable */
  }
}

/** Cocktails and the spirit an extra shot adds. */
export const COCKTAIL_SPIRIT: Record<string, Spirit> = {
  Mojito: "Rum",
  Margarita: "Tequila",
  Cosmopolitan: "Vodka",
  "Espresso martini": "Vodka",
  "Bloody Mary": "Vodka",
  "Long Island iced tea": "Vodka",
};

export const SHOT_ML = 25;

/** Adds extra 25 ml shots of spirit to a drink: nutrients for the new volume and its strength. */
export function withShots(n: Nutrients, ml: number, abv: number, extra: number): { n: Nutrients; ml: number; abv: number } {
  const add = extra * SHOT_ML;
  const total = ml + add;
  return { n: { ...n, kcal: Math.round(n.kcal + add * SPIRIT_KCAL) }, ml: total, abv: Math.round(((abv * ml + SPIRIT_ABV * add) / total) * 10) / 10 };
}
