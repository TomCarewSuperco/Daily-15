import { FOOD_DB, type FoodItem } from "./foods";
import { matchesAll, unitsFor } from "./cofid";

/*
 * Foods that come in several versions which look alike on the plate but
 * differ a lot in calories (at least 40% between the lightest and richest),
 * such as mash made plain or with butter and cream. Search shows one row per
 * food; the portion screen offers the versions side by side with their
 * calories, starting on the one the person chose last time.
 */
interface Group {
  key: string;
  /** The search row's name. */
  title: string;
  question: string;
  options: [label: string, name: string][];
  /** The option to start on when the person hasn't chosen one before. */
  usual: number;
  /** A wider group this one sits inside (mash and roast are kinds of potato). */
  parent?: string;
  /** Several of these often go on one plate (a slice of breast and a thigh): offer to add another. */
  mixable?: boolean;
}

const MADE = "How was it made?";
const KIND = "Which kind?";

const GROUPS: Group[] = [
  {
    key: "mash", title: "Mashed potato", question: MADE, usual: 2, parent: "potato",
    options: [
      ["Plain", "Mashed potato, plain"],
      ["With milk", "Mashed potato, with milk"],
      ["Butter and milk", "Mashed potato"],
      ["Olive oil", "Mashed potato, with olive oil"],
      ["Butter and cream", "Mashed potato, with butter and cream"],
    ],
  },
  {
    key: "roast", title: "Roast potatoes", question: MADE, usual: 1, parent: "potato",
    options: [
      ["Air-fried", "Roast potatoes, air-fried"],
      ["Roasted in oil", "Roast potatoes"],
      ["Goose fat or lard", "Roast potatoes, in goose fat or lard"],
      ["Frozen, from the oven", "Roast potatoes, frozen, oven-cooked"],
    ],
  },
  {
    key: "chips", title: "Chips", question: MADE, usual: 1, parent: "potato",
    options: [
      ["Air-fried", "Chips, air-fried"],
      ["Oven chips", "Oven chips"],
      ["Homemade, deep-fried", "Chips, homemade, deep-fried"],
      ["Chip shop", "Chip shop chips"],
      ["Fast-food fries", "Fast-food fries"],
    ],
  },
  {
    key: "rice", title: "Rice", question: KIND, usual: 0,
    options: [
      ["Boiled white", "White rice, cooked"],
      ["Boiled brown", "Brown rice, cooked"],
      ["Microwave pouch", "Microwave rice, pouch"],
      ["Pilau", "Pilau rice"],
      ["Egg fried", "Egg fried rice, takeaway"],
    ],
  },
  {
    key: "pasta", title: "Pasta", question: KIND, usual: 0,
    options: [
      ["Plain, dried", "Pasta, cooked"],
      ["Wholewheat", "Wholewheat pasta, cooked"],
      ["Fresh egg pasta", "Fresh egg pasta, cooked"],
      ["With butter or oil", "Pasta, cooked, with butter or oil"],
    ],
  },
  {
    key: "toast", title: "Toast", question: KIND, usual: 0,
    options: [
      ["White", "White toast"],
      ["Wholemeal", "Wholemeal toast"],
      ["Seeded", "Seeded toast"],
      ["Sourdough", "Sourdough toast"],
      ["White, buttered", "White toast, buttered"],
      ["Wholemeal, buttered", "Wholemeal toast, buttered"],
    ],
  },
  {
    key: "noodles", title: "Noodles", question: KIND, usual: 0,
    options: [
      ["Egg", "Egg noodles, cooked"],
      ["Rice", "Rice noodles, cooked"],
      ["Udon", "Udon noodles, cooked"],
      ["Soba", "Soba noodles, cooked"],
      ["Instant, made up", "Instant noodles, made up"],
      ["Stir-fried egg", "Egg noodles, stir-fried"],
    ],
  },
  {
    key: "wrap", title: "Chicken wrap", question: MADE, usual: 2,
    options: [
      ["Homemade, light", "Chicken wrap, homemade, light"],
      ["Homemade, cheese and mayo", "Chicken wrap, homemade, with cheese and mayo"],
      ["Shop-bought", "Chicken wrap, shop-bought"],
      ["Takeaway shawarma", "Shawarma wrap, chicken"],
      ["Fast-food, crispy", "Chicken wrap, fast-food, crispy"],
    ],
  },
  {
    key: "broth", title: "Chicken broth", question: MADE, usual: 0,
    options: [
      ["Stock cube or pot", "Chicken broth, stock cube or pot"],
      ["Ready-made stock", "Chicken stock, ready-made"],
      ["Bone broth, shop-bought", "Chicken bone broth, shop-bought"],
      ["Homemade, fat skimmed", "Chicken broth, homemade, fat skimmed"],
      ["Homemade, fat left in", "Chicken broth, homemade, fat left in"],
    ],
  },
  {
    key: "chicken", title: "Chicken", question: "Which part?", usual: 0, mixable: true,
    options: [
      ["Breast", "Chicken breast, roast, skin on"],
      ["Thigh", "Chicken thigh, roast, skin on"],
      ["Drumstick", "Chicken drumstick, roast, skin on"],
      ["Leg", "Chicken leg, roast, skin on"],
      ["Wing", "Chicken wing, roast, skin on"],
    ],
  },
  {
    key: "chicken-no-skin", title: "Chicken, skin removed", question: "Which part?", usual: 0, mixable: true,
    options: [
      ["Breast", "Chicken breast, roast, skin removed"],
      ["Thigh", "Chicken thigh, roast, skin removed"],
      ["Drumstick", "Chicken drumstick, roast, skin removed"],
      ["Leg", "Chicken leg, roast, skin removed"],
      ["Wing", "Chicken wing, roast, skin removed"],
    ],
  },
  {
    key: "yoghurt", title: "Yoghurt", question: KIND, usual: 0,
    options: [
      ["Greek-style, full fat (10%)", "Greek-style yoghurt, full fat (10%)"],
      ["Greek, 0% fat", "Greek yoghurt, 0% fat"],
      ["Natural, whole milk (3%)", "Natural yoghurt, whole milk (3%)"],
      ["Natural, low fat (1%)", "Natural yoghurt, low fat (1%)"],
      ["Skyr", "Skyr, natural"],
      ["Fruit, low fat", "Fruit yoghurt, low fat"],
      ["Greek-style, fruit", "Greek-style yoghurt, fruit"],
      ["Soya, fruit", "Soya yoghurt, fruit"],
    ],
  },
  {
    key: "salami", title: "Salami", question: KIND, usual: 0,
    options: [
      ["Pre-sliced, thin", "Salami, pre-sliced"],
      ["Thick-cut or deli", "Salami, thick-cut or deli"],
      ["Pepperoni", "Pepperoni"],
      ["Chorizo", "Chorizo, sliced"],
      ["Snack stick", "Salami snack stick"],
      ["Bresaola, lean", "Bresaola"],
    ],
  },
  {
    key: "sausage", title: "Sausages", question: KIND, usual: 0,
    options: [
      ["Pork", "Pork sausage, grilled"],
      ["Premium pork", "Premium pork sausage, grilled"],
      ["Reduced-fat pork", "Reduced-fat pork sausage, grilled"],
      ["Beef", "Beef sausage, grilled"],
      ["Chicken or turkey", "Chicken or turkey sausage, grilled"],
      ["Venison", "Venison sausage, grilled"],
      ["Vegetarian", "Vegetarian sausage, grilled"],
    ],
  },
  {
    key: "ham", title: "Ham", question: KIND, usual: 1,
    options: [
      ["Wafer-thin", "Ham, wafer-thin"],
      ["Pre-packed slices", "Ham, sliced"],
      ["Thick-cut or deli", "Ham, thick-cut"],
      ["Carved gammon", "Ham, gammon joint, carved"],
      ["Parma or Serrano", "Parma or Serrano ham"],
    ],
  },
  {
    key: "porridge", title: "Porridge", question: "What was it made with?", usual: 2,
    options: [
      ["Water", "Porridge, made with water"],
      ["Milk and water", "Porridge, made with milk and water"],
      ["Semi-skimmed milk", "Porridge, made with semi-skimmed milk"],
      ["Whole milk", "Porridge, made with whole milk"],
      ["Oat milk", "Porridge, made with oat milk"],
    ],
  },
  {
    key: "potato", title: "Potatoes", question: MADE, usual: 0,
    options: [
      ["Boiled", "Potato, boiled"],
      ["New, boiled", "New potatoes, boiled"],
      ["Jacket", "Jacket potato"],
      ["Wedges", "Potato wedges, homemade"],
      ["Mashed", "Mashed potato"],
      ["Roast", "Roast potatoes"],
    ],
  },
];

