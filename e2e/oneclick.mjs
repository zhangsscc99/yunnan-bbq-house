// E2E: One-click order-card cooking loop (GAME-DESIGN §0/§1).
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ [E2E_RUNS=3] node e2e/oneclick.mjs   (last line: ONECLICK OK)
// Per run, per viewport (portrait 390x844, landscape 844x390), fresh browser:
//  - Freezes performance.now after boot so only __test.tick() drives simulation time.
//  - Verifies .card-btn >= 56x56px, inline SVG (no emoji), scrollWidth <= clientWidth, inside viewport.
//  (a) Click 1 -> grillSlots() has 1 occupied slot & cookWindow === 'raw';
//  (b) t = 0.5 / 4.0 / 6.5 / 9.0 / 11.0 / 12.5 -> raw / perfect / perfect / over / over / burnt,
//      continuous progressPct(t=4) !== progressPct(t=6.5) & segmented colors + countdown labels;
//  (c) t = 6.5 lift -> money delta = price + full tip (and over window t = 10.5 = half tip, no double-pay);
//  (d) t = 2.0 lift -> money unchanged, waste + 1, card back to idle, popup includes '夹生丢弃 · 废料 +1';
//  (e) 3 cards cooking -> 4th card disabled === true & label includes '烤位满了'; release 1 -> disabled === false;
//  (f) t > 12 without lift -> waste + 1 && angry + 1, customer leaves angry, card removed after burnt flash;
//  (g) pageerror + console.error === 0 across 3 runs.

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const tickSec = (page, sec) =>
  page.evaluate((s) => {
    const steps = Math.round(s / 0.05);
    window.__test.tick(0.05, steps);
  }, sec);

async function resetAndSeat(page, dishes) {
  const seated = await page.evaluate((list) => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    for (const d of list) {
      const ok = window.__test.spawnNow(d);
      if (!ok) return -1;
    }
    for (let i = 0; i < 600; i++) {
      window.__test.tick(0.05, 1);
      window.__test.setPatience(600);
      const n = window.__game.customers.filter((c) => c.phase === 'seated').length;
      if (n === list.length) break;
    }
    // Reset each seated guest to full dish patience so tip math is exact
    for (const c of window.__game.customers) {
      if (c.phase === 'seated') c.patience = c.patienceMax;
    }
    window.__test.tick(0.05, 1);
    for (const c of window.__game.customers) {
      if (c.phase === 'seated') c.patience = c.patienceMax;
    }
    document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove());
    return window.__game.customers.filter((c) => c.phase === 'seated').length;
  }, dishes);
  assert.equal(seated, dishes.length, `expected ${dishes.length} seated guests, got ${seated}`);
}

