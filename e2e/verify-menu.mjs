// E2E verification for Real Store Menu (柳真真·云贵山岭烤肉 · 390x844 mobile portrait):
//  1) window.__menu.length === 17 and all 17 names match the real store menu verbatim
//  2) Zero legacy dish keywords ("米线|mixian|豆泥|五花肉拼盘") in src/ (and public/ if present)
//  3) Categories readable in menu data & UI with exact counts (真真牛 8 / 云贵风味鸡 2 / 云贵菌类 4 / 特色时蔬 3)
//  4) Full gameplay v2 loop for a sampled real dish: order -> prep to Pass -> take -> grill -> serve,
//     settling exact price + tip based on the dish price
//  5) 0 console errors, 0 page errors, 0 failed network requests
//  + Captures 3 screenshots into e2e/shots/:
//      - e2e/shots/menu-list.png  (menu sheet showing 4 categories, 17 dishes, prices, NEW & notes)
//      - e2e/shots/menu-card.png  (order cards showing real dish names + NEW badges)
//      - e2e/shots/menu-note.png  (order cards showing 牛肝菌 & 虫草花 dietary/safety notes)
//
// Usage: node e2e/verify-menu.mjs   (auto-starts vite preview if E2E_BASE is unset)

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const TIMEOUT = 60000;
mkdirSync('e2e/shots', { recursive: true });

const EXPECTED_NAMES = [
  // 真真牛 (8)
  '摩登现烤牛肉',
  '云南高山薄荷牛肉',
  '特色山岭孜然牛肉',
  '罗勒糊辣椒牛肉',
  '真真秘制牛小肠',
  '油辣子牛板筋',
  '山城风味牛肚',
  '烤牛中肠丝',
  // 云贵风味鸡 (2)
  '云南香茅草鸡腿肉',
  '云贵香茅草鸡胗',
  // 云贵菌类 (4)
  '云南牛肝菌',
  '鹿茸菌',
  '虫草花',
  '口蘑',
  // 特色时蔬 (3)
  '西葫芦',
  '云南高山薄荷叶',
  '西南翠凤尾',
];

const EXPECTED_COUNTS = {
  '真真牛': 8,
  '云贵风味鸡': 2,
  '云贵菌类': 4,
  '特色时蔬': 3,
};

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

async function seatDishes(page, dishes) {
  await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
  });
  for (const dish of dishes) {
    const tid = await page.evaluate((d) => window.__test.spawnNow(d), dish);
    assert.ok(tid, `failed to spawn ${dish}`);
  }
  const seated = await page.evaluate((target) => {
    for (let i = 0; i < 300; i++) {
      window.__test.tick(0.05, 1);
      if (window.__game.customers.filter((c) => c.phase === 'seated').length >= target) {
        return window.__game.customers.filter((c) => c.phase === 'seated').length;
      }
    }
    return window.__game.customers.filter((c) => c.phase === 'seated').length;
  }, dishes.length);
  assert.equal(seated, dishes.length, `expected ${dishes.length} seated, got ${seated}`);
}

