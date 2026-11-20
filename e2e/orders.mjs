// E2E: P1-1 — order cards must appear the frame a guest sits (not only after serve),
// the patience ring must refresh while waiting, and <25% patience flips the card to .angry.
// Usage: E2E_BASE=http://127.0.0.1:5176/bbq/ node e2e/orders.mjs

const { chromium } = await import('playwright');
const { mkdirSync, existsSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'https://openfolio.uk/bbq/';
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

  assert.equal(errors.length, 0, `js errors:\n${errors.join('\n')}`);
  console.log('ORDERS OK');
} finally {
  await browser.close();
}
