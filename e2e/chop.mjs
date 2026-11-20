// E2E: P1-1 — chopping must give visible feedback: screen-space #bbq-chop badge (64×8 bar + status text)
// and knife marks on the board (`__game.cuts[i].visible`).
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ node e2e/chop.mjs          (default: the local 3035 build)
//        E2E_REF=http://127.0.0.1:4176/bbq/  — optional pre-change build, enables the draw-call delta check (≤ +4)
//        E2E_RUNS=3 — repeat the whole suite N times (default 1; acceptance runs it 3×)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const REF = process.env.E2E_REF ?? '';
const RUNS = Number(process.env.E2E_RUNS ?? 1);
const CALLS_BUDGET = 4;
const TAPS = 3;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

async function open(url, viewport) {
  const page = await browser.newPage({ viewport, hasTouch: true });
  const errors = [];
  page.on('crash', () => errors.push('PAGE CRASH'));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
  let frames = 0;
  for (let i = 0; i < 60 && frames <= 30; i++) {
    await page.waitForTimeout(1000);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  assert.ok(frames > 30, `page never rendered frames (${url})`);
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
  return { page, errors };
}

const sim = (page, sec) => page.evaluate((s) => window.__test.tick(0.05, Math.round(s / 0.05)), sec);
const state = (page) => page.evaluate(() => window.__test.state());
const raf2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
async function act(page) {
  await page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
}
async function at(page, id, want) {
  await page.evaluate((i) => window.__test.teleportToStation(i), id);
  await sim(page, 0.1);
  const s = await state(page);
  assert.equal(s.action, want, `at ${id}: expected ${want}, got ${s.action}`);
}
/** a real pointer press on #bbq-act, then let the render loop consume it (two rAFs) */
async function tapAct(page) {
  await page.click('#bbq-act', { timeout: 10000 });
  await raf2(page);
}

const probe = (page) => page.evaluate(() => {
  const root = document.querySelector('#bbq-chop .cb');
  if (!root) return null;
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const bar = root.querySelector('.cb-bar');
  const fill = root.querySelector('.cb-fill');
  const txt = root.querySelector('.cb-txt');
  const box = rect(root);
  const hit = document.elementFromPoint(box.x + box.w / 2, box.y + box.h / 2);
  return {
    display: getComputedStyle(root).display,
    layerPointerEvents: getComputedStyle(document.querySelector('#bbq-chop')).pointerEvents,
    rootPointerEvents: getComputedStyle(root).pointerEvents,
    hitInside: !!hit && !!hit.closest('#bbq-chop'),
    text: txt.textContent, fontPx: parseFloat(getComputedStyle(txt).fontSize),
    pct: (fill.getBoundingClientRect().width / bar.getBoundingClientRect().width) * 100,
    bar: rect(bar), box,
    act: rect(document.querySelector('#bbq-act')),
    stick: rect(document.querySelector('#bbq-stick')),
    cuts: window.__game.cuts.filter((m) => m.visible).length,
    vp: { w: innerWidth, h: innerHeight },
  };
});
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function runViewport(tag, viewport) {
  const { page, errors } = await open(BASE, viewport);
  try {
    await at(page, 'crate-pork', 'take-raw'); await act(page);
    await at(page, 'chop', 'chop'); await act(page);
    await raf2(page);

    // 1) raw skewer on the board → badge visible, never hit-testable
    let p = await probe(page);
    assert.ok(p, `${tag} 1) #bbq-chop .cb missing`);
    assert.notEqual(p.display, 'none', `${tag} 1) badge hidden with a skewer on the board`);
    assert.equal(p.layerPointerEvents, 'none', `${tag} 1) #bbq-chop must be pointer-events:none`);
    assert.equal(p.hitInside, false, `${tag} 1) elementFromPoint hit the badge`);
    assert.match(p.text, /切配 0\/3/, `${tag} 1) initial text "${p.text}"`);
    assert.equal(p.cuts, 0, `${tag} 1) knife marks before any cut`);
    console.log(`PASS ${tag} 1) 放上砧板 badge 可见「${p.text}」pointer-events=${p.layerPointerEvents} elementFromPoint 未命中`);

    // 2)+3)+4) three real taps
    for (let n = 1; n <= TAPS; n++) {
      await tapAct(page);
      p = await probe(page);
      const want = (n / TAPS) * 100;
      assert.ok(Math.abs(p.pct - want) <= 4, `${tag} 2) tap ${n}: fill ${p.pct.toFixed(1)}% != ${want.toFixed(1)}%`);
      assert.match(p.text, n < TAPS ? /切配 [123]\/3/ : /已切好/, `${tag} 2) tap ${n}: text "${p.text}"`);
      if (n < TAPS) assert.match(p.text, new RegExp(`切配 ${n}/3`), `${tag} 2) tap ${n}: text "${p.text}"`);
      assert.equal(p.cuts, n, `${tag} 2) tap ${n}: ${p.cuts} knife marks visible`);
      assert.equal(p.hitInside, false, `${tag} 2) tap ${n}: badge hit-testable`);
      assert.ok(p.bar.w >= 64 && p.bar.h >= 8, `${tag} 3) bar ${p.bar.w}x${p.bar.h} < 64x8`);
      assert.ok(p.box.w >= 64 && p.box.h >= 8, `${tag} 3) box ${p.box.w}x${p.box.h} < 64x8`);
      assert.ok(p.fontPx >= 13, `${tag} 3) status font ${p.fontPx}px < 13`);
      const b = p.box;
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= p.vp.w && b.y + b.h <= p.vp.h, `${tag} 4) badge outside viewport ${JSON.stringify(b)} in ${p.vp.w}x${p.vp.h}`);
      assert.ok(!overlap(b, p.act), `${tag} 4) badge overlaps #bbq-act ${JSON.stringify(b)} vs ${JSON.stringify(p.act)}`);
      assert.ok(!overlap(b, p.stick), `${tag} 4) badge overlaps #bbq-stick ${JSON.stringify(b)} vs ${JSON.stringify(p.stick)}`);
      console.log(`PASS ${tag} 2) 第${n}刀 fill=${p.pct.toFixed(1)}% 「${p.text}」刀痕=${p.cuts} 条=${p.bar.w}x${p.bar.h} 字=${p.fontPx}px 框=(${b.x | 0},${b.y | 0},${b.w | 0}x${b.h | 0})`);
    }
    const s3 = await state(page);
    assert.equal(s3.chop.held, 'chopped');
    assert.equal(s3.chop.chopLeft, 0);

    // 已切好 stays until the skewer is taken
    await sim(page, 1.0); await raf2(page);
    p = await probe(page);
    assert.notEqual(p.display, 'none', `${tag} 已切好 badge vanished before pickup`);
    assert.match(p.text, /已切好/);

    // 5) take it away → hidden, marks gone
    await tapAct(page);
    assert.equal((await state(page)).carrying?.stage, 'chopped', `${tag} 5) pickup did not lift the chopped skewer`);
    p = await probe(page);
    assert.equal(p.display, 'none', `${tag} 5) badge still visible after pickup`);
    assert.equal(p.cuts, 0, `${tag} 5) knife marks left on an empty board`);
    console.log(`PASS ${tag} 5) 取走后 #bbq-chop display:none 刀痕清零`);

    assert.equal(errors.length, 0, `${tag} JS errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 JS error`);
  } finally {
    await page.close();
  }
}

