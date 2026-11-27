// Coaching: Yesterday on Home, the first-week milestone, the settling-in weekly review, and the weigh-in message.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c, info = "") => R.push(`${c ? "PASS" : "FAIL"} ${n}${c ? "" : ` ${info}`}`);
  await p.addInitScript(() => {
    if (localStorage.getItem("daily15:v1")) return;
    const key = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };
    const foods = [], routineLogs = {}, weights = [], activity = {};
    for (let n = 1; n <= 9; n++) {
      foods.push({ id: `f${n}`, date: key(n), meal: "lunch", name: "Chicken salad", portion: "1", kcal: 1800, protein: 150, carbs: 150, fat: 60, fibre: 20, estimated: false });
      routineLogs[key(n)] = { date: key(n), mode: "standard", completedIds: [], finished: true };
      activity[key(n)] = { date: key(n), steps: 6000, distanceKm: 4, activeMinutes: 30, activityKcal: 200 };
      if (n % 2) weights.push({ id: `w${n}`, date: key(n), kg: 88 + (9 - n) * 0.2 });
    }
    foods.push({ id: "beer", date: key(2), meal: "dinner", name: "Lager", portion: "4 pints", kcal: 760, protein: 4, carbs: 60, fat: 0, fibre: 0, alcoholUnits: 9, estimated: true });
    localStorage.setItem("daily15:v1", JSON.stringify({ version: 1, foods, routineLogs, weights, activity, profile: { name: "", age: 40, sex: "male", heightCm: 176, startWeightKg: 88, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
      targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2500, steps: 7500, activeMinutes: 30 } } }));
  });
  await p.goto(BASE);
  ok("yesterday card with a win", (await p.getByText("9 active days in a row.").count()) === 1);
  ok("yesterday card with one thing for today", (await p.getByText(/^Today:/).count()) === 1);
  ok("first-week milestone", (await p.getByText("Your first week").count()) === 1 && (await p.getByText("Active on 9 of 9 days so far.").count()) === 1);
  await p.screenshot({ path: OUT + "/coaching-home.png", fullPage: true });
  await p.getByRole("button", { name: "Close" }).first().click();
  ok("milestone closes", (await p.getByText("Your first week").count()) === 0);
  // Weigh in higher than last time.
  await p.getByRole("navigation").getByRole("button", { name: "Progress", exact: true }).click();
  await p.getByText("What went well").waitFor({ timeout: 5000 }).catch(() => {});
  const all = (await p.locator("main, body").first().textContent()) ?? "";
  const text = all.slice(all.lastIndexOf("Weekly review"));
  ok("review leads with a win", /Active every day this week/.test(text), text.slice(0, 200));
  ok("settling-in weight note", /Weight is up .* since you started/.test(text) && /week four/.test(text), text.slice(0, 400));
  ok("what went well", /What went well/.test(text));
  ok("one thing to try", /One thing to try this week/.test(text) || /Premium/.test(text), text);
  ok("no government framing", !/UK guideline/.test(text));
  await p.screenshot({ path: OUT + "/coaching-review.png", fullPage: true });
  await p.getByRole("button", { name: /Weigh in/ }).first().click();
  await p.getByRole("dialog").getByRole("spinbutton").fill("90.4");
  await p.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  ok("weigh-in reassurance", (await p.getByText(/first weeks of training/).count()) >= 1);
  ok("no page errors", errs.length === 0, errs.join(" | "));
  console.log(R.join("\n"));
  if (R.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
