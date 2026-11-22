// E2E: B-134 — world label avoidance against order cards, seated bubbles, and topbar.
// Per run, per viewport (portrait 390x844, landscape 844x390), fresh browser:
//   - 3 seated guests + 1 walking-in guest (checked across entry path & camera poses):
//     a) every visible .bubble has 0 intersection area with every #bbq-orders .card (and #bbq-orders)
//     b) walking-in .bubble (entering dot <= 12x12px, no 53x32 rect) has 0 intersection area with every seated .bubble,
//        and all visible .bubble elements are pairwise disjoint & inside [4, vw-4] x [topbar.bottom+6, vh-4]
//     c) every visible .order-ring and .order-num has 0 intersection area with #bbq-hud .topbar (top >= topbar.bottom+6)
//   - 2 simultaneous walking-in guests + 2 seated guests:
//     both entering dots <= 12x12px and mutually disjoint (0 overlap) as well as clear of cards/seated/topbar
//   - d) 0 pageerror / 0 console.error
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=1] node e2e/labels.mjs   (last line: LABELS OK)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 1));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const interArea = (a, b) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const PROBE = () => {
  const rect = (e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
  };
  const visible = (e) => {
    if (!e) return false;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const tb = document.querySelector('#bbq-hud .topbar');
  const orders = document.querySelector('#bbq-orders');
  const cards = [...document.querySelectorAll('#bbq-orders .card')]
    .filter(visible)
    .map((e) => ({ table: e.dataset.table ?? '', box: rect(e) }));
  const bubbles = [...document.querySelectorAll('#bbq-bubbles .bubble')]
    .filter(visible)
    .map((e) => ({
      phase: e.dataset.phase ?? (e.classList.contains('entering') ? 'walking-in' : 'seated'),
      table: e.dataset.table ?? '',
      entering: e.classList.contains('entering'),
      text: (e.querySelector('.nm')?.textContent ?? '').trim(),
      box: rect(e),
    }));
  const rings = [...document.querySelectorAll('#bbq-rings .order-ring')]
    .filter(visible)
    .map((e) => ({ table: e.dataset.orderRing ?? '', box: rect(e) }));
  const nums = [...document.querySelectorAll('#bbq-rings .order-num')]
    .filter(visible)
    .map((e) => ({ table: e.dataset.orderNum ?? '', box: rect(e) }));
  const st = window.__test.state();
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    customers: st.customers,
    topbar: tb ? rect(tb) : null,
    orders: orders && visible(orders) ? rect(orders) : null,
    cards,
    bubbles,
    rings,
    nums,
  };
};

