// Everyday portions, plural search and manual foods with a typical serving. Runs against the on-device build.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
const seed = { version: 1, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.goto(BASE);
  await p.getByRole("navigation").getByRole("button", { name: "Nutrition", exact: true }).click();

  // Two eggs. The search box must stay put while results change.
  await p.getByRole("button", { name: "Add to breakfast" }).click();
  await p.waitForTimeout(600);
  const box = p.getByPlaceholder(/Search foods/);
  const y0 = (await box.boundingBox()).y;
  await box.fill("eggs");
  await p.getByText("UK food database").waitFor();
  const y1 = (await box.boundingBox()).y;
  await box.fill("zzzz");
  await p.waitForTimeout(300);
  const y2 = (await box.boundingBox()).y;
  ok("search box doesn't move", Math.abs(y1 - y0) < 2 && Math.abs(y2 - y0) < 2);
  await box.fill("eggs");
  await p.getByText("Egg", { exact: true }).click();
  ok("eggs default to one large egg", (await p.getByText("1 large egg (60 g)").count()) === 1);
  await p.getByRole("button", { name: "More" }).click();
  ok("stepper counts in eggs", (await p.getByText("2 large eggs (120 g)").count()) === 1);
  await p.screenshot({ path: OUT + "/portion-eggs.png" });
  await p.getByRole("button", { name: /^Add$/ }).click();

  // Sausages from the list, switching to grams and back.
  await p.getByRole("button", { name: "Add to breakfast" }).click();
  await p.getByPlaceholder(/Search foods/).fill("sausages");
  await p.getByText("Pork sausage, grilled").click();
  await p.getByRole("button", { name: "2", exact: true }).click();
  await p.getByRole("radio", { name: "grams" }).click();
  ok("switching to grams keeps the amount", (await p.getByRole("textbox", { name: /Amount in g/ }).or(p.locator('input[aria-label="Amount in g"]')).inputValue()) === "90");
  await p.getByRole("radio", { name: /sausage 45 g/ }).click();
  await p.getByRole("button", { name: /^Add$/ }).click();

  // Manual food per 100 g with a typical serving, saved to My foods.
  await p.getByRole("button", { name: "Add to lunch" }).click();
  await p.getByRole("button", { name: "Manual" }).click();
  await p.getByPlaceholder("e.g. Pork and apple sausages").fill("Pork and apple sausages");
  const nums = p.locator("[role=dialog] input[type=number]");
  await nums.nth(0).fill("250"); await nums.nth(1).fill("15"); await nums.nth(2).fill("8"); await nums.nth(3).fill("18"); await nums.nth(4).fill("1");
  await p.getByPlaceholder("e.g. sausage").fill("sausage");
  await nums.nth(8).fill("57");
  await p.getByRole("button", { name: "Next: choose amount" }).click();
  await p.getByRole("button", { name: "More" }).click();
  ok("manual food logs by serving", (await p.getByText("2 sausages (114 g)").count()) === 1);
  await p.getByRole("button", { name: /^Add$/ }).click();
  await p.getByRole("button", { name: "Add to dinner" }).click();
  await p.getByPlaceholder(/Search foods/).fill("apple saus");
  ok("saved to My foods", (await p.getByText("My foods").count()) === 1 && (await p.getByText(/143 kcal per sausage \(57 g\)/).count()) === 1);
  await p.keyboard.press("Escape");

  // Full UK food database: a pint of lager from CoFID.
  await p.getByRole("button", { name: "Add to dinner" }).click();
  await p.getByPlaceholder(/Search foods/).fill("lager");
  await p.getByText("UK food database").waitFor();
  await p.getByText("Lager, premium").click();
  ok("CoFID food opens in pints", (await p.getByText(/1 pint \(568 ml\)/).count()) === 1);
  ok("credits CoFID", true);
  await p.keyboard.press("Escape");

  // Edit: change two eggs to three and move them to lunch.
  await p.getByText("2 large eggs (120 g)", { exact: false }).first().click();
  await p.getByRole("button", { name: "Lunch", exact: true }).click();
  await p.getByRole("button", { name: "More" }).click();
  ok("edit recalculates", (await p.getByRole("dialog").getByText("3 large eggs (180 g)").count()) === 1);
  await p.getByRole("button", { name: "Save" }).click();
  const egg = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.find((f) => f.name === "Egg"));
  ok("edit saved with new meal and calories", egg.meal === "lunch" && egg.kcal === 257 && egg.portion === "3 large eggs (180 g)");
  // Put it back so the diary check below still holds.
  await p.getByText("3 large eggs (180 g)", { exact: false }).first().click();
  await p.getByRole("button", { name: "Breakfast", exact: true }).click();
  await p.getByRole("button", { name: "Less" }).click();
  await p.getByRole("button", { name: "Save" }).click();

  const foods = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.map((f) => `${f.name} | ${f.portion} | ${f.kcal}`));
  ok("diary entries", JSON.stringify(foods) === JSON.stringify(["Egg | 2 large eggs (120 g) | 172", "Pork sausage, grilled | 2 sausages (90 g) | 265", "Pork and apple sausages | 2 sausages (114 g) | 285"]));
  console.log(foods);
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
