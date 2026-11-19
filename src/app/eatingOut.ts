/*
 * Restaurant and takeaway meals, built from CoFID 2021 foods at typical
 * portion weights. The weights are typical UK restaurant amounts from general
 * knowledge, not measured, so every result is an estimate. Check against the
 * Food Standards Agency's Food Portion Sizes reference before release.
 */

export type Component = [code: string, grams: number];

export interface EatingOutSide {
  id: string;
  label: string;
  parts: Component[];
  /** Sides in the same group are alternatives: ticking one unticks the others. */
  group?: string;
}

export interface EatingOutMeal {
  id: string;
  name: string;
  cuisine: string;
  parts: Component[];
  sides: EatingOutSide[];
}

export const SIZES = [
  { id: "smaller", label: "Smaller", factor: 0.8 },
  { id: "typical", label: "Typical", factor: 1 },
  { id: "generous", label: "Generous", factor: 1.25 },
] as const;

const naan: EatingOutSide = { id: "naan", label: "Naan bread", parts: [["11-973", 160]], group: "naan" };
const halfNaan: EatingOutSide = { id: "half-naan", label: "Half a naan", parts: [["11-973", 80]], group: "naan" };
const samosas: EatingOutSide = { id: "samosas", label: "2 vegetable samosas", parts: [["15-305", 100]] };
const prawnCrackers: EatingOutSide = { id: "crackers", label: "Prawn crackers", parts: [["11-1023", 30]] };
const springRolls: EatingOutSide = { id: "spring-rolls", label: "2 spring rolls", parts: [["19-327", 120]] };
const garlicBread: EatingOutSide = { id: "garlic-bread", label: "Garlic bread", parts: [["11-937", 100]] };
const chips: EatingOutSide = { id: "chips", label: "Chips", parts: [["13-485", 200]] };
const fries: EatingOutSide = { id: "fries", label: "Fries", parts: [["13-486", 120]] };
const coleslaw: EatingOutSide = { id: "coleslaw", label: "Coleslaw", parts: [["15-635", 80]] };
const salad: EatingOutSide = { id: "salad", label: "Side salad", parts: [["13-520", 60], ["13-517", 50]] };
const iceCream: EatingOutSide = { id: "ice-cream", label: "Scoop of ice cream", parts: [["12-508", 60]] };
const custard: EatingOutSide = { id: "custard", label: "Custard", parts: [["12-573", 100]] };
const pilau: Component = ["11-968", 250];

