import { FOOD_DB, type FoodItem } from "./foods";

/*
 * Breakfast cereals are mostly eaten with milk (or yoghurt), which can add a
 * third again to the calories. When a cereal is logged, the app offers what
 * went on it and logs that as its own entry, remembering the choice.
 */
const CEREAL = /granola|muesli|cereal|wheat biscuits?|corn ?flakes|bran flakes|weetabix|shredded wheat|shreddies|crunchy nut|cheerios|rice krispies|special k|frosties|coco pops|fruit ?(and|&|n) ?fibre|bircher|porridge oats, dry|oats, (dry|rolled)|^oats\b/i;
const NOT = /\bbar\b|bars\b|made (up|with)|cooked|cookie|biscuit/i;

export const isCereal = (name: string) => CEREAL.test(name) && !NOT.test(name);

export const TOPPINGS: { label: string; name: string }[] = [
  { label: "Semi-skimmed", name: "Semi-skimmed milk" },
  { label: "Whole", name: "Whole milk" },
  { label: "Skimmed", name: "Skimmed milk" },
  { label: "Oat", name: "Oat milk" },
  { label: "Soya", name: "Soya milk, unsweetened" },
  { label: "Almond", name: "Almond milk, unsweetened" },
  { label: "Greek yoghurt", name: "Greek-style yoghurt, full fat" },
  { label: "0% Greek yoghurt", name: "Greek yoghurt, 0% fat" },
];

export const AMOUNTS: { label: string; amount: number }[] = [
  { label: "a splash", amount: 50 },
  { label: "usual", amount: 125 },
  { label: "lots", amount: 200 },
];

export const toppingFood = (name: string): FoodItem | undefined => FOOD_DB.find((f) => f.name === name);

const KEY = "daily15:cereal-topping";
export interface ToppingChoice { name: string | null; amount: number }

export function lastTopping(): ToppingChoice {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as ToppingChoice | null;
    if (v && (v.name === null || toppingFood(v.name)) && v.amount > 0) return v;
  } catch {
    /* storage unavailable */
  }
  return { name: "Semi-skimmed milk", amount: 125 };
}

export function rememberTopping(c: ToppingChoice): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable */
  }
}
