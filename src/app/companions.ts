import { FOOD_DB, type FoodItem } from "./foods";

/*
 * Foods usually eaten with something that changes the calories a lot: cereal with
 * milk or yoghurt, salad with a dressing. When one is logged, the app asks what went
 * with it and logs that as its own entry, remembering the choice for next time.
 */
export interface Companion {
  key: string;
  question: string;
  options: { label: string; name: string }[];
  amounts: { label: string; amount: number }[];
  usual: { name: string | null; amount: number };
}

const CEREAL = /granola|muesli|cereal|wheat biscuits?|corn ?flakes|bran flakes|weetabix|shredded wheat|shreddies|crunchy nut|cheerios|rice krispies|special k|frosties|coco pops|fruit ?(and|&|n) ?fibre|bircher|porridge oats, dry|oats, (dry|rolled)|^oats\b/i;
const NOT_CEREAL = /\bbar\b|bars\b|made (up|with)|cooked|cookie|biscuit/i;
const SALAD = /salad leaves|mixed leaves|lettuce|rocket|watercress|baby spinach|iceberg|romaine|little gem|\bcos\b|side salad|green salad|^salad, green|leaf salad/i;
const NOT_SALAD = /dressing|potato|coleslaw|pasta|egg|tuna|chicken|caesar|with |sandwich|taco|burger|wrap|roll/i;

const COMPANIONS: (Companion & { match: (n: string) => boolean })[] = [
  {
    key: "cereal",
    match: (n) => CEREAL.test(n) && !NOT_CEREAL.test(n),
    question: "What's on it?",
    options: [
      { label: "Semi-skimmed", name: "Semi-skimmed milk" },
      { label: "Whole", name: "Whole milk" },
      { label: "Skimmed", name: "Skimmed milk" },
      { label: "Oat", name: "Oat milk" },
      { label: "Soya", name: "Soya milk, unsweetened" },
      { label: "Almond", name: "Almond milk, unsweetened" },
      { label: "Greek yoghurt", name: "Greek-style yoghurt, full fat (10%)" },
      { label: "0% Greek yoghurt", name: "Greek yoghurt, 0% fat" },
    ],
    amounts: [
      { label: "A splash", amount: 50 },
      { label: "Usual", amount: 125 },
      { label: "Lots", amount: 200 },
    ],
    usual: { name: "Semi-skimmed milk", amount: 125 },
  },
  {
    key: "salad",
    match: (n) => SALAD.test(n) && !NOT_SALAD.test(n),
    question: "Any dressing?",
    options: [
      { label: "Olive oil", name: "Olive oil" },
      { label: "Oil and lemon", name: "Oil and lemon dressing" },
      { label: "Vinaigrette", name: "Vinaigrette" },
      { label: "Caesar", name: "Caesar dressing" },
      { label: "Salad cream", name: "Salad cream" },
      { label: "Mayonnaise", name: "Mayonnaise" },
      { label: "Yogurt dressing", name: "Yogurt dressing" },
      { label: "Balsamic glaze", name: "Balsamic glaze" },
      { label: "Fat-free", name: "Fat-free dressing" },
    ],
    amounts: [
      { label: "A drizzle", amount: 5 },
      { label: "A tablespoon", amount: 15 },
      { label: "Generous", amount: 30 },
    ],
    usual: { name: "Olive oil", amount: 5 },
  },
];

export function companionFor(name: string): Companion | null {
  return COMPANIONS.find((c) => c.match(name)) ?? null;
}

/** Kept for existing callers: true for breakfast cereals. */
export const isCereal = (name: string) => companionFor(name)?.key === "cereal";

export const companionFood = (name: string): FoodItem | undefined => FOOD_DB.find((f) => f.name === name);

export interface CompanionChoice { name: string | null; amount: number }

const key = (c: Companion) => `daily15:with-${c.key}`;

export function lastChoice(c: Companion): CompanionChoice {
  try {
    // Cereal choices saved before this was generalised.
    const raw = localStorage.getItem(key(c)) ?? (c.key === "cereal" ? localStorage.getItem("daily15:cereal-topping") : null);
    const v = JSON.parse(raw ?? "null") as CompanionChoice | null;
    if (v && (v.name === null || (companionFood(v.name) && c.options.some((o) => o.name === v.name))) && c.amounts.some((a) => a.amount === v.amount)) return v;
  } catch {
    /* storage unavailable */
  }
  return c.usual;
}

export function rememberChoice(c: Companion, v: CompanionChoice): void {
  try {
    localStorage.setItem(key(c), JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}
