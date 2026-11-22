// E2E: B-121 — burnt grill state warning styling on #bbq-act (data-act-warn + 取焦串)
// + cooked-over-burnt pickup priority + same-frame world glyph sync + clean post-pickup state.
// Per run, per viewport (portrait 390x844, landscape 844x390), fresh browser:
//  a) tick +6.1s (grill.slots has stage==='cooked'): #bbq-act text includes "取烤串",
//     dataset.actWarn !== 'true', border not red, world glyph '取' (warn=false);
//  b) tick to +14.1s (stage==='waste'): text matches /焦/ ("取焦串", <=4 chars),
//     dataset.actWarn === 'true', computed border-color R > 200 && G < 110 (also overrides .on),
//     warning inline SVG present (no emoji), world glyph '焦' (warn=true) same-frame;
//  c) two grill slots (one cooked + one waste): #bbq-act stays gold "取烤串" and picks cooked first
//     (after pickup carrying.stage==='cooked', remaining slot still 'waste');
//  d) after taking burnt skewer + 2x rAF: carrying.stage==='waste', data-act-warn cleared,
//     text no longer matches /取焦串/, rapid double-tap idempotent, waste count unchanged until discard;
//  e) both viewports: #bbq-act >= 84x84, .cap >= 12px & no truncation, 0 overlap with #bbq-stick & #bbq-orders .card.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ [E2E_RUNS=3] node e2e/grill-warn.mjs   (last line: GRILL-WARN OK)

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4175/bbq/';
const RUNS = Math.max(1, Number(process.env.E2E_RUNS ?? 3));
const TIMEOUT = 120000;
const ENV_CRASH = /has been closed|Target page|Target closed|SharedImageManager|crash/i;

const inter = (a, b) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) *
  Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

