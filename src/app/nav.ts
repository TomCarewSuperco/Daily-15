export type TabId = "home" | "workouts" | "nutrition" | "progress" | "profile";
/** `show-day:YYYY-MM-DD` opens Nutrition on that day. */
export type Intent = "start-routine" | "start-recovery" | "add-food" | "log-workout" | "weekly-report" | `show-day:${string}` | null;
export type Navigate = (tab: TabId, intent?: Intent) => void;
