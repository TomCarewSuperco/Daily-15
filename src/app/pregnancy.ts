import { addDays, alcoholUnits, FIVE_A_DAY, fiveADayOn, foodsOn, formatDay, lastNDays, sumNutrients, todayKey } from "./calc";
import type { AppState, FoodEntry, Profile } from "./types";

/*
 * Pregnancy and breastfeeding mode.
 *
 * PREVIEW. Every rule, figure and line of wording in this file was written from
 * general knowledge of NHS guidance. It has NOT been checked against the NHS
 * pages or by a midwife or registered dietitian. Before App Store release:
 *   1. Check each item against the NHS pages linked in NHS_LINKS.
 *   2. Have a midwife or registered dietitian review the file.
 *   3. Get a regulatory view on whether the mode makes the app a medical device.
 * Until then the mode is labelled 'Preview' in the app.
 *
 * Principles: no calorie or macro targets and no weight-loss advice; show
 * general guidance, track a few things the app can measure (supplements,
 * caffeine, alcohol, foods to avoid, fruit and veg), and refer to the midwife.
 */

export const PREGNANCY_MODE_ENABLED = true;

export type LifeStageKind = "pregnant" | "breastfeeding";
export interface LifeStage {
  kind: LifeStageKind;
  /** Pregnancy only. */
  dueDate?: string;
}

export function lifeStageOf(p: Profile | null | undefined): LifeStage | null {
  return PREGNANCY_MODE_ENABLED && p?.lifeStage ? p.lifeStage : null;
}

