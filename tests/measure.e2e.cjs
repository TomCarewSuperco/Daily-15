// The measurements sheet shows where to put the tape for the field being filled in.
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
  await p.getByText("Measurements", { exact: true }).locator("xpath=..").getByRole("button", { name: "Add" }).click();
  const d = p.getByRole("dialog");
  const waist = (await d.getByText(/^Waist: at your belly button/).count()) === 1 && (await d.getByRole("img", { name: "Where to measure" }).count()) === 1;
  await d.getByRole("spinbutton").nth(4).focus();
  const thigh = (await d.getByText(/^Thigh: around the widest part/).count()) === 1;
  await d.getByRole("spinbutton").nth(4).fill("58");
  await d.getByRole("button", { name: "Save" }).click();
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).measurements[0]?.thighCm === 58);
  console.log(waist ? "PASS diagram opens on waist" : "FAIL diagram opens on waist");
  console.log(thigh ? "PASS focusing a field shows its instruction" : "FAIL focusing a field shows its instruction");
  console.log(saved && !errs.length ? "PASS measurement saved" : `FAIL measurement saved ${errs}`);
  if (!waist || !thigh || !saved || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 300)); process.exit(1); });
