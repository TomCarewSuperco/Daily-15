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
    question: "How was it cooked?",
    options: [
      ["Boiled", "Egg"],
      ["Poached", "Egg, poached"],
      ["Fried", "Egg, fried"],
      ["Scrambled, nothing added", "Scrambled eggs, no butter or milk"],
      ["Scrambled, butter and milk", "Scrambled eggs, with butter and milk"],
    ],
  },
];

const MILKS: [string, string][] = [["Whole", "whole"], ["Semi-skimmed", "semi-skimmed"], ["Skimmed", "skimmed"], ["Oat", "oat"], ["Soya", "soya"], ["Almond", "almond"]];
const MILK_RE = /^(.+), (whole|semi-skimmed|skimmed|oat|soya|almond) milk$/;

const byName = new Map(FOOD_DB.map((f) => [f.name, f]));

export interface Variants { question: string; options: { label: string; food: FoodItem }[]; current: number }

export function variantsFor(name: string): Variants | null {
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
    const same = f.units.findIndex((x) => x.name === old.name && x.g === old.g);
    unitIdx = same >= 0 ? same : f.units.length ? 0 : -1;
    qty = same >= 0 ? p.qty : unitIdx >= 0 ? Math.max(0.5, Math.round((amount / f.units[0].g) * 2) / 2) : Math.round(amount);
  }
  return { ...p, name: f.name, base: f, per: f.per, baseUnit: f.unit, units: f.units, unitIdx, qty, caffeine: f.caffeine, estimated: true };
}
