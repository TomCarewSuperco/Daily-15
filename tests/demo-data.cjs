// Six weeks of realistic DAILY 15 data ending today, for store screenshots and the App Review demo account.
// Usage: node tests/demo-data.cjs > demo.json   (then Profile, Restore in the app)
const DEFAULT_ROUTINE = ["march", "squat", "pushup", "bridge", "plank", "knees", "stretch"];
let seed = 15;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return key(d); };
let id = 0;
const uid = () => `demo${++id}`;

function build({ includeToday = true } = {}) {
  const today = daysAgo(0);
  const s = {
    version: 1,
    profile: {
      name: "Alex", age: 41, sex: "male", heightCm: 180, startWeightKg: 94.2, targetWeightKg: 86, experience: "intermediate",
      activityLevel: "light", goal: "lose-fat", focus: ["cholesterol"], anchor: { id: "coffee", text: "after my morning coffee", time: "07:30" }, targetsCustomised: false,
      targets: { calories: 2050, proteinG: 155, carbsG: 206, fatG: 68, fibreG: 30, waterMl: 2750, steps: 8000, activeMinutes: 30 },
    },
    routine: undefined, routineLogs: {}, restDays: [], workouts: [], templates: [], foods: [], savedMeals: [], water: {}, activity: {},
    weights: [], measurements: [], photos: [], reminders: undefined,
  };
  for (let n = 42; n >= 0; n--) {
    const d = daysAgo(n);
    const isToday = n === 0;
    // Routine: done most days, a planned rest day each week.
    if (n % 7 === 3) s.restDays.push(d);
    else if (!isToday && rand() > 0.1) s.routineLogs[d] = { date: d, mode: rand() > 0.85 ? "light" : "standard", completedIds: DEFAULT_ROUTINE, finished: true };
    // Steps rise over the six weeks.
    const steps = Math.round(5200 + (42 - n) * 75 + rand() * 3500);
    const st = isToday ? 6840 : steps;
    s.activity[d] = { date: d, steps: st, distanceKm: Math.round(st * 0.00078 * 10) / 10, activeMinutes: Math.round(st / 230), activityKcal: Math.round(st * 0.04) };
    // Weigh-ins three or four times a week, trending down about 0.6 kg a week with daily noise.
    if (n % 2 === 0 || n % 7 === 1) s.weights.push({ id: uid(), date: d, kg: Math.round((94.2 - (42 - n) * 0.085 + (rand() - 0.5) * 1.1) * 10) / 10 });
    s.water[d] = isToday ? 1250 : 1750 + Math.round(rand() * 4) * 250;
    if (!isToday && rand() > 0.15) {
      const kcal = 1850 + Math.round(rand() * 400);
      const protein = 120 + Math.round(rand() * 45);
      s.foods.push({ id: uid(), date: d, meal: "dinner", name: "Logged meals", portion: "Day total", kcal, protein, carbs: Math.round((kcal * 0.42) / 4), fat: Math.round((kcal * 0.3) / 9), fibre: 21 + Math.round(rand() * 6), satFat: 22 + Math.round(rand() * 14), sugars: 55 + Math.round(rand() * 40), salt: Math.round((4.5 + rand() * 2.5) * 10) / 10, fiveADay: 3 + Math.round(rand() * 2), fiveADayKind: "fv", estimated: false });
      const dow = new Date(`${d}T12:00:00`).getDay();
      if (dow === 5 || dow === 6) s.foods.push({ id: uid(), date: d, meal: "dinner", name: "Red wine", portion: "2 medium glasses (350 ml)", kcal: 298, protein: 0.4, carbs: 9.1, fat: 0, fibre: 0, satFat: 0, sugars: 2.1, salt: 0, alcoholUnits: 4.6, estimated: true });
    }
  }
  // Two strength sessions and a run each week.
  for (let w = 0; w < 6; w++) {
    const prog = w * 2.5;
    s.workouts.push({ id: uid(), date: daysAgo(40 - w * 7), category: "Weight training", name: "Upper body", durationMin: 45, intensity: "moderate", restSec: 90, exercises: [
      { name: "Bench press", sets: [{ reps: 8, weightKg: 60 + prog }, { reps: 8, weightKg: 60 + prog }, { reps: 6, weightKg: 62.5 + prog }] },
      { name: "Bent-over row", sets: [{ reps: 10, weightKg: 50 + prog }, { reps: 10, weightKg: 50 + prog }] },
    ] });
    s.workouts.push({ id: uid(), date: daysAgo(38 - w * 7), category: "Weight training", name: "Lower body", durationMin: 50, intensity: "intense", restSec: 120, exercises: [
      { name: "Back squat", sets: [{ reps: 6, weightKg: 80 + prog * 2 }, { reps: 6, weightKg: 80 + prog * 2 }, { reps: 5, weightKg: 85 + prog * 2 }] },
      { name: "Romanian deadlift", sets: [{ reps: 8, weightKg: 70 + prog }, { reps: 8, weightKg: 70 + prog }] },
    ] });
    if (36 - w * 7 >= 1) s.workouts.push({ id: uid(), date: daysAgo(36 - w * 7), category: "Running", name: "Parkrun", durationMin: Math.round(31 - w * 0.6), intensity: "moderate", distanceKm: 5, exercises: [] });
  }
  s.templates.push({ id: uid(), name: "Upper body", category: "Weight training", intensity: "moderate", exercises: [{ name: "Bench press", sets: [{ reps: 8, weightKg: 72.5 }] }, { name: "Bent-over row", sets: [{ reps: 10, weightKg: 62.5 }] }] });
  // Today's food diary.
  const t = (meal, name, portion, kcal, protein, carbs, fat, fibre, satFat, sugars, salt, fv, estimated = true) => s.foods.push({ id: uid(), date: today, meal, name, portion, kcal, protein, carbs, fat, fibre, satFat, sugars, salt, ...(fv ? { fiveADay: fv, fiveADayKind: "fv" } : {}), estimated });
  t("breakfast", "Porridge oats, dry", "1 bowl (50 g)", 188, 5.5, 30, 4, 4.5, 0.8, 0.5, 0, 0);
  t("breakfast", "Semi-skimmed milk", "1 glass (200 ml)", 94, 7, 9.6, 3.4, 0, 2.2, 9.6, 0.2, 0);
  t("breakfast", "Blueberries", "1 handful (80 g)", 46, 0.6, 11.2, 0.2, 1.9, 0, 8, 0, 1);
  t("lunch", "Chicken breast, cooked", "1 breast (150 g)", 248, 46.5, 0, 5.4, 0, 1.5, 0, 0.3, 0);
  t("lunch", "Brown rice, cooked", "1 portion (180 g)", 221, 4.9, 46.8, 1.8, 2.9, 0.4, 0.5, 0, 0);
  t("lunch", "Broccoli", "1 portion (80 g)", 27, 2.2, 5.6, 0.3, 2.1, 0.1, 1.4, 0, 1);
  t("snacks", "Greek yoghurt, 0% fat", "1 pot (150 g)", 86, 15, 5.4, 0.3, 0, 0.2, 5.4, 0.2, 0, false);
  s.savedMeals.push({ id: uid(), name: "Chicken, rice and broccoli", portion: "1 meal", kcal: 496, protein: 53.6, carbs: 52.4, fat: 7.5, fibre: 5 });
  s.measurements.push({ id: uid(), date: daysAgo(42), waistCm: 102, chestCm: 108, hipsCm: 106 });
  s.measurements.push({ id: uid(), date: daysAgo(14), waistCm: 99, chestCm: 107, hipsCm: 104.5 });
  s.measurements.push({ id: uid(), date: daysAgo(0), waistCm: 97.5, chestCm: 106, hipsCm: 103.5 });
  if (!includeToday) delete s.routineLogs[today];
  return s;
}

module.exports = { build };
if (require.main === module) {
  const s = build();
  // Fill defaults the app would supply.
  delete s.routine; delete s.reminders;
  process.stdout.write(JSON.stringify(s, null, 2));
}
