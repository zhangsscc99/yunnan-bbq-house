// E2E: B-047 — 收款 "+¥N" / 愤怒离店 popups must be visible from birth:
//   1) on insert: computed opacity === 1, font-size >= 22px, box h >= 1.2*fs, box w >= chars*fs*0.55
//   2) lifted >= 40px above the anchor's screen y, and not intersecting any #bbq-bubbles .bubble (money AND warn)
//   3) stays >= 1.6s with opacity 1 until at least 1.2s, removed eventually
//   4) serving really adds money and #bbq-popups text contains "+¥"; anger path shows 愤怒离店 / -1
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ node e2e/popup.mjs
//        E2E_RUNS=3 — repeat the whole suite N times (default 1; acceptance runs it 3×)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Number(process.env.E2E_RUNS ?? 1);
const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError) && /has been closed|Target page|Target closed|crash/i.test(String(e?.message ?? e));

async function open(url, viewport) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
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
    const close = async () => { await page.close().catch(() => {}); await browser.close().catch(() => {}); };
    return { page, errors, close };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!isEnvCrash(e) || attempt >= MAX_RETRIES) throw e;
      console.log(`RETRY ${label}: environment crash (${String(e.message).split('\n')[0]}) — retry ${attempt + 1}/${MAX_RETRIES}`);
    }
  }
}

const sim = (page, sec) => page.evaluate((s) => window.__test.tick(0.05, Math.ceil(s / 0.05)), sec);
const state = (page) => page.evaluate(() => window.__test.state());
const raf2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const at = (page, id) => page.evaluate((i) => { window.__test.teleportToStation(i); window.__test.tick(0.05, 2); }, id);
const atTable = (page, id) => page.evaluate((i) => { window.__test.teleportToTable(i); window.__test.tick(0.05, 2); }, id);
const press = (page, n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n);
const keepPatient = (page) => page.evaluate(() => window.__test.setPatience(600));

async function makePlatedPork(page) {
  await at(page, 'crate-pork'); await press(page);
  await at(page, 'chop'); await press(page, 1 + 3 + 1);
  await at(page, 'grill'); await press(page); await sim(page, 6.5); await press(page);
  await at(page, 'plate'); await press(page);
  const s = await state(page);
  assert.deepEqual(s.carrying, { dish: 'pork', stage: 'plated' }, `expected plated pork, got ${JSON.stringify(s.carrying)}`);
}

async function seatGuest(page, dish) {
  assert.equal(await page.evaluate((d) => window.__test.spawnNow(d), dish), true, 'no free table');
  let g;
  for (let i = 0; i < 30 && !g; i++) {
    await sim(page, 0.5);
    g = (await state(page)).customers.find((c) => c.phase === 'seated');
  }
  assert.ok(g, `${dish} guest never seated`);
  return g;
}

const clearPopups = (page) => page.evaluate(() => document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove()));

/** page-side probe, returns everything the assertions need about the newest popup (null if none) */
const PROBE_SRC = `(() => {
  const list = document.querySelectorAll('#bbq-popups .popup');
  const e = list[list.length - 1];
  if (!e) return null;
  const rect = (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const cs = getComputedStyle(e);
  return {
    text: e.textContent, kind: e.className, opacity: cs.opacity, fontPx: parseFloat(cs.fontSize),
    box: rect(e), ax: Number(e.dataset.ax), ay: Number(e.dataset.ay),
    bubbles: [...document.querySelectorAll('#bbq-bubbles .bubble')].map(rect),
    layerText: document.querySelector('#bbq-popups').textContent,
    vp: { w: innerWidth, h: innerHeight },
  };
})()`;
const probe = (page) => page.evaluate(PROBE_SRC);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function assertBirth(tag, p) {
  assert.ok(p, `${tag} popup missing right after the event`);
  assert.equal(p.opacity, '1', `${tag} opacity at insert = ${p.opacity}`);
  assert.ok(p.fontPx >= 22, `${tag} font-size ${p.fontPx} < 22`);
  assert.ok(p.box.h >= 1.2 * p.fontPx, `${tag} box h ${p.box.h} < 1.2*${p.fontPx}`);
  const chars = [...p.text].length;
  assert.ok(p.box.w >= chars * p.fontPx * 0.55, `${tag} box w ${p.box.w} < ${chars}*${p.fontPx}*0.55`);
  const gap = p.ay - (p.box.y + p.box.h);
  assert.ok(gap >= 40, `${tag} bottom edge only ${gap.toFixed(1)}px above anchor y (need >= 40)`);
  for (const b of p.bubbles) assert.ok(!overlap(p.box, b), `${tag} popup ${JSON.stringify(p.box)} intersects bubble ${JSON.stringify(b)}`);
  return gap;
}

