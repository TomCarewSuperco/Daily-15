import type {
  ActivityLevel,
  AppState,
  FoodEntry,
  Goal,
  Nutrients,
  Profile,
  Targets,
  WeightEntry,
  Workout,
} from "./types";

/* ---------- Dates (local time, YYYY-MM-DD) ---------- */

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function lastNDays(n: number, end = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return fromKey(key).toLocaleDateString("en-GB", opts);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------- Targets ---------- */

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

const STEP_TARGET: Record<ActivityLevel, number> = {
  sedentary: 6000,
  light: 7500,
  moderate: 8500,
  active: 10000,
  "very-active": 12000,
};

export const GOAL_LABELS: Record<Goal, string> = {
  "lose-fat": "Lose body fat",
  "lose-weight": "Lose weight",
  "build-muscle": "Build muscle",
  cardio: "Improve cardiovascular fitness",
  strength: "Improve strength",
  maintain: "Maintain current weight",
  health: "Improve general health",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Active",
  "very-active": "Very active",
};

type TargetInput = Pick<Profile, "age" | "sex" | "heightCm" | "startWeightKg" | "targetWeightKg" | "activityLevel" | "goal">;

/** Resting energy by the Mifflin-St Jeor equation. An estimate. */
export function bmr(p: Pick<Profile, "age" | "sex" | "heightCm">, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

export function maintenanceCalories(p: TargetInput, weightKg = p.startWeightKg): number {
  return bmr(p, weightKg) * ACTIVITY_FACTOR[p.activityLevel];
}

/**
 * Suggested daily targets. Deliberately moderate: a deficit of up to 500 kcal,
 * capped at 20% of maintenance and never below a floor. These are starting
 * points and are labelled as estimates in the UI.
 */
export function suggestTargets(p: TargetInput, weightKg = p.startWeightKg): Targets {
  const tdee = maintenanceCalories(p, weightKg);
  let calories = tdee;
  if (p.goal === "lose-fat" || p.goal === "lose-weight") {
    calories = tdee - Math.min(500, tdee * 0.2);
  } else if (p.goal === "build-muscle") {
    calories = tdee + 250;
  }
  const floor = p.sex === "male" ? 1500 : 1200;
  calories = Math.max(floor, Math.round(calories / 10) * 10);

  const losing = p.goal === "lose-fat" || p.goal === "lose-weight";
  const proteinPerKg = losing || p.goal === "build-muscle" || p.goal === "strength" ? 1.8 : 1.4;
  // Base protein on the lower of current and target weight so it stays sensible at higher body weights.
  const proteinBase = losing ? Math.min(weightKg, Math.max(p.targetWeightKg, weightKg * 0.8)) : weightKg;
  const proteinG = Math.round(proteinBase * proteinPerKg);
  const fatG = Math.round((calories * 0.3) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  const waterMl = Math.min(3500, Math.max(1500, Math.round((weightKg * 30) / 250) * 250));

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fibreG: 30,
    waterMl,
    steps: STEP_TARGET[p.activityLevel],
    activeMinutes: 30,
    satFatG: p.sex === "male" ? 30 : 20,
    sugarsG: 90,
    saltG: 6,
  };
}

/* ---------- Nutrition ---------- */

const EXTRAS = ["satFat", "sugars", "salt"] as const;
export type Extra = (typeof EXTRAS)[number];

/** Sums nutrients. Optional extras are summed over the entries that have them. */
export function sumNutrients(entries: Nutrients[]): Nutrients {
  const out: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const e of entries) {
    out.kcal += e.kcal;
    out.protein += e.protein;
    out.carbs += e.carbs;
    out.fat += e.fat;
    out.fibre += e.fibre;
    for (const k of EXTRAS) if (typeof e[k] === "number") out[k] = (out[k] ?? 0) + (e[k] as number);
  }
  return out;
}

/** Share of calories (0 to 1) from entries where `field` is known. Low coverage means the total undercounts. */
export function coverage(entries: Nutrients[], field: Extra): number {
  const total = entries.reduce((s, e) => s + e.kcal, 0);
  if (!total) return entries.length ? (entries.every((e) => typeof e[field] === "number") ? 1 : 0) : 1;
  return entries.filter((e) => typeof e[field] === "number").reduce((s, e) => s + e.kcal, 0) / total;
}

export function foodsOn(state: AppState, date: string): FoodEntry[] {
  return state.foods.filter((f) => f.date === date);
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const r = (v: number) => Math.round(v * factor * 10) / 10;
  const out: Nutrients = { kcal: Math.round(n.kcal * factor), protein: r(n.protein), carbs: r(n.carbs), fat: r(n.fat), fibre: r(n.fibre) };
  for (const k of EXTRAS) if (typeof n[k] === "number") out[k] = Math.round((n[k] as number) * factor * 100) / 100;
  return out;
}

/** Fruit and vegetable portions for a day. Juice and pulses count once a day at most. */
export function fiveADayOn(state: AppState, date: string): number {
  let fv = 0;
  let juice = 0;
  let pulses = 0;
  for (const f of foodsOn(state, date)) {
    if (!f.fiveADay) continue;
    if (f.fiveADayKind === "juice") juice += f.fiveADay;
    else if (f.fiveADayKind === "pulses") pulses += f.fiveADay;
    else fv += f.fiveADay;
  }
  return Math.round((fv + Math.min(1, juice) + Math.min(1, pulses)) * 10) / 10;
}

export function alcoholUnits(state: AppState, dates: string[]): number {
  const set = new Set(dates);
  return Math.round(state.foods.filter((f) => set.has(f.date)).reduce((s, f) => s + (f.alcoholUnits ?? 0), 0) * 10) / 10;
}

/**
 * Daily limits. Saturated fat follows the NHS guide of 30 g for men and 20 g
 * for women, salt 6 g, and total sugars the 90 g reference intake on UK labels.
 */
export function limitsFor(p: Pick<Profile, "sex" | "targets">) {
  return {
    satFatG: p.targets.satFatG ?? (p.sex === "male" ? 30 : 20),
    sugarsG: p.targets.sugarsG ?? 90,
    saltG: p.targets.saltG ?? 6,
  };
}

/** UK Chief Medical Officers' low-risk guideline. */
export const ALCOHOL_UNITS_PER_WEEK = 14;
export const FIVE_A_DAY = 5;

/* ---------- Weight ---------- */

export function sortedWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => a.date.localeCompare(b.date));
}

