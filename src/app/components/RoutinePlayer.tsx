import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { MODE_INFO, MOBILITY_ROUTINE } from "../data";
import { todayKey } from "../calc";
import { useDaily15 } from "../store";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import { exerciseWarning, lifeStageOf } from "../pregnancy";
import type { RoutineExercise, RoutineMode } from "../types";

export function routineFor(base: RoutineExercise[], mode: RoutineMode): RoutineExercise[] {
  if (mode === "recovery") return MOBILITY_ROUTINE.map((e, i) => ({ ...e, id: `mob-${i}` }));
  if (mode === "light") return base.map((e) => ({ ...e, amount: Math.max(e.kind === "time" ? 10 : 3, Math.round(e.amount / 2)) }));
  return base;
}

export function fmtAmount(e: Pick<RoutineExercise, "kind" | "amount">): string {
  if (e.kind === "reps") return `${e.amount} reps`;
  if (e.amount >= 60) {
    const m = Math.floor(e.amount / 60);
    const s = e.amount % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  return `${e.amount} s`;
}

/** Full-screen guided routine: one exercise at a time with a timer or rep counter. */
export function RoutinePlayer({ mode, onClose }: { mode: RoutineMode; onClose: () => void }) {
  const { state, update } = useDaily15();
  const today = todayKey();
  const list = useMemo(() => routineFor(state.routine, mode), [state.routine, mode]);
  const log = state.routineLogs[today];
  const done = new Set(log?.mode === mode ? log.completedIds : []);
  const firstOpen = list.findIndex((e) => !done.has(e.id));
  const [idx, setIdx] = useState(firstOpen < 0 ? 0 : firstOpen);
  const ex = list[idx];

  const [left, setLeft] = useState(ex.kind === "time" ? ex.amount : 0);
  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const tick = useRef<number>();

  useEffect(() => {
    setLeft(ex.kind === "time" ? ex.amount : 0);
    setRunning(false);
    setReps(0);
  }, [idx, ex.kind, ex.amount]);

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(tick.current);
  }, [running]);

  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      try {
        navigator.vibrate?.(200);
      } catch {
        /* unsupported */
      }
      markDone();
    }
  }, [left, running]); // eslint-disable-line react-hooks/exhaustive-deps

  function markDone() {
    const prev = state.routineLogs[today];
    const ids = new Set(prev && prev.mode === mode ? prev.completedIds : []);
    ids.add(ex.id);
    const finished = list.every((e) => ids.has(e.id));
    const finishedNow = finished && !prev?.finished;
    const entry = { date: today, mode, completedIds: [...ids], finished: finished || !!prev?.finished };
    update((s) => ({ ...s, routineLogs: { ...s.routineLogs, [today]: entry } }));
    if (finishedNow) {
      toast.success("DAILY 15 complete. That's another day banked.");
      onClose();
      return;
    }
    const next = list.findIndex((e, i) => i > idx && !ids.has(e.id));
    if (next >= 0) setIdx(next);
    else if (idx < list.length - 1) setIdx(idx + 1);
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {MODE_INFO[mode].label} · {idx + 1} of {list.length}
        </span>
        <span className="w-10" />
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {list.map((e, i) => (
          <div key={e.id} className={`h-1 flex-1 rounded-full ${done.has(e.id) ? "bg-[hsl(var(--d15-done))]" : i === idx ? "bg-foreground" : "bg-muted"}`} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto py-4">
        <ExerciseDemo key={ex.id} name={ex.name} className="mx-auto mb-2 h-36 w-auto max-w-full" />
        <p className="text-sm text-muted-foreground">{fmtAmount(ex)}</p>
        <h2 className="mt-1 text-4xl leading-tight">{ex.name}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{ex.instructions}</p>
        {exerciseWarning(lifeStageOf(state.profile), ex.name) && <p className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{exerciseWarning(lifeStageOf(state.profile), ex.name)}</p>}

        <div className="mt-6 flex flex-col items-center">
          {ex.kind === "time" ? (
            <>
              <div className="text-7xl font-semibold tabular-nums" aria-live="polite">{mm}:{ss}</div>
              <div className="mt-6 flex gap-3">
                <Button size="lg" onClick={() => setRunning((r) => !r)} disabled={left === 0}>
                  {running ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
                  {running ? "Pause" : left < ex.amount ? "Resume" : "Start timer"}
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setRunning(false); setLeft(ex.amount); }} aria-label="Reset timer">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <button
                className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-foreground text-6xl font-semibold tabular-nums active:scale-95"
                onClick={() => setReps((r) => Math.min(ex.amount, r + 1))}
                aria-label="Count a rep"
              >
                {reps}
                <span className="text-xs font-normal text-muted-foreground">of {ex.amount}</span>
              </button>
              <p className="mt-3 text-xs text-muted-foreground">Tap to count each rep, or mark done when finished.</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Previous exercise">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button className="flex-1" size="lg" onClick={markDone}>
          <Check className="mr-1.5 h-4 w-4" />
          {done.has(ex.id) ? "Done" : "Mark done"}
        </Button>
        <Button variant="outline" size="icon" disabled={idx === list.length - 1} onClick={() => setIdx(idx + 1)} aria-label="Next exercise">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Stop if you feel sharp pain, dizziness or chest discomfort.</p>
    </div>
  );
}
