// E2E verification for Gameplay v2 (390x844 mobile portrait):
//  1) Within 3.0s after customer seats, 1 dish for that table appears in Pass window (count + tableId)
//  2) Click Pass tray -> carrying != null & player moves toward Pass; clicking another Pass tray is invalid (count unchanged)
//  3) Click table order card -> table grilling = true, heat bar advances, dish absent from Pass queue
//  4) Click once inside perfect window (5.0-7.0s) -> orderState === 'done', money increases, exact 3 clicks
//  5) Let a dish burn (>8.0s) -> order voided ('burnt'), money decreases, patience drops, NO duplicate deduction
//  6) 0 console errors, 0 failed network requests, all mobile touch targets >=44px & strictly in bottom half (y >= 422), no horizontal scroll
//  + Captures 4 screenshots into e2e/shots/: v2-orders.png, v2-grilling.png, v2-served.png, v2-mobile-390x844.png
//
// Usage: node e2e/verify-loop-v2.mjs   (auto-starts vite preview if E2E_BASE is unset)

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

async function seatCustomers(page, dishes) {
  for (const dish of dishes) {
    const tableId = await page.evaluate((d) => window.__test.spawnNow(d), dish);
    assert.ok(tableId, `failed to spawn customer for ${dish}`);
  }
  // Tick until all spawned customers walk from door to seat
  const seated = await page.evaluate((targetCount) => {
    for (let i = 0; i < 300; i++) {
      window.__test.tick(0.05, 1);
      // Keep already-seated customers paused at prepT=0 until all target guests seat cleanly,
      // wait: only do this when seating multiple at once? No, for single guest it breaks on the exact seating tick!
      const seatedList = window.__game.customers.filter((c) => c.phase === 'seated');
      if (seatedList.length >= targetCount) return seatedList.length;
    }
    return window.__game.customers.filter((c) => c.phase === 'seated').length;
  }, dishes.length);
  assert.ok(seated >= dishes.length, `expected ${dishes.length} seated, got ${seated}`);
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
  page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'failed'})`));
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

  // Click Start button & freeze wall clock for deterministic simulation ticks
  await page.locator('.bbq-panel [data-btn="start"]').click({ timeout: TIMEOUT });
  await page.evaluate(() => {
    window.__test.pauseSpawns(true);
    const frozen = performance.now();
    Object.defineProperty(performance, 'now', { configurable: true, writable: true, value: () => frozen });
  });
  await raf2(page);

  // Check legacy purge in runtime state & DOM
  const cleanCheck = await page.evaluate(() => {
    const st = window.__test.state();
    return {
      stationIds: Object.keys(st.stations),
      bodyText: document.body.innerText ?? '',
    };
  });
  assert.deepEqual(cleanCheck.stationIds, ['pass'], `expected stations=['pass'], got ${JSON.stringify(cleanCheck.stationIds)}`);
  assert.doesNotMatch(cleanCheck.bodyText, /去料箱|去切配台|去装盘台|去垃圾桶|料箱取料/, 'legacy station copy leaked into HUD');

  // =========================================================================
  // ASSERTION 1: Within 3s of seating, 1 dish for that table appears in Pass
  // =========================================================================
  await seatCustomers(page, ['pork']);
  const rightAfterSeat = await page.evaluate(() => {
    const st = window.__test.state();
    const card = window.__test.cardState('t1');
    return { st, card };
  });
  assert.equal(rightAfterSeat.st.pass.length, 0, 'pass should be empty immediately on seating');
  assert.equal(rightAfterSeat.card.orderState, 'ordering', 't1 should start in ordering state');
  assert.equal(rightAfterSeat.card.disabled, true, 't1 order card button must be disabled during ordering');

  // Advance exactly 3.0s -> dish appears in Pass window
  await tickSec(page, 3.0);
  await raf2(page);
  const afterPrep = await page.evaluate(() => {
    const st = window.__test.state();
    const card = window.__test.cardState('t1');
    const occupiedSlots = [...document.querySelectorAll('#bbq-pass .pass-slot[data-occupied="true"]')].map((el) => ({
      table: el.dataset.table,
      dish: el.dataset.dish,
      text: el.innerText.replace(/\s+/g, ' ').trim(),
    }));
    return { st, card, occupiedSlots };
  });
  assert.equal(afterPrep.st.pass.length, 1, `expected 1 item in Pass within 3s, got ${afterPrep.st.pass.length}`);
  assert.equal(afterPrep.st.pass[0].tableId, 't1', `expected Pass item tableId='t1', got ${afterPrep.st.pass[0].tableId}`);
  assert.equal(afterPrep.st.pass[0].dishId, 'pork', `expected Pass item dishId='pork'`);
  assert.equal(afterPrep.card.orderState, 'ready', `expected t1 orderState='ready', got ${afterPrep.card.orderState}`);
  assert.equal(afterPrep.occupiedSlots.length, 1, 'expected 1 occupied Pass slot in DOM');
  assert.match(afterPrep.occupiedSlots[0].text, /1号桌/, `Pass slot missing table label: "${afterPrep.occupiedSlots[0].text}"`);
  assert.match(afterPrep.occupiedSlots[0].text, /五花肉/, `Pass slot missing dish name: "${afterPrep.occupiedSlots[0].text}"`);
  console.log('ASSERT 1 PASS: customer seated -> within 3.0s, Pass has 1 dish for t1 (五花肉)');

  // Seat t2 (mushroom) and let it prep to ready too, so Pass has 2 trays for Assertion 2;
  // Also spawn t3 (mixian) so v2-orders.png shows seated ordering + Pass ready trays simultaneously
  await page.evaluate(() => { window.__test.spawnNow('mushroom'); });
  await page.evaluate(() => {
    for (let i = 0; i < 200; i++) {
      window.__test.tick(0.05, 1);
      const t2 = window.__game.customers.find((c) => c.table === 't2');
      if (t2 && t2.orderState === 'ready') break;
    }
    // Restore t1/t2 patience to full so subsequent timing tests are clean
    for (const c of window.__game.customers) {
      if (c.phase === 'seated') c.patience = c.patienceMax;
    }
    window.__test.spawnNow('mixian');
    for (let i = 0; i < 200; i++) {
      window.__test.tick(0.05, 1);
      const t3 = window.__game.customers.find((c) => c.table === 't3');
      if (t3 && t3.phase === 'seated') break;
    }
    // Tick 1.1s so t3 shows active 3s prep ring while t1 & t2 sit in Pass window
    window.__test.tick(0.05, 22);
    for (const c of window.__game.customers) {
      if (c.phase === 'seated') c.patience = c.patienceMax;
    }
    window.__test.tick(0.05, 1);
  });
  await capture(page, 'e2e/shots/v2-orders.png');
  console.log('SHOT e2e/shots/v2-orders.png');

  // =========================================================================
  // ASSERTION 2: Click Pass tray -> carrying != null & player moves toward Pass;
  //              Clicking another Pass tray while carrying is INVALID (count unchanged)
  // =========================================================================
  const beforeTake = await page.evaluate(() => {
    const st = window.__test.state();
    return {
      passLen: st.pass.length,
      player: st.player,
      passPos: st.passPos,
      dist: Math.hypot(st.player.x - st.passPos.x, st.player.z - st.passPos.z),
    };
  });
  assert.ok(beforeTake.passLen >= 2, `need >=2 dishes in Pass before take test, got ${beforeTake.passLen}`);

  let t1Clicks = 0;
  // Click #1 for t1: Pass tray for t1
  await tapCenter(page, '#bbq-pass .pass-slot[data-table="t1"]');
  t1Clicks += 1;
  await tickSec(page, 0.45);
  await raf2(page);

  const afterTake = await page.evaluate(() => {
    const st = window.__test.state();
    const handText = document.querySelector('#bbq-hand')?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
    return {
      st,
      handText,
      dist: Math.hypot(st.player.x - st.passPos.x, st.player.z - st.passPos.z),
    };
  });
  assert.notEqual(afterTake.st.carrying, null, 'carrying must be non-null after clicking Pass tray');
  assert.equal(afterTake.st.carrying.tableId, 't1', `expected carrying t1, got ${afterTake.st.carrying.tableId}`);
  assert.equal(afterTake.st.carrying.dishId, 'pork', `expected carrying pork`);
  assert.ok(
    afterTake.dist < beforeTake.dist - 0.3,
    `player did not move toward Pass (before=${beforeTake.dist.toFixed(2)}m, after=${afterTake.dist.toFixed(2)}m)`,
  );
  assert.match(afterTake.handText, /烤五花肉拼盘/, `hand HUD missing dish name: "${afterTake.handText}"`);
  assert.match(afterTake.handText, /1\s*号桌/, `hand HUD missing table num: "${afterTake.handText}"`);

  const passCountAfterFirstTake = afterTake.st.pass.length;
  // Click another Pass tray (t2) while carrying -> MUST BE INVALID (count unchanged)
  await tapCenter(page, '#bbq-pass .pass-slot[data-table="t2"]');
  await raf2(page);
  const afterSecondPassClick = await page.evaluate(() => window.__test.state());
  assert.equal(
    afterSecondPassClick.pass.length,
    passCountAfterFirstTake,
    `clicking 2nd Pass tray while carrying should not change Pass count (${passCountAfterFirstTake} -> ${afterSecondPassClick.pass.length})`,
  );
  assert.equal(afterSecondPassClick.carrying.tableId, 't1', 'carrying must remain t1 after blocked Pass click');
  console.log(
    `ASSERT 2 PASS: carrying=t1/pork, player moved toward Pass (${beforeTake.dist.toFixed(2)}m->${afterTake.dist.toFixed(2)}m), 2nd Pass tray click ignored (pass=${afterSecondPassClick.pass.length})`,
  );

  // =========================================================================
  // ASSERTION 3: Click t1 order card -> grilling = true, heat bar advances,
  //              t1 dish gone from Pass queue
  // =========================================================================
  // Click #2 for t1: Order card button to start grilling
  await tapCenter(page, '#bbq-orders .card[data-table="t1"] .card-btn');
  t1Clicks += 1;
  await raf2(page);

  const rightAfterGrill = await page.evaluate(() => ({
    st: window.__test.state(),
    card: window.__test.cardState('t1'),
  }));
  assert.equal(rightAfterGrill.st.tables.t1.grill.grilling, true, 't1 grilling must be true after clicking order card');
  assert.equal(rightAfterGrill.st.carrying, null, 'carrying must be null after placing meat on tabletop grill');
  assert.equal(
    rightAfterGrill.st.pass.some((p) => p.tableId === 't1'),
    false,
    't1 dish must be absent from Pass queue',
  );
  assert.equal(rightAfterGrill.card.orderState, 'grilling', `expected t1 card orderState='grilling', got ${rightAfterGrill.card.orderState}`);

  // Tick 2.5s -> heat bar actively advancing
  await tickSec(page, 2.5);
  await raf2(page);
  const midGrill = await page.evaluate(() => {
    const st = window.__test.state();
    const fillStyle = document.querySelector('#bbq-orders .card[data-table="t1"] .bar-fill')?.style.width ?? '0%';
    return { grillT: st.tables.t1.grill.grillT, fillPct: parseFloat(fillStyle) };
  });
  assert.ok(midGrill.grillT >= 2.4, `expected grillT >= 2.4s, got ${midGrill.grillT}`);
  assert.ok(midGrill.fillPct >= 28, `expected heat bar fill >= 28%, got ${midGrill.fillPct}%`);
  console.log(`ASSERT 3 PASS: t1 grilling=true, grillT=${midGrill.grillT.toFixed(2)}s, heatBar=${midGrill.fillPct}%, t1 absent from Pass`);

  // Advance t1 into perfect window (5.0-7.0s -> t = 5.6s) and capture v2-grilling.png
  await tickSec(page, 3.1);
  await raf2(page);
  const atPerfect = await page.evaluate(() => ({
    st: window.__test.state(),
    card: window.__test.cardState('t1'),
  }));
  assert.equal(atPerfect.st.tables.t1.grill.cookWindow, 'perfect', `expected perfect window at 5.6s, got ${atPerfect.st.tables.t1.grill.cookWindow}`);
  assert.equal(atPerfect.card.orderState, 'serving', `expected orderState='serving' in perfect window, got ${atPerfect.card.orderState}`);
  await capture(page, 'e2e/shots/v2-grilling.png');
  console.log('SHOT e2e/shots/v2-grilling.png');

  // =========================================================================
  // ASSERTION 4: Click once inside perfect window -> orderState === 'done',
  //              money increases, EXACTLY 3 clicks total for this order
  // =========================================================================
  const moneyBeforeServe = atPerfect.st.money;
  // Click #3 for t1: plate & serve
  await tapCenter(page, '#bbq-orders .card[data-table="t1"] .card-btn');
  t1Clicks += 1;
  await raf2(page);

  const afterServe = await page.evaluate(() => {
    const st = window.__test.state();
    const card = window.__test.cardState('t1');
    const c1 = st.customers.find((c) => c.table === 't1');
    return { st, card, c1 };
  });
  assert.equal(afterServe.c1.orderState, 'done', `expected t1 orderState='done', got ${afterServe.c1.orderState}`);
  assert.equal(afterServe.card.orderState, 'done', `expected t1 card orderState='done'`);
  assert.ok(afterServe.st.money > moneyBeforeServe, `expected money to increase (${moneyBeforeServe} -> ${afterServe.st.money})`);
  assert.equal(afterServe.st.served, 1, `expected served=1, got ${afterServe.st.served}`);
  assert.equal(t1Clicks, 3, `expected test click counter === 3, got ${t1Clicks}`);
  assert.equal(afterServe.c1.clicksUsed, 3, `expected customer.clicksUsed === 3, got ${afterServe.c1.clicksUsed}`);
  await capture(page, 'e2e/shots/v2-served.png');
  console.log(`ASSERT 4 PASS: t1 orderState=done, money ${moneyBeforeServe}->¥${afterServe.st.money}, clicks=${afterServe.c1.clicksUsed}`);
  console.log('SHOT e2e/shots/v2-served.png');

  // =========================================================================
  // BONUS CHECK: Undercooked click (<5.0s) resets heat bar on t3
  // =========================================================================
  // Ensure t3 is in Pass, take & grill t3, click early at 1.6s -> grillT resets to 0
  await page.evaluate(() => {
    for (let i = 0; i < 80; i++) {
      const t3 = window.__game.customers.find((c) => c.table === 't3');
      if (t3 && t3.orderState === 'ready') break;
      window.__test.tick(0.05, 1);
    }
  });
  await tapCenter(page, '#bbq-pass .pass-slot[data-table="t3"]');
  await tapCenter(page, '#bbq-orders .card[data-table="t3"] .card-btn');
  await tickSec(page, 1.6);
  const t3BeforeEarly = await page.evaluate(() => window.__test.state().tables.t3.grill.grillT);
  assert.ok(t3BeforeEarly >= 1.5, `t3 grillT should be >=1.5s, got ${t3BeforeEarly}`);
  await tapCenter(page, '#bbq-orders .card[data-table="t3"] .card-btn');
  await raf2(page);
  const t3AfterEarly = await page.evaluate(() => window.__test.state().tables.t3.grill.grillT);
  assert.equal(t3AfterEarly, 0, `early raw click must reset t3 grillT to 0, got ${t3AfterEarly}`);
  console.log(`BONUS PASS: undercooked click reset t3 grillT (${t3BeforeEarly.toFixed(2)}s -> 0s)`);

  // =========================================================================
  // ASSERTION 5: Let t2 burn (>8.0s) -> order voided, money decreases,
  //              patience drops, AND NO duplicate second deduction (B-156)
  // =========================================================================
  await tapCenter(page, '#bbq-pass .pass-slot[data-table="t2"]');
  await tapCenter(page, '#bbq-orders .card[data-table="t2"] .card-btn');
  await tickSec(page, 5.5);
  await tapCenter(page, '#bbq-orders .card[data-table="t3"] .card-btn');
  await raf2(page);

  const preBurn = await page.evaluate(() => {
    const st = window.__test.state();
    const c2 = st.customers.find((c) => c.table === 't2');
    return {
      money: st.money,
      waste: st.waste,
      angry: st.angry,
      patience: c2.patience,
      grillT: st.tables.t2.grill.grillT,
    };
  });
  assert.ok(preBurn.grillT < 7.5, `t2 should not be burnt yet (grillT=${preBurn.grillT})`);

  // Tick past 8.0s burn line (need ~3.0s more from 5.5s -> 8.5s)
  await tickSec(page, 3.0);
  await raf2(page);

  const rightAfterBurn = await page.evaluate(() => {
    const st = window.__test.state();
    const c2 = st.customers.find((c) => c.table === 't2');
    const card2 = window.__test.cardState('t2');
    const card2Text = document.querySelector('#bbq-orders .card[data-table="t2"]')?.innerText ?? '';
    return { st, c2, card2, card2Text };
  });
  assert.equal(rightAfterBurn.c2.orderState, 'burnt', `expected t2 orderState='burnt', got ${rightAfterBurn.c2.orderState}`);
  assert.equal(rightAfterBurn.st.tables.t2.grill.grilling, false, 't2 grill must clear on burn');
  assert.ok(rightAfterBurn.st.money < preBurn.money, `money must decrease on burn (${preBurn.money} -> ${rightAfterBurn.st.money})`);
  assert.ok(
    rightAfterBurn.c2.patience < preBurn.patience - 15,
    `patience must drop sharply on burn (${preBurn.patience} -> ${rightAfterBurn.c2.patience})`,
  );
  assert.equal(rightAfterBurn.st.waste, preBurn.waste + 1, 'waste must increment by 1');
  assert.equal(rightAfterBurn.st.angry, preBurn.angry, 'B-156 guard: single burn must NOT also increment angry');
  assert.doesNotMatch(rightAfterBurn.card2Text, /焦糊\s+焦糊/, `duplicate 焦糊 copy found: "${rightAfterBurn.card2Text}"`);
  assert.notEqual(rightAfterBurn.card2.statusText, rightAfterBurn.card2.btnText, 'statusText and btnText must differ');

  // Advance another 4.5s and try extra clicks -> MUST NOT deduct a second time!
  await page.evaluate(() => {
    document.querySelector('#bbq-orders .card[data-table="t2"]')?.click();
    window.__game.handleTableAction('t2');
  });
  await tickSec(page, 4.5);
  await raf2(page);

  const longAfterBurn = await page.evaluate(() => window.__test.state());
  assert.equal(
    longAfterBurn.money,
    rightAfterBurn.st.money,
    `money was deducted a second time (${rightAfterBurn.st.money} -> ${longAfterBurn.money})`,
  );
  assert.equal(
    longAfterBurn.waste,
    rightAfterBurn.st.waste,
    `waste was incremented a second time (${rightAfterBurn.st.waste} -> ${longAfterBurn.waste})`,
  );
  assert.equal(
    longAfterBurn.angry,
    rightAfterBurn.st.angry,
    `angry was incremented after burn (${rightAfterBurn.st.angry} -> ${longAfterBurn.angry})`,
  );
  console.log(
    `ASSERT 5 PASS: t2 burnt & voided, money ¥${preBurn.money}->¥${rightAfterBurn.st.money} (stable at ¥${longAfterBurn.money}), ` +
    `patience ${preBurn.patience}->${rightAfterBurn.c2.patience}, waste=${longAfterBurn.waste}, angry=${longAfterBurn.angry}`,
  );

  // =========================================================================
  // FULL MOBILE 390x844 THUMB-ZONE CHECK + v2-mobile-390x844.png
  // Set up 4 occupied tables showing diverse states simultaneously:
  //   t1 = serving (perfect gold), t2 = grilling (mid heat bar), t3 = ready (in Pass), t4 = ordering (3s prep ring)
  // =========================================================================
  await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    window.__test.spawnNow('pork');
    window.__test.spawnNow('mushroom');
    window.__test.spawnNow('mixian');
    window.__test.spawnNow('pork');
    for (let i = 0; i < 250; i++) {
      window.__test.tick(0.05, 1);
      if (window.__game.customers.filter((c) => c.phase === 'seated').length === 4) break;
    }
    // Reset prepT cleanly to compose all 4 states side-by-side
    const byT = Object.fromEntries(window.__game.customers.map((c) => [c.table, c]));
    for (const c of window.__game.customers) {
      c.patience = c.patienceMax;
      c.prepT = 0;
    }
    // Let t1, t2, t3 enter Pass (prep 3.0s) while keeping t4 ordering
    byT.t4.prepT = -2.0; // will sit at 1.0s/3.0s when others reach 3.0s
    window.__test.tick(0.05, 60); // 3.0s -> t1, t2, t3 ready in Pass; t4 ordering (1.0s)
    // Take t1 and put on grill, advance 3.0s
    window.__game.takeFromPass(0);
    window.__game.handleTableAction('t1');
    // Take t2 and put on grill after 2.6s
    window.__test.tick(0.05, 52); // t1 at 2.6s
    window.__game.takeFromPass(1);
    window.__game.handleTableAction('t2');
    // Advance another 3.0s -> t1 at 5.6s (perfect!), t2 at 3.0s (grilling), t3 ready in Pass, reset t4 to ordering 1.6s
    window.__test.tick(0.05, 60);
    // Keep t4 in ordering state cleanly if it finished while pass opened
    const t4 = window.__game.customers.find((c) => c.table === 't4');
    if (t4 && t4.orderState === 'ready') {
      // leave as ready or keep 2 trays in Pass so Pass shows multiple trays too!
    }
    for (const c of window.__game.customers) c.patience = c.patienceMax;
    document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove());
    window.__test.tick(0.05, 1);
  });
  await capture(page, 'e2e/shots/v2-mobile-390x844.png');
  console.log('SHOT e2e/shots/v2-mobile-390x844.png');

  const mobileLayout = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sw = document.documentElement.scrollWidth;
    const dock = document.querySelector('#bbq-thumb-dock').getBoundingClientRect();
    const passSlots = [...document.querySelectorAll('#bbq-pass .pass-slot')].map((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        slot: el.dataset.slotIndex,
        occupied: el.dataset.occupied === 'true',
        w: r.width,
        h: r.height,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        hitOk: hit === el || (hit !== null && el.contains(hit)),
      };
    });
    const cardBtns = [...document.querySelectorAll('#bbq-orders .card .card-btn')].map((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const card = el.closest('.card');
      return {
        table: card.dataset.table,
        state: card.dataset.orderState,
        w: r.width,
        h: r.height,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        hitOk: hit === el || (hit !== null && el.contains(hit)),
      };
    });
    return { vw, vh, sw, dock: { top: dock.top, bottom: dock.bottom }, passSlots, cardBtns };
  });

  assert.ok(mobileLayout.sw <= mobileLayout.vw, `horizontal overflow: scrollWidth=${mobileLayout.sw} > vw=${mobileLayout.vw}`);
  assert.ok(
    mobileLayout.dock.top >= mobileLayout.vh / 2,
    `thumb dock top (${mobileLayout.dock.top.toFixed(1)}) must be in lower half (>= ${mobileLayout.vh / 2})`,
  );
  assert.ok(mobileLayout.dock.bottom <= mobileLayout.vh, `thumb dock bottom (${mobileLayout.dock.bottom.toFixed(1)}) exceeds viewport`);
  for (const s of mobileLayout.passSlots) {
    assert.ok(s.w >= 44 && s.h >= 44, `pass slot ${s.slot} hitbox ${s.w.toFixed(1)}x${s.h.toFixed(1)} < 44px`);
    assert.ok(s.top >= mobileLayout.vh / 2, `pass slot ${s.slot} top=${s.top.toFixed(1)} not in lower half`);
    assert.equal(s.hitOk, true, `pass slot ${s.slot} center occluded`);
  }
  for (const b of mobileLayout.cardBtns) {
    assert.ok(b.w >= 44 && b.h >= 44, `card btn ${b.table} hitbox ${b.w.toFixed(1)}x${b.h.toFixed(1)} < 44px`);
    assert.ok(b.top >= mobileLayout.vh / 2, `card btn ${b.table} top=${b.top.toFixed(1)} not in lower half`);
    assert.equal(b.hitOk, true, `card btn ${b.table} center occluded`);
  }

  // =========================================================================
  // ASSERTION 6: 0 console errors, 0 page errors, 0 failed requests
  // =========================================================================
  assert.equal(consoleErrors.length, 0, `console errors:\n${consoleErrors.join('\n')}`);
  assert.equal(pageErrors.length, 0, `page errors:\n${pageErrors.join('\n')}`);
  assert.equal(failedRequests.length, 0, `failed requests:\n${failedRequests.join('\n')}`);
  console.log(
    `ASSERT 6 PASS: 0 console errors, 0 page errors, 0 failed requests | ` +
    `mobile 390x844 dock=[${mobileLayout.dock.top.toFixed(0)}..${mobileLayout.dock.bottom.toFixed(0)}], scrollWidth=${mobileLayout.sw}`,
  );
  console.log('VERIFY-LOOP-V2 OK');
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
