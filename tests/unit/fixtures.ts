import type { AppState } from "../../src/app/types";

/** Mirrors emptyState() in store.tsx without importing React or Supabase. */
export function emptyStateForTests(): AppState {
  return { version: 1, profile: null, routine: [], routineLogs: {}, restDays: [], workouts: [], templates: [], foods: [], savedMeals: [], water: {}, activity: {}, weights: [], measurements: [], photos: [], reminders: [] };
}
