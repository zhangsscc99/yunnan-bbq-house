// Round 18 review capture v4: serve chain first (no shots mid-timer), then grill visuals, then spam.
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');
const OUT = process.env.OUT;
const TAG = process.env.VIEW;
const URL_ = process.env.BBQ_URL ?? 'https://openfolio.uk/bbq/';
const VP = TAG === 'land' ? { width: 844, height: 390 } : { width: 390, height: 844 };
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { url: URL_, viewport: VP, shots: [], errors: [], warns: [], trace: [], t0: Date.now() };

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: VP });
page.on('pageerror', (e) => R.errors.push('pageerror: ' + String(e).slice(0, 200)));
page.on('crash', () => R.errors.push('PAGE CRASH (renderer killed)'));
page.on('console', (m) => { if (m.type() === 'error') R.errors.push(m.text().slice(0, 200)); else if (m.type() === 'warning') R.warns.push(m.text()); });
const cdp = await page.context().newCDPSession(page);

const shot = async (n) => {
  try {
    const p = `${OUT}/${TAG}-${n}.png`;
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(p, Buffer.from(data, 'base64'));
    R.shots.push(n);
  } catch (e) { R.errors.push('shot ' + n + ': ' + String(e).slice(0, 120)); }
};
const st = () => page.evaluate(() => window.__test.state());
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.ceil(sec / 0.05)), s);
const brief = (s) => ({ act: s.action, label: s.actionLabel, carry: s.carrying, chop: s.chop, grill: s.grill.map((g) => g && g.stage + ':' + (g.t || 0).toFixed(1)), money: s.money, served: s.served, waste: s.waste, angry: s.angry });
const act = async (tag) => {
  await page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 3); });
  await sleep(140);
  const s = await st();
  R.trace.push({ tag, ...brief(s) });
  return s;
};
const tp = async (kind, id) => { await page.evaluate(([k, i]) => window.__test[k](i), [kind, id]); await sleep(300); };
const makeSkewer = async (label) => {
  await tp('teleportToStation', 'crate-pork');
  await act(label + ':take-raw');
  await tp('teleportToStation', 'chop');
  let s = await act(label + ':place');
  let taps = 0;
  while ((s.chop?.chopLeft ?? 0) > 0 && taps < 8) { s = await act(label + ':tap' + (taps + 1)); taps++; if (taps === 1 && label === 'B') { await shot('02-chop-mid'); s = await act('B:tap-resync'); } }
  await act(label + ':take-chopped');
  return taps;
};

try {
  await page.goto(URL_, { waitUntil: 'commit', timeout: 45000 });
  for (let i = 0; i < 90; i++) { if (await page.evaluate(() => !!document.querySelector('.bbq-panel button')).catch(() => false)) break; await sleep(200); }
  R.firstClickableMs = Date.now() - R.t0;
  await sleep(1000);
  R.build = await page.evaluate(() => window.__build ?? null);
  R.titleText = await page.evaluate(() => document.querySelector('.bbq-panel .card')?.innerText ?? null);
  await shot('01-title');
  await page.evaluate(() => document.querySelector('.bbq-panel button').click());
  await sleep(600);
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); window.__test.spawnNow('pork'); });
  await sim(3.0);
  R.seeded = (await st()).customers.map((c) => ({ id: c.id, dish: c.dish, phase: c.phase, table: c.table, patience: +c.patience.toFixed(1) }));

  // ---- A: serve chain, zero screenshots while the grill is timing
  R.tapsA = await makeSkewer('A');
  await tp('teleportToStation', 'grill');
  await act('A:put-grill');
  await sim(6.6);
  let s = await st(); R.grill66 = brief(s).grill;
  s = await act('A:take-grill');
  R.carryCooked = s.carrying;
  await tp('teleportToStation', 'plate');
  s = await act('A:plate');
  R.carryPlated = s.carrying;
  const cust = (await st()).customers.find((c) => c.phase === 'seated');
  await tp('teleportToTable', cust?.table ?? 't1');
  R.serveLabel = (await st()).actionLabel;
  s = await act('A:serve');
  R.afterServe = { money: s.money, served: s.served, waste: s.waste, angry: s.angry, phase: s.phase };
  R.popups = await page.evaluate(() => [...document.querySelectorAll('.popup')].map((e) => { const b = e.getBoundingClientRect(); return { t: e.innerText, r: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] }; }));
  R.ordersAfterServe = await page.evaluate(() => [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.innerText.replace(/\n/g, ' ')));
  await shot('04-served');

  // ---- B: grill visuals (raw -> cooked -> burnt)
  R.tapsB = await makeSkewer('B');
  await tp('teleportToStation', 'grill');
  await act('B:put-grill');
  R.grillB0 = brief(await st()).grill;
  for (let i = 0; i < 40; i++) { const g = (await st()).grill[0]; if (g && g.stage === 'cooked') { R.cookedAt = +g.t.toFixed(2); await shot('03-grill-cooked'); break; } await sleep(250); }
  for (let i = 0; i < 60; i++) { const g = (await st()).grill[0]; if (g && g.stage === 'waste') { R.burnAt = +g.t.toFixed(2); await shot('05-grill-burn'); break; } await sleep(250); }

  // ---- ⑨ real click spam on the action button (12 clicks ~1s)
  const before = await st();
  const ar = await page.evaluate(() => { const b = document.querySelector('#bbq-act').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  for (let i = 0; i < 12; i++) { await page.mouse.click(ar.x, ar.y); await sleep(45); }
  await sim(0.3);
  const after = await st();
  R.spam = { before: brief(before), after: brief(after), errorsNow: R.errors.length };
  R.wasteAfterSpam = after.waste;
  await shot('06-spam');

  R.elapsedMs = Date.now() - R.t0;
  R.hudGeo = await page.evaluate(() => {
    const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return { stick: q('#bbq-stick'), act: q('#bbq-act'), orders: q('#bbq-orders'), hud: q('#bbq-hud'), popups: document.querySelectorAll('.popup').length };
  });
} catch (e) {
  R.fatal = String(e).slice(0, 400);
  try { await shot('99-fatal'); } catch {}
}
writeFileSync(`${OUT}/run-${TAG}.json`, JSON.stringify(R, null, 2));
console.log(TAG, 'shots=' + R.shots.join(','), 'errors=' + R.errors.length, 'fatal=' + (R.fatal ?? 'no'));
await browser.close();
