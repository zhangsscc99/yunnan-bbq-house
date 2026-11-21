// E2E: B-090 — edge-pinned off-screen hint for the action key's「去 X」target.
//   0) start panel up -> [data-offscreen-hint] absent or display:none
//   1) stand at the grill use cell, burn a pork skewer and take it off -> button "去垃圾桶", bin projects
//      off-screen -> exactly one visible [data-offscreen-hint]: text has 垃圾桶, >= 44px box, >= 13px type,
//      pointer-events:none, dataset.dir matches the overflow side, <= 12px from that edge, below the
//      live .topbar, 0 intersection area with #bbq-stick / #bbq-act
//   2) walk until the bin is on screen (still "去垃圾桶", out of reach) -> within 300ms display:none
//   3) back to the grill -> hint returns
//   4) 0 pageerror / 0 console.error
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ E2E_RUNS=3 [E2E_SHOTS=1] node e2e/offscreen.mjs

const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Number(process.env.E2E_RUNS ?? 1);
const ONLY = process.env.E2E_ONLY;
const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError) && /has been closed|Target page|Target closed|browser.*closed|crash/i.test(String(e?.message ?? e));
mkdirSync('e2e/shots', { recursive: true });

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
    const close = async () => { await page.close().catch(() => {}); await browser.close().catch(() => {}); };
    return { page, errors, close };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

function fail(label, e, why) {
  console.error(`FAIL ${label}: ${why}\n${String(e?.message ?? e)}`);
  process.exit(1);
}

async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!isEnvCrash(e)) fail(label, e, 'assertion/script error (not retried)');
      if (attempt >= MAX_RETRIES) fail(label, e, `environment crash persisted after ${MAX_RETRIES} retries`);
      console.log(`RETRY ${label}: environment crash (${String(e.message).split('\n')[0]}) — retry ${attempt + 1}/${MAX_RETRIES}`);
    }
  }
}

const sim = (page, sec) => page.evaluate((s) => window.__test.tick(0.05, Math.ceil(s / 0.05)), sec);
const state = (page) => page.evaluate(() => window.__test.state());
const raf2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const at = (page, id) => page.evaluate((i) => { window.__test.teleportToStation(i); window.__test.tick(0.05, 2); }, id);
const press = (page, n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n);

const interArea = (a, b) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** page-side snapshot: hint nodes, controls, topbar, current guide target + its projection */
const SNAP_SRC = `(() => {
  const rect = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
  const hints = [...document.querySelectorAll('[data-offscreen-hint]')].map((e) => {
    const cs = getComputedStyle(e);
    return {
      display: e.style.display, csDisplay: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      pe: cs.pointerEvents, fontPx: parseFloat(cs.fontSize), dir: e.dataset.dir ?? '', text: (e.textContent ?? '').trim(),
      hasSvg: !!e.querySelector('svg'), box: rect(e),
    };
  });
  const g = window.__test.guideTarget();
  return {
    hints, guide: g,
    tgt: g ? window.__test.worldToScreen(g.x, g.y, g.z) : null,
    stick: rect(document.querySelector('#bbq-stick')),
    act: rect(document.querySelector('#bbq-act')),
    topbar: rect(document.querySelector('#bbq-hud .topbar')),
    panel: !!document.querySelector('.bbq-panel'),
    vp: { w: innerWidth, h: innerHeight },
  };
})()`;
const snap = (page) => page.evaluate(SNAP_SRC);
const visible = (h) => !!h && h.display !== 'none' && h.csDisplay !== 'none' && h.visibility !== 'hidden' && Number(h.opacity) > 0 && h.box.w > 0 && h.box.h > 0;
const offDirs = (p, vp) => [p.x < 0 && 'left', p.x > vp.w && 'right', p.y < 0 && 'up', p.y > vp.h && 'down'].filter(Boolean);
/** evidence screenshot via CDP (swiftshader frames can take seconds; never fails the run) */
async function capture(page, path) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await Promise.race([
      cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('capture timeout')), 20000)),
    ]);
    await cdp.detach().catch(() => {});
    const buf = Buffer.from(data, 'base64');
    writeFileSync(path, buf);
    console.log(`SHOT ${path} (${buf.length}B)`);
  } catch (e) {
    console.log(`INFO screenshot skipped (${String(e?.message ?? e).split('\n')[0]})`);
  }
}
const fmt = (b) => `[${b.left.toFixed(0)},${b.top.toFixed(0)}..${b.right.toFixed(0)},${b.bottom.toFixed(0)}]`;

