import type { AppState } from "../types";

/*
 * Three-way merge of DAILY 15 data, used when two devices change the same
 * account between syncs. `base` is the last version both sides agreed on.
 *
 * - Lists of items with an id (workouts, foods, weigh-ins...) merge item by item.
 *   Additions on either side are kept. A deletion wins unless the other side
 *   edited that item. If both sides edited the same item, `local` wins.
 * - Day-keyed records (routine logs, water, activity) merge day by day, same rules.
 * - Rest days and completed food-diary days merge as sets.
 * - Single values (profile, routine, reminders, Health link) take whichever side
 *   changed, preferring `local` if both did.
 */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeValue<T>(base: T, local: T, remote: T): T {
  if (same(local, base)) return remote;
  return local;
}

function mergeById<T extends { id: string }>(base: T[] = [], local: T[] = [], remote: T[] = []): T[] {
  const b = new Map(base.map((x) => [x.id, x]));
  const l = new Map(local.map((x) => [x.id, x]));
  const r = new Map(remote.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const id of [...l.keys(), ...r.keys()]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const kept = mergeEntry(b.get(id), l.get(id), r.get(id));
    if (kept) out.push(kept);
  }
  return out;
}

function mergeEntry<T>(base: T | undefined, local: T | undefined, remote: T | undefined): T | undefined {
  if (base === undefined) return local ?? remote; // added on one or both sides
  if (local === undefined) return remote !== undefined && !same(remote, base) ? remote : undefined; // deleted here
  if (remote === undefined) return !same(local, base) ? local : undefined; // deleted there
  return mergeValue(base, local, remote);
}

function mergeRecord<T>(base: Record<string, T> = {}, local: Record<string, T> = {}, remote: Record<string, T> = {}): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const v = mergeEntry(base[k], local[k], remote[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function mergeSet(base: string[] = [], local: string[] = [], remote: string[] = []): string[] {
  const b = new Set(base);
  const l = new Set(local);
  const r = new Set(remote);
  const all = new Set([...local, ...remote]);
  return [...all].filter((x) => (l.has(x) && r.has(x)) || (l.has(x) && !b.has(x)) || (r.has(x) && !b.has(x))).sort();
}

export function mergeStates(base: AppState, local: AppState, remote: AppState): AppState {
  return {
    version: 1,
    profile: mergeValue(base.profile, local.profile, remote.profile),
    routine: mergeValue(base.routine, local.routine, remote.routine),
    routineSettings: mergeValue(base.routineSettings, local.routineSettings, remote.routineSettings),
    routineLogs: mergeRecord(base.routineLogs, local.routineLogs, remote.routineLogs),
    restDays: mergeSet(base.restDays, local.restDays, remote.restDays),
    workouts: mergeById(base.workouts, local.workouts, remote.workouts),
    templates: mergeById(base.templates, local.templates, remote.templates),
    foods: mergeById(base.foods, local.foods, remote.foods),
    savedMeals: mergeById(base.savedMeals, local.savedMeals, remote.savedMeals),
    customFoods: mergeById(base.customFoods, local.customFoods, remote.customFoods),
    foodDiaryDone: mergeSet(base.foodDiaryDone, local.foodDiaryDone, remote.foodDiaryDone),
    supplements: mergeRecord(base.supplements, local.supplements, remote.supplements),
    water: mergeRecord(base.water, local.water, remote.water),
    activity: mergeRecord(base.activity, local.activity, remote.activity),
    weights: mergeById(base.weights, local.weights, remote.weights),
    measurements: mergeById(base.measurements, local.measurements, remote.measurements),
    // Photos stay on each device and never sync.
    photos: local.photos,
    reminders: mergeValue(base.reminders, local.reminders, remote.reminders),
    health: mergeValue(base.health, local.health, remote.health),
  };
}

export { same as sameState };
