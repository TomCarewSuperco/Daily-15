import { FOOD_DB, type FoodItem } from "./foods";

/*
 * Foods that come in several versions which look the same on the plate but
 * differ a lot in calories, such as mash made plain or with butter and cream.
 * The portion screen offers the versions side by side with their calories.
 */
interface Group { question: string; options: [label: string, name: string][] }

const GROUPS: Group[] = [
  {
    question: "How was it made?",
    options: [
      ["Plain", "Mashed potato, plain"],
      ["With milk", "Mashed potato, with milk"],
      ["Butter and milk", "Mashed potato"],
      ["Olive oil", "Mashed potato, with olive oil"],
      ["Butter and cream", "Mashed potato, with butter and cream"],
    ],
  },
  {
    question: "How were they cooked?",
    options: [
      ["Air-fried", "Roast potatoes, air-fried"],
      ["Roasted in oil", "Roast potatoes"],
      ["Goose fat or lard", "Roast potatoes, in goose fat or lard"],
      ["Frozen, from the oven", "Roast potatoes, frozen, oven-cooked"],
    ],
  },
  {
    question: "What kind of chips?",
    options: [
      ["Air-fried", "Chips, air-fried"],
      ["Oven chips", "Oven chips"],
      ["Homemade, deep-fried", "Chips, homemade, deep-fried"],
      ["Chip shop", "Chip shop chips"],
      ["Fast-food fries", "Fast-food fries"],
    ],
  },
  {
    question: "What kind of rice?",
    options: [
      ["Boiled white", "White rice, cooked"],
      ["Boiled brown", "Brown rice, cooked"],
      ["Microwave pouch", "Microwave rice, pouch"],
      ["Pilau", "Pilau rice"],
      ["Egg fried", "Egg fried rice, takeaway"],
    ],
  },
  {
    question: "What kind of pasta?",
    options: [
      ["Plain, dried", "Pasta, cooked"],
      ["Wholewheat", "Wholewheat pasta, cooked"],
      ["Fresh egg pasta", "Fresh egg pasta, cooked"],
      ["With butter or oil", "Pasta, cooked, with butter or oil"],
    ],
  },
  {
    question: "What kind of bread?",
    options: [
      ["White", "White bread"],
      ["Wholemeal", "Wholemeal bread"],
      ["Malted or granary", "Malted wheat bread"],
      ["Seeded", "Seeded bread"],
      ["Sourdough", "Sourdough bread"],
      ["Rye", "Rye bread"],
    ],
  },
  {
    question: "What kind of toast?",
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
    question: "What kind of noodles?",
    options: [
      ["Egg", "Egg noodles, cooked"],
      ["Rice", "Rice noodles, cooked"],
      ["Udon", "Udon noodles, cooked"],
      ["Soba", "Soba noodles, cooked"],
      ["Glass", "Glass noodles, cooked"],
      ["Instant, made up", "Instant noodles, made up"],
      ["Stir-fried egg", "Egg noodles, stir-fried"],
    ],
  },
  {
    question: "What was it made with?",
    options: [
      ["Water", "Porridge, made with water"],
      ["Milk and water", "Porridge, made with milk and water"],
      ["Semi-skimmed milk", "Porridge, made with semi-skimmed milk"],
      ["Whole milk", "Porridge, made with whole milk"],
      ["Oat milk", "Porridge, made with oat milk"],
    ],
  },
  {
    question: "How was it cooked?",
    options: [
      ["Boiled", "Egg"],
      ["Poached", "Egg, poached"],
      ["Fried", "Egg, fried"],
      ["Scrambled, nothing added", "Scrambled eggs, no butter or milk"],
      ["Scrambled, butter and milk", "Scrambled eggs, with butter and milk"],
    ],
  },
  // Last, so mash and roast potatoes open their own choices; here they link across.
  {
    question: "How were they cooked?",
    options: [
      ["Boiled", "Potato, boiled"],
      ["New, boiled", "New potatoes, boiled"],
      ["Jacket", "Jacket potato"],
      ["Mashed", "Mashed potato"],
      ["Roast", "Roast potatoes"],
      ["Wedges", "Potato wedges, homemade"],
    ],
  },
];

const MILKS: [string, string][] = [["Whole", "whole"], ["Semi-skimmed", "semi-skimmed"], ["Skimmed", "skimmed"], ["Oat", "oat"], ["Soya", "soya"], ["Almond", "almond"]];
const MILK_RE = /^(.+), (whole|semi-skimmed|skimmed|oat|soya|almond) milk$/;

const byName = new Map(FOOD_DB.map((f) => [f.name, f]));

export interface Variants { question: string; options: { label: string; food: FoodItem }[]; current: number }

/** CoFID rows that mean the same as one of the options above. */
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
  [/^Porridge oats, unfortified, cooked, made up with semi-skimmed milk/, "Porridge, made with semi-skimmed milk"],
];

export function variantsFor(rawName: string): Variants | null {
  const name = ALIASES.find(([re]) => re.test(rawName))?.[1] ?? rawName;
  let group = GROUPS.find((g) => g.options.some(([, n]) => n === name));
  const milk = !group && MILK_RE.exec(name);
  if (milk) group = { question: "Which milk?", options: MILKS.map(([label, m]) => [label, `${milk[1]}, ${m} milk`]) };
  if (!group) return null;
  const options = group.options.flatMap(([label, n]) => (byName.has(n) ? [{ label, food: byName.get(n)! }] : []));
  const current = options.findIndex((o) => o.food.name === name);
  return options.length > 1 && current >= 0 ? { question: group.question, options, current } : null;
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
