// E2E: B-152 raw-phase 0.6s anti-double-tap lock & active undercooked discard waste accounting.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/rawlock.mjs   (last line: RAWLOCK OK)
// Per run, per viewport (portrait 390x844, landscape 844x390), frozen clock (__test.tick):
//  (a) 10 real clicks on the same idle card spaced 40ms apart (sim tick total < 0.5s):
//      after every click -> cookWindow === 'raw', occupied slots === 1, waste === 0,
//      .card[data-lock-raw="true"], button not disabled & shows '上炉中', >= 48px, no text overflow.
//  (b) tick to t = 1.2s: data-lock-raw === 'false', .card-btn text includes '未熟',
//      label matches /离熟\s*\d+s/, muted color (#9aa0a6), no text overflow;
//      1 click -> same frame: cookWindow === 'idle', all 3 grill slots occupied === false,
//      waste === 1, money === 0, popup includes both '夹生' and '废料'.
//  (c) normal cook tick to t = 5.1s -> click lift -> served === 1 && exact full-tip pork payout (¥62),
//      then 12 rapid clicks on eating button -> money / served / waste unchanged.
//  (d) 0 pageerror / console.error across 3 runs x 2 viewports.

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const tickSec = (page, sec) =>
  page.evaluate((s) => {
    window.__test.tick(0.05, Math.round(s / 0.05));
  }, sec);

