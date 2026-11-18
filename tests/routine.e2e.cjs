// Guided routine with rounds, the 'how did it feel' screen and accepting a harder next session.
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
  ok("home shows estimated minutes", (await p.getByText(/12 exercises, about 1[3-7] minutes/).count()) === 1);
  await p.getByRole("button", { name: "Start", exact: true }).click();
  ok("player shows rounds", (await p.getByText(/· 1 of 12/).count()) === 1);
  for (let i = 0; i < 12; i++) {
    if (i === 6) await p.screenshot({ path: OUT + "/routine-round2.png" });
    await p.getByRole("button", { name: /Mark done|^Done$/ }).click();
  }
  await p.getByText("How did that feel?").waitFor();
  await p.screenshot({ path: OUT + "/routine-feeling.png" });
  await p.getByRole("button", { name: /Too easy/ }).click();
  ok("proposal shown", (await p.getByText("Step it up a little").count()) === 1);
  await p.screenshot({ path: OUT + "/routine-proposal.png" });
  await p.getByRole("button", { name: "Sounds good" }).click();
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  const today = Object.values(st.routineLogs)[0];
  ok("feeling and new level saved", today.feeling === "easy" && today.finished && st.routineSettings?.level === 1);
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  ok("difficulty shows +1", (await p.getByText("+1", { exact: true }).count()) === 1);
  await p.screenshot({ path: OUT + "/routine-workouts.png", fullPage: true });
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
