// E2E: B-047 + B-079 + B-084 — floating popups visibility, 4-edge viewport safe clamping,
// live topbar clearance, bubble/popup zero-overlap avoidance, off-screen anchor clamping.
//   1) B-047: on insert opacity === 1, font-size >= 22px, box h >= 1.2*fs, box w >= chars*fs*0.55,
//      lives >= 1.6s, animation 2.2s bbq-popup-hold, removed naturally
//   2) B-079 + B-084: all visible .popup stay within [8, vw-8] x [topbarBottom+8, vh-8],
//      zero intersection area with #bbq-hud .topbar, every #bbq-bubbles .bubble, and every other .popup
//   3) 3 seated customers lose patience simultaneously -> angry grows, within 0.5s .popup count >= 1 (all 3),
//      all safe & pairwise disjoint; captures e2e/shots/popup-{port,land}-clamp.png
//   4) anchor moved off top edge (center, left, right) -> popup stays in viewport on matching side with intact text (no ellipsis)
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ E2E_RUNS=3 node e2e/popup.mjs

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
    await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
    const cdp = await page.context().newCDPSession(page);
    const close = async () => { await cdp.detach().catch(() => {}); await page.close().catch(() => {}); await browser.close().catch(() => {}); };
    return { page, cdp, errors, close };
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
const atTable = (page, id) => page.evaluate((i) => { window.__test.teleportToTable(i); window.__test.tick(0.05, 2); }, id);
const press = (page, n = 1) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n);
const keepPatient = (page) => page.evaluate(() => window.__test.setPatience(600));
const clearPopups = (page) => page.evaluate(() => document.querySelectorAll('#bbq-popups .popup').forEach((p) => p.remove()));

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

async function seatThreeGuests(page) {
  const seated = await page.evaluate(() => {
    window.__test.start();
    window.__test.pauseSpawns(true);
    const ok = [
      window.__test.spawnNow('pork'),
      window.__test.spawnNow('mushroom'),
      window.__test.spawnNow('mixian'),
    ];
    if (!ok.every(Boolean)) return [];
    for (let i = 0; i < 400; i++) {
      window.__test.setPatience(600);
      window.__test.tick(0.05, 1);
      const list = window.__test.state().customers.filter((c) => c.phase === 'seated');
      if (list.length === 3) return list;
    }
    return window.__test.state().customers.filter((c) => c.phase === 'seated');
  });
  assert.equal(seated.length, 3, `expected 3 seated guests, got ${seated.length}`);
  return seated;
}

/** page-side full snapshot of all popups, bubbles, and live .topbar */
const SNAP_SRC = `(() => {
  const rect = (n) => {
    const r = n.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
  };
  const tb = document.querySelector('#bbq-hud .topbar');
  const popups = [...document.querySelectorAll('#bbq-popups .popup')].map((e) => {
    const cs = getComputedStyle(e);
    return {
      text: e.textContent ?? '',
      kind: e.className,
      opacity: cs.opacity,
      animDur: cs.animationDuration,
      animName: cs.animationName,
      fontPx: parseFloat(cs.fontSize),
      scrollW: e.scrollWidth,
      clientW: e.clientWidth,
      box: rect(e),
      ax: Number(e.dataset.ax),
      ay: Number(e.dataset.ay),
      t0: Number(e.dataset.t0),
    };
  });
  const bubbles = [...document.querySelectorAll('#bbq-bubbles .bubble')].map(rect).filter((b) => b.w > 0 && b.h > 0);
  return {
    popups,
    bubbles,
    topbar: tb ? rect(tb) : null,
    layerText: document.querySelector('#bbq-popups')?.textContent ?? '',
    vp: { w: innerWidth, h: innerHeight },
  };
})()`;

const interArea = (a, b) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

