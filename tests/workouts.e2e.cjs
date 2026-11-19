// Ready-made workouts, exercise suggestions and building your own.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 36, sex: "male", heightCm: 177, startWeightKg: 86, targetWeightKg: 80, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 144, carbsG: 169, fatG: 60, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  await p.getByRole("button", { name: "Log workout" }).click();
  ok("ready-made shown first", (await p.getByText("Full body, no equipment").count()) === 1);
  await p.getByRole("button", { name: "Dumbbells", exact: true }).click();
  ok("filter by equipment", (await p.getByText("Gym full body A").count()) === 0 && (await p.getByText("Upper body, dumbbells").count()) === 1);
  await p.screenshot({ path: OUT + "/workouts-readymade.png" });
  await p.getByText("Full body, dumbbells").click();
  ok("exercises filled", (await p.getByRole("textbox", { name: "Exercise name" }).count()) === 5);
  await p.getByRole("spinbutton", { name: "Set 1 weight" }).first().fill("16");
  await p.getByText(/how to/).first().click();
  ok("how-to with drawing", (await p.getByRole("img", { name: /Demonstration of goblet squat/i }).count()) === 1);
  await p.getByRole("button", { name: "Exercise", exact: true }).click();
  await p.getByRole("textbox", { name: "Exercise name" }).last().fill("lat");
  await p.getByRole("option", { name: /Lat pulldown/ }).click();
  ok("suggestion picked", (await p.getByRole("textbox", { name: "Exercise name" }).last().inputValue()) === "Lat pulldown");
  await p.screenshot({ path: OUT + "/workouts-form.png", fullPage: true });
  await p.getByRole("checkbox").last().click();
  await p.getByRole("button", { name: "Save workout" }).click();
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  ok("logged and saved as template", st.workouts.length === 1 && st.workouts[0].exercises.length === 6 && st.workouts[0].exercises[0].sets[0].weightKg === 16 && st.templates.length === 1);

  // Build a workout without logging it.
  await p.getByRole("button", { name: "Build" }).click();
  await p.getByPlaceholder("e.g. Upper body, Parkrun").fill("Garage kettlebell");
  await p.getByRole("textbox", { name: "Exercise name" }).fill("kettlebell sw");
  await p.getByRole("option", { name: /Kettlebell swing/ }).click();
  await p.getByRole("button", { name: "Save to My workouts" }).click();
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  ok("built workout saved, not logged", st.templates.length === 2 && st.workouts.length === 1 && st.templates[1].name === "Garage kettlebell");
  ok("listed under My workouts", (await p.getByText("Garage kettlebell").count()) === 1);
  // Guided session from a ready-made workout.
  await p.getByRole("button", { name: "Ready-made", exact: true }).click();
  await p.getByRole("button", { name: "Dumbbells", exact: true }).click();
  await p.locator("li", { hasText: "Lower body, dumbbells" }).getByRole("button", { name: "Start" }).click();
  ok("guided set shown", (await p.getByRole("heading", { name: "Goblet squat" }).count()) === 1);
  await p.getByRole("spinbutton", { name: "Weight (kg)" }).fill("16");
  await p.getByRole("button", { name: "Done set" }).click();
  ok("rest timer starts", (await p.getByText("Rest", { exact: true }).count()) === 1);
  await p.screenshot({ path: OUT + "/gym-rest.png" });
  await p.getByRole("button", { name: "Skip" }).click();
  ok("weight carried to next set", (await p.getByRole("spinbutton", { name: "Weight (kg)" }).inputValue()) === "16");
  await p.screenshot({ path: OUT + "/gym-set.png" });
  await p.getByRole("button", { name: "Done set" }).click();
  await p.getByRole("button", { name: "Skip" }).click();
  await p.getByRole("button", { name: "Finish early" }).click();
  await p.getByRole("button", { name: "Save workout" }).click();
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  const gw = st.workouts.find((w) => w.name === "Lower body, dumbbells");
  ok("guided session logged with done sets only", !!gw && gw.exercises.length === 1 && gw.exercises[0].sets.length === 2 && gw.exercises[0].sets[0].weightKg === 16);
  // Next time: last time shown and a heavier weight suggested.
  await p.locator("li", { hasText: "Lower body, dumbbells" }).getByRole("button", { name: "Start" }).click();
  ok("last time and progression shown", (await p.getByText(/Last time: 2 × 10 at 16 kg/).count()) === 1 && (await p.getByRole("spinbutton", { name: "Weight (kg)" }).inputValue()) === "18");
  await p.getByRole("button", { name: "Close" }).click();

  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
