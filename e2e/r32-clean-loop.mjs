// E2E: Round 32 acceptance (B-145 / B-143 / B-146 / B-142 + Product Review R31 P0-1 & P1-2)
// Verifies on both portrait (390x844) and landscape (844x390):
//  1) Start screen copy: contains 「上炉」「起锅」「完美」「小费」, no 「取料|切配|装盘|炭烤」, button >= 48px, fits viewport;
//  2) Legacy controls removed: #bbq-stick, #bbq-act, #bbq-chop, #bbq-grillbars, .gb, #bbq-offhint, #bbq-guide absent,
//     full visible text does not match /去料箱|取料|切配|装盘|烤制中/;
//  3) First-order onboarding [data-onboard-tip]: "点一下上炉" on seating -> "金环亮起就起锅" after click 1 -> hidden after paid;
//  4) 4-guest bottom docking: portrait bottom thumb zone (>= 24px bottom safe margin), landscape bottom single row,
//     card width diff <= 2px, .card-btn >= 48px & hit by elementFromPoint, 0 overlap with .order-num/.order-ring/.topbar/.bubble/tables/grill,
//     and floating popups avoid order cards; 0 JS errors.
// Usage: E2E_BASE=http://127.0.0.1:4199/bbq/ [E2E_RUNS=1] [E2E_SHOTS=1] node e2e/r32-clean-loop.mjs

const { chromium } = await import('playwright');
const { writeFileSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 1));
const SHOTS = process.env.E2E_SHOTS === '1';
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const interArea = (a, b) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) *
  Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const tickSec = (page, sec) =>
  page.evaluate((s) => {
    window.__test.tick(0.05, Math.round(s / 0.05));
  }, sec);

async function capture(page, path) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(path, Buffer.from(data, 'base64'));
  } finally {
    await cdp.detach().catch(() => {});
  }
}

