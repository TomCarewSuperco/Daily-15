// Pregnancy mode from sign-up. Runs against the on-device build.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  const tab = (name) => p.getByRole("navigation").getByRole("button", { name, exact: true }).click();
  await p.goto(BASE);
  await p.getByRole("button", { name: "Get started" }).click();
  const nums = p.locator("input[type=number]");
  await nums.nth(0).fill("32"); await nums.nth(1).fill("165"); await nums.nth(2).fill("68"); await nums.nth(3).fill("68");
  await p.getByRole("button", { name: "Male", exact: true }).click();
  ok("question hidden for male", (await p.getByText("Are you pregnant or breastfeeding?").count()) === 0);
  await p.getByRole("button", { name: "Female", exact: true }).click();
  await p.getByRole("button", { name: "Pregnant", exact: true }).click();
  await p.getByRole("button", { name: "Continue" }).click(); await p.getByRole("button", { name: "Continue" }).click();
  ok("goal step explains no calorie targets", (await p.getByText(/no calorie targets or weight-loss goals/).count()) === 1);
  await p.getByRole("button", { name: "Start DAILY 15" }).click();
  await p.getByText(/Good (morning|afternoon|evening)/).waitFor();
  ok("home shows pregnancy card", (await p.getByText("Pregnancy", { exact: false }).first().count()) > 0 && (await p.getByRole("checkbox", { name: /Folic acid/ }).count()) === 1);
  ok("calorie ring shows eaten, not left", (await p.getByText("kcal eaten").count()) === 1 && (await p.getByText(/left$/).count()) === 0);
  await p.getByRole("checkbox", { name: /Folic acid/ }).click();
  ok("supplement ticked", (await p.getByRole("checkbox", { name: /Folic acid/ }).getAttribute("aria-checked")) === "true");
  await p.getByRole("button", { name: "What to eat and avoid" }).click();
  ok("guidance sheet opens", (await p.getByText("Eating well in pregnancy").count()) === 1);
  await p.screenshot({ path: OUT + "/pregnancy-guidance.png" });
  await p.keyboard.press("Escape");
  await p.screenshot({ path: OUT + "/pregnancy-home.png", fullPage: true });

  // Coffee counts towards caffeine; wine is flagged.
  await tab("Nutrition");
  await p.getByRole("button", { name: "Add to breakfast" }).click();
  await p.getByPlaceholder(/Search foods/).fill("filter coffee");
  await p.getByText("Filter coffee with semi-skimmed milk").click();
  await p.getByRole("button", { name: /^Add$/ }).click();
  ok("caffeine tracked", (await p.getByText("140 / 200 mg limit").count()) === 1);
  await p.getByRole("button", { name: "Add to dinner" }).click();
  await p.getByPlaceholder(/Search foods/).fill("red wine");
  await p.getByText("Red wine", { exact: true }).click();
  ok("alcohol flagged before adding", (await p.getByRole("note").filter({ hasText: "not drinking at all in pregnancy" }).count()) === 1);
  await p.keyboard.press("Escape");

  // Profile: due date at 20 weeks makes glute bridges show a warning.
  await tab("Profile");
  const dueDate = new Date(Date.now() + 20 * 7 * 86400000).toISOString().slice(0, 10);
  await p.locator('input[type="date"]').first().fill(dueDate);
  await tab("Workouts");
  await p.getByRole("button", { name: /Glute bridges/ }).first().click();
  ok("lying-on-back exercise warned at 20 weeks", (await p.getByText(/avoid exercises lying flat on your back/).count()) === 1);

  await tab("Progress");
  await p.getByText("Weekly review").first().waitFor();
  ok("pregnancy weekly review shown", (await p.getByText(/Week (19|20) of your pregnancy/).count()) === 1 && (await p.getByText("Suggested change").count()) === 0);
  ok("no weight target", (await p.getByText("To target").count()) === 0);
  await p.screenshot({ path: OUT + "/pregnancy-progress.png", fullPage: true });

  // Switching off restores normal mode.
  await tab("Profile");
  await p.getByRole("button", { name: "Neither" }).click();
  await tab("Home");
  ok("switching off removes the card", (await p.getByRole("checkbox", { name: /Folic acid|Vitamin D/ }).count()) === 0);
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
