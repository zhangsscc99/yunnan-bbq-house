// Round 10 walkthrough — landscape 844x390 (④ grill visuals, ⑤ pay popup, ⑥ angry, ③ HUD in landscape).
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');

const TS = process.argv[2] ?? 'run';
const OUT = `e2e/review/${TS}`;
mkdirSync(OUT, { recursive: true });
const BASE = 'https://openfolio.uk/bbq/';
const log = { ts: new Date().toISOString(), out: OUT, steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-land.json`, JSON.stringify(log, null, 1));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-CN' });
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); else if (m.type() === 'warning') log.warnings.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
async function shot(name) {
  const path = `${OUT}/${name}.png`;
  try { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(data, 'base64')); }
  catch { try { await page.screenshot({ path, timeout: 60000 }); } catch (e) { log.steps[`shotFail_${name}`] = String(e); } }
  return path;
}
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.round(sec / 0.05)), s);
const st = () => page.evaluate(() => window.__test.state());
async function act(n = 1) { await page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n); }
const at = async (id) => { await page.evaluate((i) => window.__test.teleportToStation(i), id); await sim(0.05); };

try {
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'commit', timeout: 60000 });
  let frames = 0;
  for (let i = 0; i < 120 && frames <= 20; i++) { await page.waitForTimeout(1000); frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0); }
  log.bootMs = Date.now() - t0; log.frames = frames;
  save();
  await shot('land-01-entry');
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
  await sim(0.4);
  log.steps.hudGeom = await page.evaluate(() => {
    const pick = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0]; };
    return { stick: pick('#bbq-stick'), act: pick('#bbq-act'), orders: pick('#bbq-orders'), status: pick('#bbq-status'),
             statusByText: (() => { const e = [...document.querySelectorAll('#bbq-hud *')].find((x) => /营业额/.test(x.textContent) && x.children.length <= 4); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0, e.innerText.replace(/\s+/g, ' ').trim()]; })() };
  });
  await page.evaluate(() => window.__test.spawnNow());
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await shot('land-02-seated');
  // grill a skewer to cooked, screenshot mid + cooked
  await at('crate-pork'); await act(1); await at('chop'); await act(1); await act(3); await act(1);
  await at('grill'); await act(1);
  await sim(3.2);
  log.steps.grillMid = await page.evaluate(() => {
    const root = document.querySelector('#bbq-grillbars .gb'); if (!root) return null;
    const r = root.getBoundingClientRect(); const bar = root.querySelector('.gb-bar').getBoundingClientRect();
    const slot = window.__game.grill.slots.find((s) => s.item);
    return { text: root.querySelector('.gb-txt')?.textContent, box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], bar: [bar.width, bar.height], hex: slot?.hex, t: slot?.item ? +slot.item.grillT.toFixed(2) : null };
  });
  await shot('land-03-grill-mid');
  await sim(3.4);
  log.steps.grillCooked = await page.evaluate(() => {
    const root = document.querySelector('#bbq-grillbars .gb'); if (!root) return null;
    return { text: root.querySelector('.gb-txt')?.textContent, hex: window.__game.grill.slots.find((s) => s.item)?.hex };
  });
  await shot('land-04-grill-cooked');
  // take → plate → serve
  await at('grill'); await act(1); await at('plate'); await act(1);
  const tgt = await page.evaluate(() => { const c = window.__game.customers.find((x) => x.phase === 'seated'); return c ? { table: c.table, patience: +c.patience.toFixed(1) } : null; });
  log.steps.targetGuest = tgt;
  await page.evaluate((tid) => window.__test.teleportToTable(tid), tgt.table);
  await sim(0.05);
  const pay = await page.evaluate(() => {
    window.__test.press(); window.__test.tick(0.05, 2);
    const pops = [...document.querySelectorAll('#bbq-popups .popup')].map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { text: e.textContent, cls: e.className, box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], fontPx: parseFloat(cs.fontSize), color: cs.color,
               inView: r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight };
    });
    return { pops, money: window.__test.state().money, served: window.__test.state().served };
  });
  log.steps.serve = pay;
  await shot('land-05-serve-popup');
  // angry path
  await page.evaluate(() => window.__test.spawnNow());
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await page.evaluate(() => window.__test.setPatience(0.3));
  const angry = await page.evaluate(() => {
    for (let i = 0; i < 200; i++) {
      window.__test.tick(0.05, 1);
      if (window.__game.angry > 0) {
        return { simSec: +((i + 1) * 0.05).toFixed(2), angry: window.__game.angry,
          pops: [...document.querySelectorAll('#bbq-popups .popup')].map((e) => { const r = e.getBoundingClientRect();
            return { text: e.textContent, cls: e.className, box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], inView: r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight }; }),
          cards: document.querySelectorAll('#bbq-orders .card').length, bubb: document.querySelector('#bbq-bubbles')?.innerText?.replace(/\s+/g, ' ').trim() ?? '' };
      }
    }
    return null;
  });
  log.steps.angry = angry;
  await shot('land-06-angry');
  await sim(3);
  log.steps.afterAngry = await st();
  await shot('land-07-after');
  log.perf = await page.evaluate(() => window.__perf);
  log.ok = true;
} catch (e) { log.fatal = String(e && e.stack || e); }
finally {
  save();
  console.log(JSON.stringify({ fatal: log.fatal, errors: log.errors, warnings: log.warnings.slice(0, 3), steps: Object.keys(log.steps), bootMs: log.bootMs }, null, 1));
  await browser.close().catch(() => {});
}
