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
  await p.getByText(/· 1 of 12/).waitFor();
  ok("player shows rounds", (await p.getByText(/· 1 of 12/).count()) === 1);
  ok("player shows time so far", (await p.getByLabel("Time so far").count()) === 1);
  ok("page behind hidden while playing", (await p.getByRole("heading", { name: "Workouts" }).count()) === 0);
  for (let i = 0; i < 12; i++) {
    if (i === 6) await p.screenshot({ path: OUT + "/routine-round2.png" });
    await p.getByRole("button", { name: /Mark done|^Done$/ }).click();
  }
  await p.getByText("How did that feel?").waitFor();
  ok("finish shows time taken", (await p.getByText(/^Time:/).count()) === 1);
  await p.screenshot({ path: OUT + "/routine-feeling.png" });
  await p.getByRole("button", { name: /Too easy/ }).click();
  ok("proposal shown", (await p.getByText("Step it up a little").count()) === 1);
  await p.screenshot({ path: OUT + "/routine-proposal.png" });
  await p.getByRole("button", { name: "Sounds good" }).click();
  // Then one food choice for the day.
  await p.getByText("One food choice for today").waitFor();
  await p.screenshot({ path: OUT + "/routine-intention.png" });
  await p.getByRole("button", { name: "Nothing to eat after 8pm" }).click();
  await p.getByRole("navigation").getByRole("button", { name: "Home", exact: true }).click();
  await p.getByText("Today's food choice", { exact: true }).waitFor();
  ok("food choice shown on Home", (await p.getByText("Nothing to eat after 8pm").count()) === 1);
  await p.screenshot({ path: OUT + "/home-intention.png" });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  const today = Object.values(st.routineLogs)[0];
  ok("feeling and new level saved", today.feeling === "easy" && today.finished && st.routineSettings?.level === 1);
  ok("food choice saved for today", Object.values(st.intentions ?? {})[0]?.id === "late-snacks");
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  ok("difficulty shows +1", (await p.getByText("+1", { exact: true }).count()) === 1);
  await p.screenshot({ path: OUT + "/routine-workouts.png", fullPage: true });
  // Stretching steps through four moves as the timer runs.
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  const q = await ctx2.newPage();
  await q.clock.install();
  await q.goto(BASE);
  await q.getByRole("button", { name: "Start", exact: true }).click();
  for (let i = 0; i < 11; i++) await q.getByRole("button", { name: "Next exercise" }).click();
  await q.getByText(/12 of 12/).waitFor();
  // Today's four stretches, one from each area, rotate by day: read them from the chips.
  const chips = await q.locator("span.rounded-full.px-2").allTextContents();
  const h = await q.locator("h2").allTextContents();
  ok("stretching shows four stretches and starts with the first", chips.length === 4 && h.includes(chips[0]));
  await q.getByRole("button", { name: /Start timer/ }).click();
  await q.clock.runFor(31_000);
  ok("moves on to the second stretch after 30 seconds", (await q.getByRole("heading", { name: chips[1] }).count()) === 1);
  await q.screenshot({ path: OUT + "/routine-stretch.png" });
  // Time away from the app (no timer ticks) still counts when it comes back.
  // fastForward jumps the clock and fires each due timer once: a tick-counting timer would lose the minute.
  await q.clock.fastForward(60_000);
  await q.clock.runFor(500);
  ok("then the fourth", (await q.getByRole("heading", { name: chips[3] }).count()) === 1);
  await ctx2.close();

  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