function assertHint(tag, s, text) {
  assert.equal(s.hints.length, 1, `${tag} expected exactly 1 [data-offscreen-hint] node, got ${s.hints.length}`);
  const h = s.hints[0];
  assert.ok(s.guide && s.tgt, `${tag} not in a「去 X」state (guideTarget null)`);
  const okDirs = offDirs(s.tgt, s.vp);
  assert.ok(okDirs.length, `${tag} premise: target should project off-screen, got ${JSON.stringify(s.tgt)}`);
  assert.ok(visible(h), `${tag} hint not visible: ${JSON.stringify(h)}`);
  assert.ok(h.text.includes(text), `${tag} hint text "${h.text}" lacks ${text}`);
  assert.equal(h.text, s.guide.label, `${tag} hint text "${h.text}" != target label "${s.guide.label}"`);
  assert.ok(h.hasSvg, `${tag} hint has no arrow glyph`);
  assert.equal(h.pe, 'none', `${tag} pointer-events=${h.pe}`);
  assert.ok(h.fontPx >= 13, `${tag} font-size ${h.fontPx} < 13`);
  assert.ok(h.box.w >= 44 && h.box.h >= 44, `${tag} box ${h.box.w}x${h.box.h} < 44`);
  assert.ok(okDirs.includes(h.dir), `${tag} dataset.dir=${h.dir} but target overflows ${okDirs.join('/')} (tgt=${s.tgt.x.toFixed(0)},${s.tgt.y.toFixed(0)})`);
  const edgeGap = h.dir === 'left' ? h.box.left : h.dir === 'right' ? s.vp.w - h.box.right : h.dir === 'down' ? s.vp.h - h.box.bottom : h.box.top - s.topbar.bottom;
  assert.ok(edgeGap >= 0 && edgeGap <= 12, `${tag} ${h.dir} edge gap ${edgeGap.toFixed(1)}px not in [0,12]`);
  assert.ok(h.box.left >= 0 && h.box.right <= s.vp.w && h.box.bottom <= s.vp.h, `${tag} hint leaves viewport: ${JSON.stringify(h.box)}`);
  assert.ok(h.box.top >= s.topbar.bottom, `${tag} hint top ${h.box.top.toFixed(1)} above topbar bottom ${s.topbar.bottom.toFixed(1)}`);
  assert.ok(s.stick.w > 0 && s.act.w > 0, `${tag} controls hidden — overlap check would be vacuous`);
  const ovS = interArea(h.box, s.stick);
  const ovA = interArea(h.box, s.act);
  assert.equal(ovS, 0, `${tag} hint overlaps #bbq-stick by ${ovS.toFixed(1)}px²: ${JSON.stringify(h.box)} vs ${JSON.stringify(s.stick)}`);
  assert.equal(ovA, 0, `${tag} hint overlaps #bbq-act by ${ovA.toFixed(1)}px²: ${JSON.stringify(h.box)} vs ${JSON.stringify(s.act)}`);
  return h;
}

/** page-side: first candidate spot where the action key is in its「去 X」state for `text` and the target is off/in frame */
const findSpot = (page, cands, text, mode) => page.evaluate(({ cands, text, mode }) => {
  const vw = innerWidth; const vh = innerHeight; const M = 16;
  const st0 = window.__test.state();
  const back = { x: st0.player.x, z: st0.player.z };
  let hit = null;
  for (const c of cands) {
    window.__test.teleport(c.x, c.z); window.__test.setPatience(600); window.__test.tick(0.05, 2);
    const st = window.__test.state();
    if (Math.abs(st.player.x - c.x) > 0.01 || Math.abs(st.player.z - c.z) > 0.01) continue; // not walkable
    const g = window.__test.guideTarget();
    if (st.action !== 'none' || !g || !g.label.includes(text)) continue;
    const p = window.__test.worldToScreen(g.x, g.y, g.z);
    const off = p.x < 0 || p.x > vw || p.y < 0 || p.y > vh;
    const inside = p.x >= M && p.x <= vw - M && p.y >= M && p.y <= vh - M;
    if (mode === 'off' ? off : inside) { hit = { x: c.x, z: c.z }; break; }
  }
  window.__test.teleport(back.x, back.z); window.__test.tick(0.05, 2);
  return hit ? { ...hit, back } : null;
}, { cands, text, mode });

const line = (x0, z0, x1, z1, step = 0.25) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n }));
};

