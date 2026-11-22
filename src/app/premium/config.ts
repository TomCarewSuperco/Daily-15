/*
 * Subscriptions. The paywall stays off until launch (VITE_PAYWALL=on), so
 * everyone keeps every feature while testing. The RevenueCat public iOS key
 * goes in VITE_REVENUECAT_IOS_KEY; the entitlement is called 'premium'.
 * Set-up steps: docs/subscriptions.md.
 */
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const PAYWALL_ENABLED = env.VITE_PAYWALL === "on";
export const REVENUECAT_IOS_KEY = env.VITE_REVENUECAT_IOS_KEY ?? "";
export const ENTITLEMENT = "premium";

/** What Premium unlocks, in the order shown on the paywall. */
export const PREMIUM_FEATURES = [
  "Your weekly review: what to eat more and less of, and target changes based on your weight trend",
  "Focus areas, such as cholesterol, salt or sugar, with tags in your diary",
  "Smart progression: harder or easier, more reps or another round, based on how it felt and how long it took",
  "Gym progression: the next weight to lift, from your last session",
] as const;

export type PremiumFeature = "weekly-review" | "focus-areas" | "progression" | "gym-progression";
