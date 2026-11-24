// Logging a swim from the steps card: it counts towards active minutes, not steps.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Progress", exact: true }).click();
  await p.getByRole("button", { name: /Swim, ride, class or sport/ }).click();
  const exercisesHidden = (await p.getByText("Exercises", { exact: true }).count()) === 0;
  await p.getByRole("radio", { name: "Light" }).click().catch(() => p.getByRole("button", { name: "Light", exact: true }).click());
  await p.screenshot({ path: OUT + "/activity-swim.png" });
  await p.getByRole("button", { name: /^(Save|Log workout|Save workout)/ }).last().click();
  await p.waitForTimeout(400);
  const w = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).workouts);
  const swim = w.length === 1 && w[0].category === "Swimming" && w[0].durationMin === 30 && w[0].intensity === "light" && w[0].exercises.length === 0;
  const minutes = await p.locator("div", { hasText: /^Active minutes$/ }).locator("xpath=following-sibling::div").first().textContent();
  console.log(exercisesHidden ? "PASS activity form has no exercise list" : "FAIL activity form has no exercise list");
  console.log(swim ? "PASS swim logged as a light 30-minute workout" : `FAIL swim logged as a light 30-minute workout ${JSON.stringify(w)}`);
  console.log(Number(minutes) >= 30 ? "PASS swim counts towards active minutes" : `FAIL swim counts towards active minutes (${minutes})`);
  console.log(errs.length ? `FAIL page errors ${errs}` : "PASS no page errors");
  if (!exercisesHidden || !swim || Number(minutes) < 30 || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 300)); process.exit(1); });
