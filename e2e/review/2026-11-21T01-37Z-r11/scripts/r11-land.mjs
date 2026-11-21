const { chromium } = await import('/www/yunnan-bbq-house/node_modules/playwright/index.mjs');
const { mkdirSync, writeFileSync } = await import('node:fs');
const OUT = '/tmp/r11p';
const log = { ts: new Date().toISOString(), steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-land.json`, JSON.stringify(log, null, 1));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-CN' });
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); else if (m.type() === 'warning') log.warnings.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
async function shot(n) { const p = `${OUT}/${n}.png`;
  try { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(p, Buffer.from(data, 'base64')); }
  catch (e) { try { await page.screenshot({ path: p, timeout: 60000 }); } catch (e2) { log.steps[`shotFail_${n}`] = String(e2); } } }
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.round(sec / 0.05)), s);
try {
  await page.goto('https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 60000 });
  for (let i = 0; i < 120; i++) { await page.waitForTimeout(1000);
    if (await page.evaluate(() => (window.__frames ?? 0) > 3 && !!document.querySelector('.bbq-panel button')).catch(() => false)) break; }
  log.steps.title = await page.evaluate(() => { const p = document.querySelector('.bbq-panel'); const c = p?.querySelector('.card'); const r = c?.getBoundingClientRect();
    return { text: p?.innerText.replace(/\s+/g, ' ').trim(), cardRect: r ? [r.x | 0, r.y | 0, r.width | 0, r.height | 0] : null, scrollH: c?.scrollHeight, clientH: c?.clientHeight }; });
  save(); await shot('land2-01-title');
  await page.evaluate(() => { document.querySelector('.bbq-panel button').click(); window.__test.pauseSpawns(true); });
  await sim(0.3);
  const corners = [['NE', 5, -4], ['NW', -5, -4], ['SW', -5, 4], ['SE', 5, 4]];
  for (const [n, x, z] of corners) {
    await page.evaluate(([a, b]) => window.__test.teleport(a, b), [x, z]);
    await sim(2.2);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await shot(`land2-02-${n}`);
  }
  await page.evaluate(() => window.__test.teleport(-2.5, 0)); await sim(1.0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await shot('land2-03-spawn');
  // angry
  await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await page.evaluate(() => window.__test.setPatience(0.8));
  let af = null;
  for (let i = 0; i < 30; i++) {
    const f = await page.evaluate(() => { window.__test.tick(0.05, 1);
      const pop = [...document.querySelectorAll('#bbq-popups .popup')]; const last = pop[pop.length - 1];
      return { angry: window.__game.angry, bubbles: [...document.querySelectorAll('#bbq-bubbles .bubble')].map((b) => b.innerText.trim()),
        popup: last ? { t: last.textContent, o: getComputedStyle(last).opacity, w: last.getBoundingClientRect().width | 0, h: last.getBoundingClientRect().height | 0 } : null,
        stars: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')) }; });
    if (f.angry >= 1) { af = f; break; }
  }
  log.steps.angry = af; save(); await shot('land2-04-angry');
  // results
  await page.evaluate(() => { window.__game.money = 300; window.__test.tick(0.05, 2); });
  await sim((await page.evaluate(() => window.__game.timeLeft)) + 1.5);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  log.steps.results = await page.evaluate(() => { const p = document.querySelector('.bbq-panel'); const c = p.querySelector('.card'); const r = c.getBoundingClientRect();
    return { text: p.innerText.replace(/\s+/g, ' ').trim(), stars: [...p.querySelectorAll('.stars-big svg')].map((s) => s.getAttribute('fill')),
      cardRect: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], scrollH: c.scrollHeight, clientH: c.clientHeight,
      buttons: [...p.querySelectorAll('button')].map((b) => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), r: [q.x | 0, q.y | 0, q.width | 0, q.height | 0] }; }) }; });
  save(); await shot('land2-05-results');
  log.perf = await page.evaluate(() => ({ calls: window.__perf.calls, tris: window.__perf.tris, frames: window.__frames }));
} catch (e) { log.fatal = String(e); }
save(); await browser.close().catch(() => {});
console.log('DONE', log.fatal ?? 'ok', log.errors.length);
