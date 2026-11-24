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
  // Switch to inches: the typed value converts, and is saved back in centimetres.
  await d.getByRole("radio", { name: "Inches" }).click().catch(() => d.getByRole("button", { name: "Inches" }).click());
  const shown = await d.getByRole("spinbutton").nth(4).inputValue();
  await d.getByRole("button", { name: "Save" }).click();
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")));
  const saved = st.measurements[0]?.thighCm === 57.8 && st.profile.lengthUnit === "in" && shown === "22.75";
  const card = (await p.getByText("22.75 in").count()) === 1;
  console.log(card ? "PASS card shows inches" : "FAIL card shows inches");
  if (!card) process.exitCode = 1;
  if (!saved) console.log(`  thigh ${st.measurements[0]?.thighCm} unit ${st.profile.lengthUnit} shown ${shown}`);
  console.log(waist ? "PASS diagram opens on waist" : "FAIL diagram opens on waist");
  console.log(thigh ? "PASS focusing a field shows its instruction" : "FAIL focusing a field shows its instruction");
  console.log(saved && !errs.length ? "PASS inches convert and save in centimetres" : `FAIL inches convert and save in centimetres ${errs}`);
  if (!waist || !thigh || !saved || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 300)); process.exit(1); });
