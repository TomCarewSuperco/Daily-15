import {
  addDays,
  ALCOHOL_UNITS_PER_WEEK,
  alcoholUnits,
  coverage,
  fiveADayOn,
  foodsOn,
  formatDay,
  lastNDays,
  limitsFor,
  sumNutrients,
  todayKey,
  trendWeight,
  type Extra,
} from "./calc";
import type { AppState, FocusGoal, Targets } from "./types";

/*
 * Weekly review: rule-based coaching from the last seven complete days.
 *
 * Every rule, threshold and piece of wording lives in this file so a registered
 * dietitian can review it in one place. The review never sets a calorie target
 * below the floor, never changes it by more than 150 kcal at a time, and waits
 * two weeks after an accepted change before suggesting another.
 */

export interface ReviewPoint {
  id: string;
  text: string;
  detail?: string;
  focus?: boolean;
  /** Higher shows first. Focus areas get a boost. */
  priority: number;
}

export interface Adjustment {
  text: string;
  reason: string;
  change: Partial<Targets>;
}

export type WeightStatus = "on-track" | "too-fast" | "stalled" | "flat-week" | "over-target" | "gaining" | "not-enough-data" | "not-applicable";

export interface WeeklyReview {
  start: string;
  end: string;
  headline: string;
  status: WeightStatus;
  wins: string[];
  moreOf: ReviewPoint[];
  lessOf: ReviewPoint[];
  adjustment: Adjustment | null;
  notes: string[];
  /** Days of the week with food logged, estimated (a rough-day entry) or missing. */
  foodCoverage: { logged: number; estimated: number; missing: number };
}

const STEP_KCAL = 150;
const FOCUS_BOOST = 50;
const MIN_FOOD_DAYS = 4;
const MIN_WEIGH_INS = 3;
const STRENGTH = new Set(["Weight training", "Circuit training", "HIIT", "Pilates"]);

const round = (n: number, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp;
const kg = (n: number) => `${Math.abs(n).toFixed(1)} kg`;
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function topContributors(state: AppState, days: string[], field: "kcal" | Extra, n = 3): string[] {
  const set = new Set(days);
  const byName = new Map<string, number>();
  for (const f of state.foods) {
    if (!set.has(f.date)) continue;
    const v = f[field];
    if (typeof v !== "number" || v <= 0) continue;
    byName.set(f.name, (byName.get(f.name) ?? 0) + v);
  }
  return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name.toLowerCase());
}

