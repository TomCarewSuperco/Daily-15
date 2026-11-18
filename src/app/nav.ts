export type TabId = "home" | "workouts" | "nutrition" | "progress" | "profile";
export type Intent = "start-routine" | "add-food" | "log-workout" | "weekly-report" | null;
export type Navigate = (tab: TabId, intent?: Intent) => void;
