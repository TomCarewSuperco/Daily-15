// 'Not today': a rest day without guilt; the reason isn't saved; two a week.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 40, sex: "female", heightCm: 168, startWeightKg: 70, targetWeightKg: 65, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 1800, proteinG: 120, carbsG: 200, fatG: 60, fibreG: 30, waterMl: 2000, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  await p.getByRole("button", { name: "Not today" }).click();
  await p.getByRole("radio", { name: "On my period" }).click();
  ok("a kind note for the reason", (await p.getByText(/Gentle movement eases cramps/).count()) === 1);
  ok("allowance shown", (await p.getByText("Rest days this week: 0 of 2.").count()) === 1);
  await p.screenshot({ path: OUT + "/not-today.png" });
  await p.getByRole("button", { name: "Take today off" }).click();
  const raw = await p.evaluate(() => localStorage.getItem("daily15:v1"));
  const st = JSON.parse(raw);
  ok("today is a rest day", st.restDays.length === 1 && !(st.sickDays ?? []).length);
  ok("the reason isn't saved", !/period/i.test(raw));
  ok("resting shown with undo", (await p.getByText(/Resting today/).count()) === 1);
  await p.getByRole("button", { name: "Undo" }).click();
  ok("undo clears it", (await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).restDays.length)) === 0);
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 300)); process.exit(1); });