function assertAllPopupsSafe(tag, snap, { checkOpacity = true } = {}) {
  assert.ok(snap.topbar && snap.topbar.h > 0, `${tag} #bbq-hud .topbar missing or zero height`);
  const topSafe = snap.topbar.bottom + 8;
  assert.ok(snap.popups.length >= 1, `${tag} expected >=1 visible popup, got 0`);
  for (let i = 0; i < snap.popups.length; i++) {
    const p = snap.popups[i];
    const id = `${tag} popup[${i}] "${p.text}"`;
    if (checkOpacity) assert.equal(p.opacity, '1', `${id} opacity=${p.opacity} (expected 1)`);
    assert.ok(p.fontPx >= 22, `${id} font-size ${p.fontPx} < 22`);
    assert.equal(p.animDur, '2.2s', `${id} animationDuration=${p.animDur} (expected 2.2s)`);
    assert.ok(p.animName.includes('bbq-popup-hold'), `${id} animationName=${p.animName}`);
    assert.ok(p.box.h >= 1.2 * p.fontPx, `${id} box h ${p.box.h} < 1.2*${p.fontPx}`);
    const chars = [...p.text].length;
    assert.ok(p.box.w >= chars * p.fontPx * 0.55, `${id} box w ${p.box.w} < ${chars}*${p.fontPx}*0.55`);
    assert.ok(!/[…\u2026]|\.\.\./.test(p.text), `${id} contains ellipsis: "${p.text}"`);
    assert.ok(p.scrollW <= p.clientW + 1, `${id} text clipped inside box: scrollW=${p.scrollW} > clientW=${p.clientW}`);

    // 4-edge viewport safe bounds (measured from live #bbq-hud .topbar)
    assert.ok(p.box.left >= 8, `${id} left=${p.box.left.toFixed(2)} < 8`);
    assert.ok(p.box.right <= snap.vp.w - 8, `${id} right=${p.box.right.toFixed(2)} > vw-8 (${snap.vp.w - 8})`);
    assert.ok(p.box.top >= topSafe, `${id} top=${p.box.top.toFixed(2)} < topbarBottom+8 (${topSafe.toFixed(2)})`);
    assert.ok(p.box.bottom <= snap.vp.h - 8, `${id} bottom=${p.box.bottom.toFixed(2)} > vh-8 (${snap.vp.h - 8})`);

    // 0 intersection area with topbar and every bubble
    const tbOv = interArea(p.box, snap.topbar);
    assert.equal(tbOv, 0, `${id} overlaps .topbar by ${tbOv.toFixed(1)}px²: popup=${JSON.stringify(p.box)} topbar=${JSON.stringify(snap.topbar)}`);
    for (let bi = 0; bi < snap.bubbles.length; bi++) {
      const b = snap.bubbles[bi];
      const bOv = interArea(p.box, b);
      assert.equal(bOv, 0, `${id} overlaps bubble[${bi}] by ${bOv.toFixed(1)}px²: popup=${JSON.stringify(p.box)} bubble=${JSON.stringify(b)}`);
    }
  }
  // pairwise 0 intersection area among popups
  for (let i = 0; i < snap.popups.length; i++) {
    for (let j = i + 1; j < snap.popups.length; j++) {
      const pOv = interArea(snap.popups[i].box, snap.popups[j].box);
      assert.equal(pOv, 0, `${tag} popup[${i}] overlaps popup[${j}] by ${pOv.toFixed(1)}px²: ${JSON.stringify(snap.popups[i].box)} vs ${JSON.stringify(snap.popups[j].box)}`);
    }
  }
  return topSafe;
}

function assertSingleBirth(tag, snap) {
  const topSafe = assertAllPopupsSafe(tag, snap);
  const p = snap.popups[snap.popups.length - 1];
  const gap = p.ay - p.box.bottom;
  // When the anchor has headroom above the topbar safe line, B-047 lift >= 40px still holds;
  // when clamped by the topbar safe line (e.g. landscape t1), top >= topSafe takes precedence.
  const hasHeadroom = p.ay - 44 - p.box.h >= topSafe;
  if (hasHeadroom) {
    assert.ok(gap >= 40, `${tag} bottom edge only ${gap.toFixed(1)}px above anchor y (need >= 40)`);
  }
  return { p, gap, topSafe, clampedTop: !hasHeadroom };
}

