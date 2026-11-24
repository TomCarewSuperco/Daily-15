import { dishUnitsFor, householdUnitsFor } from "./cofid";
import type { FoodUnit } from "./foods";

/** Everyday measures for a branded product from its listing: pack, serving, household units, then a typical portion. */
export function unitsFromOff(p: { name: string; servingG?: number | null; packG?: number | null; quantity?: string | null }): FoodUnit[] {
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

