// E2E: B-003 — spawn must sit outside every station/table interaction circle and
// the idle action button must be a guide, not a dead key. Mobile portrait 390×844.
// Usage: node e2e/spawn.mjs   (set BBQ_URL; default dev :5176)

const { chromium } = await import('playwright');
const { build } = await import('esbuild');
const { mkdirSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const URL = process.env.BBQ_URL ?? 'http://127.0.0.1:5176/bbq/';
const MIN_DIST = 1.20;     // GAME-DESIGN §5/§6: interact radius 1.15 + 0.05 margin
mkdirSync('e2e/shots', { recursive: true });

// layout constants straight from source (bundled on the fly; the file is .ts)
const out = await build({
  stdin: {
    contents: "export { STATIONS, TABLES, PLAYER_SPAWN, cellToWorld, isWalkable } from './src/world/layout.ts';",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error',
});
const { STATIONS, TABLES, PLAYER_SPAWN, cellToWorld, isWalkable } = await import(
  `data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
let frames = 0;
for (let i = 0; i < 60 && frames <= 30; i++) {
  await page.waitForTimeout(1500);
  frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
}
if (frames <= 30) { console.error('FAIL — page never rendered frames'); process.exit(1); }

const state = () => page.evaluate(() => window.__test.state());
const test = (expr) => page.evaluate(`window.__test.${expr}`);

async function until(desc, fn, tries = 200) {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await page.waitForTimeout(100);
  }
  throw new Error(`timeout: ${desc}`);
}

await test('start()');
await test('pauseSpawns(true)');
await test('tick(0.05, 2)');

// wait on frames, not wall-clock: under swiftshader the HUD is only written on a rendered frame
const f0 = await page.evaluate(() => window.__frames ?? 0);
await page.evaluate(() => window.__test.tick(0.05, 3));
for (let i = 0; i < 300; i++) {
  if (await page.evaluate(() => window.__frames ?? 0) >= f0 + 3) break;
  await page.waitForTimeout(100);
}
assert.ok(await page.evaluate(() => window.__frames ?? 0) >= f0 + 3, 'frames did not advance by 3 within 30s');

// a) opening state: nothing in reach
const s0 = await state();
assert.equal(s0.phase, 'playing');
assert.equal(await page.evaluate(() => window.__game.current.action), 'none', 'a) opening action');
assert.deepEqual(await page.evaluate(() => {
  const c = window.__game.current;
  return [!!c.station, !!c.table];
}), [false, false], 'a) spawn must be outside every station/table circle (resolveInteraction hit nothing)');
console.log(`PASS a) 开局 action=none (player ${s0.player.x.toFixed(2)},${s0.player.z.toFixed(2)})`);

// b) idle button is a guide: fully opaque + non-empty caption
const btn = await until('#bbq-act styled', async () => {
  const r = await page.evaluate(() => {
    const el = document.getElementById('bbq-act');
    return { opacity: getComputedStyle(el).opacity, cap: el.querySelector('.cap').textContent };
  });
  return r.cap ? r : null;
});
assert.equal(btn.opacity, '1', 'b) opacity');
assert.ok(btn.cap.trim().length > 0, 'b) caption');
console.log(`PASS b) #bbq-act opacity=1 cap="${btn.cap}"`);

// c) click → visible guide toast within 300ms (DOM, not screenshot)
assert.equal(await page.evaluate(() => {
  const g = document.getElementById('bbq-guide');
  return !!g && getComputedStyle(g).display !== 'none';
}), false, 'c) toast must be hidden before click');
const before = await state();
await page.tap('#bbq-act');
await page.evaluate(() => window.__test.tick(0.05, 1));      // flush the queued press (render rate under swiftshader is slow)
const t0 = Date.now();
const guide = await until('guide toast', async () => page.evaluate(() => {
  const g = document.getElementById('bbq-guide');
  if (!g) return null;
  const cs = getComputedStyle(g);
  const r = g.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && g.textContent.trim()
    ? { text: g.textContent, x: r.x, y: r.y, w: r.width, h: r.height } : null;
}), 3);
assert.ok(Date.now() - t0 <= 300, 'c) toast within 300ms');
assert.ok(guide.x >= 0 && guide.x + guide.w <= 390 && guide.y >= 0 && guide.y + guide.h <= 844, 'c) toast inside viewport');
const after = await state();
assert.deepEqual([after.carrying, after.money, after.player.x, after.player.z],
  [before.carrying, before.money, before.player.x, before.player.z], 'c) press must not consume input');
console.log(`PASS c) 引导提示出现 "${guide.text}"`);
await page.screenshot({ path: 'e2e/shots/spawn-guide.png', timeout: 90000 });
await page.waitForTimeout(2100);
assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('bbq-guide')).display), 'none', 'c) toast gone after 2s');
console.log('PASS c) 2s 后消失');

// d) spawn clear of every usePos by > 1.20
const sp = cellToWorld(PLAYER_SPAWN[0], PLAYER_SPAWN[1]);
assert.ok(isWalkable(sp.x, sp.z), 'd) spawn walkable');
assert.ok(Math.abs(s0.player.x - sp.x) < 1e-6 && Math.abs(s0.player.z - sp.z) < 1e-6, 'd) player at PLAYER_SPAWN');
const use = [...STATIONS.map((s) => [s.id, s.use]), ...TABLES.map((t) => [t.id, t.use])]
  .map(([id, u]) => [id, cellToWorld(u[0], u[1])]);
let min = Infinity, minId = '';
for (const [id, u] of use) {
  const d = Math.hypot(sp.x - u.x, sp.z - u.z);
  if (d < min) { min = d; minId = id; }
}
assert.ok(min > MIN_DIST, `d) min usePos distance ${min.toFixed(3)} (${minId}) <= ${MIN_DIST}`);
console.log(`PASS d) 出生格 (${PLAYER_SPAWN}) 到 ${use.length} 个 usePos 最小距离 ${min.toFixed(3)}m (${minId}) > ${MIN_DIST}`);

// e) regression: standing at the crate → take-raw, button enabled
await test("teleportToStation('crate-pork')");
await test('tick(0.05, 2)');
const s1 = await state();
assert.equal(s1.action, 'take-raw', 'e) action at crate');
await until('button live at crate', async () => page.evaluate(() =>
  getComputedStyle(document.getElementById('bbq-act')).opacity === '1'));
console.log('PASS e) 料箱旁 action=take-raw');

assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
await browser.close();
console.log('SPAWN OK');
