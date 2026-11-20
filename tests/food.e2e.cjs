const { chromium } = require('playwright');
const OUT = process.env.OUT || 'tests/.out';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8092/';
const seed = { version: 1, profile: { name: "", age: 40, sex: "male", heightCm: 178, startWeightKg: 90, targetWeightKg: 82, experience: "beginner", activityLevel: "light", goal: "lose-fat", targetsCustomised: false,
  targets: { calories: 2000, proteinG: 148, carbsG: 200, fatG: 67, fibreG: 30, waterMl: 2750, steps: 7500, activeMinutes: 30 } } };
const product = (code, name, brand, kcal) => ({ code, product_name: name, brands: brand, quantity: "415 g", serving_quantity: 207.5,
  nutriments: { "energy-kcal_100g": kcal, proteins_100g: 4.7, carbohydrates_100g: 12.5, fat_100g: 0.2, fiber_100g: 3.7 } });
(async () => {
  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${OUT}/ean.y4m`] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
  const log = [];
  await ctx.route("https://world.openfoodfacts.org/**", (route) => {
    const u = new URL(route.request().url()); log.push(u.pathname + "?" + u.searchParams.get("search_terms"));
    if (u.pathname.startsWith("/cgi/search.pl")) return route.fulfill({ json: { count: 2, products: [product("5000157024671", "Baked Beanz", "Heinz", 78), product("1", "Beans no kcal", "X", 0)] } });
    if (u.pathname.includes("/product/5000159484695")) return route.fulfill({ json: { status: 1, product: product("5000159484695", "Twix", "Mars", 495) } });
    return route.fulfill({ status: 404, json: { status: 0 } });
  });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  // Force the ZXing path, as on iPhone Safari.
  await p.addInitScript(() => { delete window.BarcodeDetector; });
  await p.addInitScript((s) => { if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(s)); }, seed);
  await p.goto(BASE);
  await p.getByRole("button", { name: "Nutrition" }).click();
  await p.getByRole("button", { name: "Add to lunch" }).click();
  const box = p.getByPlaceholder(/Search foods/);
  await box.fill("heinz beans");
  await p.getByRole("button", { name: /Search branded products/ }).click();
  await p.getByText("Heinz Baked Beanz").waitFor();
  const zeroShown = await p.getByText("X Beans no kcal").count();
  await p.screenshot({ path: OUT + "/f1-search.png" });
  await p.getByText("Heinz Baked Beanz").click();
  await p.getByRole("button", { name: /^Add$/ }).click();
  await p.getByRole("button", { name: "Add to snacks" }).click();
  await p.getByRole("button", { name: "Barcode" }).click();
  await p.getByRole("button", { name: "Scan with camera" }).click();
  await p.getByText("Mars Twix").waitFor({ timeout: 20000 });
  await p.screenshot({ path: OUT + "/f2-scan.png" });
  await p.getByRole("button", { name: /^Add$/ }).click();
  await p.waitForTimeout(500);
  const state = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.map((f) => `${f.meal}: ${f.name} ${f.portion} ${f.kcal} kcal est=${f.estimated}`));
  await p.screenshot({ path: OUT + "/f3-diary.png", fullPage: true });
  console.log({ requests: log, zeroKcalShown: zeroShown, saved: state, errors: errs });
  if (state.length !== 2 || zeroShown !== 0 || errs.length) process.exitCode = 1;
  // Swipe left to delete, then undo.
  const first = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods[0].name);
  const row = p.locator("li", { hasText: first }).first();
  const rb = await row.boundingBox();
  await p.mouse.move(rb.x + rb.width - 20, rb.y + rb.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(rb.x + rb.width - 20 - i * 30, rb.y + rb.height / 2);
  await p.mouse.up();
  await p.waitForTimeout(400);
  const afterSwipe = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.length);
  await p.getByRole("button", { name: "Undo" }).click();
  await p.waitForTimeout(300);
  const afterUndo = await p.evaluate(() => JSON.parse(localStorage.getItem("daily15:v1")).foods.length);
  console.log(afterSwipe === 1 ? "PASS swipe left deletes entry" : `FAIL swipe left deletes entry (${afterSwipe})`);
  console.log(afterUndo === 2 ? "PASS undo restores entry" : `FAIL undo restores entry (${afterUndo})`);
  if (afterSwipe !== 1 || afterUndo !== 2) process.exitCode = 1;
  await p.waitForTimeout(5500); // let the toast clear
  await p.locator("li", { hasText: first }).first().locator("button").last().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + "/f4-tap.png" });
  const opened = await p.getByRole("dialog").count();
  console.log(opened === 1 ? "PASS tap still opens entry" : "FAIL tap still opens entry");
  if (opened !== 1) process.exitCode = 1;
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  // Press and hold, then drag to dinner.
  const db = await p.locator("li", { hasText: first }).first().boundingBox();
  const dinner = await p.locator('[data-meal="dinner"]').boundingBox();
  await p.mouse.move(db.x + 40, db.y + db.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(700);
  for (let i = 1; i <= 10; i++) await p.mouse.move(db.x + 40, db.y + db.height / 2 + ((dinner.y + 30 - db.y - db.height / 2) * i) / 10);
  await p.mouse.up();
  await p.waitForTimeout(300);
  const moved = await p.evaluate((n) => JSON.parse(localStorage.getItem("daily15:v1")).foods.find((f) => f.name === n).meal, first);
  console.log(moved === "dinner" ? "PASS hold and drag moves entry to dinner" : `FAIL hold and drag moves entry to dinner (${moved})`);
  if (moved !== "dinner") process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
