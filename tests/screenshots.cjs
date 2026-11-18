// App Store screenshots with demo data. Run: npm run screenshots  (writes docs/app-store/screenshots)
// Uses the on-device build so no account is needed.
const { chromium } = require("playwright");
const { build } = require("./demo-data.cjs");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8096/";
const OUT = "docs/app-store/screenshots";
// Apple's required iPhone sizes: 6.9-inch (1320 x 2868) and 6.5-inch (1242 x 2688).
const SIZES = [
  { name: "6.9in", width: 440, height: 956 },
  { name: "6.5in", width: 414, height: 896 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const size of SIZES) {
    const ctx = await b.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 3, reducedMotion: "no-preference" });
    const state = build();
    delete state.routine;
    delete state.reminders;
    await ctx.addInitScript((s) => {
      const full = JSON.parse(s);
      if (!localStorage.getItem("daily15:v1")) localStorage.setItem("daily15:v1", JSON.stringify(full));
    }, JSON.stringify(state));
    const p = await ctx.newPage();
    const tab = (name) => p.getByRole("navigation").getByRole("button", { name, exact: true }).click();
    const shot = async (n, label) => {
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${OUT}/${size.name}-${n}-${label}.png` });
    };
    await p.goto(BASE);
    await p.getByText(/Good (morning|afternoon|evening)/).waitFor();
    await shot(1, "home");

    await tab("Workouts");
    await p.getByRole("button", { name: /Start guided workout/ }).click();
    await p.getByRole("button", { name: "Next exercise" }).click(); // Air squats
    await p.waitForTimeout(1300); // mid-movement
    await shot(2, "guided-workout");
    await p.getByRole("button", { name: "Close" }).click();

    await tab("Nutrition");
    await shot(3, "nutrition");

    await tab("Progress");
    await p.waitForTimeout(1500); // chart animation
    await shot(4, "progress");

    await p.evaluate(() => {
      const el = [...document.querySelectorAll("h3")].find((h) => h.textContent === "Weekly review");
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
    });
    await shot(5, "weekly-review");

    await tab("Workouts");
    await p.getByRole("button", { name: /Air squats/ }).click();
    await p.waitForTimeout(900);
    await shot(6, "workouts");
    await ctx.close();
  }
  await b.close();
  console.log(fs.readdirSync(OUT).join("\n"));
})().catch((e) => { console.error(e.message.split("\n")[0]); process.exit(1); });
