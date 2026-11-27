import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Flame, Footprints, Ruler, Scale, Trash2, Trophy } from "lucide-react";
import { toast } from "../notify";
import { Bar as RBar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addDays,
  bestStreak,
  currentStreak,
  foodLoggingStreak,
  formatDay,
  lastNDays,
  latestWeight,
  todayKey,
  totalActiveDays,
  trendWeight,
  uid,
  weeklyReport,
  weightSeries,
  activeMinutesOn,
} from "../calc";
import { Choice, Field, NumField } from "../components/Field";
import { StepsDialog, WeightDialog } from "../components/QuickLog";
import { WorkoutForm, type WorkoutSeed } from "../components/WorkoutForm";
import { MeasureDiagram, type MeasureKey } from "../components/MeasureDiagram";
import { ACTIVITY_KINDS, activityWeek, savedByTraining } from "../activity";
import { formatLength, formatLengthChange, fromCm, toCm, type LengthUnit } from "../units";
import { Card, CardHeading, Empty, Stat } from "../components/Section";
import type { Intent } from "../nav";
import { useDaily15 } from "../store";
import { evidence, evidenceHeadline } from "../evidence";
import { PremiumGate } from "../premium/Paywall";
import { activeCommitments, addCommitment, finishedCommitments, MAX_COMMITMENTS } from "../commitments";
import type { MeasurementEntry } from "../types";
import { weeklyReview, type ReviewPoint } from "../review";
import { lifeStageOf, pregnancyReview } from "../pregnancy";
import { PreviewBadge } from "../components/PregnancyCard";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const words = (n: number) => (n >= 0 && n < 10 ? WORDS[n] : String(n));
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };

export function ProgressTab({ intent, clearIntent }: { intent: Intent; clearIntent: () => void }) {
  const { state, update } = useDaily15();
  const p = state.profile!;
  const stage = lifeStageOf(p);
  const [range, setRange] = useState<30 | 90 | 0>(90);
  const [weightOpen, setWeightOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [activitySeed, setActivitySeed] = useState<WorkoutSeed | null>(null);
  const [measureOpen, setMeasureOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intent === "weekly-report") setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    if (intent) clearIntent();
  }, [intent, clearIntent]);

  const today = todayKey();
  const current = latestWeight(state) ?? p.startWeightKg;
  const change = Math.round((current - p.startWeightKg) * 10) / 10;
  const remaining = Math.round((current - p.targetWeightKg) * 10) / 10;
  const trendNow = trendWeight(state.weights, today);
  const trend7 = trendWeight(state.weights, addDays(today, -7));
  const trend30 = trendWeight(state.weights, addDays(today, -30));
  const weekly = trendNow !== null && trend7 !== null ? trendNow - trend7 : null;
  const monthly = trendNow !== null && trend30 !== null ? trendNow - trend30 : null;

  const series = useMemo(() => {
    const all = weightSeries(state.weights);
    if (!range) return all;
    const from = addDays(today, -range);
    return all.filter((d) => d.date >= from);
  }, [state.weights, range, today]);
  const yMin = Math.floor(Math.min(...(stage ? [] : [p.targetWeightKg]), ...series.map((s) => s.kg)) - 1);
  const yMax = Math.ceil(Math.max(...series.map((s) => s.kg), ...(stage ? [] : [p.targetWeightKg])) + 1);

  const week = lastNDays(7);
  const stepsData = week.map((d) => ({ date: d, label: formatDay(d, { weekday: "short" }), steps: state.activity[d]?.steps ?? 0 }));
  const weekSteps = stepsData.reduce((s, d) => s + d.steps, 0);
  const loggedDays = stepsData.filter((d) => d.steps > 0).length;
  const weekDistance = week.reduce((s, d) => s + (state.activity[d]?.distanceKm ?? 0), 0);
  const weekActive = week.reduce((s, d) => s + activeMinutesOn(state, d), 0);
  const actWeek = activityWeek(state, week[week.length - 1]);
  const actData = actWeek.map((d) => ({ ...d, label: formatDay(d.date, { weekday: "short" }) }));
  const actTotal = actWeek.reduce((t, d) => t + d.total, 0);
  const actTarget = p.targets.activeMinutes * 7;
  const actDays = actWeek.filter((d) => d.total >= p.targets.activeMinutes).length;
  const saved = savedByTraining(actWeek, p.targets.steps, p.targets.activeMinutes);
  const stepGoalDays = stepsData.filter((d) => d.steps >= p.targets.steps).length;

  const report = useMemo(() => weeklyReport(state, addDays(todayKey(), -1)), [state]);
  const review = useMemo(() => (stage ? null : weeklyReview(state)), [state, stage]);
  const pReview = useMemo(() => (stage ? pregnancyReview(state) : null), [state, stage]);
  const applyAdjustment = () => {
    if (!review?.adjustment) return;
    const change = review.adjustment.change;
    update((s) => ({ ...s, profile: { ...s.profile!, targetsCustomised: true, adjustedAt: todayKey(), targets: { ...s.profile!.targets, ...change } } }));
    toast.success(`Daily target updated to ${change.calories?.toLocaleString("en-GB")} kcal`);
  };
  const fmtChange = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} kg`);

  const measurements = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const lastM = measurements[measurements.length - 1];
  const lengthUnit: LengthUnit = state.profile?.lengthUnit ?? "cm";
  // Waist-to-height ratio from the latest waist. Not shown in pregnancy or for under-18s, where it doesn't apply.
  const latestWaist = [...measurements].reverse().find((x) => x.waistCm)?.waistCm;
  const waistReadings = measurements.filter((m) => m.waistCm);
  const waistSpanDays = waistReadings.length > 1 ? Math.round((new Date(`${waistReadings[waistReadings.length - 1].date}T12:00:00`).getTime() - new Date(`${waistReadings[0].date}T12:00:00`).getTime()) / 86400000) : 0;
  const halfHeight = Math.round((state.profile?.heightCm ?? 0) / 2);
  const whtr = latestWaist && state.profile && state.profile.heightCm > 0 && state.profile.age >= 18 && !lifeStageOf(state.profile) ? Math.round((latestWaist / state.profile.heightCm) * 100) / 100 : null;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-4xl">Progress</h1>
      </header>

      {/* Weight */}
      <Card>
        <CardHeading action={<Button size="sm" variant="outline" className="h-8" onClick={() => setWeightOpen(true)}><Scale className="mr-1 h-3.5 w-3.5" />Weigh in</Button>}>Weight</CardHeading>
        {stage ? (
          <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
            <div><div className="text-[11px] text-muted-foreground">Start</div><div className="font-semibold">{p.startWeightKg.toFixed(1)}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Current</div><div className="font-semibold">{current.toFixed(1)}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Change</div><div className="font-semibold">{change > 0 ? "+" : change < 0 ? "−" : ""}{Math.abs(change).toFixed(1)}</div></div>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
          <div><div className="text-[11px] text-muted-foreground">Start</div><div className="font-semibold">{p.startWeightKg.toFixed(1)}</div></div>
          <div><div className="text-[11px] text-muted-foreground">Current</div><div className="font-semibold">{current.toFixed(1)}</div></div>
          <div><div className="text-[11px] text-muted-foreground">{change <= 0 ? "Lost" : "Gained"}</div><div className="font-semibold">{Math.abs(change).toFixed(1)}</div></div>
          <div><div className="text-[11px] text-muted-foreground">To target</div><div className="font-semibold">{Math.abs(remaining).toFixed(1)}</div></div>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">kg · target {p.targetWeightKg.toFixed(1)} kg</p>
        </>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50" />Weigh-ins</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-foreground" />7-day trend</span>
          </div>
          <div className="flex gap-1 text-xs">
            {([30, 90, 0] as const).map((r) => (
              <button key={r} className={`rounded-md px-2 py-0.5 ${range === r ? "bg-foreground text-background" : "text-muted-foreground"}`} onClick={() => setRange(r)}>
                {r ? `${r}d` : "All"}
              </button>
            ))}
          </div>
        </div>
        {series.length >= 2 ? (
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={[yMin, yMax]} tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                {!stage && <ReferenceLine y={p.targetWeightKg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Target", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />}
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(1)} kg`, n === "trend" ? "7-day trend" : "Weigh-in"]} />
                <Line dataKey="kg" stroke="none" isAnimationActive={false} dot={{ r: 4, fill: "hsl(var(--muted-foreground) / 0.5)", stroke: "hsl(var(--card))", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line dataKey="trend" type="monotone" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty>Two or more weigh-ins will draw your trend line.</Empty>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Weekly trend</div><div className="font-semibold tabular-nums">{fmtChange(weekly)}</div></div>
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Monthly trend</div><div className="font-semibold tabular-nums">{fmtChange(monthly)}</div></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {stage
            ? "Weight gain in pregnancy and changes while breastfeeding vary a lot. Your midwife will advise on what's right for you."
            : "Daily weight moves by a kilo or more with water, salt and food. Judge progress on the trend line over two to four weeks."}
        </p>
        {state.weights.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">All weigh-ins ({state.weights.length})</summary>
            <ul className="mt-2 max-h-48 divide-y overflow-y-auto">
              {[...state.weights].sort((a, b) => b.date.localeCompare(a.date)).map((w) => (
                <li key={w.id} className="flex items-center justify-between py-1.5">
                  <span>{formatDay(w.date)}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {w.kg.toFixed(1)} kg
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => update((s) => ({ ...s, weights: s.weights.filter((x) => x.id !== w.id) }))} aria-label="Delete weigh-in"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {/* All activity: the daily 15, strength, cardio and walking together. */}
      <Card>
        <CardHeading>Activity this week</CardHeading>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">{actTotal}</span>
          <span className="text-sm text-muted-foreground">active minutes · target {actTarget}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {cap(words(actDays))} of seven days at your {p.targets.activeMinutes}-minute target.
          {saved > 0 ? ` Steps were low on ${saved === 1 ? "one of them" : `${words(saved)} of them`}, but your training made up for it.` : ""}
        </p>
        <div className="mt-3 h-44" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={actData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReferenceLine y={p.targets.activeMinutes} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v} min`, ACTIVITY_KINDS.find((k) => k.key === name)?.label ?? name]} />
              {ACTIVITY_KINDS.map((k, i) => (
                <RBar key={k.key} dataKey={k.key} stackId="a" fill={k.colour} stroke="hsl(var(--card))" strokeWidth={2} maxBarSize={28} radius={i === ACTIVITY_KINDS.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend and the numbers behind the chart, so colour isn't the only way to read it. */}
        <table className="mt-3 w-full text-sm tabular-nums">
          <tbody>
            {ACTIVITY_KINDS.map((k) => (
              <tr key={k.key} className="border-b last:border-0">
                <td className="py-1.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: k.colour }} />{k.label}</td>
                <td className="py-1.5 text-right">{actWeek.reduce((t, d) => t + d[k.key], 0)} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Walking is your logged walks plus everyday steps, estimated as about 5 minutes per 1,000 steps over 5,000 unless your watch gives active minutes. Dashed line: your daily target.</p>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeading action={<Button size="sm" variant="outline" className="h-8" onClick={() => setStepsOpen(true)}><Footprints className="mr-1 h-3.5 w-3.5" />Update</Button>}>Steps this week</CardHeading>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stepsData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <ReferenceLine y={p.targets.steps} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString("en-GB"), "Steps"]} />
              <RBar dataKey="steps" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {stepsData.map((d) => <Cell key={d.date} fill={d.steps >= p.targets.steps ? "hsl(var(--d15-done))" : "hsl(var(--foreground) / 0.72)"} />)}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm tabular-nums">
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Weekly total</div><div className="font-semibold">{weekSteps.toLocaleString("en-GB")}</div></div>
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Daily average</div><div className="font-semibold">{loggedDays ? Math.round(weekSteps / loggedDays).toLocaleString("en-GB") : "—"}</div></div>
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Distance</div><div className="font-semibold">{weekDistance.toFixed(1)} km</div></div>
          <div className="rounded-xl bg-muted p-2.5"><div className="text-[11px] text-muted-foreground">Active minutes</div><div className="font-semibold">{weekActive}</div></div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step target hit on {stepGoalDays} of seven days. Dashed line marks your {p.targets.steps.toLocaleString("en-GB")} target.</p>
        <button className="mt-2 text-left text-sm underline underline-offset-2" onClick={() => setActivitySeed({ category: "Swimming" })}>
          Swim, ride, class or sport? Log it here. It counts towards active minutes, not steps.
        </button>
      </Card>

      {/* Does the 15 help? The user's own evidence. */}
      <EvidenceCard />

      {/* Consistency */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Current streak" value={<span className="flex items-center gap-1"><Flame className="h-5 w-5 text-copper" />{currentStreak(state)}</span>} sub="active days" />
        <Stat label="Best streak" value={<span className="flex items-center gap-1"><Trophy className="h-5 w-5 text-copper" />{bestStreak(state)}</span>} sub="days" />
        <Stat label="Active days" value={totalActiveDays(state)} sub="all time" />
        <Stat label="Food logging" value={foodLoggingStreak(state)} sub="days in a row" />
      </div>

      {/* Weekly review */}
      <div ref={reportRef} className="space-y-4">
        {pReview && (
          <Card>
            <CardHeading action={<span className="text-xs text-muted-foreground">{formatDay(pReview.start, { day: "numeric", month: "short" })} to {formatDay(pReview.end, { day: "numeric", month: "short" })}</span>}>
              Weekly review<PreviewBadge />
            </CardHeading>
            <p className="text-lg leading-snug">{pReview.headline}</p>
            {pReview.wins.length > 0 && <ReviewList title="Going well" items={pReview.wins.map((w, i) => ({ id: `w${i}`, text: w, priority: 0 }))} />}
            {pReview.watch.length > 0 && <ReviewList title="Worth a look" items={pReview.watch.map((w, i) => ({ id: `x${i}`, text: w, priority: 0 }))} />}
            {pReview.ideas.length > 0 && <ReviewList title="Ideas for next week" items={pReview.ideas.map((w, i) => ({ id: `i${i}`, text: w, priority: 0 }))} />}
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">General guidance only, not yet reviewed by a midwife or dietitian. Your midwife or GP knows your circumstances and should guide your diet, supplements and activity.</p>
          </Card>
        )}
        {review && (
        <Card>
          <CardHeading action={<span className="text-xs text-muted-foreground">{formatDay(review.start, { day: "numeric", month: "short" })} to {formatDay(review.end, { day: "numeric", month: "short" })}</span>}>Weekly review</CardHeading>
          <p className="text-lg leading-snug">{review.headline}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Food: {review.foodCoverage.logged} {review.foodCoverage.logged === 1 ? "day" : "days"} logged
            {review.foodCoverage.estimated > 0 && `, ${review.foodCoverage.estimated} estimated`}
            {review.foodCoverage.missing > 0 && `, ${review.foodCoverage.missing} missing`}
          </p>

          {review.wins.length > 0 && <ReviewList title="Keep doing" items={review.wins.map((w, i) => ({ id: `w${i}`, text: w, priority: 0 }))} />}
          <div className="mt-4">
          <PremiumGate title="Your plan for next week" why="Premium shows what to eat more and less of, and whether to change your calorie target based on your weight trend.">
          {review.adjustment && (
            <div className="mt-4 rounded-xl border border-copper/40 bg-copper/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-copper">Suggested change</p>
              <p className="mt-1 font-medium">{review.adjustment.text}</p>
              <p className="mt-1 text-sm text-muted-foreground">{review.adjustment.reason}</p>
              <Button size="sm" className="mt-3" onClick={applyAdjustment}>Apply</Button>
            </div>
          )}

          {review.moreOf.length > 0 && <ReviewList title="Do more of" items={review.moreOf} commit />}
          {review.lessOf.length > 0 && <ReviewList title="Do less of" items={review.lessOf} commit />}
          {finishedCommitments(state).length > 0 && (
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last commitments</p>
              {finishedCommitments(state).slice(0, 2).map((c) => (
                <p key={c.id} className="mt-1">{c.text}: kept {c.ticks.length} of 7 days</p>
              ))}
            </div>
          )}
          </PremiumGate>
          </div>
          {review.notes.map((n) => <p key={n} className="mt-3 text-sm text-muted-foreground">{n}</p>)}
          {!review.moreOf.length && !review.lessOf.length && !review.adjustment && <p className="mt-3 text-sm">Nothing to change this week. Keep doing what you're doing.</p>}
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            General guidance from your logged data, which may be incomplete. Not medical or dietetic advice. If you're pregnant, breastfeeding, under 18, managing a medical condition or have had an eating disorder, speak to your GP or a registered dietitian before changing your diet.
          </p>
        </Card>
        )}

        <Card>
          <CardHeading>Week in numbers</CardHeading>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">{report.goalCompletion}%</span>
            <span className="text-sm text-muted-foreground">of daily goals met</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {([
              ["Workouts", report.workoutsCompleted],
              ["Exercise minutes", report.exerciseMinutes],
              ["Average steps", report.avgSteps?.toLocaleString("en-GB") ?? "—"],
              ["Average calories", report.avgCalories?.toLocaleString("en-GB") ?? "—"],
              ["Average protein", report.avgProtein !== null ? `${report.avgProtein} g` : "—"],
              ["Weight trend", fmtChange(report.weightChange)],
              ...report.measurementChanges.map((m) => [`${m.label[0].toUpperCase()}${m.label.slice(1)}`, formatLengthChange(m.change, lengthUnit)]),
            ] as [string, string | number][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">Goal completion counts four daily goals: being active, steps, calories within target and protein.</p>
        </Card>
      </div>

      {/* Measurements */}
      <Card>
        <CardHeading action={<Button size="sm" variant="outline" className="h-8" onClick={() => setMeasureOpen(true)}><Ruler className="mr-1 h-3.5 w-3.5" />Add</Button>}>Measurements</CardHeading>
        {lastM ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
              {(["waistCm", "chestCm", "hipsCm", "armCm", "thighCm"] as const).map((k) => {
                // Each measurement's own latest and first readings: not every entry has every measurement.
                const readings = measurements.filter((m) => m[k]);
                if (!readings.length) return null;
                const first = readings[0];
                const last = readings[readings.length - 1];
                const diff = Math.round((last[k]! - first[k]!) * 10) / 10;
                const since = formatDay(first.date, { day: "numeric", month: "short" });
                return (
                  <div key={k} className="rounded-xl bg-muted p-2">
                    <div className="text-[11px] capitalize text-muted-foreground">{k.replace("Cm", "")}</div>
                    <div className="font-semibold">{formatLength(last[k]!, lengthUnit)}</div>
                    {readings.length > 1 && <div className="text-[11px] text-muted-foreground">{fromCm(Math.abs(diff), lengthUnit) === 0 ? "No change" : formatLengthChange(diff, lengthUnit)} since {since}</div>}
                  </div>
                );
              })}
            </div>
            {waistReadings.length > 1 && (
              <div className="mt-3">
                <div className="mb-1 text-xs text-muted-foreground">Waist readings</div>
                <div className="flex flex-wrap gap-1.5 text-xs tabular-nums">
                  {waistReadings.slice(-6).map((m) => (
                    <span key={m.id ?? m.date} className="rounded-full border px-2 py-0.5">
                      {formatDay(m.date, { day: "numeric", month: "short" })}: {formatLength(m.waistCm!, lengthUnit)}
                    </span>
                  ))}
                </div>
                {waistSpanDays < 14 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">These are {waistSpanDays === 1 ? "a day" : `${waistSpanDays} days`} apart. A tape varies by about 1 cm between readings, so a real change shows after two to four weeks. The weekly review uses readings three to six weeks apart.</p>
                )}
              </div>
            )}
            {whtr !== null && (
              <p className="mt-3 rounded-xl bg-muted p-2.5 text-sm">
                Waist-to-height: <span className="font-semibold tabular-nums">{whtr.toFixed(2)}</span>.{" "}
                {whtr < 0.5
                  ? "Under half your height, the healthy range."
                  : `NHS guidance is to keep your waist under half your height (0.5). That's ${formatLength(halfHeight, lengthUnit)} for you, about ${formatLength(Math.max(0.5, latestWaist! - halfHeight), lengthUnit)} from here.`}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Latest {formatDay(lastM.date)}. Measure every two to four weeks at the same point on the body.</p>
          </>
        ) : (
          <Empty>Waist measurement often shows fat loss before the scales do.</Empty>
        )}
      </Card>

      <PhotosCard />

      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} />
      <StepsDialog open={stepsOpen} onOpenChange={setStepsOpen} />
      <WorkoutForm open={!!activitySeed} onOpenChange={(o) => !o && setActivitySeed(null)} seed={activitySeed ?? undefined} />
      <MeasureDialog open={measureOpen} onOpenChange={setMeasureOpen} />
    </div>
  );
}

function MeasureDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, update } = useDaily15();
  const unit: LengthUnit = state.profile?.lengthUnit ?? "cm";
  // Switching unit converts anything already typed and is remembered for next time.
  const setUnit = (next: LengthUnit) => {
    if (next === unit) return;
    setM((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, typeof v === "number" && v > 0 ? fromCm(toCm(v, unit), next) : v])));
    update((s) => (s.profile ? { ...s, profile: { ...s.profile, lengthUnit: next } } : s));
  };
  const [date, setDate] = useState(todayKey());
  const [m, setM] = useState<Record<string, number | "">>({});
  const [active, setActive] = useState<MeasureKey>("waistCm");
  // Waist is the one that matters for most goals. The rest show muscle gain, so they're open for muscle and strength goals
  // or for anyone who has recorded them before.
  const wantsMore = (g?: string) => g === "build-muscle" || g === "strength";
  const trackedMore = state.measurements.some((x) => x.chestCm || x.hipsCm || x.armCm || x.thighCm);
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (open) {
      setDate(todayKey());
      setM({});
      setActive("waistCm");
      setMore(wantsMore(state.profile?.goal) || trackedMore);
    }
  }, [open]);
  const fields: [keyof MeasurementEntry, string][] = [["waistCm", "Waist"], ["chestCm", "Chest"], ["hipsCm", "Hips"], ["armCm", "Upper arm"], ["thighCm", "Thigh"]];
  const any = Object.values(m).some((v) => typeof v === "number" && v > 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Body measurements</DialogTitle>
          <DialogDescription>Your waist is the measurement that matters most. Use a soft tape, snug but not tight, at the same time of day each time.</DialogDescription>
        </DialogHeader>
        <Field label="Date"><Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} /></Field>
        <Field label="Units">
          <Choice columns={2} value={unit} onChange={setUnit} options={[{ value: "cm", label: "Centimetres" }, { value: "in", label: "Inches" }]} />
        </Field>
        <MeasureDiagram active={active} />
        <div className="grid grid-cols-2 gap-3">
          {fields.filter(([k]) => k === "waistCm" || more).map(([k, label]) => (
            <div key={k} onFocusCapture={() => setActive(k as MeasureKey)} onPointerDown={() => setActive(k as MeasureKey)}>
              <NumField label={label} value={m[k] ?? ""} onChange={(v) => setM({ ...m, [k]: v })} suffix={unit} step={unit === "cm" ? 0.5 : 0.25} />
            </div>
          ))}
        </div>
        {!more && (
          <button className="text-left text-sm underline underline-offset-2" onClick={() => setMore(true)}>
            More measurements: chest, hips, upper arm, thigh
          </button>
        )}
        <Button
          disabled={!any}
          onClick={() => {
            const entry: MeasurementEntry = { id: uid(), date };
            fields.forEach(([k]) => {
              const v = m[k];
              if (typeof v === "number" && v > 0) (entry as unknown as Record<string, number>)[k] = toCm(v, unit);
            });
            update((s) => ({ ...s, measurements: [...s.measurements, entry] }));
            toast.success("Measurements saved");
            onOpenChange(false);
          }}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Downscale to keep photos small enough for on-device storage. */