/** Skin on and skin removed versions of the same part: about a third of the fat is in the skin. */
const SKIN: [on: string, off: string][] = [
  ["Chicken breast, roast, skin on", "Chicken breast, roast, skin removed"],
  ["Chicken thigh, roast, skin on", "Chicken thigh, roast, skin removed"],
  ["Chicken drumstick, roast, skin on", "Chicken drumstick, roast, skin removed"],
  ["Chicken leg, roast, skin on", "Chicken leg, roast, skin removed"],
  ["Chicken wing, roast, skin on", "Chicken wing, roast, skin removed"],
];

const MILKS: [string, string][] = [["Whole", "whole"], ["Semi-skimmed", "semi-skimmed"], ["Skimmed", "skimmed"], ["Oat", "oat"], ["Soya", "soya"], ["Almond", "almond"]];
const MILK_RE = /^(.+?)(, | with )(whole|semi-skimmed|skimmed|oat|soya|almond) milk$/;

const byName = new Map(FOOD_DB.map((f) => [f.name, f]));

const ALIASES: [RegExp, string][] = [
  [/^Potatoes, old, roasted in (corn|sunflower|rapeseed) oil/, "Roast potatoes"],
  [/^Potatoes, old, roasted in lard/, "Roast potatoes, in goose fat or lard"],
  [/^Potatoes, new, frozen, .roast/, "Roast potatoes, frozen, oven-cooked"],
  [/^Potato chips, .*from takeaway fish and chip shops/, "Chip shop chips"],
  [/^Potato chips, homemade, fried/, "Chips, homemade, deep-fried"],
  [/^Potato chips, fine cut, from fast food outlets/, "Fast-food fries"],
  [/^Potato chips, oven ready, no batter/, "Oven chips"],
  [/^Rice, (white|Thai)[^,]*,( basmati,| long grain,)?( easy cook,)? boiled/i, "White rice, cooked"],
  [/^Rice, brown, .*boiled/, "Brown rice, cooked"],
  [/^Rice, egg fried/, "Egg fried rice, takeaway"],
  [/^Rice, ready-cooked/, "Microwave rice, pouch"],
  [/^Rice, pilau/, "Pilau rice"],
  [/^Pasta, white, .*boiled/, "Pasta, cooked"],
  [/^Pasta, wholewheat, .*boiled/, "Wholewheat pasta, cooked"],
  [/^Pasta, (plain, fresh|egg, white, tagliatelle, fresh), boiled/, "Fresh egg pasta, cooked"],
  [/^Potatoes, old, boiled/, "Potato, boiled"],
  [/^Potatoes, new and salad, boiled/, "New potatoes, boiled"],
  [/^Potatoes, old, (baked|microwaved), flesh and skin/, "Jacket potato"],
  [/^Potatoes, old, (potato )?wedges/, "Potato wedges, homemade"],
  [/^Potatoes, old, mashed with butter/, "Mashed potato"],
  [/^Noodles, egg, [a-z]+, dried, boiled/, "Egg noodles, cooked"],
  [/^Noodles, egg, fried/, "Egg noodles, stir-fried"],
  [/^Noodles, rice/, "Rice noodles, cooked"],
  [/^Bread, white, (sliced|average|farmhouse|premium|crusty bloomer)/, "White bread"],
  [/^Bread, wholemeal, average/, "Wholemeal bread"],
  [/^Bread, white, toasted/, "White toast"],
  [/^Bread, wholemeal, toasted/, "Wholemeal toast"],
  [/^Ham, gammon joint, boiled/, "Ham, gammon joint, carved"],
  [/^Ham$/, "Ham, sliced"],
  [/^Sausages, pork, (chilled|frozen)/, "Pork sausage, grilled"],
  [/^Sausages, premium/, "Premium pork sausage, grilled"],
  [/^Sausages, pork, reduced fat/, "Reduced-fat pork sausage, grilled"],
  [/^Sausages, beef/, "Beef sausage, grilled"],
  [/^Salami$/, "Salami, pre-sliced"],
  [/^Chorizo$/, "Chorizo, sliced"],
  [/^Salami snack$/, "Salami snack stick"],
  [/^Yogurt, Greek style, plain/, "Greek-style yoghurt, full fat (10%)"],
  // Chicken logged before parts and skin were offered, and CoFID's grilled breast.
  [/^Chicken breast, cooked$/, "Chicken breast, roast, skin removed"],
  [/^Chicken thigh, cooked, no skin$/, "Chicken thigh, roast, skin removed"],
  [/^Chicken, breast, grilled (with|without) skin, meat only/, "Chicken breast, roast, skin removed"],
  [/^Chicken, breast, grilled, meat and skin/, "Chicken breast, roast, skin on"],
  [/^Stock, chicken, ready made/, "Chicken stock, ready-made"],
  [/^Porridge oats, unfortified, cooked, made up with semi-skimmed milk/, "Porridge, made with semi-skimmed milk"],
];


