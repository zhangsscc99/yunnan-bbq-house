// E2E: B-156 burn retry (no angry leave on burn, 1.2s linger -> idle '重烤') & B-157 over/burnt card readability.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/burn-retry.mjs   (last line: BURN-RETRY OK)
// Per run, per viewport (portrait 390x844, landscape 844x390), frozen clock (__test.tick):
//  1) Seat t1 (pork) + t2 (mushroom), click t1 -> grillSlots occupied=1, cookWindow='raw';
//  2) Tick to t=10.1s (over) -> verify B-157 border 2px solid #e05a3a, .pr #ffa048, .card-btn bg rgba(224,90,58,.28) + pulse;
//  3) Tick +1.95s to t=12.05s (burnt) -> waste+1, angry unchanged, guest still seated, cardState.cookWindow==='burnt',
//     button disabled & text '已废', card text does not match /焦糊\s+焦糊/, burnt border #c93b2b, popup '焦糊 · 废料 +1',
//     handleOrderCardAction ignored during linger;
//  4) Tick +1.3s -> cookWindow==='idle', button enabled, button text '重烤', statusText includes '重烤可上炉',
//     data-burnt-retry="true", no duplicate cards;
//  5) Click '重烤' -> grillSlots occupied=1, cookWindow==='raw';
//  6) Tick +6.5s (perfect) -> click lift -> money increases, served+1, angry===0, grillSlots occupied=0;
//  7) 0 pageerror / console.error across E2E_RUNS runs x 2 viewports.

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

async function readSnap(page, tableId = 't1') {
  return page.evaluate((tid) => {
    const cards = [...document.querySelectorAll(`#bbq-orders .card[data-table="${tid}"]`)];
    const card = cards[0] ?? null;
    const btn = card?.querySelector('.card-btn') ?? null;
    const pr = card?.querySelector('.pr') ?? null;
    const br = btn ? btn.getBoundingClientRect() : null;
    const csStyle = card ? getComputedStyle(card) : null;
    const btnStyle = btn ? getComputedStyle(btn) : null;
    const prStyle = pr ? getComputedStyle(pr) : null;
    const ob = document.querySelector('[data-onboard-tip]');
    return {
      cardCount: cards.length,
      cs: window.__test.cardState(tid),
      st: window.__test.state(),
      slots: window.__test.grillSlots(),
      domWindow: card?.dataset.cookWindow ?? null,
      burntRetry: card?.dataset.burntRetry ?? null,
      innerText: (card?.innerText ?? '').trim(),
      textContent: (card?.textContent ?? '').trim(),
      prText: (pr?.textContent ?? '').trim(),
      btnText: (btn?.textContent ?? '').trim(),
      btnDisabled: Boolean(btn?.disabled),
      btnRect: br ? { w: br.width, h: br.height } : null,
      borderColor: csStyle?.borderTopColor ?? null,
      borderWidth: csStyle?.borderTopWidth ?? null,
      prColor: prStyle?.color ?? null,
      prFontPx: prStyle ? parseFloat(prStyle.fontSize) : 0,
      btnBg: btnStyle?.backgroundColor ?? null,
      btnAnim: btnStyle?.animationName ?? 'none',
      cardOverflow: card ? card.scrollWidth > card.clientWidth : true,
      prOverflow: pr ? pr.scrollWidth > pr.clientWidth : true,
      onboardVisible: ob ? getComputedStyle(ob).display !== 'none' : false,
      onboardText: (ob?.textContent ?? '').trim(),
      popups: [...document.querySelectorAll('#bbq-popups .popup')].map((p) => (p.textContent ?? '').trim()),
    };
  }, tableId);
}

