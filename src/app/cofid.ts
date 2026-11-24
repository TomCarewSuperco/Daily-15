import type { FoodItem, FoodUnit } from "./foods";
import { FOOD_DB } from "./foods";
import type { FiveADayKind } from "./types";

/*
 * Full CoFID 2021 list (about 2,650 foods), loaded on first search so it
 * doesn't slow the app's start. Built by scripts/build-cofid.py.
 */

export const COFID_CREDIT = "UK food data from McCance and Widdowson's The Composition of Foods Integrated Dataset 2021, Public Health England. © Crown copyright.";

export type Row = [string, string, string, number, number | null, number | null, number | null, number | null, number | null, number | null, number | null, FiveADayKind | null, number | null, "g" | "ml"];

const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

/*
 * Typical portions so people don't have to weigh. Weights are typical UK
 * amounts from general knowledge and are estimates.
 */
const MEAL: FoodUnit[] = [u("regular portion", 350), u("small portion", 250), u("restaurant or takeaway portion", 450)];
const DISH: FoodUnit[] = [u("serving spoon", 80), u("portion", 200), u("large portion", 300)];

/** Foods not eaten as listed (dry mixes, raw dried pulses, fat only, weighed with peel): grams only. */
const NOT_AS_EATEN = /weighed whole|weighed as whole|as purchased|\bpowder\b|granules|uncooked|undiluted|concentrate|\bdry\b(?![- ]?(fried|cured|roasted))|fat only|rind only|fat, average|^dripping|^lard|^suet|dried, raw/;

/**
 * Spoons and other kitchen measures for branded products, guessed from the
 * product name (Open Food Facts gives only a serving and pack size).
 * Typical UK amounts; estimates.
 */
export function householdUnitsFor(name: string): FoodUnit[] {
  const n = fold(name);
  if (/yog(h)?urt|skyr|quark|fromage frais|cottage cheese|creme fraiche|soured cream|labneh/.test(n)) return [u("heaped tablespoon", 30), u("level tablespoon", 15)];
  if (/hummus|houmous|guacamole|tzatziki|taramasalata|\bdip\b|salsa|pesto/.test(n)) return [u("tablespoon", 30)];
  if (/(peanut|nut|almond|cashew|hazelnut|chocolate) (butter|spread)|nutella|biscoff spread|\bjam\b|marmalade|honey|syrup|lemon curd/.test(n)) return [u("teaspoon", 7), u("tablespoon", 20)];
  if (/\bmustard\b/.test(n)) return [u("teaspoon", 5)];
  if (/mayonnaise|\bmayo\b|ketchup|sauce|dressing|relish|chutney|vinaigrette/.test(n)) return [u("tablespoon", 15)];
  if (/\boil\b/.test(n)) return [u("teaspoon", 5), u("tablespoon", 14)];
  if (/butter|spread|margarine|ghee/.test(n)) return [u("thin spread", 7, "thin spreads"), u("teaspoon", 5)];
  if (/\bcream\b/.test(n) && !/ice cream|cream cracker|cream egg/.test(n)) return [u("tablespoon", 15)];
  if (/protein powder|whey|\bprotein\b.*powder/.test(n)) return [u("scoop", 30)];
  if (/\boats\b|porridge|granola|muesli|cereal|flakes|bran/.test(n)) return [u("bowl", 40), u("tablespoon", 10)];
  if (/\bsugar\b/.test(n)) return [u("teaspoon", 4)];
  return [];
}

/**
 * A typical portion for a branded product with no serving or pack size,
 * guessed from its name: ready meals and sides, bowls of soup, pots, bars.
 */
export function dishUnitsFor(name: string): FoodUnit[] {
  const n = fold(name);
  if (/\bsoup\b/.test(n)) return [u("bowl", 300), u("cup", 200)];
  if (/tagine|curry|chilli|stew|casserole|dhal|\bdal\b|risotto|paella|biryani|lasagne|bolognese|pasta bake|ready meal|stir.?fry|noodles|rice\b|grains|couscous|quinoa|lentils|beans|chickpeas/.test(n))
    return [u("portion", 200), u("large portion", 300), u("side portion", 125)];
  if (/\bbar\b/.test(n)) return [u("bar", 40)];
  if (/\bpot\b/.test(n)) return [u("pot", 125)];
  if (/biscuit|cookie/.test(n)) return [u("biscuit", 15)];
  if (/crisps|popcorn|pretzels/.test(n)) return [u("bag", 25)];
  return [];
}