/** sample the newest popup for 1.7s wall time right after insert (call immediately: at ~1fps a rAF wait would eat the lifetime), then wait for removal */
async function dwell(tag, page) {
  const samples = await page.evaluate(async () => {
    const e = document.querySelector('#bbq-popups .popup:last-child');
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 1700) {
      const alive = !!e && e.isConnected;
      const rect = (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      out.push({
        t: performance.now() - t0, alive, opacity: alive ? getComputedStyle(e).opacity : null,
        box: alive ? rect(e) : null, ay: alive ? Number(e.dataset.ay) : 0,
        bubbles: [...document.querySelectorAll('#bbq-bubbles .bubble')].map(rect),
      });
      await new Promise((r) => setTimeout(r, 80));
    }
    return out;
  });
  for (const s of samples) {
    assert.ok(s.alive, `${tag} popup removed at ${s.t.toFixed(0)}ms (< 1.6s)`);
    if (s.t < 1200) assert.equal(s.opacity, '1', `${tag} opacity ${s.opacity} at ${s.t.toFixed(0)}ms (< 1.2s)`);
    assert.ok(s.ay - (s.box.y + s.box.h) >= 40, `${tag} gap to anchor < 40px at ${s.t.toFixed(0)}ms`);
    for (const b of s.bubbles) assert.ok(!overlap(s.box, b), `${tag} popup intersects a bubble at ${s.t.toFixed(0)}ms`);
  }
  let gone = false;
  for (let i = 0; i < 40 && !gone; i++) {
    await page.waitForTimeout(250);
    gone = await page.evaluate(() => document.querySelectorAll('#bbq-popups .popup').length === 0);
  }
  assert.ok(gone, `${tag} popup never removed`);
  return samples.length;
}

const runViewport = (tag, viewport) => withRetry(tag, () => runViewportOnce(tag, viewport));
async function runViewportOnce(tag, viewport) {
  const { page, errors, close } = await open(BASE, viewport);
  try {
    // ---- money: serve a correct dish ----
    const guest = await seatGuest(page, 'pork');
    await keepPatient(page);
    await makePlatedPork(page);
    await keepPatient(page);
    await atTable(page, guest.table);
    let s = await state(page);
    assert.equal(s.action, 'serve', `${tag} money) action should be serve, got ${s.action}`);
    const money0 = s.money;
    await clearPopups(page);
    await raf2(page);   // let the render loop lay out the guest's bubble first
    const pm = await page.evaluate((src) => {
      window.__test.press(); window.__test.tick(0.05, 2);
      return eval(src);
    }, PROBE_SRC);
    s = await state(page);
    assert.ok(s.money > money0, `${tag} money) ${money0} -> ${s.money} did not grow`);
    assert.ok(pm && pm.layerText.includes('+¥'), `${tag} money) #bbq-popups text lacks "+¥": ${pm?.layerText}`);
    assert.equal(pm.text, `+¥${s.money - money0}`, `${tag} money) popup text "${pm.text}" vs gain ${s.money - money0}`);
    assert.ok(pm.kind.includes('money'), `${tag} money) kind ${pm.kind}`);
    assert.ok(pm.bubbles.length >= 1, `${tag} money) no .bubble in DOM — overlap check would be vacuous`);
    const gapM = assertBirth(`${tag} money)`, pm);
    const nM = await dwell(`${tag} money)`, page);
    console.log(`PASS ${tag} money) ¥${money0}->¥${s.money} "${pm.text}" opacity=${pm.opacity} font=${pm.fontPx}px box=${pm.box.w.toFixed(0)}x${pm.box.h.toFixed(0)} 距锚点=${gapM.toFixed(0)}px bubbles=${pm.bubbles.length} 驻留>=1.6s(${nM} 采样) 随后移除`);

    // ---- warn: patience runs out -> 愤怒离店 ----
    await sim(page, 4);
    const g2 = await seatGuest(page, 'mushroom');
    const angry0 = (await state(page)).angry;
    await clearPopups(page);
    await keepPatient(page);
    await raf2(page);   // let the render loop lay out the guest's bubble first
    await page.evaluate(() => window.__test.setPatience(0.01));
    const pw = await page.evaluate((src) => {
      for (let i = 0; i < 400; i++) {
        window.__test.tick(0.05, 1);
        if (window.__test.state().angry > 0 && document.querySelector('#bbq-popups .popup')) return eval(src);
      }
      return null;
    }, PROBE_SRC);
    s = await state(page);
    assert.ok(s.angry > angry0, `${tag} warn) angry ${angry0} -> ${s.angry} did not grow (guest ${g2.id})`);
    assert.ok(pw, `${tag} warn) no popup on the angry frame`);
    assert.ok(/愤怒离店|-1/.test(pw.text), `${tag} warn) text "${pw.text}"`);
    assert.ok(pw.kind.includes('warn'), `${tag} warn) kind ${pw.kind}`);
    assert.ok(pw.bubbles.length >= 1, `${tag} warn) no .bubble in DOM — overlap check would be vacuous`);
    const gapW = assertBirth(`${tag} warn)`, pw);
    const nW = await dwell(`${tag} warn)`, page);
    console.log(`PASS ${tag} warn)  angry ${angry0}->${s.angry} "${pw.text}" opacity=${pw.opacity} font=${pw.fontPx}px box=${pw.box.w.toFixed(0)}x${pw.box.h.toFixed(0)} 距锚点=${gapW.toFixed(0)}px bubbles=${pw.bubbles.length} 驻留>=1.6s(${nW} 采样) 随后移除`);

    const calls = (await state(page)).calls;
    assert.equal(errors.length, 0, `${tag} js errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 JS error；INFO draw calls=${calls}`);
  } finally {
    await close();
  }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  await runViewport('竖屏 390x844', { width: 390, height: 844 });
  await runViewport('横屏 844x390', { width: 844, height: 390 });
}
console.log('POPUP OK');
