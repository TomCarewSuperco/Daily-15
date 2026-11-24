import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ChevronDown, Pencil, Play, Plus, Star, Trash2, Trophy, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cardioBests, formatDay, formatPace, personalBests, restAdvice, todayKey } from "../calc";
import { DEFAULT_ROUTINE, MODE_INFO, stepsFor, SUBSTITUTES } from "../data";
import { NumField } from "../components/Field";
import { RoutinePlayer, fmtAmount, routineFor } from "../components/RoutinePlayer";
import { Card, CardHeading, Empty } from "../components/Section";
import { WorkoutForm, type WorkoutSeed } from "../components/WorkoutForm";
import { clearInProgress, GymPlayer, loadInProgress, type GymSession } from "../components/GymPlayer";
import { EQUIPMENT_LABELS, findExercise, PREBUILT, type Equipment } from "../exercises";
import type { Intent } from "../nav";
import { useDaily15 } from "../store";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import { exerciseWarning, lifeStageOf } from "../pregnancy";
import { baseForShown, estimateMinutes, MAX_LEVEL, MAX_ROUNDS, MIN_LEVEL, settingsOf, shownAmount } from "../routine";
import { Switch } from "@/components/ui/switch";
import type { RoutineExercise, RoutineMode, RoutineSettings } from "../types";

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
  const [gym, setGym] = useState<GymSession | null>(null);
  const [library, setLibrary] = useState<"mine" | "ready">("mine");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [openPrebuilt, setOpenPrebuilt] = useState<string | null>(null);
  const [, setTick] = useState(0);
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

  const settings = settingsOf(state);
  const list = routineFor(state.routine, mode, settings, today);
  const minutes = estimateMinutes(list);
  const setSettings = (patch: Partial<RoutineSettings>) => update((s) => ({ ...s, routineSettings: { ...settingsOf(s), ...patch } }));
  const stage = lifeStageOf(state.profile);
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

  // While a workout runs, show only the player: on iPhone the page behind can show under the status bar.
  if (playing) return <RoutinePlayer mode={mode} onClose={() => setPlaying(false)} />;
  if (gym) return <GymPlayer session={gym} onClose={() => setGym(null)} />;
  // A gym session interrupted by the phone locking or the app closing.
  const unfinished = loadInProgress();

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-4xl">Workouts</h1>
      </header>

      {unfinished && (
        <Card>
          <p className="font-medium">Unfinished: {unfinished.session.name}</p>
          <p className="text-sm text-muted-foreground">
            {unfinished.done.flat().filter(Boolean).length} of {unfinished.done.flat().length} sets done. Pick up where you left off, weights included.
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => setGym({ ...unfinished.session, resume: unfinished })}>
              <Play className="mr-1 h-3.5 w-3.5" />Resume
            </Button>
            <Button variant="outline" onClick={() => { clearInProgress(); setGym(null); setTick((t) => t + 1); }}>Discard</Button>
          </div>
        </Card>
      )}

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
        <p className="mb-3 text-xs text-muted-foreground">{MODE_INFO[mode].note} About {minutes} minutes.</p>
        {mode === "standard" && (
          <div className="mb-3 space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Rounds of the main exercises</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => (
                  <button key={r} onClick={() => setSettings({ rounds: r })} className={`h-8 w-8 rounded-full text-sm ${settings.rounds === r ? "bg-foreground text-background" : "bg-card"}`} aria-pressed={settings.rounds === r}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Difficulty</span>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-full bg-card disabled:opacity-40" disabled={settings.level <= MIN_LEVEL} onClick={() => setSettings({ level: settings.level - 1 })} aria-label="Easier">−</button>
                <span className="w-16 text-center tabular-nums">{settings.level === 0 ? "Standard" : settings.level > 0 ? `+${settings.level}` : settings.level}</span>
                <button className="h-8 w-8 rounded-full bg-card disabled:opacity-40" disabled={settings.level >= MAX_LEVEL} onClick={() => setSettings({ level: settings.level + 1 })} aria-label="Harder">+</button>
              </div>
            </div>
            <label className="flex items-center justify-between">
              <span>Mix it up daily</span>
              <Switch checked={settings.variety} onCheckedChange={(v) => setSettings({ variety: v })} aria-label="Rotate similar exercises each day" />
            </label>
          </div>
        )}
        {advice && mode === "standard" && <p className="mb-3 rounded-lg bg-muted p-2 text-xs">{advice}</p>}

        <ul className="divide-y">
          {list.map((e) => (
            <li key={e.id} className="py-2">
              <div className="flex items-center gap-3">
                <Checkbox checked={done.has(e.id)} onCheckedChange={() => toggle(e.id)} aria-label={`Mark ${e.name} done`} className="h-5 w-5" />
                <button className="flex flex-1 items-center justify-between text-left" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <span className={done.has(e.id) ? "text-muted-foreground line-through" : ""}>
                    {e.name}
                    {e.round && e.round > 1 && <span className="ml-1.5 text-xs text-muted-foreground">round {e.round}</span>}
                    {exerciseWarning(stage, e.name) && <span className="ml-1.5 text-xs text-destructive">Check</span>}
                  </span>
                  <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    {fmtAmount(e)}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded === e.id ? "rotate-180" : ""}`} />
                  </span>
                </button>
              </div>
              {expanded === e.id && (
                <div className="ml-8 mt-2 space-y-2">
                  {stepsFor(e.name) ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {stepsFor(e.name)!.map((st) => (
                        <figure key={st.name} className="text-center">
                          <ExerciseDemo name={st.name} animate={false} className="h-16 w-full rounded-lg bg-muted/50" />
                          <figcaption className="mt-0.5 text-[10px] text-muted-foreground">{st.name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <ExerciseDemo name={e.name} className="h-24 w-auto rounded-lg bg-muted/50" />
                  )}
                  {exerciseWarning(stage, e.name) && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{exerciseWarning(stage, e.name)}</p>}
                  <p className="text-sm text-muted-foreground">{e.instructions}</p>
                  {mode !== "recovery" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(state.routine.find((r) => r.id === e.id.split("~")[0]) ?? null)}>
                        <Pencil className="mr-1 h-3 w-3" />Adjust
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSwapping(state.routine.find((r) => r.id === e.id.split("~")[0]) ?? null)}>
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
          <Wind className="h-5 w-5" />
          Mobility routine
        </Button>
      </div>

      <Card>
        <CardHeading action={<Button variant="outline" size="sm" className="h-8" onClick={() => { setSeed({ asTemplate: true }); setFormOpen(true); }}><Plus className="mr-1 h-3.5 w-3.5" />Build</Button>}>Gym and home workouts</CardHeading>
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm">
          {([
            ["mine", `My workouts${state.templates.length ? ` (${state.templates.length})` : ""}`],
            ["ready", "Ready-made"],
          ] as const).map(([v, label]) => (
            <button key={v} className={`rounded-lg py-1.5 ${library === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setLibrary(v)}>{label}</button>
          ))}
        </div>
        {library === "mine" ? (
          state.templates.length === 0 ? (
            <Empty>Build your own workout, save a ready-made one, or tick 'Save to My workouts' when you log a session.</Empty>
          ) : (
            <ul className="divide-y">
              {state.templates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => { setSeed({ template: t }); setFormOpen(true); }}>
                    <div className="flex items-center gap-1.5 font-medium"><Star className="h-3.5 w-3.5 fill-copper text-copper" />{t.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.exercises.map((e) => e.name).join(", ")}</div>
                  </button>
                  <Button size="sm" className="h-8" onClick={() => setGym({ name: t.name, category: t.category, intensity: t.intensity, exercises: t.exercises })}>
                    <Play className="mr-1 h-3.5 w-3.5" />Start
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update((s) => ({ ...s, templates: s.templates.filter((x) => x.id !== t.id) }))} aria-label={`Remove ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
              {(["all", "none", "dumbbells", "kettlebell", "barbell", "machine"] as const).map((e) => (
                <button key={e} onClick={() => setEquipment(e)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${equipment === e ? "border-foreground bg-foreground text-background" : "bg-card"}`}>
                  {e === "all" ? "All" : EQUIPMENT_LABELS[e]}
                </button>
              ))}
            </div>
            <ul className="divide-y">
              {PREBUILT.filter((w) => equipment === "all" || w.equipment === equipment).map((w) => (
                <li key={w.id} className="py-2">
                  <div className="flex items-center gap-2">
                    {/* Tap the workout to see what's in it before starting. */}
                    <button className="min-w-0 flex-1 text-left" aria-expanded={openPrebuilt === w.id} onClick={() => setOpenPrebuilt(openPrebuilt === w.id ? null : w.id)}>
                      <div className="flex items-center gap-1 font-medium">
                        {w.name}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openPrebuilt === w.id ? "rotate-180" : ""}`} />
                      </div>
                      <div className={`text-xs text-muted-foreground ${openPrebuilt === w.id ? "" : "truncate"}`}>About {w.minutes} min · {w.exercises.length} exercises · {w.exercises.map((e) => e[0]).join(", ")}</div>
                    </button>
                    <Button size="sm" className="h-8" onClick={() => setGym({ name: w.name, category: w.category, intensity: w.intensity, offerSave: true, exercises: w.exercises.map(([name, sets, reps]) => ({ name, sets: Array.from({ length: sets }, () => ({ reps, weightKg: 0 })) })) })}>
                      <Play className="mr-1 h-3.5 w-3.5" />Start
                    </Button>
                  </div>
                  {openPrebuilt === w.id && (
                    <div className="mt-2 space-y-2 rounded-xl bg-muted p-3">
                      <p className="text-sm">{w.description}</p>
                      <ol className="space-y-2">
                        {w.exercises.map(([name, sets, reps], i) => {
                          const info = findExercise(name);
                          return (
                            <li key={name + i} className="text-sm">
                              <div className="flex justify-between gap-2">
                                <span className="font-medium">{i + 1}. {name}</span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">{sets} × {reps}{info?.timed ? " sec" : ""}</span>
                              </div>
                              {info && <div className="text-xs text-muted-foreground">{info.muscles}. {info.instructions}</div>}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

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

      <WorkoutForm open={formOpen} onOpenChange={setFormOpen} seed={seed} />
      <AdjustDialog
        exercise={editing}
        shown={editing ? shownAmount(editing, settingsOf(state)) : 0}
        onClose={() => setEditing(null)}
        onSave={(e, shown) => saveRoutine(state.routine.map((r) => (r.id === e.id ? { ...e, amount: baseForShown(shown, e, settingsOf(state)) } : r)))}
      />
      <SwapDialog
        exercise={swapping}
        onClose={() => setSwapping(null)}
        onPick={(sub) => swapping && saveRoutine(state.routine.map((r) => (r.id === swapping.id ? { ...sub, id: swapping.id } : r)))}
      />
    </div>
  );
}

/** Edits the amount as the user does it now (after difficulty), not the stored starting amount. */
function AdjustDialog({ exercise, shown, onClose, onSave }: { exercise: RoutineExercise | null; shown: number; onClose: () => void; onSave: (e: RoutineExercise, shown: number) => void }) {
  const [amount, setAmount] = useState<number | "">("");
  useEffect(() => {
    setAmount(exercise ? shown : "");
  }, [exercise]); // eslint-disable-line react-hooks/exhaustive-deps
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
            onSave(exercise, amount as number);
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