async function seatDishes(page, dishes) {
  const n = await page.evaluate((list) => {
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
  assert.equal(n, dishes.length, `expected ${dishes.length} seated, got ${n}`);
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
    for (let i = 0; i < 120 && f <= 20; i++) {
      await page.waitForTimeout(500);
      f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(f > 20, `${tag}: page never rendered frames`);
    await raf2(page);

    // ---- 1) Start screen copy & layout ----
    const title = await page.evaluate(() => {
      const card = document.querySelector('.bbq-panel .card');
      const btn = document.querySelector('.bbq-panel [data-btn="start"]');
      const cr = card?.getBoundingClientRect();
      const br = btn?.getBoundingClientRect();
      return {
        vh: window.innerHeight,
        text: (card?.innerText ?? '').trim(),
        sw: card?.scrollWidth ?? 0,
        cw: card?.clientWidth ?? 0,
        cardRect: cr ? { l: cr.left, t: cr.top, r: cr.right, b: cr.bottom } : null,
        btnRect: br ? { w: br.width, h: br.height } : null,
      };
    });
    assert.match(title.text, /上炉/, `${tag}/title: missing 上炉 in "${title.text}"`);
    assert.match(title.text, /起锅/, `${tag}/title: missing 起锅 in "${title.text}"`);
    assert.match(title.text, /完美/, `${tag}/title: missing 完美 in "${title.text}"`);
    assert.match(title.text, /小费/, `${tag}/title: missing 小费 in "${title.text}"`);
    assert.doesNotMatch(title.text, /取料|切配|装盘|炭烤/, `${tag}/title: legacy five-step copy found: "${title.text}"`);
    assert.ok(title.sw <= title.cw, `${tag}/title: panel overflow ${title.sw} > ${title.cw}`);
    assert.ok(title.cardRect && title.cardRect.t >= 8 && title.cardRect.b <= title.vh - 8, `${tag}/title: card out of bounds ${JSON.stringify(title.cardRect)}`);
    assert.ok(title.btnRect && title.btnRect.h >= 48, `${tag}/title: start btn height ${title.btnRect?.h} < 48`);

    // Click Start + freeze clock for deterministic checks
    await page.locator('.bbq-panel [data-btn="start"]').click({ timeout: TIMEOUT });
    await page.evaluate(() => {
      const frozen = performance.now();
      Object.defineProperty(performance, 'now', { configurable: true, writable: true, value: () => frozen });
    });
    await raf2(page);

    // ---- 2) Legacy controls completely absent & no legacy copy ----
    const clean = await page.evaluate(() => ({
      stick: document.querySelector('#bbq-stick'),
      act: document.querySelector('#bbq-act'),
      chop: document.querySelector('#bbq-chop'),
      grillbars: document.querySelector('#bbq-grillbars'),
      gb: document.querySelector('.gb'),
      offhint: document.querySelector('#bbq-offhint, [data-offscreen-hint]'),
      guide: document.querySelector('#bbq-guide'),
      visibleText: document.body.innerText ?? '',
    }));
    for (const [k, v] of Object.entries(clean)) {
      if (k === 'visibleText') continue;
      assert.equal(v, null, `${tag}/clean: legacy element ${k} still exists`);
    }
    assert.doesNotMatch(clean.visibleText, /去料箱|取料|切配|装盘|烤制中/, `${tag}/clean: legacy text found: "${clean.visibleText}"`);

    // ---- 3) First-order onboarding & 2-click loop ----
    await seatDishes(page, ['pork']);
    await raf2(page);
    const ob1 = await page.evaluate(() => {
      const el = document.querySelector('[data-onboard-tip]');
      const btn = document.querySelector('#bbq-orders .card[data-table="t1"] .card-btn');
      const r = el?.getBoundingClientRect();
      const br = btn?.getBoundingClientRect();
      return {
        display: el ? getComputedStyle(el).display : 'none',
        mode: el?.getAttribute('data-onboard-tip') ?? '',
        text: (el?.textContent ?? '').trim(),
        pe: el ? getComputedStyle(el).pointerEvents : '',
        box: r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null,
        btn: br ? { l: br.left, t: br.top, r: br.right, b: br.bottom } : null,
      };
    });
    assert.notEqual(ob1.display, 'none', `${tag}/ob1: onboarding tip not visible on first seating`);
    assert.equal(ob1.text, '点一下上炉', `${tag}/ob1: unexpected text "${ob1.text}"`);
    assert.equal(ob1.pe, 'none', `${tag}/ob1: onboarding tip must be pointer-events:none`);
    assert.equal(interArea(ob1.box, ob1.btn), 0, `${tag}/ob1: onboarding tip overlaps .card-btn`);

    // Click 1: put on grill -> tip switches to 金环亮起就起锅, no .gb or 烤制中
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    await raf2(page);
    const ob2 = await page.evaluate(() => {
      const el = document.querySelector('[data-onboard-tip]');
      return {
        display: el ? getComputedStyle(el).display : 'none',
        text: (el?.textContent ?? '').trim(),
        card: window.__test.cardState('t1'),
        gbCount: document.querySelectorAll('.gb').length,
        bodyText: document.body.innerText ?? '',
      };
    });
    assert.equal(ob2.card.cookWindow, 'raw', `${tag}/ob2: expected raw window`);
    assert.equal(ob2.gbCount, 0, `${tag}/ob2: legacy .gb badge appeared`);
    assert.doesNotMatch(ob2.bodyText, /烤制中/, `${tag}/ob2: legacy 烤制中 text appeared`);
    assert.notEqual(ob2.display, 'none', `${tag}/ob2: onboarding tip disappeared before lift`);
    assert.equal(ob2.text, '金环亮起就起锅', `${tag}/ob2: unexpected text "${ob2.text}"`);

    // Tick to t = 5.5s (perfect window) -> Click 2 -> paid + onboarding disappears
    await tickSec(page, 5.5);
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    await raf2(page);
    const afterServe = await page.evaluate(() => {
      const el = document.querySelector('[data-onboard-tip]');
      const st = window.__test.state();
      return {
        display: el ? getComputedStyle(el).display : 'none',
        served: st.served,
        money: st.money,
      };
    });
    assert.equal(afterServe.served, 1, `${tag}/serve: served=${afterServe.served}`);
    assert.equal(afterServe.money, 62, `${tag}/serve: expected ¥62 (48+14), got ¥${afterServe.money}`);
    assert.equal(afterServe.display, 'none', `${tag}/serve: onboarding tip did not auto-hide after first payment`);

    // ---- 4) 4-guest bottom docking, width consistency, zero overlap, screenshots ----
    await seatDishes(page, ['pork', 'mushroom', 'mixian', 'pork']);
    // Click card 1 so screenshot & checks capture active cooking state + onboarding tip + 4 cards
    await page.locator('#bbq-orders .card[data-table="t1"] .card-btn').click({ timeout: TIMEOUT });
    await tickSec(page, 5.5);
    await raf2(page);

    if (SHOTS && run === 1) {
      const shotPath = tag === 'portrait' ? '/tmp/r32-port.png' : '/tmp/r32-land.png';
      await capture(page, shotPath);
      console.log(`SHOT ${shotPath}`);
    }

    const layout = await page.evaluate(() => {
      const rect = (e) => {
        const r = e.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
      };
      const cards = [...document.querySelectorAll('#bbq-orders .card')].map((c) => {
        const btn = c.querySelector('.card-btn');
        const br = btn.getBoundingClientRect();
        const cx = br.left + br.width / 2;
        const cy = br.top + br.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        const nm = c.querySelector('.nm');
        const pr = c.querySelector('.pr');
        const badge = c.querySelector('.tb-badge');
        const ring = c.querySelector('.ring');
        return {
          table: c.dataset.table ?? '',
          rect: rect(c),
          btn: rect(btn),
          hitSelf: hit === btn || (hit !== null && btn.contains(hit)),
          sw: c.scrollWidth,
          cw: c.clientWidth,
          nmOverflow: nm.scrollWidth > nm.clientWidth,
          prOverflow: pr.scrollWidth > pr.clientWidth,
          badge: rect(badge),
          ring: rect(ring),
          nm: rect(nm),
        };
      });
      const nums = [...document.querySelectorAll('#bbq-rings .order-num')].map((n) => ({
        table: n.dataset.orderNum ?? '',
        rect: rect(n),
      }));
      const rings = [...document.querySelectorAll('#bbq-rings .order-ring')].map((n) => ({
        table: n.dataset.orderRing ?? '',
        rect: rect(n),
      }));
      const bubbles = [...document.querySelectorAll('#bbq-bubbles .bubble')].map((n) => ({
        table: n.dataset.table ?? '',
        rect: rect(n),
      }));
      const topbar = rect(document.querySelector('#bbq-hud .topbar'));
      const st = window.__test.state();
      const tables = Object.entries(st.tables).map(([id, pos]) => {
        // table surface sits ~1.2m toward -z from serve usePos; read actual dining table pos from ring or layout
        return { id, use: window.__test.worldToScreen(pos.x, 0.72, pos.z - 1.2) };
      });
      const grill = window.__test.stationGeom().find((s) => s.id === 'grill');
      const grillTop = grill ? window.__test.worldToScreen(grill.x, grill.topY, grill.z) : null;
      return {
        vw: window.innerWidth,
        vh: window.innerHeight,
        cards,
        nums,
        rings,
        bubbles,
        topbar,
        tables,
        grillTop,
        bodyText: document.body.innerText ?? '',
      };
    });

    assert.equal(layout.cards.length, 4, `${tag}/4cards: expected 4 cards`);
    assert.doesNotMatch(layout.bodyText, /去料箱|取料|切配|装盘|烤制中/, `${tag}/4cards: forbidden copy in bodyText`);
    const widths = layout.cards.map((c) => c.rect.w);
    const widthDiff = Math.max(...widths) - Math.min(...widths);
    assert.ok(widthDiff <= 2, `${tag}/4cards: card width diff=${widthDiff.toFixed(2)}px > 2px (${widths.map((w) => w.toFixed(1)).join(',')})`);
    const minCardTop = Math.min(...layout.cards.map((c) => c.rect.t));
    const maxCardBottom = Math.max(...layout.cards.map((c) => c.rect.b));

    if (tag === 'portrait') {
      const bottomGap = layout.vh - maxCardBottom;
      assert.ok(bottomGap >= 23.5, `${tag}/4cards: portrait bottom safe margin ${bottomGap.toFixed(1)}px < 24px`);
      assert.ok(minCardTop >= layout.vh * 0.55, `${tag}/4cards: portrait cards top ${minCardTop.toFixed(1)} not in bottom thumb zone`);
    } else {
      const tops = layout.cards.map((c) => c.rect.t);
      assert.ok(Math.max(...tops) - Math.min(...tops) <= 1, `${tag}/4cards: landscape cards not single row (${tops.map((t) => t.toFixed(1)).join(',')})`);
      assert.ok(layout.grillTop && layout.grillTop.y < minCardTop, `${tag}/4cards: landscape cards cover grill slots (grillY=${layout.grillTop?.y.toFixed(1)} >= cardTop=${minCardTop.toFixed(1)})`);
    }

    for (const c of layout.cards) {
      assert.ok(c.rect.l >= 0 && c.rect.t >= 0 && c.rect.r <= layout.vw && c.rect.b <= layout.vh, `${tag}/4cards: ${c.table} outside viewport`);
      assert.ok(c.btn.w >= 48 && c.btn.h >= 48, `${tag}/4cards: ${c.table} btn ${c.btn.w}x${c.btn.h} < 48`);
      assert.equal(c.hitSelf, true, `${tag}/4cards: ${c.table} .card-btn center occluded`);
      assert.ok(c.sw <= c.cw && !c.nmOverflow && !c.prOverflow, `${tag}/4cards: ${c.table} text overflow`);
      assert.equal(interArea(c.badge, c.ring), 0, `${tag}/4cards: ${c.table} badge overlaps ring`);
      assert.equal(interArea(c.badge, c.nm), 0, `${tag}/4cards: ${c.table} badge overlaps nm`);
      assert.equal(interArea(c.badge, c.btn), 0, `${tag}/4cards: ${c.table} badge overlaps btn`);
      assert.equal(interArea(c.rect, layout.topbar), 0, `${tag}/4cards: ${c.table} overlaps topbar`);
      for (const n of layout.nums) {
        assert.equal(interArea(n.rect, c.rect), 0, `${tag}/4cards: .order-num(${n.table}) overlaps card(${c.table})`);
        assert.equal(interArea(n.rect, c.btn), 0, `${tag}/4cards: .order-num(${n.table}) overlaps card-btn(${c.table})`);
      }
      for (const rg of layout.rings) {
        assert.equal(interArea(rg.rect, c.rect), 0, `${tag}/4cards: .order-ring(${rg.table}) overlaps card(${c.table})`);
      }
      for (const b of layout.bubbles) {
        assert.equal(interArea(b.rect, c.rect), 0, `${tag}/4cards: .bubble(${b.table}) overlaps card(${c.table})`);
      }
    }
    for (const tb of layout.tables) {
      assert.ok(tb.use.y < minCardTop, `${tag}/4cards: dining table ${tb.id} (y=${tb.use.y.toFixed(1)}) covered by cards (top=${minCardTop.toFixed(1)})`);
    }

    // Trigger undercooked popup on card 2 -> verify popup avoids all cards
    await page.locator('#bbq-orders .card[data-table="t2"] .card-btn').click({ timeout: TIMEOUT });
    await tickSec(page, 1.5);
    await page.locator('#bbq-orders .card[data-table="t2"] .card-btn').click({ timeout: TIMEOUT });
    const popCheck = await page.evaluate(() => {
      const rect = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const popups = [...document.querySelectorAll('#bbq-popups .popup')].map((p) => ({ text: p.textContent?.trim() ?? '', rect: rect(p) }));
      const cards = [...document.querySelectorAll('#bbq-orders .card')].map((c) => ({ table: c.dataset.table ?? '', rect: rect(c) }));
      return { popups, cards };
    });
    assert.ok(popCheck.popups.some((p) => p.text.includes('夹生')), `${tag}/popup: missing 夹生 popup`);
    for (const p of popCheck.popups) {
      for (const c of popCheck.cards) {
        assert.equal(interArea(p.rect, c.rect), 0, `${tag}/popup: "${p.text}" overlaps card(${c.table})`);
      }
    }

    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `title=OK | legacy=0 | onboard(点一下上炉->金环亮起就起锅->hidden)=OK | ` +
      `4cards w=[${widths.map((w) => w.toFixed(1)).join(',')}] diff=${widthDiff.toFixed(2)}px ` +
      `y=[${minCardTop.toFixed(0)}..${maxCardBottom.toFixed(0)}] bottomGap=${(layout.vh - maxCardBottom).toFixed(0)}px | ` +
      `overlaps=0 | 0 JS err`,
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
}
console.log('R32-CLEAN-LOOP OK');
