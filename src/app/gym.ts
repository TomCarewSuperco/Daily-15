import { findExercise } from "./exercises";
import type { ExerciseEntry, SetEntry, Workout } from "./types";

/*
 * Progression for guided gym sessions. The rule is the standard 'double
 * progression' idea: if every set hit its target reps last time, add a small
 * amount of weight; otherwise repeat the weight. General guidance only.
 */

export interface LastTime {
  date: string;
  sets: SetEntry[];
}

export function lastTimeFor(workouts: Workout[], exercise: string): LastTime | null {
  const name = exercise.trim().toLowerCase();
  // Newest first; on the same day, the one logged later wins.
  const past = workouts.map((w, i) => ({ w, i })).sort((a, b) => b.w.date.localeCompare(a.w.date) || b.i - a.i).map((x) => x.w);
  for (const w of past) {
    const e = w.exercises.find((x) => x.name.trim().toLowerCase() === name);
    if (e && e.sets.length) return { date: w.date, sets: e.sets };
  }
  return null;
}

/** Smallest sensible jump: 2.5 kg for barbells, 2 kg for dumbbells and kettlebells, 5 kg on machines. */
export function increment(exercise: string): number {
  const eq = findExercise(exercise)?.equipment;
  if (eq === "barbell") return 2.5;
  if (eq === "machine") return 5;
  return 2;
}

export interface Suggestion {
  weightKg: number;
  /** Shown to the user. */
  note: string;
}

export function suggestNext(exercise: string, targetReps: number, last: LastTime | null): Suggestion | null {
  if (!last) return null;
  const weighted = last.sets.filter((s) => s.weightKg > 0);
  if (!weighted.length) return null;
  const top = Math.max(...weighted.map((s) => s.weightKg));
  const allHit = weighted.every((s) => s.reps >= targetReps);
  if (allHit) {
    const next = Math.round((top + increment(exercise)) * 2) / 2;
    return { weightKg: next, note: `You hit every rep last time. Try ${next} kg.` };
  }
  return { weightKg: top, note: `Stay at ${top} kg until you hit ${targetReps} reps on every set.` };
}

export function describeLast(last: LastTime): string {
  const w = last.sets[0].weightKg;
  const same = last.sets.every((s) => s.weightKg === w && s.reps === last.sets[0].reps);
  if (same) return `${last.sets.length} × ${last.sets[0].reps}${w ? ` at ${w} kg` : ""}`;
  return last.sets.map((s) => `${s.reps}${s.weightKg ? `×${s.weightKg}` : ""}`).join(", ");
}

/**
 * Plan for a session: each exercise's sets, pre-filled from the last time that exercise was done in any
 * workout. With `progress`, a weight that was lifted for every rep goes up one step.
 */
export function planSession(template: ExerciseEntry[], workouts: Workout[], progress = true): ExerciseEntry[] {
  return template.map((ex) => {
    const last = lastTimeFor(workouts, ex.name);
    return {
      name: ex.name,
      sets: ex.sets.map((s, i) => {
        const sug = progress ? suggestNext(ex.name, s.reps, last) : null;
        const lastSet = last?.sets[Math.min(i, last.sets.length - 1)];
        return { reps: s.reps, weightKg: s.weightKg || sug?.weightKg || lastSet?.weightKg || 0 };
      }),
    };
  });
}

/*
 * Rest between sets. Starting points by type of exercise (typical strength-training
 * practice, not a clinical standard): heavy barbell and leg-press work 2.5 minutes,
 * other weighted exercises 90 seconds, bodyweight, core and small isolation moves
 * 60 seconds. A rest the person picks for an exercise is remembered on the device.
 */
const HEAVY = /^(back squat|deadlift|bench press|overhead press|bent-over row|romanian deadlift|hip thrust|leg press)$/i;
const SMALL = /curl|raise|extension|pushdown|face pull|tricep/i;
/** 0 means no rest timer: straight on to the next set. */
export const REST_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 150, 180];

export function defaultRest(exercise: string): number {
  const eq = findExercise(exercise)?.equipment;
  if (HEAVY.test(exercise.trim())) return 150;
  if (!eq || eq === "none" || SMALL.test(exercise)) return 60;
  return 90;
}

const REST_KEY = "daily15:rest";

export function rememberedRests(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(REST_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function rememberRest(exercise: string, seconds: number): void {
  try {
    localStorage.setItem(REST_KEY, JSON.stringify({ ...rememberedRests(), [exercise.trim().toLowerCase()]: seconds }));
  } catch {
    /* storage unavailable: the rest still applies to this session */
  }
}

export function restFor(exercise: string, remembered: Record<string, number>): number {
  const r = remembered[exercise.trim().toLowerCase()];
  return typeof r === "number" ? r : defaultRest(exercise);
}