async function resetAndSeat(page, dishes) {
  const seated = await page.evaluate((list) => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    for (const d of list) {
      if (!window.__test.spawnNow(d)) return -1;
    }
    for (let i = 0; i < 600; i++) {
      window.__test.tick(0.05, 1);
      window.__test.setPatience(600);
      if (window.__game.customers.filter((c) => c.phase === 'seated').length === list.length) break;
    }
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

async function readCardSnapshot(page, tableId = 't1') {
  return page.evaluate((tid) => {
    const card = document.querySelector(`#bbq-orders .card[data-table="${tid}"]`);
    const btn = card?.querySelector('.card-btn') ?? null;
    const btnLbl = btn?.querySelector('.btn-lbl') ?? null;
    const nm = card?.querySelector('.nm') ?? null;
    const pr = card?.querySelector('.pr') ?? null;
    const br = btn ? btn.getBoundingClientRect() : null;
    return {
      cs: window.__test.cardState(tid),
      st: window.__test.state(),
      slots: window.__test.grillSlots(),
      lockRaw: card?.getAttribute('data-lock-raw') ?? null,
      domWindow: card?.getAttribute('data-cook-window') ?? null,
      btnText: (btn?.textContent ?? '').trim(),
      btnDisabled: Boolean(btn?.disabled),
      btnColor: btnLbl ? getComputedStyle(btnLbl).color : null,
      prText: (pr?.textContent ?? '').trim(),
      prFontPx: pr ? parseFloat(getComputedStyle(pr).fontSize) : 0,
      btnRect: br ? { l: br.left, t: br.top, w: br.width, h: br.height } : null,
      overflow: {
        card: card ? card.scrollWidth > card.clientWidth : true,
        nm: nm ? nm.scrollWidth > nm.clientWidth : true,
        pr: pr ? pr.scrollWidth > pr.clientWidth : true,
        btn: btn ? btn.scrollWidth > btn.clientWidth : true,
        btnLbl: btnLbl ? btnLbl.scrollWidth > btnLbl.clientWidth : true,
      },
      popups: [...document.querySelectorAll('#bbq-popups .popup')].map((p) => (p.textContent ?? '').trim()),
    };
  }, tableId);
}

function assertGeometryClean(snap, ctx) {
  assert.ok(snap.btnRect && snap.btnRect.w >= 48 && snap.btnRect.h >= 48,
    `${ctx}: .card-btn ${JSON.stringify(snap.btnRect)} < 48x48`);
  assert.ok(snap.prFontPx >= 13, `${ctx}: .pr fontSize=${snap.prFontPx} < 13px`);
  assert.equal(snap.overflow.card, false, `${ctx}: .card text overflow`);
  assert.equal(snap.overflow.nm, false, `${ctx}: .nm text overflow`);
  assert.equal(snap.overflow.pr, false, `${ctx}: .pr text overflow ("${snap.prText}")`);
  assert.equal(snap.overflow.btn, false, `${ctx}: .card-btn text overflow ("${snap.btnText}")`);
  assert.equal(snap.overflow.btnLbl, false, `${ctx}: .btn-lbl text overflow ("${snap.btnText}")`);
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

    // Freeze performance.now so only __test.tick() drives simulation time
    await page.evaluate(() => {
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', {
        configurable: true,
        writable: true,
        value: () => frozen,
      });
    });
    await raf2(page);

    // ---- (a) 10 real clicks at 40ms intervals within < 0.5s sim time ----
    await resetAndSeat(page, ['pork']);
    const btn = page.locator('#bbq-orders .card[data-table="t1"] .card-btn');
    const idleSnap = await readCardSnapshot(page, 't1');
    assert.equal(idleSnap.cs.cookWindow, 'idle', `${tag} (a): expected initial idle`);
    assert.equal(idleSnap.lockRaw, 'false', `${tag} (a): idle card data-lock-raw must be "false"`);
    assertGeometryClean(idleSnap, `${tag}/idle`);

    let lastCookT = 0;
    for (let k = 1; k <= 10; k++) {
      await btn.click({ timeout: TIMEOUT });
      const snap = await readCardSnapshot(page, 't1');
      assert.equal(snap.cs.cookWindow, 'raw', `${tag} (a) click#${k}: expected cookWindow==='raw', got ${snap.cs.cookWindow}`);
      assert.equal(snap.domWindow, 'raw', `${tag} (a) click#${k}: DOM data-cook-window=${snap.domWindow}`);
      assert.equal(snap.cs.rawLocked, true, `${tag} (a) click#${k}: expected rawLocked===true`);
      assert.equal(snap.lockRaw, 'true', `${tag} (a) click#${k}: expected data-lock-raw="true", got ${snap.lockRaw}`);
      assert.equal(snap.btnDisabled, false, `${tag} (a) click#${k}: locked raw button must NOT be disabled`);
      assert.ok(snap.btnText.includes('上炉中'), `${tag} (a) click#${k}: locked btnText "${snap.btnText}" missing '上炉中'`);
      assert.equal(snap.slots.filter((s) => s.occupied).length, 1,
        `${tag} (a) click#${k}: occupied grill slots !== 1 (${JSON.stringify(snap.slots)})`);
      assert.equal(snap.st.waste, 0, `${tag} (a) click#${k}: expected waste===0, got ${snap.st.waste}`);
      assert.equal(snap.popups.length, 0, `${tag} (a) click#${k}: unexpected popup during lock: ${JSON.stringify(snap.popups)}`);
      assert.ok(snap.cs.cookT < 0.5, `${tag} (a) click#${k}: sim cookT=${snap.cs.cookT} >= 0.5s`);
      assertGeometryClean(snap, `${tag}/raw-lock#${k}`);
      lastCookT = snap.cs.cookT;

      if (k < 10) {
        await page.waitForTimeout(40);
        await tickSec(page, 0.05); // 9 * 0.05 = 0.45s < 0.5s
      }
    }
    assert.ok(lastCookT >= 0.4 && lastCookT < 0.5, `${tag} (a): expected final cookT in [0.4, 0.5), got ${lastCookT}`);

    // ---- (b) tick to t = 1.2s -> unlocked '未熟', click 1 -> same-frame idle + waste=1 + popup ----
    await tickSec(page, 1.2 - lastCookT);
    const unlockedSnap = await readCardSnapshot(page, 't1');
    assert.equal(unlockedSnap.cs.cookWindow, 'raw', `${tag} (b): expected raw at t=1.2s, got ${unlockedSnap.cs.cookWindow}`);
    assert.ok(Math.abs(unlockedSnap.cs.cookT - 1.2) < 0.05, `${tag} (b): expected cookT≈1.2s, got ${unlockedSnap.cs.cookT}`);
    assert.equal(unlockedSnap.cs.rawLocked, false, `${tag} (b): expected rawLocked===false at t=1.2s`);
    assert.equal(unlockedSnap.lockRaw, 'false', `${tag} (b): expected data-lock-raw="false", got ${unlockedSnap.lockRaw}`);
    assert.equal(unlockedSnap.btnDisabled, false, `${tag} (b): unlocked raw button must remain clickable`);
    assert.ok(unlockedSnap.btnText.includes('未熟'), `${tag} (b): btnText "${unlockedSnap.btnText}" missing '未熟'`);
    assert.equal(unlockedSnap.btnColor, 'rgb(154, 160, 166)', `${tag} (b): expected muted #9aa0a6 color, got ${unlockedSnap.btnColor}`);
    assert.match(unlockedSnap.cs.label, /离熟\s*\d+s/, `${tag} (b): label "${unlockedSnap.cs.label}" failed /离熟\\s*\\d+s/`);
    assert.match(unlockedSnap.cs.label, /未熟 · 离熟 \d+s/, `${tag} (b): label "${unlockedSnap.cs.label}" failed /未熟 · 离熟 \\d+s/`);
    assert.match(unlockedSnap.prText, /离熟\s*\d+s/, `${tag} (b): .pr text "${unlockedSnap.prText}" failed /离熟\\s*\\d+s/`);
    assertGeometryClean(unlockedSnap, `${tag}/raw-unlocked`);

    // Active early discard click (same-frame check, no extra tick/raf)
    await btn.click({ timeout: TIMEOUT });
    const discardSnap = await readCardSnapshot(page, 't1');
    assert.equal(discardSnap.cs.cookWindow, 'idle', `${tag} (b) after click: expected idle, got ${discardSnap.cs.cookWindow}`);
    assert.equal(discardSnap.domWindow, 'idle', `${tag} (b) after click: DOM data-cook-window=${discardSnap.domWindow}`);
    assert.equal(discardSnap.lockRaw, 'false', `${tag} (b) after click: expected data-lock-raw="false"`);
    assert.equal(discardSnap.slots.length, 3, `${tag} (b) after click: expected 3 grill slots`);
    assert.equal(discardSnap.slots.every((s) => s.occupied === false), true,
      `${tag} (b) after click: expected all 3 slots occupied===false, got ${JSON.stringify(discardSnap.slots)}`);
    assert.equal(discardSnap.st.waste, 1, `${tag} (b) after click: expected waste===1, got ${discardSnap.st.waste}`);
    assert.equal(discardSnap.st.money, 0, `${tag} (b) after click: money must stay 0, got ${discardSnap.st.money}`);
    assert.equal(discardSnap.st.served, 0, `${tag} (b) after click: served must stay 0, got ${discardSnap.st.served}`);
    assert.ok(
      discardSnap.popups.some((p) => p.includes('夹生') && p.includes('废料')),
      `${tag} (b) after click: popup missing both '夹生' and '废料', got ${JSON.stringify(discardSnap.popups)}`,
    );

    // ---- (c) Normal cook tick to t = 5.1s -> serve -> 12 clicks on eating button -> state unchanged ----
    // Put back on grill (same guest, still seated & full patience>=0.8 -> pork price 48 + full tip 14 = 62)
    await btn.click({ timeout: TIMEOUT });
    await tickSec(page, 5.1);
    const perfectSnap = await readCardSnapshot(page, 't1');
    assert.equal(perfectSnap.cs.cookWindow, 'perfect', `${tag} (c): expected perfect at t=5.1s, got ${perfectSnap.cs.cookWindow}`);
    assert.equal(perfectSnap.lockRaw, 'false', `${tag} (c): perfect card data-lock-raw must be "false"`);
    assert.ok(perfectSnap.btnText.includes('起锅'), `${tag} (c): perfect btnText "${perfectSnap.btnText}" missing '起锅'`);
    assertGeometryClean(perfectSnap, `${tag}/perfect`);

    await btn.click({ timeout: TIMEOUT });
    const servedSnap = await readCardSnapshot(page, 't1');
    const expectedPorkFull = 48 + Math.round(48 * 0.3); // 48 + 14 = 62 (per config.ts DISHES.pork & COOK.tipRate)
    assert.equal(servedSnap.st.served, 1, `${tag} (c): expected served===1, got ${servedSnap.st.served}`);
    assert.equal(servedSnap.st.money, expectedPorkFull,
      `${tag} (c): expected money===${expectedPorkFull} (pork 48+14), got ${servedSnap.st.money}`);
    assert.equal(servedSnap.st.waste, 1, `${tag} (c): expected waste===1 preserved, got ${servedSnap.st.waste}`);
    assert.equal(servedSnap.cs.cookWindow, 'eating', `${tag} (c): expected eating, got ${servedSnap.cs.cookWindow}`);
    assert.equal(servedSnap.btnDisabled, true, `${tag} (c): eating button must be disabled`);
    assert.equal(servedSnap.lockRaw, 'false', `${tag} (c): eating card data-lock-raw must be "false"`);
    assert.equal(servedSnap.slots.every((s) => s.occupied === false), true,
      `${tag} (c): grill slots not empty after serve: ${JSON.stringify(servedSnap.slots)}`);

    // Rapidly click eating button 12 times at button center coordinates (real mouse clicks)
    const cx = servedSnap.btnRect.l + servedSnap.btnRect.w / 2;
    const cy = servedSnap.btnRect.t + servedSnap.btnRect.h / 2;
    for (let i = 0; i < 12; i++) {
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(20);
    }
    const directRes = await page.evaluate(() => window.__game.handleOrderCardAction('t1'));
    assert.equal(directRes, false, `${tag} (c): direct handleOrderCardAction on eating card must return false`);

    const afterEatingSpam = await readCardSnapshot(page, 't1');
    assert.equal(afterEatingSpam.st.money, servedSnap.st.money, `${tag} (c): money changed after 12 eating clicks`);
    assert.equal(afterEatingSpam.st.served, servedSnap.st.served, `${tag} (c): served changed after 12 eating clicks`);
    assert.equal(afterEatingSpam.st.waste, servedSnap.st.waste, `${tag} (c): waste changed after 12 eating clicks`);
    assert.equal(afterEatingSpam.slots.every((s) => s.occupied === false), true,
      `${tag} (c): grill slot leaked after 12 eating clicks`);

    // ---- (d) 0 JS error / console.error ----
    assert.equal(errs.length, 0, `${tag} (d): JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `(a) 10x40ms rawLock=true t=${lastCookT.toFixed(2)}s occ=1 waste=0 | ` +
      `(b) t=1.2s lock=false btn="${unlockedSnap.btnText}" lbl="${unlockedSnap.cs.label}" -> discard idle waste=1 popup="${discardSnap.popups.at(-1)}" | ` +
      `(c) t=5.1s served=1 money=¥${servedSnap.st.money} +12x eating clicks unchanged | 0 JS err`,
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
console.log('RAWLOCK OK');
