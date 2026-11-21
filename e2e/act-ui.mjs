// E2E: B-117 — #bbq-act as a readable, accessible, semantic native <button>,
// plus #bbq-stick ARIA semantics and same-frame DOM sync on carrying/actionLabel changes.
// Per run, per viewport (portrait 390x844, landscape 844x390), fresh browser:
//  a) document.querySelectorAll('button, [role="button"]') hits #bbq-act; rect.width>=84 && rect.height>=84;
//  b) .cap computed fontSize >= 12px, scrollWidth <= clientWidth + 1 (no ellipsis truncation, incl. 6-char captions),
//     WCAG contrast ratio >= 4.5 computed from getComputedStyle;
//  c) aria-label === __test.state().actionLabel (non-empty), aria-disabled matches enabled state (native disabled=false);
//  d) #bbq-stick has [role="application"] and [aria-label] (and aria-roledescription);
//  e) after picking up a raw skewer + waiting 2x rAF: #bbq-act textContent & aria-label neither contain "去料箱取料"
//     and both equal same-frame state().actionLabel (checked at crate and on open floor);
//  f) on both viewports with 3 seated orders: #bbq-act has 0 overlap with #bbq-stick and every #bbq-orders .card,
//     and all rects lie strictly inside the viewport.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/act-ui.mjs   (last line: ACT-UI OK)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const inter = (a, b) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) *
  Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