function assertLabelsClear(tag, snap, { expectSeated, expectWalking }) {
  assert.ok(snap.topbar && snap.topbar.h > 0, `${tag}: .topbar missing`);
  const topSafe = snap.topbar.bottom + 6;
  const seatedBubbles = snap.bubbles.filter((b) => b.phase === 'seated' || b.phase === 'eating');
  const walkingBubbles = snap.bubbles.filter((b) => b.phase === 'walking-in');

  assert.equal(snap.cards.length, Math.min(expectSeated, 3), `${tag}: expected ${Math.min(expectSeated, 3)} cards, got ${snap.cards.length}`);
  assert.equal(seatedBubbles.length, expectSeated, `${tag}: expected ${expectSeated} seated bubbles, got ${seatedBubbles.length}`);
  assert.equal(walkingBubbles.length, expectWalking, `${tag}: expected ${expectWalking} walking-in bubbles, got ${walkingBubbles.length}`);
  assert.equal(snap.rings.length, expectSeated, `${tag}: expected ${expectSeated} rings, got ${snap.rings.length}`);
  assert.equal(snap.nums.length, expectSeated, `${tag}: expected ${expectSeated} nums, got ${snap.nums.length}`);

  // 1) walking-in bubbles must be <= 12x12 entering dots (no 53x32 ellipsis bubble)
  for (const wb of walkingBubbles) {
    assert.ok(wb.entering, `${tag}: walking-in bubble missing .entering class: ${JSON.stringify(wb)}`);
    assert.ok(
      wb.box.w <= 12 && wb.box.h <= 12,
      `${tag}: walking-in bubble too large (${wb.box.w.toFixed(1)}x${wb.box.h.toFixed(1)} > 12x12)`,
    );
    assert.notEqual(wb.text, '…', `${tag}: walking-in bubble still renders ellipsis`);
  }

  // (a) every visible .bubble vs every #bbq-orders .card (and #bbq-orders container) === 0
  //     plus viewport & topbar safe bounds
  for (const b of snap.bubbles) {
    assert.ok(b.box.left >= 4 - 0.01, `${tag}: bubble(${b.phase}/${b.table}) left=${b.box.left.toFixed(2)} < 4`);
    assert.ok(b.box.right <= snap.vw - 4 + 0.01, `${tag}: bubble(${b.phase}/${b.table}) right=${b.box.right.toFixed(2)} > ${snap.vw - 4}`);
    assert.ok(b.box.top >= topSafe - 0.01, `${tag}: bubble(${b.phase}/${b.table}) top=${b.box.top.toFixed(2)} < topbar.bottom+6 (${topSafe.toFixed(2)})`);
    assert.ok(b.box.bottom <= snap.vh - 4 + 0.01, `${tag}: bubble(${b.phase}/${b.table}) bottom=${b.box.bottom.toFixed(2)} > ${snap.vh - 4}`);
    assert.equal(
      interArea(b.box, snap.topbar),
      0,
      `${tag}: bubble(${b.phase}/${b.table}) overlaps .topbar: ${JSON.stringify(b.box)} vs ${JSON.stringify(snap.topbar)}`,
    );
    if (snap.orders) {
      const ordOv = interArea(b.box, snap.orders);
      assert.equal(
        ordOv,
        0,
        `${tag}: bubble(${b.phase}/${b.table}) overlaps #bbq-orders by ${ordOv.toFixed(1)}px²: ${JSON.stringify(b.box)} vs ${JSON.stringify(snap.orders)}`,
      );
    }
    for (const c of snap.cards) {
      const ov = interArea(b.box, c.box);
      assert.equal(
        ov,
        0,
        `${tag}: bubble(${b.phase}/${b.table}) overlaps card(${c.table}) by ${ov.toFixed(1)}px²: ${JSON.stringify(b.box)} vs ${JSON.stringify(c.box)}`,
      );
    }
  }

  // (b) walking-in bubbles vs seated bubbles === 0, AND all visible bubbles pairwise disjoint === 0
  for (const wb of walkingBubbles) {
    for (const sb of seatedBubbles) {
      const ov = interArea(wb.box, sb.box);
      assert.equal(
        ov,
        0,
        `${tag}: walking-in bubble(${wb.table}) overlaps seated bubble(${sb.table}) by ${ov.toFixed(1)}px²: ${JSON.stringify(wb.box)} vs ${JSON.stringify(sb.box)}`,
      );
    }
  }
  for (let i = 0; i < snap.bubbles.length; i++) {
    for (let j = i + 1; j < snap.bubbles.length; j++) {
      const a = snap.bubbles[i];
      const b = snap.bubbles[j];
      const ov = interArea(a.box, b.box);
      assert.equal(
        ov,
        0,
        `${tag}: bubble[${i}](${a.phase}/${a.table}) overlaps bubble[${j}](${b.phase}/${b.table}) by ${ov.toFixed(1)}px²: ${JSON.stringify(a.box)} vs ${JSON.stringify(b.box)}`,
      );
    }
  }

  // (c) every .order-ring and .order-num vs #bbq-hud .topbar === 0 (and top >= topbar.bottom + 6)
  for (const rg of snap.rings) {
    const ov = interArea(rg.box, snap.topbar);
    assert.equal(
      ov,
      0,
      `${tag}: .order-ring(${rg.table}) overlaps .topbar by ${ov.toFixed(1)}px²: ${JSON.stringify(rg.box)} vs ${JSON.stringify(snap.topbar)}`,
    );
    assert.ok(
      rg.box.top >= topSafe - 0.01,
      `${tag}: .order-ring(${rg.table}) top=${rg.box.top.toFixed(2)} < topbar.bottom+6 (${topSafe.toFixed(2)})`,
    );
  }
  for (const nm of snap.nums) {
    const ov = interArea(nm.box, snap.topbar);
    assert.equal(
      ov,
      0,
      `${tag}: .order-num(${nm.table}) overlaps .topbar by ${ov.toFixed(1)}px²: ${JSON.stringify(nm.box)} vs ${JSON.stringify(snap.topbar)}`,
    );
    assert.ok(
      nm.box.top >= topSafe - 0.01,
      `${tag}: .order-num(${nm.table}) top=${nm.box.top.toFixed(2)} < topbar.bottom+6 (${topSafe.toFixed(2)})`,
    );
  }
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
    for (let i = 0; i < 120 && f <= 30; i++) {
      await page.waitForTimeout(1000);
      f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(f > 30, `${tag}: page never rendered frames within ${TIMEOUT}ms`);

    // ---- Scenario 1: 3 seated (t1, t2, t3) + 1 walking-in (t4) ----
    const setup1 = await page.evaluate(() => {
      window.__test.start();
      window.__test.pauseSpawns(true);
      const ok = [
        window.__test.spawnNow('pork'),     // t1
        window.__test.spawnNow('mushroom'), // t2
        window.__test.spawnNow('mixian'),   // t3
      ];
      if (!ok.every(Boolean)) return { ok: false, seated: 0, walking: 0 };
      for (let i = 0; i < 400; i++) {
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.filter((c) => c.phase === 'seated').length === 3) break;
      }
      window.__test.setPatience(600);
      // Spawn 4th customer (walking-in toward t4)
      const ok4 = window.__test.spawnNow('pork');
      window.__test.tick(0.05, 2);
      return {
        ok: ok4,
        seated: window.__game.customers.filter((c) => c.phase === 'seated').length,
        walking: window.__game.customers.filter((c) => c.phase === 'walking-in').length,
      };
    });
    assert.equal(setup1.ok, true, `${tag}/s1: failed to spawn 4th walking-in guest`);
    assert.equal(setup1.seated, 3, `${tag}/s1: expected 3 seated, got ${setup1.seated}`);
    assert.equal(setup1.walking, 1, `${tag}/s1: expected 1 walking-in, got ${setup1.walking}`);

    // Probe across multiple walking-in spots (including the Round-27 collision coordinates under card 3 & above t2)
    // and camera poses (spawn, t1, t2, grill).
    const probes1 = [
      { name: 'spawn-door', pose: null, walkPos: null },
      { name: 't1-under-card3', pose: ['table', 't1'], walkPos: [-1.28, -4.4] },
      { name: 't2-over-t2bubble', pose: ['table', 't2'], walkPos: [-0.5, -4.4] },
      { name: 'grill-top-rings', pose: ['station', 'grill'], walkPos: [0.2, -4.4] },
    ];
    let lastSnap1 = null;
    for (const pr of probes1) {
      await page.evaluate(({ pose, walkPos }) => {
        if (pose) {
          if (pose[0] === 'table') window.__test.teleportToTable(pose[1]);
          else window.__test.teleportToStation(pose[1]);
        }
        if (walkPos) {
          const w = window.__game.customers.find((c) => c.phase === 'walking-in');
          if (w) window.__test.moveCustomer(w.id, walkPos[0], walkPos[1]);
        }
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
      }, pr);
      await raf2(page);
      const snap = await page.evaluate(PROBE);
      assertLabelsClear(`${tag}/s1/${pr.name}`, snap, { expectSeated: 3, expectWalking: 1 });
      lastSnap1 = snap;
    }

    // ---- Scenario 2: 2 seated + 2 simultaneous walking-in guests ----
    const setup2 = await page.evaluate(() => {
      window.__test.start();
      window.__test.pauseSpawns(true);
      window.__test.spawnNow('pork');     // t1
      window.__test.spawnNow('mushroom'); // t2
      for (let i = 0; i < 400; i++) {
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.filter((c) => c.phase === 'seated').length === 2) break;
      }
      window.__test.setPatience(600);
      const w1 = window.__test.spawnNow('mixian'); // t3 walking-in
      const w2 = window.__test.spawnNow('pork');   // t4 walking-in
      window.__test.tick(0.05, 4);
      // Place both walking-in guests almost identically (Round-27 overlap repro)
      const walkers = window.__game.customers.filter((c) => c.phase === 'walking-in');
      if (walkers.length >= 2) {
        window.__test.moveCustomer(walkers[0].id, -1.25, -4.4);
        window.__test.moveCustomer(walkers[1].id, -1.30, -4.4);
      }
      window.__test.setPatience(600);
      window.__test.tick(0.05, 1);
      return {
        ok: w1 && w2,
        seated: window.__game.customers.filter((c) => c.phase === 'seated').length,
        walking: window.__game.customers.filter((c) => c.phase === 'walking-in').length,
      };
    });
    assert.equal(setup2.ok, true, `${tag}/s2: failed to spawn 2 simultaneous walking-in guests`);
    assert.equal(setup2.seated, 2, `${tag}/s2: expected 2 seated, got ${setup2.seated}`);
    assert.equal(setup2.walking, 2, `${tag}/s2: expected 2 walking-in, got ${setup2.walking}`);
    await raf2(page);
    const snap2 = await page.evaluate(PROBE);
    assertLabelsClear(`${tag}/s2/dual-entering`, snap2, { expectSeated: 2, expectWalking: 2 });

    // (d) 0 JS error
    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    const wSizes = snap2.bubbles
      .filter((b) => b.phase === 'walking-in')
      .map((b) => `${b.box.w.toFixed(0)}x${b.box.h.toFixed(0)}`)
      .join(',');
    const minRingTop = Math.min(...lastSnap1.rings.map((r) => r.box.top));
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `s1(3 seated + 1 entering x ${probes1.length} poses): card/bubble/topbar/ring overlaps=0, ` +
      `minRingTop=${minRingTop.toFixed(1)}>=${(lastSnap1.topbar.bottom + 6).toFixed(1)} | ` +
      `s2(2 seated + 2 dual-entering [${wSizes}]): pairwise overlap=0 | 0 JS err`,
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
  console.log(`PASS run ${run}/${RUNS}`);
}
console.log('LABELS OK');
