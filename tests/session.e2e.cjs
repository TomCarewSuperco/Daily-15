// A workout keeps running, minimised above the tab bar, while you use the rest of the app.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Workouts", exact: true }).click();
  await p.getByRole("button", { name: /Start guided workout/ }).click();
  await p.getByRole("button", { name: /Start timer/ }).click();
  await p.getByRole("button", { name: "Minimise" }).click();
  const bar = p.getByRole("button", { name: "Return to workout" });
  ok("minimised bar shows the workout", (await bar.count()) === 1 && /March or brisk walk/.test(await bar.textContent()));
  await p.getByRole("navigation").getByRole("button", { name: "Nutrition", exact: true }).click();
  await p.getByRole("button", { name: "Add to lunch" }).waitFor();
  ok("other tabs usable while it runs", (await p.getByRole("button", { name: "Add to lunch" }).count()) === 1 && (await bar.count()) === 1);
  await p.screenshot({ path: OUT + "/session-minimised.png" });
  await p.waitForTimeout(2200);
  await bar.click();
  const shown = await p.locator("div.text-7xl, div.text-6xl, div[class*='text-7xl']").first().textContent().catch(() => "");
  const timerText = (await p.getByText(/^[0-9]:[0-5][0-9]$/).first().textContent()) || "";
  const [m, s] = timerText.split(":").map(Number);
  ok("the timer kept running while minimised", m * 60 + s <= 178);
  ok("tapping the bar brings the workout back", (await p.getByRole("button", { name: "Minimise" }).count()) === 1);
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 300)); process.exit(1); });