async function freshCalls(page) {
  const f0 = await page.evaluate(() => window.__frames);
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    if ((await page.evaluate(() => window.__frames)) >= f0 + 2) break;
  }
  await page.waitForTimeout(600);
  return page.evaluate(() => window.__perf.calls);
}
async function callsChopped(url) {
  const { page, errors } = await open(url, { width: 390, height: 844 });
  try {
    await at(page, 'crate-pork', 'take-raw'); await act(page);
    await at(page, 'chop', 'chop'); await act(page);
    for (let i = 0; i < TAPS; i++) await act(page);
    const calls = await freshCalls(page);
    assert.equal(errors.length, 0, `JS errors at ${url}:\n${errors.join('\n')}`);
    return calls;
  } finally { await page.close(); }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  await runViewport('竖屏390x844', { width: 390, height: 844 });
  await runViewport('横屏844x390', { width: 844, height: 390 });
}

const after = await callsChopped(BASE);
if (REF) {
  const before = await callsChopped(REF);
  assert.ok(after - before <= CALLS_BUDGET, `draw calls ${before} -> ${after} (+${after - before} > ${CALLS_BUDGET})`);
  console.log(`PASS draw calls ${before} -> ${after} (+${after - before} ≤ ${CALLS_BUDGET})`);
} else {
  console.log(`INFO draw calls (chopped skewer on board) = ${after} (set E2E_REF=<pre-change build url> to assert the +${CALLS_BUDGET} budget)`);
}

await browser.close();
console.log('CHOP OK');
