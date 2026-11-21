import { useState } from "react";
import { Dumbbell, Footprints, GlassWater, Moon, Play, Plus, Scale, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  currentStreak,
  foodsOn,
  formatDay,
  isActiveDay,
  isRestDay,
  lastNDays,
  latestWeight,
  restAdvice,
  sumNutrients,
  todayKey,
  workoutsOn,
  activeMinutesOn,
} from "../calc";
import { StepsDialog, WeightDialog } from "../components/QuickLog";
import { Bar, Ring } from "../components/Ring";
import { Card, CardHeading, Estimate } from "../components/Section";
import type { Navigate } from "../nav";
import { useDaily15 } from "../store";
import { PregnancyCard } from "../components/PregnancyCard";
import { lifeStageOf } from "../pregnancy";
import { buildRoutine, estimateMinutes, settingsOf } from "../routine";

export function HomeTab({ onNavigate }: { onNavigate: Navigate }) {
  const { state, update } = useDaily15();
  const [weightOpen, setWeightOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const p = state.profile!;
  const t = p.targets;
  const today = todayKey();

  const food = sumNutrients(foodsOn(state, today));
  const activity = state.activity[today];
  const steps = activity?.steps ?? 0;
  const activeMin = activeMinutesOn(state, today);
  const routine = state.routineLogs[today];
  const workoutsToday = workoutsOn(state, today).length + (routine?.finished ? 1 : 0);
  const streak = currentStreak(state);
  const weight = latestWeight(state);
  const change = weight !== null ? Math.round((weight - p.startWeightKg) * 10) / 10 : null;
  const stage = lifeStageOf(p);
  const todayRoutine = buildRoutine(state.routine, "standard", settingsOf(state));
  const toGo = weight !== null ? Math.round(Math.abs(weight - p.targetWeightKg) * 10) / 10 : null;
  const water = state.water[today] ?? 0;
  const advice = restAdvice(state);
  const restToday = isRestDay(state, today);
  const week = lastNDays(7);
  const remaining = t.calories - food.kcal;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const addWater = (ml: number) => update((s) => ({ ...s, water: { ...s.water, [today]: Math.max(0, (s.water[today] ?? 0) + ml) } }));
  const toggleRest = () =>
    update((s) => ({ ...s, restDays: s.restDays.includes(today) ? s.restDays.filter((d) => d !== today) : [...s.restDays, today] }));

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-copper">DAILY 15</p>
        <h1 className="mt-1 text-4xl leading-tight">
          {greeting}
          {p.name ? `, ${p.name}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">{formatDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>

      {/* Today's commitment */}
      <Card className="bg-foreground text-background">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Today's commitment</p>
            <p className="mt-1 text-2xl font-semibold">
              {routine?.finished ? "Done. Well played." : restToday ? "Rest day" : routine?.completedIds.length ? "In progress" : "Daily workout ready"}
            </p>
            <p className="mt-1 text-sm opacity-70">
              {routine?.finished
                ? "Anything else today is a bonus."
                : restToday
                  ? "Recovery is part of training. Your streak is paused, not broken."
                  : `${todayRoutine.length} exercises, about ${estimateMinutes(todayRoutine)} minutes.`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-semibold tabular-nums">{streak}</div>
            <div className="text-xs opacity-70">day streak</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!routine?.finished && (
            <Button variant="secondary" className="flex-1" onClick={() => onNavigate("workouts", "start-routine")}>
              <Play className="mr-1.5 h-4 w-4" />
              {routine?.completedIds.length ? "Continue" : "Start"}
            </Button>
          )}
          {routine?.finished && (
            <Button variant="secondary" className="flex-1" onClick={() => onNavigate("workouts", "log-workout")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Log another workout
            </Button>
          )}
          {!routine?.finished && (
            <Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={toggleRest}>
              <Moon className="mr-1.5 h-4 w-4" />
              {restToday ? "Undo rest" : "Rest day"}
            </Button>
          )}
        </div>
        <div className="mt-4 flex justify-between" aria-label="Last seven days">
          {week.map((d) => {
            const active = isActiveDay(state, d);
            const rest = isRestDay(state, d);
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div className={`h-7 w-7 rounded-full border text-[10px] leading-7 text-center ${active ? "border-transparent bg-[hsl(var(--d15-done))] text-white" : rest ? "border-background/40 bg-background/10" : "border-background/30"}`}>
                  {active ? "✓" : rest ? "R" : ""}
                </div>
                <span className="text-[10px] opacity-60">{formatDay(d, { weekday: "narrow" })}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <PregnancyCard />

      {advice && !routine?.finished && (
        <Card className="border-copper/40 text-sm">
          <p>{advice}</p>
        </Card>
      )}

      {/* Rings */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center">
          <Ring value={steps} max={t.steps} label="Steps progress">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-semibold tabular-nums">{steps.toLocaleString("en-GB")}</div>
            <div className="text-[10px] text-muted-foreground">of {t.steps.toLocaleString("en-GB")}</div>
          </Ring>
          <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => setStepsOpen(true)}>Update steps</Button>
        </Card>
        <Card className="flex flex-col items-center">
          <Ring kind="budget" value={stage ? 0 : food.kcal} max={t.calories} label={stage ? "Calories eaten" : "Calories progress"}>
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-semibold tabular-nums">{food.kcal.toLocaleString("en-GB")}</div>
            <div className="text-[10px] text-muted-foreground">{stage ? "kcal eaten" : remaining >= 0 ? `${remaining.toLocaleString("en-GB")} left` : `${Math.abs(remaining).toLocaleString("en-GB")} over`}</div>
          </Ring>
          <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => onNavigate("nutrition", "add-food")}>Log food</Button>
        </Card>
      </div>

      <Card>
        <div className="space-y-3 text-sm">
          {!stage && (
            <div>
              <div className="mb-1 flex justify-between"><span>Protein</span><span className="tabular-nums text-muted-foreground">{Math.round(food.protein)} / {t.proteinG} g</span></div>
              <Bar value={food.protein} max={t.proteinG} />
            </div>
          )}
          <div>
            <div className="mb-1 flex justify-between"><span>Active minutes</span><span className="tabular-nums text-muted-foreground">{activeMin} / {t.activeMinutes} min</span></div>
            <Bar value={activeMin} max={t.activeMinutes} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><GlassWater className="h-4 w-4" />Water</span>
              <span className="tabular-nums text-muted-foreground">{(water / 1000).toFixed(2)} / {(t.waterMl / 1000).toFixed(1)} L</span>
            </div>
            <Bar value={water} max={t.waterMl} />
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => addWater(250)}>+ Glass 250 ml</Button>
              <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => addWater(500)}>+ Bottle 500 ml</Button>
              {water > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => addWater(-250)} aria-label="Remove 250 ml">−</Button>}
            </div>
          </div>
        </div>
      </Card>

      {/* Weight and workouts */}
      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-2xl border bg-card p-3 text-left" onClick={() => setWeightOpen(true)}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Scale className="h-3.5 w-3.5" />Weight</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{weight !== null ? `${weight.toFixed(1)}` : "—"}<span className="text-sm font-normal text-muted-foreground"> kg</span></div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {change !== null && change !== 0 ? `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} kg since start` : "Tap to weigh in"}
          </div>
          {!stage && toGo !== null && toGo > 0 && <div className="text-xs text-muted-foreground">{toGo.toFixed(1)} kg to target</div>}
        </button>
        <button className="rounded-2xl border bg-card p-3 text-left" onClick={() => onNavigate("workouts", "log-workout")}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Dumbbell className="h-3.5 w-3.5" />Workouts today</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{workoutsToday}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Tap to log a session</div>
        </button>
      </div>

      <Card>
        <CardHeading action={<Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate("progress", "weekly-report")}>Weekly review</Button>}>
          Macros today
        </CardHeading>
        <div className="grid grid-cols-4 gap-2 text-center text-sm tabular-nums">
          {[
            ["Protein", food.protein, t.proteinG],
            ["Carbs", food.carbs, t.carbsG],
            ["Fat", food.fat, t.fatG],
            ["Fibre", food.fibre, t.fibreG],
          ].map(([label, v, max]) => (
            <div key={label as string}>
              <div className="font-semibold">{Math.round(v as number)} g</div>
              <div className="text-[10px] text-muted-foreground">{!stage || label === "Fibre" ? `of ${max as number} g` : "eaten"}</div>
              <div className="mt-1 text-xs">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Targets and food values are estimates<Estimate /></p>
      </Card>

      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} />
      <StepsDialog open={stepsOpen} onOpenChange={setStepsOpen} />
    </div>
  );
}