export function unitsFor(name: string, unit: "g" | "ml", fiveADay: FiveADayKind | null, group = ""): FoodUnit[] {
  const n = name.toLowerCase();
  if (unit === "ml") {
    if (/^(beer|lager|cider|stout|ale)/.test(n)) return [u("pint", 568), u("bottle", 330)];
    if (/vermouth|sherry|^port\b|martini/.test(n)) return [u("measure", 50)];
    if (/^wine/.test(n)) return [u("medium glass", 175), u("large glass", 250)];
    if (/^spirits|^gin|^vodka|^whisky|^rum|^brandy/.test(n)) return [u("single", 25), u("double", 50)];
    return [u("glass", 175)];
  }
  if (group.startsWith("H") && !/paste|sauce/.test(n)) return [u("teaspoon", 3)];
  if (/^(rice|pasta|noodles|couscous|bulgur|quinoa)\b.*\braw\b/.test(n) && !/flour|pudding|sauce mix/.test(n)) return [u("portion, uncooked", 75, "portions, uncooked")];
  if (/^(beer|lager|cider|stout|shandy)/.test(n)) return [u("pint", 568), u("bottle", 330)];
  if (/^tonic water/.test(n)) return [u("glass", 150), u("can", 150)];
  if (/powder.*made up|made up with (whole|semi-skimmed|skimmed) milk|made up with water/.test(n) && !/porridge|oat|potato|custard|dessert|rice|noodle|soup|sauce|gravy|stuffing|pot savour/.test(n))
    return [u("mug", 250)];
  // Powders measured by the spoon (the made-up drinks have their own entries).
  if (!/made up|as served/.test(n)) {
    if (/ovaltine|horlicks|malted.*powder|drinking chocolate|hot chocolate.*powder|milk ?shake.*powder|instant drinks powder|complan|build up/.test(n))
      return [u("heaped teaspoon", 6), u("mug's worth (4 heaped tsp)", 25, "mugs' worth")];
    if (/^cocoa powder/.test(n)) return [u("heaped teaspoon", 5)];
    if (/coffee.*powder|coffee, instant(?!.*made)/.test(n)) return [u("heaped teaspoon", 2)];
    if (/custard powder|cornflour|gravy.*granules|stock cubes?|bouillon/.test(n)) return [u("teaspoon", 4), u("tablespoon", 10)];
    if (/milk.*dried|dried.*milk|coffeemate|whitener/.test(n)) return [u("teaspoon", 3), u("tablespoon", 8)];
    if (/protein powder|whey/.test(n)) return [u("scoop", 30)];
  }
  if (NOT_AS_EATEN.test(n) && !/made up|as served|diluted/.test(n)) return [];
  if (/undiluted/.test(n)) return [];
  if (/^rice.*pudding.*raw/.test(n)) return [];
  if (/\bsoup\b.*\bdried\b/.test(n) && !/as served/.test(n)) return [];
  if ((group.startsWith("M") || group.startsWith("J")) && /, raw\b/.test(n)) return [];

  // Specific foods first.
  // Potatoes: count them, as people do.
  if (/^potatoes, new/.test(n) && !/\braw\b/.test(n)) return /roast/.test(n) ? [u("roast potato", 40, "roast potatoes"), u("portion", 160)] : [u("new potato", 40, "new potatoes"), u("portion", 175)];
  if (/^potatoes, old, (baked|microwaved)/.test(n)) return [u("jacket potato", 180, "jacket potatoes"), u("large jacket potato", 250, "large jacket potatoes")];
  if (/^potatoes, old, boiled/.test(n)) return [u("medium potato", 150, "medium potatoes"), u("portion", 175)];
  if (/^potatoes, old, mashed|^potato powder.*made up|mashed potato/.test(n)) return [u("heaped tablespoon", 45), u("serving spoon", 90), u("portion", 180)];
  if (/^potatoes, old, roast/.test(n)) return [u("roast potato", 60, "roast potatoes"), u("portion", 200)];
  if (/wedges/.test(n)) return [u("portion", 150)];
  if (/potato products, shaped|potato waffles/.test(n)) return [u("portion", 100)];
  if (/crisps|pringle|potato rings|corn snacks|tortilla chips|pot savouries|scratchings|twiglets/.test(n)) return [u("bag", 25), u("large bag", 40)];
  if (/popcorn|bombay mix/.test(n)) return [u("bag", 30), u("cinema portion", 100)];
  // Eggs and omelettes.
  if (/^eggs, (chicken|duck|quail), whole/.test(n) && !/dried/.test(n) && (!/\braw\b/.test(n) || /^eggs, chicken, whole, raw/.test(n))) return [u("egg", /duck/.test(n) ? 70 : /quail/.test(n) ? 9 : 50)];
  if (/^omelette/.test(n)) return [u("2-egg omelette", 120), u("3-egg omelette", 180)];
  // Nuts, seeds, sweets and spreads.
  if (group.startsWith("GA") && !/milk|marzipan|flour|ground|butter|oil/.test(n)) return [u("handful", 30)];
  if (/peanut butter|nut butter/.test(n)) return [u("tablespoon", 15)];
  if (group.startsWith("SE")) return /bar\b|bounty|mars|snickers|twix|kit kat/.test(n) ? [u("bar", 45)] : [u("handful", 30)];
  if (/^jam,|^jam$|^marmalade|^honey|^lemon curd|chocolate.*spread|^syrup|^treacle/.test(n)) return [u("teaspoon", 7), u("tablespoon", 20)];
  if (/^sugar/.test(n)) return [u("teaspoon", 4)];
  if (/^butter|^fat spread|^margarine|^ghee/.test(n)) return [u("thin spread", 7, "thin spreads"), u("teaspoon", 5)];
  if (/^oil,|oil, /.test(n) && group.startsWith("O")) return [u("teaspoon", 5), u("tablespoon", 14)];
  if (/^cream,|^creme fraiche|^cream substitute/.test(n)) return [u("tablespoon", 15), u("portion", 30)];
  if (/^milk,/.test(n) && !/human|dried|condensed|evaporated/.test(n)) return [u("splash", 30, "splashes"), u("glass", 200)];
  if (/evaporated|condensed/.test(n)) return [u("tablespoon", 15)];
  if (/^mustard|yeast extract/.test(n)) return [u("teaspoon", 5)];
  // Drinks made up, squash and juice.
  if (group.startsWith("P") && /made up|infusion/.test(n)) return [u("mug", 250)];
  if (/diluted|^lemonade|lucozade|juice drink|^smoothie|ready to drink/.test(n)) return [u("glass", 250), u("can or bottle", 330, "cans or bottles")];
  if (group.startsWith("PE") || /^tomato juice/.test(n)) return [u("glass", 150)];
  if (/^lassi/.test(n)) return [u("glass", 250)];
  // Bakery, puddings and dairy desserts.
  if (/^papadums/.test(n)) return [u("papadum", 13)];
  if (/milkshake, thick/.test(n)) return [u("regular", 400)];
  if (/^chapati|^paratha|^roti|^bannock/.test(n)) return [u("piece", /paratha/.test(n) ? 80 : 55)];
  if (/^doughnut/.test(n)) return [u("doughnut", 70)];
  if (/buns|^waffles|^pancakes|^crumpet|^scotch pancake|^teacake/.test(n)) return [u("piece", 60)];
  if (group.startsWith("AP")) return [u("pastry", 80, "pastries")];
  if (/^dumpling/.test(n)) return [u("dumpling", 50)];
  if (/^stuffing(?!.*dried)/.test(n)) return [u("portion", 50)];
  if (/^instant dessert|^jelly/.test(n)) return [u("portion", 120)];
  if (/cornetto|^lollies|^sorbet|^kulfi|ice cream cone/.test(n)) return [u("one", 70, "ones")];
  if (/^fromage frais/.test(n)) return [u("pot", 100)];
  if (group.startsWith("BR") && !/cheesecake|gateau|pavlova|torte|mousse|caramel|trifle|knickerbocker|banana split|sundae|melba|blancmange|panna cotta|custard/.test(n)) return [u("portion", 120)];
  if (/canned,? in tomato sauce|ravioli/.test(n)) return [u("half can", 200, "half cans")];
  if (/^jam tarts?/.test(n)) return [u("tart", 35)];
  if (/^bacon rashers/.test(n)) return [u("rasher", /streaky/.test(n) ? 15 : 25)];
  // Fruit and veg people count (fresh, not dried, stewed or canned).
  if (!/dried|stewed|canned|juice|puree|pur\u00e9e/.test(n)) {
  if (/^apples, eating/.test(n)) return [u("apple", 150), u("5-a-day portion", 80)];
  if (/^bananas/.test(n)) return [u("banana", 100), u("5-a-day portion", 80)];
  if (/^oranges/.test(n)) return [u("orange", 130), u("5-a-day portion", 80)];
  if (/^pears/.test(n) && !/stewed/.test(n)) return [u("pear", 150), u("5-a-day portion", 80)];
  if (/satsuma|clementine|mandarin|tangerine/.test(n)) return [u("fruit", 60), u("5-a-day portion", 80)];
  if (/^kiwi/.test(n)) return [u("kiwi", 60), u("5-a-day portion", 80)];
  if (/^plums/.test(n)) return [u("plum", 55), u("5-a-day portion", 80)];
  if (/^peaches|^nectarines/.test(n)) return [u("fruit", 110), u("5-a-day portion", 80)];
  if (/^apricots/.test(n) && !/dried/.test(n)) return [u("apricot", 35), u("5-a-day portion", 80)];
  if (/^avocado/.test(n)) return [u("half avocado", 70, "half avocados"), u("5-a-day portion", 80)];
  if (/^tomatoes, cherry/.test(n)) return [u("cherry tomato", 15, "cherry tomatoes"), u("5-a-day portion", 80)];
  if (/^tomatoes/.test(n) && !/canned|puree|sun dried|paste/.test(n)) return [u("tomato", 85, "tomatoes"), u("5-a-day portion", 80)];
  if (/^carrots/.test(n)) return [u("carrot", 60), u("5-a-day portion", 80)];
  if (/^onions/.test(n) && !/dried|pickled/.test(n)) return [u("onion", 150), u("5-a-day portion", 80)];
  if (/^peppers/.test(n)) return [u("pepper", 140), u("5-a-day portion", 80)];
  if (/^mushrooms/.test(n) && !/dried/.test(n)) return [u("mushroom", 15), u("5-a-day portion", 80)];
  if (/^sharon fruit|persimmon/.test(n)) return [u("fruit", 150), u("half", 75, "halves")];
  if (/^mango/.test(n)) return [u("half mango", 100, "half mangoes"), u("whole mango", 200, "whole mangoes")];
  if (/^pineapple/.test(n)) return [u("slice", 80)];
  if (/^grapes/.test(n)) return [u("handful (about 10)", 80, "handfuls"), u("grape", 8)];
  if (/^strawberries/.test(n)) return [u("strawberry", 12, "strawberries"), u("handful (about 7)", 80, "handfuls")];
  if (/^(raspberries|blueberries|blackberries|redcurrants|blackcurrants)/.test(n)) return [u("handful", 80)];
  if (/^cherries/.test(n)) return [u("handful (about 10)", 80, "handfuls"), u("cherry", 8, "cherries")];
  if (/^grapefruit/.test(n)) return [u("half grapefruit", 130, "half grapefruits")];
  if (/^figs/.test(n)) return [u("fig", 50)];
  if (/^passion fruit/.test(n)) return [u("fruit", 20)];
  if (/^pomegranate/.test(n)) return [u("half (seeds)", 80, "halves (seeds)")];
  if (/^papaya/.test(n)) return [u("slice", 140)];
  if (/^lychees/.test(n)) return [u("lychee", 10)];
  if (/^melon, watermelon|^watermelon/.test(n)) return [u("slice", 200)];
  if (/^melon/.test(n)) return [u("slice", 150)];
  if (/^courgette/.test(n)) return [u("courgette", 200), u("half courgette", 100, "half courgettes")];
  if (/^aubergine/.test(n)) return [u("aubergine", 250), u("half aubergine", 125, "half aubergines")];
  if (/^cucumber/.test(n)) return [u("5 cm piece", 80, "5 cm pieces"), u("whole cucumber", 300, "whole cucumbers")];
  if (/^sweetcorn/.test(n)) return /cob/.test(n) ? [u("cob", 125)] : [u("tablespoon", 25), u("5-a-day portion", 80)];
  if (/^sweet potato/.test(n)) return [u("medium sweet potato", 150, "medium sweet potatoes"), u("5-a-day portion", 80)];
  if (/^beetroot/.test(n)) return [u("beetroot", 50)];
  if (/^celery/.test(n)) return [u("stick", 40)];
  if (/^leeks/.test(n)) return [u("leek", 150)];
  if (/^lettuce|^rocket|^watercress|^spinach, (baby|mature), raw/.test(n)) return [u("handful", 30), u("cereal bowl", 80)];
  if (/^(broccoli|cauliflower)/.test(n)) return [u("floret", 15), u("5-a-day portion (about 6 florets)", 80, "5-a-day portions")];
  if (/^parsnip/.test(n)) return [u("parsnip", 120)];
  if (/^garlic/.test(n)) return [u("clove", 4)];
  }
  if (/^porridge, made|^porridge oats.*(cooked|made up)|^breakfast cereal, oat, instant.*made up/.test(n)) return [u("bowl", 200), u("large bowl", 300)];
  if (/condensed(?!.*as served)/.test(n)) return [u("half can", 150, "half cans")];
  if (/\bsoup\b/.test(n)) return [u("bowl", 300), u("cup", 200)];
  if (/^sandwich/.test(n)) return [u("sandwich", 180, "sandwiches")];
  if (/frankfurter with bun|hot dog/.test(n)) return [u("hot dog", 150)];
  if (/naan/.test(n)) return [u("naan", 160), u("half naan", 80, "half naans")];
  if (/pitta/.test(n)) return [u("pitta", 60)];
  if (/^pizza/.test(n) && !/base/.test(n)) return [u("slice", 80), u("whole pizza", 400, "whole pizzas")];
  if (/^coleslaw/.test(n)) return [u("tablespoon", 30), u("side portion", 80)];
  if (/^salad,/.test(n)) return [u("side portion", 100), u("main portion", 250)];
  if (/^croissant/.test(n)) return [u("croissant", 60)];
  if (/pastries, danish/.test(n)) return [u("pastry", 90, "pastries")];
  if (/samosa/.test(n)) return [u("samosa", 50)];
  if (/pakora|bhajia|fritter|croquette/.test(n)) return [u("piece", 50)];
  if (/^bhaji/.test(n)) return [u("side portion", 150), u("main portion", 300)];
  if (/pasty|pasties/.test(n)) return [u("pasty", 230, "pasties")];
  if (/^flan|quiche|nut roast|nut and .* roast|bean loaf/.test(n)) return [u("slice", 150)];
  if (/^pie,|, pie\b|pies?,/.test(n) && !/fruit|pastry, raw/.test(n)) return [u("individual pie", 200), u("portion", 250)];
  if (/spring roll/.test(n)) return [u("spring roll", 60)];
  if (/prawn crackers/.test(n)) return [u("bowl", 30)];
  if (/black pudding|white pudding/.test(n)) return [u("slice", 40)];
  if (/chicken wings/.test(n)) return [u("wing", 35), u("portion of 6", 210, "portions of 6")];
  if (/satay/.test(n)) return [u("skewer", 40)];
  if (/doner kebabs?, meat only/.test(n)) return [u("portion", 150)];
  if (/skin, (casseroled|roasted)/.test(n)) return [u("portion", 30)];
  if (/caviar|\broe\b/.test(n)) return [u("tablespoon", 15), u("portion", 100)];
  if (/taramasalata|hummus|houmous|guacamole|tzatziki/.test(n)) return [u("tablespoon", 30)];
  if (/pesto/.test(n)) return [u("tablespoon", 15)];
  if (/burger/.test(n)) return [u("burger", /with bun/.test(n) ? 200 : 100)];
  if (/^sausages?/.test(n)) return [u("sausage", 45)];
  if (/^cheese sauce|^white sauce|^bread sauce|^onion sauce|^parsley sauce|^sauce, (cheese|white)/.test(n) && !/dry|packet mix, dry/.test(n)) return [u("tablespoon", 20), u("portion", 60)];
  if (/^sauce, (pasta|traditional cook in|indian cook in|chinese cook in)|^sauces, indian cook in|^bolognese sauce|cook in sauce/.test(n)) return [u("quarter jar", 125), u("half jar", 250)];
  if (/^gravy.*made up/.test(n)) return [u("portion", 80)];
  if (group.startsWith("H")) return [u("teaspoon", 3)];

  // Cooked meat and poultry by the piece or slice.
  if (group.startsWith("M") && !/, raw\b/.test(n)) {
    if (/meatballs?/.test(n)) return [u("meatball", 30), u("portion of 5", 150, "portions of 5")];
    if (/mince/.test(n)) return [u("heaped tablespoon", 40), u("portion", 125)];
    if (/chops?\b|cutlets?/.test(n)) return [u("chop", 130)];
    if (/gammon|bacon loin steak/.test(n)) return [u("steak", 150)];
    if (/steak/.test(n) && !/braising|stewing|pudding|pie/.test(n)) return [u("steak", 200), u("small steak", 150)];
    if (/chicken.*breast|breast.*chicken|turkey.*breast/.test(n) && !/coated|slices/.test(n)) return [u("breast", 140), u("half breast", 70, "half breasts")];
    if (/thigh/.test(n)) return [u("thigh", 75)];
    if (/drumstick|leg quarter/.test(n)) return [u(/leg quarter/.test(n) ? "leg quarter" : "drumstick", /leg quarter/.test(n) ? 200 : 60)];
    if (/coated|nuggets|goujons|dippers|battered|portions/.test(n)) return [u("piece", /portions|battered/.test(n) ? 120 : 30), u("portion", 150)];
    if (/roast|joint|leg|loin|topside|silverside|brisket|whole, roasted|light meat|dark meat|meat only|meat and skin/.test(n) && !/stewed|casseroled|braised|slow cooked/.test(n)) return [u("slice", 30), u("portion (4 slices)", 120, "portions")];
    if (/ham\b|chicken slices|turkey slices|corned beef|brawn|luncheon|pastrami|tongue/.test(n) && !/hash/.test(n)) return [u("slice", /corned beef/.test(n) ? 30 : 25)];
    if (/salami|pepperoni|chorizo|prosciutto|parma/.test(n)) return [u("slice", 5), u("portion (6 slices)", 30, "portions")];
    if (/frankfurter|hot dog sausage/.test(n)) return [u("frankfurter", 45)];
    if (/stewed|casseroled|braised|slow cooked|stew/.test(n)) return [u("ladle", 150), u("portion", 200)];
  }
  if (/fish fingers/.test(n)) return [u("fish finger", 28), u("portion of 4", 112, "portions of 4")];
  if (/fishcakes?|fish cakes?/.test(n)) return [u("fish cake", 90)];
  if (/fish balls/.test(n)) return [u("fish ball", 20)];
  if (/yorkshire pudding/.test(n)) return [u("individual pudding", 30, "individual puddings"), u("large pudding", 90, "large puddings")];
  if (/^stuffing/.test(n) && !/dried/.test(n)) return [u("stuffing ball", 30), u("portion", 60)];
  if (/cheesecake|gateau|pavlova|torte|tart\b/.test(n)) return [u("slice", 100), u("restaurant slice", 140)];
  if (/mousse|creme caramel|crème caramel|blancmange|panna cotta/.test(n)) return [u("pot", 80)];
  if (/^trifle|knickerbocker|banana split|sundae|peach melba/.test(n)) return [u("bowl", 150)];
  if (/^custard/.test(n)) return [u("serving spoon", 60), u("jug pour", 120, "jug pours")];
  if (/^(pasta|noodles)/.test(n) && /boiled|cooked|fried/.test(n)) return [u("bowl", 230), u("side portion", 120)];
  if (/^(crumble|pudding|pie, fruit|sponge)/.test(n) || group.startsWith("AS")) return [u("bowlful", 150), u("small bowlful", 100)];
  if (/stew|casserole|bourguignon|stroganoff|goulash|curry|chilli|dhal|hotpot/.test(n) && !/sauce|powder|paste/.test(n)) return [u("ladle", 150), ...MEAL];
  if (/^(red )?rice/.test(n) && !/raw|flour|uncooked|pudding/.test(n)) return [u("heaped tablespoon", 30), u("portion", 180), u("takeaway portion", 300)];
  if (/^(pasta|noodles)/.test(n) && /boiled|cooked|fried/.test(n)) return [u("portion", 180), u("large portion", 250)];
  if (/chips|fries|wedges/.test(n) && group.startsWith("DA")) return [u("portion", 150), u("takeaway portion", 250)];
  if (/in batter|in breadcrumbs|coated/.test(n) && group.startsWith("J")) return [u("fillet", 140), u("takeaway portion", 220)];
  if (/^(curry|chilli con|lasagne|risotto|stew|casserole|chow mein|biryani|moussaka|paella|hotpot|goulash|spaghetti|pasta with|macaroni|shepherd|pie, cottage|enchiladas)/.test(n) || /korma|tikka|\bmasala|balti|madras|bhuna|jalfrezi|sweet and sour/.test(n)) return MEAL;
  if (group.startsWith("MR") || group.startsWith("JR") || group.startsWith("DR")) return DISH;

  if (/^bread rolls|^rolls/.test(n)) return [u("roll", 60)];
  if (/^bread/.test(n)) return [u("slice", 40)];
  if (group.startsWith("AI") || /^breakfast cereal/.test(n)) return [u("bowl", 40)];
  if (group.startsWith("AM") || /^biscuits/.test(n)) return [u("biscuit", 15)];
  if (group.startsWith("AN") || /^cake|gateau|cheesecake|brownie|muffin|scone/.test(n)) return [u("slice", 70), u("restaurant slice", 120)];
  if (group.startsWith("AS") || /crumble|pudding|pie, fruit|tart/.test(n)) return [u("portion", 150)];
  if (/^cheese spread/.test(n)) return [u("tablespoon", 15)];
  if (/^cheese, (cottage|quark)/.test(n)) return [u("tablespoon", 30), u("pot", 150)];
  if (/^cheese,/.test(n)) {
    if (/brie|camembert|goats?|feta|mozzarella|halloumi|paneer|ricotta|mascarpone|cream cheese|soft/.test(n)) return [u("slice", 30), u("tablespoon", 15)];
    return [u("matchbox-size piece", 30, "matchbox-size pieces"), u("slice", 20), u("grated tablespoon", 7, "grated tablespoons")];
  }
  if (/^yogurt|^yoghurt/.test(n)) return [u("pot", 125)];
  if (/^ice cream/.test(n)) return [u("scoop", 60)];
  if (/^sauce|\bsauce\b|^dips?\b|horseradish|piccalilli|salad cream|gravy|ketchup|mayonnaise|dressing|chutney|pickle|relish/.test(n)) return [u("tablespoon", 15)];
  if (group.startsWith("M")) return [u("portion", 120)];
  if (group.startsWith("J")) return [u("fillet or portion", 130)];

  if (/lemon juice|lime juice/.test(n)) return [u("tablespoon", 15)];
  if (fiveADay === "juice") return [u("glass", 150)];
  if (fiveADay === "dried") return [u("handful", 30)];
  if (fiveADay === "fv" || fiveADay === "pulses")
    return /boiled|steamed|canned|cooked|frozen|microwaved|roast|fried|stir|baked|mashed/.test(n)
      ? [u("heaped tablespoon", 27), u("5-a-day portion (3 heaped tbsp)", 80, "5-a-day portions")]
      : [u("5-a-day portion", 80)];
  return [];
}