export function latestWeight(state: AppState): number | null {
  const w = sortedWeights(state.weights);
  return w.length ? w[w.length - 1].kg : state.profile?.startWeightKg ?? null;
}

/** Average of weigh-ins in the seven days ending on `date`. Smooths daily water and food swings. */
export function trendWeight(weights: WeightEntry[], date: string): number | null {
  const start = addDays(date, -6);
  const inWindow = weights.filter((w) => w.date >= start && w.date <= date);
  if (!inWindow.length) return null;
  return inWindow.reduce((s, w) => s + w.kg, 0) / inWindow.length;
}

export function weightSeries(weights: WeightEntry[]) {
  return sortedWeights(weights).map((w) => ({
    date: w.date,
    label: formatDay(w.date, { day: "numeric", month: "short" }),
    kg: w.kg,
    trend: Math.round((trendWeight(weights, w.date) ?? w.kg) * 10) / 10,
  }));
}

/* ---------- Activity, streaks and consistency ---------- */

export function workoutsOn(state: AppState, date: string): Workout[] {
  return state.workouts.filter((w) => w.date === date);
}

/**
 * Active minutes for a day: the daily routine (its timed length, or 15 minutes
 * if finished without a time), logged workouts, and minutes entered by hand or
 * from Apple Health. Health's exercise minutes already include workouts done
 * with a watch, so with Health connected the larger figure is used, not the sum.
 */
export function activeMinutesOn(state: AppState, date: string): number {
  const extra = state.activity[date]?.activeMinutes ?? 0;
  const r = state.routineLogs[date];
  const routine = r?.seconds ? Math.round(r.seconds / 60) : r?.finished ? 15 : 0;
  const sessions = routine + workoutsOn(state, date).reduce((s, w) => s + (w.durationMin || 0), 0);
  return state.health?.connected ? Math.max(extra, sessions) : extra + sessions;
}

/** A day counts as active if the daily routine was finished or any workout was logged. */
export function isActiveDay(state: AppState, date: string): boolean {
  return !!state.routineLogs[date]?.finished || state.workouts.some((w) => w.date === date);
}

export function isRestDay(state: AppState, date: string): boolean {
  return state.restDays.includes(date);
}

/**
 * Current streak of active days. Planned rest days pause the streak without
 * breaking it. Today doesn't break the streak until it's over.
 */