/** Reviews the seven days ending `end` (default: yesterday, the last complete day). */
export function weeklyReview(state: AppState, end = addDays(todayKey(), -1)): WeeklyReview {
  const p = state.profile!;
  const t = p.targets;
  const limits = limitsFor(p);
  const focus = new Set<FocusGoal>(p.focus ?? []);
  const days = lastNDays(7, end);
  const start = days[0];
  const losing = p.goal === "lose-fat" || p.goal === "lose-weight";
  const floor = p.sex === "male" ? 1500 : 1200;

  // Food
  const foodDays = days.filter((d) => foodsOn(state, d).length > 0);
  // Estimated days fill the picture; changing the calorie target needs days actually logged.
  const estimatedDays = foodDays.filter((d) => foodsOn(state, d).some((f) => f.rough));
  const loggedDays = foodDays.filter((d) => !estimatedDays.includes(d));
  const realDays = foodDays.filter((d) => foodsOn(state, d).some((f) => !f.rough));
  // Days marked complete give a truer average: half-logged days drag it down.
  const doneSet = new Set(state.foodDiaryDone ?? []);
  const completeDays = loggedDays.filter((d) => doneSet.has(d));
  const basisDays = completeDays.length >= MIN_FOOD_DAYS ? completeDays : foodDays;
  const totals = basisDays.map((d) => ({ d, n: sumNutrients(foodsOn(state, d)), entries: foodsOn(state, d) }));
  const avg = (f: (x: (typeof totals)[number]) => number) => (totals.length ? totals.reduce((s, x) => s + f(x), 0) / totals.length : 0);
  const avgKcal = avg((x) => x.n.kcal);
  const avgProtein = avg((x) => x.n.protein);
  const avgFibre = avg((x) => x.n.fibre);
  const avgFiveADay = avg((x) => fiveADayOn(state, x.d));
  // Only average a limit over days where most of the food has that value, so gaps don't look like good news.
  const avgExtra = (field: Extra) => {
    const known = totals.filter((x) => coverage(x.entries, field) >= 0.6);
    return known.length >= 3 ? known.reduce((s, x) => s + (x.n[field] ?? 0), 0) / known.length : null;
  };
  const avgSat = avgExtra("satFat");
  const avgSugars = avgExtra("sugars");
  const avgSalt = avgExtra("salt");
  const units = alcoholUnits(state, days);
  const drinkDays = days.filter((d) => foodsOn(state, d).some((f) => (f.alcoholUnits ?? 0) > 0)).length;
  const isWeekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00`).getDay());
  const weekend = totals.filter((x) => isWeekend(x.d));
  const weekday = totals.filter((x) => !isWeekend(x.d));
  const mean = (xs: typeof totals) => (xs.length ? xs.reduce((s, x) => s + x.n.kcal, 0) / xs.length : 0);
  const breakfasts = totals.map((x) => x.entries.filter((e) => e.meal === "breakfast")).filter((b) => b.length);
  const breakfastProtein = breakfasts.length ? breakfasts.reduce((s, b) => s + sumNutrients(b).protein, 0) / breakfasts.length : null;

  // Movement
  const stepDays = days.map((d) => state.activity[d]?.steps ?? 0).filter((s) => s > 0);
  const avgSteps = stepDays.length ? stepDays.reduce((a, b) => a + b, 0) / stepDays.length : null;
  const activeDays = days.filter((d) => state.routineLogs[d]?.finished || state.workouts.some((w) => w.date === d)).length;
  const strengthSessions = state.workouts.filter((w) => days.includes(w.date) && STRENGTH.has(w.category)).length;
  const avgWater = days.reduce((s, d) => s + (state.water[d] ?? 0), 0) / 7;

  // Weight trend
  const weighIns14 = state.weights.filter((w) => w.date > addDays(end, -14) && w.date <= end).length;
  const trendNow = trendWeight(state.weights, end);
  const trend7 = trendWeight(state.weights, addDays(end, -7));
  const trend14 = trendWeight(state.weights, addDays(end, -14));
  const change7 = trendNow !== null && trend7 !== null ? trendNow - trend7 : null;
  const change14 = trendNow !== null && trend14 !== null ? trendNow - trend14 : null;
  const pct7 = change7 !== null && trendNow ? (change7 / trendNow) * 100 : null;
  const pct14 = change14 !== null && trendNow ? (change14 / trendNow) * 100 : null;
  const recentlyAdjusted = !!p.adjustedAt && p.adjustedAt > addDays(end, -14);

  const moreOf: ReviewPoint[] = [];
  const lessOf: ReviewPoint[] = [];
  const notes: string[] = [];
  const wins: string[] = [];
  let adjustment: Adjustment | null = null;
  let status: WeightStatus = "not-applicable";
  let headline = "";

  const add = (to: ReviewPoint[], pt: Omit<ReviewPoint, "priority" | "focus"> & { priority: number; goals?: FocusGoal[] }) => {
    const isFocus = !!pt.goals?.some((g) => focus.has(g));
    to.push({ id: pt.id, text: pt.text, detail: pt.detail, focus: isFocus, priority: pt.priority + (isFocus ? FOCUS_BOOST : 0) });
  };

  const enoughFood = foodDays.length >= MIN_FOOD_DAYS && realDays.length >= 2;
  const enoughForTarget = realDays.length >= MIN_FOOD_DAYS;
  if (estimatedDays.length) notes.push(`${estimatedDays.length} of 7 days ${estimatedDays.length === 1 ? "was" : "were"} estimated rather than logged, so treat the food advice as approximate.`);

  /* ---------- Weight and the calorie target ---------- */
  if (losing || p.goal === "build-muscle" || p.goal === "maintain") {
    if (weighIns14 < MIN_WEIGH_INS || pct7 === null) {
      status = "not-enough-data";
      headline = "Not enough weigh-ins to judge your trend yet.";
      notes.push("Weigh in at least three times a week, first thing in the morning, for a reliable trend.");
    } else if (losing) {
      if (pct7 <= -1) {
        status = "too-fast";
        headline = `You lost ${kg(change7!)} on the trend line this week. That's faster than is easy to sustain.`;
        if (!recentlyAdjusted) {
          adjustment = {
            text: `Raise your target to ${fmt(t.calories + STEP_KCAL)} kcal`,
            reason: "Losing more than 1% of body weight a week makes it harder to keep muscle and stick with the plan. A little more food, ideally protein, slows it to a steadier rate.",
            change: { calories: t.calories + STEP_KCAL },
          };
        }
      } else if (pct7 <= -0.25) {
        status = "on-track";
        headline = `On track. Trend weight down ${kg(change7!)} this week.`;
      } else if (pct14 !== null && pct14 > -0.4) {
        if (!enoughForTarget) {
          status = "stalled";
          headline = "Weight has been steady for two weeks.";
          notes.push(`Log food on at least ${MIN_FOOD_DAYS} days so the review can tell whether to change your target.`);
        } else if (avgKcal > t.calories + 100) {
          status = "over-target";
          headline = `Weight has been steady for two weeks while you averaged ${fmt(avgKcal)} kcal, ${fmt(avgKcal - t.calories)} above your target.`;
          notes.push("Getting closer to your current target is the first step. Changing it wouldn't help yet.");
        } else {
          status = "stalled";
          headline = `Weight has been steady for two weeks at an average of ${fmt(avgKcal)} kcal a day.`;
          if (!recentlyAdjusted) {
            const next = Math.max(floor, t.calories - STEP_KCAL);
            if (next < t.calories) {
              adjustment = {
                text: `Lower your target to ${fmt(next)} kcal`,
                reason: `Your needs may be lower than estimated, or have fallen as you've lost weight. A small change of ${fmt(t.calories - next)} kcal is enough. Adding about 2,000 steps a day instead would have a similar effect.`,
                change: { calories: next },
              };
            } else {
              notes.push("Your target is already at the minimum this app suggests. Add steps or activity rather than eating less, and consider speaking to your GP or a registered dietitian.");
            }
          }
        }
      } else {
        status = "flat-week";
        headline = "Weight was steady this week. One flat week is normal, often water. Keep going.";
      }
    } else if (p.goal === "build-muscle") {
      if (pct7 >= 0.5) {
        status = "too-fast";
        headline = `You gained ${kg(change7!)} this week, faster than muscle can be built.`;
        if (!recentlyAdjusted) adjustment = { text: `Lower your target to ${fmt(t.calories - STEP_KCAL)} kcal`, reason: "Gaining more than about 0.5% of body weight a week is mostly fat.", change: { calories: t.calories - STEP_KCAL } };
      } else if (pct14 !== null && pct14 <= 0 && enoughForTarget && avgKcal >= t.calories - 100) {
        status = "stalled";
        headline = "No weight gain for two weeks.";
        if (!recentlyAdjusted) adjustment = { text: `Raise your target to ${fmt(t.calories + STEP_KCAL)} kcal`, reason: "Building muscle needs a small, steady surplus.", change: { calories: t.calories + STEP_KCAL } };
      } else {
        status = "on-track";
        headline = "Steady progress this week.";
      }
    } else {
      if (change14 !== null && Math.abs(change14) > 1 && enoughForTarget) {
        status = change14 > 0 ? "gaining" : "too-fast";
        headline = `Weight has moved ${change14 > 0 ? "up" : "down"} ${kg(change14)} in two weeks.`;
        if (!recentlyAdjusted) {
          const delta = change14 > 0 ? -100 : 100;
          adjustment = { text: `${delta < 0 ? "Lower" : "Raise"} your target to ${fmt(t.calories + delta)} kcal`, reason: "A small change keeps your weight steady.", change: { calories: Math.max(floor, t.calories + delta) } };
        }
      } else {
        status = "on-track";
        headline = "Weight steady, as planned.";
      }
    }
  } else {
    headline = activeDays >= 5 ? `Active on ${activeDays} of seven days.` : `A week to build on: active on ${activeDays} of seven days.`;
  }
  if (recentlyAdjusted && !adjustment && (status === "stalled" || status === "too-fast")) {
    notes.push("You changed your target recently. Give it two weeks before changing it again.");
  }

  /* ---------- Do more of ---------- */
  if (!enoughFood) add(moreOf, { id: "log-food", priority: 70, text: `Log food on at least ${MIN_FOOD_DAYS} days`, detail: `You logged ${foodDays.length} ${foodDays.length === 1 ? "day" : "days"}. More days give a fairer picture and better advice.` });
  if (enoughFood && avgProtein < t.proteinG * 0.9) {
    const short = breakfastProtein !== null && breakfastProtein < 20;
    add(moreOf, {
      id: "protein",
      goals: ["protein"],
      priority: losing || p.goal === "build-muscle" ? 65 : 45,
      text: `Protein: averaged ${fmt(avgProtein)} g against ${t.proteinG} g`,
      detail: short
        ? `Breakfast averaged only ${fmt(breakfastProtein!)} g. Greek yoghurt, eggs, cottage cheese or a protein shake would add 15 to 25 g.`
        : "Include a protein source at every meal: lean meat, fish, eggs, dairy, tofu, beans or lentils.",
    });
  }
  if (enoughFood && avgFibre < Math.min(25, t.fibreG * 0.85)) {
    add(moreOf, {
      id: "fibre",
      goals: ["fibre", "cholesterol"],
      priority: 40,
      text: `Fibre: averaged ${fmt(avgFibre)} g against ${t.fibreG} g`,
      detail: focus.has("cholesterol")
        ? "Oats, barley, beans and lentils contain soluble fibre, which can help lower cholesterol. Porridge for breakfast and a tin of beans or lentils in the week are easy wins."
        : "Swap to wholemeal bread and pasta, add beans or lentils to meals, and keep the skins on potatoes.",
    });
  }
  if (enoughFood && avgFiveADay < 4) {
    add(moreOf, { id: "fruit-veg", goals: ["fruit-veg", "cholesterol"], priority: 35, text: `Fruit and veg: averaged ${round(avgFiveADay, 1)} portions a day`, detail: "Aim for five 80 g portions. A handful of berries with breakfast and two vegetables with dinner gets you most of the way." });
  }
  if (avgSteps !== null && avgSteps < t.steps * 0.9) {
    const gap = Math.min(2000, Math.round((t.steps - avgSteps) / 250) * 250);
    add(moreOf, { id: "steps", priority: losing ? 50 : 40, text: `Steps: averaged ${fmt(avgSteps)} against ${fmt(t.steps)}`, detail: `Add about ${fmt(gap)} a day. A 15-minute walk is roughly 1,500 steps.` });
  }
  if (activeDays < 5) add(moreOf, { id: "active-days", priority: 55, text: `Active days: ${activeDays} of seven`, detail: "Light or recovery mode counts. Aim for one more day next week." });
  if ((losing || p.goal === "build-muscle" || p.goal === "strength") && strengthSessions === 0) {
    add(moreOf, { id: "strength", priority: 40, text: "Strength training: none logged this week", detail: "Two sessions a week of weights or bodyweight exercises help you keep muscle while losing fat. The UK guidelines recommend muscle-strengthening activity on at least two days a week." });
  }
  if (avgWater < t.waterMl * 0.7) add(moreOf, { id: "water", priority: 15, text: `Water: averaged ${round(avgWater / 1000, 1)} L a day`, detail: "Keep a glass or bottle within reach and log it as you go." });
  if (focus.has("cholesterol") && enoughFood) {
    add(moreOf, { id: "unsaturated", goals: ["cholesterol"], priority: 20, text: "Unsaturated fats in place of saturated", detail: "Cook with olive or rapeseed oil instead of butter, snack on unsalted nuts, and have oily fish such as salmon or mackerel twice a week." });
  }

  /* ---------- Do less of ---------- */
  // Only when weight isn't coming off. Over target while losing steadily means the estimate was low, not a problem.
  if (losing && enoughFood && avgKcal > t.calories * 1.05 && status !== "on-track" && status !== "too-fast") {
    const top = topContributors(state, foodDays, "kcal");
    add(lessOf, { id: "calories", priority: 55, text: `Calories: averaged ${fmt(avgKcal)} against ${fmt(t.calories)}`, detail: top.length ? `Most came from ${list(top)}. Smaller portions of one of these would close most of the gap.` : undefined });
  }
  if (weekend.length >= 1 && weekday.length >= 3 && mean(weekend) > mean(weekday) + 300) {
    add(lessOf, { id: "weekend", priority: 45, text: `Weekend eating: ${fmt(mean(weekend) - mean(weekday))} kcal a day more than weekdays`, detail: "Plan one weekend meal in advance and keep the rest close to your weekday pattern." });
  }
  if (avgSat !== null && avgSat > limits.satFatG) {
    const top = topContributors(state, foodDays, "satFat");
    add(lessOf, {
      id: "sat-fat",
      goals: ["cholesterol"],
      priority: 40,
      text: `Saturated fat: averaged ${fmt(avgSat)} g against a ${limits.satFatG} g limit`,
      detail: `${top.length ? `Mostly from ${list(top)}. ` : ""}Swap to lean meat, reduced-fat dairy and olive oil, and keep cheese, butter, processed meat and pastries for occasional use.`,
    });
  }
  if (avgSugars !== null && avgSugars > limits.sugarsG) {
    const top = topContributors(state, foodDays, "sugars");
    add(lessOf, { id: "sugars", goals: ["sugar"], priority: 35, text: `Sugars: averaged ${fmt(avgSugars)} g against a ${limits.sugarsG} g limit`, detail: `${top.length ? `Mostly from ${list(top)}. ` : ""}Sugary drinks, sweets and biscuits are the easiest to cut. Whole fruit is fine.` });
  }
  if (avgSalt !== null && avgSalt > limits.saltG) {
    const top = topContributors(state, foodDays, "salt");
    add(lessOf, { id: "salt", goals: ["salt"], priority: 30, text: `Salt: averaged ${round(avgSalt, 1)} g against a ${limits.saltG} g limit`, detail: `${top.length ? `Mostly from ${list(top)}. ` : ""}Processed meat, cheese, bread and ready meals add up. Check labels for the red traffic light.` });
  }
  if (units > ALCOHOL_UNITS_PER_WEEK || (focus.has("alcohol") && units > 0 && drinkDays > 3)) {
    add(lessOf, {
      id: "alcohol",
      goals: ["alcohol"],
      priority: units > ALCOHOL_UNITS_PER_WEEK ? 50 : 30,
      text: `Alcohol: ${round(units, 1)} units over ${drinkDays} ${drinkDays === 1 ? "day" : "days"}`,
      detail: `The UK guideline is no more than ${ALCOHOL_UNITS_PER_WEEK} units a week, spread over three or more days, with several drink-free days.${losing ? " Drinks are also easy calories to cut." : ""}`,
    });
  }

  /* ---------- Wins ---------- */
  if (status === "on-track" && losing) wins.push("Weight trending down at a steady rate.");
  if (activeDays >= 5) wins.push(`Active on ${activeDays} of seven days.`);
  if (enoughFood && avgProtein >= t.proteinG * 0.9) wins.push("Protein target met on average.");
  if (avgSteps !== null && avgSteps >= t.steps) wins.push(`Averaged ${fmt(avgSteps)} steps a day.`);
  if (enoughFood && avgFibre >= t.fibreG * 0.9) wins.push("Good fibre intake.");
  if (avgSat !== null && avgSat <= limits.satFatG && focus.has("cholesterol")) wins.push("Saturated fat within your limit.");
  if (foodDays.length >= 6) wins.push("Food logged on almost every day.");

  const order = (xs: ReviewPoint[]) => xs.sort((a, b) => b.priority - a.priority).slice(0, 3);
  return {
    start,
    end,
    headline: headline || `Week of ${formatDay(start, { day: "numeric", month: "short" })}`,
    status,
    wins: wins.slice(0, 3),
    moreOf: order(moreOf),
    lessOf: order(lessOf),
    adjustment,
    notes,
    foodCoverage: { logged: loggedDays.length, estimated: estimatedDays.length, missing: days.length - foodDays.length },
  };
}
