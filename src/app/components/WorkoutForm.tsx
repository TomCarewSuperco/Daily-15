import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { todayKey, uid } from "../calc";
import { lastTimeFor, planSession, sessionMinutes } from "../gym";
import { DISTANCE_CATEGORIES, STRENGTH_CATEGORIES, WORKOUT_CATEGORIES } from "../data";
import { ExerciseDemo } from "../demos/ExerciseDemo";
import { EQUIPMENT_LABELS, findExercise, hasDemo, PREBUILT, suggestExercises, type Equipment, type PrebuiltWorkout } from "../exercises";
import { useDaily15 } from "../store";
import type { ExerciseEntry, Intensity, Workout, WorkoutTemplate } from "../types";
import { Choice, Field, NumField } from "./Field";

export interface WorkoutSeed {
  workout?: Workout;
  template?: WorkoutTemplate;
  /** Build a reusable workout rather than log one. */
  asTemplate?: boolean;
  /** Log an activity such as a swim or a class: starts blank in this category. */
  category?: string;
}

const blankExercise = (): ExerciseEntry => ({ name: "", sets: [{ reps: 10, weightKg: 0 }] });

function fromPrebuilt(w: PrebuiltWorkout): ExerciseEntry[] {
  return w.exercises.map(([name, sets, reps]) => ({ name, sets: Array.from({ length: sets }, () => ({ reps, weightKg: 0 })) }));
}

type Source = "blank" | "prebuilt" | "mine";

