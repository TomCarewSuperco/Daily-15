import { usePremium } from "../premium/PremiumProvider";
import { fmtClock } from "./RoutinePlayer";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayKey, uid } from "../calc";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import { findExercise } from "../exercises";
import { describeLast, lastTimeFor, planSession, suggestNext } from "../gym";
import { toast } from "../notify";
import { useDaily15 } from "../store";
import type { ExerciseEntry, Intensity, Workout } from "../types";

export interface GymSession {
  name: string;
  category: string;
  intensity: Intensity;
  exercises: ExerciseEntry[];
  /** Offer to save to My workouts at the end (ready-made sessions). */
  offerSave?: boolean;
  /** Picking up a session that was interrupted. */
  resume?: InProgress;
}

const DEFAULT_REST = 90;

/*
 * The session in progress is kept on the device after every change, so a phone
 * that locks between sets, or iOS closing the app, doesn't lose it. Cleared on
 * save or discard; offered for 12 hours.
 */
const IN_PROGRESS_KEY = "daily15:gym-in-progress";
const RESUME_HOURS = 12;

export interface InProgress {
  session: Omit<GymSession, "resume">;
  plan: ExerciseEntry[];
  done: boolean[][];
  ex: number;
  set: number;
  started: number;
  savedAt: number;
}

export function loadInProgress(): InProgress | null {
  try {
    const raw = localStorage.getItem(IN_PROGRESS_KEY);
    const v = raw ? (JSON.parse(raw) as InProgress) : null;
    return v && Date.now() - v.savedAt < RESUME_HOURS * 3600000 && v.done.flat().some(Boolean) ? v : null;
  } catch {
    return null;
  }
}