const parseRgb = (s) => {
  const m = String(s).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  assert.ok(m, `unparseable color "${s}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const raf2 = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const sim = (page, sec) =>
  page.evaluate((s) => {
    window.__test.setPatience(600);
    window.__test.tick(0.05, Math.round(s / 0.05));
    window.__test.setPatience(600);
  }, sec);

async function actTick(page) {
  await page.evaluate(() => {
    window.__test.press();
    window.__test.tick(0.05, 2);
    window.__test.setPatience(600);
  });
}

async function at(page, id, want) {
  await page.evaluate((i) => {
    window.__test.teleportToStation(i);
    window.__test.tick(0.05, 2);
    window.__test.setPatience(600);
  }, id);
  const st = await page.evaluate(() => window.__test.state());
  if (want) assert.equal(st.action, want, `at ${id}: expected ${want}, got ${st.action}`);
  return st;
}

/** craft one chopped skewer via real chain (crate-pork -> chop x3 -> pick up) and place on grill */
async function putSkewerOnGrill(page, tag) {
  await at(page, 'crate-pork', 'take-raw');
  await actTick(page);
  await at(page, 'chop', 'chop');
  await actTick(page); // place on board
  for (let i = 0; i < 3; i++) await actTick(page); // 3 chops
  await actTick(page); // pick chopped skewer
  await at(page, 'grill', 'put-grill');
  const pPut = await page.evaluate(PROBE);
  assert.notEqual(pPut.actWarn, 'true', `${tag}: put-grill must not carry data-act-warn`);
  await actTick(page);
}

const PROBE = () => {
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
  const actCs = act ? getComputedStyle(act) : null;
  const capCs = cap ? getComputedStyle(cap) : null;
  const bodyBg = parseRgba(getComputedStyle(document.body).backgroundColor) ?? [24, 16, 8, 1];
  const actBgRaw = actCs ? parseRgba(actCs.backgroundColor) : null;
  const capFgRaw = capCs ? parseRgba(capCs.color) : null;
  const actBg = actBgRaw ? blend(actBgRaw, bodyBg) : bodyBg;
  const capFg = capFgRaw ? blend(capFgRaw, actBg) : [245, 232, 216, 1];

  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    state: st,
    highlight: window.__game.highlightState ?? null,
    actText: (act?.textContent ?? '').trim(),
    actAriaLabel: act?.getAttribute('aria-label') ?? null,
    actWarn: act?.dataset.actWarn ?? null,
    actHasWarnAttr: Boolean(act?.hasAttribute('data-act-warn')),
    actBorderColor: actCs?.borderColor ?? null,
    actWarnSvg: Boolean(act?.querySelector('svg[data-icon="warn"]')),
    actHasSvg: Boolean(act?.querySelector('svg')),
    actRect: act ? rect(act) : null,
    capFontPx: capCs ? parseFloat(capCs.fontSize) : 0,
    capScrollW: cap?.scrollWidth ?? 0,
    capClientW: cap?.clientWidth ?? 0,
    contrastOnDark: contrast(capFg, actBg),
    stickRect: stick ? rect(stick) : null,
    cardRects: cards.map((c, i) => ({ tag: `.card[${i}:${c.dataset.table}]`, ...rect(c) })),
  };
};

function assertLayout(tag, stepName, p) {
  assert.ok(
    p.actRect && p.actRect.w >= 84 && p.actRect.h >= 84,
    `${tag}/${stepName}: #bbq-act ${JSON.stringify(p.actRect)} < 84x84`,
  );
  assert.ok(p.capFontPx >= 12, `${tag}/${stepName}: .cap fontSize ${p.capFontPx} < 12`);
  assert.ok(
    p.capScrollW <= p.capClientW + 1,
    `${tag}/${stepName}: .cap "${p.actText}" truncated ${p.capScrollW} > ${p.capClientW + 1}`,
  );
  assert.ok(
    p.contrastOnDark >= 4.5,
    `${tag}/${stepName}: contrast ${p.contrastOnDark.toFixed(2)} < 4.5`,
  );
  assert.ok(
    p.actRect.l >= 0 && p.actRect.t >= 0 && p.actRect.r <= p.vw && p.actRect.b <= p.vh,
    `${tag}/${stepName}: #bbq-act outside viewport ${p.vw}x${p.vh}: ${JSON.stringify(p.actRect)}`,
  );
  const ovStick = inter(p.actRect, p.stickRect);
  assert.equal(ovStick, 0, `${tag}/${stepName}: #bbq-act overlaps #bbq-stick (${ovStick}px²)`);
  assert.equal(p.cardRects.length, 3, `${tag}/${stepName}: expected 3 order cards, got ${p.cardRects.length}`);
  let maxCardOv = 0;
  for (const c of p.cardRects) {
    const ov = inter(p.actRect, c);
    maxCardOv = Math.max(maxCardOv, ov);
    assert.equal(ov, 0, `${tag}/${stepName}: #bbq-act overlaps ${c.tag} (${ov}px²)`);
  }
  return { ovStick, maxCardOv };
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

    // Start level and seat 3 guests so order cards are present for overlap checks (e)
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

    // Craft skewer #1 via real chain and place on grill
    await putSkewerOnGrill(page, tag);

    // ---- a) +6.1s: cooked ----
    await sim(page, 6.1);
    const pCooked = await page.evaluate(PROBE);
    assert.ok(
      pCooked.state.grill.some((s) => s && s.stage === 'cooked'),
      `${tag} a): expected cooked slot at +6.1s, got ${JSON.stringify(pCooked.state.grill)}`,
    );
    assert.equal(pCooked.state.action, 'take-grill', `${tag} a): expected take-grill`);
    assert.ok(pCooked.actText.includes('取烤串'), `${tag} a): expected 取烤串, got "${pCooked.actText}"`);
    assert.notEqual(pCooked.actWarn, 'true', `${tag} a): dataset.actWarn must not be 'true' on cooked`);
    assert.equal(pCooked.actHasWarnAttr, false, `${tag} a): data-act-warn attr must be absent on cooked`);
    const [cr, cg] = parseRgb(pCooked.actBorderColor);
    assert.ok(!(cr > 200 && cg < 110), `${tag} a): cooked border must not be warning red (${pCooked.actBorderColor})`);
    assert.equal(pCooked.actWarnSvg, false, `${tag} a): cooked state must not use warn svg`);
    assert.equal(pCooked.highlight?.char, '取', `${tag} a): expected world glyph '取', got ${JSON.stringify(pCooked.highlight)}`);
    assert.equal(pCooked.highlight?.warn, false, `${tag} a): expected world glyph warn=false`);
    const layCooked = assertLayout(tag, 'cooked', pCooked);

    // ---- b) continue to +14.1s (+8.0s more): waste ----
    await sim(page, 8.0);
    const pBurnt = await page.evaluate(PROBE);
    assert.ok(
      pBurnt.state.grill.some((s) => s && s.stage === 'waste'),
      `${tag} b): expected waste slot at +14.1s, got ${JSON.stringify(pBurnt.state.grill)}`,
    );
    assert.equal(pBurnt.state.action, 'take-grill', `${tag} b): expected take-grill on burnt`);
    assert.match(pBurnt.actText, /焦/, `${tag} b): burnt text "${pBurnt.actText}" must match /焦/`);
    assert.equal(pBurnt.actText, '取焦串', `${tag} b): expected exact copy "取焦串", got "${pBurnt.actText}"`);
    assert.ok([...pBurnt.actText].length <= 4, `${tag} b): copy "${pBurnt.actText}" > 4 chars`);
    assert.equal(pBurnt.actAriaLabel, pBurnt.actText, `${tag} b): aria-label mismatch`);
    assert.equal(pBurnt.actWarn, 'true', `${tag} b): expected dataset.actWarn==='true'`);
    const [br, bg, bb] = parseRgb(pBurnt.actBorderColor);
    assert.ok(br > 200 && bg < 110, `${tag} b): burnt border not warning red: ${pBurnt.actBorderColor}`);
    assert.equal(pBurnt.actWarnSvg, true, `${tag} b): expected inline warning SVG icon`);
    assert.equal(pBurnt.highlight?.visible, true, `${tag} b): world glyph must be visible`);
    assert.equal(pBurnt.highlight?.char, '焦', `${tag} b): world glyph expected '焦', got ${JSON.stringify(pBurnt.highlight)}`);
    assert.equal(pBurnt.highlight?.warn, true, `${tag} b): world glyph warn expected true`);
    const layBurnt = assertLayout(tag, 'burnt', pBurnt);

    // Verify #bbq-act[data-act-warn="true"] overrides .on gold border
    const borderWithOn = await page.evaluate(() => {
      const act = document.querySelector('#bbq-act');
      act.classList.add('on');
      const col = getComputedStyle(act).borderColor;
      act.classList.remove('on');
      return col;
    });
    const [onR, onG] = parseRgb(borderWithOn);
    assert.ok(onR > 200 && onG < 110, `${tag} b): .on overrode warning red border (${borderWithOn})`);

    // ---- c) two grill slots: one waste (slot 0) + one cooked (slot 1) -> cooked wins ----
    await putSkewerOnGrill(page, tag);
    await sim(page, 6.1);
    const pMixed = await page.evaluate(PROBE);
    const cookedSlots = pMixed.state.grill.filter((s) => s && s.stage === 'cooked');
    const wasteSlots = pMixed.state.grill.filter((s) => s && s.stage === 'waste');
    assert.equal(cookedSlots.length, 1, `${tag} c): expected 1 cooked slot, got ${JSON.stringify(pMixed.state.grill)}`);
    assert.equal(wasteSlots.length, 1, `${tag} c): expected 1 waste slot, got ${JSON.stringify(pMixed.state.grill)}`);
    assert.equal(pMixed.state.action, 'take-grill', `${tag} c): expected take-grill in mixed state`);
    assert.ok(pMixed.actText.includes('取烤串'), `${tag} c): mixed grill must show 取烤串, got "${pMixed.actText}"`);
    assert.notEqual(pMixed.actWarn, 'true', `${tag} c): mixed grill must NOT set data-act-warn`);
    const [mr, mg] = parseRgb(pMixed.actBorderColor);
    assert.ok(!(mr > 200 && mg < 110), `${tag} c): mixed grill border must not be red (${pMixed.actBorderColor})`);
    assert.equal(pMixed.highlight?.char, '取', `${tag} c): mixed grill glyph must be '取'`);
    assert.equal(pMixed.highlight?.warn, false, `${tag} c): mixed grill glyph warn must be false`);

    // Pick via real pointerdown -> must lift the cooked skewer, leaving waste on grill
    await page.evaluate(() => {
      document.querySelector('#bbq-act').dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }),
      );
    });
    await raf2(page);
    const pAfterMixed = await page.evaluate(PROBE);
    assert.equal(
      pAfterMixed.state.carrying?.stage,
      'cooked',
      `${tag} c): expected carrying cooked after mixed pickup, got ${JSON.stringify(pAfterMixed.state.carrying)}`,
    );
    const remainAfterMixed = pAfterMixed.state.grill.filter(Boolean);
    assert.equal(remainAfterMixed.length, 1, `${tag} c): expected 1 remaining grill slot, got ${JSON.stringify(pAfterMixed.state.grill)}`);
    assert.equal(remainAfterMixed[0].stage, 'waste', `${tag} c): remaining slot must still be waste`);
    assert.equal(pAfterMixed.state.waste, 0, `${tag} c): waste count must still be 0`);
    assert.equal(pAfterMixed.actHasWarnAttr, false, `${tag} c): data-act-warn must be absent after cooked pickup`);

    // Discard the held cooked skewer at bin (check discard does not carry data-act-warn; waste stays 0)
    await at(page, 'bin', 'discard');
    const pBinCooked = await page.evaluate(PROBE);
    assert.equal(pBinCooked.actHasWarnAttr, false, `${tag}: discard must not carry data-act-warn`);
    await actTick(page);
    assert.equal((await page.evaluate(() => window.__test.state().waste)), 0, `${tag}: binning cooked must not inc waste`);

    // ---- d) return to grill (only waste left) -> take burnt via pointerdown + double-tap idempotency -> 2x rAF ----
    await at(page, 'grill', 'take-grill');
    const pBurnt2 = await page.evaluate(PROBE);
    assert.equal(pBurnt2.actText, '取焦串', `${tag} d): expected 取焦串 before burnt pickup`);
    assert.equal(pBurnt2.actWarn, 'true', `${tag} d): expected data-act-warn='true' before burnt pickup`);

    // Dispatch rapid double pointerdown to verify take-grill idempotency (no dup/swallow)
    await page.evaluate(() => {
      const btn = document.querySelector('#bbq-act');
      const ev = () => new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true });
      btn.dispatchEvent(ev());
      btn.dispatchEvent(ev());
    });
    await raf2(page);
    const pAfterBurnt = await page.evaluate(PROBE);
    assert.equal(
      pAfterBurnt.state.carrying?.stage,
      'waste',
      `${tag} d): expected carrying.stage==='waste' after taking burnt skewer, got ${JSON.stringify(pAfterBurnt.state.carrying)}`,
    );
    assert.equal(
      pAfterBurnt.state.grill.filter(Boolean).length,
      0,
      `${tag} d): grill should be empty after taking burnt skewer`,
    );
    assert.equal(pAfterBurnt.state.waste, 0, `${tag} d): waste counter must only increment on discard, not take-grill`);
    assert.notEqual(pAfterBurnt.actWarn, 'true', `${tag} d): data-act-warn must be cleared within 2x rAF`);
    assert.equal(pAfterBurnt.actHasWarnAttr, false, `${tag} d): data-act-warn attribute still present`);
    assert.doesNotMatch(pAfterBurnt.actText, /取焦串/, `${tag} d): stale caption "${pAfterBurnt.actText}"`);
    assert.equal(pAfterBurnt.actWarnSvg, false, `${tag} d): warn SVG must be cleared after pickup`);
    assert.equal(pAfterBurnt.highlight?.warn, false, `${tag} d): world glyph warn must clear after pickup`);
    const layPost = assertLayout(tag, 'post-burnt', pAfterBurnt);

    // Discard burnt skewer at bin -> waste increments by 1, no data-act-warn
    await at(page, 'bin', 'discard');
    const pBinWaste = await page.evaluate(PROBE);
    assert.equal(pBinWaste.actHasWarnAttr, false, `${tag} d): bin discard must not have data-act-warn`);
    await actTick(page);
    const stFinal = await page.evaluate(() => window.__test.state());
    assert.equal(stFinal.carrying, null, `${tag} d): carrying should be null after discard`);
    assert.equal(stFinal.waste, 1, `${tag} d): waste counter should increment to 1 on discard`);

    assert.equal(errs.length, 0, `${tag}: JS errors:\n${errs.join('\n')}`);
    console.log(
      `[run ${run}/${RUNS}] ${tag} ${width}x${height} PASS | ` +
      `cooked「${pCooked.actText}」warn=${pCooked.actWarn} border=${pCooked.actBorderColor} glyph=${pCooked.highlight.char} | ` +
      `burnt「${pBurnt.actText}」warn=${pBurnt.actWarn} border=${pBurnt.actBorderColor} (.on=${borderWithOn}) svg=warn glyph=${pBurnt.highlight.char}(warn=${pBurnt.highlight.warn}) | ` +
      `mixed->carrying=${pAfterMixed.state.carrying.stage} remain=${remainAfterMixed[0].stage} | ` +
      `postBurnt(2rAF)->carrying=${pAfterBurnt.state.carrying.stage} warn=${pAfterBurnt.actWarn} cap「${pAfterBurnt.actText}」 waste=${pAfterBurnt.state.waste}->${stFinal.waste} | ` +
      `act=${pBurnt.actRect.w.toFixed(0)}x${pBurnt.actRect.h.toFixed(0)} cap=${pBurnt.capFontPx}px(${pBurnt.capScrollW}/${pBurnt.capClientW}) ` +
      `ov(stick=${Math.max(layCooked.ovStick, layBurnt.ovStick, layPost.ovStick)},cards=${Math.max(layCooked.maxCardOv, layBurnt.maxCardOv, layPost.maxCardOv)}) | 0 JS err`,
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
console.log('GRILL-WARN OK');