/** page-side, same evaluate as the trigger (no polling, no busy loop) */
const OBSERVE_SRC = `(async (e) => {
  const birth = Number(e.dataset.t0);
  const w = (window.__watch = { e, removedAt: null, midOpacity: null, midT: null });
  const mo = new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.removedNodes) if (n === e && w.removedAt === null) { w.removedAt = performance.now() - birth; mo.disconnect(); }
  });
  mo.observe(document.querySelector('#bbq-popups'), { subtree: true, childList: true });
  setTimeout(() => { w.midT = performance.now() - birth; if (e.isConnected && w.midT < 1300) w.midOpacity = getComputedStyle(e).opacity; }, 800);
  await new Promise((r) => setTimeout(r, 2600));
  return { removedAt: w.removedAt, midOpacity: w.midOpacity, midT: w.midT };
})`;

async function assertLife(tag, page, p0, o) {
  const gone = await page.waitForFunction(() => document.querySelectorAll('#bbq-popups .popup').length === 0, null, { polling: 250, timeout: 10000 }).then(() => true, () => false);
  if (!gone) {
    const left = await page.evaluate(() => [...document.querySelectorAll('#bbq-popups .popup')].map((n) => `${n.className}:"${n.textContent}" age=${Math.round(performance.now() - Number(n.dataset.t0))}ms`));
    assert.fail(`${tag} popup never removed (still in #bbq-popups 10s after the 2.6s wait): ${left.join(' | ')}`);
  }
  const fin = await page.evaluate(() => ({ life: window.__watch.e.dataset.life, removedAt: window.__watch.removedAt, midOpacity: window.__watch.midOpacity, midT: window.__watch.midT }));
  const life = fin.life === undefined ? NaN : Number(fin.life);
  assert.ok(life >= 1600, `${tag} dataset.life=${fin.life} (< 1600ms)`);
  const removedAt = fin.removedAt ?? o.removedAt;
  if (removedAt !== null) assert.ok(removedAt >= 1600, `${tag} removedAt=${removedAt.toFixed(0)}ms (< 1600ms)`);
  const mid = fin.midOpacity ?? o.midOpacity;
  let evidence;
  if (mid !== null) { assert.equal(mid, '1', `${tag} opacity at ~${fin.midT?.toFixed(0)}ms = ${mid}`); evidence = `midOpacity=1@${fin.midT.toFixed(0)}ms`; }
  else { assert.equal(p0.animDur, '2.2s', `${tag} midOpacity unreadable and animation-duration=${p0.animDur}`); evidence = `midOpacity=null 改用 animation-duration=${p0.animDur}`; }
  console.log(`INFO ${tag} life=${life}ms removedAt=${removedAt === null ? 'n/a' : removedAt.toFixed(0) + 'ms'} ${evidence}`);
  return { life, evidence };
}

const runViewport = (tag, shortTag, viewport, captureShot) =>
  withRetry(tag, () => runViewportOnce(tag, shortTag, viewport, captureShot));