async function checkCardsGeometry(page, tag, expectedCount) {
  const geo = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cards = [...document.querySelectorAll('#bbq-orders .card')].map((card) => {
      const r = card.getBoundingClientRect();
      const btn = card.querySelector('.card-btn');
      const br = btn ? btn.getBoundingClientRect() : null;
      const icoSvg = btn?.querySelector('.btn-ico svg') ?? null;
      const ringSvg = btn?.querySelector('svg.cook-ring') ?? null;
      return {
        table: card.dataset.table ?? '',
        cookWindow: card.dataset.cookWindow ?? '',
        text: (card.textContent ?? '').trim(),
        btnText: (btn?.textContent ?? '').trim(),
        sw: card.scrollWidth,
        cw: card.clientWidth,
        rect: { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height },
        btn: br ? { w: br.width, h: br.height } : null,
        hasIcoSvg: Boolean(icoSvg),
        hasRingSvg: Boolean(ringSvg),
        disabled: Boolean(btn?.disabled),
      };
    });
    return { vw, vh, cards };
  });
  assert.equal(geo.cards.length, expectedCount, `${tag}: expected ${expectedCount} cards, got ${geo.cards.length}`);
  for (const c of geo.cards) {
    assert.ok(c.btn && c.btn.w >= 56 && c.btn.h >= 56, `${tag} [${c.table}]: .card-btn ${JSON.stringify(c.btn)} < 56x56`);
    assert.equal(c.hasIcoSvg, true, `${tag} [${c.table}]: .card-btn missing inline SVG icon`);
    assert.equal(c.hasRingSvg, true, `${tag} [${c.table}]: .card-btn missing inline SVG cook-ring`);
    assert.equal(EMOJI_RE.test(c.text), false, `${tag} [${c.table}]: emoji found in card text "${c.text}"`);
    assert.ok(c.sw <= c.cw, `${tag} [${c.table}]: card overflow scrollWidth=${c.sw} > clientWidth=${c.cw}`);
    assert.ok(
      c.rect.l >= 0 && c.rect.t >= 0 && c.rect.r <= geo.vw && c.rect.b <= geo.vh,
      `${tag} [${c.table}]: card outside viewport ${geo.vw}x${geo.vh}: ${JSON.stringify(c.rect)}`,
    );
  }
  return geo;
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

    // Freeze performance.now so live rAF produces dt=0 and only __test.tick() advances sim time
    await page.evaluate(() => {
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', {
        configurable: true,
        writable: true,
        value: () => frozen,
      });
    });
    await raf2(page);

    // ---- (a) & (b): Click 1 -> grillSlots 1 occupied & raw -> windows across 0.5/4.0/6.5/9.0/11.0/12.5 ----
    await resetAndSeat(page, ['pork']);
    const geoIdle = await checkCardsGeometry(page, `${tag}/idle`, 1);
    const sIdle = await page.evaluate(() => ({
      card: window.__test.cardState('t1'),
      slots: window.__test.grillSlots(),
      st: window.__test.state(),
    }));
    assert.equal(sIdle.slots.length, 3, `${tag} (a): grillSlots() must return 3 items`);
    assert.equal(sIdle.slots.filter((s) => s.occupied).length, 0, `${tag} (a): grill should start empty`);
    assert.equal(sIdle.card.cookWindow, 'idle', `${tag} (a): initial cookWindow should be idle`);
    assert.ok(sIdle.card.btn.w >= 56 && sIdle.card.btn.h >= 56, `${tag} (a): cardState btn < 56x56`);

    // Click 1: put on grill
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    const afterClick1 = await page.evaluate(() => ({
      card: window.__test.cardState('t1'),
      domWindow: document.querySelector('#bbq-orders .card[data-table="t1"]')?.dataset.cookWindow ?? null,
      slots: window.__test.grillSlots(),
    }));
    assert.equal(afterClick1.slots.length, 3, `${tag} (a): grillSlots length !== 3`);
    const occ1 = afterClick1.slots.filter((s) => s.occupied);
    assert.equal(occ1.length, 1, `${tag} (a): expected 1 occupied grill slot, got ${JSON.stringify(afterClick1.slots)}`);
    assert.equal(occ1[0].dish, 'pork', `${tag} (a): expected pork in grill slot, got ${occ1[0].dish}`);
    assert.equal(afterClick1.card.cookWindow, 'raw', `${tag} (a): expected cookWindow==='raw'`);
    assert.equal(afterClick1.domWindow, 'raw', `${tag} (a): expected card[data-cook-window]="raw"`);
    assert.ok(afterClick1.card.slotIndex >= 0 && afterClick1.card.slotIndex < 3, `${tag} (a): invalid slotIndex ${afterClick1.card.slotIndex}`);

    // (b) Step across exact timestamps 0.5 / 4.0 / 6.5 / 9.0 / 11.0 / 12.5
    const checkpoints = [
      { t: 0.5, expect: 'raw' },
      { t: 4.0, expect: 'perfect' },
      { t: 6.5, expect: 'perfect' },
      { t: 9.0, expect: 'over' },
      { t: 11.0, expect: 'over' },
      { t: 12.5, expect: 'burnt' },
    ];
    let curT = 0;
    const samples = [];
    for (const cp of checkpoints) {
      await tickSec(page, cp.t - curT);
      curT = cp.t;
      const snap = await page.evaluate(() => {
        const card = document.querySelector('#bbq-orders .card[data-table="t1"]');
        const arc = card?.querySelector('svg.cook-ring .cook-arc');
        const btn = card?.querySelector('.card-btn');
        return {
          cs: window.__test.cardState('t1'),
          domWindow: card?.dataset.cookWindow ?? null,
          arcStroke: arc?.getAttribute('stroke') ?? null,
          arcOffset: arc ? Number(arc.getAttribute('stroke-dashoffset')) : null,
          btnAnim: btn ? getComputedStyle(btn).animationName : 'none',
          st: window.__test.state(),
          slots: window.__test.grillSlots(),
        };
      });
      assert.ok(snap.cs, `${tag} (b) t=${cp.t}: cardState('t1') is null`);
      assert.equal(snap.cs.cookWindow, cp.expect, `${tag} (b) t=${cp.t}: expected ${cp.expect}, got ${snap.cs.cookWindow} (cookT=${snap.cs.cookT})`);
      assert.equal(snap.domWindow, cp.expect, `${tag} (b) t=${cp.t}: DOM data-cook-window=${snap.domWindow} !== ${cp.expect}`);
      if (cp.expect === 'raw') {
        assert.match(snap.cs.label, /未熟 · 离熟 \d+s/, `${tag} (b) t=${cp.t}: label "${snap.cs.label}" missing 未熟 · 离熟 Ns`);
      }
      if (cp.expect === 'perfect') {
        assert.match(snap.cs.label, /完美 \d+s/, `${tag} (b) t=${cp.t}: label "${snap.cs.label}" missing 完美 Ns`);
      }
      if (cp.expect === 'over') {
        assert.match(snap.cs.label, /偏老 \d+s/, `${tag} (b) t=${cp.t}: label "${snap.cs.label}" missing 偏老 Ns`);
        assert.notEqual(snap.btnAnim, 'none', `${tag} (b) t=${cp.t}: over window must pulse`);
      }
      samples.push({ t: cp.t, ...snap });
    }
    // Verify continuous progressPct (4.0 vs 6.5 and strictly increasing across 0.5 -> 11.0)
    const p05 = samples[0].cs.progressPct;
    const p40 = samples[1].cs.progressPct;
    const p65 = samples[2].cs.progressPct;
    const p90 = samples[3].cs.progressPct;
    const p11 = samples[4].cs.progressPct;
    const p125 = samples[5].cs.progressPct;
    assert.notEqual(p40, p65, `${tag} (b): progressPct(t=4) === progressPct(t=6.5) === ${p40}`);
    assert.ok(p05 < p40 && p40 < p65 && p65 < p90 && p90 < p11 && p11 < p125,
      `${tag} (b): progressPct not strictly increasing: [${p05}, ${p40}, ${p65}, ${p90}, ${p11}, ${p125}]`);
    assert.notEqual(samples[1].arcOffset, samples[2].arcOffset, `${tag} (b): SVG arc dashoffset frozen between t=4 and t=6.5`);
    // Distinct segmented ring colors: raw !== perfect !== over !== burnt
    const segColors = new Set([samples[0].arcStroke, samples[1].arcStroke, samples[3].arcStroke, samples[5].arcStroke]);
    assert.equal(segColors.size, 4, `${tag} (b): expected 4 distinct segmented ring colors, got ${JSON.stringify([...segColors])}`);

    // ---- (f) Auto-burn verification (both right after t=12.5 above AND standalone check) ----
    const burntSnap = samples[5];
    assert.equal(burntSnap.st.waste, 1, `${tag} (f): expected waste===1 after t>12, got ${burntSnap.st.waste}`);
    assert.equal(burntSnap.st.angry, 1, `${tag} (f): expected angry===1 after t>12, got ${burntSnap.st.angry}`);
    assert.equal(burntSnap.slots.filter((s) => s.occupied).length, 0, `${tag} (f): burnt grill slot not released`);
    const guestLeaving = burntSnap.st.customers.find((c) => c.table === 't1');
    assert.ok(!guestLeaving || guestLeaving.phase === 'leaving-angry' || guestLeaving.phase === 'gone',
      `${tag} (f): expected guest leaving-angry, got ${JSON.stringify(guestLeaving)}`);
    // Advance +1.1s so burnt flash finishes and card is removed from DOM
    await tickSec(page, 1.1);
    const afterBurnLinger = await page.evaluate(() => ({
      cardEl: Boolean(document.querySelector('#bbq-orders .card[data-table="t1"]')),
      cs: window.__test.cardState('t1'),
      st: window.__test.state(),
    }));
    assert.equal(afterBurnLinger.cardEl, false, `${tag} (f): burnt card was not removed from DOM`);
    assert.equal(afterBurnLinger.cs, null, `${tag} (f): cardState should be null after card removal`);
    assert.equal(afterBurnLinger.st.waste, 1, `${tag} (f): waste double-incremented`);
    assert.equal(afterBurnLinger.st.angry, 1, `${tag} (f): angry double-incremented`);

    // ---- (c) t = 6.5 lift -> money delta = price + full tip (plus over t = 10.5 -> half tip & no double-pay) ----
    await resetAndSeat(page, ['pork', 'mushroom']);
    const beforeC = await page.evaluate(() => window.__test.state());
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    await tickSec(page, 6.5);
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    const afterC = await page.evaluate(() => ({
      st: window.__test.state(),
      slots: window.__test.grillSlots(),
      card: window.__test.cardState('t1'),
    }));
    const expectedFullPork = 48 + Math.round(48 * 0.3); // 48 + 14 = 62
    assert.equal(afterC.st.money - beforeC.money, expectedFullPork,
      `${tag} (c): t=6.5 pork gain=${afterC.st.money - beforeC.money}, expected ${expectedFullPork}`);
    assert.equal(afterC.st.served - beforeC.served, 1, `${tag} (c): served did not increment`);
    assert.equal(afterC.slots.filter((s) => s.occupied).length, 0, `${tag} (c): grill slot not freed after perfect serve`);
    assert.equal(afterC.card.disabled, true, `${tag} (c): served card button must be disabled (no double-pay)`);

    // Attempt direct click on already-served card -> must not pay twice
    const moneyBeforeDup = afterC.st.money;
    await page.evaluate(() => {
      const btn = document.querySelector('#bbq-orders .card[data-table="t1"] .card-btn');
      btn?.click();
      window.__game.handleOrderCardAction('t1');
    });
    const moneyAfterDup = await page.evaluate(() => window.__test.state().money);
    assert.equal(moneyAfterDup, moneyBeforeDup, `${tag} (c): duplicate payment detected on same customer`);

    // Also verify over window (t = 10.5) on t2 (mushroom: price=32, half tip=round(32*0.3*0.5)=5 -> 37)
    const beforeOver = await page.evaluate(() => {
      const c2 = window.__game.customers.find((c) => c.table === 't2');
      if (c2) c2.patience = c2.patienceMax;
      return window.__test.state();
    });
    await page.locator('#bbq-orders .card[data-table="t2"] .card-btn').click({ timeout: TIMEOUT });
    await tickSec(page, 10.5);
    await page.locator('#bbq-orders .card[data-table="t2"] .card-btn').click({ timeout: TIMEOUT });
    const afterOver = await page.evaluate(() => window.__test.state());
    const expectedOverMush = 32 + Math.round(32 * 0.3 * 0.5); // 32 + 5 = 37
    assert.equal(afterOver.money - beforeOver.money, expectedOverMush,
      `${tag} (c/over): t=10.5 mushroom gain=${afterOver.money - beforeOver.money}, expected ${expectedOverMush}`);

    // ---- (d) t = 2.0 lift -> undercooked (money unchanged, waste + 1, card returns to idle, popup '夹生丢弃 · 废料 +1') ----
    await resetAndSeat(page, ['mixian']);
    const beforeD = await page.evaluate(() => window.__test.state());
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    await tickSec(page, 2.0);
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    const afterD = await page.evaluate(() => ({
      st: window.__test.state(),
      card: window.__test.cardState('t1'),
      domWindow: document.querySelector('#bbq-orders .card[data-table="t1"]')?.dataset.cookWindow ?? null,
      slots: window.__test.grillSlots(),
      popups: [...document.querySelectorAll('#bbq-popups .popup')].map((p) => (p.textContent ?? '').trim()),
    }));
    assert.equal(afterD.st.money, beforeD.money, `${tag} (d): money changed on undercooked lift (${beforeD.money} -> ${afterD.st.money})`);
    assert.equal(afterD.st.waste, beforeD.waste + 1, `${tag} (d): expected waste + 1 on undercooked discard (${beforeD.waste} -> ${afterD.st.waste})`);
    assert.equal(afterD.st.served, beforeD.served, `${tag} (d): served changed on undercooked lift`);
    assert.equal(afterD.card.cookWindow, 'idle', `${tag} (d): card did not return to idle (got ${afterD.card.cookWindow})`);
    assert.equal(afterD.domWindow, 'idle', `${tag} (d): DOM data-cook-window=${afterD.domWindow} !== idle`);
    assert.equal(afterD.card.slotIndex, -1, `${tag} (d): slotIndex not reset to -1`);
    assert.equal(afterD.slots.filter((s) => s.occupied).length, 0, `${tag} (d): grill slot not released on undercooked lift`);
    assert.ok(afterD.popups.some((p) => p.includes('夹生丢弃 · 废料 +1')), `${tag} (d): missing popup '夹生丢弃 · 废料 +1', got ${JSON.stringify(afterD.popups)}`);

    // ---- (e) 3 grill slots full -> 4th card disabled + '烤位满了' -> release 1 -> restored false ----
    await resetAndSeat(page, ['pork', 'mushroom', 'mixian', 'pork']);
    await checkCardsGeometry(page, `${tag}/4cards-idle`, 4);
    for (const tid of ['t1', 't2', 't3']) {
      await page.locator(`#bbq-orders .card[data-table="${tid}"] .card-btn`).click({ timeout: TIMEOUT });
    }
    await checkCardsGeometry(page, `${tag}/4cards-full`, 4);
    const fullState = await page.evaluate(() => ({
      slots: window.__test.grillSlots(),
      c4: window.__test.cardState('t4'),
      c4Text: (document.querySelector('#bbq-orders .card[data-table="t4"]')?.textContent ?? '').trim(),
      c4BtnDisabled: Boolean(document.querySelector('#bbq-orders .card[data-table="t4"] .card-btn')?.disabled),
    }));
    assert.equal(fullState.slots.filter((s) => s.occupied).length, 3, `${tag} (e): expected 3 occupied grill slots`);
    assert.equal(fullState.c4.disabled, true, `${tag} (e): 4th card disabled must be true when grill full`);
    assert.equal(fullState.c4BtnDisabled, true, `${tag} (e): 4th card DOM button.disabled must be true`);
    assert.ok(fullState.c4.label.includes('烤位满了'), `${tag} (e): 4th card label "${fullState.c4.label}" missing '烤位满了'`);
    assert.ok(fullState.c4Text.includes('烤位满了'), `${tag} (e): 4th card text "${fullState.c4Text}" missing '烤位满了'`);

    // Release 1 slot by serving t1 at t=5.0s (perfect) -> 4th card automatically restores disabled===false
    await tickSec(page, 5.0);
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    const afterRelease = await page.evaluate(() => ({
      slots: window.__test.grillSlots(),
      c4: window.__test.cardState('t4'),
      c4BtnDisabled: Boolean(document.querySelector('#bbq-orders .card[data-table="t4"] .card-btn')?.disabled),
    }));
    assert.equal(afterRelease.slots.filter((s) => s.occupied).length, 2, `${tag} (e): expected 2 occupied slots after releasing t1`);
    assert.equal(afterRelease.c4.disabled, false, `${tag} (e): 4th card did not restore disabled===false after slot freed`);
    assert.equal(afterRelease.c4BtnDisabled, false, `${tag} (e): 4th card DOM button.disabled still true`);

    assert.equal(errs.length, 0, `${tag} (g): JS errors:\n${errs.join('\n')}`);
    const cardW = geoIdle.cards[0].rect.w.toFixed(0);
    const btnSz = `${geoIdle.cards[0].btn.w.toFixed(0)}x${geoIdle.cards[0].btn.h.toFixed(0)}`;
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `cardW=${cardW}px btn=${btnSz} | ` +
      `windows=[${samples.map((s) => `${s.t}:${s.cs.cookWindow}(${s.cs.progressPct.toFixed(1)}%)`).join(',')}] | ` +
      `perfect=+¥${expectedFullPork} over=+¥${expectedOverMush} raw=¥0(idle,waste+1) | ` +
      `4th(full=${fullState.c4.disabled}/"${fullState.c4.label}"->free=${afterRelease.c4.disabled}) | ` +
      `burn(waste=${burntSnap.st.waste},angry=${burntSnap.st.angry},removed=true) | 0 JS err`,
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
console.log('ONECLICK OK');
