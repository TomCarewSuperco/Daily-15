import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { MODE_INFO, stepsFor } from "../data";
import { buildRoutine, mainOnce, proposeAfter, settingsOf, type Proposal } from "../routine";
import type { Feeling, RoutineSettings } from "../types";
import { addDays, todayKey } from "../calc";
import { useDaily15 } from "../store";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import { exerciseWarning, lifeStageOf } from "../pregnancy";
import type { RoutineExercise, RoutineMode } from "../types";

export function routineFor(base: RoutineExercise[], mode: RoutineMode, settings: RoutineSettings, date?: string): RoutineExercise[] {
  return buildRoutine(base, mode, settings, date);
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
  const settings = settingsOf(state);
  const list = useMemo(() => routineFor(state.routine, mode, settings, today), [state.routine, mode, settings.level, settings.rounds, settings.variety, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const [finishedScreen, setFinishedScreen] = useState(false);
  const log = state.routineLogs[today];
  const done = new Set(log?.mode === mode ? log.completedIds : []);
  const firstOpen = list.findIndex((e) => !done.has(e.id));
  const [idx, setIdx] = useState(firstOpen < 0 ? 0 : firstOpen);
  const ex = list[idx];

  const [left, setLeft] = useState(ex.kind === "time" ? ex.amount : 0);
  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const tick = useRef<number>();
  const lastStep = useRef(0);
  // Time spent in this session, shown at the top and saved on the day's log.
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const priorSeconds = useRef(log?.mode === mode ? log.seconds ?? 0 : 0);

  // Stop the page behind from scrolling while the workout is open, so it can't show through on iPhone.
  // Drop focus from any text box so iOS has less to offer to 'undo' when the phone moves.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    const seconds = priorSeconds.current + Math.floor((Date.now() - started.current) / 1000);
    const entry = { ...(prev?.mode === mode ? prev : {}), date: today, mode, completedIds: [...ids], finished: finished || !!prev?.finished, seconds };
    update((s) => ({ ...s, routineLogs: { ...s.routineLogs, [today]: entry } }));
    if (finishedNow) {
      setFinishedScreen(true);
      return;
    }
    const next = list.findIndex((e, i) => i > idx && !ids.has(e.id));
    if (next >= 0) setIdx(next);
    else if (idx < list.length - 1) setIdx(idx + 1);
  }

  if (finishedScreen) return <FinishScreen mode={mode} onClose={onClose} />;
  const total = priorSeconds.current + elapsed;

  // Multi-move exercises (the stretches): split the time equally and show the current move.
  const steps = stepsFor(ex.name);
  const stepIdx = steps && ex.kind === "time" ? Math.min(steps.length - 1, Math.floor(((ex.amount - left) / ex.amount) * steps.length)) : 0;
  const step = steps ? steps[stepIdx] : null;
  const stepSeconds = steps ? Math.round(ex.amount / steps.length) : 0;
  if (steps && running && stepIdx !== lastStep.current) {
    lastStep.current = stepIdx;
    if (stepIdx > 0) {
      try {
        navigator.vibrate?.(150);
      } catch {
        /* unsupported */
      }
    }
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex h-[100dvh] max-w-md flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {MODE_INFO[mode].label} · {idx + 1} of {list.length}
          {ex.round ? ` · round ${ex.round}` : ""}
          {" · "}
          <span className="tabular-nums" aria-label="Time so far">{fmtClock(total)}</span>
        </span>
        <span className="w-10" />
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {list.map((e, i) => (
          <div key={e.id} className={`h-1 flex-1 rounded-full ${done.has(e.id) ? "bg-[hsl(var(--d15-done))]" : i === idx ? "bg-foreground" : "bg-muted"}`} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto py-4">
        <ExerciseDemo key={step ? step.name : ex.id} name={step ? step.name : ex.name} className="mx-auto mb-2 h-36 w-auto max-w-full" />
        <p className="text-sm text-muted-foreground">{step ? `${ex.name} · ${stepIdx + 1} of ${steps!.length} · ${stepSeconds} s each` : fmtAmount(ex)}</p>
        <h2 className="mt-1 text-4xl leading-tight">{step ? step.name : ex.name}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step ? step.instructions : ex.instructions}</p>
        {steps && (
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {steps.map((st, i) => (
              <span key={st.name} className={`rounded-full px-2 py-0.5 text-[11px] ${i === stepIdx ? "bg-foreground text-background" : i < stepIdx ? "bg-muted text-muted-foreground line-through" : "bg-muted text-muted-foreground"}`}>{st.name}</span>
            ))}
          </div>
        )}
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

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

/** Shown when the routine is finished: how did it feel, and what to change next time. */
function FinishScreen({ mode, onClose }: { mode: RoutineMode; onClose: () => void }) {
  const { state, update } = useDaily15();
  const today = todayKey();
  const settings = settingsOf(state);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const rate = (f: Feeling) => {
    setFeeling(f);
    const logs = Object.values({ ...state.routineLogs, [today]: { ...state.routineLogs[today], feeling: f } }).sort((a, b) => a.date.localeCompare(b.date));
    update((s) => ({ ...s, routineLogs: { ...s.routineLogs, [today]: { ...s.routineLogs[today], feeling: f } } }));
    setProposal(mode === "standard" ? proposeAfter(f, settings, logs) : null);
  };

  const apply = (next: RoutineSettings, message: string) => {
    update((s) => ({ ...s, routineSettings: next }));
    toast.success(message);
    onClose();
  };

  // Preview tomorrow's actual exercises, since variety may rotate them.
  const tomorrow = addDays(today, 1);
  const preview = proposal ? mainOnce(buildRoutine(state.routine, "standard", proposal.settings, tomorrow)) : [];
  const current = mainOnce(buildRoutine(state.routine, "standard", settings, tomorrow));

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <p className="text-sm font-semibold uppercase tracking-widest text-copper">Done</p>
      <h2 className="mt-2 text-4xl leading-tight">That's another day banked.</h2>
      {state.routineLogs[today]?.seconds != null ? (
        <p className="mt-2 text-muted-foreground">Time: <span className="tabular-nums text-foreground">{fmtDuration(state.routineLogs[today].seconds!)}</span></p>
      ) : null}

      {!feeling ? (
        <>
          <p className="mt-6 text-lg">How did that feel?</p>
          <div className="mt-3 grid gap-2">
            {([
              ["easy", "Too easy", "I could have done a lot more"],
              ["right", "About right", "Hard work, but manageable"],
              ["hard", "Too hard", "I struggled to finish"],
            ] as const).map(([f, label, sub]) => (
              <button key={f} onClick={() => rate(f)} className="rounded-2xl border bg-card p-4 text-left">
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{sub}</div>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4" onClick={onClose}>Skip</Button>
        </>
      ) : proposal ? (
        <div className="mt-6 flex flex-1 flex-col">
          <p className="text-lg font-medium">{proposal.headline}</p>
          <p className="mt-1 text-muted-foreground">{proposal.detail}</p>
          <div className="mt-4 rounded-2xl border bg-card p-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tomorrow</p>
            {proposal.settings.rounds !== settings.rounds && <p className="mb-2">{proposal.settings.rounds} rounds instead of {settings.rounds}</p>}
            <ul className="space-y-1">
              {preview.map((e, i) => (
                <li key={e.id} className="flex justify-between">
                  <span>{e.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {current[i] && current[i].amount !== e.amount && <span className="mr-1 line-through opacity-60">{fmtAmount(current[i])}</span>}
                    {fmtAmount(e)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto grid gap-2 pt-6">
            <Button size="lg" onClick={() => apply(proposal.settings, "Next session updated")}>Sounds good</Button>
            <Button size="lg" variant="outline" onClick={onClose}>Keep it the same</Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col">
          <p className="text-lg">{feeling === "right" ? "Good. Keep it as it is for now." : feeling === "easy" ? "You're at the top level. Try adding a round in Workouts." : "You're at the easiest setting. Try light mode on tougher days."}</p>
          <div className="mt-auto grid gap-2 pt-6">
            {settings.rounds < 3 && mode === "standard" && (
              <Button size="lg" variant="outline" onClick={() => apply({ ...settings, rounds: settings.rounds + 1 }, `${settings.rounds + 1} rounds from next time`)}>Felt short? Add a round</Button>
            )}
            <Button size="lg" onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