const canonical = (name: string) => ALIASES.find(([re]) => re.test(name))?.[1] ?? name;

/** The group a food belongs to. A food in a group and its parent (mash) belongs to the narrower group. */
function groupOf(rawName: string): Group | null {
  const name = canonical(rawName);
  const own = GROUPS.find((g) => g.options.some(([, n]) => n === name) && !GROUPS.some((c) => c.parent === g.key && c.options.some(([, n]) => n === name)));
  if (own) return own;
  const milk = MILK_RE.exec(name);
  if (!milk) return null;
  const options = MILKS.map(([label, m]): [string, string] => [label, `${milk[1]}${milk[2]}${m} milk`]).filter(([, n]) => byName.has(n));
  if (options.length < 2) return null;
  return { key: `milk:${milk[1]}`, title: milk[1], question: "Which milk?", usual: Math.max(0, options.findIndex(([l]) => l === "Semi-skimmed")), options };
}

const resolve = (g: Group) => g.options.flatMap(([label, n]) => (byName.has(n) ? [{ label, food: byName.get(n)! }] : []));

export interface Option { label: string; food: FoodItem }
export interface Variants {
  question: string;
  options: Option[];
  current: number;
  others?: { title: string; options: Option[] };
  /** Skin eaten or removed, and the other version. */
  skin?: { on: boolean; other: FoodItem };
  mixable?: boolean;
}

