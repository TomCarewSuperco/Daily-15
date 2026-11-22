// The public waiting-list page: validation, sign-up, and an email already on the list.
const { chromium } = require("playwright");
const OUT = process.env.OUT || "tests/.out";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8092/";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const posts = [];
  await ctx.route("https://odzhfmmxfmwockciyzmz.supabase.co/rest/v1/waitlist", (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    posts.push({ body, apikey: route.request().headers()["apikey"] });
    return route.fulfill({ status: body.email === "already@example.com" ? 409 : 201, body: "" });
  });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const R = []; const ok = (n, c) => R.push(`${c ? "PASS" : "FAIL"} ${n}`);
  await p.goto(BASE + "join.html?ref=instagram");
  await p.getByRole("button", { name: "Join the waiting list" }).click();
  ok("asks for a valid email", (await p.getByText("Please enter a valid email address.").count()) === 1);
  await p.locator("#email").fill("tom.test@example.com");
  await p.getByRole("button", { name: "Join the waiting list" }).click();
  ok("asks for consent", (await p.getByText(/tick the box/).count()) === 1);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Join the waiting list" }).click();
  await p.getByText("You're on the list.", { exact: false }).waitFor();
  ok("signs up with consent and the reference", posts.length === 1 && posts[0].body.consent === true && posts[0].body.source === "instagram" && !!posts[0].apikey);
  await p.screenshot({ path: OUT + "/join.png", fullPage: true });
  const q = await ctx.newPage();
  await q.goto(BASE + "join.html");
  await q.locator("#email").fill("already@example.com");
  await q.getByRole("checkbox").check();
  await q.getByRole("button", { name: "Join the waiting list" }).click();
  await q.getByText("already on the list", { exact: false }).waitFor();
  ok("an email already on the list is treated as success", true);
  console.log(R.join("\n")); console.log("errors:", errs);
  if (R.some((r) => r.startsWith("FAIL")) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error("FAIL", e.message.split("\n")[0]); process.exit(1); });