export function WorkoutForm({ open, onOpenChange, seed }: { open: boolean; onOpenChange: (o: boolean) => void; seed?: WorkoutSeed }) {
  const { state, update } = useDaily15();
  const asTemplate = !!seed?.asTemplate;
  const editing = !!seed?.workout;
  const [source, setSource] = useState<Source>("blank");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [date, setDate] = useState(todayKey());
  const [category, setCategory] = useState<string>("Weight training");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">(30);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [distance, setDistance] = useState<number | "">("");
  const [rest, setRest] = useState<number | "">("");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [save, setSave] = useState(false);

  const load = (w?: Workout, t?: { name: string; category: string; intensity: Intensity; exercises: ExerciseEntry[] }, minutes?: number) => {
    setCategory(w?.category ?? t?.category ?? "Weight training");
    setName(w?.name ?? t?.name ?? "");
    setDuration(w?.durationMin ?? minutes ?? 30);
    setIntensity(w?.intensity ?? t?.intensity ?? "moderate");
    // A workout being logged starts from the weights last used for each exercise; editing keeps what was saved.
    const base = structuredClone(w?.exercises ?? t?.exercises ?? [blankExercise()]);
    setExercises(w || asTemplate ? base : planSession(base, state.workouts, false));
  };

  useEffect(() => {
    if (!open) return;
    const w = seed?.workout;
    setDate(w?.date ?? todayKey());
    setDistance(w?.distanceKm ?? "");
    setRest(w?.restSec ?? "");
    setNotes(w?.notes ?? "");
    setSave(asTemplate);
    setSource(w || seed?.template ? "blank" : asTemplate ? "blank" : "prebuilt");
    load(w, seed?.template);
    if (seed?.category && !w) {
      setCategory(seed.category);
      setSource("blank");
      setExercises([]);
    }
  }, [open, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const showDistance = DISTANCE_CATEGORIES.has(category) && !asTemplate;
  /** Opened to log a swim, ride or class rather than a gym session. */
  const activity = !!seed?.category && !editing;
  const pace = showDistance && typeof distance === "number" && distance > 0 && typeof duration === "number" && duration > 0 ? duration / distance : null;
  const setEx = (i: number, fn: (e: ExerciseEntry) => ExerciseEntry) => setExercises((xs) => xs.map((x, j) => (j === i ? fn(x) : x)));
  const prebuilt = useMemo(() => PREBUILT.filter((w) => equipment === "all" || w.equipment === equipment), [equipment]);

  const pick = (w: PrebuiltWorkout) => {
    load(undefined, { name: w.name, category: w.category, intensity: w.intensity, exercises: fromPrebuilt(w) }, sessionMinutes(w.exercises, w.category));
    setSource("blank");
    toast(`${w.name} loaded. Add your weights, then save.`);
  };

  const submit = () => {
    const cleaned = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({ name: e.name.trim(), sets: e.sets.filter((s) => s.reps > 0 || s.weightKg > 0) }));
    const template: WorkoutTemplate = { id: uid(), name: name.trim() || category, category, intensity, exercises: cleaned.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x })) })) };
    if (asTemplate) {
      if (!cleaned.length) return toast.error("Add at least one exercise");
      update((s) => ({ ...s, templates: [...s.templates, template] }));
      toast.success("Saved to My workouts");
      onOpenChange(false);
      return;
    }
    if (typeof duration !== "number" || duration <= 0) return toast.error("Add a duration");
    const workout: Workout = {
      id: seed?.workout?.id ?? uid(),
      date,
      category,
      name: name.trim() || category,
      durationMin: duration,
      intensity,
      distanceKm: showDistance && typeof distance === "number" ? distance : undefined,
      restSec: typeof rest === "number" ? rest : undefined,
      exercises: cleaned,
      notes: notes.trim() || undefined,
    };
    update((s) => ({
      ...s,
      workouts: [...s.workouts.filter((w) => w.id !== workout.id), workout],
      templates: save && !s.templates.some((t) => t.name.toLowerCase() === template.name.toLowerCase()) ? [...s.templates, template] : s.templates,
    }));
    toast.success(editing ? "Workout updated" : "Workout logged");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto h-[92dvh] max-w-md overflow-y-auto overscroll-contain rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{asTemplate ? "New workout" : editing ? "Edit workout" : activity ? "Log an activity" : "Log a workout"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 pb-6">
          {!editing && !asTemplate && !activity && (
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-sm">
              {([
                ["prebuilt", "Ready-made"],
                ["mine", "My workouts"],
                ["blank", "Blank"],
              ] as const).map(([v, label]) => (
                <button key={v} className={`rounded-lg py-1.5 ${source === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setSource(v)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {source === "prebuilt" && !editing && !asTemplate && (
            <div className="space-y-3">
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {(["all", "none", "dumbbells", "kettlebell", "barbell", "machine"] as const).map((e) => (
                  <button key={e} onClick={() => setEquipment(e)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${equipment === e ? "border-foreground bg-foreground text-background" : "bg-card"}`}>
                    {e === "all" ? "All" : EQUIPMENT_LABELS[e]}
                  </button>
                ))}
              </div>
              <ul className="space-y-2">
                {prebuilt.map((w) => (
                  <li key={w.id}>
                    <button onClick={() => pick(w)} className="w-full rounded-xl border bg-card p-3 text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{w.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">about {sessionMinutes(w.exercises, w.category)} min</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{EQUIPMENT_LABELS[w.equipment]} · {w.exercises.length} exercises · {w.intensity}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{w.exercises.map((e) => e[0]).join(", ")}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {source === "mine" && !editing && !asTemplate && (
            state.templates.length ? (
              <ul className="space-y-2">
                {state.templates.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => { load(undefined, t); setSource("blank"); }} className="w-full rounded-xl border bg-card p-3 text-left">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.exercises.map((e) => e.name).join(", ")}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No saved workouts yet. Tick 'Save to My workouts' when logging one, or build one from the Workouts tab.</p>
            )
          )}

          {source === "blank" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORKOUT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {!asTemplate && (
                  <Field label="Date">
                    <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} className="block w-full min-w-0 appearance-none" />
                  </Field>
                )}
              </div>
              <Field label={asTemplate ? "Name" : "Name (optional)"}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upper body, Parkrun" />
              </Field>
              {!asTemplate && (
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Duration" value={duration} onChange={setDuration} suffix="min" />
                  {(STRENGTH_CATEGORIES.has(category) || exercises.some((e) => e.name.trim())) && <NumField label="Rest between sets" value={rest} onChange={setRest} suffix="sec" />}
                </div>
              )}
              {showDistance && (
                <div className="grid grid-cols-2 items-end gap-3">
                  <NumField label="Distance" value={distance} onChange={setDistance} suffix="km" step={0.01} />
                  <div className="pb-2 text-sm text-muted-foreground">{pace ? `Pace ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")} /km` : ""}</div>
                </div>
              )}
              <Field label="Intensity">
                <Choice columns={3} value={intensity} onChange={setIntensity} options={[{ value: "light", label: "Light" }, { value: "moderate", label: "Moderate" }, { value: "intense", label: "Intense" }]} />
              </Field>

              {(asTemplate || STRENGTH_CATEGORIES.has(category) || exercises.some((e) => e.name.trim())) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Exercises</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setExercises((x) => [...x, blankExercise()])}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Exercise
                  </Button>
                </div>
                {exercises.map((ex, i) => (
                  <ExerciseCard key={i} ex={ex} workouts={asTemplate ? [] : state.workouts} onChange={(fn) => setEx(i, fn)} onRemove={() => setExercises((xs) => xs.filter((_, j) => j !== i))} />
                ))}
              </div>
              )}

              {!asTemplate && (
                <Field label="Notes">
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How did it feel?" />
                </Field>
              )}
              {!editing && !asTemplate && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={save} onCheckedChange={(v) => setSave(!!v)} />
                  Save to My workouts
                </label>
              )}
              <Button className="w-full" size="lg" onClick={submit}>{asTemplate ? "Save to My workouts" : "Save workout"}</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One exercise: name with library suggestions, how-to and drawing, and sets. */
function ExerciseCard({ ex, onChange, onRemove, workouts }: { ex: ExerciseEntry; onChange: (fn: (e: ExerciseEntry) => ExerciseEntry) => void; onRemove: () => void; workouts: Workout[] }) {
  // Picking an exercise with nothing entered yet copies last time's sets, as the starting point to change.
  const withLast = (x: ExerciseEntry, name: string): ExerciseEntry => {
    const last = lastTimeFor(workouts, name);
    const untouched = x.sets.every((st) => !st.weightKg);
    return last && untouched ? { ...x, name, sets: last.sets.map((st) => ({ ...st })) } : { ...x, name };
  };
  const [focused, setFocused] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const lib = findExercise(ex.name);
  const suggestions = focused && !lib ? suggestExercises(ex.name) : [];
  const unit = lib?.timed ? "sec" : "reps";

  return (
    <div className="rounded-xl border p-3">
      <div className="relative flex gap-2">
        <Input
          value={ex.name}
          placeholder="Exercise name, e.g. goblet squat"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))}
          aria-label="Exercise name"
        />
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove exercise">
          <Trash2 className="h-4 w-4" />
        </Button>
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-10 top-full z-10 mt-1 divide-y rounded-xl border bg-popover shadow-lg" role="listbox">
            {suggestions.map((s) => (
              <li key={s.name}>
                <button role="option" aria-selected={false} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange((x) => withLast(x, s.name)); setFocused(false); }}>
                  {hasDemo(s.name) ? <ExerciseDemo name={s.name} animate={false} className="h-8 w-10 shrink-0" /> : <span className="h-8 w-10 shrink-0" />}
                  <span className="flex-1">
                    {s.name}
                    <span className="block text-[11px] text-muted-foreground">{EQUIPMENT_LABELS[s.equipment]} · {s.muscles}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lib && (
        <div className="mt-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => setHowTo((h) => !h)} aria-expanded={howTo}>
            {EQUIPMENT_LABELS[lib.equipment]} · {lib.muscles} · how to
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${howTo ? "rotate-180" : ""}`} />
          </button>
          {howTo && (
            <div className="mt-2 flex gap-3">
              {hasDemo(lib.name) && <ExerciseDemo name={lib.name} className="h-20 w-24 shrink-0 rounded-lg bg-muted/50" />}
              <p className="text-xs text-muted-foreground">{lib.instructions}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        {ex.sets.map((st, k) => (
          <div key={k} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-sm">
            <span className="text-muted-foreground">{k + 1}</span>
            <div className="relative">
              <Input type="number" inputMode="numeric" value={st.reps || ""} onChange={(e) => onChange((x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, reps: Number(e.target.value) || 0 } : y)) }))} className="h-9 pr-10" aria-label={`Set ${k + 1} ${unit}`} />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
            </div>
            <div className="relative">
              <Input type="number" inputMode="decimal" step={0.5} value={st.weightKg || ""} placeholder={lib?.equipment === "none" ? "—" : ""} onChange={(e) => onChange((x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, weightKg: Number(e.target.value) || 0 } : y)) }))} className="h-9 pr-8" aria-label={`Set ${k + 1} weight`} />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ex.sets.length === 1} onClick={() => onChange((x) => ({ ...x, sets: x.sets.filter((_, m) => m !== k) }))} aria-label="Remove set">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange((x) => ({ ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: 10, weightKg: 0 }) }] }))}>
          <Plus className="mr-1 h-3 w-3" />Add set
        </Button>
      </div>
    </div>
  );
}
