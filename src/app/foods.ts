import type { Nutrients } from "./types";

/** A household measure for a food, such as one large egg = 60 g. */
export interface FoodUnit {
  name: string;
  plural: string;
  /** Grams, or millilitres for drinks, in one unit. */
  g: number;
}

export interface FoodItem extends Nutrients {
  name: string;
  /** Values are per this many grams or millilitres. */
  per: number;
  unit: "g" | "ml";
  /** Everyday measures, most common first. The first is the default. */
  units: FoodUnit[];
  /** Default amount in grams or millilitres when there are no units. */
  typical: number;
}

const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

function food(name: string, unit: "g" | "ml", kcal: number, protein: number, carbs: number, fat: number, fibre: number, units: FoodUnit[] = [], typical?: number): FoodItem {
  return { name, per: 100, unit, kcal, protein, carbs, fat, fibre, units, typical: typical ?? units[0]?.g ?? 100 };
}

/*
 * Starter food list. Values are rounded typical UK figures per 100 g or 100 ml,
 * compiled from general nutrition knowledge rather than a published dataset, so
 * every entry is shown as an estimate. Unit weights are typical edible weights.
 * Replace with McCance and Widdowson's CoFID data before public release.
 */
export const FOOD_DB: FoodItem[] = [
  // Breakfast and bakery
  food("Porridge oats, dry", "g", 375, 11, 60, 8, 9, [u("bowl", 50), u("sachet", 27)]),
  food("Granola", "g", 450, 10, 60, 18, 7, [u("bowl", 45)]),
  food("Muesli", "g", 360, 10, 66, 6, 7, [u("bowl", 45)]),
  food("Cornflakes", "g", 378, 7, 84, 0.9, 3, [u("bowl", 30)]),
  food("Wholewheat biscuit cereal", "g", 362, 12, 69, 2, 10, [u("biscuit", 19)]),
  food("Wholemeal bread", "g", 240, 10, 41, 2.5, 7, [u("slice", 40)]),
  food("White bread", "g", 250, 9, 47, 2, 2.7, [u("slice", 40)]),
  food("Bagel, plain", "g", 260, 10, 50, 1.6, 2.5, [u("bagel", 85)]),
  food("Crumpet", "g", 180, 6, 37, 0.7, 2, [u("crumpet", 55)]),
  food("Tortilla wrap", "g", 300, 8.5, 50, 7, 3, [u("wrap", 62)]),
  food("Burger bun", "g", 265, 9, 47, 4.5, 2.5, [u("bun", 60)]),
  food("Egg", "g", 143, 12.6, 0.7, 9.5, 0, [u("large egg", 60), u("medium egg", 50)]),
  food("Egg, fried", "g", 196, 13.6, 0.8, 15, 0, [u("egg", 60)]),
  food("Scrambled eggs", "g", 160, 10, 1.5, 12, 0, [u("portion (2 eggs)", 120, "portions (2 eggs)")]),
  food("Butter", "g", 717, 0.9, 0.1, 81, 0, [u("thin spread", 7), u("tablespoon", 15)]),
  food("Jam", "g", 250, 0.4, 61, 0, 0.8, [u("teaspoon", 10)]),
  food("Honey", "g", 304, 0.3, 82, 0, 0, [u("teaspoon", 7)]),
  food("Peanut butter", "g", 588, 25, 20, 50, 6, [u("tablespoon", 15), u("teaspoon", 5)]),

  // Dairy
  food("Semi-skimmed milk", "ml", 47, 3.5, 4.8, 1.7, 0, [u("glass", 200), u("splash", 30), u("pint", 568)]),
  food("Skimmed milk", "ml", 35, 3.5, 5, 0.1, 0, [u("glass", 200), u("splash", 30), u("pint", 568)]),
  food("Whole milk", "ml", 64, 3.4, 4.7, 3.6, 0, [u("glass", 200), u("splash", 30), u("pint", 568)]),
  food("Greek yoghurt, 0% fat", "g", 57, 10, 3.6, 0.2, 0, [u("pot", 150), u("tablespoon", 30)]),
  food("Greek-style yoghurt, full fat", "g", 130, 5, 5, 10, 0, [u("pot", 150), u("tablespoon", 30)]),
  food("Cheddar cheese", "g", 416, 25, 0.1, 35, 0, [u("slice", 20), u("matchbox-size piece", 30, "matchbox-size pieces")]),
  food("Cottage cheese", "g", 98, 11, 3.4, 4.3, 0, [u("tablespoon", 30), u("half pot", 150, "half pots")]),
  food("Single cream", "g", 193, 2.6, 3.9, 19, 0, [u("tablespoon", 15)]),
  food("Vanilla ice cream", "g", 200, 3.5, 24, 10, 0.5, [u("scoop", 50)]),

  // Meat, fish and alternatives
  food("Pork sausage, grilled", "g", 290, 14, 9, 23, 0.9, [u("sausage", 45), u("chipolata", 20)]),
  food("Bacon, back rasher, grilled", "g", 287, 23, 0, 22, 0, [u("rasher", 25)]),
  food("Ham, sliced", "g", 107, 18, 1.4, 3.3, 0, [u("slice", 15)]),
  food("Chicken breast, cooked", "g", 165, 31, 0, 3.6, 0, [u("breast", 150), u("small breast", 120)]),
  food("Chicken thigh, roast, no skin", "g", 230, 25, 0, 14, 0, [u("thigh", 90)]),
  food("Beef mince 5% fat, cooked", "g", 175, 27, 0, 7.5, 0, [u("portion", 125)]),
  food("Turkey mince, cooked", "g", 165, 27, 0, 6, 0, [u("portion", 125)]),
  food("Beef burger, grilled", "g", 250, 23, 2, 17, 0, [u("burger", 90)]),
  food("Sirloin steak, grilled", "g", 200, 29, 0, 9, 0, [u("steak", 200), u("small steak", 150)]),
  food("Pork chop, grilled", "g", 230, 29, 0, 12, 0, [u("chop", 130)]),
  food("Salmon fillet, cooked", "g", 206, 22, 0, 13, 0, [u("fillet", 120)]),
  food("Cod fillet, baked", "g", 100, 22, 0, 1, 0, [u("fillet", 140)]),
  food("Tuna, tinned in water", "g", 109, 25, 0, 1, 0, [u("tin, drained", 102, "tins, drained")]),
  food("Prawns, cooked", "g", 99, 24, 0.2, 0.3, 0, [u("handful", 80)]),
  food("Fish fingers, grilled", "g", 214, 15, 19, 9, 0.7, [u("fish finger", 28)]),
  food("Tofu, firm", "g", 144, 15, 3, 8.7, 2.3, [u("portion", 100)]),

  // Beans and pulses
  food("Baked beans", "g", 80, 4.7, 13, 0.4, 3.7, [u("half tin", 207, "half tins"), u("tablespoon", 40)]),
  food("Chickpeas, tinned, drained", "g", 120, 7, 17, 2.4, 6, [u("half tin", 120, "half tins"), u("tablespoon", 30)]),
  food("Kidney beans, tinned, drained", "g", 100, 7, 15, 0.5, 6, [u("half tin", 120, "half tins")]),
  food("Lentils, cooked", "g", 116, 9, 20, 0.4, 7.9, [u("portion", 150), u("tablespoon", 40)]),
  food("Hummus", "g", 280, 7, 13, 22, 6, [u("tablespoon", 30)]),

  // Carbohydrates
  food("White rice, cooked", "g", 130, 2.7, 28, 0.3, 0.4, [u("portion", 180)]),
  food("Brown rice, cooked", "g", 123, 2.7, 26, 1, 1.6, [u("portion", 180)]),
  food("Pasta, cooked", "g", 158, 5.8, 31, 0.9, 1.8, [u("portion", 180)]),
  food("Egg noodles, cooked", "g", 138, 4.5, 25, 2, 1.2, [u("portion", 180)]),
  food("Couscous, cooked", "g", 112, 3.8, 23, 0.2, 1.4, [u("portion", 150)]),
  food("Quinoa, cooked", "g", 120, 4.4, 21, 1.9, 2.8, [u("portion", 150)]),
  food("Potato, boiled", "g", 87, 1.9, 20, 0.1, 1.8, [u("medium potato", 175)]),
  food("Jacket potato", "g", 93, 2.5, 21, 0.1, 2.5, [u("medium potato", 220)]),
  food("Mashed potato", "g", 100, 1.8, 15, 4, 1.2, [u("portion", 180)]),
  food("Oven chips", "g", 200, 3.2, 30, 7, 2.5, [u("portion", 150)]),
  food("Sweet potato, baked", "g", 90, 2, 21, 0.2, 3.3, [u("medium sweet potato", 150)]),
  food("Pizza, margherita", "g", 250, 11, 32, 9, 2, [u("slice", 80), u("whole pizza", 400, "whole pizzas")]),

  // Vegetables
  food("Broccoli", "g", 34, 2.8, 7, 0.4, 2.6, [u("portion", 80)]),
  food("Carrot", "g", 41, 0.9, 9.6, 0.2, 2.8, [u("medium carrot", 60)]),
  food("Peas, boiled", "g", 79, 5.4, 14, 0.4, 5, [u("portion", 80)]),
  food("Sweetcorn", "g", 86, 3.3, 19, 1.4, 2.7, [u("portion", 80)]),
  food("Mushrooms", "g", 22, 3.1, 3.3, 0.3, 1, [u("portion", 80)]),
  food("Spinach", "g", 23, 2.9, 3.6, 0.4, 2.2, [u("handful", 30)]),
  food("Tomato", "g", 18, 0.9, 3.9, 0.2, 1.2, [u("medium tomato", 85), u("cherry tomato", 15)]),
  food("Onion", "g", 40, 1.1, 9.3, 0.1, 1.7, [u("medium onion", 150)]),
  food("Mixed salad leaves", "g", 17, 1.3, 3, 0.2, 1.5, [u("handful", 30), u("bowl", 80)]),
  food("Avocado", "g", 160, 2, 8.5, 15, 6.7, [u("half avocado", 70, "half avocados"), u("whole avocado", 140, "whole avocados")]),

  // Fruit
  food("Banana", "g", 89, 1.1, 23, 0.3, 2.6, [u("medium banana", 110)]),
  food("Apple", "g", 52, 0.3, 14, 0.2, 2.4, [u("medium apple", 150)]),
  food("Orange", "g", 47, 0.9, 12, 0.1, 2.4, [u("medium orange", 130)]),
  food("Grapes", "g", 69, 0.7, 18, 0.2, 0.9, [u("handful", 80)]),
  food("Strawberries", "g", 32, 0.7, 7.7, 0.3, 2, [u("handful", 80)]),
  food("Blueberries", "g", 57, 0.7, 14, 0.3, 2.4, [u("handful", 80)]),

  // Snacks and treats
  food("Almonds", "g", 579, 21, 22, 50, 12.5, [u("handful", 30)]),
  food("Mixed nuts", "g", 607, 20, 13, 53, 7, [u("handful", 30)]),
  food("Crisps, ready salted", "g", 530, 6, 53, 32, 4, [u("bag", 25), u("sharing bag", 150)]),
  food("Digestive biscuit", "g", 480, 7, 63, 21, 3.5, [u("biscuit", 15)]),
  food("Milk chocolate", "g", 530, 7.5, 57, 30, 2, [u("standard bar", 45), u("square", 6)]),
  food("Dark chocolate 70%", "g", 598, 7.8, 46, 43, 11, [u("square", 10)]),
  food("Protein bar", "g", 360, 30, 35, 12, 8, [u("bar", 60)]),
  food("Rice cakes", "g", 380, 8, 80, 3, 3, [u("rice cake", 8)]),
  food("Whey protein powder", "g", 380, 75, 8, 6, 0, [u("scoop", 30)]),

  // Sauces and extras
  food("Olive oil", "ml", 824, 0, 0, 92, 0, [u("tablespoon", 15), u("teaspoon", 5)]),
  food("Mayonnaise", "g", 680, 1, 1.3, 75, 0, [u("tablespoon", 15)]),
  food("Tomato ketchup", "g", 100, 1.2, 23, 0.1, 0.9, [u("tablespoon", 15)]),
  food("Sugar", "g", 400, 0, 100, 0, 0, [u("teaspoon", 4)]),
  food("Tomato soup, cream of", "g", 57, 0.9, 6.7, 3, 0.5, [u("half tin", 200, "half tins")]),

  // Drinks
  food("Tea with semi-skimmed milk", "ml", 7, 0.5, 0.7, 0.2, 0, [u("mug", 250)]),
  food("Coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Latte, semi-skimmed", "ml", 46, 3.2, 4.7, 1.7, 0, [u("regular", 350), u("small", 250)]),
  food("Orange juice", "ml", 45, 0.7, 10, 0.2, 0.2, [u("glass", 150)]),
  food("Cola", "ml", 42, 0, 10.6, 0, 0, [u("can", 330)]),
  food("Diet cola", "ml", 0.4, 0, 0, 0, 0, [u("can", 330)]),
  food("Beer, 4%", "ml", 43, 0.5, 3.6, 0, 0, [u("pint", 568), u("bottle", 330)]),
  food("Red wine", "ml", 85, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("White wine", "ml", 82, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("Spirits, 40%", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
];

/** "2 large eggs", "½ slice", "1.5 pints". */
export function formatQty(qty: number, unit: FoodUnit): string {
  const n = qty === 0.5 ? "½" : qty === 1.5 ? "1½" : qty === 2.5 ? "2½" : String(Math.round(qty * 100) / 100);
  return `${n} ${qty > 1 ? unit.plural : unit.name}`;
}
