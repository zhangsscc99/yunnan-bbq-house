// Real-movement E2E: no teleports. Walks from the spawn point with the real
// collision code (tick with a move vector) and plays the whole loop:
// 取料 → 切配(进度条 3 拍) → 烤(6s 熟) → 装盘 → 上桌 → 收款.
// Usage: node e2e/walk.mjs   (BBQ_URL, default dev :5176)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const URL = process.env.BBQ_URL ?? 'http://127.0.0.1:5176/bbq/';
const AISLE_Z = 2.0;      // free row in front of the counters

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
let frames = 0;
for (let i = 0; i < 60 && frames <= 10; i++) {
  await page.waitForTimeout(1000);
  frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
}
assert.ok(frames > 10, 'page never rendered frames');

const state = () => page.evaluate(() => window.__test.state());
// walk straight to (x,z) with the real player.move(); returns true if reached
const goTo = (x, z) => page.evaluate(([tx, tz]) => {
  const t = window.__test;
  for (let i = 0; i < 400; i++) {
    const p = t.state().player;
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.12) return true;
    t.tick(0.05, 1, dx / d, dz / d);
  }
  return false;
}, [x, z]);
const walk = async (x, z, via = AISLE_Z) => {
  const p = (await state()).player;
  assert.ok(await goTo(p.x, via), `blocked walking to aisle from (${p.x.toFixed(1)},${p.z.toFixed(1)})`);
  assert.ok(await goTo(x, via), `blocked walking along aisle to x=${x.toFixed(1)}`);
  assert.ok(await goTo(x, z), `blocked reaching (${x.toFixed(1)},${z.toFixed(1)})`);
};
const act = () => page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
const sim = (sec) => page.evaluate((s) => window.__test.tick(0.05, Math.ceil(s / 0.05)), sec);
const expectAction = async (want) => {
  await sim(0.1);
  const s = await state();
  assert.equal(s.action, want, `expected action ${want}, got ${s.action} (${s.actionLabel}) at ${JSON.stringify(s.player)}`);
};

await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
assert.equal(await page.evaluate(() => window.__test.spawnNow('pork')), true);
await sim(4);
const guest = (await state()).customers.find((c) => c.phase === 'seated');
assert.ok(guest, 'guest never seated');
console.log(`guest at ${guest.table} wants ${guest.dish}`);

const sp = (await state()).stations;
const tb = (await state()).tables;

// idle hint at spawn must be actionable text, never empty
{
  const s = await state();
  assert.ok(s.actionLabel.length > 0, 'idle button caption is empty');
  console.log(`idle hint: "${s.actionLabel}"`);
}

await walk(sp['crate-pork'].x, sp['crate-pork'].z);
await expectAction('take-raw'); await act();
assert.equal((await state()).carrying?.stage, 'raw');
console.log('PASS 走到料箱并取料');

await walk(sp.chop.x, sp.chop.z);
await expectAction('chop'); await act();                // place
for (let i = 0; i < 3; i++) await act();                // 3 taps
assert.equal((await state()).chop.held, 'chopped');
await act();                                            // pick up
assert.equal((await state()).carrying?.stage, 'chopped');
console.log('PASS 走到砧板并切配');

await walk(sp.grill.x, sp.grill.z);
await expectAction('put-grill'); await act();
await sim(6.3);
let s = await state();
assert.ok(s.grill.some((g) => g && g.stage === 'cooked'), `not cooked after 6.3s: ${JSON.stringify(s.grill)}`);
await expectAction('take-grill'); await act();
assert.equal((await state()).carrying?.stage, 'cooked');
console.log('PASS 走到烤炉，6s 熟');

await walk(sp.plate.x, sp.plate.z);
await expectAction('plate'); await act();
assert.equal((await state()).carrying?.stage, 'plated');
console.log('PASS 走到装盘台装盘');

const t = tb[guest.table];
await walk(t.x, t.z);
await expectAction('serve');
const money0 = (await state()).money;
await act();
s = await state();
assert.ok(s.money > money0 && s.served === 1, `no payment: ${JSON.stringify({ money: s.money, served: s.served })}`);
console.log(`PASS 走到客桌上菜，收款 ¥${s.money}`);

assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
await browser.close();
console.log('WALK OK');
