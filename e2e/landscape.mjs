// E2E: B-072 + B-076 — landscape 844×390 must show the whole counter row, and the order cards never shrink type.
// Per run, per viewport (landscape 844×390, portrait 390×844), fresh browser:
//  a) stations crate-pork / crate-mush / crate-mix / grill / plate, via __test.worldToScreen:
//     counter-top centre line (y = topY) + on-counter items (y = 1.0m) at y <= vh-96 and x in [0, vw];
//     whole counter box (front base / back top corners) inside the viewport.
//     landscape: all five at spawn and at every station's use cell; portrait: each station at its own use cell.
//  b) with 3 seated orders: #bbq-stick, each #bbq-orders .card, #bbq-act pairwise disjoint and inside the viewport;
//     cards clear of the topbar and the right edge; .card .nm / .pr computed font-size >= 13px, .tb-badge = 14px.
//  c) prints __perf.calls at spawn / grill / t2 (draw-call budget check against the pre-change build).
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ E2E_RUNS=3 node e2e/landscape.mjs   (last line: LANDSCAPE OK)

const { chromium } = await import('playwright');
const { mkdirSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 1));
const HUD_BAND = 96;
const ITEM_Y = 1.0;
const STATIONS = ['crate-pork', 'crate-mush', 'crate-mix', 'grill', 'plate'];
const ENV_CRASH = /has been closed|Target page|SharedImageManager|crash/i;
mkdirSync('e2e/shots', { recursive: true });

// in-page: project the check points of the requested stations
const PROBE = ([ids, itemY]) => {
  const geo = window.__test.stationGeom().filter((g) => ids.includes(g.id));
  const P = (x, y, z) => window.__test.worldToScreen(x, y, z);
  return geo.map((g) => {
    const xs = [g.x - g.w / 2 + 0.1, g.x, g.x + g.w / 2 - 0.1];
    const top = xs.flatMap((x) => [P(x, g.topY, g.z), P(x, itemY, g.z)]);
    const box = [-1, 1].flatMap((s) => [P(g.x + s * g.w / 2, 0, g.z + g.d / 2), P(g.x + s * g.w / 2, g.topY, g.z - g.d / 2)]);
    return { id: g.id, top, box };
  });
};

function checkStations(tag, pose, probe, vw, vh) {
  assert.ok(probe.length >= 1, `${tag}/${pose}: no stations probed`);
  let maxTopY = 0, maxBoxY = 0;
  for (const s of probe) {
    for (const p of s.top) {
      assert.ok(p.y <= vh - HUD_BAND, `${tag}/${pose}: ${s.id} counter-top/item y=${p.y.toFixed(1)} > vh-${HUD_BAND}=${vh - HUD_BAND}`);
      assert.ok(p.x >= 0 && p.x <= vw, `${tag}/${pose}: ${s.id} x=${p.x.toFixed(1)} outside [0,${vw}]`);
      assert.ok(p.y >= 0, `${tag}/${pose}: ${s.id} y=${p.y.toFixed(1)} above the viewport`);
      maxTopY = Math.max(maxTopY, p.y);
    }
    for (const p of s.box) {
      assert.ok(p.x >= 0 && p.x <= vw && p.y >= 0 && p.y <= vh,
        `${tag}/${pose}: ${s.id} counter corner (${p.x.toFixed(1)},${p.y.toFixed(1)}) outside ${vw}x${vh}`);
      maxBoxY = Math.max(maxBoxY, p.y);
    }
  }
  return { maxTopY, maxBoxY };
}

