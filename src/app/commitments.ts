import { addDays, todayKey, uid } from "./calc";
import type { AppState, Commitment } from "./types";

/*
 * Weekly commitments: one or two points from the weekly review, ticked each
 * day for the next seven days. Turns advice into a daily habit.
 */
export const MAX_COMMITMENTS = 2;
export const COMMITMENT_DAYS = 7;

export function activeCommitments(state: AppState, today = todayKey()): Commitment[] {
  return (state.commitments ?? []).filter((c) => c.start <= today && today <= addDays(c.start, COMMITMENT_DAYS - 1));
}

/** Commitments whose week has finished, most recent first. */
export function finishedCommitments(state: AppState, today = todayKey()): Commitment[] {
  return (state.commitments ?? []).filter((c) => addDays(c.start, COMMITMENT_DAYS - 1) < today).sort((a, b) => b.start.localeCompare(a.start));
}

export function addCommitment(state: AppState, text: string, sourceId?: string, today = todayKey()): AppState {
  const active = activeCommitments(state, today);
  if (active.length >= MAX_COMMITMENTS || active.some((c) => c.text === text)) return state;
  return { ...state, commitments: [...(state.commitments ?? []), { id: uid(), text, sourceId, start: today, ticks: [] }] };
}

export function removeCommitment(state: AppState, id: string): AppState {
  return { ...state, commitments: (state.commitments ?? []).filter((c) => c.id !== id) };
}

export function toggleTick(state: AppState, id: string, date = todayKey()): AppState {
  return {
    ...state,
    commitments: (state.commitments ?? []).map((c) =>
      c.id !== id ? c : { ...c, ticks: c.ticks.includes(date) ? c.ticks.filter((d) => d !== date) : [...c.ticks, date].sort() },
    ),
  };
}
