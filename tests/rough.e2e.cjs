// Missed days: the Home prompt for yesterday, the Nutrition estimate card, and 'high in' tags for focus areas.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const today = key(now);
const ago = (n) => key(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
const seed = { version: 1,
  foods: [
    { id: "a", date: ago(2), meal: "lunch", name: "Sausage roll", portion: "1", kcal: 320, protein: 8, carbs: 24, fat: 21, fibre: 1, satFat: 8.2, estimated: true,
      source: { name: "Sausage roll", per: 100, baseUnit: "g", units: [], unitIdx: -1, qty: 90, estimated: true, base: { kcal: 356, protein: 9, carbs: 27, fat: 23, fibre: 1, satFat: 9.1 } } },
    { id: "b", date: today, meal: "breakfast", name: "Porridge", portion: "1 bowl", kcal: 224, protein: 8, carbs: 30, fat: 8, fibre: 3, estimated: true },
  ],
  profile: { name: "Tom", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", focus: ["cholesterol"], targetsCustomised: false,
    targets: { calories: 2000, proteinG: 144, carbsG: 200, fatG: 66, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.goto(BASE);
  await p.getByText("Yesterday wasn't logged").waitFor();
  ok("Home asks about yesterday", true);
  await p.screenshot({ path: OUT + "/r1-home-prompt.png" });
  await p.getByRole("button", { name: "Heavier than usual" }).first().click();
  await p.waitForTimeout(300);
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  const y = st.foods.filter((f) => f.rough === "heavier");
  ok("heavier day estimated at 120% of target across meals", y.length === 4 && y.reduce((a, f) => a + f.kcal, 0) === 2400);
  ok("prompt goes away once answered", (await p.getByText("Yesterday wasn't logged").count()) === 0);
  // Nutrition, two days ago: the sausage roll is tagged for the cholesterol focus.
  await p.getByRole("button", { name: "Nutrition" }).click();
  // Today has breakfast only: after 6pm it offers the rest of the day.
  await p.getByRole("button", { name: "Previous day" }).click();
  await p.getByRole("button", { name: "Previous day" }).click();
  await p.waitForTimeout(300);
  ok("high sat fat tag shown for the cholesterol focus", (await p.getByText("high sat fat").count()) >= 1);
  await p.screenshot({ path: OUT + "/r2-tag.png", fullPage: true });
  console.log(R.join("\n"));
  console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})();