export function variantsFor(rawName: string): Variants | null {
  const name = canonical(rawName);
  const g = groupOf(name);
  if (!g) return null;
  const options = resolve(g);
  const current = options.findIndex((o) => o.food.name === name);
  if (options.length < 2 || current < 0) return null;
  const parent = g.parent ? GROUPS.find((p) => p.key === g.parent) : undefined;
  // The wider group's other kinds, so mash can still become a jacket potato.
  const others = parent ? { title: `Other ${parent.title.toLowerCase()}`, options: resolve(parent).filter((o) => groupOf(o.food.name)?.key !== g.key) } : undefined;
  const pair = SKIN.find(([a, b]) => a === name || b === name);
  const other = pair ? byName.get(pair[0] === name ? pair[1] : pair[0]) : undefined;
  return { question: g.question, options, current, ...(others?.options.length ? { others } : {}), ...(other ? { skin: { on: pair![0] === name, other } } : {}), ...(g.mixable ? { mixable: true } : {}) };
}

/**
 * The version to start on: the one chosen last time, else the usual one.
 * Milky drinks remember the milk across drinks: an oat flat white suggests an oat latte.
 */
export function preferred(rawName: string, history: readonly { name: string }[]): FoodItem | null {
  const g = groupOf(rawName);
  if (!g) return null;
  const options = resolve(g);
  const names = new Set(options.map((o) => o.food.name));
  for (let i = history.length - 1; i >= 0; i--) {
    const n = canonical(history[i].name);
    if (names.has(n)) return byName.get(n)!;
    const milk = g.key.startsWith("milk:") && MILK_RE.exec(n);
    if (milk) {
      const same = options.find((o) => o.food.name.endsWith(`${milk[3]} milk`));
      if (same) return same.food;
    }
  }
  return options[g.usual]?.food ?? options[0]?.food ?? null;
}

