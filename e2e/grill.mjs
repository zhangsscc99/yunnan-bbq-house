// E2E: B-001 — grill doneness must be readable at 390×844 via the screen-space DOM badges
// (#bbq-grillbars) and the skewer colour (`__game.grill.slots[i].hex`).
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ node e2e/grill.mjs      (npm run build && npm run preview)
//        E2E_SHOTS=1 — also save e2e/shots/grill-*.png (slow under software GL)
//        E2E_REF=http://127.0.0.1:4176/bbq/  — optional pre-change build, enables the draw-call delta check (A4)

const { chromium } = await import('playwright');
const { mkdirSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const REF = process.env.E2E_REF ?? '';
const CALLS_BUDGET = 6;
mkdirSync('e2e/shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

const shot = async (p, path) => { if (process.env.E2E_SHOTS) await p.screenshot({ path, timeout: 120000 }); };
const rgb = (hex) => { const n = parseInt(hex.replace(/^#|^0x/, ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

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
async function act(page) {
  await page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
}
async function at(page, id, want) {
  await page.evaluate((i) => window.__test.teleportToStation(i), id);
  await sim(page, 0.1);
  const s = await state(page);
  assert.equal(s.action, want, `at ${id}: expected ${want}, got ${s.action}`);
}

/** crate → chop → grill; leaves one chopped skewer cooking on the grill, returns its slot index */
async function putSkewerOnGrill(page) {
  await at(page, 'crate-pork', 'take-raw'); await act(page);
  await at(page, 'chop', 'chop'); await act(page);
  for (let i = 0; i < 3; i++) await act(page);
  await act(page);
  await at(page, 'grill', 'put-grill'); await act(page);
  const slot = await page.evaluate(() => window.__game.grill.slots.findIndex((s) => s.item));
  assert.ok(slot >= 0, 'skewer never landed on the grill');
  return slot;
}

/** wait until the render loop has drawn >= 2 more frames, then give __perf's 250ms poll time to refresh */
async function freshCalls(page) {
  const f0 = await page.evaluate(() => window.__frames);
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(500);
    if ((await page.evaluate(() => window.__frames)) >= f0 + 2) break;
  }
  await page.waitForTimeout(600);
  return page.evaluate(() => window.__perf.calls);
}

const badge = (page, slot) => page.evaluate((i) => {
  const root = document.querySelector(`#bbq-grillbars .gb[data-slot="${i}"]`);
  if (!root) return null;
  const cs = getComputedStyle(root);
  const bar = root.querySelector('.gb-bar').getBoundingClientRect();
  const r = root.getBoundingClientRect();
  const txt = root.querySelector('.gb-txt');
  return {
    display: cs.display, text: txt.textContent, color: getComputedStyle(txt).color,
    fontPx: parseFloat(getComputedStyle(txt).fontSize),
    bar: { w: bar.width, h: bar.height },
    box: { x: r.x, y: r.y, w: r.width, h: r.height },
    pointerEvents: getComputedStyle(document.querySelector('#bbq-grillbars')).pointerEvents,
    hex: window.__game.grill.slots[i].hex,
    stage: window.__game.grill.slots[i].item?.stage,
  };
}, slot);
let slotIdx = 0;

// ---- A1–A3 + A4 (errors) on the portrait page ----
const { page, errors } = await open(BASE, { width: 390, height: 844 });
try {
  slotIdx = await putSkewerOnGrill(page);
  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));

  // A1
  await sim(page, 0.1);
  let b = await badge(page, slotIdx);
  assert.ok(b, 'A1) badge element missing');
  assert.notEqual(b.display, 'none', 'A1) badge hidden with a skewer on the grill');
  assert.ok(b.bar.w >= 60 && b.bar.h >= 6, `A1) bar ${b.bar.w}x${b.bar.h} < 60x6`);
  assert.ok(b.box.x >= 0 && b.box.y >= 0 && b.box.x + b.box.w <= vp.w && b.box.y + b.box.h <= vp.h, `A1) badge not fully in viewport ${JSON.stringify(b.box)}`);
  assert.ok(b.fontPx >= 12 && b.fontPx <= 13, `A1) status font ${b.fontPx}px`);
  assert.equal(b.pointerEvents, 'none', 'A1) #bbq-grillbars must be pointer-events:none');
  const hexRaw = b.hex;
  await shot(page, 'e2e/shots/grill-t0.png');
  console.log(`PASS A1) 竖屏徽标可见 条=${b.bar.w}x${b.bar.h} 字=${b.fontPx}px 位置=(${b.box.x | 0},${b.box.y | 0}) 「${b.text}」`);

  // A2
  await sim(page, 4.5);
  b = await badge(page, slotIdx);
  assert.match(b.text, /烤制中/, `A2) t=4.6 text "${b.text}"`);
  assert.equal(b.stage, 'chopped');
  await shot(page, 'e2e/shots/grill-t4.6.png');
  await sim(page, 4.7);
  b = await badge(page, slotIdx);
  assert.match(b.text, /已熟/, `A2) t=9.3 text "${b.text}"`);
  assert.equal(b.stage, 'cooked');
  const diff = rgb(b.hex).reduce((a, v, i) => a + Math.abs(v - rgb(hexRaw)[i]), 0);
  assert.ok(diff >= 40, `A2) hex ${hexRaw} -> ${b.hex} channel-diff ${diff} < 40`);
  await shot(page, 'e2e/shots/grill-t9.3.png');
  console.log(`PASS A2) t=4.6「烤制中」; t=9.3「${b.text}」 hex ${hexRaw} -> ${b.hex} 通道差=${diff}`);

  // A3
  await sim(page, 3.3);
  b = await badge(page, slotIdx);
  assert.match(b.text, /焦/, `A3) t=12.6 text "${b.text}"`);
  assert.equal(b.stage, 'waste');
  const [cr, cg, cb] = rgb('0x241d18');
  const [r, g, bl] = rgb(b.hex);
  assert.ok(Math.abs(r - cr) <= 24 && Math.abs(g - cg) <= 24 && Math.abs(bl - cb) <= 24, `A3) burnt hex ${b.hex}`);
  const [rr, gg, bb] = b.color.match(/\d+/g).map(Number);
  assert.ok(rr > 200 && gg < 140 && bb < 120, `A3) burnt text colour not red: ${b.color}`);
  await shot(page, 'e2e/shots/grill-t12.6.png');
  console.log(`PASS A3) t=12.6「${b.text}」 hex ${b.hex} 文字色 ${b.color}`);

  // A1 (cont.) taking it away hides the badge
  await at(page, 'grill', 'take-grill'); await act(page);
  assert.equal((await state(page)).carrying?.stage, 'waste', 'A1) take-grill did not lift the burnt skewer');
  b = await badge(page, slotIdx);
  assert.equal(b.display, 'none', 'A1) badge still visible after take-away');
  console.log('PASS A1) 取走后 display:none');

  // landscape: same guarantees
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await at(page, 'bin', 'discard'); await act(page);
  const slotL = await putSkewerOnGrill(page);
  slotIdx = slotL;
  await sim(page, 0.1);
  const bl2 = await badge(page, slotL);
  assert.notEqual(bl2.display, 'none', 'landscape badge hidden');
  assert.ok(bl2.bar.w >= 60 && bl2.bar.h >= 6, `landscape bar ${bl2.bar.w}x${bl2.bar.h}`);
  await shot(page, 'e2e/shots/grill-landscape.png');
  console.log(`PASS 横屏 条=${bl2.bar.w}x${bl2.bar.h}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  assert.equal(errors.length, 0, `A4) JS errors:\n${errors.join('\n')}`);
  console.log('PASS A4) 0 JS error');
} finally {
  await page.close();
}

// ---- A5–A7: B-021 three-state doneness bar (cooked 100% / warn flashing / burnt) ----
{
  const { page: p5, errors: errs5 } = await open(BASE, { width: 390, height: 844 });
  try {
    const si = await putSkewerOnGrill(p5);
    const probe = () => p5.evaluate((i) => {
      const root = document.querySelector(`#bbq-grillbars .gb[data-slot="${i}"]`);
      const bar = root.querySelector('.gb-bar').getBoundingClientRect();
      const fill = root.querySelector('.gb-fill');
      const mark = root.querySelector('.gb-mark').getBoundingClientRect();
      const it = window.__game.grill.slots[i].item;
      return {
        text: root.querySelector('.gb-txt').textContent, warn: root.classList.contains('warn'),
        anim: getComputedStyle(root).animationName, animDur: getComputedStyle(root).animationDuration,
        fillW: fill.getBoundingClientRect().width, barW: bar.width, markL: mark.left - bar.left,
        fillColor: getComputedStyle(fill).backgroundColor, stage: it?.stage, t: it?.grillT,
      };
    }, si);

    await sim(p5, 8.5);
    const c = await probe();
    assert.equal(c.stage, 'cooked');
    assert.match(c.text, /已熟/);
    assert.ok(c.t > 8 && c.t < 9.5, `A5) t=${c.t}`);
    assert.ok(c.fillW >= c.barW * 0.95, `A5) cooked fill ${c.fillW}/${c.barW} < 95%`);
    assert.ok(c.markL >= c.barW * 0.92, `A5) gb-mark left ${c.markL}/${c.barW} < 92%`);
    assert.equal(c.warn, false, 'A5) warn must not be set when merely cooked');
    console.log(`PASS A5) t=${c.t.toFixed(1)} 「${c.text}」 fill=${(c.fillW / c.barW * 100).toFixed(0)}% mark.left=${c.markL.toFixed(1)}/${c.barW}`);

    await sim(p5, 1.9);
    const w = await probe();
    assert.ok(w.t >= 10 && w.t < 12, `A6) t=${w.t}`);
    assert.match(w.text, /快焦了/, `A6) text "${w.text}"`);
    assert.equal(w.warn, true, 'A6) warn class missing');
    assert.notEqual(w.anim, 'none', 'A6) no animation on warn');
    assert.ok(parseFloat(w.animDur) <= 1, `A6) animation period ${w.animDur} > 1s`);
    assert.notEqual(w.fillColor, c.fillColor, `A6) warn fill colour same as done: ${w.fillColor}`);
    assert.ok(w.fillW >= w.barW * 0.95, `A6) warn fill ${w.fillW}/${w.barW}`);
    assert.equal(w.stage, 'cooked', 'A6) stage must still be cooked');
    console.log(`PASS A6) t=${w.t.toFixed(1)} 「${w.text}」 warn anim=${w.anim} ${w.animDur} fill ${c.fillColor} -> ${w.fillColor} stage=${w.stage}`);

    await sim(p5, 2.1);
    const bt = await probe();
    assert.ok(bt.t >= 12, `A7) t=${bt.t}`);
    assert.match(bt.text, /焦了/, `A7) text "${bt.text}"`);
    assert.ok(bt.fillW >= bt.barW * 0.99, `A7) burnt fill ${bt.fillW}/${bt.barW}`);
    assert.equal(bt.warn, false, 'A7) warn class not removed');
    assert.notEqual(bt.fillColor, w.fillColor, 'A7) burnt fill colour equals warn');
    assert.notEqual(bt.fillColor, c.fillColor, 'A7) burnt fill colour equals done');
    console.log(`PASS A7) t=${bt.t.toFixed(1)} 「${bt.text}」 fill=100% warn=false fill ${bt.fillColor}`);
    assert.equal(errs5.length, 0, `A5-7) JS errors:\n${errs5.join('\n')}`);
  } finally { await p5.close(); }
}

// ---- A4 draw calls: identical scenario (t=9.3, cooked, smoke up) vs the pre-change build ----
async function callsAt93(url) {
  const { page: p, errors: errs } = await open(url, { width: 390, height: 844 });
  try {
    await putSkewerOnGrill(p);
    await sim(p, 9.3);
    const calls = await freshCalls(p);
    assert.equal(errs.length, 0, `JS errors at ${url}:\n${errs.join('\n')}`);
    return calls;
  } finally { await p.close(); }
}
const after = await callsAt93(BASE);
if (REF) {
  const before = await callsAt93(REF);
  assert.ok(after - before <= CALLS_BUDGET, `A4) draw calls ${before} -> ${after} (+${after - before} > ${CALLS_BUDGET})`);
  console.log(`PASS A4) draw calls ${before} -> ${after} (+${after - before} ≤ ${CALLS_BUDGET})`);
} else {
  console.log(`INFO A4) draw calls after = ${after} (set E2E_REF=<pre-change build url> to assert the +${CALLS_BUDGET} budget)`);
}

await browser.close();
console.log('GRILL OK');
