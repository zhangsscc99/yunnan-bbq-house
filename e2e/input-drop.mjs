// E2E: B-063 (P0) — a tap must never be destroyed on a frame that runs zero simulation steps
// (120Hz screens: dt≈8.3ms < STEP 16.7ms). Every case runs inside ONE page.evaluate so the live rAF loop
// cannot interleave and the accumulator is deterministic. Taps go through the real #bbq-act pointerdown
// handler (touch pointerType) or __test.press().
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ node e2e/input-drop.mjs   (default: the local 3035 build)
//        E2E_RUNS=3 — repeat the whole suite N times (default 1; acceptance runs it 3×)
//        E2E_ONLY=a — run only case (a) (used to prove the assertion fails on the pre-fix build)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Number(process.env.E2E_RUNS ?? 1);
const ONLY = process.env.E2E_ONLY ?? '';

const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError)
  && /has been closed|SharedImageManager|non-existent mailbox|PAGE CRASH|Target closed/.test(String(e?.message ?? e));

/** retry only on environment crashes (renderer killed, closed target); assertion failures propagate at once */
async function withRetry(tag, fn) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!isEnvCrash(e) || attempt >= MAX_RETRIES) throw e;
      console.log(`RETRY ${tag} env crash: ${String(e?.message ?? e).split('\n')[0]}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

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
    const close = async () => { await page.close().catch(() => {}); await browser.close().catch(() => {}); };
    return { page, errors, close };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

/** runs inside the page; `body` is a function source using helpers {T, S, settle, tap, atStation, fresh} */
const inPage = (page, body, arg) => page.evaluate(({ src, arg }) => {
  const T = window.__test;
  const S = () => T.state();
  // run 1ms frames until one simulation step really happened (timeLeft moves) → accumulator ≈ 0 (<1ms)
  const settle = () => {
    const t0 = S().timeLeft;
    for (let i = 0; i < 40 && S().timeLeft === t0; i++) T.tick(0.001, 1);
  };
  const tap = () => document.querySelector('#bbq-act')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
  const atStation = (id) => { T.teleportToStation(id); T.tick(0.05, 2); };
  const fresh = () => { T.start(); T.pauseSpawns(true); T.tick(0.05, 2); };
  return new Function('T', 'S', 'settle', 'tap', 'atStation', 'fresh', 'arg', `return (${src})(arg)`)(T, S, settle, tap, atStation, fresh, arg);
}, { src: body.toString(), arg });

const FRAME = 1 / 120; // 120Hz

const runViewport = (tag, viewport) => withRetry(tag, () => runViewportOnce(tag, viewport));
async function runViewportOnce(tag, viewport) {
  const { page, errors, close } = await open(BASE, viewport);
  try {
    // (a) press, one 5ms frame (zero steps), then a normal frame → the pickup must still happen
    if (!ONLY || ONLY === 'a') {
      const r = await inPage(page, () => {
        fresh(); atStation('crate-pork');
        const before = S();
        settle();
        T.press(); T.tick(0.005, 1); T.tick(0.05, 1);
        return { action: before.action, carrying: S().carrying };
      });
      assert.equal(r.action, 'take-raw', `${tag} (a) setup: expected take-raw at crate-pork, got ${r.action}`);
      assert.ok(r.carrying, `${tag} (a) press swallowed on the zero-step frame: carrying=${JSON.stringify(r.carrying)}`);
      console.log(`PASS ${tag} (a) press→tick(5ms)→tick(50ms) 取到料 carrying=${JSON.stringify(r.carrying)}`);
    }
    if (ONLY) { assert.equal(errors.length, 0, `${tag} JS errors:\n${errors.join('\n')}`); return; }

    // (b) five taps at the crate, one 5ms frame between each → picked up once, never duplicated
    {
      const r = await inPage(page, () => {
        fresh(); atStation('crate-pork');
        settle();
        for (let i = 0; i < 5; i++) { tap(); T.tick(0.005, 1); }
        T.tick(0.05, 3);
        const s = S();
        return { carrying: s.carrying, chop: s.chop, grill: s.grill };
      });
      assert.ok(r.carrying, `${tag} (b) nothing carried after 5 taps`);
      assert.equal(r.carrying.stage, 'raw', `${tag} (b) carried ${JSON.stringify(r.carrying)}`);
      assert.equal(r.chop.held, null, `${tag} (b) duplicated onto the board: ${JSON.stringify(r.chop)}`);
      assert.ok(r.grill.every((g) => g === null), `${tag} (b) duplicated onto the grill: ${JSON.stringify(r.grill)}`);
      console.log(`PASS ${tag} (b) 连点5次 手持1个 ${JSON.stringify(r.carrying)} 未复制`);
    }

    // (c) raw skewer on the board; 3 taps at 120Hz frames → chopLeft 3→0 and 已切好 ✓
    {
      const r = await inPage(page, (FRAME) => {
        fresh(); atStation('crate-pork'); T.press(); T.tick(0.05, 2);
        atStation('chop'); T.press(); T.tick(0.05, 2);
        const start = S().chop;
        settle();
        for (let i = 0; i < 3; i++) { tap(); T.tick(FRAME, 1); }
        T.tick(FRAME, 12);
        const txt = document.querySelector('#bbq-chop .cb .cb-txt')?.textContent ?? null;
        return { start, end: S().chop, txt };
      }, FRAME);
      assert.deepEqual(r.start, { held: 'raw', chopLeft: 3 }, `${tag} (c) setup board ${JSON.stringify(r.start)}`);
      assert.equal(r.end.chopLeft, 0, `${tag} (c) chopLeft ${r.end.chopLeft} != 0 — taps lost`);
      assert.equal(r.end.held, 'chopped', `${tag} (c) held ${r.end.held}`);
      assert.match(r.txt ?? '', /已切好 ✓/, `${tag} (c) badge text "${r.txt}"`);
      console.log(`PASS ${tag} (c) 3 连点@120Hz chopLeft 3→0 「${r.txt}」`);
    }

    assert.equal(errors.length, 0, `${tag} JS errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 JS error`);
  } finally {
    await close();
  }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  await runViewport('竖屏390x844', { width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 1500));
  await runViewport('横屏844x390', { width: 844, height: 390 });
}

console.log('INPUT OK');
