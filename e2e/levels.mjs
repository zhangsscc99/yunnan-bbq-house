// E2E: B-012 — "next level" must be real. Lv.1 (¥180) → pass → Lv.2 (¥260) with a visible level tag,
// last level has no next button / no "解锁下一关" promise, and bbq.level survives reload.
// Game time is driven by the synchronous __test.tick() hook (render rate irrelevant).
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ node e2e/levels.mjs   (default: local pm2 :3035)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('crash', () => console.error('PAGE CRASH'));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const waitFrames = async () => {
  let frames = 0;
  for (let i = 0; i < 60 && frames <= 30; i++) {
    await page.waitForTimeout(1500);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  assert.ok(frames > 30, 'page never rendered frames');
};
// software-GL keeps the main thread busy, so a plain page.reload() can stall: navigate with a long timeout
const reload = () => page.goto(BASE, { waitUntil: 'commit', timeout: 120000 });
const state = () => page.evaluate(() => window.__test.state());
const hudText = () => page.evaluate(() => document.querySelector('#bbq-hud .topbar')?.textContent ?? '');
const panelText = () => page.evaluate(() => document.querySelector('.bbq-panel')?.textContent ?? '');
const lsLevel = () => page.evaluate(() => localStorage.getItem('bbq.level'));
// give the run a passing score, then run the clock out → results panel
const finishPassing = () => page.evaluate(() => {
  window.__test.pauseSpawns(true);
  const t = window.__test.state().levelTarget;
  window.__game.money = t + 10;
  window.__test.tick(0.05, 4000);
  return window.__test.state().phase;
});

try {
  await page.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
  await waitFrames();

  // a) fresh start: level 1, target 180, HUD tag
  await page.evaluate(() => window.__test.start());
  let s = await state();
  assert.equal(s.level, 1, 'a) level');
  assert.equal(s.levelTarget, 180, 'a) levelTarget');
  assert.match(await hudText(), /第 1 关/, 'a) HUD 第 1 关');
  assert.equal(await lsLevel(), null, 'a) bbq.level must not be written before entering Lv.2');
  console.log('PASS a) 开局 level=1 target=180，HUD「第 1 关」');

  // b) pass Lv.1 → results promise Lv.2 → click → real Lv.2
  assert.equal(await finishPassing(), 'results', 'b) phase after time out');
  assert.equal(await lsLevel(), null, 'b) endLevel must not write bbq.level early');
  const p1 = await panelText();
  assert.match(p1, /目标达成，进入第 2 关/, `b) verdict: ${p1}`);
  assert.doesNotMatch(p1, /解锁下一关|下 一 关/, 'b) stale copy');
  await page.click('[data-btn="next"]');
  s = await state();
  assert.equal(s.phase, 'playing', 'b) phase');
  assert.equal(s.level, 2, 'b) level');
  assert.equal(s.levelTarget, 260, 'b) levelTarget');
  assert.equal(s.money, 0, 'b) money reset');
  assert.match(await hudText(), /第 2 关/, 'b) HUD 第 2 关');
  assert.equal(await lsLevel(), '2', 'b) bbq.level');
  console.log(`PASS b) 点「进入第 2 关」→ playing level=2 target=260 timeLeft=${s.timeLeft.toFixed(1)}，bbq.level=2`);

  // c) Lv.2 is harder (spawn cadence) and its pass screen has no Lv.3 promise
  const cfg = await page.evaluate(() => window.__game.cfg);
  assert.ok(cfg.spawnEvery[1] < 20 && cfg.spawnEvery[0] < 12, `c) spawnEvery tightened: ${cfg.spawnEvery}`);
  assert.equal(await finishPassing(), 'results', 'c) phase after time out');
  const p2 = await panelText();
  assert.match(p2, /全部关卡通关/, `c) verdict: ${p2}`);
  assert.doesNotMatch(p2, /第 3 关|解锁下一关|下 一 关/, `c) promise of a non-existent level: ${p2}`);
  const nextBtn = await page.$('[data-btn="next"]');
  assert.ok(!nextBtn || (await nextBtn.isDisabled()), 'c) main button must be absent or disabled');
  await page.evaluate(() => window.__game.nextLevel());
  s = await state();
  assert.equal(s.phase, 'results', 'c) nextLevel() on last level is a no-op');
  assert.equal(s.level, 2, 'c) still level 2');
  console.log('PASS c) Lv.2 结算「全部关卡通关！」无主按钮、无第 3 关/解锁文案，nextLevel() no-op');

  // d) reload keeps level 2
  await reload();
  await waitFrames();
  assert.equal(await lsLevel(), '2', 'd) bbq.level after reload');
  await page.evaluate(() => window.__test.start());
  s = await state();
  assert.equal(s.level, 2, 'd) level after reload');
  assert.equal(s.levelTarget, 260, 'd) target after reload');
  assert.match(await hudText(), /第 2 关/, 'd) HUD 第 2 关');
  console.log('PASS d) reload 后 level=2 target=260，HUD「第 2 关」');

  // e) garbage / out-of-range saves fall back to level 1
  for (const bad of ['abc', '0', '-3', '99x']) {
    await page.evaluate((v) => localStorage.setItem('bbq.level', v), bad);
    await reload();
    await waitFrames();
    assert.equal((await state()).level, 1, `e) bbq.level=${bad} → 1`);
  }
  await page.evaluate(() => localStorage.setItem('bbq.level', '99'));
  await reload();
  await waitFrames();
  assert.equal((await state()).level, 2, 'e) bbq.level=99 clamps to last level');
  console.log('PASS e) 非法存档归 1，越界取最后一关');

  assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
  console.log('LEVELS OK');
} finally {
  await browser.close();
}