const HUD_PROBE = () => {
  const rect = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const cards = [...document.querySelectorAll('#bbq-orders .card')];
  const px = (e, sel) => parseFloat(getComputedStyle(e.querySelector(sel)).fontSize);
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    stickPresent: Boolean(document.querySelector('#bbq-stick')),
    actPresent: Boolean(document.querySelector('#bbq-act')),
    boxes: cards.map((c, i) => ({ tag: `.card[${i}:${c.dataset.table}]`, ...rect(c) })),
    topbar: rect(document.querySelector('#bbq-hud .topbar')),
    fonts: cards.map((c) => {
      const nm = c.querySelector('.nm');
      const pr = c.querySelector('.pr');
      return {
        nm: px(c, '.nm'), pr: px(c, '.pr'), badge: px(c, '.tb-badge'),
        w: c.getBoundingClientRect().width,
        nmClip: nm.scrollWidth > nm.clientWidth,
        prClip: pr.scrollWidth > pr.clientWidth,
      };
    }),
  };
};
const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

async function runViewport(tag, width, height, run) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(BASE, { waitUntil: 'commit', timeout: 30000 });
    let f = 0;
    for (let i = 0; i < 60 && f <= 30; i++) {
      await page.waitForTimeout(1000);
      f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(f > 30, `${tag}: page never rendered frames`);
    const frames = () => page.evaluate(() => window.__frames ?? 0);
    const settle = async () => {
      const f0 = await frames();
      for (let i = 0; i < 100 && (await frames()) < f0 + 4; i++) await page.waitForTimeout(100);
      await page.waitForTimeout(300);   // __perf refreshes every 250ms
    };

    // start + 3 seated guests (t1..t3) so the HUD carries 3 order cards
    const seated = await page.evaluate(() => {
      window.__test.start();
      window.__test.pauseSpawns(true);
      window.__test.spawnNow('pork');
      window.__test.spawnNow('mushroom');
      window.__test.spawnNow('mixian');
      for (let i = 0; i < 400; i++) {
        window.__test.setPatience(65);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.filter((x) => x.phase === 'seated').length === 3) break;
      }
      window.__test.setPatience(65);
      window.__test.tick(0.05, 2);
      return window.__game.customers.filter((x) => x.phase === 'seated').length;
    });
    assert.equal(seated, 3, `${tag}: expected 3 seated guests, got ${seated}`);
    const landscape = width / height >= 1.5;
    const spawn = await page.evaluate(() => window.__test.state().player);
    const lens = await page.evaluate(() => window.__test.camera());

    // a) stations
    const poses = [];
    if (landscape) poses.push(['spawn', null, STATIONS]);
    for (const id of STATIONS) poses.push([`@${id}`, id, landscape ? STATIONS : [id]]);
    const rows = [];
    for (const [pose, at, ids] of poses) {
      if (at) await page.evaluate((id) => window.__test.teleportToStation(id), at);
      const probe = await page.evaluate(PROBE, [ids, ITEM_Y]);
      const cam = await page.evaluate(() => window.__test.camera());
      const r = checkStations(tag, pose, probe, width, height);
      rows.push(`${pose}(lookZ=${cam.lookZ.toFixed(2)} top≤${r.maxTopY.toFixed(0)} box≤${r.maxBoxY.toFixed(0)})`);
    }
    // portrait spawn: report only (x-follow camera, ART §1 portrait rules unchanged)
    await page.evaluate(([x, z]) => window.__test.teleport(x, z), [spawn.x, spawn.z]);
    console.log(`[run ${run}] ${tag} ${width}x${height} lens aspect=${lens.aspect.toFixed(3)} halfH=${lens.halfH.toFixed(3)} ` +
      `halfW=${lens.halfW.toFixed(3)} lookAheadZ=${lens.lookAheadZ.toFixed(3)}; 站点 y≤${height - HUD_BAND} / 台身在视口内: ${rows.join(' ')}`);

    // b) HUD boxes (Round 32: legacy stick/act absent; order cards docked cleanly at bottom, equal width)
    const H = await page.evaluate(HUD_PROBE);
    assert.equal(H.stickPresent, false, `${tag}: legacy #bbq-stick still exists`);
    assert.equal(H.actPresent, false, `${tag}: legacy #bbq-act still exists`);
    assert.equal(H.fonts.length, 3, `${tag}: expected 3 order cards, got ${H.fonts.length}`);
    for (const b of H.boxes) {
      assert.ok(b.l >= 0 && b.t >= 0 && b.r <= H.vw && b.b <= H.vh, `${tag}: ${b.tag} outside viewport ${JSON.stringify(b)}`);
    }
    for (let i = 0; i < H.boxes.length; i++) {
      for (let j = i + 1; j < H.boxes.length; j++) {
        const a = inter(H.boxes[i], H.boxes[j]);
        assert.equal(a, 0, `${tag}: ${H.boxes[i].tag} overlaps ${H.boxes[j].tag} (area ${a.toFixed(1)})`);
      }
    }
    for (const b of H.boxes) {
      assert.equal(inter(b, H.topbar), 0, `${tag}: ${b.tag} overlaps the topbar`);
      assert.ok(b.r <= H.vw - 6, `${tag}: ${b.tag} right ${b.r} > vw-6`);
    }
    const widths = H.fonts.map((x) => x.w);
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 2, `${tag}: unequal card widths ${widths.join('/')}`);
    for (const [i, fz] of H.fonts.entries()) {
      assert.ok(fz.nm >= 13, `${tag}: card[${i}] .nm ${fz.nm}px < 13px`);
      assert.ok(fz.pr >= 13, `${tag}: card[${i}] .pr ${fz.pr}px < 13px`);
      assert.equal(fz.badge, 14, `${tag}: card[${i}] .tb-badge ${fz.badge}px != 14px`);
      assert.equal(fz.nmClip, false, `${tag}: card[${i}] .nm text clipped`);
      assert.equal(fz.prClip, false, `${tag}: card[${i}] .pr text clipped`);
    }
    const cards = H.boxes;
    if (landscape) {
      const tops = cards.map((c) => c.t);
      assert.ok(Math.max(...tops) - Math.min(...tops) <= 1, `${tag}: landscape cards not single row: tops=${tops.join('/')}`);
    } else {
      assert.ok(H.vh - Math.max(...cards.map((c) => c.b)) >= 23.5, `${tag}: portrait bottom safe area < 24px`);
    }
    console.log(`[run ${run}] ${tag} HUD 两两不交叠 OK (legacy absent): ` +
      `cards x[${Math.min(...cards.map((c) => c.l)).toFixed(0)}..${Math.max(...cards.map((c) => c.r)).toFixed(0)}] ` +
      `y[${Math.min(...cards.map((c) => c.t)).toFixed(0)}..${Math.max(...cards.map((c) => c.b)).toFixed(0)}] ` +
      `w=${widths.map((w) => w.toFixed(1)).join('/')}; ` +
      `字号 nm=${H.fonts.map((x) => x.nm).join('/')} pr=${H.fonts.map((x) => x.pr).join('/')} badge=${H.fonts[0].badge}`);
    if (run === 1) await page.screenshot({ path: `e2e/shots/landscape-${width}x${height}.png`, timeout: 90000 }).catch(() => {});

    // c) draw calls at spawn / grill / t2
    const perf = {};
    for (const [name, expr] of [['spawn', null], ['grill', "teleportToStation('grill')"], ['t2', "teleportToTable('t2')"]]) {
      if (expr) await page.evaluate(`window.__test.${expr}`);
      await settle();
      perf[name] = await page.evaluate(() => window.__perf.calls);
    }
    console.log(`[run ${run}] ${tag} __perf.calls ${JSON.stringify(perf)}`);
    assert.equal(errs.length, 0, `${tag}: page errors: ${errs.slice(0, 3).join(' | ')}`);
    return perf;
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
      console.error(`${tag}: environment crash (${msg.split('\n')[0]}), retry ${attempt + 1}/2`);
    }
  }
}

for (let run = 1; run <= RUNS; run++) {
  await withRetry('landscape', 844, 390, run);
  await withRetry('portrait', 390, 844, run);
  console.log(`PASS run ${run}/${RUNS}`);
}
console.log('LANDSCAPE OK');
