// E2E: B-126 + Round 32 — hide play-only HUD (#bbq-orders, #bbq-onboard, bubbles, popups, rings)
// in menu and results modal states while keeping topbar (#bbq-hud .topbar) visible, restore #bbq-orders
// within 1 frame when entering playing, and ensure legacy controls (#bbq-stick/#bbq-act/#bbq-chop/.gb) never exist.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/modal-hud.mjs   (last line: MODAL-HUD OK)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const PROBE = () => {
  const info = (e) => {
    if (!e) return null;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      display: cs.display,
      opacity: cs.opacity,
      pe: cs.pointerEvents,
      w: r.width,
      h: r.height,
      l: r.left,
      t: r.top,
      r: r.right,
      b: r.bottom,
      sw: e.scrollWidth,
      cw: e.clientWidth,
      children: e.children.length,
    };
  };
  const st = window.__test.state();
  const panel = document.querySelector('.bbq-panel');
  const panelCard = document.querySelector('.bbq-panel .card');
  const buttons = [...document.querySelectorAll('.bbq-panel button')].map((btn) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      id: btn.getAttribute('data-btn') ?? '',
      text: (btn.textContent ?? '').trim(),
      w: r.width,
      h: r.height,
      l: r.left,
      t: r.top,
      r: r.right,
      b: r.bottom,
      cx,
      cy,
      hitTag: hit?.tagName ?? null,
      hitBtn: hit?.getAttribute?.('data-btn') ?? null,
      hitSelf: hit === btn || (hit !== null && btn.contains(hit)),
    };
  });
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    phase: st.phase,
    level: st.level,
    timeLeft: st.timeLeft,
    stick: info(document.querySelector('#bbq-stick')),
    act: info(document.querySelector('#bbq-act')),
    chop: info(document.querySelector('#bbq-chop')),
    gb: info(document.querySelector('.gb')),
    orders: info(document.querySelector('#bbq-orders')),
    onboard: info(document.querySelector('[data-onboard-tip]')),
    bubbles: info(document.querySelector('#bbq-bubbles')),
    popups: info(document.querySelector('#bbq-popups')),
    offhint: info(document.querySelector('#bbq-offhint, [data-offscreen-hint]')),
    rings: info(document.querySelector('#bbq-rings')),
    topbar: info(document.querySelector('#bbq-hud .topbar')),
    panel: info(panel),
    panelCard: info(panelCard),
    buttons,
  };
};

function assertLegacyAbsent(tag, step, p) {
  assert.equal(p.stick, null, `${tag}/${step}: legacy #bbq-stick must not exist`);
  assert.equal(p.act, null, `${tag}/${step}: legacy #bbq-act must not exist`);
  assert.equal(p.chop, null, `${tag}/${step}: legacy #bbq-chop must not exist`);
  assert.equal(p.gb, null, `${tag}/${step}: legacy .gb must not exist`);
  assert.equal(p.offhint, null, `${tag}/${step}: legacy offscreen hint must not exist`);
}

function assertHiddenModal(tag, step, p) {
  assertLegacyAbsent(tag, step, p);
  assert.ok(p.orders, `${tag}/${step}: #bbq-orders missing`);
  assert.equal(p.orders.display, 'none', `${tag}/${step}: #bbq-orders display=${p.orders.display} !== none`);
  assert.ok(!p.onboard || p.onboard.display === 'none', `${tag}/${step}: onboard tip visible in ${p.phase}`);
  assert.ok(p.bubbles && p.bubbles.display === 'none' && p.bubbles.children === 0,
    `${tag}/${step}: #bbq-bubbles not hidden/cleared: ${JSON.stringify(p.bubbles)}`);
  assert.ok(p.popups && p.popups.display === 'none' && p.popups.children === 0,
    `${tag}/${step}: #bbq-popups not hidden/cleared: ${JSON.stringify(p.popups)}`);
  assert.ok(p.rings && p.rings.display === 'none' && p.rings.children === 0,
    `${tag}/${step}: #bbq-rings not hidden/cleared: ${JSON.stringify(p.rings)}`);
  assert.ok(
    p.topbar && p.topbar.display !== 'none' && parseFloat(p.topbar.opacity) > 0 && p.topbar.w > 0 && p.topbar.h > 0,
    `${tag}/${step}: .topbar must remain visible: ${JSON.stringify(p.topbar)}`,
  );
  assert.ok(
    p.topbar.sw <= p.topbar.cw,
    `${tag}/${step}: .topbar scrollWidth=${p.topbar.sw} > clientWidth=${p.topbar.cw}`,
  );
  assert.ok(p.panel, `${tag}/${step}: .bbq-panel missing`);
  assert.ok(
    p.panel.sw <= p.panel.cw,
    `${tag}/${step}: .bbq-panel scrollWidth=${p.panel.sw} > clientWidth=${p.panel.cw}`,
  );
  assert.ok(
    p.panelCard && p.panelCard.sw <= p.panelCard.cw,
    `${tag}/${step}: .bbq-panel .card scrollWidth=${p.panelCard?.sw} > clientWidth=${p.panelCard?.cw}`,
  );
}

