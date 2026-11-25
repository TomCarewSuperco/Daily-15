import { addDays } from "./calc";
import type { AppState } from "./types";

/*
 * 'Not today'. Rest is part of training, so a rest day pauses the streak rather
 * than breaking it. Two a week keeps that fair; days off ill don't count towards
 * the two, because being ill isn't a choice. The reason someone gives is used
 * only to choose a kind word and is never saved, except that a day off ill is
 * recorded as such so it doesn't use up the allowance.
 */
export const REST_PER_WEEK = 2;

export type RestReason = "unwell" | "period" | "tired" | "sore" | "busy";

export const REST_REASONS: { id: RestReason; label: string; note: string }[] = [
  { id: "unwell", label: "Feeling unwell", note: "Rest properly. Your streak waits, and days off ill don't count towards your rest days." },
  { id: "period", label: "On my period", note: "Gentle movement eases cramps for some people, but rest is just as valid. Your call." },
  { id: "tired", label: "Low on energy", note: "Five minutes of Recovery often lifts it. If not, rest and go again tomorrow." },
  { id: "sore", label: "Sore or injured", note: "Rest the sore part. Recovery mobility or a walk can help if it feels right." },
  { id: "busy", label: "Something came up", note: "It happens. Tomorrow is a fresh start." },
];

/** Rest days (not counting days off ill) in the seven days up to and including `date`. */
export function restDaysThisWeek(state: Pick<AppState, "restDays" | "sickDays">, date: string): number {
  const from = addDays(date, -6);
  const sick = new Set(state.sickDays ?? []);
  return state.restDays.filter((d) => d >= from && d <= date && !sick.has(d)).length;
}

/** Whether taking `date` off will pause the streak: always when ill, otherwise up to two a week. */
export function restAllowed(state: Pick<AppState, "restDays" | "sickDays">, date: string, reason: RestReason | null): boolean {
  return reason === "unwell" || restDaysThisWeek(state, date) < REST_PER_WEEK;
}