/** target comes on screen (still「去 X」, out of reach) -> display:none at once and still none 300ms later */
async function assertHidesInFrame(tag, page, spot, text) {
  const r0 = await page.evaluate(({ x, z }) => {
    window.__test.teleport(x, z); window.__test.setPatience(600); window.__test.tick(0.05, 1);
    return { display: document.querySelector('[data-offscreen-hint]').style.display, t0: performance.now() };
  }, spot);
  await page.waitForTimeout(300);
  const r = await page.evaluate((t0) => ({ display: document.querySelector('[data-offscreen-hint]').style.display, dt: performance.now() - t0 }), r0.t0);
  const s = await snap(page);
  const st = await state(page);
  assert.equal(st.action, 'none', `${tag} in-frame) action=${st.action} — expected still the「去 X」state`);
  assert.ok(s.guide?.label.includes(text), `${tag} in-frame) guide target ${JSON.stringify(s.guide)}`);
  assert.equal(offDirs(s.tgt, s.vp).length, 0, `${tag} in-frame) target still off-screen: ${JSON.stringify(s.tgt)}`);
  assert.equal(r.display, 'none', `${tag} in-frame) display=${r.display} ${r.dt.toFixed(0)}ms after the target came on screen`);
  assert.ok(s.hints.every((h) => !visible(h)), `${tag} in-frame) hint still visible`);
  console.log(`PASS ${tag} in-frame) (${spot.x.toFixed(2)},${spot.z.toFixed(2)}) ${s.guide.label}=(${s.tgt.x.toFixed(0)},${s.tgt.y.toFixed(0)}) "${st.actionLabel}" → display=${r0.display}@0ms, ${r.display}@${r.dt.toFixed(0)}ms`);
  await page.evaluate(({ back }) => { window.__test.teleport(back.x, back.z); window.__test.setPatience(600); window.__test.tick(0.05, 2); }, spot);
  await raf2(page);
  const h = assertHint(`${tag} back)`, await snap(page), text);
  console.log(`PASS ${tag} back) 回到 (${spot.back.x.toFixed(2)},${spot.back.z.toFixed(2)}) 指引恢复 dir=${h.dir}`);
}

async function makeBurntPork(page) {
  await at(page, 'crate-pork'); await press(page);
  await at(page, 'chop'); await press(page, 1 + 3 + 1);
  await at(page, 'grill'); await press(page);
  await sim(page, 12.6);
  let s = await state(page);
  assert.equal(s.grill.find(Boolean)?.stage, 'waste', `skewer not burnt: ${JSON.stringify(s.grill)}`);
  await press(page);
  s = await state(page);
  assert.deepEqual(s.carrying, { dish: 'pork', stage: 'waste' }, `expected burnt pork in hand, got ${JSON.stringify(s.carrying)}`);
  return s;
}

async function makePlatedPork(page) {
  await at(page, 'crate-pork'); await press(page);
  await at(page, 'chop'); await press(page, 1 + 3 + 1);
  await at(page, 'grill'); await press(page); await sim(page, 6.5); await press(page);
  await at(page, 'plate'); await press(page);
  const s = await state(page);
  assert.deepEqual(s.carrying, { dish: 'pork', stage: 'plated' }, `expected plated pork, got ${JSON.stringify(s.carrying)}`);
  return s;
}

const runViewport = (tag, shortTag, viewport, shot) => withRetry(tag, () => runViewportOnce(tag, shortTag, viewport, shot));