function assertPlayingRestored(tag, step, p) {
  assertLegacyAbsent(tag, step, p);
  assert.equal(p.phase, 'playing', `${tag}/${step}: expected phase=playing, got ${p.phase}`);
  assert.equal(p.panel, null, `${tag}/${step}: .bbq-panel still mounted during playing`);
  assert.ok(p.orders, `${tag}/${step}: #bbq-orders missing`);
  assert.ok(
    p.orders.display !== 'none' && parseFloat(p.orders.opacity) > 0,
    `${tag}/${step}: #bbq-orders not visible (display=${p.orders.display}, opacity=${p.orders.opacity})`,
  );
  assert.ok(
    p.topbar && p.topbar.sw <= p.topbar.cw,
    `${tag}/${step}: .topbar scrollWidth=${p.topbar?.sw} > clientWidth=${p.topbar?.cw}`,
  );
}

async function runViewport(tag, width, height, run) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true });
    page.on('crash', () => errs.push('PAGE CRASH'));
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

    await page.goto(BASE, { waitUntil: 'commit', timeout: TIMEOUT });
    let f = 0;
    for (let i = 0; i < 120 && f <= 30; i++) {
      await page.waitForTimeout(1000);
      f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(f > 30, `${tag}: page never rendered frames within ${TIMEOUT}ms`);
    await raf2(page);

    // a) menu phase
    const pMenu = await page.evaluate(PROBE);
    assert.equal(pMenu.phase, 'menu', `${tag}/menu: phase=${pMenu.phase}`);
    assertHiddenModal(tag, 'menu', pMenu);
    const startBtn = pMenu.buttons.find((b) => b.id === 'start');
    assert.ok(startBtn && startBtn.hitSelf, `${tag}/menu: start button not hit by elementFromPoint: ${JSON.stringify(startBtn)}`);

    // b) click「开 店」+ 2x rAF -> playing restored
    await page.locator('.bbq-panel [data-btn="start"]').click({ timeout: TIMEOUT });
    await raf2(page);
    const pStart = await page.evaluate(PROBE);
    assertPlayingRestored(tag, 'after-start', pStart);

    // Seed active play HUD (order card + bubble + ring) before closing so results must actually clear/hide them
    const seeded = await page.evaluate(() => {
      window.__test.pauseSpawns(true);
      window.__test.spawnNow('pork');
      for (let i = 0; i < 300; i++) {
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.some((c) => c.phase === 'seated')) break;
      }
      window.__test.setPatience(600);
      window.__test.tick(0.05, 2);
      return {
        cards: document.querySelectorAll('#bbq-orders .card').length,
        rings: document.querySelectorAll('#bbq-rings [data-order-ring]').length,
      };
    });
    await raf2(page);
    const pMid = await page.evaluate(PROBE);
    assert.ok(seeded.cards >= 1 && pMid.orders.children >= 1, `${tag}/seeded: expected >=1 order card`);
    assert.ok(pMid.bubbles.children >= 1, `${tag}/seeded: expected >=1 bubble`);

    // c) push timeLeft -> 0 via __test.tick -> same-frame results hide
    const sameFrame = await page.evaluate(() => {
      let guard = 0;
      while (window.__game.phase === 'playing' && guard++ < 5000) {
        window.__test.tick(0.25, 1);
      }
      return {
        phase: window.__test.state().phase,
        timeLeft: window.__test.state().timeLeft,
        stick: Boolean(document.querySelector('#bbq-stick')),
        act: Boolean(document.querySelector('#bbq-act')),
        ordersD: getComputedStyle(document.querySelector('#bbq-orders')).display,
      };
    });
    assert.equal(sameFrame.phase, 'results', `${tag}/results-sync: phase=${sameFrame.phase}`);
    assert.equal(sameFrame.timeLeft, 0, `${tag}/results-sync: timeLeft=${sameFrame.timeLeft}`);
    assert.equal(sameFrame.stick, false, `${tag}/results-sync: legacy stick exists`);
    assert.equal(sameFrame.act, false, `${tag}/results-sync: legacy act exists`);
    assert.equal(sameFrame.ordersD, 'none', `${tag}/results-sync: orders not hidden on closing frame`);

    await raf2(page);
    const pRes = await page.evaluate(PROBE);
    assert.equal(pRes.phase, 'results', `${tag}/results: phase=${pRes.phase}`);
    assertHiddenModal(tag, 'results', pRes);
    const replayBtn = pRes.buttons.find((b) => b.id === 'replay');
    assert.ok(replayBtn && replayBtn.hitSelf, `${tag}/results: replay button not hit by elementFromPoint: ${JSON.stringify(replayBtn)}`);

    // d) click「再 开 一 局」+ 2x rAF -> playing restored
    await page.locator('.bbq-panel [data-btn="replay"]').click({ timeout: TIMEOUT });
    await raf2(page);
    const pReplay = await page.evaluate(PROBE);
    assertPlayingRestored(tag, 'after-replay', pReplay);

    // Also verify passing Lv.1 -> results with「进入第 2 关」+「再 开 一 局」-> click「进入第 2 关」-> restored
    await page.evaluate(() => {
      window.__test.pauseSpawns(true);
      window.__game.money = window.__test.state().levelTarget + 20;
      window.__game.served = 4;
      let guard = 0;
      while (window.__game.phase === 'playing' && guard++ < 5000) {
        window.__test.tick(0.25, 1);
      }
    });
    await raf2(page);
    const pPass = await page.evaluate(PROBE);
    assert.equal(pPass.phase, 'results', `${tag}/results-pass: phase=${pPass.phase}`);
    assertHiddenModal(tag, 'results-pass', pPass);
    const nextBtn = pPass.buttons.find((b) => b.id === 'next');
    const replayBtn2 = pPass.buttons.find((b) => b.id === 'replay');
    assert.ok(nextBtn && nextBtn.hitSelf, `${tag}/results-pass: next button not hit by elementFromPoint: ${JSON.stringify(nextBtn)}`);
    assert.ok(replayBtn2 && replayBtn2.hitSelf, `${tag}/results-pass: replay button not hit by elementFromPoint: ${JSON.stringify(replayBtn2)}`);

    await page.locator('.bbq-panel [data-btn="next"]').click({ timeout: TIMEOUT });
    await raf2(page);
    const pNext = await page.evaluate(PROBE);
    assertPlayingRestored(tag, 'after-next', pNext);
    assert.equal(pNext.level, 2, `${tag}/after-next: expected level 2, got ${pNext.level}`);

    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `menu(legacy=absent, orders=${pMenu.orders.display}, topbar=${pMenu.topbar.sw}/${pMenu.topbar.cw}) | ` +
      `start(legacy=absent, orders=${pStart.orders.display}/op=${pStart.orders.opacity}) | ` +
      `results(orders=none, panel=${pRes.panelCard.sw}/${pRes.panelCard.cw}, replayHit=${replayBtn.hitSelf}, passNextHit=${nextBtn.hitSelf}/replayHit=${replayBtn2.hitSelf}) | ` +
      `replay/next restored(lv=${pNext.level}) | 0 JS err`,
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

async function withRetry(tag, w, h, run) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runViewport(tag, w, h, run);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (e?.name === 'AssertionError' || !ENV_CRASH.test(msg) || attempt >= 2) throw e;
      console.error(`${tag}: env crash (${msg.split('\n')[0]}), retry ${attempt + 1}/2`);
    }
  }
}

for (let run = 1; run <= RUNS; run++) {
  await withRetry('portrait', 390, 844, run);
  await withRetry('landscape', 844, 390, run);
  console.log(`PASS run ${run}/${RUNS}`);
}
console.log('MODAL-HUD OK');