/** Week of pregnancy from the due date (40 weeks). Null without a due date. */
export function pregnancyWeek(dueDate: string | undefined, today = todayKey()): number | null {
  if (!dueDate) return null;
  const days = (new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000;
  return Math.max(1, Math.min(42, Math.floor(40 - days / 7)));
}

export function trimester(week: number | null): 1 | 2 | 3 | null {
  if (week === null) return null;
  return week <= 13 ? 1 : week <= 27 ? 2 : 3;
}

export const NHS_LINKS = {
  pregnantDiet: "https://www.nhs.uk/pregnancy/keeping-well/have-a-healthy-diet/",
  foodsToAvoid: "https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/",
  supplements: "https://www.nhs.uk/pregnancy/keeping-well/vitamins-supplements-and-nutrition/",
  exercise: "https://www.nhs.uk/pregnancy/keeping-well/exercise/",
  breastfeedingDiet: "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding/diet/",
};

/* ---------- Supplements ---------- */

export type SupplementId = "folic-acid" | "vitamin-d";

export interface Supplement {
  id: SupplementId;
  label: string;
  detail: string;
}

export function supplementsFor(stage: LifeStage): Supplement[] {
  const vitD: Supplement = { id: "vitamin-d", label: "Vitamin D", detail: "10 micrograms a day." };
  if (stage.kind === "breastfeeding") return [vitD];
  const week = pregnancyWeek(stage.dueDate);
  const folic: Supplement = { id: "folic-acid", label: "Folic acid", detail: "400 micrograms a day until 12 weeks, unless your doctor advised a higher dose." };
  return week === null || week <= 12 ? [folic, vitD] : [vitD];
}

/* ---------- Caffeine ---------- */

export const CAFFEINE_LIMIT_MG = 200;

/* ---------- Foods to avoid or limit ---------- */

export type FlagLevel = "avoid" | "limit";
export interface FoodFlag {
  level: FlagLevel;
  text: string;
}

interface Rule {
  stages: LifeStageKind[];
  match: RegExp;
  unless?: RegExp;
  level: FlagLevel;
  text: string;
}

const RULES: Rule[] = [
  { stages: ["pregnant"], match: /\bliver\b|p[aâ]t[eé]/i, unless: /cod liver oil/i, level: "avoid", text: "Liver and pâté: avoid in pregnancy. Liver is high in vitamin A, and pâté can carry listeria." },
  { stages: ["pregnant", "breastfeeding"], match: /cod liver oil|fish liver oil|vitamin a supplement/i, level: "avoid", text: "Fish liver oil and vitamin A supplements: avoid in pregnancy unless your doctor advises otherwise." },
  { stages: ["pregnant"], match: /swordfish|marlin|\bshark\b/i, level: "avoid", text: "Shark, swordfish and marlin: avoid in pregnancy because of mercury." },
  { stages: ["breastfeeding"], match: /swordfish|marlin|\bshark\b/i, level: "limit", text: "Shark, swordfish and marlin: no more than one portion a week while breastfeeding." },
  { stages: ["pregnant"], match: /\bbrie\b|camembert|blue cheese|stilton|gorgonzola|roquefort|danish blue|unpasteuri[sz]ed|goat'?s cheese|chèvre|chevre/i, level: "avoid", text: "Mould-ripened, blue and unpasteurised soft cheeses: avoid unless cooked until steaming hot." },
  { stages: ["pregnant"], match: /\braw\b|\brare\b|carpaccio|steak tartare|tartare/i, level: "avoid", text: "Raw or undercooked meat and fish: cook until steaming hot with no pink or blood." },
  { stages: ["pregnant"], match: /salami|chorizo|pepperoni|prosciutto|parma ham|serrano/i, level: "limit", text: "Cured meats such as salami and chorizo: safer cooked. Check the pack and ask your midwife." },
  { stages: ["pregnant"], match: /smoked salmon|gravlax|cold[- ]smoked|cured fish/i, level: "limit", text: "Cold-smoked or cured fish: safer cooked. Check current NHS advice with your midwife." },
];

export function flagsForFood(stage: LifeStage | null, food: { name: string; alcoholUnits?: number; abv?: number }): FoodFlag[] {
  if (!stage) return [];
  const flags: FoodFlag[] = RULES.filter((r) => r.stages.includes(stage.kind) && r.match.test(food.name) && !(r.unless && r.unless.test(food.name))).map((r) => ({ level: r.level, text: r.text }));
  if ((food.alcoholUnits ?? 0) > 0 || (food.abv ?? 0) > 0) {
    flags.push(
      stage.kind === "pregnant"
        ? { level: "avoid", text: "Alcohol: the NHS advises not drinking at all in pregnancy." }
        : { level: "limit", text: "Alcohol: if you drink while breastfeeding, keep it occasional and avoid feeding for a few hours afterwards. Ask your midwife or health visitor." },
    );
  }
  return flags;
}

/** Oily fish: no more than two portions a week in pregnancy and while breastfeeding. */
const OILY_FISH = /salmon|mackerel|sardine|pilchard|trout|herring|kipper|anchov/i;
export const OILY_FISH_PER_WEEK = 2;

export function oilyFishPortions(state: AppState, days: string[]): number {
  return state.foods.filter((f) => days.includes(f.date) && OILY_FISH.test(f.name)).length;
}

/* ---------- Exercise ---------- */

/** Exercises done lying on the back. The NHS advises against lying flat on your back for long periods after about 16 weeks. */
const SUPINE = new Set(["glute bridges", "single-leg glute bridges", "glute bridge march", "dead bug", "hollow hold", "reverse crunches", "bicycle crunches"]);
export const SUPINE_FROM_WEEK = 16;

export function exerciseWarning(stage: LifeStage | null, exerciseName: string): string | null {
  if (stage?.kind !== "pregnant") return null;
  if (!SUPINE.has(exerciseName.trim().toLowerCase())) return null;
  const week = pregnancyWeek(stage.dueDate);
  if (week !== null && week < SUPINE_FROM_WEEK) return null;
  return "From around 16 weeks, avoid exercises lying flat on your back. Swap this for chair sit-to-stand or step-ups.";
}

/* ---------- Guidance text ---------- */

export interface GuidanceSection {
  title: string;
  points: string[];
}

export function guidanceFor(stage: LifeStage): GuidanceSection[] {
  if (stage.kind === "breastfeeding") {
    return [
      { title: "Eat well", points: ["A varied diet with plenty of fruit and vegetables, starchy foods, protein and dairy.", "You may feel hungrier. Eat to appetite. This isn't the time for a strict calorie target.", "Drink plenty of water, especially while feeding."] },
      { title: "Supplements", points: ["Vitamin D, 10 micrograms a day."] },
      { title: "Limit", points: [`Caffeine: keep under about ${CAFFEINE_LIMIT_MG} mg a day.`, `Oily fish: no more than ${OILY_FISH_PER_WEEK} portions a week.`, "Shark, swordfish and marlin: no more than one portion a week.", "Alcohol: occasional at most, and avoid feeding for a few hours after drinking."] },
    ];
  }
  const tri = trimester(pregnancyWeek(stage.dueDate));
  return [
    {
      title: "Eat well",
      points: [
        "A varied diet with plenty of fruit and vegetables, starchy foods, protein and dairy.",
        tri === 3 ? "In the last three months you may need around 200 extra kcal a day." : "You don't need extra calories for the first six months. Around 200 extra a day may be needed in the last three.",
        "Iron: lean red meat, beans, lentils, dark green vegetables, dried fruit and fortified cereals. Only take iron tablets if your midwife or GP advises.",
        "Weight gain varies a lot in pregnancy. Your midwife will advise. Don't diet to lose weight.",
      ],
    },
    { title: "Supplements", points: ["Folic acid, 400 micrograms a day, until 12 weeks.", "Vitamin D, 10 micrograms a day.", "Avoid vitamin A supplements and fish liver oil unless advised."] },
    {
      title: "Avoid",
      points: [
        "Alcohol.",
        "Liver and pâté.",
        "Mould-ripened, blue and unpasteurised soft cheeses, unless cooked until steaming hot.",
        "Raw or undercooked meat. Eggs that aren't British Lion stamped unless fully cooked.",
        "Shark, swordfish and marlin.",
      ],
    },
    { title: "Limit", points: [`Caffeine: under ${CAFFEINE_LIMIT_MG} mg a day. Roughly a mug of instant coffee is 100 mg and a mug of tea 75 mg.`, `Oily fish: no more than ${OILY_FISH_PER_WEEK} portions a week.`] },
    { title: "Exercise", points: ["Keep active if you can. Talk to your midwife about what's right for you.", "From around 16 weeks, avoid exercises lying flat on your back.", "Avoid contact sports and activities with a risk of falling."] },
  ];
}

/* ---------- Day summary ---------- */

export function caffeineOn(state: AppState, date: string): number {
  return Math.round(foodsOn(state, date).reduce((s, f) => s + (f.caffeineMg ?? 0), 0));
}

export function supplementsTaken(state: AppState, date: string): string[] {
  return state.supplements?.[date] ?? [];
}

/* ---------- Weekly review for pregnancy and breastfeeding ---------- */

export interface PregnancyReview {
  start: string;
  end: string;
  headline: string;
  wins: string[];
  watch: string[];
  ideas: string[];
}

export function pregnancyReview(state: AppState, end = addDays(todayKey(), -1)): PregnancyReview {
  const stage = lifeStageOf(state.profile)!;
  const days = lastNDays(7, end);
  const week = pregnancyWeek(stage.dueDate, end);
  const supps = supplementsFor(stage);
  const wins: string[] = [];
  const watch: string[] = [];
  const ideas: string[] = [];

  for (const s of supps) {
    const taken = days.filter((d) => supplementsTaken(state, d).includes(s.id)).length;
    if (taken >= 6) wins.push(`${s.label} taken on ${taken} of seven days.`);
    else ideas.push(`${s.label}: logged on ${taken} of seven days. Taking it at the same time each day, such as with breakfast, makes it easier to remember.`);
  }

  const overCaffeine = days.filter((d) => caffeineOn(state, d) > CAFFEINE_LIMIT_MG);
  if (overCaffeine.length) watch.push(`Caffeine over ${CAFFEINE_LIMIT_MG} mg on ${overCaffeine.map((d) => formatDay(d, { weekday: "long" })).join(", ")}. Decaf or a smaller mug would bring it down.`);

  const units = alcoholUnits(state, days);
  if (units > 0) watch.push(stage.kind === "pregnant" ? `Alcohol logged this week (${units} units). The NHS advises not drinking in pregnancy.` : `Alcohol logged this week (${units} units). Keep it occasional while breastfeeding.`);

  const flagged = new Map<string, FoodEntry>();
  for (const d of days) for (const f of foodsOn(state, d)) if (flagsForFood(stage, f).some((x) => x.level === "avoid" && !(f.alcoholUnits ?? 0))) flagged.set(f.name, f);
  if (flagged.size) watch.push(`Logged foods usually avoided ${stage.kind === "pregnant" ? "in pregnancy" : "while breastfeeding"}: ${[...flagged.keys()].map((n) => n.toLowerCase()).join(", ")}. Check with your midwife if you're unsure.`);

  const fish = oilyFishPortions(state, days);
  if (fish > OILY_FISH_PER_WEEK) watch.push(`Oily fish: ${fish} portions this week, above the ${OILY_FISH_PER_WEEK} a week limit.`);
  else if (fish >= 1) wins.push(`Oily fish ${fish === 1 ? "once" : "twice"} this week.`);
  else ideas.push("Oily fish such as salmon or sardines once or twice a week is a good source of omega-3.");

  const foodDays = days.filter((d) => foodsOn(state, d).length);
  if (foodDays.length >= 4) {
    const fv = foodDays.reduce((s, d) => s + fiveADayOn(state, d), 0) / foodDays.length;
    if (fv >= FIVE_A_DAY) wins.push("Five a day on average.");
    else ideas.push(`Fruit and veg: averaged ${fv.toFixed(1)} portions a day. Aim for five.`);
    const fibre = foodDays.reduce((s, d) => s + sumNutrients(foodsOn(state, d)).fibre, 0) / foodDays.length;
    if (fibre < 25) ideas.push(`Fibre: averaged ${Math.round(fibre)} g. Wholegrains, fruit, vegetables and pulses help, and can ease constipation.`);
  } else {
    ideas.push("Log food on a few more days to get suggestions on fruit, vegetables and fibre.");
  }

  const active = days.filter((d) => state.routineLogs[d]?.finished || state.workouts.some((w) => w.date === d)).length;
  if (active >= 4) wins.push(`Active on ${active} of seven days.`);

  const headline =
    stage.kind === "pregnant"
      ? week !== null
        ? `Week ${week} of your pregnancy.`
        : "Your week in pregnancy mode."
      : "Your week while breastfeeding.";

  return { start: days[0], end, headline, wins, watch, ideas: ideas.slice(0, 3) };
}
