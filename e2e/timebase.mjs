// E2E: B-035 — game clock must follow the wall clock (fixed-step accumulator), regardless of render fps.
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ node e2e/timebase.mjs
//        E2E_RUNS=2 — repeat the whole suite N times in one process (default 1)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Number(process.env.E2E_RUNS ?? 1);

const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError) && /has been closed|Target page/.test(String(e?.message ?? e));

async function open(url, viewport) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport, hasTouch: true });
    const errors = [];
    page.on('crash', () => errors.push('PAGE CRASH'));
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
    let frames = 0;
    for (let i = 0; i < 60 && frames <= 30; i++) {
      await page.waitForTimeout(1000);
      frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(frames > 30, `page never rendered frames (${url})`);
    await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
    const close = async () => { await page.close().catch(() => {}); await browser.close().catch(() => {}); };
    return { page, errors, close };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!isEnvCrash(e) || attempt >= MAX_RETRIES) throw e;
      console.log(`RETRY ${label}: environment crash (${String(e.message).split('\n')[0]}) — retry ${attempt + 1}/${MAX_RETRIES}`);
    }
  }
}

const state = (page) => page.evaluate(() => window.__test.state());
const tick = (page, dt, n, mx = 0, mz = 0) => page.evaluate(([a, b, c, d]) => window.__test.tick(a, b, c, d), [dt, n, mx, mz]);

const runOnce = (run) => withRetry(`run ${run}`, async () => {
  const { page, errors, close } = await open(BASE, { width: 390, height: 844 });
  try {
    await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });

    // a) low-fps clock: 6 frames of rawDt=1.0s → ~6s of game time
    let t0 = (await state(page)).timeLeft;
    await tick(page, 1.0, 6);
    let d = t0 - (await state(page)).timeLeft;
    assert.ok(d >= 5.4 && d <= 6.6, `a) 1fps clock: timeLeft Δ${d.toFixed(3)}s not in 5.4–6.6`);
    console.log(`PASS run ${run} a) 低帧时钟 tick(1.0,6) timeLeft Δ=${d.toFixed(3)}s`);

    // b) low-fps displacement: 2 frames of 1s at full stick → 3.2 m/s × 2s.
    // Start in the free dining-room lane (-3.2, 1.5) and walk +x: walking +z from (0,0) hits the counter wall after ~2.2m.
    const [x0, z0] = [-3.2, 1.5];
    await page.evaluate(([x, z]) => window.__test.teleport(x, z), [x0, z0]);
    await tick(page, 1.0, 2, 1, 0);
    const p = (await state(page)).player;
    const dist = Math.hypot(p.x - x0, p.z - z0);
    assert.ok(dist >= 5.5 && dist <= 7.5, `b) displacement ${dist.toFixed(2)}m not in 5.5–7.5`);
    console.log(`PASS run ${run} b) 低帧位移 tick(1.0,2,1,0) 位移=${dist.toFixed(2)}m`);

    // c) 60fps regression
    t0 = (await state(page)).timeLeft;
    await tick(page, 1 / 60, 60);
    d = t0 - (await state(page)).timeLeft;
    assert.ok(d >= 0.85 && d <= 1.15, `c) 60fps clock: Δ${d.toFixed(3)}s not in 0.85–1.15`);
    console.log(`PASS run ${run} c) 60fps 回归 tick(1/60,60) timeLeft Δ=${d.toFixed(3)}s`);

    assert.equal(errors.length, 0, `JS errors:\n${errors.join('\n')}`);
    console.log(`PASS run ${run} 0 JS error`);
  } finally {
    await close();
  }
});

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  await runOnce(run);
}

console.log(`TIMEBASE OK (${RUNS} run${RUNS > 1 ? 's' : ''})`);
