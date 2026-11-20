// E2E smoke: drives the real game via __test hooks. __test.tick(dt,n) steps
// the simulation synchronously, so wall-clock render rate doesn't matter.
// Asserts: next-step hint (料箱→切配台→烤炉→装盘台→桌→料箱), 拿料→切→烤→装盘→上菜→收款 + 烤焦丢弃 + 耐心归零愤怒离店.
// Usage: node e2e/smoke.mjs   (set BBQ_URL; default dev :5176)

const { chromium } = await import('playwright');
const { mkdirSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const URL = process.env.BBQ_URL ?? 'http://127.0.0.1:5176/bbq/';
mkdirSync('e2e/shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
// manual polling — rAF-based waitForFunction starves under SwiftShader
let frames = 0;
for (let i = 0; i < 60 && frames <= 30; i++) {
  await page.waitForTimeout(1500);
  frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
}
if (frames <= 30) {
  console.error('FAIL — page never rendered frames');
  process.exit(1);
}

const state = () => page.evaluate(() => window.__test.state());
const test = (expr) => page.evaluate(`window.__test.${expr}`);
const sim = (sec) => test(`tick(0.05, ${Math.ceil(sec / 0.05)})`);
// press the action button then flush one sim step so it executes
const act = () => page.evaluate(() => {
  window.__test.press();
  window.__test.tick(0.05, 2);
});

async function check(desc, fn, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const s = await state();
    if (fn(s)) return s;
    await sim(0.4);
  }
  const s = await state();
  throw new Error(`check failed: ${desc}; last=${JSON.stringify(s)}`);
}
const actionIs = async (want, desc) => {
  const s = await check(desc ?? `action=${want}`, (s) => s.action === want);
  return s;
};

// hint must name the expected target and sit on that station/table (±0.3)
async function hintIs(id, kind) {
  const s = await check(`hint=${id}`, (s) => s.hint?.id === id);
  assert.equal(s.hint.kind, kind, `hint kind for ${id}`);
  const ref = (kind === 'table' ? s.tables : s.stations)[id];
  assert.ok(ref, `no state entry for ${id}`);
  assert.ok(Math.abs(s.hint.x - ref.x) <= 0.3 && Math.abs(s.hint.z - ref.z) <= 0.3,
    `hint (${s.hint.x},${s.hint.z}) off target ${id} (${ref.x},${ref.z})`);
  return s;
}

// --- start (pause auto-spawn for deterministic guests) ---
await test('start()');
await test('pauseSpawns(true)');
assert.equal((await state()).phase, 'playing');
await hintIs('crate-pork', 'station');

// --- seat a customer who wants pork ---
assert.equal(await test("spawnNow('pork')"), true, 'no free table for spawn');
await sim(3);
const seatedS = await check('guest seated', (s) =>
  s.customers.some((c) => c.phase === 'seated' && c.dish === 'pork'));
const guest = seatedS.customers.find((c) => c.phase === 'seated' && c.dish === 'pork');
console.log(`guest seated at ${guest.table} wants ${guest.dish}`);

// --- 取料 ---
await test("teleportToStation('crate-pork')");
await sim(0.1);
await actionIs('take-raw', 'action=take-raw at crate');
await act();
await check('carrying raw', (s) => s.carrying?.stage === 'raw');
await hintIs('chop', 'station');
console.log('PASS 取料(raw skewer)');

// --- 切配: place + 3 taps + pick up ---
await test("teleportToStation('chop')");
await sim(0.1);
await actionIs('chop', 'action=chop at board');
await act();                                            // place
await check('raw on board', (s) => s.chop?.held === 'raw' && !s.carrying);
for (let i = 0; i < 3; i++) await act();                // 3 taps
await check('chopped on board', (s) => s.chop?.held === 'chopped');
await act();                                            // pick up
await check('carrying chopped', (s) => s.carrying?.stage === 'chopped');
await hintIs('grill', 'station');
console.log('PASS 切配(3 taps → chopped)');

// --- 炭烤: place, sim 6.5s, take ---
await test("teleportToStation('grill')");
await sim(0.1);
await actionIs('put-grill', 'action=put-grill');
await act();
await check('on grill', (s) => s.grill.some((g) => g && g.stage === 'chopped') && !s.carrying);
await sim(6.5);
await check('cooked on grill', (s) => s.grill.some((g) => g && g.stage === 'cooked'));
await actionIs('take-grill', 'action=take-grill');
await test("teleportToStation('crate-pork')");           // empty-handed + ready skewer → grill beats crate
await sim(0.1);
await hintIs('grill', 'station');
await test("teleportToStation('grill')");
await sim(0.1);
await act();
await check('carrying cooked', (s) => s.carrying?.stage === 'cooked');
await hintIs('plate', 'station');
console.log('PASS 炭烤(6s → cooked)');

// --- 装盘 ---
await test("teleportToStation('plate')");
await sim(0.1);
await actionIs('plate', 'action=plate');
await act();
await check('carrying plated', (s) => s.carrying?.stage === 'plated');
await hintIs(guest.table, 'table');
console.log('PASS 装盘');

// --- 上菜 + 收款 ---
await test(`teleportToTable('${guest.table}')`);
await sim(0.1);
await actionIs('serve', 'action=serve at table');
const money0 = (await state()).money;
await act();
const paid = await check('money in', (s) => s.money > money0);
assert.equal(paid.served, 1);
assert.equal(paid.carrying, null);
await hintIs('crate-pork', 'station');
console.log(`PASS 上菜→收款 +¥${paid.money}`);

// --- 烤焦 → 丢弃 ---
await test("teleportToStation('crate-pork')");
await sim(0.1);
await act();
await test("teleportToStation('chop')");
await sim(0.1);
await act();
for (let i = 0; i < 3; i++) await act();
await act();                                            // pick up chopped
await test("teleportToStation('grill')");
await sim(0.1);
await act();                                            // on grill
await check('second skewer grilling', (s) => s.grill.some((g) => g && g.stage === 'chopped'));
await sim(13);                                          // > burnTime → waste
await check('burnt on grill', (s) => s.grill.some((g) => g && g.stage === 'waste'));
await act();                                            // take burnt
await check('carrying waste', (s) => s.carrying?.stage === 'waste');
await hintIs('bin', 'station');
await test("teleportToStation('bin')");
await sim(0.1);
await actionIs('discard', 'action=discard at bin');
await act();
await check('waste counted', (s) => s.waste === 1 && !s.carrying);
await hintIs('crate-pork', 'station');
console.log('PASS 烤焦→丢弃(waste=1)');

// --- 耐心归零 → 愤怒离店 ---
assert.equal(await test("spawnNow('mushroom')"), true);
await sim(3);
const g2s = await check('guest2 seated', (s) =>
  s.customers.some((c) => c.phase === 'seated' && c.dish === 'mushroom'));
const guest2 = g2s.customers.find((c) => c.phase === 'seated' && c.dish === 'mushroom');
const angry0 = (await state()).angry;
await test('setPatience(0.01)');
await sim(0.5);
await check('angry flag', (s) => s.angry > angry0);
await sim(8);                                           // walk out
await check('angry guest gone', (s) => !s.customers.some((c) => c.id === guest2.id));
console.log('PASS 耐心归零→愤怒离店(angry+1)');

// --- perf budget (draw calls ≤120, tris ≤150k) ---
await sim(0.5);
const final = await state();
assert.ok(final.calls <= 120, `draw calls ${final.calls} > 120`);
assert.ok(final.tris <= 150000, `tris ${final.tris} > 150k`);
console.log(`perf: ${final.calls} calls / ${final.tris} tris`);

assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
await page.screenshot({ path: 'e2e/shots/smoke-end.png', timeout: 90000 });
await browser.close();
console.log('SMOKE OK');
