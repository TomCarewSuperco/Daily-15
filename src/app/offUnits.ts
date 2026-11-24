import { dishUnitsFor, householdUnitsFor } from "./cofid";
import type { FoodUnit } from "./foods";

/** Everyday measures for a branded product from its listing: pack, serving, household units, then a typical portion. */
const u = (name: string, g: number, plural = `${name}s`): FoodUnit => ({ name, plural, g });

/** Drinks are measured in the containers and glasses they're served in, never 'half a pack'. */
function drinkUnits(p: { packG?: number | null; quantity?: string | null; drink?: string; servingG?: number | null }): FoodUnit[] {
  const units: FoodUnit[] = [];
  const pack = p.packG && p.packG > 0 && p.packG <= 1000 ? p.packG : 0;
  if (p.drink === "beer" || p.drink === "cider") {
    if (pack) units.push(u(`bottle or can (${p.quantity ?? `${pack} ml`})`, pack, `bottles or cans (${p.quantity ?? `${pack} ml`})`));
    units.push(u("pint", 568), u("half pint", 284, "half pints"));
  } else if (p.drink === "wine") {
    units.push(u("medium glass (175 ml)", 175, "medium glasses (175 ml)"), u("large glass (250 ml)", 250, "large glasses (250 ml)"), u("small glass (125 ml)", 125, "small glasses (125 ml)"));
    if (pack) units.push(u(`bottle (${p.quantity ?? `${pack} ml`})`, pack, `bottles (${p.quantity ?? `${pack} ml`})`));
  } else if (p.drink === "spirit") {
    units.push(u("single (25 ml)", 25, "singles (25 ml)"), u("double (50 ml)", 50, "doubles (50 ml)"));
  } else {
    if (pack) units.push(u(`bottle or can (${p.quantity ?? `${pack} ml`})`, pack, `bottles or cans (${p.quantity ?? `${pack} ml`})`));
    units.push(u("glass", 250));
  }
  return units;
}

export function unitsFromOff(p: { name: string; servingG?: number | null; packG?: number | null; quantity?: string | null; liquid?: boolean; drink?: string }): FoodUnit[] {
  if (p.liquid || p.drink) return drinkUnits(p);
  const units: FoodUnit[] = [];
  // A small single pack (a snack bag, a bar) is the serving people think in: offer it first.
  const singlePack = !!p.packG && p.packG > 0 && p.packG <= 60;
  // Listings often put '100 g' (the nutrition basis) in the serving field; a serving bigger than the pack can't be right.
  const servingOk = !!p.servingG && !(p.packG && p.servingG > p.packG);
  if (singlePack) units.push({ name: `pack (${p.quantity ?? `${p.packG} g`})`, plural: `packs (${p.quantity ?? `${p.packG} g`})`, g: p.packG! });
  if (servingOk && !(singlePack && p.servingG === p.packG)) units.push({ name: "serving", plural: "servings", g: p.servingG! });
  units.push(...householdUnitsFor(p.name));
  // Meals and sides in a pack (a pouch, a tray) are often shared: offer half and whole.
  if (p.packG && p.packG > 0 && !singlePack) {
    if (p.packG >= 150 && !units.length) units.push({ name: "half pack", plural: "half packs", g: Math.round(p.packG / 2) });
    units.push({ name: `pack (${p.quantity ?? `${p.packG} g`})`, plural: `packs (${p.quantity ?? `${p.packG} g`})`, g: p.packG });
  }
  // Nothing on the label: fall back to a typical portion for what the food is.
  if (!units.length) units.push(...dishUnitsFor(p.name));
  return units;
}

