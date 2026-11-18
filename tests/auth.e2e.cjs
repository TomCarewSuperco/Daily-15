const { chromium } = require('playwright');
const OUT = process.env.OUT || 'tests/.out';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8093/';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const users = {}; // email -> {id,password,confirmed}
const rows = {};  // user_id -> {data, updated_at}
const calls = [];
let tick = 0;
let consentMeta = null;
let confirmMode = true;
function session(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp })}.sig`;
  return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r-' + u.id, user: userObj(u) };
}
const userObj = (u) => ({ id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(), email_confirmed_at: u.confirmed ? new Date().toISOString() : null });
const who = (req) => { const t = (req.headers()['authorization'] || '').split(' ')[1] || ''; try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).sub; } catch { return null; } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const handler = async (route) => {
    const req = route.request(); const u = new URL(req.url()); const m = req.method(); const body = req.postDataJSON?.() ?? null;
    calls.push(`${m} ${u.pathname}${u.search.includes('grant_type') ? u.search : ''}`);
    const json = (status, j) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(j) });
    if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.pathname === '/auth/v1/signup') {
      if (users[body.email]) return json(422, { code: 'user_already_exists', msg: 'User already registered' });
      consentMeta = body.data;
      const usr = users[body.email] = { id: 'u' + Object.keys(users).length, email: body.email, password: body.password, confirmed: !confirmMode };
      return json(200, confirmMode ? userObj(usr) : session(usr));
    }
    if (u.pathname === '/auth/v1/token') {
      const usr = users[body.email];
      if (!usr || usr.password !== body.password) return json(400, { code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!usr.confirmed) return json(400, { code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, session(usr));
    }
    if (u.pathname === '/auth/v1/recover' || u.pathname === '/auth/v1/resend') return json(200, {});
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    if (u.pathname === '/auth/v1/user') {
      const id = who(req); const usr = Object.values(users).find((x) => x.id === id);
      if (m === 'PUT' && body.password) usr.password = body.password;
      return json(200, userObj(usr));
    }
    if (u.pathname === '/rest/v1/user_state') {
      const id = who(req);
      const stamp = () => new Date(Date.now() + (++tick)).toISOString();
      if (m === 'GET') { const r = rows[id]; return json(200, r ? [{ data: r.data, updated_at: r.updated_at }] : []); }
      if (m === 'POST') {
        if (body.user_id !== id) return json(403, { message: 'rls' });
        if (rows[id]) return json(409, { code: '23505', message: 'duplicate key' });
        rows[id] = { data: body.data, updated_at: stamp() };
        return json(201, [{ updated_at: rows[id].updated_at }]);
      }
      if (m === 'PATCH') {
        const want = (u.searchParams.get('updated_at') || '').replace(/^eq\./, '');
        if (!rows[id] || rows[id].updated_at !== want) return json(200, []);
        rows[id] = { data: body.data, updated_at: stamp() };
        return json(200, [{ updated_at: rows[id].updated_at }]);
      }
    }
    if (u.pathname === '/functions/v1/delete-account') { const id = who(req); delete rows[id]; for (const k in users) if (users[k].id === id) delete users[k]; return json(200, { deleted: true }); }
    return json(404, { message: 'unhandled ' + u.pathname });
  };
  await ctx.route('https://fake-d15.supabase.co/**', handler);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !m.text().includes('status of 4') && errs.push(m.text()));
  const R = [];
  const ok = (name, cond) => R.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  await p.goto(BASE);
  await p.getByRole('heading', { name: 'Show up every day.' }).waitFor();
  await p.screenshot({ path: OUT + '/a1-signin.png' });
  // Validation
  await p.getByRole('button', { name: 'Create an account' }).click();
  await p.getByLabel('Email').fill('sam@example.com');
  await p.getByLabel('Password', { exact: true }).fill('short');
  await p.getByLabel('Confirm password').fill('short');
  await p.getByRole('button', { name: 'Create account' }).click();
  ok('short password rejected', await p.getByRole('alert').textContent().then((t) => t.includes('at least 8')));
  await p.getByLabel('Password', { exact: true }).fill('longenough1');
  await p.getByLabel('Confirm password').fill('different1');
  await p.getByRole('button', { name: 'Create account' }).click();
  ok('mismatch rejected', await p.getByRole('alert').textContent().then((t) => t.includes("don't match")));
  await p.getByLabel('Confirm password').fill('longenough1');
  await p.getByRole('button', { name: 'Create account' }).click();
  ok('consent required', await p.getByRole('alert').textContent().then((t) => t.includes('Tick the box')));
  await p.getByRole('checkbox', { name: 'Consent to storing health data' }).click();
  await p.screenshot({ path: OUT + '/a2-register.png' });
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.getByRole('heading', { name: 'Check your email.' }).waitFor();
  ok('register shows check email', true);
  ok('consent time recorded on the account', !!consentMeta?.health_data_consent_at);
  await p.screenshot({ path: OUT + '/a3-check.png' });
  await p.getByRole('button', { name: 'Back to sign in' }).click();
  await p.getByLabel('Email').fill('sam@example.com');
  await p.getByLabel('Password', { exact: true }).fill('longenough1');
  await p.getByRole('button', { name: 'Sign in' }).click();
  ok('unconfirmed sign-in explained', await p.getByRole('alert').textContent().then((t) => t.includes('Confirm your email')));
  users['sam@example.com'].confirmed = true;
  await p.getByLabel('Password', { exact: true }).fill('wrongpass');
  await p.getByRole('button', { name: 'Sign in' }).click();
  ok('wrong password message', await p.getByRole('alert').textContent().then((t) => t.includes('incorrect')));
  // Forgot password
  await p.getByRole('button', { name: 'Forgot password?' }).click();
  await p.getByLabel('Email').fill('nobody@example.com');
  await p.getByRole('button', { name: 'Send reset link' }).click();
  await p.getByText(/If an account exists for nobody@example.com/).waitFor();
  ok('forgot password sends neutral message', calls.includes('POST /auth/v1/recover'));
  await p.screenshot({ path: OUT + '/a4-forgot.png' });
  await p.getByRole('button', { name: 'Back to sign in' }).click();
  // Sign in properly -> onboarding (new account)
  await p.getByLabel('Email').fill('Sam@Example.com ');
  await p.getByLabel('Password', { exact: true }).fill('longenough1');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.getByRole('button', { name: 'Get started' }).waitFor();
  ok('sign-in reaches onboarding', true);
  await p.getByRole('button', { name: 'Get started' }).click();
  const nums = p.locator('input[type=number]');
  await nums.nth(0).fill('42'); await nums.nth(1).fill('178'); await nums.nth(2).fill('92'); await nums.nth(3).fill('82');
  await p.getByRole('button', { name: 'Continue' }).click(); await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('button', { name: 'Start DAILY 15' }).click();
  await p.getByRole('button', { name: '+ Glass 250 ml' }).click();
  await p.waitForTimeout(2500);
  const saved = rows['u0']?.data;
  ok('data synced to account', saved?.profile?.heightCm === 178 && Object.values(saved.water)[0] === 250);
  // Profile: change password, sign out
  await p.getByRole('button', { name: 'Profile' }).click();
  await p.getByText('All changes saved to your account').waitFor();
  await p.screenshot({ path: OUT + '/a5-profile.png' });
  await p.getByRole('button', { name: 'Password' }).click();
  await p.getByLabel('New password', { exact: true }).fill('newpassword9');
  await p.getByLabel('Confirm new password').fill('newpassword9');
  await p.getByRole('button', { name: 'Save new password' }).click();
  await p.waitForTimeout(500);
  ok('password changed', users['sam@example.com'].password === 'newpassword9');
  await p.getByRole('button', { name: 'Sign out' }).click();
  await p.getByRole('heading', { name: 'Show up every day.' }).waitFor();
  const leftover = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('daily15')));
  ok('sign-out clears device data', leftover.length === 0);
  // Second device: fresh context signs in, data comes down
  await p.getByLabel('Email').fill('sam@example.com');
  await p.getByLabel('Password', { exact: true }).fill('newpassword9');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.getByText(/Good (morning|afternoon|evening)/).waitFor();
  ok('signing back in restores data from account', await p.getByText('0.25 / 2.8 L').count() > 0 || await p.getByText(/0\.25 \//).count() > 0);
  // Two devices editing at once: both changes should survive.
  const ctxB = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctxB.route('https://fake-d15.supabase.co/**', handler);
  const pB = await ctxB.newPage();
  await pB.goto(BASE);
  await pB.getByLabel('Email').fill('sam@example.com');
  await pB.getByLabel('Password', { exact: true }).fill('newpassword9');
  await pB.getByRole('button', { name: 'Sign in' }).click();
  await pB.getByText(/Good (morning|afternoon|evening)/).waitFor();
  // A logs water while B records a weigh-in, before either has synced the other's change.
  await p.getByRole('button', { name: '+ Bottle 500 ml' }).click();
  await pB.getByRole('button', { name: /Weight/ }).first().click();
  await pB.locator('[role=dialog] input[type=number]').first().fill('91.2');
  await pB.getByRole('button', { name: 'Save' }).click();
  await p.waitForTimeout(3500);
  await pB.waitForTimeout(3500);
  const cloud = rows['u0'].data;
  ok('two devices: both changes saved', Object.values(cloud.water)[0] === 750 && cloud.weights.some((w) => w.kg === 91.2));
  // Each device picks up the other's change when it comes back to the foreground.
  for (const page of [p, pB]) await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForTimeout(800);
  ok('two devices: A sees B\'s weigh-in', await p.getByText('91.2').count() > 0);
  ok('two devices: B sees A\'s water', await pB.getByText(/0\.75 \//).count() > 0);
  await ctxB.close();

  // Delete account
  await p.getByRole('button', { name: 'Profile' }).click();
  await p.getByRole('button', { name: 'Delete my account and data' }).click();
  await p.getByRole('button', { name: 'Delete', exact: true }).click();
  await p.getByRole('heading', { name: 'Show up every day.' }).waitFor();
  ok('delete account removes server data', !rows['u0'] && !users['sam@example.com']);
  console.log(R.join('\n')); console.log('errors:', errs);
  if (R.some((r) => r.startsWith('FAIL')) || errs.length) process.exitCode = 1;
  await b.close();
})().catch((e) => { console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
