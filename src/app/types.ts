export type Sex = "female" | "male";
export type Experience = "beginner" | "intermediate" | "advanced";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very-active";
export type Goal =
  | "lose-fat"
  | "lose-weight"
  | "build-muscle"
  | "cardio"
  | "strength"
  | "maintain"
  | "health";

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  steps: number;
  activeMinutes: number;
}

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  experience: Experience;
  activityLevel: ActivityLevel;
  goal: Goal;
  targets: Targets;
  /** True once the user has edited targets by hand, so goal changes don't overwrite them. */
  targetsCustomised: boolean;
}

export type RoutineMode = "standard" | "light" | "recovery";

export interface RoutineExercise {
  id: string;
  name: string;
  kind: "reps" | "time";
  /** Reps, or seconds when kind is 'time'. */
  amount: number;
  instructions: string;
}

export interface RoutineLog {
  date: string;
  mode: RoutineMode;
  completedIds: string[];
  finished: boolean;
}

export type Intensity = "light" | "moderate" | "intense";

export interface SetEntry {
  reps: number;
  weightKg: number;
}

export interface ExerciseEntry {
  name: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  date: string;
  category: string;
  name: string;
  durationMin: number;
  intensity: Intensity;
  distanceKm?: number;
  restSec?: number;
  exercises: ExerciseEntry[];
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  intensity: Intensity;
  exercises: ExerciseEntry[];
}

export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface FoodEntry extends Nutrients {
  id: string;
  date: string;
  meal: Meal;
  name: string;
  portion: string;
  /** True for database, barcode or default values the user hasn't confirmed. */
  estimated: boolean;
}

export interface SavedMeal extends Nutrients {
  id: string;
  name: string;
  portion: string;
}

export interface ActivityDay {
  date: string;
  steps: number;
  distanceKm: number;
  activeMinutes: number;
  activityKcal: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface MeasurementEntry {
  id: string;
  date: string;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  dataUrl: string;
}

export type ReminderType = "workout" | "food" | "steps" | "water" | "weigh-in" | "weekly-review";

export interface Reminder {
  type: ReminderType;
  enabled: boolean;
  time: string;
  /** 0 = Sunday. Used by weekly reminders only. */
  weekday?: number;
}

export interface AppState {
  version: 1;
  profile: Profile | null;
  routine: RoutineExercise[];
  routineLogs: Record<string, RoutineLog>;
  restDays: string[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  foods: FoodEntry[];
  savedMeals: SavedMeal[];
  water: Record<string, number>;
  activity: Record<string, ActivityDay>;
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  photos: ProgressPhoto[];
  reminders: Reminder[];
  /** Apple Health or Health Connect link, native app only. */
  health?: { connected: boolean; lastSync?: string };
}
