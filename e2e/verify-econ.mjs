// E2E verification for Buffet Economy Model (390x844 mobile portrait):
//  1) Opening: window.__econ.entryFee === 79.9, opening revenue = seats * 79.9 (Lv.1: 3 * 79.9 = 239.7)
//  2) Menu prices: all DISHES[*].price === 0; serving different dishes (pork vs mixian) produces identical
//     money delta (strictly satisfaction-based tip from entryFee, zero dish-price impact); departure changes money by 0
//  3) Session duration: 300s (5:00 -> 0:00 -> results phase)
//  4) Single burn (>8.0s): money UNCHANGED, satisfaction drops, stars do NOT rise (3★ -> 2★)
//  5) Satisfaction below threshold (<40%): seated guest leaves early, table enters 2s cleanup and accepts
//     a new guest after 2s, serving new guest increases turnRate
//  6) 0 console errors, 0 page errors, 0 failed network requests
//  + Captures 2 screenshots: e2e/shots/econ-start.png & e2e/shots/econ-settle.png
//
// Usage: node e2e/verify-econ.mjs   (auto-starts vite preview if E2E_BASE is unset)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const TIMEOUT = 60000;
mkdirSync('e2e/shots', { recursive: true });

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startPreviewServer() {
  if (process.env.E2E_BASE) return { child: null, base: process.env.E2E_BASE };
  const port = await getFreePort();
  const base = `http://127.0.0.1:${port}/bbq/`;
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errOut = '';
  child.stderr.on('data', (d) => { errOut += d.toString(); });
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) {
      throw new Error(`vite preview exited (${child.exitCode}): ${errOut}`);
    }
    try {
      const res = await fetch(base);
      if (res.ok) return { child, base };
    } catch { /* waiting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill('SIGTERM');
  throw new Error(`vite preview failed to start on ${base}: ${errOut}`);
}

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const tickSec = (page, sec) =>
  page.evaluate((s) => {
    const dt = 0.05;
    const steps = Math.max(1, Math.round(s / dt));
    window.__test.tick(dt, steps);
  }, sec);

async function tapCenter(page, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, selector);
  assert.ok(box && box.w > 0 && box.h > 0, `selector not visible: ${selector}`);
  await page.mouse.click(box.x, box.y);
}

async function capture(page, outPath) {
  await raf2(page);
  const cdp = await page.context().newCDPSession(page);
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(outPath, Buffer.from(data, 'base64'));
  } finally {
    await cdp.detach().catch(() => {});
  }
}

async function spawnAndSeat(page, dish) {
  const tableId = await page.evaluate((d) => window.__test.spawnNow(d), dish);
  assert.ok(tableId, `failed to spawn customer for ${dish}`);
  const seated = await page.evaluate((tid) => {
    for (let i = 0; i < 240; i++) {
      window.__test.tick(0.05, 1);
      const c = window.__game.customers.find((x) => x.table === tid && x.phase === 'seated');
      if (c) return true;
    }
    return false;
  }, tableId);
  assert.equal(seated, true, `customer at ${tableId} never reached seated phase`);
  return tableId;
}

/** Execute exact Gameplay v2 3-click chain (Pass -> Grill -> Plate in perfect window). */
async function serveTableV2(page, tableId) {
  // Wait for 3.0s auto-prep to place dish into Pass window
  const ready = await page.evaluate((tid) => {
    for (let i = 0; i < 100; i++) {
      const c = window.__game.customers.find((x) => x.table === tid && x.phase === 'seated');
      if (c && c.orderState === 'ready') return true;
      window.__test.tick(0.05, 1);
    }
    return false;
  }, tableId);
  assert.equal(ready, true, `${tableId} never reached ready in Pass`);
  await raf2(page);

  // Click 1: Take from Pass
  await tapCenter(page, `#bbq-pass .pass-slot[data-table="${tableId}"]`);
  await raf2(page);

  // Click 2: Place onto tabletop grill
  await tapCenter(page, `#bbq-orders .card[data-table="${tableId}"] .card-btn`);
  await raf2(page);

  // Advance into perfect window (5.6s in [5.0, 7.0))
  await tickSec(page, 5.6);
  await raf2(page);

  // Click 3: Plate & serve
  await tapCenter(page, `#bbq-orders .card[data-table="${tableId}"] .card-btn`);
  await raf2(page);
}

/** Clear all active eating/leaving customers & table cooldowns cleanly via simulation ticks. */
async function waitAllTablesFree(page, maxSec = 35) {
  const ok = await page.evaluate((limit) => {
    const steps = Math.ceil(limit / 0.05);
    for (let i = 0; i < steps; i++) {
      const st = window.__test.state();
      const busy = Object.values(st.tables).some((tb) => tb.guest !== null || tb.cooldown > 0);
      if (!busy && st.customers.length === 0) return true;
      window.__test.tick(0.05, 1);
    }
    return false;
  }, maxSec);
  assert.equal(ok, true, 'tables did not clear within time budget');
}

const server = await startPreviewServer();
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

async function runSuite(BASE) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('crash', () => pageErrors.push('PAGE CRASH'));
    page.on('requestfailed', (req) =>
      failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'failed'})`));
    page.on('response', (res) => {
      if (res.status() >= 400) failedRequests.push(`HTTP ${res.status()} ${res.url()}`);
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    let frames = 0;
    for (let i = 0; i < 80 && frames < 5; i++) {
      await page.waitForTimeout(150);
      frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(frames >= 5, `scene never rendered frames (frames=${frames})`);

    // Freeze wall clock right before Start for exact 300.000s deterministic simulation ticks
    await page.evaluate(() => {
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', { configurable: true, writable: true, value: () => frozen });
    });
    await page.locator('.bbq-panel [data-btn="start"]').click({ timeout: TIMEOUT });
    await page.evaluate(() => {
      window.__test.pauseSpawns(true);
    });
    await raf2(page);

    // =========================================================================
    // ASSERTION 1: entryFee === 79.9 & opening revenue = seats * 79.9
    // =========================================================================
    const startSnap = await page.evaluate(() => ({
      econ: window.__econ,
      st: window.__test.state(),
      timeText: document.querySelector('#bbq-hud .time')?.textContent?.trim() ?? '',
      moneyText: document.querySelector('#bbq-hud .topbar .tb:nth-child(2) .v')?.textContent?.trim() ?? '',
      stripText: document.querySelector('#bbq-econ-strip')?.textContent?.trim() ?? '',
    }));

    const expectedEntryRevenue = Math.round(startSnap.econ.seats * 79.9 * 100) / 100;
    assert.equal(startSnap.econ.entryFee, 79.9, `entryFee expected 79.9, got ${startSnap.econ.entryFee}`);
    assert.equal(startSnap.econ.seats, 3, `Lv.1 seats expected 3, got ${startSnap.econ.seats}`);
    assert.equal(startSnap.econ.entryRevenue, expectedEntryRevenue, `entryRevenue mismatch`);
    assert.equal(startSnap.econ.money, expectedEntryRevenue, `opening money expected ${expectedEntryRevenue}, got ${startSnap.econ.money}`);
    assert.equal(startSnap.econ.served, 0, 'opening served must be 0');
    assert.equal(startSnap.econ.satisfaction, 100, 'opening satisfaction must be 100');
    assert.equal(startSnap.econ.turnRate, 0, 'opening turnRate must be 0');
    assert.equal(startSnap.econ.phase, 'playing', 'phase must be playing');
    assert.equal(startSnap.st.timeLeft, 300, `initial timeLeft expected 300, got ${startSnap.st.timeLeft}`);
    assert.equal(startSnap.timeText, '5:00', `initial HUD time expected 5:00, got ${startSnap.timeText}`);

    await capture(page, 'e2e/shots/econ-start.png');
    console.log(
      `ASSERT 1 PASS: entryFee=¥${startSnap.econ.entryFee}, seats=${startSnap.econ.seats}, ` +
      `openingMoney=¥${startSnap.econ.money} (${startSnap.econ.seats}×79.9=${expectedEntryRevenue}), ` +
      `hudMoney=${startSnap.moneyText}, strip="${startSnap.stripText}"`,
    );
    console.log('SHOT e2e/shots/econ-start.png');

    // =========================================================================
    // ASSERTION 2: All dish prices === 0; money does NOT vary by dish (only tip)
    //              + normal dining occupancy & departure changes money by 0
    // =========================================================================
    const dishPrices = await page.evaluate(() =>
      Object.fromEntries(Object.entries(window.__test.state().dishes).map(([k, v]) => [k, v.price])));
    assert.ok(Object.keys(dishPrices).length >= 3, 'expected at least 3 dishes');
    for (const [id, price] of Object.entries(dishPrices)) {
      assert.equal(price, 0, `dish ${id} price must be 0, got ${price}`);
    }

    // Serve dish A ('pork', formerly ¥48)
    const tPork = await spawnAndSeat(page, 'pork');
    const prePork = await page.evaluate((tid) => ({
      money: window.__econ.money,
      tips: window.__econ.tips,
      dineDuration: window.__test.state().customers.find((c) => c.table === tid)?.dineDuration,
    }), tPork);
    assert.equal(prePork.dineDuration, 100, `Lv.1 compressed dineDuration expected 100s (300/3), got ${prePork.dineDuration}`);
    await serveTableV2(page, tPork);
    const postPork = await page.evaluate((tid) => ({
      money: window.__econ.money,
      tips: window.__econ.tips,
      served: window.__econ.served,
      eatT: window.__test.state().customers.find((c) => c.table === tid)?.eatT,
    }), tPork);
    const deltaPork = Math.round((postPork.money - prePork.money) * 100) / 100;
    const tipPork = Math.round((postPork.tips - prePork.tips) * 100) / 100;
    assert.equal(deltaPork, tipPork, `pork money delta (${deltaPork}) must equal tip only (${tipPork})`);
    assert.ok(postPork.eatT >= 15 && postPork.eatT <= 25, `expected compressed eatT ~20s, got ${postPork.eatT}`);

    // Serve dish B ('mixian', formerly ¥26) at identical 100% satisfaction
    const tMixian = await spawnAndSeat(page, 'mixian');
    const preMixian = await page.evaluate(() => ({ money: window.__econ.money, tips: window.__econ.tips }));
    await serveTableV2(page, tMixian);
    const postMixian = await page.evaluate(() => ({ money: window.__econ.money, tips: window.__econ.tips, served: window.__econ.served }));
    const deltaMixian = Math.round((postMixian.money - preMixian.money) * 100) / 100;
    const tipMixian = Math.round((postMixian.tips - preMixian.tips) * 100) / 100;
    assert.equal(deltaMixian, tipMixian, `mixian money delta (${deltaMixian}) must equal tip only (${tipMixian})`);
    assert.equal(deltaPork, deltaMixian, `money delta must not vary by dish (pork=${deltaPork} vs mixian=${deltaMixian})`);

    // Let both eating guests finish dining and depart normally -> money must remain unchanged
    const moneyBeforeLeave = postMixian.money;
    await waitAllTablesFree(page, 35);
    const moneyAfterLeave = await page.evaluate(() => window.__econ.money);
    assert.equal(moneyAfterLeave, moneyBeforeLeave, `departure must not change money (${moneyBeforeLeave} -> ${moneyAfterLeave})`);
    console.log(
      `ASSERT 2 PASS: dishes=${JSON.stringify(dishPrices)}, pork Δmoney=¥${deltaPork} (tip=¥${tipPork}), ` +
      `mixian Δmoney=¥${deltaMixian} (tip=¥${tipMixian}), post-eat leave Δmoney=¥0`,
    );

    // Serve 4 more guests (total served=6 == targetGuests, sat=100%, stars=3★) so Assertion 4 tests 3★ -> 2★
    for (const dish of ['mushroom', 'pork', 'mixian', 'mushroom']) {
      const tid = await spawnAndSeat(page, dish);
      await serveTableV2(page, tid);
    }
    const beforeBurn = await page.evaluate(() => ({
      econ: window.__econ,
      st: window.__test.state(),
    }));
    assert.equal(beforeBurn.econ.served, 6, `expected served=6, got ${beforeBurn.econ.served}`);
    assert.equal(beforeBurn.econ.stars, 3, `expected 3★ at served=6 & sat=100%, got ${beforeBurn.econ.stars}`);

    // Wait for tables to free so we have a clean table for Assertion 4
    await waitAllTablesFree(page, 35);

    // =========================================================================
    // ASSERTION 4: Trigger 1 burn -> money UNCHANGED, satisfaction drops, stars do NOT rise
    // =========================================================================
    const tBurn = await spawnAndSeat(page, 'pork');
    await page.evaluate((tid) => {
      for (let i = 0; i < 100; i++) {
        const c = window.__game.customers.find((x) => x.table === tid && x.phase === 'seated');
        if (c && c.orderState === 'ready') break;
        window.__test.tick(0.05, 1);
      }
    }, tBurn);
    await raf2(page);
    await tapCenter(page, `#bbq-pass .pass-slot[data-table="${tBurn}"]`);
    await raf2(page);
    await tapCenter(page, `#bbq-orders .card[data-table="${tBurn}"] .card-btn`);
    await raf2(page);

    const preBurnEcon = await page.evaluate(() => ({ ...window.__econ }));
    // Tick past 8.0s burn line (8.4s)
    await tickSec(page, 8.4);
    await raf2(page);
    const postBurnEcon = await page.evaluate(() => ({
      econ: { ...window.__econ },
      waste: window.__test.state().waste,
    }));

    assert.equal(postBurnEcon.econ.money, preBurnEcon.money, `burn must NOT change money (${preBurnEcon.money} -> ${postBurnEcon.econ.money})`);
    assert.ok(
      postBurnEcon.econ.satisfaction < preBurnEcon.satisfaction,
      `burn must reduce satisfaction (${preBurnEcon.satisfaction} -> ${postBurnEcon.econ.satisfaction})`,
    );
    assert.ok(
      postBurnEcon.econ.stars <= preBurnEcon.stars,
      `burn must NOT increase stars (${preBurnEcon.stars} -> ${postBurnEcon.econ.stars})`,
    );
    assert.equal(postBurnEcon.econ.stars, 2, `expected monotonic star drop 3★ -> 2★ after burn at sat=${postBurnEcon.econ.satisfaction}%`);
    console.log(
      `ASSERT 4 PASS: 1 burn -> money unchanged ¥${preBurnEcon.money}==¥${postBurnEcon.econ.money}, ` +
      `satisfaction ${preBurnEcon.satisfaction}%->${postBurnEcon.econ.satisfaction}%, ` +
      `stars ${preBurnEcon.stars}★->${postBurnEcon.econ.stars}★, waste=${postBurnEcon.waste}`,
    );

    // =========================================================================
    // ASSERTION 3: Full 300s session countdown -> settles cleanly to results
    //              + Capture econ-settle.png
    // =========================================================================
    const midTime = await page.evaluate(() => window.__test.state().timeLeft);
    assert.ok(midTime > 0 && midTime < 300, `expected mid-session timeLeft in (0,300), got ${midTime}`);
    // Advance remaining session time to 0
    await tickSec(page, midTime + 0.2);
    await raf2(page);

    const settleSnap = await page.evaluate(() => ({
      econ: window.__econ,
      st: window.__test.state(),
      timeText: document.querySelector('#bbq-hud .time')?.textContent?.trim() ?? '',
      panelText: document.querySelector('.bbq-panel .card')?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
      starsAttr: document.querySelector('.bbq-panel .stars-big')?.dataset.stars ?? '',
    }));

    assert.equal(settleSnap.econ.phase, 'results', `expected phase='results' at t=0, got ${settleSnap.econ.phase}`);
    assert.equal(settleSnap.st.timeLeft, 0, `expected final timeLeft=0, got ${settleSnap.st.timeLeft}`);
    assert.match(settleSnap.panelText, /营业额/, 'settlement panel missing 营业额');
    assert.match(settleSnap.panelText, /服务客数/, 'settlement panel missing 服务客数');
    assert.match(settleSnap.panelText, /翻台率/, 'settlement panel missing 翻台率');
    assert.match(settleSnap.panelText, /满意度/, 'settlement panel missing 满意度');
    assert.equal(settleSnap.starsAttr, String(settleSnap.econ.stars), 'settlement stars attribute mismatch');

    await capture(page, 'e2e/shots/econ-settle.png');
    console.log(
      `ASSERT 3 PASS: session duration=300s (start=${startSnap.st.timeLeft.toFixed(1)}s/${startSnap.timeText} -> ` +
      `end=${settleSnap.st.timeLeft.toFixed(1)}s/${settleSnap.timeText}), phase=${settleSnap.econ.phase}, ` +
      `settle={money:¥${settleSnap.econ.money}, served:${settleSnap.econ.served}, turnRate:${settleSnap.econ.turnRate}×, ` +
      `sat:${settleSnap.econ.satisfaction}%, stars:${settleSnap.econ.stars}★}`,
    );
    console.log('SHOT e2e/shots/econ-settle.png');

    // =========================================================================
    // ASSERTION 5: Satisfaction drops below threshold (<40%) -> guest leaves early,
    //              table accepts new guest after 2s cleanup, turnRate changes
    // =========================================================================
    await page.locator('.bbq-panel [data-btn="replay"]').click({ timeout: TIMEOUT });
    await page.evaluate(() => window.__test.pauseSpawns(true));
    await raf2(page);

    const replayEcon = await page.evaluate(() => ({ ...window.__econ }));
    assert.equal(replayEcon.money, expectedEntryRevenue, 'replay must reset opening money');
    assert.equal(replayEcon.satisfaction, 100, 'replay must reset satisfaction to 100');
    assert.equal(replayEcon.served, 0, 'replay must reset served to 0');
    assert.equal(replayEcon.turnRate, 0, 'replay must reset turnRate to 0');

    // Seat 3 guests (t1, t2, t3): burn t1 (-18 -> 82), burn t3 (-18 -> 64), burn a fresh guest on t4 (-18 -> 46),
    // then cause a raw re-grill on t2 (-8 -> 38 < 40 threshold!) -> t2 leaves early immediately!
    const t1 = await spawnAndSeat(page, 'pork');
    const t2 = await spawnAndSeat(page, 'mushroom');
    const t3 = await spawnAndSeat(page, 'mixian');
    const t4 = await spawnAndSeat(page, 'pork');

    // Wait for t1, t2, t3 to reach Pass (passCapacity=3)
    await page.evaluate(() => {
      for (let i = 0; i < 100; i++) {
        if (window.__game.pass.length >= 3) break;
        window.__test.tick(0.05, 1);
      }
      for (const c of window.__game.customers) {
        if (c.phase === 'seated') c.patience = c.patienceMax;
      }
    });
    await raf2(page);

    // Put t1 and t3 on grill (both will burn at +8.2s -> -18 each = -36 -> sat=64)
    await tapCenter(page, `#bbq-pass .pass-slot[data-table="${t1}"]`);
    await tapCenter(page, `#bbq-orders .card[data-table="${t1}"] .card-btn`);
    await tapCenter(page, `#bbq-pass .pass-slot[data-table="${t3}"]`);
    await tapCenter(page, `#bbq-orders .card[data-table="${t3}"] .card-btn`);
    // Now pass has room for t4 to prep -> wait 3.1s so t4 enters Pass, then put t4 on grill too
    await tickSec(page, 3.2);
    await raf2(page);
    await tapCenter(page, `#bbq-pass .pass-slot[data-table="${t4}"]`);
    await tapCenter(page, `#bbq-orders .card[data-table="${t4}"] .card-btn`);
    // Put t2 on grill right after t4 (so t1 & t3 burn at +5.2s, t4 burns at +8.3s)
    await tickSec(page, 5.5); // t1 & t3 burn (-36 -> sat=64), t4 at 5.5s
    await tickSec(page, 3.0); // t4 burns (-18 -> sat=46)
    await raf2(page);

    // Keep t2 patience healthy before raw tap so we test exact threshold crossing via raw tap (-8 -> 38 < 40)
    const preThreshold = await page.evaluate((tid) => {
      const c2 = window.__game.customers.find((c) => c.table === tid && c.phase === 'seated');
      if (c2) c2.patience = c2.patienceMax;
      return {
        sat: window.__econ.satisfaction,
        earlyLeaves: window.__econ.earlyLeaves,
        money: window.__econ.money,
      };
    }, t2);
    assert.ok(preThreshold.sat >= 40 && preThreshold.sat < 50, `expected preThreshold sat in [40,50), got ${preThreshold.sat}`);

    // Take t2 from Pass -> grill for 1.5s -> click raw (<5.0s) -> sat drops by 8 -> 38 < 40 -> t2 leaves early!
    await tapCenter(page, `#bbq-pass .pass-slot[data-table="${t2}"]`);
    await tapCenter(page, `#bbq-orders .card[data-table="${t2}"] .card-btn`);
    await tickSec(page, 1.5);
    await raf2(page);
    await tapCenter(page, `#bbq-orders .card[data-table="${t2}"] .card-btn`);
    await raf2(page);

    const rightAfterEarlyLeave = await page.evaluate((tid) => {
      const st = window.__test.state();
      const tb = st.tables[tid];
      const earlyGuest = st.customers.find((c) => c.table === tid && c.earlyLeft);
      return {
        econ: { ...window.__econ },
        tableGuest: tb.guest,
        tableCooldown: tb.cooldown,
        earlyGuestPhase: earlyGuest?.phase ?? null,
        earlyGuestFlag: earlyGuest?.earlyLeft ?? false,
      };
    }, t2);

    assert.ok(rightAfterEarlyLeave.econ.satisfaction < 40, `satisfaction must drop <40%, got ${rightAfterEarlyLeave.econ.satisfaction}%`);
    assert.equal(rightAfterEarlyLeave.earlyGuestFlag, true, `${t2} guest must have earlyLeft=true`);
    assert.equal(rightAfterEarlyLeave.earlyGuestPhase, 'leaving-angry', `${t2} guest must be leaving-angry`);
    assert.ok(rightAfterEarlyLeave.econ.earlyLeaves >= 1, `earlyLeaves must be >= 1, got ${rightAfterEarlyLeave.econ.earlyLeaves}`);
    assert.equal(rightAfterEarlyLeave.tableGuest, null, `${t2} guest slot must be freed immediately on early leave`);
    assert.equal(rightAfterEarlyLeave.tableCooldown, 2, `${t2} must enter 2.0s cleanup cooldown, got ${rightAfterEarlyLeave.tableCooldown}`);
    assert.equal(rightAfterEarlyLeave.econ.money, preThreshold.money, 'early leave must NOT deduct money');

    // During 2s cleanup (at 1.0s), t2 is still cooling down (cannot re-seat)
    await tickSec(page, 1.0);
    const midClean = await page.evaluate((tid) => window.__test.state().tables[tid], t2);
    assert.ok(midClean.cooldown > 0 && midClean.guest === null, `t2 should still be cleaning at 1.0s (cooldown=${midClean.cooldown})`);

    // After another 1.1s (total 2.1s >= 2.0s), t2 cooldown === 0 and can accept a new guest!
    await tickSec(page, 1.1);
    const afterClean = await page.evaluate((tid) => window.__test.state().tables[tid], t2);
    assert.equal(afterClean.cooldown, 0, `t2 cooldown must reach 0 after 2s, got ${afterClean.cooldown}`);
    assert.equal(afterClean.guest, null, 't2 must be empty and ready for a new guest');

    // Seat a new guest (explicitly verify t2 can accept a new guest, or seat on free tables until t2 gets one)
    const turnRateBefore = await page.evaluate(() => window.__econ.turnRate);
    // Clear any other tables so spawnNow picks deterministically or verify t2 specifically becomes seated
    const newTableId = await spawnAndSeat(page, 'pork');
    assert.ok(newTableId, 'failed to seat new guest after 2s cleanup');
    // Also spawn until t2 itself has a new guest if another earlier table was free first
    let t2Seated = newTableId === t2;
    for (let k = 0; k < 3 && !t2Seated; k++) {
      const nextTid = await spawnAndSeat(page, 'mushroom');
      if (nextTid === t2) t2Seated = true;
    }
    assert.equal(t2Seated, true, `${t2} did not accept a new guest after 2s cleanup`);

    // Serve the new guest on t2 -> served increases & turnRate changes!
    await serveTableV2(page, t2);
    const afterReseatServe = await page.evaluate(() => ({ ...window.__econ }));
    assert.ok(
      afterReseatServe.turnRate > turnRateBefore,
      `turnRate must increase after serving replacement guest (${turnRateBefore} -> ${afterReseatServe.turnRate})`,
    );
    console.log(
      `ASSERT 5 PASS: sat ${preThreshold.sat}%->${rightAfterEarlyLeave.econ.satisfaction}% (<40%) -> ` +
      `${t2} earlyLeft=true (earlyLeaves=${rightAfterEarlyLeave.econ.earlyLeaves}), cooldown=2.0s->0s -> ` +
      `new guest seated & served on ${t2}, turnRate ${turnRateBefore}->${afterReseatServe.turnRate}×`,
    );

    // =========================================================================
    // ASSERTION 6: 0 console errors, 0 page errors, 0 failed requests
    // =========================================================================
    assert.equal(consoleErrors.length, 0, `console errors:\n${consoleErrors.join('\n')}`);
    assert.equal(pageErrors.length, 0, `page errors:\n${pageErrors.join('\n')}`);
    assert.equal(failedRequests.length, 0, `failed requests:\n${failedRequests.join('\n')}`);
    console.log('ASSERT 6 PASS: 0 console errors, 0 page errors, 0 failed requests');
    console.log('VERIFY-ECON OK');
  } finally {
    await browser.close().catch(() => {});
  }
}

try {
  for (let attempt = 0; ; attempt++) {
    try {
      await runSuite(server.base);
      break;
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (e?.name === 'AssertionError' || !ENV_CRASH.test(msg) || attempt >= 2) throw e;
      console.error(`env crash (${msg.split('\n')[0]}), retry ${attempt + 1}/2`);
    }
  }
} finally {
  if (server.child) server.child.kill('SIGTERM');
}
