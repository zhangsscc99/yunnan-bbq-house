// E2E: P1-2 — holding a plated dish nobody ordered must point at the bin (hint + button text),
// binning it counts as waste, and a correct dish still points at its table ("上菜").
// Usage: BBQ_URL=http://127.0.0.1:5176/bbq/ node e2e/wrong-dish.mjs

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const URL = process.env.BBQ_URL ?? process.env.E2E_BASE ?? 'http://127.0.0.1:5176/bbq/';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('crash', () => console.error('PAGE CRASH'));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
  let frames = 0;
  for (let i = 0; i < 60 && frames <= 30; i++) {
    await page.waitForTimeout(1500);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  assert.ok(frames > 30, 'page never rendered frames');

  const state = () => page.evaluate(() => window.__test.state());
  const sim = (sec) => page.evaluate((s) => window.__test.tick(0.05, Math.ceil(s / 0.05)), sec);
  const at = (id) => page.evaluate((i) => { window.__test.teleportToStation(i); window.__test.tick(0.05, 2); }, id);
  const atTable = (id) => page.evaluate((i) => { window.__test.teleportToTable(i); window.__test.tick(0.05, 2); }, id);
  const press = (n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n);
  const keepPatient = () => page.evaluate(() => window.__test.setPatience(600));

  // real cook chain: crate → chop (3 taps + pick up) → grill (6s) → take → plate
  const makePlatedPork = async () => {
    await at('crate-pork'); await press();
    await at('chop'); await press(1 + 3 + 1);
    await at('grill'); await press(); await sim(6.5); await press();
    await at('plate'); await press();
    const s = await state();
    assert.deepEqual(s.carrying, { dish: 'pork', stage: 'plated' }, `expected plated pork, got ${JSON.stringify(s.carrying)}`);
  };

  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
  await sim(0.2);
  assert.equal((await state()).waste, 0, 'waste starts at 0');

  // only one guest, wants mushroom
  assert.equal(await page.evaluate(() => window.__test.spawnNow('mushroom')), true);
  await sim(5);
  await keepPatient();
  const wrong = (await state()).customers.find((c) => c.phase === 'seated');
  assert.ok(wrong && wrong.dish === 'mushroom', `mushroom guest never seated: ${JSON.stringify(wrong)}`);

  await makePlatedPork();
  await keepPatient();

  // A1: nobody wants pork -> hint points at the bin
  await at('crate-pork');
  let s = await state();
  assert.ok(s.hint, 'A1) hint must not be null');
  assert.equal(s.hint.id, 'bin', `A1) hint.id should be bin, got ${s.hint.id}`);
  console.log(`PASS A1) 无人点 pork，手持 plated → hint=${JSON.stringify(s.hint)}`);

  // A2: standing at the wrong table -> no action, label tells where to go
  await atTable(wrong.table);
  s = await state();
  assert.ok(Math.hypot(s.player.x - s.tables[wrong.table].x, s.player.z - s.tables[wrong.table].z) <= 1.15, 'A2) within 1.15m of the table');
  assert.equal(s.action, 'none', `A2) action should be none, got ${s.action}`);
  assert.ok(s.actionLabel.includes('丢'), `A2) label must mention 丢: ${s.actionLabel}`);
  assert.ok(s.actionLabel.includes('这桌要的是'), `A2) label keeps the dish name: ${s.actionLabel}`);
  console.log(`PASS A2) 错桌边 action=none，按钮「${s.actionLabel}」`);

  // A3: bin it
  await at('bin');
  s = await state();
  assert.equal(s.action, 'discard', `A3) action at bin should be discard, got ${s.action}`);
  assert.equal(s.waste, 0, 'A3) waste before = 0');
  await press();
  s = await state();
  assert.equal(s.carrying, null, 'A3) hands must be empty after discard');
  assert.equal(s.waste, 1, `A3) waste should be 1, got ${s.waste}`);
  console.log(`PASS A3) 丢弃后 carrying=null，waste 0 → ${s.waste}`);

  // A4: a pork guest is seated + correct dish in hand -> hint is that table, button says 上菜
  assert.equal(await page.evaluate(() => window.__test.spawnNow('pork')), true);
  await sim(5);
  await keepPatient();
  const right = (await state()).customers.find((c) => c.phase === 'seated' && c.dish === 'pork');
  assert.ok(right, 'A4) pork guest never seated');
  await makePlatedPork();
  await keepPatient();
  await at('crate-pork');
  s = await state();
  assert.ok(s.hint && s.hint.id !== 'bin', `A4) hint must not be bin: ${JSON.stringify(s.hint)}`);
  assert.equal(s.hint.id, right.table, `A4) hint should be the pork guest's table ${right.table}, got ${s.hint.id}`);
  await atTable(right.table);
  s = await state();
  assert.equal(s.action, 'serve', `A4) action should be serve, got ${s.action}`);
  assert.ok(s.actionLabel.includes('上菜'), `A4) label must contain 上菜: ${s.actionLabel}`);
  console.log(`PASS A4) 正确菜 hint=${right.table}（非 bin），按钮「${s.actionLabel}」`);

  assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
  console.log('WRONG-DISH OK (0 JS errors)');
} finally {
  await browser.close();
}