let rowsCache: Promise<Map<string, Row>> | null = null;

/** Every CoFID food by code, including those used in the everyday list. */
export function loadCofidByCode(): Promise<Map<string, Row>> {
  rowsCache ??= import("./data/cofid.json").then((m) => new Map((m.default.foods as Row[]).map((r) => [r[0], r])));
  return rowsCache;
}

/** Sums CoFID foods at given weights into one set of nutrients. Unknown extras are left out. */
export function sumComponents(rows: Map<string, Row>, parts: [string, number][], factor = 1) {
  const out = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, satFat: 0, sugars: 0, salt: 0, fiveADay: 0, grams: 0, missing: [] as string[] };
  for (const [code, grams] of parts) {
    const r = rows.get(code);
    if (!r) {
      out.missing.push(code);
      continue;
    }
    const g = grams * factor;
    const k = g / 100;
    out.grams += g;
    out.kcal += r[3] * k;
    out.protein += (r[4] ?? 0) * k;
    out.carbs += (r[5] ?? 0) * k;
    out.fat += (r[6] ?? 0) * k;
    out.fibre += (r[7] ?? 0) * k;
    out.satFat += (r[8] ?? 0) * k;
    out.sugars += (r[9] ?? 0) * k;
    out.salt += (r[10] ?? 0) * k;
    if (r[11] === "fv" || r[11] === "pulses") out.fiveADay += g / 80;
    if (r[11] === "dried") out.fiveADay += g / 30;
  }
  return out;
}