function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 720;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function PhotosCard() {
  const { state, update } = useDaily15();
  const input = useRef<HTMLInputElement>(null);
  const photos = [...state.photos].sort((a, b) => a.date.localeCompare(b.date));
  const [compare, setCompare] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const dataUrl = await compress(f);
      update((s) => ({ ...s, photos: [...s.photos, { id: uid(), date: todayKey(), dataUrl }] }));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  return (
    <Card>
      <CardHeading
        action={
          <Button size="sm" variant="outline" className="h-8" onClick={() => input.current?.click()}>
            <Camera className="mr-1 h-3.5 w-3.5" />Add
          </Button>
        }
      >
        Progress photos
      </CardHeading>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {photos.length === 0 ? (
        <Empty>Optional. Photos stay on this device. Same spot, same light, every four weeks.</Empty>
      ) : (
        <>
          {photos.length >= 2 && (
            <Button variant="ghost" size="sm" className="mb-2 h-8 text-xs" onClick={() => setCompare((c) => !c)}>
              {compare ? "Show all" : "Compare first and latest"}
            </Button>
          )}
          <div className={`grid gap-2 ${compare ? "grid-cols-2" : "grid-cols-3"}`}>
            {(compare ? [photos[0], photos[photos.length - 1]] : photos).map((ph) => (
              <figure key={ph.id} className="relative">
                <img src={ph.dataUrl} alt={`Progress photo ${formatDay(ph.date)}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                <figcaption className="mt-0.5 text-[10px] text-muted-foreground">{formatDay(ph.date, { day: "numeric", month: "short", year: "2-digit" })}</figcaption>
                {!compare && (
                  <button className="absolute right-1 top-1 rounded-full bg-background/80 p-1" onClick={() => update((s) => ({ ...s, photos: s.photos.filter((x) => x.id !== ph.id) }))} aria-label="Delete photo">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </figure>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function ReviewList({ title, items, commit }: { title: string; items: ReviewPoint[]; commit?: boolean }) {
  const { state, update } = useDaily15();
  const active = activeCommitments(state);
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-2.5">
        {items.map((it) => (
          <li key={it.id} className="text-sm">
            <span className="font-medium">{it.text}</span>
            {it.focus && <span className="ml-1.5 rounded bg-copper/15 px-1.5 py-0.5 align-middle text-[10px] uppercase tracking-wide text-copper">Focus</span>}
            {it.detail && <p className="mt-0.5 text-muted-foreground">{it.detail}</p>}
            {commit && (active.some((c) => c.text === it.text) ? (
              <span className="mt-1 inline-block text-xs font-medium text-[hsl(var(--d15-done))]">Committed for this week</span>
            ) : active.length < MAX_COMMITMENTS ? (
              <button className="mt-1 text-xs font-medium underline" onClick={() => { update((s) => addCommitment(s, it.text, it.id)); toast.success("Added to this week's commitments on Home"); }}>Commit to this for a week</button>
            ) : null)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceCard() {
  const { state } = useDaily15();
  const e = useMemo(() => evidence(state), [state]);
  const pct = (v: number | null) => (v === null ? "\u2014" : `${Math.round(v * 100)}%`);
  const kcal = (v: number | null) => (v === null ? "\u2014" : Math.round(v).toLocaleString("en-GB"));
  return (
    <Card>
      <CardHeading>Your 15 and the rest of your day</CardHeading>
      <p className="text-sm">{evidenceHeadline(e)}</p>
      {e.on.days + e.off.days > 0 && (
        <table className="mt-3 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-normal">Last 8 weeks</th>
              <th className="py-1 text-right font-normal">15 done</th>
              <th className="py-1 text-right font-normal">Not done</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t"><td className="py-1.5">Days</td><td className="text-right">{e.on.days}</td><td className="text-right">{e.off.days}</td></tr>
            <tr className="border-t"><td className="py-1.5">Food logged</td><td className="text-right">{pct(e.on.days ? e.on.loggedShare : null)}</td><td className="text-right">{pct(e.off.days ? e.off.loggedShare : null)}</td></tr>
            {e.ready && <tr className="border-t"><td className="py-1.5">Average calories</td><td className="text-right">{kcal(e.on.avgKcal)}</td><td className="text-right">{kcal(e.off.avgKcal)}</td></tr>}
            {e.ready && <tr className="border-t"><td className="py-1.5">Protein target hit</td><td className="text-right">{pct(e.on.proteinHitShare)}</td><td className="text-right">{pct(e.off.proteinHitShare)}</td></tr>}
          </tbody>
        </table>
      )}
      {e.intentions.answered > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Food choices after your 15: {e.intentions.done} of {e.intentions.answered} done.</p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">Compares days, it doesn't prove cause: busy days can mean both no workout and less logging. Rest days are left out.</p>
    </Card>
  );
}
