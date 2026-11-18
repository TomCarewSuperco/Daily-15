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
  /** Daily limits. Optional for profiles created before they existed. */
  satFatG?: number;
  sugarsG?: number;
  saltG?: number;
}

export type FocusGoal = "cholesterol" | "sugar" | "salt" | "fibre" | "fruit-veg" | "alcohol" | "protein";

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
  /** Extra areas to focus on in the weekly review. */
  focus?: FocusGoal[];
  targets: Targets;
  /** True once the user has edited targets by hand, so goal changes don't overwrite them. */
  targetsCustomised: boolean;
  /** When the user last accepted a calorie change from the weekly review. */
  adjustedAt?: string;
  /** Pregnancy or breastfeeding. Switches off calorie targets and weight-loss advice. */
  lifeStage?: { kind: "pregnant" | "breastfeeding"; dueDate?: string };
}

export type RoutineMode = "standard" | "light" | "recovery";

export interface RoutineExercise {
  id: string;
  /** Which round of the main block this is, when the routine has more than one. */
  round?: number;
  name: string;
  kind: "reps" | "time";
  /** Reps, or seconds when kind is 'time'. */
  amount: number;
  instructions: string;
}

export type Feeling = "easy" | "right" | "hard";

export interface RoutineLog {
  date: string;
  mode: RoutineMode;
  completedIds: string[];
  finished: boolean;
  /** How the session felt, asked at the end. */
  feeling?: Feeling;
}

export interface RoutineSettings {
  /** Difficulty step. 0 is the default amounts; each step is about 15% more or less. */
  level: number;
  /** Times through the main exercises, between the warm-up and the stretch. */
  rounds: number;
  /** Rotate similar exercises day to day. */
  variety: boolean;
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
  /** Optional: unknown for older entries and some products. Grams. */
  satFat?: number;
  sugars?: number;
  salt?: number;
}

export type FiveADayKind = "fv" | "juice" | "pulses";

export interface FoodEntry extends Nutrients {
  id: string;
  date: string;
  meal: Meal;
  name: string;
  portion: string;
  /** True for database, barcode or default values the user hasn't confirmed. */
  estimated: boolean;
  /** Fruit and vegetable portions (80 g each), before the daily caps on juice and pulses. */
  fiveADay?: number;
  fiveADayKind?: FiveADayKind;
  alcoholUnits?: number;
  caffeineMg?: number;
  /** How the portion was chosen, so the amount can be changed later. Absent on older entries. */
  source?: {
    name: string;
    base: Nutrients;
    per: number;
    baseUnit: "g" | "ml" | "serving";
    units: { name: string; plural: string; g: number }[];
    unitIdx: number;
    qty: number;
    estimated: boolean;
    fiveADay?: FiveADayKind;
    abv?: number;
    caffeine?: number;
  };
}

/** A food the user entered by hand and saved, with its everyday serving. */
export interface CustomFood extends Nutrients {
  id: string;
  name: string;
  /** Values are per this many grams or millilitres, or per one serving. */
  per: number;
  unit: "g" | "ml" | "serving";
  units: { name: string; plural: string; g: number }[];
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
  routineSettings?: RoutineSettings;
  routineLogs: Record<string, RoutineLog>;
  restDays: string[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  foods: FoodEntry[];
  savedMeals: SavedMeal[];
  customFoods: CustomFood[];
  /** Supplements ticked off per day, keyed by date. */
  supplements?: Record<string, string[]>;
  water: Record<string, number>;
  activity: Record<string, ActivityDay>;
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  photos: ProgressPhoto[];
  reminders: Reminder[];
  /** Apple Health or Health Connect link, native app only. */
  health?: { connected: boolean; lastSync?: string };
}