export function currentStreak(state: AppState): number {
  let day = todayKey();
  if (!isActiveDay(state, day)) day = addDays(day, -1);
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    if (isActiveDay(state, day)) streak++;
    else if (!isRestDay(state, day)) break;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(state: AppState): number {
  const days = new Set<string>([...Object.keys(state.routineLogs).filter((d) => state.routineLogs[d].finished), ...state.workouts.map((w) => w.date)]);
  if (!days.size) return 0;
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      // Walk across any rest days between active days.
      let next = addDays(prev, 1);
      while (next < d && isRestDay(state, next)) next = addDays(next, 1);
      run = next === d ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return Math.max(best, currentStreak(state));
}

export function totalActiveDays(state: AppState): number {
  const days = new Set<string>([...Object.keys(state.routineLogs).filter((d) => state.routineLogs[d].finished), ...state.workouts.map((w) => w.date)]);
  return days.size;
}

export function foodLoggingStreak(state: AppState): number {
  const logged = new Set(state.foods.map((f) => f.date));
  let day = todayKey();
  if (!logged.has(day)) day = addDays(day, -1);
  let n = 0;
  while (logged.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Rough training load over the last seven days, used to suggest rest. */
export function recentLoad(state: AppState): { intenseDays: number; totalMinutes: number } {
  const days = lastNDays(7);
  const recent = state.workouts.filter((w) => days.includes(w.date));
  const intenseDays = new Set(recent.filter((w) => w.intensity === "intense").map((w) => w.date)).size;
  return { intenseDays, totalMinutes: recent.reduce((s, w) => s + w.durationMin, 0) };
}

export function restAdvice(state: AppState): string | null {
  const { intenseDays, totalMinutes } = recentLoad(state);
  const yesterday = addDays(todayKey(), -1);
  const hardYesterday = state.workouts.some((w) => w.date === yesterday && w.intensity === "intense");
  if (intenseDays >= 4) return "Four or more intense sessions this week. Make today a recovery or rest day.";
  if (totalMinutes > 600) return "Over ten hours of training this week. Ease off and use recovery mode today.";
  if (hardYesterday) return "Hard session yesterday. Light or recovery mode is a sensible choice today.";
  return null;
}

/* ---------- Personal bests ---------- */

export interface PersonalBest {
  exercise: string;
  weightKg: number;
  reps: number;
  date: string;
}

export function personalBests(workouts: Workout[]): PersonalBest[] {
  const best = new Map<string, PersonalBest>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const key = ex.name.trim().toLowerCase();
      if (!key) continue;
      for (const s of ex.sets) {
        const cur = best.get(key);
        const better = !cur || s.weightKg > cur.weightKg || (s.weightKg === cur.weightKg && s.reps > cur.reps);
        if (better && (s.reps > 0 || s.weightKg > 0)) best.set(key, { exercise: ex.name.trim(), weightKg: s.weightKg, reps: s.reps, date: w.date });
      }
    }
  }
  return [...best.values()].sort((a, b) => a.exercise.localeCompare(b.exercise));
}

export function cardioBests(workouts: Workout[]) {
  const out: { category: string; longestKm: number; fastestPace: number | null }[] = [];
  const byCat = new Map<string, Workout[]>();
  workouts.filter((w) => w.distanceKm && w.distanceKm > 0).forEach((w) => byCat.set(w.category, [...(byCat.get(w.category) ?? []), w]));
  byCat.forEach((list, category) => {
    const longestKm = Math.max(...list.map((w) => w.distanceKm!));
    const paces = list.filter((w) => w.durationMin > 0).map((w) => w.durationMin / w.distanceKm!);
    out.push({ category, longestKm, fastestPace: paces.length ? Math.min(...paces) : null });
  });
  return out;
}

export function formatPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

/* ---------- Weekly report ---------- */

export interface WeeklyReport {
  start: string;
  end: string;
  workoutsCompleted: number;
  routineDays: number;
  exerciseMinutes: number;
  avgSteps: number | null;
  stepGoalDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  foodDays: number;
  weightChange: number | null;
  measurementChanges: { label: string; change: number }[];
  goalCompletion: number;
  achievements: string[];
  suggestions: string[];
}

export function weeklyReport(state: AppState, end = todayKey()): WeeklyReport {
  const days = lastNDays(7, end);
  const start = days[0];
  const t = state.profile?.targets;
  const inWeek = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date >= start && x.date <= end);

  const workouts = inWeek(state.workouts);
  const routineDays = days.filter((d) => state.routineLogs[d]?.finished).length;
  const activeDays = days.filter((d) => isActiveDay(state, d)).length;
  const routineMinutes = routineDays * 8;
  const exerciseMinutes = workouts.reduce((s, w) => s + w.durationMin, 0) + routineMinutes;

  const activity = days.map((d) => state.activity[d]).filter((a): a is NonNullable<typeof a> => !!a && a.steps > 0);
  const avgSteps = activity.length ? Math.round(activity.reduce((s, a) => s + a.steps, 0) / activity.length) : null;
  const stepGoalDays = t ? activity.filter((a) => a.steps >= t.steps).length : 0;

  const foodDays = days.filter((d) => state.foods.some((f) => f.date === d));
  const dayTotals = foodDays.map((d) => sumNutrients(foodsOn(state, d)));
  const avgCalories = dayTotals.length ? Math.round(dayTotals.reduce((s, n) => s + n.kcal, 0) / dayTotals.length) : null;
  const avgProtein = dayTotals.length ? Math.round(dayTotals.reduce((s, n) => s + n.protein, 0) / dayTotals.length) : null;
  const calorieDays = t ? dayTotals.filter((n) => n.kcal <= t.calories * 1.05).length : 0;
  const proteinDays = t ? dayTotals.filter((n) => n.protein >= t.proteinG * 0.9).length : 0;

  const endTrend = trendWeight(state.weights, end);
  const startTrend = trendWeight(state.weights, addDays(start, -1));
  const weightChange = endTrend !== null && startTrend !== null ? Math.round((endTrend - startTrend) * 10) / 10 : null;

  const ms = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const before = ms.filter((m) => m.date < start).pop();
  const latest = ms.filter((m) => m.date <= end).pop();
  const measurementChanges: { label: string; change: number }[] = [];
  if (before && latest && latest.date >= start) {
    (["waistCm", "chestCm", "hipsCm"] as const).forEach((k) => {
      if (before[k] && latest[k]) measurementChanges.push({ label: k.replace("Cm", ""), change: Math.round((latest[k]! - before[k]!) * 10) / 10 });
    });
  }

  // Four equally weighted daily goals: move, steps, calories, protein.
  const possible = 7 * 4;
  const hit = activeDays + stepGoalDays + calorieDays + proteinDays;
  const goalCompletion = Math.round((hit / possible) * 100);

  const achievements: string[] = [];
  const suggestions: string[] = [];
  if (activeDays >= 5) achievements.push(`Active on ${activeDays} of seven days.`);
  else if (activeDays > 0) achievements.push(`Showed up on ${activeDays} ${activeDays === 1 ? "day" : "days"}. Every one counts.`);
  if (stepGoalDays >= 4) achievements.push(`Hit your step target on ${stepGoalDays} days.`);
  if (proteinDays >= 4) achievements.push(`Protein target met on ${proteinDays} days.`);
  if (weightChange !== null && weightChange < 0 && state.profile && state.profile.targetWeightKg < state.profile.startWeightKg)
    achievements.push(`Trend weight down ${Math.abs(weightChange).toFixed(1)} kg.`);
  if (foodDays.length >= 6) achievements.push("Food logged on almost every day.");

  if (activeDays < 5) suggestions.push(`Aim for ${Math.min(7, activeDays + 1)} active days next week. Light mode counts.`);
  if (avgSteps !== null && t && avgSteps < t.steps) suggestions.push(`Add about ${roundTo(Math.min(2000, t.steps - avgSteps), 250).toLocaleString("en-GB")} steps a day. A 15-minute walk is roughly 1,500.`);
  if (avgSteps === null) suggestions.push("Record your steps each day to see your movement trend.");
  if (avgProtein !== null && t && avgProtein < t.proteinG * 0.9) suggestions.push(`Protein averaged ${avgProtein} g against ${t.proteinG} g. Add a protein source to breakfast.`);
  if (foodDays.length < 4) suggestions.push("Log food on at least four days for a reliable picture.");
  if (state.weights.filter((w) => w.date >= start).length < 2) suggestions.push("Weigh in two or three times a week at the same time for a clearer trend.");

  return {
    start,
    end,
    workoutsCompleted: workouts.length + routineDays,
    routineDays,
    exerciseMinutes,
    avgSteps,
    stepGoalDays,
    avgCalories,
    avgProtein,
    foodDays: foodDays.length,
    weightChange,
    measurementChanges,
    goalCompletion,
    achievements,
    suggestions: suggestions.slice(0, 3),
  };
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