const PROBE_UI = () => {
  const rect = (e) => {
    const r = e.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  };
  const parseRgba = (s) => {
    const m = String(s).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  };
  const blend = (fg, bg) => {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  };
  const relLum = ([r, g, b]) => {
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (fg, bg) => {
    const l1 = relLum(fg);
    const l2 = relLum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const st = window.__test.state();
  const act = document.querySelector('#bbq-act');
  const cap = act?.querySelector('.cap');
  const stick = document.querySelector('#bbq-stick');
  const cards = [...document.querySelectorAll('#bbq-orders .card')];
  const buttons = [...document.querySelectorAll('button, [role="button"]')];

  const actCs = act ? getComputedStyle(act) : null;
  const capCs = cap ? getComputedStyle(cap) : null;
  const bodyCs = getComputedStyle(document.body);
  const bodyBg = parseRgba(bodyCs.backgroundColor) ?? [24, 16, 8, 1];
  const actBgRaw = actCs ? parseRgba(actCs.backgroundColor) : null;
  const capFgRaw = capCs ? parseRgba(capCs.color) : null;
  const actBg = actBgRaw ? blend(actBgRaw, bodyBg) : bodyBg;
  const capFg = capFgRaw ? blend(capFgRaw, actBg) : [245, 232, 216, 1];
  const contrastOnDark = contrast(capFg, actBg);
  const actBgOverWhite = actBgRaw ? blend(actBgRaw, [255, 255, 255, 1]) : [255, 255, 255, 1];
  const contrastOverWhite = contrast(capFgRaw ? blend(capFgRaw, actBgOverWhite) : capFg, actBgOverWhite);

  const enabled = typeof st.action === 'object' && st.action !== null
    ? Boolean(st.action.enabled)
    : st.action !== 'none';

  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    state: {
      action: st.action,
      actionLabel: st.actionLabel,
      enabled,
      carrying: st.carrying,
    },
    actHitAsButton: buttons.some((b) => b.id === 'bbq-act'),
    actTag: act?.tagName ?? null,
    actType: act?.getAttribute('type') ?? null,
    actNativeDisabled: Boolean(act && act.disabled),
    actRect: act ? rect(act) : null,
    actText: (act?.textContent ?? '').trim(),
    actAriaLabel: act?.getAttribute('aria-label') ?? null,
    actAriaDisabled: act?.getAttribute('aria-disabled') ?? null,
    actDisplay: actCs?.display ?? null,
    actOpacity: actCs?.opacity ?? null,
    actTouchAction: actCs?.touchAction ?? null,
    capFontPx: capCs ? parseFloat(capCs.fontSize) : 0,
    capFontWeight: capCs ? Number(capCs.fontWeight) : 0,
    capColor: capCs?.color ?? null,
    capTextOverflow: capCs?.textOverflow ?? null,
    capWhiteSpace: capCs?.whiteSpace ?? null,
    capScrollW: cap?.scrollWidth ?? 0,
    capClientW: cap?.clientWidth ?? 0,
    actBgColor: actCs?.backgroundColor ?? null,
    contrastOnDark,
    contrastOverWhite,
    stickMatch: Boolean(document.querySelector('#bbq-stick[role="application"][aria-label]')),
    stickRole: stick?.getAttribute('role') ?? null,
    stickAriaLabel: stick?.getAttribute('aria-label') ?? null,
    stickAriaRoleDesc: stick?.getAttribute('aria-roledescription') ?? null,
    stickRect: stick ? rect(stick) : null,
    cardRects: cards.map((c, i) => ({ tag: `.card[${i}:${c.dataset.table}]`, ...rect(c) })),
  };
};

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

function assertInViewport(tag, name, b, vw, vh) {
  assert.ok(
    b && b.l >= 0 && b.t >= 0 && b.r <= vw && b.b <= vh,
    `${tag}: ${name} outside viewport ${vw}x${vh}: ${JSON.stringify(b)}`,
  );
}

function assertSyncAndCap(tag, stepName, p) {
  assert.ok(p.state.actionLabel && p.state.actionLabel.length > 0, `${tag}/${stepName}: empty actionLabel`);
  assert.equal(p.actText, p.state.actionLabel, `${tag}/${stepName}: #bbq-act text "${p.actText}" != actionLabel "${p.state.actionLabel}"`);
  assert.equal(p.actAriaLabel, p.state.actionLabel, `${tag}/${stepName}: aria-label "${p.actAriaLabel}" != actionLabel "${p.state.actionLabel}"`);
  assert.equal(p.actAriaDisabled, String(!p.state.enabled), `${tag}/${stepName}: aria-disabled="${p.actAriaDisabled}" != ${String(!p.state.enabled)} (enabled=${p.state.enabled})`);
  assert.equal(p.actNativeDisabled, false, `${tag}/${stepName}: native disabled must stay false`);
  assert.ok(p.capFontPx >= 12, `${tag}/${stepName}: .cap fontSize ${p.capFontPx}px < 12px`);
  assert.ok(
    p.capScrollW <= p.capClientW + 1,
    `${tag}/${stepName}: .cap "${p.actText}" truncated scrollWidth=${p.capScrollW} > clientWidth+1=${p.capClientW + 1}`,
  );
  assert.notEqual(p.capTextOverflow, 'ellipsis', `${tag}/${stepName}: .cap still uses ellipsis`);
  assert.ok(
    p.contrastOnDark >= 4.5,
    `${tag}/${stepName}: contrast ${p.contrastOnDark.toFixed(2)} < 4.5 (fg=${p.capColor} bg=${p.actBgColor})`,
  );
}

async function runViewport(tag, width, height, run) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
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

    // Start level + seat 3 customers so #bbq-orders has 3 cards for overlap checks (f)
    const seated = await page.evaluate(() => {
      window.__test.start();
      window.__test.pauseSpawns(true);
      window.__test.spawnNow('pork');
      window.__test.spawnNow('mushroom');
      window.__test.spawnNow('mixian');
      for (let i = 0; i < 400; i++) {
        window.__test.setPatience(600);
        window.__test.tick(0.05, 1);
        if (window.__game.customers.filter((x) => x.phase === 'seated').length === 3) break;
      }
      window.__test.setPatience(600);
      window.__test.tick(0.05, 2);
      return window.__game.customers.filter((x) => x.phase === 'seated').length;
    });
    assert.equal(seated, 3, `${tag}: expected 3 seated guests, got ${seated}`);
    await raf2(page);

    // a), b), c), d), f) at spawn
    const pSpawn = await page.evaluate(PROBE_UI);
    assert.equal(pSpawn.actHitAsButton, true, `${tag}: a) button/[role=button] missed #bbq-act`);
    assert.equal(pSpawn.actTag, 'BUTTON', `${tag}: a) #bbq-act tagName=${pSpawn.actTag} != BUTTON`);
    assert.equal(pSpawn.actType, 'button', `${tag}: a) #bbq-act type=${pSpawn.actType} != button`);
    assert.ok(
      pSpawn.actRect && pSpawn.actRect.w >= 84 && pSpawn.actRect.h >= 84,
      `${tag}: a) #bbq-act rect ${JSON.stringify(pSpawn.actRect)} < 84x84`,
    );
    assertSyncAndCap(tag, 'spawn', pSpawn);
    assert.equal(pSpawn.state.enabled, false, `${tag}: c) expected enabled=false at spawn`);
    assert.equal(pSpawn.actAriaDisabled, 'true', `${tag}: c) expected aria-disabled="true" at spawn`);

    // d) #bbq-stick semantics
    assert.equal(pSpawn.stickMatch, true, `${tag}: d) #bbq-stick missing [role="application"][aria-label]`);
    assert.equal(pSpawn.stickRole, 'application', `${tag}: d) stick role=${pSpawn.stickRole}`);
    assert.ok(pSpawn.stickAriaLabel && pSpawn.stickAriaLabel.length > 0, `${tag}: d) stick aria-label empty`);
    assert.ok(pSpawn.stickAriaRoleDesc && pSpawn.stickAriaRoleDesc.length > 0, `${tag}: d) stick aria-roledescription empty`);

    // f) overlap = 0 and all inside viewport
    assert.equal(pSpawn.cardRects.length, 3, `${tag}: f) expected 3 order cards, got ${pSpawn.cardRects.length}`);
    assertInViewport(tag, '#bbq-act', pSpawn.actRect, pSpawn.vw, pSpawn.vh);
    assertInViewport(tag, '#bbq-stick', pSpawn.stickRect, pSpawn.vw, pSpawn.vh);
    const ovStick = inter(pSpawn.actRect, pSpawn.stickRect);
    assert.equal(ovStick, 0, `${tag}: f) #bbq-act overlaps #bbq-stick by ${ovStick.toFixed(1)}px²`);
    let maxCardOv = 0;
    for (const c of pSpawn.cardRects) {
      assertInViewport(tag, c.tag, c, pSpawn.vw, pSpawn.vh);
      const ov = inter(pSpawn.actRect, c);
      maxCardOv = Math.max(maxCardOv, ov);
      assert.equal(ov, 0, `${tag}: f) #bbq-act overlaps ${c.tag} by ${ov.toFixed(1)}px² (${JSON.stringify(pSpawn.actRect)} vs ${JSON.stringify(c)})`);
    }

    // Move to crate-pork -> check enabled=true & aria-disabled="false"
    await page.evaluate(() => {
      window.__test.teleportToStation('crate-pork');
      window.__test.setPatience(600);
      window.__test.tick(0.05, 2);
    });
    await raf2(page);
    const pCrate = await page.evaluate(PROBE_UI);
    assert.equal(pCrate.state.action, 'take-raw', `${tag}: crate action=${pCrate.state.action}`);
    assert.equal(pCrate.state.enabled, true, `${tag}: crate expected enabled=true`);
    assertSyncAndCap(tag, 'crate-pork', pCrate);

    // e) Pick up raw pork via real pointerdown on #bbq-act, wait 2x rAF, check same-frame sync
    await page.evaluate(() => {
      document.querySelector('#bbq-act').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }),
      );
    });
    await raf2(page);
    const pPickedCrate = await page.evaluate(PROBE_UI);
    assert.deepEqual(
      pPickedCrate.state.carrying,
      { dish: 'pork', stage: 'raw' },
      `${tag}: e) expected carrying raw pork after pointerdown + 2x rAF, got ${JSON.stringify(pPickedCrate.state.carrying)}`,
    );
    assert.ok(!pPickedCrate.actText.includes('去料箱取料'), `${tag}: e@crate) stale text "${pPickedCrate.actText}"`);
    assert.ok(!pPickedCrate.actAriaLabel.includes('去料箱取料'), `${tag}: e@crate) stale aria-label "${pPickedCrate.actAriaLabel}"`);
    assertSyncAndCap(tag, 'picked@crate', pPickedCrate);

    // Step onto open floor with raw pork -> verify 2x rAF sync to "去切配台" (still no "去料箱取料")
    await page.evaluate(() => {
      window.__test.teleport(0, 0);
      window.__test.setPatience(600);
    });
    await raf2(page);
    const pPickedFloor = await page.evaluate(PROBE_UI);
    assert.deepEqual(pPickedFloor.state.carrying, { dish: 'pork', stage: 'raw' }, `${tag}: e@floor) lost raw pork`);
    assert.ok(!pPickedFloor.actText.includes('去料箱取料'), `${tag}: e@floor) stale text "${pPickedFloor.actText}"`);
    assert.ok(!pPickedFloor.actAriaLabel.includes('去料箱取料'), `${tag}: e@floor) stale aria-label "${pPickedFloor.actAriaLabel}"`);
    assertSyncAndCap(tag, 'picked@floor', pPickedFloor);

    // Verify 6-char captions (取回切好的串 & 去垃圾桶丢掉) never truncate (.cap scrollWidth <= clientWidth + 1)
    await page.evaluate(() => {
      window.__test.teleportToStation('chop');
      window.__test.tick(0.05, 2);
      for (let i = 0; i < 4; i++) {
        window.__test.press();
        window.__test.tick(0.05, 2);
      }
      window.__test.setPatience(600);
    });
    await raf2(page);
    const pSixChop = await page.evaluate(PROBE_UI);
    assert.equal(pSixChop.actText, '取回切好的串', `${tag}: 6-char chop expected "取回切好的串", got "${pSixChop.actText}"`);
    assertSyncAndCap(tag, '6char-chop', pSixChop);

    await page.evaluate(() => {
      window.__test.press();
      window.__test.tick(0.05, 2);
      window.__test.teleportToStation('grill');
      window.__test.tick(0.05, 2);
      window.__test.press();
      window.__test.tick(0.05, Math.ceil(12.6 / 0.05));
      window.__test.press();
      window.__test.tick(0.05, 2);
      window.__test.teleport(0, 0);
      window.__test.setPatience(600);
      window.__test.tick(0.05, 2);
    });
    await raf2(page);
    const pSixBin = await page.evaluate(PROBE_UI);
    assert.equal(pSixBin.actText, '去垃圾桶丢掉', `${tag}: 6-char waste expected "去垃圾桶丢掉", got "${pSixBin.actText}"`);
    assertSyncAndCap(tag, '6char-waste', pSixBin);

    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `act=${pSpawn.actRect.w.toFixed(0)}x${pSpawn.actRect.h.toFixed(0)} <button> | ` +
      `cap=${pSpawn.capFontPx}px w700 contrast=${pSpawn.contrastOnDark.toFixed(2)}:1 (overWhite=${pSpawn.contrastOverWhite.toFixed(2)}:1) | ` +
      `6字「${pSixBin.actText}」scrollW=${pSixBin.capScrollW}/clientW=${pSixBin.capClientW} | ` +
      `aria(spawn:${pSpawn.actAriaLabel}/dis=${pSpawn.actAriaDisabled}, crate:${pCrate.actAriaLabel}/dis=${pCrate.actAriaDisabled}, picked:${pPickedCrate.actAriaLabel}->${pPickedFloor.actAriaLabel}) | ` +
      `stick(${pSpawn.stickRole}/${pSpawn.stickAriaLabel}) | ov(stick=${ovStick},cards=${maxCardOv}) | 0 JS err`,
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
console.log('ACT-UI OK');