let cache: Promise<FoodItem[]> | null = null;

export function loadCofid(): Promise<FoodItem[]> {
  cache ??= import("./data/cofid.json").then((m) => {
    const used = new Set(FOOD_DB.map((f) => f.cofid).filter(Boolean));
    return (m.default.foods as Row[])
      .filter((r) => !used.has(r[0]))
      .map(([code, name, group, kcal, protein, carbs, fat, fibre, satFat, sugars, salt, fiveADay, abv, unit]) => ({
        name,
        per: 100,
        unit,
        units: unitsFor(name, unit, fiveADay, group),
        typical: 100,
        kcal,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        fibre: fibre ?? 0,
        ...(satFat !== null ? { satFat } : {}),
        ...(sugars !== null ? { sugars } : {}),
        ...(salt !== null ? { salt } : {}),
        ...(fiveADay ? { fiveADay } : {}),
        ...(abv ? { abv } : {}),
        cofid: code,
      }));
  });
  return cache;
}

/** Everyday words that the food names don't use. */
const SYNONYMS: Record<string, string[]> = {
  ale: ["bitter", "beer"],
  pint: ["beer", "lager"],
  fizzy: ["cola", "carbonated"],
  pop: ["cola", "carbonated"],
  soda: ["cola", "carbonated"],
  yoghurt: ["yogurt"],
  yogurt: ["yoghurt"],
  cuppa: ["tea"],
  brew: ["tea"],
  sarnie: ["sandwich"],
  butty: ["sandwich"],
  spuds: ["potatoes"],
  tatties: ["potatoes"],
  chips: ["chips", "fries"],
  fries: ["chips"],
  granary: ["malted"],
  aubergine: ["aubergine", "eggplant"],
  courgette: ["courgette", "zucchini"],
  prawn: ["prawns", "shrimp"],
  alcohol: ["beer", "lager", "cider", "stout", "wine", "prosecco", "gin", "vodka", "whisky", "rum", "brandy", "spirits", "port", "sherry", "liqueur"],
  booze: ["beer", "lager", "wine", "spirits"],
  drink: ["drink", "beer", "lager", "cider", "wine", "cola"],
  whiskey: ["whisky"],
  scotch: ["whisky"],
  bourbon: ["whisky"],
  tequila: ["spirits"],
  champagne: ["sparkling", "prosecco"],
  cava: ["sparkling", "prosecco"],
  fizz: ["sparkling", "prosecco"],
  bubbly: ["sparkling", "prosecco"],
  "g&t": ["gin", "tonic"],
  gt: ["gin", "tonic"],
  coke: ["cola"],
  cocktail: ["mojito", "margarita", "cosmopolitan", "martini", "bloody", "long island", "bucks fizz"],
  cocktails: ["mojito", "margarita", "cosmopolitan", "martini", "bloody", "long island", "bucks fizz"],
  jd: ["whisky"],
  jack: ["whisky"],
  bacardi: ["rum"],
  smirnoff: ["vodka"],
  guinness: ["stout", "guinness"],
  bitter: ["bitter"],
  chocolate: ["chocolat"],
  kimchee: ["kimchi"],
  natural: ["natural", "plain", "greek"],
  udaan: ["udon"],
  fishcake: ["fishcakes", "fish"],
  fishcakes: ["fishcakes", "fish"],
  chili: ["chilli"],
  siracha: ["sriracha"],
  udan: ["udon"],
  poppadom: ["papadums"],
  poppadoms: ["papadums"],
  poppadum: ["papadums"],
  poppadums: ["papadums"],
  papadum: ["papadums"],
  hotdog: ["frankfurter"],
  sweets: ["sweets", "gums", "pastilles"],
  gummy: ["gums", "jellies"],
  gummies: ["gums", "jellies"],
  hummus: ["hummus", "houmous"],
  houmous: ["hummus", "houmous"],
  coffee: ["coffee", "latte", "flat", "cappuccino", "americano", "espresso", "mocha", "cortado", "macchiato"],
  coffees: ["coffee", "latte", "flat", "cappuccino", "americano", "espresso", "mocha", "cortado", "macchiato"],
  oatmilk: ["oat"],
  semi: ["semi"],
  raisin: ["raisins"],
  croissant: ["croissants"],
  pastry: ["pastries", "croissants", "pain"],
};

