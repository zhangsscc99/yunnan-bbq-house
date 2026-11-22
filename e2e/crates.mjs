// E2E: B-094 — three crates must be distinguishable at a glance (pork / mushroom / mixian):
//   1) __test.foodNodes(): all 3 foods present, pairwise primary RGB Euclidean distance >= 40, cover >= 0.6
//   2) __test.decorSat(): > 0 and <= min(food sat) - 0.15 (left-wall decor subdued vs crate food)
//   3) legacy #bbq-act / #bbq-stick absent & no legacy five-step copy on screen (Round 32)
//   4) __test.spawnNow orders -> .card .nm [data-food] >= 1 and matches dish name; .bubble [data-food] matches
//   5) screenshots e2e/shots/b094-port.png & e2e/shots/b094-land.png; 0 pageerror / 0 console.error
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=2] node e2e/crates.mjs

const { chromium } = await import('playwright');
const { mkdirSync, statSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 2));
const MAX_RETRIES = 2;
const isEnvCrash = (e) => !(e instanceof assert.AssertionError)
  && /has been closed|Target page|Target closed|browser.*closed|SharedImageManager|crash/i.test(String(e?.message ?? e));

mkdirSync('e2e/shots', { recursive: true });

const DISH_KEYWORDS = {
  pork: '五花肉',
  mushroom: '菌子',
  mixian: '米线',
};

const CRATE_CHECKS = [
  { id: 'crate-pork', food: 'pork', kw: '五花肉' },
  { id: 'crate-mix', food: 'mixian', kw: '米线' },
  { id: 'crate-mush', food: 'mushroom', kw: '菌子' },
];

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

async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (e) {
      if (!isEnvCrash(e) || attempt >= MAX_RETRIES) throw e;
      console.log(`RETRY ${label}: env crash (${String(e.message).split('\n')[0]}) ${attempt + 1}/${MAX_RETRIES}`);
    }
  }
}

const raf2 = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function capture(page, path) {
  await page.screenshot({ path, timeout: 90000 });
  const size = statSync(path).size;
  assert.ok(size > 5000, `screenshot ${path} too small (${size}B)`);
  console.log(`SHOT ${path} (${size}B)`);
}

const rgbDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function runViewportOnce(tag, shotPath, viewport, takeShot) {
  const { page, errors, close } = await open(BASE, viewport);
  try {
    await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });

    // 1) foodNodes() + decorSat()
    const { nodes, decorSat } = await page.evaluate(() => ({
      nodes: window.__test.foodNodes(),
      decorSat: window.__test.decorSat(),
    }));
    assert.equal(nodes.length, 3, `${tag}: expected 3 foodNodes, got ${nodes.length}`);
    const foods = nodes.map((n) => n.food).sort();
    assert.deepEqual(foods, ['mixian', 'mushroom', 'pork'], `${tag}: foods=${JSON.stringify(foods)}`);

    for (const n of nodes) {
      assert.ok(typeof n.id === 'string' && n.id.startsWith('crate-'), `${tag}: bad id ${n.id}`);
      assert.ok(Array.isArray(n.color) && n.color.length === 3, `${tag}: bad color for ${n.id}`);
      for (const ch of n.color) {
        assert.ok(Number.isFinite(ch) && ch >= 0 && ch <= 255, `${tag}: channel out of 0..255 in ${n.id}`);
      }
      assert.ok(n.cover >= 0.6, `${tag}: ${n.id} cover=${n.cover} < 0.6`);
      assert.ok(n.sat > 0 && n.sat <= 1, `${tag}: ${n.id} sat=${n.sat} out of (0,1]`);
    }

    const pairDists = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = rgbDist(nodes[i].color, nodes[j].color);
        pairDists.push(`${nodes[i].food}-${nodes[j].food}:${d.toFixed(1)}`);
        assert.ok(d >= 40, `${tag}: RGB distance ${nodes[i].food} vs ${nodes[j].food} = ${d.toFixed(1)} < 40`);
      }
    }

    const minFoodSat = Math.min(...nodes.map((n) => n.sat));
    assert.ok(Number.isFinite(decorSat) && decorSat > 0, `${tag}: decorSat=${decorSat} must be > 0`);
    assert.ok(
      decorSat <= minFoodSat - 0.15,
      `${tag}: decorSat=${decorSat.toFixed(4)} > min(food sat)-0.15 (${(minFoodSat - 0.15).toFixed(4)})`,
    );
    console.log(
      `PASS ${tag} 3D) foods=[${nodes.map((n) => `${n.food}:rgb(${n.color.join(',')}) cov=${n.cover.toFixed(2)} sat=${n.sat.toFixed(2)}`).join(' | ')}] `
      + `dists=[${pairDists.join(', ')}] decorSat=${decorSat.toFixed(3)} <= ${(minFoodSat - 0.15).toFixed(3)}`,
    );

    // 2) spawn orders -> check .card .nm [data-food] & .bubble [data-food]
    const seated = await page.evaluate(() => {
      const ok = [
        window.__test.spawnNow('pork'),
        window.__test.spawnNow('mushroom'),
        window.__test.spawnNow('mixian'),
      ];
      if (!ok.every(Boolean)) return 0;
      for (let i = 0; i < 400; i++) {
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.filter((c) => c.phase === 'seated').length === 3) break;
      }
      window.__test.setPatience(600);
      window.__test.tick(0.05, 2);
      return window.__game.customers.filter((c) => c.phase === 'seated').length;
    });
    assert.equal(seated, 3, `${tag}: expected 3 seated orders, got ${seated}`);
    await raf2(page);

    const hudCheck = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#bbq-orders .card')].map((card) => {
        const nm = card.querySelector('.nm');
        const ico = card.querySelector('.nm [data-food]');
        const r = ico?.getBoundingClientRect();
        return {
          text: nm?.textContent?.trim() ?? '',
          food: ico?.getAttribute('data-food') ?? null,
          w: r?.width ?? 0,
          h: r?.height ?? 0,
        };
      });
      const bubbles = [...document.querySelectorAll('#bbq-bubbles .bubble')].map((b) => {
        const ico = b.querySelector('[data-food]');
        return {
          text: b.querySelector('.nm')?.textContent?.trim() ?? '',
          food: ico?.getAttribute('data-food') ?? null,
        };
      });
      return {
        cardFoodCount: document.querySelectorAll('.card .nm [data-food]').length,
        cards,
        bubbles,
      };
    });
    assert.ok(hudCheck.cardFoodCount >= 1, `${tag}: .card .nm [data-food] count = ${hudCheck.cardFoodCount} < 1`);
    assert.equal(hudCheck.cardFoodCount, hudCheck.cards.length, `${tag}: every card must have .nm [data-food]`);
    for (const c of hudCheck.cards) {
      assert.ok(c.food && DISH_KEYWORDS[c.food], `${tag}: bad card data-food="${c.food}"`);
      assert.ok(c.text.includes(DISH_KEYWORDS[c.food]), `${tag}: card text "${c.text}" does not match data-food="${c.food}"`);
      assert.ok(Math.round(c.w) === 16 && Math.round(c.h) === 16, `${tag}: card icon ${c.w}x${c.h} != 16x16`);
    }
    const seatedBubbles = hudCheck.bubbles.filter((b) => b.text && b.text !== '…');
    assert.ok(seatedBubbles.length >= 1, `${tag}: expected >=1 seated bubble`);
    for (const b of seatedBubbles) {
      assert.ok(b.food && DISH_KEYWORDS[b.food], `${tag}: bad bubble data-food="${b.food}"`);
      assert.ok(b.text.includes(DISH_KEYWORDS[b.food]), `${tag}: bubble text "${b.text}" does not match data-food="${b.food}"`);
    }
    console.log(`PASS ${tag} HUD) .card .nm [data-food]=${hudCheck.cardFoodCount} [${hudCheck.cards.map((c) => `${c.food}:${c.text}`).join(', ')}] bubbles=${seatedBubbles.length}`);

    // 3) Round 32: legacy action button / joystick removed and no legacy five-step copy visible
    const legacy = await page.evaluate(() => ({
      act: Boolean(document.querySelector('#bbq-act')),
      stick: Boolean(document.querySelector('#bbq-stick')),
      chop: Boolean(document.querySelector('#bbq-chop')),
      gb: Boolean(document.querySelector('.gb')),
      text: document.body.innerText ?? '',
    }));
    assert.equal(legacy.act, false, `${tag}: legacy #bbq-act still present`);
    assert.equal(legacy.stick, false, `${tag}: legacy #bbq-stick still present`);
    assert.equal(legacy.chop, false, `${tag}: legacy #bbq-chop still present`);
    assert.equal(legacy.gb, false, `${tag}: legacy .gb still present`);
    assert.doesNotMatch(legacy.text, /去料箱|取料|切配|装盘|烤制中/, `${tag}: legacy five-step copy found: ${legacy.text}`);
    console.log(`PASS ${tag} CLEAN) 旧操控节点不存在且页面无旧五步文案`);

    await raf2(page);
    if (takeShot) await capture(page, shotPath);

    assert.equal(errors.length, 0, `${tag}: js errors:\n${errors.join('\n')}`);
    console.log(`PASS ${tag} 0 pageerror / 0 console.error`);
  } finally {
    await close();
  }
}

const runViewport = (tag, shotPath, viewport, takeShot) =>
  withRetry(tag, () => runViewportOnce(tag, shotPath, viewport, takeShot));

for (let run = 1; run <= RUNS; run++) {
  console.log(`--- run ${run}/${RUNS} ---`);
  const takeShot = run === 1;
  await runViewport('竖屏 390x844', 'e2e/shots/b094-port.png', { width: 390, height: 844 }, takeShot);
  await runViewport('横屏 844x390', 'e2e/shots/b094-land.png', { width: 844, height: 390 }, takeShot);
}

console.log('CRATES OK');
