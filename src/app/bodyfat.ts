import type { Profile } from "./types";

/*
 * Body fat estimated from waist and height (relative fat mass: Woolcott and
 * Bergman, 2018), with healthy ranges by age and sex (Gallagher et al., 2000).
 * An estimate for the person, not a measurement: it can be five percentage
 * points out either way. For review by a dietitian.
 */

/** Healthy body fat ranges, percent, by sex and age band. */
const RANGES: Record<"male" | "female", [maxAge: number, low: number, high: number][]> = {
  male: [[39, 8, 19], [59, 11, 21], [200, 13, 24]],
  female: [[39, 21, 32], [59, 23, 33], [200, 24, 35]],
};

/** Weekly loss used for the time estimate. */
const WEEKLY_KG = 0.5;

export interface BodyFatEstimate {
  pct: number;
  fatKg: number;
  range: [number, number];
  /** The target: one point under the top of the healthy range. */
  targetPct: number;
  /** Fat to lose to reach the target, keeping muscle. 0 when already there. */
  toLoseKg: number;
  targetWeightKg: number;
  targetWaistCm: number;
  weeks: number;
}

export function bodyFat(profile: Profile, waistCm: number, weightKg: number): BodyFatEstimate | null {
  const sex = profile.sex === "male" || profile.sex === "female" ? profile.sex : null;
  const h = profile.heightCm;
  if (!sex || !h || !waistCm || !weightKg || profile.age < 18) return null;
  const k = sex === "male" ? 64 : 76;
  const pct = Math.max(3, k - 20 * (h / waistCm));
  const [, low, high] = RANGES[sex].find(([max]) => profile.age <= max)!;
  const targetPct = high - 1;
  const lean = weightKg * (1 - pct / 100);
  const targetWeightKg = lean / (1 - targetPct / 100);
  const toLoseKg = Math.max(0, weightKg - targetWeightKg);
  return {
    pct: Math.round(pct),
    fatKg: Math.round((weightKg * pct) / 100),
    range: [low, high],
    targetPct,
    toLoseKg: Math.round(toLoseKg * 2) / 2,
    targetWeightKg: Math.round(targetWeightKg),
    targetWaistCm: Math.round((20 * h) / (k - targetPct)),
    weeks: Math.round(toLoseKg / WEEKLY_KG),
  };
}
