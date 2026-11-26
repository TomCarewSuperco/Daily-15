// A usual breakfast: offered on an empty breakfast, logged as separate entries; a saved meal logs its foods.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.addInitScript(() => {
    if (localStorage.getItem("daily15:v1")) return;
    const key = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };
    const e = (n, name, kcal, portion) => ({ id: `${n}-${name}`, date: key(n), meal: "breakfast", name, portion, estimated: true, kcal, protein: 5, carbs: 5, fat: 5, fibre: 0 });
    const foods = [1, 2, 4].flatMap((n) => [e(n, "Egg", 172, "2 large eggs (120 g)"), e(n, "Greek-style yoghurt, full fat (10%)", 80, "2 heaped tablespoons (60 g)"), e(n, "Korean Style Kimichi", 48, "1 serving (100 g)")]);
    localStorage.setItem("daily15:v1", JSON.stringify({ version: 1, foods, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
      targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } }));
  });
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Nutrition", exact: true }).click();
  const usualText = await p.getByText("Your usual breakfast", { exact: true }).locator("xpath=..").textContent();
  ok("usual breakfast offered", /Egg, Greek-style yoghurt and Korean Style Kimichi · 300 kcal/.test(usualText ?? ""));
  ok("no usual for lunch", (await p.getByText("Your usual lunch").count()) === 0);
  await p.screenshot({ path: OUT + "/usual.png" });
  await p.getByRole("button", { name: "Add your usual breakfast" }).click();
  await p.waitForTimeout(300);
  const today = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.filter((f) => f.date === new Date().toLocaleDateString("en-CA")));
  ok("logged as three entries with their portions", today.length === 3 && today[0].portion === "2 large eggs (120 g)");
  ok("row gone once breakfast has food", (await p.getByRole("button", { name: "Add your usual breakfast" }).count()) === 0);
  // Save the meal; it then logs its foods separately from search.
  await p.getByRole("button", { name: "Save Breakfast as a meal" }).click();
  await p.getByRole("button", { name: "Add to lunch" }).click();
  await p.getByPlaceholder(/Search foods/).fill("breakfast");
  await p.getByRole("button", { name: /^Breakfast: Egg, Greek-style yoghurt and Korean Style Kimichi/ }).first().click();
  await p.waitForTimeout(300);
  const lunch = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.filter((f) => f.meal === "lunch"));
  ok("saved meal logs each food", lunch.length === 3 && lunch.some((f) => f.name === "Korean Style Kimichi"));
  ok("no page errors", errs.length === 0);
  console.log(R.join("\n"));
  if (R.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