export interface Row { food: FoodItem; title?: string; detail?: string }

/**
 * One search row per food with versions, when the search names the food in
 * general ('chips', 'flat white'). A search for a particular version
 * ('chip shop chips') still lists that version.
 */
export function collapse(results: FoodItem[], query: string, history: readonly { name: string }[]): Row[] {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const f of results) {
    const g = groupOf(f.name);
    // A search naming a fat % ('0% yoghurt') is after one particular version, so it isn't folded into one row.
    const general = g && matchesAll(g.title, query) && !/\d/.test(query);
    if (!g || !general) {
      rows.push({ food: f });
      continue;
    }
    if (seen.has(g.key)) continue;
    seen.add(g.key);
    const pick = preferred(f.name, history)!;
    const label = resolve(g).find((o) => o.food.name === pick.name)?.label ?? "";
    const chosen = history.some((h) => canonical(h.name) === pick.name || (g.key.startsWith("milk:") && MILK_RE.exec(h.name)?.[3] && pick.name.endsWith(`${MILK_RE.exec(h.name)![3]} milk`)));
    const row = { food: pick, title: g.title, detail: `${g.options.length} kinds · ${chosen ? "last time" : "usually"}: ${label.toLowerCase()}` };
    // Searching exactly the row's name ('chicken', 'yoghurt') puts it first.
    if (g.title.toLowerCase().replace(/s$/, "") === query.trim().toLowerCase().replace(/s$/, "")) rows.unshift(row);
    else rows.push(row);
  }
  return rows;
}

/** Database rows that are a version of a food already shown as one row. */
export function coveredBy(rows: Row[]): (name: string) => boolean {
  const keys = new Set(rows.filter((r) => r.title).map((r) => groupOf(r.food.name)?.key));
  return (name: string) => {
    const g = groupOf(name);
    return !!g && keys.has(g.key);
  };
}

interface Portion { name: string; base: object; per: number; baseUnit: "g" | "ml" | "serving"; units: FoodItem["units"]; unitIdx: number; qty: number; estimated: boolean; caffeine?: number }

/** Amount of the chosen portion in grams or millilitres. */
export function amountOf(p: Portion): number {
  return p.unitIdx >= 0 ? p.qty * p.units[p.unitIdx].g : p.qty;
}

/** Swaps the food for another version, keeping the same amount on the plate. */
export function switchTo<P extends Portion>(p: P, f: FoodItem): P {
  const amount = amountOf(p);
  const old = p.unitIdx >= 0 ? p.units[p.unitIdx] : null;
  let unitIdx = -1;
  let qty = amount;
  if (old) {
    // The same measure by name keeps its count: two slices of toast stay two slices, buttered or not.
    const same = f.units.findIndex((x) => x.name === old.name);
    // Otherwise pick the measure that gets closest to the same amount in halves (150 g of chips is one large fries).
    const halves = (g: number) => Math.max(0.5, Math.round((amount / g) * 2) / 2);
    const best = f.units.reduce((b, x, i) => (Math.abs(halves(x.g) * x.g - amount) < Math.abs(halves(f.units[b].g) * f.units[b].g - amount) ? i : b), 0);
    unitIdx = same >= 0 ? same : f.units.length ? best : -1;
    qty = same >= 0 ? p.qty : unitIdx >= 0 ? halves(f.units[unitIdx].g) : Math.round(amount);
  }
  return { ...p, name: f.name, base: f, per: f.per, baseUnit: f.unit, units: f.units, unitIdx, qty, caffeine: f.caffeine, estimated: true };
}

