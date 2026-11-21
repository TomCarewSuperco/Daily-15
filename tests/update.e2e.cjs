// The app is updated while open: an old lazily loaded file is gone. The app reloads instead of going blank.
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  let blocked = 0;
  await ctx.route(/ProgressTab-.*\.js$/, (route) => { if (blocked++ === 0) return route.fulfill({ status: 404, body: "gone" }); return route.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE);
  // First load fails and the app reloads itself; open Progress again on the fresh page.
  await Promise.all([p.waitForEvent("load", { timeout: 8000 }), p.getByRole("button", { name: "Progress" }).click()]);
  await p.getByRole("button", { name: "Progress" }).click();
  await p.locator("h1", { hasText: "Progress" }).first().waitFor({ timeout: 5000 }).then(
    () => console.log("PASS missing file after an update reloads instead of a blank screen"),
    () => { console.log("FAIL missing file after an update reloads instead of a blank screen"); process.exitCode = 1; },
  );
  await b.close();
})();
