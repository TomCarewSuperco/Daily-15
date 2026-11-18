import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { todayKey, uid } from "../calc";
import { DISTANCE_CATEGORIES, STRENGTH_CATEGORIES, WORKOUT_CATEGORIES } from "../data";
import { useDaily15 } from "../store";
import type { ExerciseEntry, Intensity, Workout, WorkoutTemplate } from "../types";
import { Choice, Field, NumField } from "./Field";

export interface WorkoutSeed {
  workout?: Workout;
  template?: WorkoutTemplate;
}

const blankExercise = (): ExerciseEntry => ({ name: "", sets: [{ reps: 10, weightKg: 0 }] });

export function WorkoutForm({ open, onOpenChange, seed }: { open: boolean; onOpenChange: (o: boolean) => void; seed?: WorkoutSeed }) {
  const { update } = useDaily15();
  const [date, setDate] = useState(todayKey());
  const [category, setCategory] = useState<string>("Weight training");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | "">(30);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [distance, setDistance] = useState<number | "">("");
  const [rest, setRest] = useState<number | "">("");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [favourite, setFavourite] = useState(false);

  useEffect(() => {
    if (!open) return;
    const w = seed?.workout;
    const t = seed?.template;
    setDate(w?.date ?? todayKey());
    setCategory(w?.category ?? t?.category ?? "Weight training");
    setName(w?.name ?? t?.name ?? "");
    setDuration(w?.durationMin ?? 30);
    setIntensity(w?.intensity ?? t?.intensity ?? "moderate");
    setDistance(w?.distanceKm ?? "");
    setRest(w?.restSec ?? "");
    setExercises(structuredClone(w?.exercises ?? t?.exercises ?? [blankExercise()]));
    setNotes(w?.notes ?? "");
    setFavourite(false);
  }, [open, seed]);

  useEffect(() => {
    if (open && !seed?.workout && !seed?.template && STRENGTH_CATEGORIES.has(category) && exercises.length === 0) setExercises([blankExercise()]);
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const showDistance = DISTANCE_CATEGORIES.has(category);
  const pace = showDistance && typeof distance === "number" && distance > 0 && typeof duration === "number" && duration > 0 ? duration / distance : null;

  const setEx = (i: number, fn: (e: ExerciseEntry) => ExerciseEntry) => setExercises((xs) => xs.map((x, j) => (j === i ? fn(x) : x)));

  const save = () => {
    if (typeof duration !== "number" || duration <= 0) {
      toast.error("Add a duration");
      return;
    }
    const cleaned = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({ name: e.name.trim(), sets: e.sets.filter((s) => s.reps > 0 || s.weightKg > 0) }));
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
      templates: favourite
        ? [...s.templates, { id: uid(), name: workout.name, category, intensity, exercises: cleaned.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x })) })) }]
        : s.templates,
    }));
    toast.success(seed?.workout ? "Workout updated" : "Workout logged");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{seed?.workout ? "Edit workout" : "Log a workout"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKOUT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} />
            </Field>
          </div>
          <Field label="Name (optional)">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upper body, Parkrun" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Duration" value={duration} onChange={setDuration} suffix="min" />
            <NumField label="Rest between sets" value={rest} onChange={setRest} suffix="sec" />
          </div>
          {showDistance && (
            <div className="grid grid-cols-2 items-end gap-3">
              <NumField label="Distance" value={distance} onChange={setDistance} suffix="km" step={0.01} />
              <div className="pb-2 text-sm text-muted-foreground">{pace ? `Pace ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")} /km` : ""}</div>
            </div>
          )}
          <Field label="Intensity">
            <Choice columns={3} value={intensity} onChange={setIntensity} options={[{ value: "light", label: "Light" }, { value: "moderate", label: "Moderate" }, { value: "intense", label: "Intense" }]} />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Exercises, sets, reps and weight</span>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setExercises((x) => [...x, blankExercise()])}>
                <Plus className="mr-1 h-3.5 w-3.5" />Exercise
              </Button>
            </div>
            {exercises.map((ex, i) => (
              <div key={i} className="rounded-xl border p-3">
                <div className="flex gap-2">
                  <Input value={ex.name} placeholder="Exercise name" onChange={(e) => setEx(i, (x) => ({ ...x, name: e.target.value }))} />
                  <Button variant="ghost" size="icon" onClick={() => setExercises((xs) => xs.filter((_, j) => j !== i))} aria-label="Remove exercise">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {ex.sets.map((st, k) => (
                    <div key={k} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{k + 1}</span>
                      <div className="relative">
                        <Input type="number" inputMode="numeric" value={st.reps || ""} onChange={(e) => setEx(i, (x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, reps: Number(e.target.value) || 0 } : y)) }))} className="h-9 pr-10" />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">reps</span>
                      </div>
                      <div className="relative">
                        <Input type="number" inputMode="decimal" step={0.5} value={st.weightKg || ""} onChange={(e) => setEx(i, (x) => ({ ...x, sets: x.sets.map((y, m) => (m === k ? { ...y, weightKg: Number(e.target.value) || 0 } : y)) }))} className="h-9 pr-8" />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={ex.sets.length === 1} onClick={() => setEx(i, (x) => ({ ...x, sets: x.sets.filter((_, m) => m !== k) }))} aria-label="Remove set">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEx(i, (x) => ({ ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: 10, weightKg: 0 }) }] }))}>
                    <Plus className="mr-1 h-3 w-3" />Add set
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How did it feel?" />
          </Field>
          {!seed?.workout && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={favourite} onCheckedChange={(v) => setFavourite(!!v)} />
              Save as a favourite routine
            </label>
          )}
          <Button className="w-full" size="lg" onClick={save}>Save workout</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
