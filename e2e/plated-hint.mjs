// E2E: B-110 — plated dish (stage='plated') must NEVER direct the player to the bin.
//   a) no seated matching guest: #bbq-act says "端菜等客下单" (no 垃圾桶/丢掉/扔), flow.hint !== 'bin' (null);
//      at a wrong table: "这桌要的是 X · 端走等单", flow.hint !== 'bin';
//      once a matching guest sits: normal "送去客桌" / "上菜 X" and flow.hint === guest.table.
//   b) burnt skewer (stage='waste'): #bbq-act contains "丢" (and "去垃圾桶"), flow.hint.id === 'bin'.
//   c) 3 consecutive runs each on portrait 390x844 and landscape 844x390, 0 JS errors.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/plated-hint.mjs

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const NAV_TIMEOUT = 120000;
const FORBIDDEN_RE = /垃圾桶|丢掉|扔/;

const VIEWPORTS = [
  { tag: '竖屏 390x844', viewport: { width: 390, height: 844 } },
  { tag: '横屏 844x390', viewport: { width: 844, height: 390 } },
];

async function openPage(url, viewport) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
    const ctx = await browser.newContext({ viewport, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('crash', () => errors.push('PAGE CRASH'));
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) errors.push(m.text());
    });
    await page.goto(url, { waitUntil: 'commit', timeout: NAV_TIMEOUT });
    let frames = 0;
    for (let i = 0; i < 80 && frames <= 30; i++) {
      await page.waitForTimeout(1500);
      frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    assert.ok(frames > 30, `page never rendered frames (${url})`);
    const close = async () => {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
    };
    return { page, errors, close };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

const probe = (page) => page.evaluate(() => {
  const st = window.__test.state();
  const h = window.__game.hint;
  const actText = (document.querySelector('#bbq-act')?.textContent ?? '').trim();
  const offEl = document.querySelector('[data-offscreen-hint]');
  const offDisplay = offEl ? getComputedStyle(offEl).display : 'none';
  return {
    ...st,
    actText,
    flowHint: h ? { kind: h.kind, id: h.id, x: h.pos.x, z: h.pos.z } : null,
    offDisplay,
  };
});

const sim = (page, sec) => page.evaluate((s) => window.__test.tick(0.05, Math.ceil(s / 0.05)), sec);
const tick2 = (page) => page.evaluate(() => window.__test.tick(0.05, 2));
const atStation = (page, id) => page.evaluate((i) => {
  window.__test.teleportToStation(i);
  window.__test.tick(0.05, 2);
}, id);
const atTable = (page, id) => page.evaluate((i) => {
  window.__test.teleportToTable(i);
  window.__test.tick(0.05, 2);
}, id);
const press = (page, n = 1) => page.evaluate((k) => {
  for (let i = 0; i < k; i++) {
    window.__test.press();
    window.__test.tick(0.05, 2);
  }
}, n);

async function makePlatedPork(page) {
  await atStation(page, 'crate-pork');
  await press(page);
  await atStation(page, 'chop');
  await press(page, 1 + 3 + 1);
  await atStation(page, 'grill');
  await press(page);
  await sim(page, 6.5);
  await press(page);
  await atStation(page, 'plate');
  await press(page);
  await tick2(page);
  const p = await probe(page);
  assert.deepEqual(p.carrying, { dish: 'pork', stage: 'plated' }, `expected plated pork, got ${JSON.stringify(p.carrying)}`);
  return p;
}

async function makeBurntPork(page) {
  await atStation(page, 'crate-pork');
  await press(page);
  await atStation(page, 'chop');
  await press(page, 1 + 3 + 1);
  await atStation(page, 'grill');
  await press(page);
  await sim(page, 12.6);
  let p = await probe(page);
  assert.equal(p.grill.find(Boolean)?.stage, 'waste', `expected burnt skewer on grill: ${JSON.stringify(p.grill)}`);
  await press(page);
  await tick2(page);
  p = await probe(page);
  assert.deepEqual(p.carrying, { dish: 'pork', stage: 'waste' }, `expected waste pork, got ${JSON.stringify(p.carrying)}`);
  return p;
}

async function waitSeated(page, dish) {
  for (let i = 0; i < 60; i++) {
    await sim(page, 0.5);
    await page.evaluate(() => window.__test.setPatience(600));
    const p = await probe(page);
    const g = p.customers.find((c) => c.phase === 'seated' && c.dish === dish);
    if (g) return g;
  }
  throw new Error(`guest ordering ${dish} never seated`);
}

async function runOnce(runIdx, tag, viewport) {
  const label = `run#${runIdx} ${tag}`;
  const { page, errors, close } = await openPage(BASE, viewport);
  try {
    await page.evaluate(() => {
      window.__test.start();
      window.__test.pauseSpawns(true);
    });
    await tick2(page);

    // a) Plated dish with NO guests at all
    let p = await makePlatedPork(page);
    assert.equal(p.customers.length, 0, `${label} a) expected 0 customers`);
    assert.doesNotMatch(p.actText, FORBIDDEN_RE, `${label} a) #bbq-act "${p.actText}" matched forbidden bin copy`);
    assert.equal(p.actText, '端菜等客下单', `${label} a) #bbq-act expected "端菜等客下单", got "${p.actText}"`);
    assert.ok(p.actText.includes('等'), `${label} a) #bbq-act lacks 等: "${p.actText}"`);
    assert.ok(p.flowHint === null || p.flowHint.id !== 'bin', `${label} a) flow.hint pointed to bin: ${JSON.stringify(p.flowHint)}`);
    assert.equal(p.flowHint, null, `${label} a) flow.hint should hide arrow (null), got ${JSON.stringify(p.flowHint)}`);
    assert.equal(p.offDisplay, 'none', `${label} a) offscreen hint must stay hidden when no matching guest`);

    // Also verify on open floor (guide state)
    await page.evaluate(() => {
      window.__test.teleport(0, 0);
      window.__test.tick(0.05, 2);
    });
    p = await probe(page);
    assert.doesNotMatch(p.actText, FORBIDDEN_RE, `${label} a-floor) #bbq-act "${p.actText}" matched forbidden bin copy`);
    assert.equal(p.actText, '端菜等客下单', `${label} a-floor) #bbq-act "${p.actText}"`);
    assert.ok(p.flowHint === null || p.flowHint.id !== 'bin', `${label} a-floor) flow.hint: ${JSON.stringify(p.flowHint)}`);
    console.log(`PASS ${label} a) 无客持 plated → #bbq-act="${p.actText}" flow.hint=${JSON.stringify(p.flowHint)}`);

    // a2) Plated dish at WRONG table (only a mushroom guest is seated)
    assert.equal(await page.evaluate(() => window.__test.spawnNow('mushroom')), true, `${label} a2) spawn mushroom`);
    const wrong = await waitSeated(page, 'mushroom');
    await atTable(page, wrong.table);
    p = await probe(page);
    assert.equal(p.action, 'none', `${label} a2) wrong table action=${p.action}`);
    assert.doesNotMatch(p.actText, FORBIDDEN_RE, `${label} a2) wrong table #bbq-act "${p.actText}" matched forbidden bin copy`);
    assert.equal(p.actText, '这桌要的是 烤菌子 · 端走等单', `${label} a2) wrong table #bbq-act="${p.actText}"`);
    assert.ok(p.flowHint === null || p.flowHint.id !== 'bin', `${label} a2) wrong table flow.hint: ${JSON.stringify(p.flowHint)}`);
    console.log(`PASS ${label} a2) 错桌持 plated → #bbq-act="${p.actText}" flow.hint=${JSON.stringify(p.flowHint)}`);

    // a3) Matching pork guest seats -> normal serve chain intact
    assert.equal(await page.evaluate(() => window.__test.spawnNow('pork')), true, `${label} a3) spawn pork`);
    const right = await waitSeated(page, 'pork');
    await atStation(page, 'plate');
    p = await probe(page);
    assert.equal(p.actText, '送去客桌', `${label} a3) with matching guest #bbq-act="${p.actText}"`);
    assert.equal(p.flowHint?.kind, 'table', `${label} a3) flow.hint.kind=${p.flowHint?.kind}`);
    assert.equal(p.flowHint?.id, right.table, `${label} a3) flow.hint.id=${p.flowHint?.id} !== ${right.table}`);
    await atTable(page, wrong.table);
    p = await probe(page);
    assert.equal(p.actText, '这桌要的是 烤菌子 · 送去别桌', `${label} a3) wrong table when other guest matches: "${p.actText}"`);
    assert.equal(p.flowHint?.id, right.table, `${label} a3) hint should point to ${right.table}`);
    await atTable(page, right.table);
    p = await probe(page);
    assert.equal(p.action, 'serve', `${label} a3) at right table action=${p.action}`);
    assert.equal(p.actText, '上菜 烤五花肉拼盘', `${label} a3) serve label="${p.actText}"`);
    await press(page);
    p = await probe(page);
    assert.equal(p.carrying, null, `${label} a3) carrying cleared after serve`);
    assert.equal(p.served, 1, `${label} a3) served=${p.served}`);
    assert.ok(p.money > 0, `${label} a3) money=${p.money}`);
    console.log(`PASS ${label} a3) 正常上菜链路 → 送去客桌 / 上菜 烤五花肉拼盘 → served=${p.served} money=¥${p.money}`);

    // b) Waste (burnt skewer) MUST point to bin and mention 丢 / 去垃圾桶
    p = await makeBurntPork(page);
    assert.ok(p.actText.includes('丢'), `${label} b) waste #bbq-act "${p.actText}" lacks 丢`);
    assert.ok(p.actText.includes('去垃圾桶'), `${label} b) waste #bbq-act "${p.actText}" lacks 去垃圾桶`);
    assert.ok(p.flowHint !== null && p.flowHint.id === 'bin', `${label} b) waste flow.hint=${JSON.stringify(p.flowHint)} !== bin`);
    assert.equal(p.flowHint.kind, 'station', `${label} b) waste flow.hint.kind=${p.flowHint.kind}`);
    await atStation(page, 'bin');
    p = await probe(page);
    assert.equal(p.action, 'discard', `${label} b) at bin action=${p.action}`);
    assert.ok(p.actText.includes('丢'), `${label} b) at bin #bbq-act "${p.actText}" lacks 丢`);
    assert.equal(p.flowHint?.id, 'bin', `${label} b) at bin flow.hint.id=${p.flowHint?.id}`);
    await press(page);
    p = await probe(page);
    assert.equal(p.carrying, null, `${label} b) carrying cleared after discard`);
    assert.equal(p.waste, 1, `${label} b) waste=${p.waste}`);
    console.log(`PASS ${label} b) 焦串 waste → #bbq-act 含「丢」且 flow.hint.id=bin，丢弃后 waste=${p.waste}`);

    assert.equal(errors.length, 0, `${label} js errors:\n${errors.join('\n')}`);
    console.log(`PASS ${label}) 0 JS errors`);
  } finally {
    await close();
  }
}

for (const vp of VIEWPORTS) {
  for (let run = 1; run <= RUNS; run++) {
    await runOnce(run, vp.tag, vp.viewport);
  }
}

console.log('PLATED-HINT OK');
