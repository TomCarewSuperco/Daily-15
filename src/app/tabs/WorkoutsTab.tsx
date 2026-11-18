import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ChevronDown, Pencil, Play, Plus, Star, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cardioBests, formatDay, formatPace, personalBests, restAdvice, todayKey } from "../calc";
import { DEFAULT_ROUTINE, MODE_INFO, SUBSTITUTES } from "../data";
import { NumField } from "../components/Field";
import { RoutinePlayer, fmtAmount, routineFor } from "../components/RoutinePlayer";
import { Card, CardHeading, Empty } from "../components/Section";
import { WorkoutForm, type WorkoutSeed } from "../components/WorkoutForm";
import type { Intent } from "../nav";
import { useDaily15 } from "../store";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import type { RoutineExercise, RoutineMode } from "../types";

const INTENSITY_STYLE = {
  light: "bg-muted text-muted-foreground",
  moderate: "bg-copper/15 text-copper",
  intense: "bg-foreground text-background",
} as const;

export function WorkoutsTab({ intent, clearIntent }: { intent: Intent; clearIntent: () => void }) {
  const { state, update } = useDaily15();
  const today = todayKey();
  const log = state.routineLogs[today];
  const [mode, setMode] = useState<RoutineMode>(log?.mode ?? "standard");
  const [playing, setPlaying] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [seed, setSeed] = useState<WorkoutSeed | undefined>();
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  const [swapping, setSwapping] = useState<RoutineExercise | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(10);

  useEffect(() => {
    if (intent === "start-routine") setPlaying(true);
    if (intent === "log-workout") {
      setSeed(undefined);
      setFormOpen(true);
    }
    if (intent) clearIntent();
  }, [intent, clearIntent]);

  const list = routineFor(state.routine, mode);
  const done = new Set(log?.mode === mode ? log.completedIds : []);
  const advice = restAdvice(state);
  const pbs = useMemo(() => personalBests(state.workouts), [state.workouts]);
  const cardio = useMemo(() => cardioBests(state.workouts), [state.workouts]);
  const history = useMemo(() => [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)), [state.workouts]);
  const routineHistory = useMemo(
    () => Object.values(state.routineLogs).filter((l) => l.finished).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [state.routineLogs],
  );
  const customised = JSON.stringify(state.routine) !== JSON.stringify(DEFAULT_ROUTINE);

  const toggle = (id: string) => {
    const ids = new Set(done);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    const finished = list.every((e) => ids.has(e.id));
    update((s) => ({
      ...s,
      routineLogs: { ...s.routineLogs, [today]: { date: today, mode, completedIds: [...ids], finished: finished || (!!s.routineLogs[today]?.finished && s.routineLogs[today].mode !== mode) } },
    }));
  };

  const saveRoutine = (r: RoutineExercise[]) => update((s) => ({ ...s, routine: r }));

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-4xl">Workouts</h1>
      </header>

      <Card>
        <CardHeading
          action={
            log?.finished ? <span className="text-xs font-medium text-[hsl(var(--d15-done))]">Done today</span> : <span className="text-xs text-muted-foreground">{done.size} of {list.length}</span>
          }
        >
          Daily 15
        </CardHeading>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-sm">
          {(Object.keys(MODE_INFO) as RoutineMode[]).map((m) => (
            <button key={m} className={`rounded-lg py-1.5 ${mode === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode(m)}>
              {MODE_INFO[m].label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{MODE_INFO[mode].note}</p>
        {advice && mode === "standard" && <p className="mb-3 rounded-lg bg-muted p-2 text-xs">{advice}</p>}

        <ul className="divide-y">
          {list.map((e) => (
            <li key={e.id} className="py-2">
              <div className="flex items-center gap-3">
                <Checkbox checked={done.has(e.id)} onCheckedChange={() => toggle(e.id)} aria-label={`Mark ${e.name} done`} className="h-5 w-5" />
                <button className="flex flex-1 items-center justify-between text-left" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <span className={done.has(e.id) ? "text-muted-foreground line-through" : ""}>{e.name}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    {fmtAmount(e)}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded === e.id ? "rotate-180" : ""}`} />
                  </span>
                </button>
              </div>
              {expanded === e.id && (
                <div className="ml-8 mt-2 space-y-2">
                  <ExerciseDemo name={e.name} className="h-24 w-auto rounded-lg bg-muted/50" />
                  <p className="text-sm text-muted-foreground">{e.instructions}</p>
                  {mode !== "recovery" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(state.routine.find((r) => r.id === e.id) ?? null)}>
                        <Pencil className="mr-1 h-3 w-3" />Adjust
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSwapping(state.routine.find((r) => r.id === e.id) ?? null)}>
                        <ArrowLeftRight className="mr-1 h-3 w-3" />Substitute
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button className="mt-3 w-full" size="lg" onClick={() => setPlaying(true)}>
          <Play className="mr-1.5 h-4 w-4" />
          {log?.finished && log.mode === mode ? "Go again" : done.size > 0 ? "Continue guided workout" : "Start guided workout"}
        </Button>
        {customised && (
          <Button variant="link" size="sm" className="mt-1 w-full text-xs text-muted-foreground" onClick={() => saveRoutine(DEFAULT_ROUTINE)}>
            Reset to the default routine
          </Button>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto flex-col gap-1 rounded-2xl py-4" onClick={() => { setSeed(undefined); setFormOpen(true); }}>
          <Plus className="h-5 w-5" />
          Log workout
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 rounded-2xl py-4" onClick={() => setMode("recovery")}>
          <span className="text-lg leading-5">~</span>
          Mobility routine
        </Button>
      </div>

      {state.templates.length > 0 && (
        <Card>
          <CardHeading>Favourites</CardHeading>
          <ul className="divide-y">
            {state.templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <button className="flex-1 text-left" onClick={() => { setSeed({ template: t }); setFormOpen(true); }}>
                  <div className="flex items-center gap-1.5 font-medium"><Star className="h-3.5 w-3.5 fill-copper text-copper" />{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {t.exercises.length} exercises</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => update((s) => ({ ...s, templates: s.templates.filter((x) => x.id !== t.id) }))} aria-label={`Remove ${t.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeading>Personal bests</CardHeading>
        {pbs.length === 0 && cardio.length === 0 ? (
          <Empty>Log sets with weights, or runs with distance, to start tracking personal bests.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {pbs.map((pb) => (
              <li key={pb.exercise} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-copper" />{pb.exercise}</span>
                <span className="tabular-nums text-muted-foreground">{pb.weightKg > 0 ? `${pb.weightKg} kg × ${pb.reps}` : `${pb.reps} reps`}</span>
              </li>
            ))}
            {cardio.map((c) => (
              <li key={c.category} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-copper" />{c.category}</span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {c.longestKm.toFixed(1)} km longest{c.fastestPace ? ` · ${formatPace(c.fastestPace)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeading>History</CardHeading>
        {history.length === 0 && routineHistory.length === 0 ? (
          <Empty>Completed workouts appear here automatically.</Empty>
        ) : (
          <ul className="divide-y">
            {routineHistory.slice(0, 3).map((r) => (
              <li key={r.date} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">DAILY 15 · {MODE_INFO[r.mode].label}</div>
                  <div className="text-xs text-muted-foreground">{formatDay(r.date)}</div>
                </div>
                <span className="text-xs text-[hsl(var(--d15-done))]">Complete</span>
              </li>
            ))}
            {history.slice(0, historyCount).map((w) => (
              <li key={w.id} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <button className="flex-1 text-left" onClick={() => { setSeed({ workout: w }); setFormOpen(true); }}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {w.name}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${INTENSITY_STYLE[w.intensity]}`}>{w.intensity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDay(w.date)} · {w.category} · {w.durationMin} min
                      {w.distanceKm ? ` · ${w.distanceKm} km` : ""}
                      {w.exercises.length ? ` · ${w.exercises.reduce((s, e) => s + e.sets.length, 0)} sets` : ""}
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== w.id) }))} aria-label="Delete workout">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {history.length > historyCount && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setHistoryCount((n) => n + 20)}>Show more</Button>
        )}
      </Card>

      {playing && <RoutinePlayer mode={mode} onClose={() => setPlaying(false)} />}
      <WorkoutForm open={formOpen} onOpenChange={setFormOpen} seed={seed} />
      <AdjustDialog exercise={editing} onClose={() => setEditing(null)} onSave={(e) => saveRoutine(state.routine.map((r) => (r.id === e.id ? e : r)))} />
      <SwapDialog
        exercise={swapping}
        onClose={() => setSwapping(null)}
        onPick={(sub) => swapping && saveRoutine(state.routine.map((r) => (r.id === swapping.id ? { ...sub, id: swapping.id } : r)))}
      />
    </div>
  );
}

function AdjustDialog({ exercise, onClose, onSave }: { exercise: RoutineExercise | null; onClose: () => void; onSave: (e: RoutineExercise) => void }) {
  const [amount, setAmount] = useState<number | "">("");
  useEffect(() => {
    setAmount(exercise?.amount ?? "");
  }, [exercise]);
  if (!exercise) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust {exercise.name.toLowerCase()}</DialogTitle>
          <DialogDescription>Change it to suit you. Progress gradually: add a few reps or seconds a week.</DialogDescription>
        </DialogHeader>
        <NumField label={exercise.kind === "reps" ? "Reps" : "Duration"} value={amount} onChange={setAmount} suffix={exercise.kind === "reps" ? "reps" : "sec"} min={1} />
        <Button
          disabled={typeof amount !== "number" || amount < 1}
          onClick={() => {
            onSave({ ...exercise, amount: amount as number });
            onClose();
          }}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SwapDialog({ exercise, onClose, onPick }: { exercise: RoutineExercise | null; onClose: () => void; onPick: (e: Omit<RoutineExercise, "id">) => void }) {
  if (!exercise) return null;
  const original = DEFAULT_ROUTINE.find((d) => d.id === exercise.id);
  const options = [...(original && original.name !== exercise.name ? [original] : []), ...SUBSTITUTES.filter((s) => s.name !== exercise.name)];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Substitute {exercise.name.toLowerCase()}</DialogTitle>
          <DialogDescription>Pick an alternative that suits your space, joints or ability.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {options.map((o) => (
            <li key={o.name}>
              <button
                className="w-full py-2.5 text-left"
                onClick={() => {
                  onPick(o);
                  onClose();
                }}
              >
                <ExerciseDemo name={o.name} animate={false} className="float-right ml-3 h-14 w-auto" />
                <div className="flex justify-between text-sm font-medium">
                  {o.name}
                  <span className="font-normal text-muted-foreground">{fmtAmount(o)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{o.instructions}</div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
