import { useState } from "react";
import { Dumbbell, Footprints, GlassWater, Moon, Play, Plus, Scale, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  streakInfo,
  foodsOn,
  addDays,
  formatDay,
  isActiveDay,
  isRestDay,
  lastNDays,
  latestWeight,
  restAdvice,
  sumNutrients,
  todayKey,
  workoutsOn,
  activeMinutesBreakdown,
} from "../calc";
import { StepsDialog, WeightDialog } from "../components/QuickLog";
import { Bar, Ring } from "../components/Ring";
import { Card, CardHeading, Estimate } from "../components/Section";
import type { Navigate } from "../nav";
import { useDaily15 } from "../store";
import { NotTodaySheet } from "../components/NotTodaySheet";
import { PregnancyCard } from "../components/PregnancyCard";
import { RoughDay } from "../components/RoughDay";
import { ANCHORS, anchorPhrase, withAnchor } from "../anchor";
import { toast } from "../notify";
import { activeCommitments, toggleTick } from "../commitments";
import { lifeStageOf } from "../pregnancy";
import { buildRoutine, estimateMinutes, settingsOf } from "../routine";

export function HomeTab({ onNavigate }: { onNavigate: Navigate }) {
  const { state, update } = useDaily15();
  const [weightOpen, setWeightOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const p = state.profile!;
  const t = p.targets;
  const today = todayKey();
  // Tapping a day in the week strip shows that day's numbers below.
  const [view, setView] = useState(today);
  const viewing = view !== today;

  const food = sumNutrients(foodsOn(state, view));
  const activity = state.activity[view];
  const steps = activity?.steps ?? 0;
  const { total: activeMin, fromSteps: activeFromSteps } = activeMinutesBreakdown(state, view);
  const routine = state.routineLogs[today];
  const workoutsToday = workoutsOn(state, today).length + (routine?.finished ? 1 : 0);
  const streakNow = streakInfo(state);
  const streak = streakNow.current;
  const weight = latestWeight(state);
  const change = weight !== null ? Math.round((weight - p.startWeightKg) * 10) / 10 : null;
  const stage = lifeStageOf(p);
  const todayRoutine = buildRoutine(state.routine, "standard", settingsOf(state));
  const toGo = weight !== null ? Math.round(Math.abs(weight - p.targetWeightKg) * 10) / 10 : null;
  const water = state.water[view] ?? 0;
  const advice = restAdvice(state);
  const restToday = isRestDay(state, today);
  const week = lastNDays(7);
  const remaining = t.calories - food.kcal;

  // Yesterday not logged at all: one question to fill the gap.
  const yesterday = addDays(today, -1);
  const skipKey = `daily15:rough-skip:${yesterday}`;
  const [skipped, setSkipped] = useState(() => {
    try {
      return localStorage.getItem(skipKey) === "1";
    } catch {
      return false;
    }
  });
  const askYesterday = !skipped && !!state.profile && foodsOn(state, yesterday).length === 0 && !(state.foodDiaryDone ?? []).includes(yesterday) && state.foods.length > 0;
  const skipYesterday = () => {
    try {
      localStorage.setItem(skipKey, "1");
    } catch {
      /* storage unavailable */
    }
    setSkipped(true);
  };

  // The food choice made after the 15: shown through the day, asked about from the evening (and the next morning if missed).
  const intentionToday = state.intentions?.[today];
  const intentionYesterday = state.intentions?.[yesterday];
  const askAbout = intentionYesterday && intentionYesterday.done === undefined ? { date: yesterday, it: intentionYesterday } : intentionToday ? { date: today, it: intentionToday } : null;
  const answerIntention = (date: string, done: boolean) =>
    update((s) => ({ ...s, intentions: { ...s.intentions, [date]: { ...s.intentions![date], done } } }));

  const [anchorSkipped, setAnchorSkipped] = useState(() => {
    try {
      return localStorage.getItem("daily15:anchor-skip") === "1";
    } catch {
      return false;
    }
  });
  const skipAnchor = () => {
    try {
      localStorage.setItem("daily15:anchor-skip", "1");
    } catch {
      /* storage unavailable */
    }
    setAnchorSkipped(true);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const addWater = (ml: number) => update((s) => ({ ...s, water: { ...s.water, [view]: Math.max(0, (s.water[view] ?? 0) + ml) } }));
  const toggleRest = () =>
    update((s) => ({ ...s, restDays: s.restDays.filter((d) => d !== today), sickDays: (s.sickDays ?? []).filter((d) => d !== today) }));
  const [notToday, setNotToday] = useState(false);

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
                  : streakNow.missedYesterday && !workoutsOn(state, today).length
                    ? `You missed yesterday. Never miss twice: today's 15 keeps your streak. ${todayRoutine.length} exercises, about ${estimateMinutes(todayRoutine)} minutes.`
                    : `${p.anchor?.text.trim() ? `${anchorPhrase(p.anchor)}. ` : ""}${todayRoutine.length} exercises, about ${estimateMinutes(todayRoutine)} minutes.`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-semibold tabular-nums">{streak}</div>
            <div className="text-xs opacity-70">day streak</div>
            {streakNow.freezes > 0 && (
              <div className="mt-1 text-[11px] opacity-70" title="A freeze covers a second missed day in a row. You earn one every 14 days.">
                {streakNow.freezes} {streakNow.freezes === 1 ? "freeze" : "freezes"} held
              </div>
            )}
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
            <Button variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={() => (restToday ? toggleRest() : setNotToday(true))}>
              <Moon className="mr-1.5 h-4 w-4" />
              {restToday ? "Undo rest" : "Not today"}
            </Button>
          )}
        </div>
        <div className="mt-4 flex justify-between" aria-label="Last seven days">
          {week.map((d) => {
            const active = isActiveDay(state, d);
            const rest = isRestDay(state, d);
            const selected = d === view;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setView(selected ? today : d)}
                aria-pressed={selected}
                aria-label={`Show ${formatDay(d, { weekday: "long", day: "numeric", month: "long" })}`}
                className="flex flex-col items-center gap-1"
              >
                <div className={`h-7 w-7 rounded-full border text-[10px] leading-7 text-center ${active ? "border-transparent bg-[hsl(var(--d15-done))] text-white" : rest ? "border-background/40 bg-background/10" : "border-background/30"} ${selected && viewing ? "ring-2 ring-background ring-offset-2 ring-offset-foreground" : ""}`}>
                  {active ? "✓" : rest ? "R" : ""}
                </div>
                <span className={`text-[10px] ${selected && viewing ? "font-semibold opacity-100" : "opacity-60"}`}>{formatDay(d, { weekday: "narrow" })}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {!p.anchor && !anchorSkipped && (
        <Card>
          <CardHeading action={<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={skipAnchor}>Not now</Button>}>When will you do your 15?</CardHeading>
          <p className="mb-3 text-sm text-muted-foreground">Tie it to something you already do. We'll remind you then, in your words.</p>
          <div className="grid grid-cols-2 gap-2">
            {ANCHORS.map((a) => (
              <Button key={a.id} variant="outline" className="h-auto whitespace-normal py-2.5 text-sm" onClick={() => { update((s) => withAnchor(s, a)); toast.success(`Reminder set for ${a.time}`); }}>
                {a.text.charAt(0).toUpperCase() + a.text.slice(1)}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Change it, or set your own, in Profile under Reminders.</p>
        </Card>
      )}

      {activeCommitments(state).length > 0 && (
        <Card className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week's commitments</p>
          <ul className="mt-2 space-y-2">
            {activeCommitments(state).map((c) => {
              const ticked = c.ticks.includes(today);
              const day = Math.min(7, Math.round((Date.parse(today) - Date.parse(c.start)) / 86_400_000) + 1);
              return (
                <li key={c.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={ticked}
                    aria-label={`${c.text}: done today`}
                    onClick={() => update((s) => toggleTick(s, c.id, today))}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${ticked ? "border-transparent bg-[hsl(var(--d15-done))] text-white" : ""}`}
                  >
                    {ticked ? "✓" : ""}
                  </button>
                  <span className="flex-1">{c.text}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{c.ticks.length} of {day} days</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {askAbout && (
        <Card className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{askAbout.date === today ? "Today's food choice" : "Yesterday's food choice"}</p>
          <p className="mt-1 text-base font-medium">{askAbout.it.text}</p>
          {askAbout.it.done !== undefined ? (
            <p className="mt-1 text-muted-foreground">{askAbout.it.done ? "Done. Nice." : "Not today. Pick another tomorrow."}</p>
          ) : askAbout.date === yesterday || hour >= 18 ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => answerIntention(askAbout.date, true)}>Did it</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => answerIntention(askAbout.date, false)}>Not today</Button>
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground">We'll check in this evening.</p>
          )}
        </Card>
      )}

      <PregnancyCard />

      {askYesterday && (
        <Card>
          <CardHeading action={<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={skipYesterday}>Skip</Button>}>Yesterday wasn't logged</CardHeading>
          <p className="mb-3 text-sm text-muted-foreground">How did it go? A rough answer keeps your week's picture complete.</p>
          <RoughDay date={yesterday} scope="day" compact onDone={skipYesterday} />
        </Card>
      )}

      {advice && !routine?.finished && (
        <Card className="border-copper/40 text-sm">
          <p>{advice}</p>
        </Card>
      )}

      {/* Rings */}
      {viewing && (
        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
          <span>Showing {formatDay(view, { weekday: "long", day: "numeric", month: "long" })}</span>
          <button className="font-medium underline" onClick={() => setView(today)}>Back to today</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center">
          <button type="button" onClick={() => setStepsOpen(true)} aria-label="Update steps" className="rounded-full">
          <Ring value={steps} max={t.steps} label="Steps progress">
            <Footprints className="h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-semibold tabular-nums">{steps.toLocaleString("en-GB")}</div>
            <div className="text-[10px] text-muted-foreground">of {t.steps.toLocaleString("en-GB")}</div>
          </Ring>
          </button>
          <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => setStepsOpen(true)}>Update steps</Button>
        </Card>
        <Card className="flex flex-col items-center">
          <button type="button" onClick={() => (viewing ? onNavigate("nutrition", `show-day:${view}`) : onNavigate("nutrition", "add-food"))} aria-label={viewing ? "Open this day's food diary" : "Log food"} className="rounded-full">
          <Ring kind="budget" value={stage ? 0 : food.kcal} max={t.calories} label={stage ? "Calories eaten" : "Calories progress"}>
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-semibold tabular-nums">{food.kcal.toLocaleString("en-GB")}</div>
            <div className="text-[10px] text-muted-foreground">{stage ? "kcal eaten" : remaining >= 0 ? `${remaining.toLocaleString("en-GB")} left` : `${Math.abs(remaining).toLocaleString("en-GB")} over`}</div>
          </Ring>
          </button>
          <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => (viewing ? onNavigate("nutrition", `show-day:${view}`) : onNavigate("nutrition", "add-food"))}>{viewing ? "Open food diary" : "Log food"}</Button>
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
            {activeFromSteps > 0 && <p className="mt-1 text-[11px] text-muted-foreground">Includes about {activeFromSteps} min estimated from your steps. Add your own figure under Update steps.</p>}
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
          {viewing ? `Macros, ${formatDay(view, { weekday: "long" })}` : "Macros today"}
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
      <StepsDialog open={stepsOpen} onOpenChange={setStepsOpen} initialDate={view} />
      <NotTodaySheet open={notToday} onOpenChange={setNotToday} onRecovery={() => onNavigate("workouts", "start-recovery")} />
    </div>
  );
}
