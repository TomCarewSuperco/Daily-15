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
  // Made-up porridge. Oat milk is the app's estimate: water porridge plus a standard oat drink.
  food("Porridge, made with water", "g", 47, 1.4, 8.8, 1, 1, [u("bowl", 200), u("small bowl", 150)]),
  food("Porridge, made with milk and water", "g", 72, 3.1, 11.2, 1.9, 1, [u("bowl", 200), u("small bowl", 150)]),
  food("Porridge, made with semi-skimmed milk", "g", 84, 4.6, 12.1, 2.3, 1, [u("bowl", 200), u("small bowl", 150)]),
  food("Porridge, made with whole milk", "g", 112, 4.9, 13.3, 4.7, 0.9, [u("bowl", 200), u("small bowl", 150)]),
  food("Porridge, made with oat milk", "g", 87, 2.3, 14.7, 2.3, 1.7, [u("bowl", 200), u("small bowl", 150)]),
  food("Granola", "g", 450, 10, 60, 18, 7, [u("bowl", 45)]),
  // Branded: values from the pack label (per 100 g).
  food("Bio&Me Super Nutty Granola", "g", 402, 11, 55, 12, 15, [u("serving", 50), u("tablespoon", 10)]),
  food("Muesli", "g", 360, 10, 66, 6, 7, [u("bowl", 45)]),
  food("Cornflakes", "g", 378, 7, 84, 0.9, 3, [u("bowl", 30)]),
  food("Wholewheat biscuit cereal", "g", 362, 12, 69, 2, 10, [u("biscuit", 19)]),
  food("Wholemeal bread", "g", 240, 10, 41, 2.5, 7, [u("slice", 40), u("thick slice", 50)]),
  food("White bread", "g", 250, 9, 47, 2, 2.7, [u("slice", 40), u("thick slice", 50)]),
  food("Malted wheat bread", "g", 237, 9.6, 47.4, 2.3, 5.3, [u("slice", 40), u("thick slice", 50)]),
  food("Seeded bread", "g", 270, 9.9, 43.8, 7.4, 6.2, [u("slice", 44), u("thick slice", 55)]),
  // Rye is the app's estimate from typical UK labels.
  food("Rye bread", "g", 210, 6.5, 40, 1.5, 7, [u("slice", 45)]),
  // Toast weighs less than the bread it came from (water lost), so a slice keeps the same calories.
  // Seeded and sourdough toast, and buttered toast (7 g butter a slice), are the app's estimates.
  food("White toast", "g", 267, 9.7, 56.2, 2, 3, [u("slice", 33), u("thick slice", 41)]),
  food("Wholemeal toast", "g", 255, 11.2, 49.2, 2.9, 8.2, [u("slice", 34), u("thick slice", 43)]),
  food("Seeded toast", "g", 319, 11.7, 51.7, 8.7, 7.3, [u("slice", 37), u("thick slice", 47)]),
  food("Sourdough toast", "g", 283, 10.6, 54.3, 1.8, 3.5, [u("slice", 42)]),
  food("White toast, buttered", "g", 350, 8.1, 46.4, 16, 2.5, [u("slice", 40), u("thick slice", 48)]),
  food("Wholemeal toast, buttered", "g", 339, 9.4, 40.8, 16.4, 6.8, [u("slice", 41), u("thick slice", 50)]),
  food("Bagel, plain", "g", 260, 10, 50, 1.6, 2.5, [u("bagel", 85)]),
  food("Crumpet", "g", 180, 6, 37, 0.7, 2, [u("crumpet", 55)]),
  // Not in CoFID 2021: typical UK supermarket label values.
  food("Pain au chocolat", "g", 414, 7.8, 44, 22, 2.4, [u("pain au chocolat", 60, "pains au chocolat"), u("mini", 25, "minis")]),
  food("Pain aux raisins", "g", 300, 6, 44, 11, 2, [u("pastry", 100, "pastries")]),
  food("Cinnamon swirl", "g", 380, 6.5, 45, 19, 2, [u("swirl", 90)]),
  food("Tortilla wrap", "g", 300, 8.5, 50, 7, 3, [u("wrap", 62)]),
  food("Burger bun", "g", 265, 9, 47, 4.5, 2.5, [u("bun", 60)]),
  food("Egg", "g", 143, 12.6, 0.7, 9.5, 0, [u("large egg", 60), u("medium egg", 50)]),
  food("Egg, fried", "g", 196, 13.6, 0.8, 15, 0, [u("egg", 60)]),
  food("Egg, poached", "g", 149, 13.3, 0, 10.6, 0, [u("egg", 60)]),
  food("Scrambled eggs, with butter and milk", "g", 160, 10, 1.5, 12, 0, [u("2-egg portion", 120)]),
  food("Scrambled eggs, no butter or milk", "g", 152, 14.6, 0, 10.4, 0, [u("2-egg portion", 105)]),
  food("Butter", "g", 717, 0.9, 0.1, 81, 0, [u("thin spread", 5), u("spread", 10), u("thick spread", 15), u("knob", 10)]),
  food("Jam", "g", 250, 0.4, 61, 0, 0.8, [u("teaspoon", 10)]),
  food("Honey", "g", 304, 0.3, 82, 0, 0, [u("teaspoon", 7)]),
  food("Peanut butter", "g", 588, 25, 20, 50, 6, [u("tablespoon", 15), u("teaspoon", 5)]),

  // Dairy
  food("Semi-skimmed milk", "ml", 47, 3.5, 4.8, 1.7, 0, [u("glass", 200), u("splash", 30, "splashes"), u("pint", 568)]),
  food("Skimmed milk", "ml", 35, 3.5, 5, 0.1, 0, [u("glass", 200), u("splash", 30, "splashes"), u("pint", 568)]),
  food("Whole milk", "ml", 64, 3.4, 4.7, 3.6, 0, [u("glass", 200), u("splash", 30, "splashes"), u("pint", 568)]),
  // Plant milks. Oat and almond are typical UK unsweetened label values (estimates); soya is CoFID.
  food("Oat milk", "ml", 46, 1, 6.7, 1.5, 0.8, [u("glass", 200), u("splash", 30, "splashes")]),
  food("Soya milk, unsweetened", "ml", 26, 2.4, 0.5, 1.6, 0.5, [u("glass", 200), u("splash", 30, "splashes")]),
  food("Almond milk, unsweetened", "ml", 13, 0.4, 0, 1.1, 0.4, [u("glass", 200), u("splash", 30, "splashes")]),
  // Yoghurts: by the spoonful from a tub, a bowl, or a pot. Fat % in the name so '10%' finds it.
  food("Greek yoghurt, 0% fat", "g", 57, 10, 3.6, 0.2, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Greek-style yoghurt, full fat (10%)", "g", 130, 5, 5, 10, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Natural yoghurt, whole milk (3%)", "g", 79, 5.7, 7.8, 3, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Natural yoghurt, low fat (1%)", "g", 57, 4.8, 7.8, 1, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Fruit yoghurt, low fat", "g", 78, 4.2, 13.7, 1.1, 0.3, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Greek-style yoghurt, fruit", "g", 137, 4.8, 11.2, 8.4, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Soya yoghurt, fruit", "g", 72, 3.3, 11, 2, 1, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Cheddar cheese", "g", 416, 25, 0.1, 35, 0, [u("slice", 20), u("matchbox-size piece", 30, "matchbox-size pieces")]),
  food("Cottage cheese", "g", 98, 11, 3.4, 4.3, 0, [u("tablespoon", 30), u("half pot", 150, "half pots")]),
  food("Single cream", "g", 193, 2.6, 3.9, 19, 0, [u("tablespoon", 15)]),
  food("Vanilla ice cream", "g", 200, 3.5, 24, 10, 0.5, [u("scoop", 50)]),

  // Meat, fish and alternatives
  food("Pork sausage, grilled", "g", 290, 14, 9, 23, 0.9, [u("sausage", 45), u("chipolata", 20)]),
  // Bakery sausage rolls: CoFID for the pork one; vegan is the app's estimate from typical UK bakery labels.
  food("Sausage roll", "g", 352, 8.4, 27, 24.1, 3.4, [u("sausage roll (bakery)", 100), u("mini sausage roll", 20), u("large sausage roll", 150)]),
  food("Vegan sausage roll", "g", 310, 10, 27, 18, 3, [u("sausage roll (bakery)", 100), u("mini sausage roll", 20)]),
  food("Premium pork sausage, grilled", "g", 275, 19, 2.3, 21.1, 0.6, [u("sausage", 45), u("chipolata", 20)]),
  food("Reduced-fat pork sausage, grilled", "g", 160, 16.2, 10.7, 6.1, 2.5, [u("sausage", 45), u("chipolata", 20)]),
  food("Beef sausage, grilled", "g", 265, 17.2, 11, 17.2, 1.6, [u("sausage", 45), u("chipolata", 20)]),
  // Chicken or turkey and venison: the app's estimates from typical UK supermarket labels.
  food("Chicken or turkey sausage, grilled", "g", 170, 17, 5, 9, 1, [u("sausage", 45), u("chipolata", 20)]),
  food("Venison sausage, grilled", "g", 165, 16, 7, 8, 1, [u("sausage", 45), u("chipolata", 20)]),
  food("Vegetarian sausage, grilled", "g", 179, 14.9, 9.2, 9.4, 2.6, [u("sausage", 45), u("chipolata", 20)]),
  food("Bacon, back rasher, grilled", "g", 287, 23, 0, 22, 0, [u("rasher", 25)]),
  food("Ham, sliced", "g", 107, 18, 1.4, 3.3, 0, [u("slice", 15)]),
  // Kinds of ham slice. Wafer-thin and thick-cut are the same cooked ham, cut differently.
  food("Ham, wafer-thin", "g", 107, 18, 1.4, 3.3, 0, [u("slice", 6)]),
  food("Ham, thick-cut", "g", 107, 18, 1.4, 3.3, 0, [u("slice", 30)]),
  food("Ham, gammon joint, carved", "g", 204, 23.3, 0, 12.3, 0, [u("slice", 35)]),
  // The app's estimate from typical UK labels.
  food("Parma or Serrano ham", "g", 240, 27, 0.3, 15, 0, [u("slice", 8)]),
  // Salami and cured sausage by the slice: CoFID where it exists; pepperoni and bresaola are estimates from typical UK labels.
  food("Salami, pre-sliced", "g", 438, 20.9, 0.5, 39.2, 0.4, [u("slice", 5), u("portion (6 slices)", 30, "portions (6 slices)")]),
  food("Salami, thick-cut or deli", "g", 438, 20.9, 0.5, 39.2, 0.4, [u("slice", 10), u("chunk", 20)]),
  food("Pepperoni", "g", 480, 22, 2, 43, 0, [u("slice", 2), u("handful (10 slices)", 20, "handfuls (10 slices)")]),
  food("Chorizo, sliced", "g", 395, 24, 2.4, 32.2, 1, [u("slice", 5), u("chunk", 15)]),
  food("Salami snack stick", "g", 504, 25.1, 1.9, 44, 0.5, [u("stick", 22)]),
  food("Bresaola", "g", 150, 32, 0.5, 2.5, 0, [u("slice", 7)]),
  // Dried meat snacks: the app's estimates from typical UK labels. Jerky is usually sweetened; biltong isn't.
  food("Biltong", "g", 260, 52, 3, 4.5, 0, [u("handful", 15), u("snack bag", 30), u("large bag", 70)]),
  food("Beef jerky", "g", 270, 40, 15, 5, 0.5, [u("handful", 15), u("snack bag", 25), u("large bag", 70)]),
  // Roast chicken by the part, skin on or removed (CoFID; thigh and leg without skin use casseroled values, the nearest CoFID has).
  food("Chicken breast, roast, skin on", "g", 173, 28.9, 0, 6.4, 0, [u("slice", 30), u("half breast", 75, "half breasts"), u("breast", 150)]),
  food("Chicken breast, roast, skin removed", "g", 153, 30.2, 0, 3.6, 0, [u("slice", 30), u("half breast", 75, "half breasts"), u("breast", 150)]),
  food("Chicken thigh, roast, skin on", "g", 233, 21.5, 0, 16.3, 0, [u("thigh", 80)]),
  food("Chicken thigh, roast, skin removed", "g", 180, 25.6, 0, 8.6, 0, [u("thigh", 80)]),
  food("Chicken drumstick, roast, skin on", "g", 185, 25.8, 0, 9.1, 0, [u("drumstick", 50)]),
  food("Chicken drumstick, roast, skin removed", "g", 152, 26.6, 0, 5.1, 0, [u("drumstick", 50)]),
  food("Chicken leg, roast, skin on", "g", 236, 20.9, 0, 16.9, 0, [u("leg (thigh and drumstick)", 130, "legs (thigh and drumstick)")]),
  food("Chicken leg, roast, skin removed", "g", 176, 25.0, 0, 8.4, 0, [u("leg (thigh and drumstick)", 130, "legs (thigh and drumstick)")]),
  food("Chicken wing, roast, skin on", "g", 226, 24.8, 0, 14.1, 0, [u("wing", 25)]),
  food("Chicken wing, roast, skin removed", "g", 164, 26.9, 0, 6.3, 0, [u("wing", 25)]),
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
  food("White rice, cooked", "g", 130, 2.7, 28, 0.3, 0.4, [u("heaped tablespoon", 30), u("portion", 180), u("takeaway portion", 300)]),
  food("Brown rice, cooked", "g", 123, 2.7, 26, 1, 1.6, [u("heaped tablespoon", 30), u("portion", 180), u("takeaway portion", 300)]),
  food("Microwave rice, pouch", "g", 161, 4.1, 33.9, 1.9, 1.1, [u("heaped tablespoon", 30), u("portion", 180), u("pouch", 250, "pouches"), u("half pouch", 125, "half pouches")]),
  food("Pilau rice", "g", 134, 2.5, 24.3, 3.7, 0.6, [u("heaped tablespoon", 30), u("portion", 180), u("takeaway portion", 300)]),
  food("Egg fried rice, takeaway", "g", 186, 4.3, 33.3, 4.9, 1.1, [u("heaped tablespoon", 30), u("portion", 180), u("takeaway portion", 300)]),
  food("Pasta, cooked", "g", 158, 5.8, 31, 0.9, 1.8, [u("portion", 180), u("bowl", 230), u("side portion", 120)]),
  food("Wholewheat pasta, cooked", "g", 134, 5.2, 27.5, 1.1, 4.2, [u("portion", 180), u("bowl", 230), u("side portion", 120)]),
  food("Fresh egg pasta, cooked", "g", 152, 5.8, 30.6, 1.6, 2, [u("portion", 180), u("bowl", 230), u("side portion", 120)]),
  // The app's estimate: dried pasta (CoFID 11-1129) with about a tablespoon of butter or oil per two portions.
  food("Pasta, cooked, with butter or oil", "g", 187, 5.4, 36.2, 3.4, 2.4, [u("portion", 180), u("bowl", 230), u("side portion", 120)]),
  food("Egg noodles, cooked", "g", 138, 4.5, 25, 2, 1.2, [u("portion", 180)]),
  food("Egg noodles, stir-fried", "g", 244, 5, 30.5, 12.2, 2, [u("portion", 180)]),
  food("Rice noodles, cooked", "g", 89, 1.9, 21.3, 0.2, 1.1, [u("portion", 180)]),
  food("Couscous, cooked", "g", 112, 3.8, 23, 0.2, 1.4, [u("portion", 150)]),
  food("Quinoa, cooked", "g", 120, 4.4, 21, 1.9, 2.8, [u("portion", 150)]),
  food("Potato, boiled", "g", 87, 1.9, 20, 0.1, 1.8, [u("medium potato", 175, "medium potatoes")]),
  food("Jacket potato", "g", 93, 2.5, 21, 0.1, 2.5, [u("medium potato", 220, "medium potatoes")]),
  food("New potatoes, boiled", "g", 68, 1.8, 14.9, 0.1, 1.8, [u("new potato", 40, "new potatoes"), u("portion", 175)]),
  food("Potato wedges, homemade", "g", 145, 2.9, 26.5, 3.8, 3, [u("wedge", 25), u("portion", 150)]),
  food("Mashed potato", "g", 100, 1.8, 15, 4, 1.2, [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)]),
  // Other ways of making mash, worked out from boiled potato (CoFID 13-490) plus what goes in.
  food("Mashed potato, plain", "g", 74, 1.8, 17.5, 0.1, 1.6, [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)]),
  food("Mashed potato, with milk", "g", 71, 2, 16, 0.3, 1.4, [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)]),
  food("Mashed potato, with olive oil", "g", 124, 1.7, 16.5, 6.1, 1.5, [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)]),
  food("Mashed potato, with butter and cream", "g", 192, 1.7, 14, 14.7, 1.3, [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)]),
  food("Oven chips", "g", 200, 3.2, 30, 7, 2.5, [u("side portion", 100), u("portion", 150), u("large portion", 250)]),
  // Ways of cooking chips and roast potatoes. Air-fried values are the app's estimates:
  // boiled potato (CoFID 13-490) losing about a fifth of its water, plus about 2 g of oil per 100 g.
  food("Chips, air-fried", "g", 130, 2.8, 26, 2.4, 2.6, [u("side portion", 100), u("portion", 150), u("large portion", 250)]),
  food("Chips, homemade, deep-fried", "g", 202, 3.6, 34.1, 6.7, 3.4, [u("side portion", 100), u("portion", 150), u("large portion", 250)]),
  food("Chip shop chips", "g", 214, 3.5, 33.2, 8.4, 3.2, [u("chip shop portion", 300), u("half portion", 150)]),
  food("Fast-food fries", "g", 290, 3.5, 39.7, 14.2, 3.8, [u("medium fries", 115, "medium fries"), u("small fries", 80, "small fries"), u("large fries", 150, "large fries")]),
  food("Roast potatoes", "g", 161, 2.6, 26.4, 5.7, 2.7, [u("roast potato", 50, "roast potatoes"), u("portion of 4", 200, "portions of 4")]),
  food("Roast potatoes, air-fried", "g", 111, 2.3, 21.9, 2.1, 2, [u("roast potato", 50, "roast potatoes"), u("portion of 4", 200, "portions of 4")]),
  food("Roast potatoes, in goose fat or lard", "g", 161, 2.6, 26.4, 5.7, 2.7, [u("roast potato", 50, "roast potatoes"), u("portion of 4", 200, "portions of 4")]),
  food("Roast potatoes, frozen, oven-cooked", "g", 157, 2.5, 23.4, 6.6, 3, [u("roast potato", 50, "roast potatoes"), u("portion of 4", 200, "portions of 4")]),
  food("Sweet potato, baked", "g", 90, 2, 21, 0.2, 3.3, [u("medium sweet potato", 150, "medium sweet potatoes")]),
  food("Pizza, margherita", "g", 250, 11, 32, 9, 2, [u("slice", 80), u("whole pizza", 400, "whole pizzas")]),

  // Vegetables
  food("Broccoli", "g", 34, 2.8, 7, 0.4, 2.6, [u("floret", 15), u("5-a-day portion (about 6 florets)", 80, "5-a-day portions")]),
  food("Carrots", "g", 41, 0.9, 9.6, 0.2, 2.8, [u("medium carrot", 60), u("5-a-day portion", 80), u("heaped tablespoon, sliced", 27, "heaped tablespoons, sliced")]),
  food("Peas, boiled", "g", 79, 5.4, 14, 0.4, 5, [u("heaped tablespoon", 27), u("5-a-day portion (3 heaped tbsp)", 80, "5-a-day portions")]),
  food("Sweetcorn", "g", 86, 3.3, 19, 1.4, 2.7, [u("heaped tablespoon", 27), u("5-a-day portion (3 heaped tbsp)", 80, "5-a-day portions")]),
  food("Mushrooms", "g", 22, 3.1, 3.3, 0.3, 1, [u("mushroom", 15), u("handful (4)", 60, "handfuls (4)"), u("5-a-day portion", 80)]),
  food("Spinach", "g", 23, 2.9, 3.6, 0.4, 2.2, [u("handful", 30)]),
  // Everyday vegetables under their plain names, measured as served (CoFID values).
  food("Courgette", "g", 15, 1.3, 1.8, 0.3, 0.8, [u("slice", 10), u("half courgette", 100), u("courgette", 200)]),
  food("Aubergine", "g", 14, 0.7, 1.8, 0.5, 1.8, [u("slice", 25), u("half aubergine", 125), u("aubergine", 250)]),
  food("Corn on the cob", "g", 67, 3.6, 9.5, 1.9, 5.1, [u("cob", 100), u("half cob", 50, "half cobs"), u("mini cob", 30)]),
  food("Leeks", "g", 16, 1.2, 2.5, 0.2, 1.9, [u("half leek", 75, "half leeks"), u("leek", 150), u("5-a-day portion", 80)]),
  food("Green beans", "g", 26, 2.1, 4, 0.3, 4.1, [u("handful", 40), u("5-a-day portion", 80)]),
  food("Tenderstem broccoli", "g", 34, 4.1, 3.5, 0.5, 3.8, [u("stem", 15), u("5-a-day portion (5 stems)", 80, "5-a-day portions")]),
  food("Parsnip", "g", 66, 1.2, 14.7, 0.7, 2.6, [u("parsnip", 120), u("half parsnip", 60, "half parsnips")]),
  food("Cabbage", "g", 17, 1.1, 2.8, 0.2, 2.2, [u("serving spoon", 40), u("5-a-day portion (2 serving spoons)", 80, "5-a-day portions")]),
  food("Lettuce", "g", 11, 1.2, 1.4, 0.1, 1.5, [u("leaf", 10), u("handful", 30)]),
  food("Pak choi", "g", 14, 1.5, 1.9, 0.1, 2, [u("head", 100), u("half head", 50, "half heads")]),
  food("Beansprouts", "g", 31, 2.9, 4, 0.5, 1.5, [u("handful", 40), u("5-a-day portion", 80)]),
  food("Edamame beans", "g", 142, 12.2, 6.5, 7.6, 5.9, [u("handful", 40), u("5-a-day portion", 80)]),
  food("Tomato", "g", 18, 0.9, 3.9, 0.2, 1.2, [u("medium tomato", 85, "medium tomatoes"), u("5-a-day portion", 80)]),
  food("Cherry tomatoes", "g", 22, 1.1, 3.6, 0.5, 1.3, [u("cherry tomato", 15, "cherry tomatoes"), u("5-a-day portion", 80)]),
  // Salad vegetables by the slice or piece people actually use (CoFID values below).
  food("Cucumber", "g", 14, 1, 1.2, 0.6, 0.7, [u("slice", 7), u("few slices (5)", 35, "few slices (5)"), u("5-a-day portion", 80), u("half cucumber", 160, "half cucumbers")]),
  food("Red pepper", "g", 21, 0.8, 4.3, 0.2, 2.2, [u("slice", 10), u("half pepper", 80, "half peppers"), u("whole pepper", 160, "whole peppers")]),
  food("Green pepper", "g", 15, 0.8, 2.6, 0.3, 1.6, [u("slice", 10), u("half pepper", 80, "half peppers"), u("whole pepper", 160, "whole peppers")]),
  food("Celery", "g", 9, 0.5, 1.4, 0.1, 1.5, [u("stick", 40), u("5-a-day portion (2 sticks)", 80, "5-a-day portions (2 sticks)")]),
  food("Radishes", "g", 12, 0.7, 1.4, 0.4, 1.1, [u("radish", 8, "radishes"), u("5-a-day portion (10)", 80, "5-a-day portions (10)")]),
  food("Spring onions", "g", 23, 2, 3, 0.5, 1.5, [u("spring onion", 15), u("tablespoon, chopped", 6, "tablespoons, chopped")]),
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
  // Not in CoFID 2021: typical UK supermarket label values.
  food("Caesar dressing", "g", 430, 2.5, 4, 44, 0.2, [u("tablespoon", 15)]),
  food("Vinaigrette", "g", 335, 0.3, 11.7, 32.2, 0.5, [u("tablespoon", 15)]),
  food("Oil and lemon dressing", "g", 652, 0.1, 3.4, 72.4, 0.1, [u("tablespoon", 15)]),
  food("Fat-free dressing", "g", 33, 0.1, 8.7, 0, 0.5, [u("tablespoon", 15)]),
  food("Salad cream", "g", 326, 1.5, 21.2, 26.7, 0.5, [u("tablespoon", 15)]),
  food("Yogurt dressing", "g", 72, 5.3, 7.1, 2.7, 0.1, [u("tablespoon", 15)]),
  // The app's estimate from typical UK labels.
  food("Balsamic glaze", "g", 250, 0.5, 55, 0, 0, [u("tablespoon", 15), u("drizzle", 5)]),
  food("Sweet chilli sauce", "g", 220, 0.4, 52, 0.3, 1, [u("tablespoon", 15)]),
  food("Sriracha", "g", 105, 1.9, 22, 0.9, 1.5, [u("teaspoon", 5), u("tablespoon", 15)]),
  food("Tomato ketchup", "g", 100, 1.2, 23, 0.1, 0.9, [u("tablespoon", 15)]),
  food("Sugar", "g", 400, 0, 100, 0, 0, [u("teaspoon", 4)]),
  food("Tomato soup, cream of", "g", 57, 0.9, 6.7, 3, 0.5, [u("half tin", 200, "half tins")]),
  // Chicken broth by how it's made. Ready-made stock is CoFID; the rest are the app's estimates
  // (typical stock-cube and bone-broth labels; homemade with the fat skimmed off or left in).
  food("Chicken broth, stock cube or pot", "ml", 7, 0.3, 0.6, 0.3, 0, [u("mug", 250), u("bowl", 300), u("cup", 200)]),
  food("Chicken stock, ready-made", "ml", 12, 2.3, 0.2, 0.2, 0.3, [u("mug", 250), u("bowl", 300), u("cup", 200)]),
  food("Chicken bone broth, shop-bought", "ml", 30, 6.5, 0.5, 0.4, 0, [u("mug", 250), u("bowl", 300), u("cup", 200)]),
  food("Chicken broth, homemade, fat skimmed", "ml", 15, 2.5, 0.5, 0.4, 0, [u("mug", 250), u("bowl", 300), u("cup", 200)]),
  food("Chicken broth, homemade, fat left in", "ml", 40, 3, 0.5, 3, 0, [u("mug", 250), u("bowl", 300), u("cup", 200)]),

  // Newer and international foods not in CoFID 2021: typical UK label or recipe values (estimates).
  food("Kimchi", "g", 25, 1.6, 3.5, 0.4, 2.0, [u("tablespoon", 20), u("side portion", 50)]),
  food("Kombucha", "ml", 18, 0, 4.2, 0, 0, [u("can", 250), u("bottle", 330)]),
  food("Kefir, milk drink", "ml", 50, 3.4, 4.4, 1.8, 0, [u("glass", 250), u("small bottle", 330, "small bottles")]),
  food("Skyr, natural", "g", 63, 11, 4, 0.2, 0, [u("heaped tablespoon", 30), u("small bowl", 150), u("pot", 125)]),
  food("Sourdough bread", "g", 240, 9, 46, 1.5, 3, [u("slice", 50)]),
  food("Brioche bun", "g", 340, 8.5, 50, 11, 2, [u("bun", 50)]),
  food("Focaccia", "g", 290, 7.5, 42, 10, 2.2, [u("slice", 70)]),
  food("Chia seeds", "g", 486, 17, 8, 31, 34, [u("tablespoon", 12)]),
  food("Almond butter", "g", 620, 24, 6, 55, 8, [u("tablespoon", 15)]),
  food("Cashew butter", "g", 600, 18, 23, 49, 3, [u("tablespoon", 15)]),
  food("Labneh", "g", 170, 6, 4, 14, 0, [u("tablespoon", 30)]),
  food("Miso paste", "g", 200, 12, 26, 6, 5, [u("tablespoon", 18)]),
  food("Miso soup", "ml", 25, 2, 2.5, 0.8, 0.5, [u("bowl", 250)]),
  food("Seitan", "g", 120, 25, 4, 1.5, 0.5, [u("portion", 100)]),
  food("Gnocchi, potato", "g", 155, 3.6, 33, 0.3, 1.8, [u("portion", 200), u("large portion", 300)]),
  food("Overnight oats, made with milk", "g", 120, 5.5, 17, 3, 2, [u("pot", 250)]),
  food("Acai bowl", "g", 110, 1.5, 19, 3.5, 3, [u("bowl", 350)]),
  food("Gyoza, pork, pan-fried", "g", 220, 9, 25, 9, 1.5, [u("gyoza", 25), u("portion of 5", 125, "portions of 5")]),
  food("Bao bun, pork belly", "g", 250, 9, 32, 9, 1.2, [u("bao", 90, "bao")]),
  food("Burrito, chicken", "g", 180, 9, 22, 6, 2.5, [u("burrito", 450)]),
  food("Nachos with cheese", "g", 300, 9, 30, 16, 3, [u("portion", 200), u("sharing plate", 400)]),
  food("Ramen, pork, restaurant", "g", 86, 5, 10, 3, 0.6, [u("bowl", 700)]),
  food("Pho, beef", "g", 55, 4, 6.5, 1.3, 0.4, [u("bowl", 700)]),
  food("Pad thai, chicken", "g", 170, 8, 21, 6, 1.2, [u("plate", 400)]),
  food("Katsu curry, chicken, with rice", "g", 165, 7.5, 22, 5.5, 1.3, [u("portion", 500)]),
  food("Poke bowl, salmon", "g", 150, 8, 18, 5, 1.5, [u("bowl", 450)]),
  food("Bibimbap", "g", 130, 6, 18, 4, 1.8, [u("bowl", 500)]),

  // More dishes and products not in CoFID 2021: typical UK label or recipe values (estimates).
  food("Udon noodles, cooked", "g", 130, 3.5, 27, 0.5, 1.2, [u("straight-to-wok pack", 150, "straight-to-wok packs"), u("portion", 200)]),
  food("Soba noodles, cooked", "g", 113, 5, 22, 0.3, 1.5, [u("portion", 180)]),
  food("Glass noodles, cooked", "g", 85, 0.1, 21, 0, 0.5, [u("portion", 150)]),
  food("Instant noodles, made up", "g", 150, 3.5, 20, 6, 1, [u("pack", 290)]),
  food("Singapore noodles, takeaway", "g", 160, 7, 20, 6, 1.5, [u("portion", 400)]),
  food("Pad see ew", "g", 175, 7, 24, 6, 1, [u("plate", 400)]),
  food("Orzo, cooked", "g", 150, 5.5, 30, 0.8, 1.6, [u("portion", 180)]),
  food("Tortellini, cheese, cooked", "g", 180, 8, 27, 5, 2, [u("portion", 200)]),
  food("Chicken nuggets", "g", 250, 15, 18, 13, 1, [u("nugget", 18), u("portion of 6", 108, "portions of 6")]),
  food("Chicken kiev, baked", "g", 245, 14, 14, 15, 1, [u("kiev", 130)]),
  food("Fish cake, baked", "g", 190, 9, 20, 8, 1.3, [u("fish cake", 90)]),
  food("Hash brown, baked", "g", 200, 2, 25, 10, 2.5, [u("hash brown", 45)]),
  food("Teacake, toasted", "g", 300, 8, 52, 6, 2.5, [u("teacake", 70)]),
  food("Millionaire's shortbread", "g", 480, 4.5, 58, 26, 1, [u("piece", 55)]),
  food("Panna cotta", "g", 230, 3, 20, 15, 0, [u("pot", 100)]),
  food("Creme brulee", "g", 300, 4, 22, 22, 0, [u("ramekin", 100)]),
  food("Pretzel, soft", "g", 340, 9, 68, 3, 2.5, [u("pretzel", 115)]),
  food("Pretzels, crunchy snack", "g", 380, 10, 77, 3, 3, [u("bag", 30)]),
  food("Protein shake, ready to drink", "ml", 60, 7.5, 4.5, 1.4, 0.3, [u("bottle", 330)]),
  // Chicken wraps, the app's estimates per wrap. Homemade, light: 62 g wholemeal tortilla, 100 g grilled
  // chicken breast, salad and a yogurt sauce. With cheese and mayo: white tortilla, 25 g Cheddar, 15 g mayonnaise.
  food("Chicken wrap, homemade, light", "g", 146, 15, 13.7, 3.5, 2, [u("wrap", 250)]),
  food("Chicken wrap, homemade, with cheese and mayo", "g", 210, 16.2, 12.7, 10.5, 1.1, [u("wrap", 260)]),
  food("Chicken wrap, shop-bought", "g", 205, 11, 22, 8, 2, [u("wrap", 220)]),
  food("Chicken wrap, fast-food, crispy", "g", 250, 11, 25, 12, 1.5, [u("wrap", 200)]),
  food("Shawarma wrap, chicken", "g", 215, 12, 22, 9, 1.8, [u("wrap", 350)]),
  food("Quesadilla, chicken and cheese", "g", 270, 14, 24, 13, 1.6, [u("quesadilla", 250)]),
  food("Tacos, beef", "g", 210, 10, 17, 11, 2.5, [u("taco", 90)]),
  food("Paella, seafood", "g", 145, 8, 19, 4, 1, [u("portion", 350)]),
  food("Salsa, tomato", "g", 35, 1.3, 6.5, 0.3, 1.5, [u("tablespoon", 15)]),
  food("Sashimi, salmon", "g", 200, 20, 0, 13, 0, [u("slice", 15), u("portion", 100)]),
  food("Tempura prawns", "g", 240, 12, 20, 12, 1, [u("piece", 25)]),
  food("Teriyaki chicken", "g", 160, 18, 8, 6, 0.3, [u("portion", 200)]),
  food("Dim sum, steamed dumplings", "g", 190, 8, 24, 7, 1, [u("piece", 25)]),
  food("Wontons, fried", "g", 290, 9, 26, 16, 1.2, [u("piece", 20)]),
  food("Laksa, chicken", "g", 110, 5.5, 8, 6, 0.8, [u("bowl", 600)]),
  food("Massaman curry, chicken", "g", 160, 9, 8, 10, 1.5, [u("portion", 350)]),
  food("Jerk chicken", "g", 190, 25, 3, 9, 0.5, [u("portion", 200)]),
  food("Jollof rice", "g", 150, 3, 25, 4, 1, [u("portion", 250)]),
  food("Peri peri chicken", "g", 200, 27, 1, 10, 0.2, [u("quarter chicken", 200, "quarter chickens")]),
  food("Pulled pork, barbecue", "g", 200, 20, 10, 9, 0.5, [u("portion", 150)]),
  food("Onion rings, battered", "g", 290, 4, 32, 16, 2.5, [u("portion", 100)]),
  food("Mozzarella sticks", "g", 310, 13, 25, 18, 1.2, [u("stick", 30)]),
  food("Crepe, plain", "g", 190, 6, 25, 7, 0.8, [u("crepe", 60)]),
  food("French toast", "g", 230, 8, 25, 11, 1, [u("slice", 80)]),
  food("Eggs benedict", "g", 230, 11, 12, 16, 0.6, [u("half", 140, "halves"), u("portion of 2", 280, "portions of 2")]),
  food("Shakshuka", "g", 100, 6, 6, 6, 1.8, [u("portion", 300)]),
  food("Frittata", "g", 160, 10, 4, 12, 0.8, [u("slice", 150)]),
  food("Frozen yogurt", "g", 130, 3.5, 24, 2.5, 0, [u("portion", 100)]),
  food("Chai latte, semi-skimmed milk", "ml", 57, 2.8, 9.5, 1.4, 0, [u("medium 12 oz cup", 340), u("small 8 oz cup", 230), u("large 16 oz cup", 450)]),
  food("Matcha latte, semi-skimmed milk", "ml", 48, 3.3, 5.8, 1.6, 0.1, [u("medium 12 oz cup", 340), u("small 8 oz cup", 230), u("large 16 oz cup", 450)]),
  food("Iced latte, semi-skimmed milk", "ml", 35, 2.4, 3.4, 1.2, 0, [u("medium 12 oz cup", 340), u("large 16 oz cup", 450)]),
  food("Coconut water", "ml", 19, 0.2, 4.5, 0, 0, [u("carton", 330)]),
  food("Protein yoghurt, fat free", "g", 60, 10, 4.5, 0.2, 0, [u("pot", 200)]),
  food("Beans on toast", "g", 105, 4.8, 18, 1.3, 3.6, [u("slice with half a tin", 240, "slices with half a tin")]),
  food("Avocado toast", "g", 193, 5, 21, 10, 4.7, [u("slice", 120)]),

  // Coated nuts and fruit, not in CoFID 2021: typical UK label values (estimates).
  food("Chocolate almonds, milk chocolate", "g", 540, 11, 40, 37, 5, [u("handful", 30), u("small bag", 40)]),
  food("Chocolate almonds, dark chocolate", "g", 560, 11, 32, 42, 8, [u("handful", 30), u("small bag", 40)]),
  food("Chocolate peanuts", "g", 520, 13, 44, 33, 3.5, [u("handful", 30), u("small bag", 40)]),
  food("Chocolate raisins", "g", 420, 4.5, 64, 16, 2.5, [u("handful", 30), u("small bag", 40)]),
  food("Yogurt-coated raisins", "g", 440, 3, 70, 17, 1.5, [u("handful", 30), u("small bag", 40)]),

  // Drinks
  food("Tea with semi-skimmed milk", "ml", 7, 0.5, 0.7, 0.2, 0, [u("mug", 250), u("teacup", 180)]),
  food("Coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250), u("teacup", 180)]),
  food("Filter coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Decaf coffee with semi-skimmed milk", "ml", 20, 1.3, 1.9, 0.7, 0, [u("mug", 250)]),
  food("Orange juice", "ml", 45, 0.7, 10, 0.2, 0.2, [u("glass", 150)]),
  food("Cola", "ml", 42, 0, 10.6, 0, 0, [u("can", 330)]),
  food("Diet cola", "ml", 0.4, 0, 0, 0, 0, [u("can", 330)]),
  food("Energy drink", "ml", 45, 0, 11, 0, 0, [u("can", 250), u("large can", 500)]),
  food("Beer, bitter", "ml", 43, 0.5, 3.6, 0, 0, [u("pint", 568), u("bottle", 330)]),
  food("Red wine", "ml", 85, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("White wine", "ml", 82, 0.1, 2.6, 0, 0, [u("medium glass", 175), u("large glass", 250), u("bottle", 750)]),
  food("Spirits, 40%", "ml", 222, 0, 0, 0, 0, [u("single", 25), u("double", 50)]),
  // Alcohol-free and soft drinks not in CoFID 2021: typical UK label values (estimates). UK 'alcohol-free' means 0.05% ABV or less, so no alcohol units are counted.
  food("Alcohol-free sparkling wine", "ml", 18, 0.1, 4.2, 0, 0, [u("flute", 125), u("bottle", 750)]),
  food("Alcohol-free white wine", "ml", 20, 0.1, 4.5, 0, 0, [u("medium glass", 175), u("bottle", 750)]),
  food("Alcohol-free red wine", "ml", 22, 0.1, 5, 0, 0, [u("medium glass", 175), u("bottle", 750)]),
  food("Alcohol-free rosé wine", "ml", 20, 0.1, 4.5, 0, 0, [u("medium glass", 175), u("bottle", 750)]),
  food("Alcohol-free beer", "ml", 18, 0.3, 4, 0, 0, [u("pint", 568), u("bottle", 330)]),
  food("Alcohol-free cider", "ml", 25, 0, 6, 0, 0, [u("bottle", 500), u("can", 330)]),
  food("Alcohol-free spirit", "ml", 1, 0, 0.2, 0, 0, [u("measure", 50)]),
  food("Alcohol-free gin and tonic", "ml", 19, 0, 4.6, 0, 0, [u("drink", 200)]),
  food("Alcohol-free gin and slimline tonic", "ml", 1, 0, 0.2, 0, 0, [u("drink", 200)]),
  food("Virgin mojito", "ml", 30, 0, 7.5, 0, 0, [u("glass", 250)]),
  food("Ginger beer", "ml", 40, 0, 10, 0, 0, [u("can", 330)]),
  food("Elderflower pressé", "ml", 30, 0, 7.5, 0, 0, [u("bottle", 275)]),
  // Lager: typical UK label values. CoFID 2021 lists no carbohydrate for lager, which puts it
  // about a third below what brewers declare (a 4.6% lager is about 40 kcal per 100 ml).
  food("Lager", "ml", 33, 0.3, 2.5, 0, 0, [u("pint", 568), u("can", 440), u("bottle", 330), u("large bottle", 620)]),
  food("Lager, premium", "ml", 41, 0.4, 3, 0, 0, [u("pint", 568), u("can", 440), u("bottle", 330), u("large bottle", 620)]),
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
  "Bio&Me Super Nutty Granola": [2, 9.9, 0.1],
  Muesli: [1.2, 16, 0.1],
  Cornflakes: [0.2, 8, 1.1],
  "Wholewheat biscuit cereal": [0.6, 4.4, 0.28],
  "Wholemeal bread": [0.5, 3, 1],
  "White bread": [0.4, 3.5, 1],
  "Rye bread": [0.3, 3, 1.1],
  "Seeded toast": [1.2, 4.5, 1.06],
  "Sourdough toast": [0.35, 2.4, 1.3],
  "White toast, buttered": [9.35, 3.4, 1.3],
  "Wholemeal toast, buttered": [9.3, 2.7, 1.2],
  "Bagel, plain": [0.4, 6, 1],
  Crumpet: [0.2, 2, 1.2],
  "Pain au chocolat": [12, 11, 0.6],
  "Pain aux raisins": [6, 18, 0.5],
  "Cinnamon swirl": [9, 17, 0.6],
  "Tortilla wrap": [2.5, 2.5, 1.2],
  "Burger bun": [1, 6, 1.1],
  Egg: [2.6, 0.2, 0.35],
  "Egg, fried": [3.5, 0.2, 0.4],
  "Scrambled eggs, with butter and milk": [5, 1.5, 0.6],
  "Scrambled eggs, no butter or milk": [3, 0, 0.4],
  Butter: [52, 0.6, 1.5],
  Jam: [0, 60, 0.03],
  Honey: [0, 82, 0.01],
  "Peanut butter": [9, 6, 1],
  "Semi-skimmed milk": [1.1, 4.8, 0.1],
  "Skimmed milk": [0.1, 5, 0.1],
  "Whole milk": [2.3, 4.7, 0.1],
  "Greek yoghurt, 0% fat": [0.1, 3.6, 0.1],
  "Greek-style yoghurt, full fat (10%)": [6.5, 5, 0.1],
  "Cheddar cheese": [22, 0.1, 1.8],
  "Cottage cheese": [2.7, 3.4, 0.7],
  "Single cream": [12, 3.9, 0.1],
  "Vanilla ice cream": [6.5, 22, 0.15],
  "Pork sausage, grilled": [8.5, 2, 1.8],
  "Bacon, back rasher, grilled": [8, 0, 3.5],
  "Ham, sliced": [1.1, 1, 2],
  "Parma or Serrano ham": [5.5, 0.3, 5],
  Pepperoni: [16, 1, 4],
  Bresaola: [1, 0.5, 4],
  Biltong: [2, 2, 4.5],
  "Beef jerky": [2, 12, 4.5],
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
  "Mashed potato, plain": [0.03, 0.8, 0.1],
  "Mashed potato, with milk": [0.15, 1.3, 0.1],
  "Mashed potato, with olive oil": [0.9, 0.8, 0.1],
  "Mashed potato, with butter and cream": [9.2, 0.8, 0.2],
  "Egg, poached": [2.9, 0, 0.4],
  "Oven chips": [0.7, 0.5, 0.3],
  "Balsamic glaze": [0, 45, 0.1],
  "Chicken or turkey sausage, grilled": [2.8, 1, 1.5],
  "Vegan sausage roll": [7, 1.5, 1.2],
  "Chicken broth, stock cube or pot": [0.1, 0.3, 0.9],
  "Chicken bone broth, shop-bought": [0.1, 0.2, 0.4],
  "Chicken broth, homemade, fat skimmed": [0.1, 0.2, 0.3],
  "Chicken broth, homemade, fat left in": [0.9, 0.2, 0.3],
  "Venison sausage, grilled": [3, 1, 1.5],
  "Oat milk": [0.2, 4, 0.1],
  "Almond milk, unsweetened": [0.1, 0, 0.13],
  "Pasta, cooked, with butter or oil": [1.3, 0.6, 0.1],
  "Chips, air-fried": [0.2, 0.8, 0.05],
  "Roast potatoes, air-fried": [0.2, 0.8, 0.02],
  "Porridge, made with oat milk": [0.4, 3.5, 0.1],
  "Sweet potato, baked": [0.1, 6.5, 0.1, "fv"],
  "Pizza, margherita": [4.5, 3.5, 1.2],
  Broccoli: [0.1, 1.7, 0.03, "fv"],
  Carrots: [0, 4.7, 0.1, "fv"],
  "Peas, boiled": [0.1, 4, 0, "fv"],
  Sweetcorn: [0.2, 4.5, 0.01, "fv"],
  Mushrooms: [0.1, 0.2, 0.01, "fv"],
  Spinach: [0.1, 0.4, 0.2, "fv"],
  Tomato: [0, 2.6, 0.01, "fv"],
  "Cherry tomatoes": [0.1, 3.6, 0.01, "fv"],
  Cucumber: [0, 1.2, 0.01, "fv"],
  "Courgette": [0.1, 1, 0.01, "fv"],
  "Aubergine": [0.1, 1, 0.01, "fv"],
  "Corn on the cob": [0.1, 1, 0.01, "fv"],
  "Leeks": [0.1, 1, 0.01, "fv"],
  "Green beans": [0.1, 1, 0.01, "fv"],
  "Tenderstem broccoli": [0.1, 1, 0.01, "fv"],
  "Parsnip": [0.1, 1, 0.01, "fv"],
  "Cabbage": [0.1, 1, 0.01, "fv"],
  "Lettuce": [0.1, 1, 0.01, "fv"],
  "Pak choi": [0.1, 1, 0.01, "fv"],
  "Beansprouts": [0.1, 1, 0.01, "fv"],
  "Edamame beans": [0.1, 1, 0.01, "fv"],
  "Red pepper": [0.1, 4.2, 0, "fv"],
  "Green pepper": [0.1, 2.4, 0.01, "fv"],
  Celery: [0, 1.4, 0.19, "fv"],
  Radishes: [0.2, 1.4, 0.05, "fv"],
  "Spring onions": [0.1, 2.8, 0.02, "fv"],
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
  "Caesar dressing": [4, 2.5, 2.2],
  "Chocolate almonds, milk chocolate": [12, 35, 0.1],
  "Chocolate almonds, dark chocolate": [13, 25, 0.02],
  "Chocolate peanuts": [13, 38, 0.1],
  "Chocolate raisins": [9.5, 62, 0.1],
  "Yogurt-coated raisins": [15, 65, 0.15],
  "Sweet chilli sauce": [0.1, 48, 1.9],
  "Sriracha": [0.1, 20, 5.3],
  "Udon noodles, cooked": [0.1, 0.4, 0.5],
  "Soba noodles, cooked": [0.1, 0.5, 0.1],
  "Glass noodles, cooked": [0, 0, 0.01],
  "Instant noodles, made up": [2.8, 1, 1.0],
  "Singapore noodles, takeaway": [1, 2, 1.0],
  "Pad see ew": [1.2, 4, 1.1],
  "Orzo, cooked": [0.2, 0.6, 0.01],
  "Tortellini, cheese, cooked": [2.5, 1.5, 0.6],
  "Chicken nuggets": [1.5, 0.5, 0.9],
  "Chicken kiev, baked": [5, 1, 0.8],
  "Fish cake, baked": [0.8, 1, 0.8],
  "Hash brown, baked": [1, 0.5, 0.7],
  "Teacake, toasted": [2, 16, 0.8],
  "Millionaire's shortbread": [14, 40, 0.4],
  "Panna cotta": [10, 18, 0.1],
  "Creme brulee": [13, 21, 0.1],
  "Pretzel, soft": [0.6, 4, 2.0],
  "Pretzels, crunchy snack": [0.5, 2, 2.5],
  "Protein shake, ready to drink": [0.9, 4, 0.2],
  "Shawarma wrap, chicken": [2.2, 2.5, 1.1],
  "Chicken wrap, homemade, light": [1.2, 2, 0.6],
  "Chicken wrap, homemade, with cheese and mayo": [3.8, 1.5, 0.9],
  "Chicken wrap, shop-bought": [2.2, 2, 1],
  "Chicken wrap, fast-food, crispy": [2.5, 2, 1.2],
  "Quesadilla, chicken and cheese": [6, 1.5, 1.0],
  "Tacos, beef": [4.5, 1.5, 0.8],
  "Paella, seafood": [0.8, 1, 0.6],
  "Salsa, tomato": [0, 4.5, 0.9],
  "Sashimi, salmon": [2.6, 0, 0.1],
  "Tempura prawns": [1, 0.5, 0.8],
  "Teriyaki chicken": [1.5, 7, 1.5],
  "Dim sum, steamed dumplings": [2, 2, 1.0],
  "Wontons, fried": [3, 1.5, 0.9],
  "Laksa, chicken": [4, 1.5, 0.7],
  "Massaman curry, chicken": [5, 4, 0.7],
  "Jerk chicken": [2.5, 2.5, 1.2],
  "Jollof rice": [0.6, 2, 0.5],
  "Peri peri chicken": [2.8, 0.5, 0.9],
  "Pulled pork, barbecue": [3, 8, 1.0],
  "Onion rings, battered": [1.5, 4, 0.9],
  "Mozzarella sticks": [7, 2, 1.4],
  "Crepe, plain": [2.5, 6, 0.3],
  "French toast": [3.5, 6, 0.6],
  "Eggs benedict": [7, 1.5, 1.2],
  "Shakshuka": [1.5, 4, 0.6],
  "Frittata": [4.5, 1.5, 0.6],
  "Frozen yogurt": [1.6, 20, 0.15],
  "Chai latte, semi-skimmed milk": [0.9, 9, 0.1],
  "Matcha latte, semi-skimmed milk": [1, 5.5, 0.1],
  "Iced latte, semi-skimmed milk": [0.8, 3.4, 0.1],
  "Coconut water": [0, 4.5, 0.05],
  "Protein yoghurt, fat free": [0.1, 4, 0.1],
  "Beans on toast": [0.3, 4, 0.9],
  "Avocado toast": [2, 1, 0.5],
  "Kimchi": [0.1, 2.0, 1.6],
  "Kombucha": [0, 4.0, 0.01],
  "Kefir, milk drink": [1.2, 4.4, 0.1],
  "Skyr, natural": [0.1, 4, 0.1],
  "Sourdough bread": [0.3, 2, 1.1],
  "Brioche bun": [5, 12, 0.9],
  "Focaccia": [1.5, 2, 1.4],
  "Chia seeds": [3.3, 0, 0.04],
  "Almond butter": [4.5, 4, 0.01],
  "Cashew butter": [9, 6, 0.02],
  "Labneh": [9, 4, 1],
  "Miso paste": [1, 6, 11],
  "Miso soup": [0.1, 0.5, 1.2],
  "Seitan": [0.2, 0.5, 1.0],
  "Gnocchi, potato": [0.1, 0.5, 1.2],
  "Overnight oats, made with milk": [1.2, 6, 0.1],
  "Acai bowl": [0.8, 12, 0.02],
  "Gyoza, pork, pan-fried": [2.5, 2, 1.1],
  "Bao bun, pork belly": [3, 7, 1],
  "Burrito, chicken": [2.5, 1.5, 0.9],
  "Nachos with cheese": [6, 2, 1.2],
  "Ramen, pork, restaurant": [1, 0.8, 0.9],
  "Pho, beef": [0.5, 0.8, 0.8],
  "Pad thai, chicken": [1, 5, 1],
  "Katsu curry, chicken, with rice": [1.2, 2.5, 0.7],
  "Poke bowl, salmon": [1, 3, 0.8],
  "Bibimbap": [0.8, 2.5, 0.8],
  "Tomato ketchup": [0, 22, 1.8],
  Sugar: [0, 100, 0],
  "Tomato soup, cream of": [0.3, 5, 0.7],
  "Tea with semi-skimmed milk": [0.1, 0.7, 0],
  "Coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Filter coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Decaf coffee with semi-skimmed milk": [0.4, 1.9, 0.03],
  "Energy drink": [0, 11, 0.1],
  "Orange juice": [0, 9, 0, "juice"],
  Cola: [0, 10.6, 0],
  "Diet cola": [0, 0, 0.02],
  "Beer, bitter": [0, 0, 0, null, 4],
  "Red wine": [0, 0.6, 0, null, 13],
  Lager: [0, 0.5, 0.01, null, 4],
  "Lager, premium": [0, 0.5, 0.01, null, 5],
  "Alcohol-free sparkling wine": [0, 4, 0.01, null],
  "Alcohol-free white wine": [0, 4, 0.01, null],
  "Alcohol-free red wine": [0, 4.5, 0.01, null],
  "Alcohol-free rosé wine": [0, 4, 0.01, null],
  "Alcohol-free beer": [0, 1.5, 0.01, null],
  "Alcohol-free cider": [0, 5.5, 0.01, null],
  "Alcohol-free spirit": [0, 0, 0.01, null],
  "Alcohol-free gin and tonic": [0, 4.6, 0.01, null],
  "Alcohol-free gin and slimline tonic": [0, 0.2, 0.01, null],
  "Virgin mojito": [0, 7, 0.01, null],
  "Ginger beer": [0, 9.8, 0.02, null],
  "Elderflower pressé": [0, 7, 0.01, null],
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
  "Tea with semi-skimmed milk": 30,
  Cola: 12,
  "Diet cola": 13,
  "Energy drink": 32,
  "Plain (dark) chocolate": 50,
  "Milk chocolate": 20,
};

type CofidValues = { ml?: number; code: string; kcal: number; protein: number | null; carbs: number | null; fat: number | null; fibre: number | null; satFat: number | null; sugars: number | null; salt: number | null; abv: number | null; caffeine?: number; units?: [string, number][] };
const COFID = CURATED as unknown as Record<string, CofidValues>;

/*
 * Everyday foods: units and categories from this file, nutrient values from
 * CoFID 2021 where scripts/curated-map.json maps the food to a CoFID code.
 * The estimates above remain only for foods CoFID doesn't cover.
 */
/** Coffee-shop drinks generated by build-curated.py (recipe x milk); foods already listed above win. */
const baseNames = new Set(BASE.map((f) => f.name));
const GENERATED: FoodItem[] = Object.entries(COFID)
  .filter(([name, c]) => c.units && !baseNames.has(name))
  .map(([name, c]) => ({ ...food(name, "ml", 0, 0, 0, 0, 0, c.units!.map(([n, ml]) => u(n, ml))), ...(c.caffeine ? { caffeine: c.caffeine } : {}) }));

/** Foods whose CoFID values don't match what's sold (see the note on lager), so the app's own values are used. */
const APP_VALUES = new Set(["Lager", "Lager, premium"]);

export const FOOD_DB: FoodItem[] = [...BASE, ...GENERATED].map((f) => {
  const x = EXTRA[f.name];
  const caffeine = CAFFEINE[f.name] ?? f.caffeine;
  let item: FoodItem = caffeine ? { ...f, caffeine } : f;
  if (x) {
    const [satFat, sugars, salt, fiveADay, abv] = x;
    item = { ...item, satFat, sugars, salt, ...(fiveADay ? { fiveADay } : {}), ...(abv ? { abv } : {}) };
  }
  const c = COFID[f.name];
  // The app's own figures where the CoFID entry is known to be off; the CoFID code still hides the duplicate.
  if (c && APP_VALUES.has(f.name)) return { ...item, ...(c.code !== "mix" ? { cofid: c.code } : {}), abv: item.abv ?? c.abv ?? undefined };
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
    out.fiveADay = Math.round((amount / (food.fiveADay === "juice" ? 150 : food.fiveADay === "dried" ? 30 : 80)) * 10) / 10;
  }
  if (food.abv) out.alcoholUnits = Math.round(((amount * food.abv) / 1000) * 10) / 10;
  return out;
}

/** "2 large eggs", "½ slice", "1.5 pints". */
export function formatQty(qty: number, unit: FoodUnit): string {
  const n = qty === 0.5 ? "½" : qty === 1.5 ? "1½" : qty === 2.5 ? "2½" : String(Math.round(qty * 100) / 100);
  return `${n} ${qty > 1 ? unit.plural : unit.name}`;
}
