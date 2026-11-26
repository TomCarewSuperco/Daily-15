import { Health, type HealthDataType, type WorkoutType } from "@capgo/capacitor-health";
import { addDays, lastNDays, todayKey, toKey, uid } from "../calc";
import type { AppState, Intensity, Workout } from "../types";
import { platform } from "./platform";

/*
 * Apple Health (and Android Health Connect) through @capgo/capacitor-health.
 * Reads steps, walking distance, active energy, exercise minutes, weight and
 * workouts. Writes weigh-ins back. Data stays on the phone apart from the
 * daily totals and workouts copied into the user's DAILY 15 data.
 */

const READ: HealthDataType[] = ["steps", "distance", "calories", "exerciseTime", "weight", "workouts"];
const WRITE: HealthDataType[] = ["weight"];

export const healthName = platform === "android" ? "Health Connect" : "Apple Health";

export async function healthAvailable(): Promise<boolean> {
  if (platform === "web") return false;
  try {
    return (await Health.isAvailable()).available;
  } catch {
    return false;
  }
}

export async function connectHealth(): Promise<boolean> {
  const status = await Health.requestAuthorization({ read: READ, write: WRITE });
  // iOS never reveals whether read access was refused, so treat the request as connected.
  return platform === "ios" || status.readAuthorized.includes("steps");
}

async function dailySums(dataType: HealthDataType, start: string, end: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const { samples } = await Health.queryAggregated({ dataType, startDate: start, endDate: end, bucket: "day", aggregation: "sum" });
    for (const s of samples) out[toKey(new Date(s.startDate))] = s.value;
  } catch {
    /* data type not permitted or unavailable */
  }
  return out;
}

const CATEGORY: Partial<Record<WorkoutType, string>> = {
  running: "Running",
  runningTreadmill: "Running",
  cycling: "Cycling",
  bikingStationary: "Cycling",
  swimming: "Swimming",
  swimmingPool: "Swimming",
  swimmingOpenWater: "Swimming",
  walking: "Walking",
  hiking: "Walking",
  boxing: "Boxing",
  kickboxing: "Boxing",
  yoga: "Yoga",
  pilates: "Pilates",
  highIntensityIntervalTraining: "HIIT",
  traditionalStrengthTraining: "Weight training",
  functionalStrengthTraining: "Weight training",
  strengthTraining: "Weight training",
  weightlifting: "Weight training",
  crossTraining: "Circuit training",
  mixedCardio: "Circuit training",
  coreTraining: "Home workout",
  stairClimbing: "Stair climber",
  stairClimbingMachine: "Stair climber",
  stairs: "Stair climber",
  stepTraining: "Stair climber",
  elliptical: "Cross-trainer",
  rowing: "Rowing machine",
  rowingMachine: "Rowing machine",
};

function intensityFor(minutes: number, kcal: number | undefined): Intensity {
  if (!kcal || minutes <= 0) return "moderate";
  const perMin = kcal / minutes;
  if (perMin >= 9) return "intense";
  if (perMin < 4) return "light";
  return "moderate";
}

export interface HealthSyncResult {
  next: (s: AppState) => AppState;
  days: number;
  workouts: number;
  weights: number;
}

/** Pulls the last `days` days from Health and returns a state updater. */
export async function pullHealth(days = 14): Promise<HealthSyncResult> {
  const keys = lastNDays(days);
  const start = new Date(`${keys[0]}T00:00:00`).toISOString();
  const end = new Date(`${addDays(todayKey(), 1)}T00:00:00`).toISOString();

  const [steps, distance, kcal, minutes] = await Promise.all([
    dailySums("steps", start, end),
    dailySums("distance", start, end),
    dailySums("calories", start, end),
    dailySums("exerciseTime", start, end),
  ]);

  let weightSamples: { date: string; kg: number }[] = [];
  try {
    const { samples } = await Health.readSamples({ dataType: "weight", startDate: start, endDate: end, limit: 200 });
    weightSamples = samples.map((s) => ({ date: toKey(new Date(s.startDate)), kg: Math.round(s.value * 10) / 10 }));
  } catch {
    /* not permitted */
  }

  let healthWorkouts: Workout[] = [];
  try {
    const { workouts } = await Health.queryWorkouts({ startDate: start, endDate: end, limit: 100 });
    healthWorkouts = workouts
      // Skip workouts DAILY 15 itself wrote, if any.
      .filter((w) => !(w.sourceName ?? "").toLowerCase().includes("daily 15"))
      .map((w) => {
        const durationMin = Math.max(1, Math.round(w.duration / 60));
        return {
          id: `health-${w.platformId ?? w.startDate}`,
          date: toKey(new Date(w.startDate)),
          category: CATEGORY[w.workoutType] ?? "Sport or other",
          name: `${CATEGORY[w.workoutType] ?? "Workout"} (${w.sourceName ?? healthName})`,
          durationMin,
          intensity: intensityFor(durationMin, w.totalEnergyBurned),
          distanceKm: w.totalDistance ? Math.round((w.totalDistance / 1000) * 100) / 100 : undefined,
          ...(w.totalEnergyBurned ? { kcalBurned: Math.round(w.totalEnergyBurned) } : {}),
          exercises: [],
          notes: `Imported from ${healthName}`,
        };
      });
  } catch {
    /* not permitted */
  }

  const next = (s: AppState): AppState => {
    const activity = { ...s.activity };
    for (const d of keys) {
      const st = Math.round(steps[d] ?? 0);
      if (!st && !minutes[d]) continue;
      activity[d] = {
        date: d,
        steps: st || activity[d]?.steps || 0,
        distanceKm: distance[d] ? Math.round((distance[d] / 1000) * 10) / 10 : activity[d]?.distanceKm ?? 0,
        activeMinutes: Math.round(minutes[d] ?? activity[d]?.activeMinutes ?? 0),
        activityKcal: Math.round(kcal[d] ?? activity[d]?.activityKcal ?? 0),
      };
    }
    // Keep weigh-ins entered in the app. Add Health readings for other days, latest reading per day.
    const haveDate = new Set(s.weights.map((w) => w.date));
    const perDay = new Map<string, number>();
    weightSamples.forEach((w) => perDay.set(w.date, w.kg));
    const addedWeights = [...perDay].filter(([d]) => !haveDate.has(d)).map(([date, kg]) => ({ id: uid(), date, kg }));
    const haveWorkout = new Set(s.workouts.map((w) => w.id));
    const addedWorkouts = healthWorkouts.filter((w) => !haveWorkout.has(w.id));
    return { ...s, activity, weights: [...s.weights, ...addedWeights], workouts: [...s.workouts, ...addedWorkouts] };
  };

  return { next, days: keys.filter((d) => steps[d]).length, workouts: healthWorkouts.length, weights: weightSamples.length };
}

export async function saveWeightToHealth(kg: number, date: string): Promise<void> {
  const at = date === todayKey() ? new Date() : new Date(`${date}T08:00:00`);
  await Health.saveSample({ dataType: "weight", value: kg, unit: "kilogram", startDate: at.toISOString(), endDate: at.toISOString() });
}
