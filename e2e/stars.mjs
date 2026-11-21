// E2E: B-106 — HUD live stars (#bbq-hud .stars) and results panel (.stars-big) must share
// a single calcStars() source of truth, enforce hard caps (served===0 / angry>=3 -> max 1★),
// and expose data-stars="N" + aria-label="评级 N/3" on both containers.
// Usage: E2E_BASE=http://127.0.0.1:4180/bbq/ [E2E_RUNS=3] node e2e/stars.mjs

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError)
  && /has been closed|Target page|Target closed|browser.*closed|SharedImageManager|crash|ERR_ABORTED/i.test(String(e?.message ?? e));

const VIEWPORTS = [
  { tag: '竖屏 390x844', viewport: { width: 390, height: 844 } },
  { tag: '横屏 844x390', viewport: { width: 844, height: 390 } },
];

const CASES = [
  { id: 'A', input: { money: 190, served: 0, angry: 2, waste: 0 }, expected: 1 },
  { id: 'B', input: { money: 190, served: 0, angry: 5, waste: 0 }, expected: 1 },
  { id: 'C', input: { money: 190, served: 4, angry: 0, waste: 0 }, expected: 3 },
  { id: 'D', input: { money: 130, served: 3, angry: 1, waste: 0 }, expected: 2 },
];

async function openPage(url, viewport) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
    const ctx = await browser.newContext({ viewport, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('crash', () => errors.push('PAGE CRASH'));
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) errors.push(m.text());
    });
    await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
    let frames = 0;
    for (let i = 0; i < 60 && frames <= 30; i++) {
      await page.waitForTimeout(1000);
      frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(frames > 30, `page never rendered frames (${url})`);
    const close = async () => {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
    };
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
      console.log(`RETRY ${label}: env crash (${String(e.message).split('\n')[0]}) ${attempt + 1}/${MAX_RETRIES}`);
    }
  }
}

async function runViewportOnce(runIdx, tag, viewport) {
  const { page, errors, close } = await openPage(BASE, viewport);
  try {
    for (const tc of CASES) {
      const res = await page.evaluate((inp) => {
        const readStars = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const filled = [...el.querySelectorAll('svg')]
            .filter((s) => s.getAttribute('fill') && s.getAttribute('fill') !== 'none')
            .length;
          return {
            dataStars: el.getAttribute('data-stars'),
            ariaLabel: el.getAttribute('aria-label'),
            filled,
          };
        };

        window.__test.start();
        window.__test.pauseSpawns(true);
        const startBigPresent = !!document.querySelector('.stars-big');
        const st = window.__test.state();

        window.__game.money = inp.money;
        window.__game.served = inp.served;
        window.__game.angry = inp.angry;
        window.__game.waste = inp.waste;

        // Fast-forward near closing while still in playing phase
        let guard = 0;
        while (window.__game.phase === 'playing' && window.__game.timeLeft > 0.5 && guard++ < 2000) {
          window.__test.tick(0.25, 1);
        }

        // Single-step until the exact frame right before closing -> results transition
        let preHud = null;
        let preTimeLeft = null;
        let prePhase = null;
        for (let i = 0; i < 200 && window.__game.phase === 'playing'; i++) {
          preHud = readStars('#bbq-hud .stars');
          preTimeLeft = window.__game.timeLeft;
          prePhase = window.__game.phase;
          window.__test.tick(0.02, 1);
        }

        return {
          level: st.level,
          levelTarget: st.levelTarget,
          startBigPresent,
          prePhase,
          preTimeLeft,
          preHud,
          postPhase: window.__game.phase,
          postBig: readStars('.stars-big'),
          postHud: readStars('#bbq-hud .stars'),
          starsNow: window.__game.starsNow(),
        };
      }, tc.input);

      const label = `run#${runIdx} ${tag} ${tc.id}`;
      const expStr = String(tc.expected);
      const expAria = `评级 ${tc.expected}/3`;

      assert.equal(res.level, 1, `${label}: expected level 1, got ${res.level}`);
      assert.equal(res.levelTarget, 180, `${label}: expected target 180, got ${res.levelTarget}`);
      assert.equal(res.startBigPresent, false, `${label}: stale .stars-big after start()`);
      assert.equal(res.prePhase, 'playing', `${label}: prePhase=${res.prePhase}`);
      assert.ok(
        res.preTimeLeft > 0 && res.preTimeLeft <= 0.05,
        `${label}: preTimeLeft=${res.preTimeLeft} not 1 frame before close`,
      );
      assert.equal(res.postPhase, 'results', `${label}: postPhase=${res.postPhase}`);
      assert.ok(res.preHud, `${label}: missing #bbq-hud .stars before close`);
      assert.ok(res.postBig, `${label}: missing .stars-big on first results frame`);
      assert.ok(res.postHud, `${label}: missing #bbq-hud .stars after close`);

      assert.equal(res.starsNow, tc.expected, `${label}: starsNow()=${res.starsNow} !== ${tc.expected}`);
      assert.equal(res.preHud.dataStars, expStr, `${label}: pre-close HUD data-stars=${res.preHud.dataStars} !== ${expStr}`);
      assert.equal(res.postBig.dataStars, expStr, `${label}: results .stars-big data-stars=${res.postBig.dataStars} !== ${expStr}`);
      assert.equal(
        res.preHud.dataStars,
        res.postBig.dataStars,
        `${label}: HUD data-stars (${res.preHud.dataStars}) !== results .stars-big data-stars (${res.postBig.dataStars})`,
      );
      assert.equal(res.postHud.dataStars, res.postBig.dataStars, `${label}: post-close HUD data-stars mismatch`);
      assert.equal(res.preHud.ariaLabel, expAria, `${label}: pre-close HUD aria-label="${res.preHud.ariaLabel}" !== "${expAria}"`);
      assert.equal(res.postBig.ariaLabel, expAria, `${label}: results .stars-big aria-label="${res.postBig.ariaLabel}" !== "${expAria}"`);
      assert.equal(res.preHud.filled, tc.expected, `${label}: pre-close HUD filled SVG=${res.preHud.filled} !== ${tc.expected}`);
      assert.equal(res.postBig.filled, tc.expected, `${label}: results .stars-big filled SVG=${res.postBig.filled} !== ${tc.expected}`);

      console.log(
        `PASS ${label}) money=${tc.input.money} served=${tc.input.served} angry=${tc.input.angry} waste=${tc.input.waste}`
        + ` → preHUD[t=${res.preTimeLeft.toFixed(3)}s]=${res.preHud.dataStars}★ === results=${res.postBig.dataStars}★`
        + ` (${res.postBig.ariaLabel})`,
      );
    }

    assert.equal(errors.length, 0, `run#${runIdx} ${tag} js errors:\n${errors.join('\n')}`);
    console.log(`PASS run#${runIdx} ${tag}) 0 pageerror / 0 console.error`);
  } finally {
    await close();
  }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  for (const vp of VIEWPORTS) {
    await withRetry(`run#${run} ${vp.tag}`, () => runViewportOnce(run, vp.tag, vp.viewport));
  }
}

console.log('STARS OK');
