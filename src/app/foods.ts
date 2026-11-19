import type { FiveADayKind, Nutrients } from "./types";
import CURATED from "./data/curated.json";

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
  /** Counts towards 5 a day: 80 g a portion, juice 150 ml. */
  fiveADay?: FiveADayKind;
  /** Alcohol by volume, per cent. */
  abv?: number;
  /** Caffeine, mg per 100 g or 100 ml. */
  caffeine?: number;
  /** CoFID food code when the values come from CoFID 2021; absent for the app's own estimates. */
  cofid?: string;
}

const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

function food(name: string, unit: "g" | "ml", kcal: number, protein: number, carbs: number, fat: number, fibre: number, units: FoodUnit[] = [], typical?: number): FoodItem {
  return { name, per: 100, unit, kcal, protein, carbs, fat, fibre, units, typical: typical ?? units[0]?.g ?? 100 };
}

/*
 * Everyday foods with household units. The nutrient figures below are the
 * app's original estimates; most are replaced with CoFID 2021 values at the
 * bottom of this file. Unit weights are typical edible weights.
 */
const BASE: FoodItem[] = [
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
  food("Scrambled eggs", "g", 160, 10, 1.5, 12, 0, [u("2-egg portion", 120)]),
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
  food("Chicken thigh, cooked, no skin", "g", 230, 25, 0, 14, 0, [u("thigh", 90)]),
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
  food("Avocado", "g", 160, 2, 8.5, 15, 6.7, [u("half", 70, "halves"), u("whole avocado", 140, "whole avocados")]),

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
  food("Plain (dark) chocolate", "g", 598, 7.8, 46, 43, 11, [u("square", 10)]),
  food("Protein bar", "g", 360, 30, 35, 12, 8, [u("bar", 60)]),
  food("Rice cakes", "g", 380, 8, 80, 3, 3, [u("rice cake", 8)]),
  food("Whey protein powder", "g", 380, 75, 8, 6, 0, [u("scoop", 30)]),

  // Sauces and extras
  food("Olive oil", "g", 899, 0, 0, 99.9, 0, [u("tablespoon", 14), u("teaspoon", 5)]),
  food("Mayonnaise", "g", 680, 1, 1.3, 75, 0, [u("tablespoon", 15)]),
  food("Tomato ketchup", "g", 100, 1.2, 23, 0.1, 0.9, [u("tablespoon", 15)]),
  food("Sugar", "g", 400, 0, 100, 0, 0, [u("teaspoon", 4)]),
  food("Tomato soup, cream of", "g", 57, 0.9, 6.7, 3, 0.5, [u("half tin", 200, "half tins")]),

  // Drinks
  food("Tea with semi-skimmed milk", "ml", 7, 0.5, 0.7, 0.2, 0, [u("mug", 250)]),
  food("Coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Filter coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Decaf coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Latte, semi-skimmed", "ml", 46, 3.2, 4.7, 1.7, 0, [u("regular", 350), u("small", 250)]),
  food("Orange juice", "ml", 45, 0.7, 10, 0.2, 0.2, [u("glass", 150)]),
  food("Cola", "ml", 42, 0, 10.6, 0, 0, [u("can", 330)]),
  food("Diet cola", "ml", 0.4, 0, 0, 0, 0, [u("can", 330)]),
  food("Energy drink", "ml", 45, 0, 11, 0, 0, [u("can", 250), u("large can", 500)]),
  food("Beer, bitter", "ml", 43, 0.5, 3.6, 0, 0, [u("pint", 568), u("bottle", 330)]),
  food("Red wine", "ml", 85, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("White wine", "ml", 82, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("Spirits, 40%", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Lager", "ml", 24, 0.3, 1.5, 0, 0, [u("pint", 568), u("can", 440), u("bottle", 330)]),
  food("Lager, premium", "ml", 29, 0.3, 2.4, 0, 0, [u("pint", 568), u("can", 440), u("bottle", 330)]),
  food("Cider", "ml", 36, 0, 2.6, 0, 0, [u("pint", 568), u("can", 440), u("bottle", 500)]),
  food("Stout", "ml", 37, 0.3, 3, 0, 0, [u("pint", 568), u("can", 440)]),
  food("Prosecco or sparkling wine", "ml", 84, 0.3, 5, 0, 0, [u("glass", 125), u("bottle", 750)]),
  food("Rosé wine", "ml", 79, 0.1, 2.5, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("Gin", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Vodka", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Whisky", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Rum", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Brandy", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  food("Tonic water", "ml", 22, 0, 5.9, 0, 0, [u("mixer", 150), u("can", 150), u("glass", 200)]),
  food("Port", "ml", 157, 0.1, 12, 0, 0, [u("glass", 50)]),
  food("Sherry", "ml", 116, 0.2, 5.9, 0, 0, [u("glass", 50)]),
  food("Cream liqueur", "ml", 305, 3, 22, 16, 0, [u("glass", 50)]),

  // Mixed drinks and cocktails: values come from scripts/mixed-drinks.json via build-curated.py.
  food("Gin and tonic", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Gin and tonic, double", "ml", 0, 0, 0, 0, 0, [u("drink", 200)]),
  food("Gin and slimline tonic", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and tonic", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and diet cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and lemonade", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and cranberry", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Vodka and orange", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Rum and cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Rum and diet cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Whisky and cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Whisky and diet cola", "ml", 0, 0, 0, 0, 0, [u("drink", 175)]),
  food("Bucks fizz", "ml", 0, 0, 0, 0, 0, [u("drink", 150)]),
  food("Mojito", "ml", 0, 0, 0, 0, 0, [u("drink", 185)]),
  food("Margarita", "ml", 0, 0, 0, 0, 0, [u("drink", 100)]),
  food("Cosmopolitan", "ml", 0, 0, 0, 0, 0, [u("drink", 100)]),
  food("Espresso martini", "ml", 0, 0, 0, 0, 0, [u("drink", 110)]),
  food("Bloody Mary", "ml", 0, 0, 0, 0, 0, [u("drink", 210)]),
  food("Long Island iced tea", "ml", 0, 0, 0, 0, 0, [u("drink", 215)]),
];

/*
 * Saturated fat, total sugars and salt per 100 g or 100 ml, 5 a day category
 * and alcohol strength. Same caveat as above: typical figures, shown as estimates.
 */
type Extra = [satFat: number, sugars: number, salt: number, fiveADay?: FiveADayKind | null, abv?: number];
const EXTRA: Record<string, Extra> = {
  "Porridge oats, dry": [1.5, 1, 0.01],
  Granola: [3, 20, 0.3],
  Muesli: [1.2, 16, 0.1],
  Cornflakes: [0.2, 8, 1.1],
  "Wholewheat biscuit cereal": [0.6, 4.4, 0.28],
  "Wholemeal bread": [0.5, 3, 1],
  "White bread": [0.4, 3.5, 1],
  "Bagel, plain": [0.4, 6, 1],
  Crumpet: [0.2, 2, 1.2],
  "Tortilla wrap": [2.5, 2.5, 1.2],
  "Burger bun": [1, 6, 1.1],
  Egg: [2.6, 0.2, 0.35],
  "Egg, fried": [3.5, 0.2, 0.4],
  "Scrambled eggs": [5, 1.5, 0.6],
  Butter: [52, 0.6, 1.5],
  Jam: [0, 60, 0.03],
  Honey: [0, 82, 0.01],
  "Peanut butter": [9, 6, 1],
  "Semi-skimmed milk": [1.1, 4.8, 0.1],
  "Skimmed milk": [0.1, 5, 0.1],
  "Whole milk": [2.3, 4.7, 0.1],
  "Greek yoghurt, 0% fat": [0.1, 3.6, 0.1],
  "Greek-style yoghurt, full fat": [6.5, 5, 0.1],
  "Cheddar cheese": [22, 0.1, 1.8],
  "Cottage cheese": [2.7, 3.4, 0.7],
  "Single cream": [12, 3.9, 0.1],
  "Vanilla ice cream": [6.5, 22, 0.15],
  "Pork sausage, grilled": [8.5, 2, 1.8],
  "Bacon, back rasher, grilled": [8, 0, 3.5],
  "Ham, sliced": [1.1, 1, 2],
  "Chicken breast, cooked": [1, 0, 0.18],
  "Chicken thigh, cooked, no skin": [4, 0, 0.25],
  "Beef mince 5% fat, cooked": [3.2, 0, 0.2],
  "Turkey mince, cooked": [1.8, 0, 0.2],
  "Beef burger, grilled": [7.5, 1, 1],
  "Sirloin steak, grilled": [3.8, 0, 0.15],
  "Pork chop, grilled": [4.3, 0, 0.18],
  "Salmon fillet, cooked": [2.5, 0, 0.15],
  "Cod fillet, baked": [0.2, 0, 0.3],
  "Tuna, tinned in water": [0.3, 0, 0.6],
  "Prawns, cooked": [0.1, 0, 1],
  "Fish fingers, grilled": [1, 1.5, 0.8],
  "Tofu, firm": [1.3, 0.5, 0.02],
  "Baked beans": [0.1, 4.7, 0.6, "pulses"],
  "Chickpeas, tinned, drained": [0.3, 0.5, 0.3, "pulses"],
  "Kidney beans, tinned, drained": [0.1, 1, 0.3, "pulses"],
  "Lentils, cooked": [0.1, 0.8, 0.01, "pulses"],
  Hummus: [2, 0.8, 0.9],
  "White rice, cooked": [0.1, 0, 0],
  "Brown rice, cooked": [0.2, 0.3, 0],
  "Pasta, cooked": [0.2, 0.6, 0],
  "Egg noodles, cooked": [0.5, 0.5, 0.1],
  "Couscous, cooked": [0.1, 0.1, 0],
  "Quinoa, cooked": [0.2, 0.9, 0.01],
  "Potato, boiled": [0, 0.8, 0],
  "Jacket potato": [0, 1, 0.02],
  "Mashed potato": [2.5, 1.2, 0.4],
  "Oven chips": [0.7, 0.5, 0.3],
  "Sweet potato, baked": [0.1, 6.5, 0.1, "fv"],
  "Pizza, margherita": [4.5, 3.5, 1.2],
  Broccoli: [0.1, 1.7, 0.03, "fv"],
  Carrot: [0, 4.7, 0.1, "fv"],
  "Peas, boiled": [0.1, 4, 0, "fv"],
  Sweetcorn: [0.2, 4.5, 0.01, "fv"],
  Mushrooms: [0.1, 0.2, 0.01, "fv"],
  Spinach: [0.1, 0.4, 0.2, "fv"],
  Tomato: [0, 2.6, 0.01, "fv"],
  Onion: [0, 4.2, 0.01, "fv"],
  "Mixed salad leaves": [0, 1.5, 0.05, "fv"],
  Avocado: [2.1, 0.7, 0.02, "fv"],
  Banana: [0.1, 12, 0, "fv"],
  Apple: [0, 10, 0, "fv"],
  Orange: [0, 9, 0, "fv"],
  Grapes: [0.1, 16, 0, "fv"],
  Strawberries: [0, 4.9, 0, "fv"],
  Blueberries: [0, 10, 0, "fv"],
  Almonds: [3.8, 4.4, 0],
  "Mixed nuts": [6, 4, 0.03],
  "Crisps, ready salted": [2.5, 0.5, 1.3],
  "Digestive biscuit": [10, 17, 1.1],
  "Milk chocolate": [18, 56, 0.2],
  "Plain (dark) chocolate": [25, 24, 0.02],
  "Protein bar": [6, 5, 0.5],
  "Rice cakes": [0.6, 0.5, 0.3],
  "Whey protein powder": [3, 6, 0.4],
  "Olive oil": [14, 0, 0],
  Mayonnaise: [6, 1.3, 1.5],
  "Tomato ketchup": [0, 22, 1.8],
  Sugar: [0, 100, 0],
  "Tomato soup, cream of": [0.3, 5, 0.7],
  "Tea with semi-skimmed milk": [0.1, 0.7, 0],
  "Coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Filter coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Decaf coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Latte, semi-skimmed": [1.1, 4.7, 0.1],
  "Energy drink": [0, 11, 0.1],
  "Orange juice": [0, 9, 0, "juice"],
  Cola: [0, 10.6, 0],
  "Diet cola": [0, 0, 0.02],
  "Beer, bitter": [0, 0, 0, null, 4],
  "Red wine": [0, 0.6, 0, null, 13],
  "White wine": [0, 1, 0, null, 12.5],
  "Spirits, 40%": [0, 0, 0, null, 40],
};

/*
 * Caffeine, mg per 100 g or 100 ml. Approximate figures that match the NHS
 * rule of thumb (mug of instant coffee about 100 mg, filter coffee 140 mg,
 * tea 75 mg, can of cola 40 mg, energy drink 80 mg per 250 ml, 50 g plain
 * chocolate under 25 mg, milk chocolate under 10 mg). Not verified.
 */
const CAFFEINE: Record<string, number> = {
  "Coffee with semi-skimmed milk": 40,
  "Filter coffee with semi-skimmed milk": 56,
  "Decaf coffee with semi-skimmed milk": 1,
  "Latte, semi-skimmed": 25,
  "Tea with semi-skimmed milk": 30,
  Cola: 12,
  "Diet cola": 13,
  "Energy drink": 32,
  "Plain (dark) chocolate": 50,
  "Milk chocolate": 20,
};

type CofidValues = { ml?: number; code: string; kcal: number; protein: number | null; carbs: number | null; fat: number | null; fibre: number | null; satFat: number | null; sugars: number | null; salt: number | null; abv: number | null };
const COFID = CURATED as Record<string, CofidValues>;

/*
 * Everyday foods: units and categories from this file, nutrient values from
 * CoFID 2021 where scripts/curated-map.json maps the food to a CoFID code.
 * The estimates above remain only for foods CoFID doesn't cover.
 */
export const FOOD_DB: FoodItem[] = BASE.map((f) => {
  const x = EXTRA[f.name];
  const caffeine = CAFFEINE[f.name];
  let item: FoodItem = caffeine ? { ...f, caffeine } : f;
  if (x) {
    const [satFat, sugars, salt, fiveADay, abv] = x;
    item = { ...item, satFat, sugars, salt, ...(fiveADay ? { fiveADay } : {}), ...(abv ? { abv } : {}) };
  }
  const c = COFID[f.name];
  if (c) {
    const keep = (v: number | null, fallback: number) => (v === null ? fallback : v);
    item = {
      ...item,
      ...(c.code !== "mix" ? { cofid: c.code } : {}),
      kcal: c.kcal,
      protein: keep(c.protein, item.protein),
      carbs: keep(c.carbs, item.carbs),
      fat: keep(c.fat, item.fat),
      fibre: keep(c.fibre, item.fibre),
      satFat: c.satFat ?? item.satFat,
      sugars: c.sugars ?? item.sugars,
      salt: c.salt ?? item.salt,
      ...(c.abv ? { abv: c.abv } : {}),
    };
  }
  return item;
});

/** 5 a day portions, alcohol units and caffeine for an amount in grams or millilitres. */
export function extrasFor(food: { fiveADay?: FiveADayKind; abv?: number; caffeine?: number }, amount: number) {
  const out: { fiveADay?: number; fiveADayKind?: FiveADayKind; alcoholUnits?: number; caffeineMg?: number } = {};
  if (food.caffeine) out.caffeineMg = Math.round((amount * food.caffeine) / 100);
  if (food.fiveADay) {
    out.fiveADayKind = food.fiveADay;
    out.fiveADay = Math.round((amount / (food.fiveADay === "juice" ? 150 : 80)) * 10) / 10;
  }
  if (food.abv) out.alcoholUnits = Math.round(((amount * food.abv) / 1000) * 10) / 10;
  return out;
}

/** "2 large eggs", "½ slice", "1.5 pints". */
export function formatQty(qty: number, unit: FoodUnit): string {
  const n = qty === 0.5 ? "½" : qty === 1.5 ? "1½" : qty === 2.5 ? "2½" : String(Math.round(qty * 100) / 100);
  return `${n} ${qty > 1 ? unit.plural : unit.name}`;
}