export const MEALS_OUT: EatingOutMeal[] = [
  // Indian
  { id: "tikka-masala", name: "Chicken tikka masala with pilau rice", cuisine: "Indian", parts: [["19-296", 400], pilau], sides: [naan, halfNaan, samosas] },
  { id: "korma", name: "Chicken korma with pilau rice", cuisine: "Indian", parts: [["19-565", 400], pilau], sides: [naan, halfNaan, samosas] },
  { id: "balti", name: "Chicken balti or jalfrezi with pilau rice", cuisine: "Indian", parts: [["19-449", 400], pilau], sides: [naan, halfNaan, samosas] },
  { id: "madras", name: "Prawn madras with pilau rice", cuisine: "Indian", parts: [["16-366", 400], pilau], sides: [naan, halfNaan, samosas] },
  { id: "biryani", name: "Lamb biryani", cuisine: "Indian", parts: [["19-591", 450]], sides: [naan, halfNaan, samosas] },
  // Chinese and Thai
  { id: "sweet-sour", name: "Sweet and sour chicken with egg fried rice", cuisine: "Chinese", parts: [["19-324", 350], ["11-444", 300]], sides: [prawnCrackers, springRolls] },
  { id: "chow-mein", name: "Chicken chow mein", cuisine: "Chinese", parts: [["19-321", 450]], sides: [prawnCrackers, springRolls] },
  { id: "thai-green", name: "Thai green chicken curry with rice", cuisine: "Thai", parts: [["19-465", 350], ["11-875", 250]], sides: [prawnCrackers, springRolls] },
  // British and pub
  { id: "fish-chips", name: "Cod and chips", cuisine: "British", parts: [["16-428", 220], ["13-485", 300]], sides: [{ id: "mushy-peas", label: "Mushy peas", parts: [["13-563", 100]] }, { id: "ketchup", label: "Ketchup", parts: [["17-709", 20]] }] },
  { id: "scampi", name: "Scampi and chips", cuisine: "British", parts: [["16-443", 150], ["13-485", 250]], sides: [{ id: "peas", label: "Peas", parts: [["13-536", 80]] }, salad] },
  { id: "roast-beef", name: "Roast beef dinner", cuisine: "British", parts: [["18-062", 120], ["13-534", 200], ["11-960", 40], ["13-497", 80], ["13-536", 80], ["17-725", 100]], sides: [{ id: "stuffing", label: "Stuffing", parts: [["11-1000", 50]] }, { id: "cauli-cheese", label: "Cauliflower cheese", parts: [["15-637", 120]] }] },
  { id: "roast-chicken", name: "Roast chicken dinner", cuisine: "British", parts: [["18-330", 150], ["13-534", 200], ["11-960", 40], ["13-497", 80], ["13-536", 80], ["17-725", 100]], sides: [{ id: "stuffing", label: "Stuffing", parts: [["11-1000", 50]] }, { id: "cauli-cheese", label: "Cauliflower cheese", parts: [["15-637", 120]] }] },
  { id: "steak-chips", name: "Sirloin steak and chips", cuisine: "British", parts: [["18-070", 225], ["13-485", 200], ["13-518", 80], ["13-546", 60]], sides: [{ id: "peppercorn", label: "Peppercorn or creamy sauce (about)", parts: [["12-332", 50]] }, salad, { id: "extra-chips", label: "Extra chips", parts: [["13-485", 100]] }] },
  { id: "shepherds-pie", name: "Shepherd's or cottage pie", cuisine: "British", parts: [["19-494", 400], ["13-536", 80]], sides: [{ id: "veg", label: "Extra veg", parts: [["13-497", 80]] }] },
  { id: "full-english", name: "Full English breakfast", cuisine: "British", parts: [["19-509", 100], ["19-500", 50], ["12-944", 60], ["13-532", 135], ["11-1001", 60], ["13-546", 60], ["13-518", 80]], sides: [{ id: "black-pudding", label: "Black pudding", parts: [["19-114", 40]] }, { id: "extra-egg", label: "Extra egg", parts: [["12-944", 60]] }, { id: "extra-toast", label: "Extra toast", parts: [["11-1001", 30]] }] },
  // Fast food and takeaway
  { id: "burger-fries", name: "Burger and fries", cuisine: "Fast food", parts: [["19-544", 250], ["13-486", 120]], sides: [coleslaw, { id: "extra-fries", label: "Large fries instead", parts: [["13-486", 60]] }] },
  { id: "doner", name: "Doner kebab in pitta with salad", cuisine: "Takeaway", parts: [["19-526", 400]], sides: [chips] },
  { id: "pizza-margherita", name: "Cheese and tomato pizza, whole", cuisine: "Italian", parts: [["11-936", 450]], sides: [garlicBread, salad] },
  { id: "pizza-chicken", name: "Chicken pizza, whole", cuisine: "Italian", parts: [["11-1012", 450]], sides: [garlicBread, salad] },
  // Italian
  { id: "lasagne", name: "Lasagne", cuisine: "Italian", parts: [["19-481", 400]], sides: [garlicBread, salad, fries] },
  { id: "bolognese", name: "Spaghetti bolognese", cuisine: "Italian", parts: [["19-628", 450]], sides: [garlicBread, salad] },
  { id: "carbonara", name: "Spaghetti carbonara", cuisine: "Italian", parts: [["11-722", 250], ["17-625", 150]], sides: [garlicBread, salad] },
  { id: "risotto", name: "Chicken risotto", cuisine: "Italian", parts: [["19-566", 400]], sides: [garlicBread, salad] },
  // Mexican and other
  { id: "fajitas", name: "Chicken fajitas", cuisine: "Mexican", parts: [["19-464", 200], ["11-925", 120], ["17-797", 50], ["12-346", 30]], sides: [{ id: "tortilla-chips", label: "Tortilla chips", parts: [["17-644", 50]] }] },
  { id: "chilli", name: "Chilli con carne with rice", cuisine: "Mexican", parts: [["19-478", 350], ["11-858", 200]], sides: [{ id: "tortilla-chips", label: "Tortilla chips", parts: [["17-644", 50]] }, { id: "cheese", label: "Grated cheese", parts: [["12-346", 30]] }] },
  { id: "sushi", name: "Sushi, 8 to 10 pieces", cuisine: "Japanese", parts: [["16-361", 180], ["15-617", 100]], sides: [] },
  // Desserts
  { id: "cheesecake", name: "Cheesecake, slice", cuisine: "Dessert", parts: [["12-562", 120]], sides: [iceCream] },
  { id: "brownie", name: "Chocolate brownie", cuisine: "Dessert", parts: [["11-1127", 80]], sides: [iceCream] },
  { id: "crumble", name: "Fruit crumble", cuisine: "Dessert", parts: [["11-1056", 150]], sides: [custard, iceCream] },
];

export const CUISINES = [...new Set(MEALS_OUT.map((m) => m.cuisine))];
