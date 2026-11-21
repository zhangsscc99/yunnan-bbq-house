// Round 10 walkthrough — portrait 390x844.
// Covers: ④ grill doneness/burn ⑤ plate→serve→pay + floating ¥ ⑥ patience→0 angry leave
//         ⑨ rapid repeated presses ⑩ console errors.
// Live site, no code changes. Writes JSON checkpoints + pngs into e2e/review/<ts>/.
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');

const TS = process.argv[2] ?? 'run';
const OUT = `e2e/review/${TS}`;
mkdirSync(OUT, { recursive: true });
const BASE = 'https://openfolio.uk/bbq/';
const log = { ts: new Date().toISOString(), out: OUT, steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-port.json`, JSON.stringify(log, null, 1));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-CN' });
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') log.errors.push(m.text());
  else if (m.type() === 'warning') log.warnings.push(m.text());
});
const cdp = await page.context().newCDPSession(page);
let shotN = 0;
async function shot(name) {
  shotN++;
  const path = `${OUT}/${name}.png`;
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path, Buffer.from(data, 'base64'));
  } catch (e) {
    try { await page.screenshot({ path, timeout: 60000 }); } catch (e2) { log.steps[`shotFail_${name}`] = String(e2); }
  }
  return path;
}
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.round(sec / 0.05)), s);
const st = () => page.evaluate(() => window.__test.state());
async function act(n = 1) {
  await page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n);
}
const at = async (id) => { await page.evaluate((i) => window.__test.teleportToStation(i), id); await sim(0.05); };

try {
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'commit', timeout: 60000 });
  let frames = 0;
  for (let i = 0; i < 120 && frames <= 20; i++) {
    await page.waitForTimeout(1000);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  log.bootMs = Date.now() - t0;
  log.frames = frames;
  log.panel = await page.evaluate(() => ({
    text: document.querySelector('.bbq-panel')?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 160) ?? null,
    blur: (() => { const p = document.querySelector('.bbq-panel'); return p ? getComputedStyle(p).backdropFilter : null; })(),
  }));
  save();
  await shot('port-01-entry');

  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
  await sim(0.3);
  log.steps.started = await st();
  save();

  // ---------- ④ grill: raw → cooked → burnt ----------
  await page.evaluate(() => window.__test.spawnNow());
  for (let i = 0; i < 40; i++) {
    const seated = await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'));
    if (seated) break;
    await sim(0.5);
  }
  await shot('port-02-seated');
  log.steps.orders = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('#bbq-orders .card')].map((c) => ({
      t: c.innerText.replace(/\s+/g, ' ').trim().slice(0, 40),
      r: (() => { const b = c.getBoundingClientRect(); return [b.x | 0, b.y | 0, b.width | 0, b.height | 0]; })(),
    })),
    cust: window.__game.customers.map((c) => ({ dish: c.dish, phase: c.phase, patience: +c.patience.toFixed(1), pmax: c.patienceMax })),
  }));

  // build a pork skewer: crate → chop×4 → grill
  await at('crate-pork'); await act(1);
  await at('chop'); await act(1);
  const chopSeq = [await st().then((s) => s.chop)];
  for (let i = 0; i < 3; i++) { await act(1); chopSeq.push((await st()).chop); }
  await act(1);
  log.steps.chopSeq = chopSeq;
  await at('grill'); await act(1);
  log.steps.onGrill = await st().then((s) => s.grill);

  const grillSample = async (label, adv) => {
    if (adv) await sim(adv);
    const b = await page.evaluate(() => {
      const root = document.querySelector('#bbq-grillbars .gb');
      if (!root) return null;
      const txt = root.querySelector('.gb-txt'); const bar = root.querySelector('.gb-bar').getBoundingClientRect();
      const fill = root.querySelector('.gb-fill')?.getBoundingClientRect();
      const r = root.getBoundingClientRect();
      const slot = window.__game.grill.slots.find((s) => s.item);
      return {
        text: txt?.textContent, color: txt ? getComputedStyle(txt).color : null, fontPx: txt ? parseFloat(getComputedStyle(txt).fontSize) : null,
        bar: [bar.width, bar.height].map((n) => +n.toFixed(1)), fillW: fill ? +fill.width.toFixed(1) : null,
        box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0],
        hex: slot?.hex ?? null, t: slot?.item ? +slot.item.grillT.toFixed(2) : null, stage: slot?.item?.stage ?? null,
      };
    });
    log.steps[`grill_${label}`] = b;
    return b;
  };
  await grillSample('t0', 0.2);
  await shot('port-03-grill-raw');
  await grillSample('t3', 3);
  await grillSample('t6.4', 3.4);
  await shot('port-04-grill-cooked');
  await grillSample('t9', 2.6);
  await grillSample('t12.6', 3.6);
  await shot('port-05-grill-burnt');
  await grillSample('t14', 1.4);
  save();

  // ---------- ⑤ take → plate → serve → pay ----------
  // restart clean to avoid the burnt state
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); window.__test.spawnNow(); });
  for (let i = 0; i < 40; i++) {
    const seated = await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'));
    if (seated) break;
    await sim(0.5);
  }
  const before = await st();
  await at('crate-pork'); await act(1);
  await at('chop'); await act(1); await act(3); await act(1);
  await at('grill'); await act(1);
  await sim(6.5);
  await at('grill'); await act(1);          // take cooked
  log.steps.carryingCooked = (await st()).carrying;
  await at('plate'); await act(1);          // plate
  log.steps.carryingPlated = (await st()).carrying;
  const tgt = await page.evaluate(() => {
    const c = window.__game.customers.find((x) => x.phase === 'seated');
    return c ? { id: c.id, table: c.table, patience: +c.patience.toFixed(1), pmax: c.patienceMax } : null;
  });
  log.steps.targetGuest = tgt;
  await page.evaluate((tid) => window.__test.teleportToTable(tid), tgt.table);
  await sim(0.05);
  log.steps.actionAtTable = { a: (await st()).action, label: (await st()).actionLabel };
  // press and immediately read popup + HUD money
  const pay = await page.evaluate(() => {
    const moneyV = () => [...document.querySelectorAll('#bbq-hud *')].find((e) => /^¥\d+$/.test((e.textContent || '').trim()) && e.children.length === 0)?.textContent ?? null;
    const m0 = moneyV();
    window.__test.press();
    window.__test.tick(0.05, 2);
    const pops = [...document.querySelectorAll('#bbq-popups .popup')].map((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { text: e.textContent, cls: e.className, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0),
               fontPx: parseFloat(cs.fontSize), color: cs.color, op: cs.opacity, inView: r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight };
    });
    return { m0, m1: moneyV(), pops, state: window.__test.state() };
  });
  log.steps.serve = { before: { money: before.money, served: before.served }, after: pay.state.money, served: pay.state.served,
                      hudMoney: [pay.m0, pay.m1], popups: pay.pops, guestPhase: pay.state.customers.map((c) => c.phase) };
  await shot('port-06-serve-popup');
  // how long is the popup actually on screen (wall clock)?
  const life = { t: [] };
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(150);
    const n = await page.evaluate(() => document.querySelectorAll('#bbq-popups .popup').length);
    life.t.push([(i + 1) * 150, n]);
    if (n === 0) break;
  }
  log.steps.popupLife = life;
  save();

  // ---------- ⑥ patience → 0 → angry leave ----------
  await page.evaluate(() => { window.__test.spawnNow(); });
  for (let i = 0; i < 40; i++) {
    const seated = await page.evaluate(() => window.__game.customers.filter((c) => c.phase === 'seated').length);
    if (seated >= 1) break;
    await sim(0.5);
  }
  const preAngry = await st();
  log.steps.angryBefore = { angry: preAngry.angry, served: preAngry.served, money: preAngry.money, cust: preAngry.customers.map((c) => c.phase) };
  await page.evaluate(() => window.__test.setPatience(0.35));
  const angryWatch = await page.evaluate(() => {
    const out = { frames: 0, popups: [], angryAt: null };
    for (let i = 0; i < 200; i++) {
      window.__test.tick(0.05, 1);
      out.frames++;
      const a = window.__game.angry;
      if (a > 0 && out.angryAt === null) {
        out.angryAt = +(out.frames * 0.05).toFixed(2);
        out.popups = [...document.querySelectorAll('#bbq-popups .popup')].map((e) => {
          const r = e.getBoundingClientRect();
          return { text: e.textContent, cls: e.className, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0),
                   fontPx: parseFloat(getComputedStyle(e).fontSize), inView: r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth };
        });
        out.state = window.__test.state();
        out.cards = [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.className + '|' + c.innerText.replace(/\s+/g, ' ').trim().slice(0, 30));
        out.bubbles = document.querySelector('#bbq-bubbles')?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
        break;
      }
    }
    return out;
  });
  log.steps.angry = angryWatch;
  await shot('port-07-angry');
  // does the leaving guest actually walk out + card disappear?
  await sim(2.5);
  log.steps.afterAngry = { s: await st(), cards: await page.evaluate(() => document.querySelectorAll('#bbq-orders .card').length) };
  await shot('port-08-after-angry');
  save();

  // ---------- ⑨ rapid repeated presses ----------
  await page.evaluate(() => window.__test.start());
  await sim(0.2);
  await at('crate-pork');
  const rapidCrate = await page.evaluate(() => {
    const r = { carried: [], labels: [], money: [] };
    for (let i = 0; i < 8; i++) {
      window.__test.press(); window.__test.tick(0.02, 1);
      const s = window.__test.state();
      r.carried.push(s.carrying ? s.carrying.stage : null);
      r.labels.push(s.actionLabel);
      r.money.push(s.money);
    }
    r.final = window.__test.state();
    return r;
  });
  log.steps.rapidCrate = { carried: rapidCrate.carried, labels: rapidCrate.labels, money: rapidCrate.money, finalCarry: rapidCrate.final.carrying, chop: rapidCrate.final.chop };
  // rapid on chop (no item) then rapid on grill with skewer
  await at('chop');
  const rapidChop = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 10; i++) { window.__test.press(); window.__test.tick(0.02, 1); out.push(window.__test.state().chop); }
    return out;
  });
  log.steps.rapidChopEmpty = rapidChop;
  // full serve chain then rapid-press at grill with 8 presses
  await page.evaluate(() => window.__test.start());
  await at('crate-pork'); await act(1); await at('chop'); await act(1); await act(3); await act(1);
  await at('grill');
  const rapidGrill = await page.evaluate(() => {
    window.__test.press(); window.__test.tick(0.05, 1);
    const after1 = window.__game.grill.slots.map((s) => !!s.item);
    for (let i = 0; i < 7; i++) { window.__test.press(); window.__test.tick(0.02, 1); }
    return { after1, final: window.__game.grill.slots.map((s) => !!s.item), carry: window.__test.state().carrying };
  });
  log.steps.rapidGrill = rapidGrill;
  save();

  log.final = await st();
  log.framesEnd = await page.evaluate(() => window.__frames);
  log.perf = await page.evaluate(() => window.__perf);
  log.ok = true;
} catch (e) {
  log.fatal = String(e && e.stack || e);
} finally {
  save();
  console.log(JSON.stringify({ fatal: log.fatal, errors: log.errors, warnings: log.warnings.slice(0, 4), steps: Object.keys(log.steps), bootMs: log.bootMs, final: log.final && { money: log.final.money, served: log.final.served, angry: log.final.angry, timeLeft: log.final.timeLeft } }, null, 1));
  await browser.close().catch(() => {});
}
