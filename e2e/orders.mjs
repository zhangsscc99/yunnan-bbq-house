// E2E: P1-1 + B-068 — order cards appear on the seating frame, patience ring refreshes,
// <25% patience flips .angry, HUD layout stays clean, and orders bind to tables with
// badges, fixed ascending table order, table-colored ground rings, and no duplicate cards.
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ node e2e/orders.mjs

const { chromium } = await import('playwright');
const { mkdirSync, existsSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
mkdirSync('e2e/shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('crash', () => console.error('PAGE CRASH'));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
  let frames = 0;
  for (let i = 0; i < 60 && frames <= 30; i++) {
    await page.waitForTimeout(1500);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  assert.ok(frames > 30, 'page never rendered frames');

  await page.evaluate(() => window.__test.start());

  // The software-GL render loop can crawl (~1 fps), so game time is driven with the synchronous
  // __test.tick() hook; spawns are NOT paused, so this is natural customer traffic.
  const seatedN = () => window.__game.customers.filter((c) => c.phase === 'seated' || c.phase === 'eating').length;
  const cardsN = () => document.querySelectorAll('#bbq-orders .card').length;

  // a) step one 0.05s frame at a time; on the very frame a guest sits the cards must already match.
  const a = await page.evaluate(([seatedSrc, cardsSrc]) => {
    const seatedN = eval(seatedSrc), cardsN = eval(cardsSrc);
    for (let i = 0; i < 4000; i++) {
      window.__test.tick(0.05, 1);
      if (seatedN() > 0) return { seated: seatedN(), cards: cardsN(), simSec: +(i * 0.05).toFixed(2) };
    }
    return null;
  }, [seatedN.toString(), cardsN.toString()]);
  assert.ok(a, 'a) no guest sat within 200s of game time');
  assert.ok(a.seated >= 1, 'a) seated >= 1');
  assert.equal(a.cards, Math.min(a.seated, 3), `a) cards (${a.cards}) must equal seated guests (${a.seated}) on the seating frame`);
  const a2 = await page.evaluate(([seatedSrc, cardsSrc]) => {
    const seatedN = eval(seatedSrc), cardsN = eval(cardsSrc);
    window.__test.tick(0.05, 10);               // +0.5s
    return { seated: seatedN(), cards: cardsN() };
  }, [seatedN.toString(), cardsN.toString()]);
  assert.equal(a2.cards, Math.min(a2.seated, 3), `a) +0.5s cards (${a2.cards}) vs seated (${a2.seated})`);
  assert.ok(a2.cards >= 1, 'a) at least one card');
  console.log(`PASS a) 第 ${a.simSec}s 就座当帧 卡片=${a.cards}/座位顾客=${a.seated}；+0.5s 卡片=${a2.cards}/${a2.seated}`);

  // b) ring refreshes while waiting (first card's second circle dashoffset changes after 1.2s)
  const ring = () => page.evaluate(() => {
    const c = document.querySelector('#bbq-orders .card .ring svg circle:nth-of-type(2)');
    return c ? Number(c.getAttribute('stroke-dashoffset')) : null;
  });
  const r1 = await ring();
  await page.evaluate(() => window.__test.tick(0.05, 24));   // +1.2s
  const r2 = await ring();
  assert.ok(r1 !== null && r2 !== null, 'b) ring circle present');
  assert.notEqual(r2, r1, `b) ring did not refresh (${r1} -> ${r2})`);
  console.log(`PASS b) 耐心环刷新 dashoffset ${r1.toFixed(2)} -> ${r2.toFixed(2)}`);

  // c) patience < 25% → .angry on every seated guest's card
  await page.evaluate(() => {
    const c = window.__game.customers.find((x) => x.phase === 'seated');
    window.__test.setPatience(c.patienceMax * 0.2);
    window.__test.tick(0.05, 6);
  });
  const c = await page.evaluate(() => {
    const shown = window.__game.customers.filter((x) => x.phase === 'seated' || x.phase === 'eating').slice(0, 3);
    const cards = [...document.querySelectorAll('#bbq-orders .card')];
    return {
      n: cards.length, shown: shown.length,
      angryOk: shown.every((x, i) => x.phase !== 'seated' || cards[i]?.classList.contains('angry')),
      angry: cards.filter((k) => k.classList.contains('angry')).length,
    };
  });
  assert.ok(c.n >= 1 && c.n === c.shown, `c) cards ${c.n} vs shown ${c.shown}`);
  assert.ok(c.angry >= 1 && c.angryOk, `c) seated cards must carry .angry (angry=${c.angry}/${c.n})`);
  console.log(`PASS c) 耐心<25% → ${c.angry}/${c.n} 张卡 .angry`);
  await page.screenshot({ path: 'e2e/shots/orders-angry.png', timeout: 90000 }).catch(() => {});

  // d) HUD layout: top status strip must not intersect any order card (>= 8px gap), must not be squeezed,
  //    and cards must stay inside the viewport — portrait 390x844 first, then landscape 844x390.
  const layout = () => page.evaluate(() => {
    const bar = document.querySelector('#bbq-hud .topbar');
    const rect = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const br = rect(bar);
    const cards = [...document.querySelectorAll('#bbq-orders .card')].map(rect);
    const gap = (c) => Math.max(c.l - br.r, br.l - c.r, c.t - br.b, br.t - c.b);   // > 0 => separated on some axis
    return {
      iw: window.innerWidth, ih: window.innerHeight, bar: br, cards,
      overlap: cards.map((c) => !(br.r <= c.l || c.r <= br.l || br.b <= c.t || c.b <= br.t)),
      gaps: cards.map(gap), maxRight: Math.max(...cards.map((c) => c.r)),
      sw: bar.scrollWidth, cw: bar.clientWidth, barInView: br.l >= 0 && br.r <= window.innerWidth,
    };
  });
  const checkLayout = (tag, L) => {
    assert.ok(L.cards.length >= 1, `${tag}) need >=1 order card`);
    assert.ok(L.overlap.every((o) => o === false), `${tag}) topbar overlaps a card: ${JSON.stringify(L)}`);
    assert.ok(L.gaps.every((g) => g >= 8), `${tag}) topbar/card gap < 8px: ${L.gaps.join(',')}`);
    assert.ok(L.sw <= L.cw, `${tag}) topbar squeezed/truncated (scrollWidth ${L.sw} > clientWidth ${L.cw})`);
    assert.ok(L.barInView, `${tag}) topbar outside viewport`);
    assert.ok(L.maxRight <= L.iw - 6, `${tag}) card right ${L.maxRight} > innerWidth-6 (${L.iw - 6})`);
  };
  const shot = async (path) => {
    await page.screenshot({ path, timeout: 90000 });
    assert.ok(existsSync(path), `screenshot missing: ${path}`);
  };
  const keepCards = () => page.evaluate(() => {      // keep the guests from walking off / leaving angry during the resize
    window.__test.setPatience(60);
    window.__test.tick(0.05, 2);
  });

  await keepCards();
  const dP = await layout();
  assert.deepEqual([dP.iw, dP.ih], [390, 844], 'd) portrait viewport');
  checkLayout('d 竖屏', dP);
  await shot('e2e/shots/hud-portrait.png');
  console.log(`PASS d) 竖屏 390x844 状态条 [${dP.bar.l.toFixed(0)}..${dP.bar.r.toFixed(0)}]x[${dP.bar.t.toFixed(0)}..${dP.bar.b.toFixed(0)}] 与 ${dP.cards.length} 张卡不相交，最小间隙 ${Math.min(...dP.gaps).toFixed(0)}px，scrollWidth ${dP.sw}<=${dP.cw}`);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.innerWidth === 844, null, { timeout: 10000 });
  await keepCards();
  const dL = await layout();
  assert.deepEqual([dL.iw, dL.ih], [844, 390], 'd) landscape viewport');
  checkLayout('d 横屏', dL);
  await shot('e2e/shots/hud-landscape.png');
  console.log(`PASS d) 横屏 844x390 状态条 [${dL.bar.l.toFixed(0)}..${dL.bar.r.toFixed(0)}] 与 ${dL.cards.length} 张卡不相交，最小间隙 ${Math.min(...dL.gaps).toFixed(0)}px，卡片右端 ${dL.maxRight.toFixed(0)} <= ${dL.iw - 6}`);

  // ---- B-068 helpers ----
  const TABLE_IDX = { t1: 1, t2: 2, t3: 3, t4: 4 };
  const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  const probeB068 = () => page.evaluate(() => {
    const rect = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const interArea = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
    const seated = window.__game.customers
      .filter((x) => x.phase === 'seated' || x.phase === 'eating')
      .map((x) => ({ id: x.id, table: x.table, phase: x.phase, dish: x.dish }));
    const cards = [...document.querySelectorAll('#bbq-orders .card')].map((card) => {
      const badge = card.querySelector('.tb-badge');
      const ring = card.querySelector('.ring');
      const nm = card.querySelector('.nm');
      const br = badge ? rect(badge) : null;
      const rr = ring ? rect(ring) : null;
      const nr = nm ? rect(nm) : null;
      return {
        table: card.dataset.table ?? null,
        badgeText: badge?.textContent?.trim() ?? null,
        badgeFontPx: badge ? parseFloat(getComputedStyle(badge).fontSize) : 0,
        badgeBox: br,
        overlapRing: br && rr ? interArea(br, rr) : -1,
        overlapNm: br && nr ? interArea(br, nr) : -1,
        rect: rect(card),
      };
    });
    const rings = [...document.querySelectorAll('#bbq-rings [data-order-ring]')].map((el) => {
      const cs = getComputedStyle(el);
      return {
        table: el.dataset.orderRing,
        pointerEvents: cs.pointerEvents,
        display: cs.display,
        rect: rect(el),
      };
    });
    const hudBoxes = [
      ...document.querySelectorAll('#bbq-hud .topbar, #bbq-orders .card, #bbq-stick, #bbq-act, #bbq-bubbles .bubble'),
    ]
      .filter((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity !== '0')
      .map((el) => ({ tag: el.id || el.className, rect: rect(el) }));
    const ringOcclusions = rings.map((rg) => ({
      table: rg.table,
      hits: hudBoxes
        .map((h) => ({ tag: h.tag, area: interArea(rg.rect, h.rect), h: h.rect }))
        .filter((x) => x.area > 0),
    }));
    return {
      iw: window.innerWidth,
      ih: window.innerHeight,
      seated,
      cards,
      rings,
      bubbleCards: document.querySelectorAll('#bbq-bubbles .card').length,
      ringOcclusions,
    };
  });

  const assertBindingAndBadges = (tag, snap) => {
    const sortedExpected = [...snap.seated]
      .sort((x, y) => (TABLE_IDX[x.table] ?? 99) - (TABLE_IDX[y.table] ?? 99))
      .slice(0, 3);
    assert.equal(snap.cards.length, sortedExpected.length, `${tag}) card count ${snap.cards.length} != expected ${sortedExpected.length}`);
    assert.equal(snap.cards.length, snap.rings.length, `${tag}) cards (${snap.cards.length}) must equal rings (${snap.rings.length})`);
    assert.equal(snap.bubbleCards, 0, `${tag}) #bbq-bubbles must contain 0 .card elements`);
    for (let i = 0; i < sortedExpected.length; i++) {
      const card = snap.cards[i];
      const cust = sortedExpected[i];
      assert.equal(card.table, cust.table, `${tag}) card[${i}].dataset.table=${card.table} !== customer.table=${cust.table}`);
      assert.equal(card.badgeText, String(TABLE_IDX[cust.table]), `${tag}) badge text "${card.badgeText}" !== "${TABLE_IDX[cust.table]}"`);
      assert.ok(card.badgeFontPx >= 13, `${tag}) .tb-badge fontSize ${card.badgeFontPx}px < 13px`);
      assert.equal(card.overlapRing, 0, `${tag}) .tb-badge overlaps .ring (area=${card.overlapRing})`);
      assert.equal(card.overlapNm, 0, `${tag}) .tb-badge overlaps .nm (area=${card.overlapNm})`);
      const ring = snap.rings.find((r) => r.table === card.table);
      assert.ok(ring, `${tag}) missing [data-order-ring="${card.table}"]`);
      assert.equal(ring.pointerEvents, 'none', `${tag}) ring ${card.table} pointer-events=${ring.pointerEvents}`);
    }
  };

  const assertInViewAndClear = (tag, snap) => {
    for (const card of snap.cards) {
      const r = card.rect;
      assert.ok(r.l >= 0 && r.t >= 0 && r.r <= snap.iw && r.b <= snap.ih,
        `${tag}) card ${card.table} outside viewport ${snap.iw}x${snap.ih}: ${JSON.stringify(r)}`);
    }
    for (const rg of snap.rings) {
      const r = rg.rect;
      assert.ok(rg.display !== 'none' && r.w > 0 && r.h > 0, `${tag}) ring ${rg.table} hidden`);
      assert.ok(r.l >= 0 && r.t >= 0 && r.r <= snap.iw && r.b <= snap.ih,
        `${tag}) ring ${rg.table} outside viewport ${snap.iw}x${snap.ih}: ${JSON.stringify(r)}`);
    }
    for (const oc of snap.ringOcclusions) {
      assert.equal(oc.hits.length, 0,
        `${tag}) ring ${oc.table} occluded by HUD: ${JSON.stringify(oc.hits)}`);
    }
  };

  // e) B-068: out-of-order seating (t2, t3 sit first, t1 sits last) -> 3 cards strictly sorted ascending
  //    [t1, t2, t3], order stable after +2s tick, ring removal on departure, 0 bubble .card, badge geometry.
  const eSetup = await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    window.__test.spawnNow('pork');       // t1
    window.__test.spawnNow('mushroom');   // t2
    window.__test.spawnNow('mixian');     // t3
    // Wait until t1 sits (t2/t3 are still walking-in)
    for (let i = 0; i < 200; i++) {
      window.__test.tick(0.05, 1);
      if (window.__game.customers.some((x) => x.table === 't1' && x.phase === 'seated')) break;
    }
    const t1SeatedRing = !!document.querySelector('#bbq-rings [data-order-ring="t1"]');
    // Expire ONLY t1 while t2/t3 are still walking-in
    window.__test.setPatience(0.05);
    for (let i = 0; i < 40; i++) {
      window.__test.tick(0.05, 1);
      if (window.__game.customers.some((x) => x.table === 't1' && x.phase === 'leaving-angry')) break;
    }
    const t1LeftRing = !!document.querySelector('#bbq-rings [data-order-ring="t1"]');
    // Wait until t2 & t3 are seated and t1 has finished leaving
    for (let i = 0; i < 400; i++) {
      window.__test.setPatience(600);
      window.__test.tick(0.05, 1);
      const t2s = window.__game.customers.some((x) => x.table === 't2' && x.phase === 'seated');
      const t3s = window.__game.customers.some((x) => x.table === 't3' && x.phase === 'seated');
      const t1Gone = !window.__game.customers.some((x) => x.table === 't1');
      if (t2s && t3s && t1Gone) break;
    }
    // Wait out t1's 4s tableCooldown so free[0] is t1 (not t4)
    for (let i = 0; i < 90; i++) {
      window.__test.setPatience(600);
      window.__test.tick(0.05, 1);
    }
    window.__test.spawnNow('pork');       // takes free[0] = t1!
    // Wait until the new t1 guest sits (arrival order in customers is [t2, t3, t1])
    for (let i = 0; i < 200; i++) {
      window.__test.setPatience(600);
      window.__test.tick(0.05, 1);
      const seated = window.__game.customers.filter((x) => x.phase === 'seated');
      if (seated.length === 3) break;
    }
    return {
      t1SeatedRing,
      t1LeftRing,
      arrivalOrder: window.__game.customers.filter((x) => x.phase === 'seated').map((x) => x.table),
    };
  });
  assert.equal(eSetup.t1SeatedRing, true, 'e) ring for t1 must appear when t1 seats');
  assert.equal(eSetup.t1LeftRing, false, 'e) ring for t1 must be removed immediately when t1 leaves');
  assert.deepEqual(eSetup.arrivalOrder, ['t2', 't3', 't1'], `e) expected out-of-order arrival [t2,t3,t1], got ${JSON.stringify(eSetup.arrivalOrder)}`);

  const e1 = await probeB068();
  assertBindingAndBadges('e 3单绑定', e1);
  const order1 = e1.cards.map((x) => x.table);
  assert.deepEqual(order1, ['t1', 't2', 't3'], `e) cards must be strictly ascending [t1,t2,t3], got ${JSON.stringify(order1)}`);

  await page.evaluate(() => { window.__test.setPatience(600); window.__test.tick(0.05, 40); }); // +2s
  const e2 = await probeB068();
  assertBindingAndBadges('e +2s稳定', e2);
  const order2 = e2.cards.map((x) => x.table);
  assert.deepEqual(order2, order1, `e) card order changed after +2s: ${JSON.stringify(order1)} -> ${JSON.stringify(order2)}`);
  console.log(`PASS e) 乱序入座 [${eSetup.arrivalOrder.join(',')}] → 卡片固定升序 [${order1.join(',')}] (+2s 稳定)，光圈 3=3 且离店即移除，#bbq-bubbles .card=0，徽章字号=${e1.cards[0].badgeFontPx}px 交叠面积=0`);

  // f) B-068 dual-viewport screenshots: rings & cards in viewport, rings not occluded by HUD
  // Landscape 844x390 (clean 3 active tables: t1, t2, t3)
  await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove());
    window.__test.spawnNow('pork');       // t1
    window.__test.spawnNow('mushroom');   // t2
    window.__test.spawnNow('mixian');     // t3
    for (let i = 0; i < 300; i++) {
      window.__test.setPatience(65);
      window.__test.tick(0.05, 1);
      if (window.__game.customers.filter((x) => x.phase === 'seated').length === 3) break;
    }
    window.__test.setPatience(65);
    window.__test.tick(0.05, 2);
  });
  await raf2();
  const fL = await probeB068();
  assert.deepEqual([fL.iw, fL.ih], [844, 390], 'f) landscape viewport');
  assert.equal(fL.cards.length, 3, `f 横屏) expected 3 cards, got ${fL.cards.length}`);
  assertBindingAndBadges('f 横屏', fL);
  assertInViewAndClear('f 横屏', fL);
  await shot('e2e/shots/b068-landscape.png');
  console.log(`PASS f) 横屏 844x390 3张卡 [${fL.cards.map((x) => x.table).join(',')}] 与 3个光圈均在视口内且不被HUD遮挡 → e2e/shots/b068-landscape.png`);

  // Portrait 390x844 (2 visible tables t1, t2 cleanly framed inside portrait camera width)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.innerWidth === 390, null, { timeout: 10000 });
  await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove());
    window.__test.spawnNow('pork');       // t1
    window.__test.spawnNow('mushroom');   // t2
    for (let i = 0; i < 300; i++) {
      window.__test.setPatience(65);
      window.__test.tick(0.05, 1);
      if (window.__game.customers.filter((x) => x.phase === 'seated').length === 2) break;
    }
    window.__test.setPatience(65);
    window.__test.tick(0.05, 2);
  });
  await raf2();
  const fP = await probeB068();
  assert.deepEqual([fP.iw, fP.ih], [390, 844], 'f) portrait viewport');
  assert.equal(fP.cards.length, 2, `f 竖屏) expected 2 cards, got ${fP.cards.length}`);
  assertBindingAndBadges('f 竖屏', fP);
  assertInViewAndClear('f 竖屏', fP);
  await shot('e2e/shots/b068-portrait.png');
  console.log(`PASS f) 竖屏 390x844 2张卡 [${fP.cards.map((x) => x.table).join(',')}] 与 2个光圈均在视口内且不被HUD遮挡 → e2e/shots/b068-portrait.png`);

  assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
  console.log('ORDERS OK');
} finally {
  await browser.close();
}