/*
 * Homemade dishes, soups, stews and takeaways vary mostly in how much oil,
 * butter or cream goes in. Any such food can be logged lighter or richer
 * than the listed recipe: half the fat, or 60% more. The app's estimate.
 */
export type Style = -1 | 0 | 1;
export const STYLE_LABELS: Record<Style, [label: string, hint: string]> = {
  [-1]: ["Lighter", "less oil, butter or cream"],
  0: ["Typical", "as listed"],
  1: ["Richer", "more oil, butter or cream"],
};
const DISH_RE = /homemade|\bsoup\b|stew|casserole|curry|chilli|bolognese|risotto|lasagne|dhal|dahl|takeaway|stir[- ]?fr|\bpie\b|hotpot|tagine|korma|masala|paella|carbonara|moussaka|shepherd|cottage pie|wrap|burrito|fajita|quiche/i;

/** True for dishes whose fat depends on the cook, with enough fat to matter. */
export function styleable(name: string, fat: number): boolean {
  return DISH_RE.test(name) && fat >= 1 && !variantsFor(name);
}

export function restyle<N extends { kcal: number; fat: number; satFat?: number }>(typical: N, level: Style): N {
  if (level === 0) return typical;
  const factor = level < 0 ? 0.5 : 1.6;
  const fat = typical.fat * factor;
  const kcal = Math.max(0, typical.kcal + (fat - typical.fat) * 9);
  return { ...typical, fat: Math.round(fat * 10) / 10, kcal: Math.round(kcal), ...(typical.satFat !== undefined ? { satFat: Math.round(typical.satFat * factor * 10) / 10 } : {}) };
}

export const styledName = (name: string, level: Style) => (level === 0 ? name : `${name} (${level < 0 ? "lighter" : "richer"})`);

/**
 * A saved entry's measures, brought up to date: when the app's measures for that food
 * have changed since it was logged (pak choi went from tablespoons to heads), use the
 * new ones, keeping the same named measure if it still exists, or else the nearest
 * count of the first one. Branded and custom foods keep what they were saved with.
 */
export function refreshUnits<P extends Portion & { fiveADay?: FoodItem["fiveADay"] }>(p: P, fresh: FoodItem["units"] | null): P {
  if (!fresh || !fresh.length || p.baseUnit === "serving") return p;
  const same = (a: FoodItem["units"], b: FoodItem["units"]) => a.length === b.length && a.every((x, i) => x.name === b[i].name && x.g === b[i].g);
  if (same(p.units, fresh)) return p;
  const amount = amountOf(p);
  const old = p.unitIdx >= 0 ? p.units[p.unitIdx] : null;
  if (!old) return { ...p, units: fresh };
  const keep = fresh.findIndex((x) => x.name === old.name);
  if (keep >= 0) return { ...p, units: fresh, unitIdx: keep, qty: Math.max(0.5, Math.round((amount / fresh[keep].g) * 2) / 2) };
  return { ...p, units: fresh, unitIdx: 0, qty: Math.max(0.5, Math.round((amount / fresh[0].g) * 2) / 2) };
}

/** Today's measures for a food by name: the app's list first, then the general rules. */
export function currentUnitsFor(name: string, unit: "g" | "ml", fiveADay: FoodItem["fiveADay"] | null): FoodItem["units"] | null {
  const own = byName.get(name) ?? byName.get(canonical(name));
  if (own) return own.units;
  return unitsForName(name, unit, fiveADay);
}

const unitsForName = (name: string, unit: "g" | "ml", fiveADay: FoodItem["fiveADay"] | null) => {
  const u = unitsFor(name, unit, fiveADay ?? null, "");
  return u.length ? u : null;
};