// =========================================================================
// ASSERTION 2 (Static): 0 legacy dish references in src/ (and public/)
// =========================================================================
const scanDirs = ['src/'];
if (existsSync('public')) scanDirs.push('public/');
let legacyMatches = '';
try {
  legacyMatches = execSync(`grep -rn "米线\\|mixian\\|豆泥\\|五花肉拼盘" ${scanDirs.join(' ')}`, {
    encoding: 'utf8',
  }).trim();
} catch (err) {
  // grep exits with status 1 when there are zero matches (expected)
  if (err.status !== 1) throw err;
}
assert.equal(legacyMatches, '', `legacy dish terms still found in ${scanDirs.join(' ')}:\n${legacyMatches}`);
console.log(`ASSERT 2 PASS: grep "米线|mixian|豆泥|五花肉拼盘" in ${scanDirs.join(' ')} = 0`);

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
      failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'failed'})`),
    );
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

    // Freeze wall clock after entering game so ticks are 100% deterministic
    await page.locator('.bbq-panel [data-btn="start"]').click({ timeout: TIMEOUT });
    await page.evaluate(() => {
      window.__test.pauseSpawns(true);
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', { configurable: true, writable: true, value: () => frozen });
    });
    await raf2(page);

    // =========================================================================
    // ASSERTION 1: window.__menu.length === 17 and exact verbatim names
    // =========================================================================
    const menu = await page.evaluate(() => window.__menu);
    assert.ok(Array.isArray(menu), 'window.__menu must be an array');
    assert.equal(menu.length, 17, `expected window.__menu.length === 17, got ${menu.length}`);
    const actualNames = menu.map((d) => d.name);
    assert.deepEqual(actualNames, EXPECTED_NAMES, 'window.__menu dish names do not match real store list verbatim');

    // Verify English IDs, NEW flags, and safety/dietary notes
    for (const d of menu) {
      assert.match(d.id, /^[a-z0-9-]+$/, `dish id must be ASCII kebab-case, got "${d.id}"`);
      assert.equal(typeof d.price, 'number', `price must be number for ${d.id}`);
      assert.ok(d.price > 0, `price must be positive for ${d.id}`);
    }
    const newDishes = menu.filter((d) => d.isNew).map((d) => d.name);
    assert.deepEqual(newDishes, ['真真秘制牛小肠', '西南翠凤尾'], `unexpected NEW dishes: ${JSON.stringify(newDishes)}`);
    const porcini = menu.find((d) => d.name === '云南牛肝菌');
    const cordyceps = menu.find((d) => d.name === '虫草花');
    assert.equal(porcini?.note, '不可和啤酒同食');
    assert.equal(cordyceps?.note, '婴幼儿、儿童、孕妇、食用菌过敏者不宜食用');
    console.log(`ASSERT 1 PASS: window.__menu.length=${menu.length}, 17/17 names match verbatim, NEW=[${newDishes.join(', ')}], notes verified`);

    // =========================================================================
    // ASSERTION 3: Menu categories readable with exact counts (8 / 2 / 4 / 3)
    //              + capture e2e/shots/menu-list.png
    // =========================================================================
    const dataCounts = {};
    for (const d of menu) dataCounts[d.category] = (dataCounts[d.category] ?? 0) + 1;
    assert.deepEqual(dataCounts, EXPECTED_COUNTS, `category counts mismatch in __menu: ${JSON.stringify(dataCounts)}`);

    // Open MenuSheet via real DOM button and verify rendered categories & items
    await tapCenter(page, '[data-btn="menu"]');
    await raf2(page);
    const domMenu = await page.evaluate(() => {
      const sheet = document.querySelector('#bbq-menu-sheet');
      const open = sheet?.classList.contains('open') ?? false;
      const sections = [...document.querySelectorAll('#bbq-menu-sheet [data-menu-category]')].map((sec) => {
        const cat = sec.dataset.menuCategory;
        const items = [...sec.querySelectorAll('[data-menu-dish]')].map((it) => ({
          id: it.dataset.menuDish,
          name: it.querySelector('.ms-name')?.textContent?.trim() ?? '',
          price: it.querySelector('.ms-price')?.textContent?.trim() ?? '',
          hasNew: !!it.querySelector('.menu-new'),
          note: it.querySelector('.menu-note')?.textContent?.trim() ?? '',
        }));
        return { cat, count: items.length, items };
      });
      return { open, sections };
    });
    assert.equal(domMenu.open, true, 'menu sheet did not open on click');
    const domCounts = Object.fromEntries(domMenu.sections.map((s) => [s.cat, s.count]));
    assert.deepEqual(domCounts, EXPECTED_COUNTS, `DOM category counts mismatch: ${JSON.stringify(domCounts)}`);
    const domNames = domMenu.sections.flatMap((s) => s.items.map((i) => i.name));
    assert.deepEqual(domNames, EXPECTED_NAMES, 'DOM menu names mismatch');
    await capture(page, 'e2e/shots/menu-list.png');
    console.log(`ASSERT 3 PASS: categories=${JSON.stringify(domCounts)} | SHOT e2e/shots/menu-list.png`);

    await tapCenter(page, '[data-btn="close-menu"]');
    await raf2(page);

    // =========================================================================
    // SCREENSHOT 2: menu-card.png (Order cards showing real names + NEW badges)
    // =========================================================================
    await seatDishes(page, [
      'secret-beef-intestine',
      'southwest-celtuce-tip',
      'modern-beef',
      'lemongrass-chicken-thigh',
    ]);
    await tickSec(page, 0.8);
    await raf2(page);
    const cardSnap = await page.evaluate(() => {
      const dock = document.querySelector('#bbq-thumb-dock').getBoundingClientRect();
      const cards = [...document.querySelectorAll('#bbq-orders .card')].map((c) => ({
        table: c.dataset.table,
        dish: c.dataset.dish,
        category: c.dataset.category,
        name: c.querySelector('.nm')?.textContent?.trim() ?? '',
        newBadge: c.querySelector('.new-badge')?.textContent?.trim() ?? null,
        price: c.querySelector('.c-price')?.textContent?.trim() ?? '',
      }));
      return { dockTop: dock.top, vh: window.innerHeight, cards };
    });
    assert.equal(cardSnap.cards.length, 4, 'expected 4 order cards');
    assert.equal(cardSnap.cards.find((c) => c.dish === 'secret-beef-intestine')?.newBadge, 'NEW');
    assert.equal(cardSnap.cards.find((c) => c.dish === 'southwest-celtuce-tip')?.newBadge, 'NEW');
    assert.ok(cardSnap.dockTop >= cardSnap.vh / 2, `thumb dock top (${cardSnap.dockTop.toFixed(1)}) crossed into upper half`);
    await capture(page, 'e2e/shots/menu-card.png');
    console.log(`SHOT e2e/shots/menu-card.png (dockTop=${cardSnap.dockTop.toFixed(1)} >= ${cardSnap.vh / 2}, NEW badges on 真真秘制牛小肠 & 西南翠凤尾)`);

    // =========================================================================
    // SCREENSHOT 3: menu-note.png (牛肝菌 & 虫草花 warning notes visible)
    // =========================================================================
    await seatDishes(page, ['yunnan-porcini', 'cordyceps-flower']);
    await tickSec(page, 0.8);
    await raf2(page);
    const noteSnap = await page.evaluate(() => {
      const dock = document.querySelector('#bbq-thumb-dock').getBoundingClientRect();
      const notes = [...document.querySelectorAll('#bbq-orders .card')].map((c) => ({
        dish: c.dataset.dish,
        name: c.querySelector('.nm')?.textContent?.trim() ?? '',
        noteVisible: getComputedStyle(c.querySelector('.dish-note')).display !== 'none',
        noteText: c.querySelector('.dish-note')?.textContent?.trim() ?? '',
      }));
      return { dockTop: dock.top, vh: window.innerHeight, notes };
    });
    assert.equal(noteSnap.notes.length, 2);
    const porciniCard = noteSnap.notes.find((n) => n.dish === 'yunnan-porcini');
    const cordycepsCard = noteSnap.notes.find((n) => n.dish === 'cordyceps-flower');
    assert.equal(porciniCard?.noteVisible, true, '云南牛肝菌 note must be visible on card');
    assert.match(porciniCard?.noteText ?? '', /不可和啤酒同食/);
    assert.equal(cordycepsCard?.noteVisible, true, '虫草花 note must be visible on card');
    assert.match(cordycepsCard?.noteText ?? '', /婴幼儿、儿童、孕妇、食用菌过敏者不宜食用/);
    assert.ok(noteSnap.dockTop >= noteSnap.vh / 2, `note cards pushed thumb dock above midline (${noteSnap.dockTop.toFixed(1)})`);
    await capture(page, 'e2e/shots/menu-note.png');
    console.log(`SHOT e2e/shots/menu-note.png (both 云南牛肝菌 & 虫草花 notes visible, dockTop=${noteSnap.dockTop.toFixed(1)})`);

    // =========================================================================
    // ASSERTION 4: Full v2 flow on a sampled real dish -> exact price settlement
    //   Dish: 真真秘制牛小肠 (secret-beef-intestine, price = ¥48, patience = 75s)
    //   Order -> 3.0s auto-prep into Pass -> Click 1 Take -> Click 2 Grill ->
    //   5.6s perfect window -> Click 3 Plate & Serve -> exact price + tip!
    // =========================================================================
    const sampleDish = menu.find((d) => d.id === 'secret-beef-intestine');
    assert.ok(sampleDish, 'sample dish secret-beef-intestine missing');
    await seatDishes(page, [sampleDish.id]);

    // Step 1: auto-prep 3.0s -> lands in Pass window
    await tickSec(page, 3.0);
    await raf2(page);
    const passCheck = await page.evaluate(() => window.__test.state());
    assert.equal(passCheck.pass.length, 1, 'sample dish did not reach Pass window after 3.0s');
    assert.equal(passCheck.pass[0].dishId, sampleDish.id);

    // Step 2: Click 1 — Take from Pass window
    await tapCenter(page, '#bbq-pass .pass-slot[data-table="t1"]');
    await raf2(page);
    const carryCheck = await page.evaluate(() => window.__test.state());
    assert.equal(carryCheck.carrying?.dishId, sampleDish.id, 'carrying dish mismatch after Pass click');

    // Step 3: Click 2 — Place onto tabletop grill
    await tapCenter(page, '#bbq-orders .card[data-table="t1"] .card-btn');
    await raf2(page);
    const grillCheck = await page.evaluate(() => window.__test.state());
    assert.equal(grillCheck.tables.t1.grill.grilling, true, 'tabletop grill did not activate');

    // Advance 5.6s into perfect window [5.0, 7.0)
    await tickSec(page, 5.6);
    await raf2(page);
    const beforeServe = await page.evaluate(() => {
      const st = window.__test.state();
      const c = st.customers.find((x) => x.table === 't1');
      return { money: st.money, patience: c.patience, patienceMax: c.patienceMax, cookWindow: st.tables.t1.grill.cookWindow };
    });
    assert.equal(beforeServe.cookWindow, 'perfect', `expected perfect cookWindow at 5.6s, got ${beforeServe.cookWindow}`);

    // Step 4: Click 3 — Plate & serve
    await tapCenter(page, '#bbq-orders .card[data-table="t1"] .card-btn');
    await raf2(page);
    const afterServe = await page.evaluate(() => {
      const st = window.__test.state();
      const c = st.customers.find((x) => x.table === 't1');
      return { money: st.money, served: st.served, orderState: c.orderState, clicksUsed: c.clicksUsed };
    });

    const rawFrac = Math.max(0, Math.min(1, beforeServe.patience / beforeServe.patienceMax));
    const patienceFactor = rawFrac >= 0.8 ? 1 : rawFrac;
    const expectedTip = Math.round(sampleDish.price * 0.3 * patienceFactor);
    const expectedTotal = sampleDish.price + expectedTip;

    assert.equal(afterServe.orderState, 'done', `expected done, got ${afterServe.orderState}`);
    assert.equal(afterServe.served, 1, `expected served=1, got ${afterServe.served}`);
    assert.equal(afterServe.clicksUsed, 3, `expected exact 3 clicks, got ${afterServe.clicksUsed}`);
    assert.equal(
      afterServe.money - beforeServe.money,
      expectedTotal,
      `settled money mismatch: got ¥${afterServe.money - beforeServe.money}, expected ¥${expectedTotal} (price ¥${sampleDish.price} + tip ¥${expectedTip})`,
    );
    console.log(
      `ASSERT 4 PASS: ${sampleDish.name} (${sampleDish.id}) full 3-click flow ok | ` +
      `price=¥${sampleDish.price} + tip=¥${expectedTip} (patience ${beforeServe.patience.toFixed(1)}/${beforeServe.patienceMax}s) => settled=¥${afterServe.money}`,
    );

    // =========================================================================
    // ASSERTION 5: 0 console errors, 0 page errors, 0 failed network requests
    // =========================================================================
    assert.equal(consoleErrors.length, 0, `console errors:\n${consoleErrors.join('\n')}`);
    assert.equal(pageErrors.length, 0, `page errors:\n${pageErrors.join('\n')}`);
    assert.equal(failedRequests.length, 0, `failed requests:\n${failedRequests.join('\n')}`);
    console.log('ASSERT 5 PASS: consoleErrors=0, pageErrors=0, failedRequests=0');
    console.log('VERIFY-MENU OK');
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
