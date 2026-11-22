import { DEFAULT_ROUTINE, MOBILITY_ROUTINE, SUBSTITUTES } from "./data";
import { fromKey, todayKey } from "./calc";
import type { Feeling, RoutineExercise, RoutineLog, RoutineMode, RoutineSettings } from "./types";

/*
 * Builds the day's DAILY 15: a warm-up, the main exercises for one or more
 * rounds, then a stretch. Difficulty scales the main exercises up or down,
 * and variety rotates similar movements day to day.
 */

export const DEFAULT_SETTINGS: RoutineSettings = { level: 0, rounds: 2, variety: true };
export const MIN_LEVEL = -3;
export const MAX_LEVEL = 6;
export const MAX_ROUNDS = 3;

export function settingsOf(s: { routineSettings?: RoutineSettings }): RoutineSettings {
  return { ...DEFAULT_SETTINGS, ...s.routineSettings };
}

const WARM_UP = "march";
const COOL_DOWN = "stretch";

const sub = (name: string): Omit<RoutineExercise, "id"> => {
  const s = SUBSTITUTES.find((x) => x.name === name);
  if (!s) throw new Error(`Unknown exercise ${name}`);
  return s;
};

/** Similar movements for each default slot. The first is the default. */
const VARIANTS: Record<string, Omit<RoutineExercise, "id">[]> = {
  squat: [DEFAULT_ROUTINE.find((e) => e.id === "squat")!, sub("Reverse lunges"), sub("Step-ups")],
  plank: [DEFAULT_ROUTINE.find((e) => e.id === "plank")!, sub("Dead bug"), sub("Bird dog"), sub("Side plank")],
  knees: [DEFAULT_ROUTINE.find((e) => e.id === "knees")!, sub("Jumping jacks")],
};

function dayNumber(date: string): number {
  return Math.floor(fromKey(date).getTime() / 86_400_000);
}

/** Today's version of a slot, unless the user has swapped it themselves. */
function vary(e: RoutineExercise, date: string): RoutineExercise {
  const options = VARIANTS[e.id];
  const original = DEFAULT_ROUTINE.find((d) => d.id === e.id);
  if (!options || !original || e.name !== original.name || e.amount !== original.amount) return e;
  const pick = options[(dayNumber(date) + e.id.length) % options.length];
  return { ...pick, id: e.id };
}

/** Difficulty steps applied to one exercise: the overall level plus its own bias, within the limits. */
export function levelFor(settings: RoutineSettings, id: string): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, settings.level + (settings.bias?.[id] ?? 0)));
}

export const scaleFactor = (level: number) => (level ? Math.max(0.55, 1 + 0.15 * level) : 1);

/** The amount the user actually does today, after difficulty. */
export function shownAmount(e: RoutineExercise, settings: RoutineSettings): number {
  return scale(e, levelFor(settings, e.id)).amount;
}

/** The stored base amount that comes out as `shown` at the exercise's current difficulty. */
export function baseForShown(shown: number, e: RoutineExercise, settings: RoutineSettings): number {
  return Math.round((shown / scaleFactor(levelFor(settings, e.id))) * 100) / 100;
}

function scale(e: RoutineExercise, level: number): RoutineExercise {
  if (!level) return e;
  const factor = scaleFactor(level);
  const amount = e.kind === "reps" ? Math.max(3, Math.round(e.amount * factor)) : Math.max(10, Math.round((e.amount * factor) / 5) * 5);
  return { ...e, amount };
}

export function buildRoutine(base: RoutineExercise[], mode: RoutineMode, settings: RoutineSettings, date = todayKey()): RoutineExercise[] {
  if (mode === "recovery") return MOBILITY_ROUTINE.map((e, i) => ({ ...e, id: `mob-${i}` }));
  const warm = base.filter((e) => e.id === WARM_UP);
  const cool = base.filter((e) => e.id === COOL_DOWN);
  let main = base.filter((e) => e.id !== WARM_UP && e.id !== COOL_DOWN);
  if (settings.variety) main = main.map((e) => vary(e, date));
  main = main.map((e) => scale(e, levelFor(settings, e.id)));
  let rounds = settings.rounds;
  if (mode === "light") {
    main = main.map((e) => ({ ...e, amount: Math.max(e.kind === "time" ? 10 : 3, Math.round(e.amount / 2)) }));
    rounds = 1;
  }
  const expanded: RoutineExercise[] = [];
  for (let r = 1; r <= rounds; r++) for (const e of main) expanded.push({ ...e, id: r === 1 ? e.id : `${e.id}~r${r}`, round: rounds > 1 ? r : undefined });
  return [...warm, ...expanded, ...cool];
}

/** Rough duration: timed exercises as set, about 3 seconds a rep, 15 seconds between exercises. */
export function estimateMinutes(list: RoutineExercise[]): number {
  const secs = list.reduce((s, e) => s + (e.kind === "time" ? e.amount : e.amount * 3) + 15, 0);
  return Math.max(1, Math.round(secs / 60));
}