async function runViewportOnce(tag, shortTag, viewport, captureShot) {
  const { page, cdp, errors, close } = await open(BASE, viewport);
  try {
    // ---- 1) money: serve a correct dish (B-047 + B-079) ----
    const guest = await seatGuest(page, 'pork');
    await keepPatient(page);
    await makePlatedPork(page);
    await keepPatient(page);
    await atTable(page, guest.table);
    let s = await state(page);
    assert.equal(s.action, 'serve', `${tag} money) action should be serve, got ${s.action}`);
    const money0 = s.money;
    await clearPopups(page);
    await raf2(page);
    const { snap: sm, o: om } = await page.evaluate(async ({ src, observeSrc }) => {
      window.__test.press(); window.__test.tick(0.05, 2);
      const snap = eval(src);
      const list = document.querySelectorAll('#bbq-popups .popup');
      const o = list.length ? await eval(observeSrc)(list[list.length - 1]) : null;
      return { snap, o };
    }, { src: SNAP_SRC, observeSrc: OBSERVE_SRC });
    s = await state(page);
    assert.ok(s.money > money0, `${tag} money) ${money0} -> ${s.money} did not grow`);
    assert.ok(sm.layerText.includes('+¥'), `${tag} money) #bbq-popups text lacks "+¥": ${sm.layerText}`);
    assert.ok(sm.bubbles.length >= 1, `${tag} money) no .bubble in DOM — overlap check would be vacuous`);
    const { p: pm, gap: gapM, topSafe: tsM, clampedTop: clM } = assertSingleBirth(`${tag} money)`, sm);
    assert.equal(pm.text, `+¥${s.money - money0}`, `${tag} money) popup text "${pm.text}" vs gain ${s.money - money0}`);
    assert.ok(pm.kind.includes('money'), `${tag} money) kind ${pm.kind}`);
    assert.ok(om, `${tag} money) no popup to observe`);
    const lM = await assertLife(`${tag} money)`, page, pm, om);
    console.log(`PASS ${tag} money) ¥${money0}->¥${s.money} "${pm.text}" top=${pm.box.top.toFixed(1)}(>=${tsM.toFixed(1)}) box=${pm.box.w.toFixed(0)}x${pm.box.h.toFixed(0)} ${clM ? '顶栏安全钳制' : `距锚点=${gapM.toFixed(0)}px`} bubbles=${sm.bubbles.length} 寿命=${lM.life}ms`);

    // ---- 2) warn: single patience runs out -> 愤怒离店 (B-047 + B-079) ----
    await sim(page, 4);
    const g2 = await seatGuest(page, 'mushroom');
    const angry0 = (await state(page)).angry;
    await clearPopups(page);
    await keepPatient(page);
    await raf2(page);
    await page.evaluate(() => window.__test.setPatience(0.01));
    const { snap: sw, o: ow } = await page.evaluate(async ({ src, observeSrc }) => {
      for (let i = 0; i < 400; i++) {
        window.__test.tick(0.05, 1);
        if (window.__test.state().angry > 0 && document.querySelector('#bbq-popups .popup')) {
          const snap = eval(src);
          const list = document.querySelectorAll('#bbq-popups .popup');
          return { snap, o: await eval(observeSrc)(list[list.length - 1]) };
        }
      }
      return { snap: null, o: null };
    }, { src: SNAP_SRC, observeSrc: OBSERVE_SRC });
    s = await state(page);
    assert.ok(s.angry > angry0, `${tag} warn) angry ${angry0} -> ${s.angry} did not grow (guest ${g2.id})`);
    assert.ok(sw, `${tag} warn) no popup on the angry frame`);
    assert.ok(sw.bubbles.length >= 1, `${tag} warn) no .bubble in DOM — overlap check would be vacuous`);
    const { p: pw, gap: gapW, topSafe: tsW, clampedTop: clW } = assertSingleBirth(`${tag} warn)`, sw);
    assert.ok(/愤怒离店|-1/.test(pw.text), `${tag} warn) text "${pw.text}"`);
    assert.ok(pw.kind.includes('warn'), `${tag} warn) kind ${pw.kind}`);
    assert.ok(ow, `${tag} warn) no popup to observe`);
    const lW = await assertLife(`${tag} warn)`, page, pw, ow);
    console.log(`PASS ${tag} warn)  angry ${angry0}->${s.angry} "${pw.text}" top=${pw.box.top.toFixed(1)}(>=${tsW.toFixed(1)}) box=${pw.box.w.toFixed(0)}x${pw.box.h.toFixed(0)} ${clW ? '顶栏安全钳制' : `距锚点=${gapW.toFixed(0)}px`} bubbles=${sw.bubbles.length} 寿命=${lW.life}ms`);

    // ---- 3) 3 seated customers simultaneously lose patience (B-084 + B-059 + screenshot) ----
    await seatThreeGuests(page);
    await clearPopups(page);
    await raf2(page); // lay out all 3 customer bubbles before triggering
    const tri = await page.evaluate(async ({ src }) => {
      const a0 = window.__test.state().angry;
      window.__test.setPatience(0.01);
      let tAngry = null;
      let snap0 = null;
      for (let i = 0; i < 400; i++) {
        window.__test.tick(0.05, 1);
        if (window.__test.state().angry >= a0 + 3) {
          tAngry = performance.now();
          snap0 = eval(src);
          break;
        }
      }
      if (!snap0) return { a0, a1: window.__test.state().angry, snap0: null, snapMid: null, dt0: Infinity, dtMid: Infinity };
      const dt0 = performance.now() - tAngry;
      // verify popup remains present & valid within 0.5s after angry increment
      await new Promise((r) => setTimeout(r, 100));
      const dtMid = performance.now() - tAngry;
      const snapMid = eval(src);
      return { a0, a1: window.__test.state().angry, snap0, snapMid, dt0, dtMid };
    }, { src: SNAP_SRC });

    assert.equal(tri.a1, tri.a0 + 3, `${tag} 3-angry) expected angry ${tri.a0}->${tri.a0 + 3}, got ${tri.a1}`);
    assert.ok(tri.snap0, `${tag} 3-angry) no snapshot captured`);
    assert.ok(tri.dt0 <= 500, `${tag} 3-angry) t0 elapsed ${tri.dt0.toFixed(0)}ms > 500ms`);
    assert.ok(tri.dtMid <= 500, `${tag} 3-angry) mid elapsed ${tri.dtMid.toFixed(0)}ms > 500ms`);
    assert.equal(tri.snap0.popups.length, 3, `${tag} 3-angry) expected 3 popups on trigger frame, got ${tri.snap0.popups.length}`);
    assert.ok(tri.snap0.bubbles.length >= 1, `${tag} 3-angry) expected >=1 bubble on trigger frame for non-vacuous overlap check`);
    const ts3 = assertAllPopupsSafe(`${tag} 3-angry@0ms)`, tri.snap0);
    for (const p of tri.snap0.popups) assert.equal(p.text, '愤怒离店', `${tag} 3-angry) unexpected text "${p.text}"`);
    assert.ok(tri.snapMid.popups.length >= 1, `${tag} 3-angry@100ms) popups disappeared within 0.5s`);
    assertAllPopupsSafe(`${tag} 3-angry@100ms)`, tri.snapMid);

    // Let WebGL + DOM paint one fresh frame while popups are visible, then capture immediately via CDP
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const snapShot = await page.evaluate(SNAP_SRC);
    assert.ok(snapShot.popups.length >= 1, `${tag} 3-angry@shot) popups missing at screenshot time`);
    assertAllPopupsSafe(`${tag} 3-angry@shot)`, snapShot, { checkOpacity: false });
    for (const p of snapShot.popups) {
      assert.ok(parseFloat(p.opacity) >= 0.85, `${tag} 3-angry@shot) popup opacity faded to ${p.opacity} before capture`);
    }
    if (captureShot) {
      const shotPath = `e2e/shots/popup-${shortTag}-clamp.png`;
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const buf = Buffer.from(data, 'base64');
      assert.ok(buf.length > 5000, `${tag} 3-angry@shot) screenshot buffer too small (${buf.length}B)`);
      writeFileSync(shotPath, buf);
      console.log(`SHOT ${shotPath} (${buf.length}B) popups=${snapShot.popups.length} opacities=${snapShot.popups.map((p) => p.opacity).join(',')} topSafe=${ts3.toFixed(1)}`);
    }
    console.log(`PASS ${tag} 3-angry) 3/3 愤怒离店 dt0=${tri.dt0.toFixed(0)}ms dtMid=${tri.dtMid.toFixed(0)}ms bubbles=${tri.snap0.bubbles.length} coords=${tri.snap0.popups.map((p) => `[${p.box.left.toFixed(0)},${p.box.top.toFixed(0)}..${p.box.right.toFixed(0)},${p.box.bottom.toFixed(0)}]`).join(' ')}`);

    // ---- 4) Anchor explicitly moved above viewport top edge (+ off-left & off-right corners) ----
    const gOff = await seatThreeGuests(page);
    const moved = await page.evaluate((ids) => {
      const targets = [
        { id: ids[0], x: 0, z: -18 },
        { id: ids[1], x: -18, z: -18 },
        { id: ids[2], x: 18, z: -18 },
      ];
      return targets.map((t) => ({
        ok: window.__test.moveCustomer(t.id, t.x, t.z),
        scr: window.__test.worldToScreen(t.x, 1.2, t.z),
      }));
    }, gOff.map((g) => g.id));
    for (const m of moved) {
      assert.equal(m.ok, true, `${tag} off-top) moveCustomer failed`);
      assert.ok(m.scr.y < -20, `${tag} off-top) expected anchor above viewport (y < -20), got y=${m.scr.y.toFixed(1)}`);
    }
    assert.ok(moved[1].scr.x < 0, `${tag} off-top) expected left anchor x < 0, got ${moved[1].scr.x.toFixed(1)}`);
    assert.ok(moved[2].scr.x > viewport.width, `${tag} off-top) expected right anchor x > ${viewport.width}, got ${moved[2].scr.x.toFixed(1)}`);

    await clearPopups(page);
    await raf2(page);
    const offRes = await page.evaluate(({ src }) => {
      const a0 = window.__test.state().angry;
      window.__test.setPatience(0.01);
      for (let i = 0; i < 400; i++) {
        window.__test.tick(0.05, 1);
        if (window.__test.state().angry >= a0 + 3) {
          return { a0, a1: window.__test.state().angry, snap: eval(src) };
        }
      }
      return { a0, a1: window.__test.state().angry, snap: null };
    }, { src: SNAP_SRC });
    assert.equal(offRes.a1, offRes.a0 + 3, `${tag} off-top) expected angry +3`);
    assert.ok(offRes.snap, `${tag} off-top) no snapshot`);
    assert.equal(offRes.snap.popups.length, 3, `${tag} off-top) expected all 3 off-screen popups clamped inside viewport, got ${offRes.snap.popups.length}`);
    assertAllPopupsSafe(`${tag} off-top)`, offRes.snap);
    for (const p of offRes.snap.popups) {
      assert.ok(p.ay < 0, `${tag} off-top) expected anchor ay < 0, got ${p.ay.toFixed(1)}`);
      assert.equal(p.text, '愤怒离店', `${tag} off-top) text corrupted: "${p.text}"`);
      assert.equal([...p.text].length, 4, `${tag} off-top) text length changed: ${[...p.text].length}`);
    }
    const leftClamped = offRes.snap.popups.find((p) => p.ax < 0);
    const rightClamped = offRes.snap.popups.find((p) => p.ax > viewport.width);
    assert.ok(leftClamped, `${tag} off-top) missing off-left popup`);
    assert.ok(rightClamped, `${tag} off-top) missing off-right popup`);
    assert.ok(leftClamped.box.left < viewport.width / 2, `${tag} off-top) off-left popup not on left side: left=${leftClamped.box.left.toFixed(1)}`);
    assert.ok(rightClamped.box.right > viewport.width / 2, `${tag} off-top) off-right popup not on right side: right=${rightClamped.box.right.toFixed(1)}`);
    console.log(`PASS ${tag} off-top) 3/3 off-viewport anchors clamped inside safe zone with intact "愤怒离店": ${offRes.snap.popups.map((p) => `ax=${p.ax.toFixed(0)},ay=${p.ay.toFixed(0)}->[${p.box.left.toFixed(0)},${p.box.top.toFixed(0)}..${p.box.right.toFixed(0)},${p.box.bottom.toFixed(0)}]`).join(' | ')}`);

    const calls = (await state(page)).calls;
    assert.equal(errors.length, 0, `${tag} js errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 JS error；INFO draw calls=${calls}`);
  } finally {
    await close();
  }
}

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  const capture = run === 1;
  if (!ONLY || ONLY === 'portrait') await runViewport('竖屏 390x844', 'port', { width: 390, height: 844 }, capture);
  if (!ONLY || ONLY === 'landscape') await runViewport('横屏 844x390', 'land', { width: 844, height: 390 }, capture);
}
console.log('POPUP OK');