export function clearInProgress(): void {
  try {
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Guided gym session: one set at a time, weight and reps to confirm, rest timer between sets. */
/** '3 sets: 5 × 60 kg' style summary of the sets done: '5 reps, 5 reps' or '30 sec' or '5 × 60 kg'. */
function setSummary(name: string, sets: { reps: number; weightKg: number }[]): string {
  const timed = findExercise(name)?.timed;
  return sets.map((x) => (timed ? `${x.reps} sec` : x.weightKg ? `${x.reps} × ${x.weightKg} kg` : `${x.reps} reps`)).join(", ");
}

export function GymPlayer({ session, onClose }: { session: GymSession; onClose: () => void }) {
  const { state, update } = useDaily15();
  // Without the progression feature, start from last time's weight rather than silently adding to it.
  const { premium } = usePremium();
  const r = session.resume;
  const [plan, setPlan] = useState<ExerciseEntry[]>(() => r?.plan ?? planSession(session.exercises, state.workouts, premium));
  const [done, setDone] = useState<boolean[][]>(() => r?.done ?? session.exercises.map((e) => e.sets.map(() => false)));
  const [ex, setEx] = useState(r?.ex ?? 0);
  const [set, setSet] = useState(r?.set ?? 0);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restLength, setRestLength] = useState(DEFAULT_REST);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const started = useRef(r?.started ?? Date.now());
  useEffect(() => {
    try {
      const { resume: _r, ...plain } = session;
      const v: InProgress = { session: plain, plan, done, ex, set, started: started.current, savedAt: Date.now() };
      localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(v));
    } catch {
      /* storage unavailable: the session still works, it just can't be resumed */
    }
  }, [session, plan, done, ex, set]);
  const close = () => {
    clearInProgress();
    onClose();
  };
  const targets = useMemo(() => session.exercises.map((e) => e.sets.map((s) => s.reps)), [session]);

  // Drop focus from any text box so iOS has less to offer to 'undo' when the phone moves.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Wall-clock timer so it keeps time if the phone locks or the app goes to the background.
  useEffect(() => {
    if (!restUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [restUntil]);
  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;
  useEffect(() => {
    if (restUntil && restLeft === 0) {
      setRestUntil(null);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* unsupported */
      }
    }
  }, [restLeft, restUntil]);

  const current = plan[ex];
  const lib = findExercise(current.name);
  const last = lastTimeFor(state.workouts, current.name);
  const suggestion = suggestNext(current.name, targets[ex][set] ?? 0, last);
  const unit = lib?.timed ? "sec" : "reps";
  const setVal = (key: "reps" | "weightKg", v: number) =>
    setPlan((p) => p.map((e, i) => (i !== ex ? e : { ...e, sets: e.sets.map((s, j) => (j === set ? { ...s, [key]: Math.max(0, v) } : key === "weightKg" && j > set && !done[i][j] ? { ...s, weightKg: Math.max(0, v) } : s)) })));

  const next = () => {
    const d = done.map((r) => [...r]);
    d[ex][set] = true;
    setDone(d);
    // Next unfinished set, moving through exercises in order.
    for (let i = ex; i < plan.length; i++) {
      for (let j = i === ex ? set + 1 : 0; j < plan[i].sets.length; j++) {
        if (!d[i][j]) {
          setEx(i);
          setSet(j);
          setRestUntil(Date.now() + restLength * 1000);
          setNow(Date.now());
          return;
        }
      }
    }
    setFinished(true);
  };

  const save = (asTemplate: boolean) => {
    const exercises = plan
      .map((e, i) => ({ name: e.name, sets: e.sets.filter((_, j) => done[i][j]) }))
      .filter((e) => e.sets.length);
    if (!exercises.length) {
      close();
      return;
    }
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    const workout: Workout = { id: uid(), date: todayKey(), category: session.category, name: session.name, durationMin: minutes, intensity: session.intensity, restSec: restLength, exercises };
    update((s) => ({
      ...s,
      workouts: [...s.workouts, workout],
      templates: asTemplate && !s.templates.some((t) => t.name.toLowerCase() === session.name.toLowerCase()) ? [...s.templates, { id: uid(), name: session.name, category: session.category, intensity: session.intensity, exercises: session.exercises }] : s.templates,
    }));
    toast.success(`${session.name} logged: ${minutes} min`);
    close();
  };

  const totalSets = done.flat().length;
  const doneSets = done.flat().filter(Boolean).length;

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 mx-auto flex h-[100dvh] max-w-md flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold uppercase tracking-widest text-copper">Done</p>
        <h2 className="mt-2 text-4xl leading-tight">{session.name}</h2>
        <p className="mt-2 text-muted-foreground">{doneSets} {doneSets === 1 ? "set" : "sets"} in {Math.max(1, Math.round((Date.now() - started.current) / 60000))} minutes.</p>
        <ul className="mt-6 space-y-1 text-sm">
          {plan.map((e, i) => (
            <li key={e.name + i} className="flex justify-between">
              <span>{e.name}</span>
              <span className="tabular-nums text-muted-foreground">{setSummary(e.name, e.sets.filter((_, j) => done[i][j])) || "skipped"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-2 pt-6">
          {session.offerSave && <Button size="lg" variant="outline" onClick={() => save(true)}>Save and add to My workouts</Button>}
          <Button size="lg" onClick={() => save(false)}>Save workout</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { setConfirmDiscard(false); setFinished(false); }}>Back to workout</Button>
            {/* Two taps, so a stray tap doesn't lose the session. */}
            <Button variant="ghost" className={confirmDiscard ? "text-destructive" : ""} onClick={() => (confirmDiscard ? close() : setConfirmDiscard(true))}>
              {confirmDiscard ? "Tap again to discard" : "Discard"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const s = current.sets[set];
  const mm = Math.floor(restLeft / 60);
  const ss = String(restLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 mx-auto flex h-[100dvh] max-w-md flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => (doneSets ? setFinished(true) : close())} aria-label={doneSets ? "Finish early" : "Close"}>
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {session.name} · set {doneSets + 1} of {totalSets} · <span className="tabular-nums" aria-label="Time so far">{fmtClock(Math.floor((now - started.current) / 1000))}</span>
        </span>
        <span className="w-10" />
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-foreground transition-all" style={{ width: `${(doneSets / totalSets) * 100}%` }} />
      </div>

      {restUntil ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rest</p>
          <div className="mt-2 text-7xl font-semibold tabular-nums" aria-live="polite">{mm}:{ss}</div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setRestUntil((u) => (u ? Math.max(Date.now(), u - 15000) : u))}>−15 s</Button>
            <Button variant="outline" onClick={() => setRestUntil((u) => (u ? u + 15000 : u))}>+15 s</Button>
            <Button onClick={() => setRestUntil(null)}>
              <SkipForward className="mr-1.5 h-4 w-4" />Skip
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">Next: {current.name}, set {set + 1} of {current.sets.length}</p>
          <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            Rest between sets
            <select className="rounded-md border bg-card px-2 py-1" value={restLength} onChange={(e) => setRestLength(Number(e.target.value))}>
              {[45, 60, 90, 120, 180].map((r) => <option key={r} value={r}>{r < 60 ? `${r} s` : `${r / 60} min`}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          {lib && <ExerciseDemo key={current.name} name={current.name} className="mx-auto h-32 w-auto max-w-full" />}
          <p className="text-sm text-muted-foreground">Set {set + 1} of {current.sets.length} · target {targets[ex][set]} {unit}</p>
          <h2 className="mt-1 text-4xl leading-tight">{current.name}</h2>
          {lib && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lib.instructions}</p>}
          {last && (
            <p className="mt-3 rounded-lg bg-muted p-2.5 text-sm">
              Last time: {describeLast(last)}
              {suggestion && premium && <span className="block text-muted-foreground">{suggestion.note}</span>}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stepper label={unit === "sec" ? "Seconds" : "Reps"} value={s.reps} step={1} onChange={(v) => setVal("reps", v)} />
            {lib?.equipment !== "none" && <Stepper label="Weight (kg)" value={s.weightKg} step={lib?.equipment === "barbell" ? 2.5 : lib?.equipment === "machine" ? 5 : 1} onChange={(v) => setVal("weightKg", v)} />}
          </div>
        </div>
      )}

      {!restUntil && (
        <div className="grid gap-2">
          <Button size="lg" onClick={next}>
            <Check className="mr-1.5 h-4 w-4" />Done set
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = done.map((r) => [...r]); d[ex] = d[ex].map(() => false); setDone(d); const nextEx = ex + 1 < plan.length ? ex + 1 : ex; if (nextEx === ex) setFinished(true); else { setEx(nextEx); setSet(0); } }}>
            Skip this exercise
          </Button>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-1">
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={() => onChange(Math.round((value - step) * 10) / 10)} aria-label={`Less ${label}`}>
          <Minus className="h-4 w-4" />
        </Button>
        <Input type="number" inputMode="decimal" value={value || ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-11 border-0 bg-transparent px-0 text-center text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0" aria-label={label} />
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={() => onChange(Math.round((value + step) * 10) / 10)} aria-label={`More ${label}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