/** The main exercises once each, for showing what the next session looks like. */
export function mainOnce(list: RoutineExercise[]): RoutineExercise[] {
  return list.filter((e) => e.id !== WARM_UP && e.id !== COOL_DOWN && (e.round ?? 1) === 1);
}

export interface Proposal {
  settings: RoutineSettings;
  headline: string;
  detail: string;
  /** Short name for this choice when there are alternatives, e.g. 'More reps'. */
  label?: string;
  /** Projected session length in minutes, when today's time is known. */
  minutes?: number;
  /** Other ways to get there; the first entry is this proposal. */
  options?: Proposal[];
}

/** The daily routine aims for about this many minutes. */
export const TARGET_MINUTES = 15;

const fmtMin = (sec: number) => `${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} s` : ""}`;

/**
 * Ways to do a bit more tomorrow. With today's time, the option that lands
 * closest to 15 minutes comes first; without it, extra reps until level 3, then a round.
 */
function stepUpOptions(current: RoutineSettings, seconds?: number): Proposal[] {
  const opts: Proposal[] = [];
  if (current.level < MAX_LEVEL)
    opts.push({ settings: { ...current, level: current.level + 1 }, label: "More reps", headline: "Step it up a little", detail: "About 15% more reps and time on the main exercises.", minutes: seconds ? Math.round((seconds * 1.12) / 60) : undefined });
  if (current.rounds < MAX_ROUNDS)
    opts.push({ settings: { ...current, rounds: current.rounds + 1 }, label: "Another round", headline: "Add a round", detail: "One more time through the main exercises.", minutes: seconds ? Math.round((seconds * (1 + 0.85 / current.rounds)) / 60) : undefined });
  if (seconds) {
    // Well short of 15 minutes, another round is the natural step if it lands within about 3 minutes over;
    // otherwise whichever lands closest to 15.
    const round = opts.find((o) => o.label === "Another round");
    const wellShort = seconds <= (TARGET_MINUTES - 2) * 60;
    if (round && wellShort && round.minutes! <= TARGET_MINUTES + 3) opts.sort((a) => (a === round ? -1 : 1));
    else opts.sort((a, b) => Math.abs(a.minutes! - TARGET_MINUTES) - Math.abs(b.minutes! - TARGET_MINUTES));
  }
  else if (current.level >= 3) opts.reverse();
  return opts;
}

/**
 * What to change after a session. Never changes anything by itself: the app
 * shows the proposal and the user accepts or keeps things as they are.
 */
export function proposeAfter(feeling: Feeling, current: RoutineSettings, recentLogs: RoutineLog[], seconds?: number): Proposal | null {
  const short = seconds !== undefined && seconds > 0 && seconds < (TARGET_MINUTES - 1) * 60;
  const timeNote = seconds ? `You took ${fmtMin(seconds)}, against the ${TARGET_MINUTES} minutes a day you're aiming for. ` : "";
  const withOptions = (opts: Proposal[], headline: string, detail: string): Proposal | null =>
    opts.length ? { ...opts[0], headline, detail: `${detail} ${opts.length > 1 ? "Choose more reps or another round." : opts[0].detail}`.trim(), options: opts } : null;

  if (feeling === "easy") {
    const opts = stepUpOptions(current, seconds);
    if (!opts.length) return null;
    if (!seconds) return { ...opts[0], options: opts.length > 1 ? opts : undefined, detail: current.level >= 3 && opts[0].label === "Another round" ? "You're well past the starting level, so an extra round will challenge you more than extra reps." : opts[0].detail };
    return withOptions(opts, "Step it up a little", timeNote);
  }
  if (feeling === "hard") {
    if (current.level > MIN_LEVEL) return { settings: { ...current, level: current.level - 1 }, headline: "Ease off a little", detail: "About 15% fewer reps and less time on the main exercises. Build back up when it feels comfortable." };
    if (current.rounds > 1) return { settings: { ...current, rounds: current.rounds - 1 }, headline: "Drop a round", detail: "One fewer time through the main exercises." };
    return null;
  }
  // About right, but well under 15 minutes: there's room for a little more.
  if (short) return withOptions(stepUpOptions(current, seconds), "Room for a little more", timeNote);
  // Three 'about right' sessions in a row: suggest a small step up so progress continues.
  const lastThree = recentLogs.filter((l) => l.finished && l.mode === "standard").slice(-3);
  if (lastThree.length === 3 && lastThree.every((l) => l.feeling === "right") && current.level < MAX_LEVEL) {
    return { settings: { ...current, level: current.level + 1 }, headline: "Ready for a little more?", detail: "Three sessions felt about right. A small step up keeps you progressing." };
  }
  return null;
}