const stems = (w: string) => [w, w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w, w.length > 5 && w.endsWith("es") ? w.slice(0, -2) : w];
const forms = (w: string) => [...stems(w), ...(SYNONYMS[w] ?? [])];

/** Matches the start of a word in the name, so 'ale' doesn't find 'Wensleydale'. */
const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Brand names joined with '&' ('Bio&Me') also match their parts ('bio me'). */
const wordsOf = (name: string) => fold(name).split(/[^a-z0-9&]+/).filter(Boolean).flatMap((w) => (/\w&\w/.test(w) ? [w, ...w.split("&")] : [w]));
const hit = (nameWords: string[], w: string) => forms(w).some((x) => nameWords.some((nw) => nw.startsWith(x)));

/** Small words that food names often leave out: 'gin and tonic', 'fish with chips'. */
const FILLER = new Set(["and", "with", "of", "a", "an", "the", "in", "on", "n", "&", "some", "my"]);
/** Phrases people type that the food names word differently. */
const PHRASES: [RegExp, string][] = [
  [/\bsalad dress(ings?)?\b/, "dressing"],
  [/\bvinaigrette\b/, "french dressing"],
  [/\bhot dogs?\b/, "frankfurter"],
  [/\bhot sauce\b/, "chilli sauce"],
  [/\b(chocolate|choc)[- ]?(covered|coated)\b/, "chocolate"],
  [/\byog(h)?urt[- ]?(covered|coated)\b/, "yogurt coated"],
  [/\b(non[- ]?alcoholic|zero alcohol|no alcohol|alcohol[- ]free|0\.0%?)\b/, "alcohol free"],
  [/\b(noughty|naughty)\b/, "alcohol free sparkling wine"],
  [/\b(seedlip|lyre'?s|caleno)\b/, "alcohol free spirit"],
  [/\bmocktails?\b/, "virgin mojito alcohol free"],
  [/\bshreddies\b/, "shredded wheat"],
  [/\brice (k|c)rispies\b/, "breakfast cereal rice toasted"],
  [/\bpot noodles?\b/, "pot savouries made up"],
  [/\bsuper noodles?\b/, "instant noodles"],
  [/\bjelly sweets?\b/, "gums"],
];
const queryWords = (q: string) => {
  let text = fold(q);
  for (const [re, to] of PHRASES) text = text.replace(re, to);
  // Numbers such as '10' or '10%' (usually fat content) don't have to appear in the name; they rank results instead.
  const all = text.split(/\s+/).filter((w) => w && !/^\d+(\.\d+)?%?$/.test(w));
  const kept = all.filter((w) => !FILLER.has(w));
  return kept.length ? kept : all;
};

/** True if every query word, its singular or a common synonym starts a word in the name. */
export function matchesAll(name: string, query: string): boolean {
  const nw = wordsOf(name);
  return queryWords(query).every((w) => hit(nw, w));
}

/**
 * Every query word (or its singular or a synonym) must appear. Plain, short
 * names rank first. If nothing matches every word, falls back to foods that
 * match most of them.
 */
/** A number in the query, read as a fat percentage ('yogurt 10%', 'milk 1%', 'mince 5%'). */
const percentHint = (q: string): number | null => {
  const m = fold(q).match(/(?:^|\s)(\d+(?:\.\d+)?)%?(?=\s|$)/);
  return m ? Number(m[1]) : null;
};

export function searchFoods(foods: FoodItem[], query: string, limit = 15): FoodItem[] {
  hint = percentHint(query);
  const words = queryWords(query);
  if (!words.length) return [];
  const strict = rank(foods, words, words.length);
  if (strict.length) return strict.slice(0, limit);
  if (words.length > 1) {
    const most = rank(foods, words, Math.ceil(words.length / 2));
    if (most.length) return most.slice(0, limit);
  }
  // Nothing matched: allow small spelling mistakes ('bree' for brie, 'brocoli').
  return rank(foods, words, words.length, true).slice(0, limit);
}

/** Edit distance, stopping early once it passes max. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** A word of four letters or more, one letter out (two for longer words), or matching the start of a longer word. */
function nearness(nameWords: string[], w: string): number {
  if (hit(nameWords, w)) return 0;
  if (w.length < 4) return 99;
  const max = w.length >= 7 ? 2 : 1;
  let best = 99;
  for (const nw of nameWords) {
    // People rarely mistype the first letter, so require it to match.
    if (nw[0] !== w[0]) continue;
    const whole = distance(w, nw, max);
    if (whole <= max) best = Math.min(best, whole);
    // Typo in the start of a longer word counts, but less than a whole-word match.
    if (w.length >= 6 && nw.length > w.length + 1) {
      const start = distance(w, nw.slice(0, w.length), max);
      if (start <= max) best = Math.min(best, start + 1);
    }
  }
  return best;
}
const nearHit = (nameWords: string[], w: string) => nearness(nameWords, w) < 99;

let hint: number | null = null;

function rank(foods: FoodItem[], words: string[], need: number, fuzzy = false): FoodItem[] {
  const scored: { f: FoodItem; score: number }[] = [];
  const match = fuzzy ? nearHit : hit;
  for (const f of foods) {
    const name = fold(f.name);
    const nw = wordsOf(name);
    const hits = words.filter((w) => match(nw, w)).length;
    if (hits < need) continue;
    const first = nw[0] ?? "";
    const segment = name.split(",")[0].trim();
    let score = hits * 20;
    if (fuzzy) score -= words.reduce((t, w) => t + Math.min(5, nearness(nw, w)), 0) * 15;
    // Drinks and coated snacks that merely contain the word ('milk', 'yogurt') rank below the food itself.
    const qtext = words.join(" ");
    if (/\b(latte|cappuccino|cortado|macchiato|mocha|flat white|americano|hot chocolate|tea with|coffee with|chai|matcha)\b/.test(name) && !/latte|cappuccino|cortado|macchiato|mocha|flat|americano|chocolate|tea|coffee|chai|matcha/.test(qtext)) score -= 8;
    if (/coated|covered/.test(name) && !/coated|covered|chocolate|raisin|nut|almond|peanut/.test(qtext)) score -= 15;
    if (/\b(chocolate|kefir|shake)\b/.test(name) && !/chocolate|kefir|shake/.test(qtext)) score -= 10;
    if (/\bporridge\b/.test(name) && !/porridge|oat/.test(qtext)) score -= 10;
    if (/^(oat|soya|almond) milk/.test(name) && !/oat|soya|soy|almond|plant|vegan|dairy/.test(qtext)) score -= 3;
    if (/rice (cakes?|crackers?)/.test(name) && !/cake|cracker/.test(qtext)) score -= 10;
    // The plain cooked staple ('White rice, cooked') before dishes that contain it.
    if (/^(white rice|pasta), cooked$|^white (bread|toast)$/.test(name)) score += 6;
    // 'Yogurt 10%': prefer foods whose fat per 100 g is close to the number, or whose name states it.
    if (hint !== null && hint <= 100) {
      if (name.includes(`${hint}%`)) score += 10;
      else if (typeof f.fat === "number") score += Math.max(0, 6 - Math.abs(f.fat - hint) * 2);
    }
    // Whole-word matches beat prefixes: 'rose' finds rosé wine before rosemary.
    score += words.filter((w) => forms(w).some((x) => nw.includes(x) || nw.includes(`${x}s`) || nw.includes(`${x}es`))).length * 6;
    if (forms(words[0]).some((x) => first.startsWith(x))) score += 10;
    // The word as typed beats a synonym: 'fries' finds fries before chips.
    score += words.filter((w) => nw.includes(w)).length * 12;
    // 'Eggs, chicken, boiled' before 'Egg fu yung': the first part is just the food.
    if (segment.split(/\s+/).length === 1) score += 4;
    score -= (name.match(/,/g)?.length ?? 0) * 1.5;
    score -= name.length / 25;
    if (/\b(raw|dried|powder|weighed)\b/.test(name)) score -= 2;
    if (/rind only|skin only|fat only/.test(name)) score -= 4;
    if (/\b(homemade|takeaway|retail)\b/.test(name)) score -= 0.5;
    // Coffee-shop drinks: the common milks first.
    if (/, semi-skimmed milk$|with semi-skimmed milk$/.test(name)) score += 1.2;
    else if (/, whole milk$|with whole milk$/.test(name)) score += 1;
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.f);
}