async function runViewportOnce(tag, shortTag, viewport, shot) {
  const portrait = viewport.width < viewport.height;
  const { page, errors, close } = await open(BASE, viewport);
  try {
    // ---- 0) start panel ----
    const s0 = await snap(page);
    assert.ok(s0.panel, `${tag} panel) start panel missing`);
    assert.ok(s0.hints.every((h) => !visible(h)), `${tag} panel) hint visible under the start panel: ${JSON.stringify(s0.hints)}`);
    console.log(`PASS ${tag} panel) 首屏面板在场，离屏指引 nodes=${s0.hints.length} 全部不可见`);

    await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });

    // ---- 1) grill use cell + burnt skewer -> "去垃圾桶" ----
    let s = await makeBurntPork(page);
    assert.equal(s.action, 'none', `${tag} grill) action=${s.action}`);
    assert.ok(s.actionLabel.includes('垃圾桶'), `${tag} grill) button label "${s.actionLabel}" lacks 垃圾桶`);
    await raf2(page);
    let sv = await snap(page);
    assert.equal(sv.guide?.label, '垃圾桶', `${tag} grill) guide target ${JSON.stringify(sv.guide)}`);
    if (portrait) {
      const h1 = assertHint(`${tag} grill)`, sv, '垃圾桶');
      assert.equal(h1.dir, 'left', `${tag} grill) dataset.dir=${h1.dir} (expected left)`);
      assert.ok(h1.box.left <= 12, `${tag} grill) rect.left=${h1.box.left} > 12`);
      if (shot && process.env.E2E_SHOTS) await capture(page, `e2e/shots/offscreen-${shortTag}-bin.png`);
      console.log(`PASS ${tag} grill) "${s.actionLabel}" bin=(${sv.tgt.x.toFixed(0)},${sv.tgt.y.toFixed(0)}) → hint dir=${h1.dir} "${h1.text}" ${fmt(h1.box)} ${h1.box.w.toFixed(0)}x${h1.box.h.toFixed(0)} ${h1.fontPx}px stick/act 交叠=0`);
      const spot = await findSpot(page, line(s.player.x, s.player.z, -5.5, s.player.z), '垃圾桶', 'in');
      assert.ok(spot, `${tag} in-frame) no out-of-reach spot with the bin on screen`);
      await assertHidesInFrame(tag, page, spot, '垃圾桶');
    } else {
      // landscape frames the whole 12m counter row: the bin is on screen, so no edge hint
      assert.equal(offDirs(sv.tgt, sv.vp).length, 0, `${tag} grill) expected bin on screen in landscape, got ${JSON.stringify(sv.tgt)}`);
      assert.ok(sv.hints.every((h) => !visible(h)), `${tag} grill) bin on screen but hint visible: ${JSON.stringify(sv.hints)}`);
      console.log(`PASS ${tag} grill) "${s.actionLabel}" bin 在画内 (${sv.tgt.x.toFixed(0)},${sv.tgt.y.toFixed(0)}) → 无离屏指引`);
    }

    // ---- 2) plated dish for a seated guest -> "送去客桌"; table off-screen from the counter row ----
    await at(page, 'bin'); await press(page);
    assert.equal((await state(page)).carrying, null, `${tag} could not bin the burnt skewer`);
    assert.equal(await page.evaluate(() => window.__test.spawnNow('pork')), true, `${tag} no free table`);
    let guest = null;
    for (let i = 0; i < 40 && !guest; i++) { await sim(page, 0.5); guest = (await state(page)).customers.find((c) => c.phase === 'seated'); }
    assert.ok(guest, `${tag} pork guest never seated`);
    await page.evaluate(() => window.__test.setPatience(600));
    s = await makePlatedPork(page);
    const useZ = s.player.z;
    const row = [...line(s.player.x, useZ, -5.5, useZ, 0.5), ...line(s.player.x, useZ, 5.5, useZ, 0.5)];
    const offT = await findSpot(page, row, '号桌', 'off');
    if (!portrait) assert.ok(offT, `${tag} table) no spot on the counter row with the guest table off-screen`);
    if (offT) {
      await page.evaluate(({ x, z }) => { window.__test.teleport(x, z); window.__test.setPatience(600); window.__test.tick(0.05, 2); }, offT);
      await raf2(page);
      sv = await snap(page);
      const st = await state(page);
      assert.ok(/客桌/.test(st.actionLabel), `${tag} table) button label "${st.actionLabel}"`);
      const h2 = assertHint(`${tag} table)`, sv, '号桌');
      if (shot && process.env.E2E_SHOTS) await capture(page, `e2e/shots/offscreen-${shortTag}-table.png`);
      console.log(`PASS ${tag} table) (${offT.x.toFixed(2)},${offT.z.toFixed(2)}) "${st.actionLabel}" ${sv.guide.label}=(${sv.tgt.x.toFixed(0)},${sv.tgt.y.toFixed(0)}) → hint dir=${h2.dir} "${h2.text}" ${fmt(h2.box)} stick=${fmt(sv.stick)} act=${fmt(sv.act)} 交叠=0/0`);
      const tu = st.tables[guest.table];
      // out-of-reach spots across the floor, nearest first, until the guest table is on screen
      const grid = [];
      for (let z = offT.z; z >= tu.z - 0.5; z -= 0.25) for (let x = -5.5; x <= 5.5; x += 0.25) grid.push({ x, z });
      grid.sort((a, b) => Math.hypot(a.x - offT.x, a.z - offT.z) - Math.hypot(b.x - offT.x, b.z - offT.z));
      const spot = await findSpot(page, grid, '号桌', 'in');
      assert.ok(spot, `${tag} table in-frame) no out-of-reach spot with the table on screen`);
      await assertHidesInFrame(`${tag} table`, page, spot, '号桌');
    } else {
      console.log(`INFO ${tag} table) 竖屏视高下客桌始终在画内，跳过客桌离屏分支`);
    }

    assert.equal(errors.length, 0, `${tag} js errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 pageerror / 0 console.error`);
  } finally {
    await close();
  }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  const shot = run === 1;
  if (!ONLY || ONLY === 'portrait') await runViewport('竖屏 390x844', 'port', { width: 390, height: 844 }, shot);
  if (!ONLY || ONLY === 'landscape') await runViewport('横屏 844x390', 'land', { width: 844, height: 390 }, shot);
}
console.log('OFFScreen OK');
