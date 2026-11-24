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
  // Tapping a ready-made workout lists its exercises before starting.
  await p.getByRole("button", { name: /^Lower body, dumbbells/ }).click();
  const opened = p.locator("li", { hasText: "Lower body, dumbbells" });
  ok("ready-made workout opens to show its exercises", (await opened.getByText(/^1\. Goblet squat$/).count()) === 1 && (await opened.getByText(/\d × \d+/).count()) >= 3);
  await p.screenshot({ path: OUT + "/w-ready-open.png" });
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

  // Logging by hand: choosing an exercise copies last time's weights as the starting point.
  await p.getByRole("button", { name: "Log workout" }).click();
  await p.getByRole("button", { name: "Blank", exact: true }).click();
  await p.getByRole("textbox", { name: "Exercise name" }).first().fill("goblet");
  await p.getByRole("option", { name: /Goblet squat/ }).click();
  const carried = await p.getByRole("spinbutton", { name: "Set 1 weight" }).inputValue();
  ok("hand-logged exercise starts from last time's weight", carried === "16");
  await p.getByRole("button", { name: "Close" }).first().click();

  // A session interrupted mid-way (phone locks, app closes) can be resumed with its weights.
  await p.getByRole("button", { name: "Ready-made", exact: true }).click();
  await p.getByRole("button", { name: "All", exact: true }).click();
  await p.locator("li", { hasText: "Gym full body A" }).getByRole("button", { name: "Start" }).click();
  await p.getByRole("spinbutton", { name: "Weight (kg)" }).fill("50");
  await p.getByRole("button", { name: "Done set" }).click();
  // Rest after a heavy squat starts at 2.5 minutes; a change is remembered for that exercise.
  const restSelect = p.getByRole("combobox");
  ok("heavy lift rests 2.5 minutes", (await restSelect.inputValue()) === "150" && (await p.getByText(/Rest after back squat/).count()) === 1);
  await restSelect.selectOption("180");
  ok("rest change remembered for the exercise", await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:rest") || "{}")["back squat"] === 180));
  await p.reload();
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  await p.getByText(/Unfinished: Gym full body A/).first().waitFor({ timeout: 5000 }).catch(() => {});
  const offered = (await p.getByText(/Unfinished: Gym full body A/).count()) >= 1;
  await p.getByRole("button", { name: "Resume" }).click();
  await p.getByRole("button", { name: "Skip", exact: true }).click().catch(() => {});
  const resumedWeight = await p.getByRole("spinbutton", { name: "Weight (kg)" }).inputValue();
  ok("interrupted session offered on return", offered);
  ok("resumed session keeps its weights and progress", resumedWeight === "50" && (await p.getByText(/set 2 of 12/).count()) === 1);
  await p.getByRole("button", { name: "Finish early" }).click();
  await p.getByRole("button", { name: "Discard" }).click();
  await p.getByRole("button", { name: "Tap again to discard" }).click();
  ok("discarding clears the unfinished session", (await p.getByText(/^Unfinished:/).count()) === 0);

  // Moving to a new barbell exercise with no history keeps the weight on the bar.
  await p.getByRole("button", { name: "Ready-made", exact: true }).click();
  await p.locator("li", { hasText: "Gym full body A" }).getByRole("button", { name: "Start" }).click();
  await p.getByRole("spinbutton", { name: "Weight (kg)" }).fill("50");
  for (let i = 0; i < 3; i++) {
    await p.getByRole("button", { name: "Done set" }).click();
    await p.getByRole("button", { name: "Skip", exact: true }).click();
  }
  ok("next exercise starts from the weight just used", (await p.getByRole("spinbutton", { name: "Weight (kg)" }).inputValue()) === "50" && (await p.getByText(/^Bench press$/).count()) >= 1);
  // 'No rest' goes straight to the next set; the setting is on the set screen too.
  await p.getByRole("combobox", { name: "Rest after each set" }).selectOption("0");
  await p.getByRole("button", { name: "Done set" }).click();
  ok("no rest skips the timer", (await p.getByRole("button", { name: "Skip", exact: true }).count()) === 0 && (await p.getByText(/set 5 of 12/).count()) === 1);
  await p.getByRole("button", { name: "Finish early" }).click();
  await p.getByRole("button", { name: "Discard" }).click();
  await p.getByRole("button", { name: "Tap again to discard" }).click();

  // Finishing early: go back to the workout, or discard it without logging.
  const before = (await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).workouts.length));
  await p.getByRole("button", { name: "Ready-made", exact: true }).click();
  await p.getByRole("button", { name: "All", exact: true }).click();
  await p.locator("li", { hasText: "Core, no equipment" }).getByRole("button", { name: "Start" }).click();
  await p.getByRole("button", { name: "Done set" }).click();
  await p.getByRole("button", { name: "Finish early" }).click();
  const oneSet = (await p.getByText(/^1 set in/).count()) === 1;
  await p.getByRole("button", { name: "Back to workout" }).click();
  const back = (await p.getByRole("button", { name: "Finish early" }).count()) === 1 && (await p.getByText(/^1 set in/).count()) === 0;
  await p.getByRole("button", { name: "Finish early" }).click();
  await p.getByRole("button", { name: "Discard" }).click();
  await p.getByRole("button", { name: "Tap again to discard" }).click();
  const after = (await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).workouts.length));
  ok("finish screen says '1 set'", oneSet);
  ok("back to workout returns to the session", back);
  ok("discard closes without logging", after === before && (await p.getByText(/^1 set in/).count()) === 0);

  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