function assertCleanGeometry(snap, ctx) {
  assert.ok(snap.btnRect && snap.btnRect.w >= 48 && snap.btnRect.h >= 48,
    `${ctx}: .card-btn ${JSON.stringify(snap.btnRect)} < 48x48`);
  assert.ok(snap.prFontPx >= 13, `${ctx}: .pr fontSize=${snap.prFontPx} < 13px`);
  assert.equal(snap.cardOverflow, false, `${ctx}: .card overflow`);
  assert.equal(snap.prOverflow, false, `${ctx}: .pr overflow ("${snap.prText}")`);
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

    // Freeze performance.now so only __test.tick() advances sim time
    await page.evaluate(() => {
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', {
        configurable: true,
        writable: true,
        value: () => frozen,
      });
    });
    await raf2(page);

    await resetAndSeat(page, ['pork', 'mushroom']);
    const t1Btn = page.locator('#bbq-orders .card[data-table="t1"] .card-btn');
    const before = await readSnap(page, 't1');
    const t2Idle = await readSnap(page, 't2');
    assert.equal(before.cs.cookWindow, 'idle', `${tag}: initial cookWindow should be idle`);
    assert.equal(before.st.waste, 0, `${tag}: initial waste should be 0`);
    assert.equal(before.st.angry, 0, `${tag}: initial angry should be 0`);
    assertCleanGeometry(before, `${tag}/idle`);

    // 1) Click 1 -> put on grill
    await t1Btn.click({ timeout: TIMEOUT });
    const afterPut = await readSnap(page, 't1');
    assert.equal(afterPut.slots.filter((s) => s.occupied).length, 1, `${tag}: expected 1 occupied grill slot`);
    assert.equal(afterPut.cs.cookWindow, 'raw', `${tag}: expected raw after click 1`);

    // 2) Tick to t = 10.1s (over) -> check B-157 over styling & pulse
    await tickSec(page, 10.1);
    const overSnap = await readSnap(page, 't1');
    assert.equal(overSnap.cs.cookWindow, 'over', `${tag}/over: expected over at t=10.1s, got ${overSnap.cs.cookWindow}`);
    assert.equal(overSnap.borderColor, 'rgb(224, 90, 58)', `${tag}/over: borderColor=${overSnap.borderColor} !== rgb(224, 90, 58)`);
    assert.equal(overSnap.borderWidth, '2px', `${tag}/over: borderWidth=${overSnap.borderWidth} !== 2px`);
    assert.notEqual(overSnap.borderColor, t2Idle.borderColor, `${tag}/over: borderColor must differ from idle card`);
    assert.equal(overSnap.prColor, 'rgb(255, 160, 72)', `${tag}/over: .pr color=${overSnap.prColor} !== rgb(255, 160, 72)`);
    assert.equal(overSnap.btnBg, 'rgba(224, 90, 58, 0.28)', `${tag}/over: .card-btn bg=${overSnap.btnBg} !== rgba(224, 90, 58, 0.28)`);
    assert.notEqual(overSnap.btnBg, t2Idle.btnBg, `${tag}/over: .card-btn bg must differ from idle card`);
    assert.notEqual(overSnap.btnAnim, 'none', `${tag}/over: .card-btn pulse animation missing`);
    if (overSnap.onboardVisible) {
      assert.match(overSnap.onboardText, /快焦|立刻/, `${tag}/over: onboard tip "${overSnap.onboardText}" missing urgency copy`);
    }
    assertCleanGeometry(overSnap, `${tag}/over`);

    // 3) Tick +1.95s -> total t = 12.05s (auto-burn)
    await tickSec(page, 1.95);
    const burntSnap = await readSnap(page, 't1');
    assert.equal(burntSnap.cardCount, 1, `${tag}/burnt: expected 1 card for t1, got ${burntSnap.cardCount}`);
    assert.equal(burntSnap.st.waste, before.st.waste + 1, `${tag}/burnt: expected waste=${before.st.waste + 1}, got ${burntSnap.st.waste}`);
    assert.equal(burntSnap.st.angry, before.st.angry, `${tag}/burnt: angry must stay unchanged (${before.st.angry}), got ${burntSnap.st.angry}`);
    assert.equal(burntSnap.slots.filter((s) => s.occupied).length, 0, `${tag}/burnt: grill slot should be released`);
    const guestBurnt = burntSnap.st.customers.find((c) => c.table === 't1');
    assert.ok(guestBurnt && guestBurnt.phase === 'seated', `${tag}/burnt: guest must remain seated, got ${JSON.stringify(guestBurnt)}`);
    assert.ok(guestBurnt.patience > 0, `${tag}/burnt: guest patience should remain positive, got ${guestBurnt.patience}`);
    assert.equal(burntSnap.cs.cookWindow, 'burnt', `${tag}/burnt: expected cookWindow==='burnt', got ${burntSnap.cs.cookWindow}`);
    assert.equal(burntSnap.domWindow, 'burnt', `${tag}/burnt: expected data-cook-window='burnt', got ${burntSnap.domWindow}`);
    assert.equal(burntSnap.cs.disabled, true, `${tag}/burnt: cardState.disabled must be true`);
    assert.equal(burntSnap.btnDisabled, true, `${tag}/burnt: DOM button must be disabled`);
    assert.equal(burntSnap.btnText, '已废', `${tag}/burnt: button text "${burntSnap.btnText}" !== '已废'`);
    assert.notEqual(burntSnap.prText, burntSnap.btnText, `${tag}/burnt: statusText and btnText must differ`);
    assert.doesNotMatch(burntSnap.innerText, /焦糊\s+焦糊/, `${tag}/burnt: duplicate '焦糊 焦糊' in "${burntSnap.innerText}"`);
    assert.doesNotMatch(burntSnap.textContent, /焦糊\s+焦糊/, `${tag}/burnt: duplicate '焦糊 焦糊' in textContent "${burntSnap.textContent}"`);
    assert.ok(burntSnap.prText.includes('已焦糊') && burntSnap.prText.includes('废料 +1'),
      `${tag}/burnt: statusText "${burntSnap.prText}" missing '已焦糊' / '废料 +1'`);
    assert.equal(burntSnap.borderColor, 'rgb(201, 59, 43)', `${tag}/burnt: borderColor=${burntSnap.borderColor} !== rgb(201, 59, 43)`);
    assert.ok(burntSnap.popups.some((p) => p.includes('焦糊 · 废料 +1')),
      `${tag}/burnt: missing popup '焦糊 · 废料 +1', got ${JSON.stringify(burntSnap.popups)}`);
    assertCleanGeometry(burntSnap, `${tag}/burnt`);

    // Direct action during burnt linger must be ignored
    const lingerClickRes = await page.evaluate(() => window.__game.handleOrderCardAction('t1'));
    assert.equal(lingerClickRes, false, `${tag}/burnt: handleOrderCardAction must return false during burnt linger`);
    const slotsDuringLinger = await page.evaluate(() => window.__test.grillSlots());
    assert.equal(slotsDuringLinger.filter((s) => s.occupied).length, 0, `${tag}/burnt: slot occupied during burnt linger`);

    // 4) Tick +1.3s -> burnt linger (1.2s) expires -> back to idle with '重烤'
    await tickSec(page, 1.3);
    const retrySnap = await readSnap(page, 't1');
    assert.equal(retrySnap.cardCount, 1, `${tag}/retry: duplicate cards detected (${retrySnap.cardCount})`);
    assert.equal(retrySnap.cs.cookWindow, 'idle', `${tag}/retry: expected cookWindow==='idle', got ${retrySnap.cs.cookWindow}`);
    assert.equal(retrySnap.domWindow, 'idle', `${tag}/retry: expected data-cook-window='idle', got ${retrySnap.domWindow}`);
    assert.equal(retrySnap.burntRetry, 'true', `${tag}/retry: expected data-burnt-retry='true', got ${retrySnap.burntRetry}`);
    assert.equal(retrySnap.cs.disabled, false, `${tag}/retry: cardState.disabled must be false`);
    assert.equal(retrySnap.btnDisabled, false, `${tag}/retry: DOM button must be enabled`);
    assert.equal(retrySnap.btnText, '重烤', `${tag}/retry: expected button text '重烤', got "${retrySnap.btnText}"`);
    assert.equal(retrySnap.cs.label, '重烤', `${tag}/retry: expected cardState.label==='重烤', got "${retrySnap.cs.label}"`);
    assert.ok(retrySnap.prText.includes('重烤可上炉'), `${tag}/retry: statusText "${retrySnap.prText}" missing '重烤可上炉'`);
    const guestRetry = retrySnap.st.customers.find((c) => c.table === 't1');
    assert.ok(guestRetry && guestRetry.phase === 'seated', `${tag}/retry: guest must still be seated`);
    assertCleanGeometry(retrySnap, `${tag}/retry`);

    // 5) Click '重烤' -> grillSlots occupied=1, cookWindow='raw'
    await t1Btn.click({ timeout: TIMEOUT });
    const rePutSnap = await readSnap(page, 't1');
    assert.equal(rePutSnap.slots.filter((s) => s.occupied).length, 1, `${tag}/reput: expected 1 occupied grill slot`);
    assert.equal(rePutSnap.cs.cookWindow, 'raw', `${tag}/reput: expected cookWindow==='raw', got ${rePutSnap.cs.cookWindow}`);
    assert.equal(rePutSnap.domWindow, 'raw', `${tag}/reput: expected data-cook-window='raw'`);

    // 6) Tick +6.5s -> perfect window -> click lift -> money increases, served+1, angry===0
    await tickSec(page, 6.5);
    const perfectSnap = await readSnap(page, 't1');
    assert.equal(perfectSnap.cs.cookWindow, 'perfect', `${tag}/perfect: expected perfect at t=6.5s, got ${perfectSnap.cs.cookWindow}`);
    await t1Btn.click({ timeout: TIMEOUT });
    const servedSnap = await readSnap(page, 't1');
    assert.ok(servedSnap.st.money > before.st.money,
      `${tag}/serve: expected money > ${before.st.money}, got ${servedSnap.st.money}`);
    assert.equal(servedSnap.st.served, before.st.served + 1,
      `${tag}/serve: expected served=${before.st.served + 1}, got ${servedSnap.st.served}`);
    assert.equal(servedSnap.st.angry, 0, `${tag}/serve: expected angry===0, got ${servedSnap.st.angry}`);
    assert.equal(servedSnap.st.waste, 1, `${tag}/serve: expected waste===1, got ${servedSnap.st.waste}`);
    assert.equal(servedSnap.slots.filter((s) => s.occupied).length, 0, `${tag}/serve: grill slot not released`);
    assert.equal(servedSnap.cs.cookWindow, 'eating', `${tag}/serve: expected eating after serve`);

    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `over(border=${overSnap.borderColor} ${overSnap.borderWidth}, btnBg=${overSnap.btnBg}) | ` +
      `burnt@12.05s(waste=${burntSnap.st.waste}, angry=${burntSnap.st.angry}, seated=true, btn="${burntSnap.btnText}", border=${burntSnap.borderColor}) | ` +
      `retry@+1.3s(win=${retrySnap.cs.cookWindow}, btn="${retrySnap.btnText}", pr="${retrySnap.prText}") | ` +
      `re-grill->perfect@6.5s->served=${servedSnap.st.served} money=+¥${servedSnap.st.money - before.st.money} angry=${servedSnap.st.angry} | 0 JS err`,
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
console.log('BURN-RETRY OK');
