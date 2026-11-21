const { chromium } = await import('/www/yunnan-bbq-house/node_modules/playwright/index.mjs');
const { mkdirSync, writeFileSync } = await import('node:fs');
const OUT = '/tmp/r11p';
mkdirSync(OUT, { recursive: true });
const log = { ts: new Date().toISOString(), out: OUT, steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-port.json`, JSON.stringify(log, null, 1));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-CN' });
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); else if (m.type() === 'warning') log.warnings.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
async function shot(name) {
  const path = `${OUT}/${name}.png`;
  try { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(data, 'base64')); }
  catch (e) { try { await page.screenshot({ path, timeout: 60000 }); } catch (e2) { log.steps[`shotFail_${name}`] = String(e2); } }
}
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.round(sec / 0.05)), s);
const st = () => page.evaluate(() => window.__test.state());
const press = () => page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
const at = async (id) => { await page.evaluate((i) => window.__test.teleportToStation(i), id); await sim(0.05); };
try {
  const t0 = Date.now();
  await page.goto('https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 60000 });
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);
    const ok = await page.evaluate(() => (window.__frames ?? 0) > 3 && !!document.querySelector('.bbq-panel button')).catch(() => false);
    if (ok) break;
  }
  log.bootMs = Date.now() - t0;
  log.frames = await page.evaluate(() => window.__frames ?? 0);
  log.sha = await page.evaluate(() => document.querySelector('meta[name=build]')?.content ?? null);
  log.steps.title = await page.evaluate(() => {
    const p = document.querySelector('.bbq-panel'); const b = p?.querySelector('button'); const r = b?.getBoundingClientRect();
    return { text: p?.innerText.replace(/\s+/g, ' ').trim() ?? null, cta: b?.textContent?.trim() ?? null,
      ctaRect: r ? [r.x | 0, r.y | 0, r.width | 0, r.height | 0] : null,
      hudStars: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')) };
  });
  save(); await shot('port-01-title');
  await page.evaluate(() => { document.querySelector('.bbq-panel button').click(); });
  await sim(0.3);
  await page.evaluate(() => window.__test.pauseSpawns(true));
  log.steps.hudStart = await page.evaluate(() => ({
    text: document.querySelector('#bbq-hud')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    starFills: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')),
    money: window.__game.money, timeLeft: +window.__game.timeLeft.toFixed(1),
    stick: (() => { const r = document.querySelector('#bbq-stick').getBoundingClientRect(); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0]; })(),
    act: (() => { const r = document.querySelector('#bbq-act').getBoundingClientRect(); return [r.x | 0, r.y | 0, r.width | 0, r.height | 0]; })(),
  }));
  save();
  await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await shot('port-02-seated');
  await page.evaluate(() => window.__test.setPatience(1.0));
  let af = null;
  for (let i = 0; i < 40; i++) {
    const f = await page.evaluate(() => {
      window.__test.tick(0.05, 1);
      const pop = [...document.querySelectorAll('#bbq-popups .popup')]; const last = pop[pop.length - 1];
      const cs = last ? getComputedStyle(last) : null; const r = last ? last.getBoundingClientRect() : null;
      return { i: 0, angry: window.__game.angry,
        cust: window.__game.customers.map((c) => ({ phase: c.phase, patience: +c.patience.toFixed(2) })),
        bubbles: [...document.querySelectorAll('#bbq-bubbles .bubble')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
        orders: [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
        popups: pop.map((p) => ({ t: p.textContent, opacity: getComputedStyle(p).opacity, fs: getComputedStyle(p).fontSize,
          w: p.getBoundingClientRect().width | 0, h: p.getBoundingClientRect().height | 0 })),
        lastPopup: last ? { t: last.textContent, opacity: cs.opacity, fs: cs.fontSize, w: r.width | 0, h: r.height | 0, x: r.x | 0, y: r.y | 0 } : null,
        hudStars: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')) };
    });
    if (f.angry >= 1) { af = { ...f, i }; break; }
  }
  log.steps.angryFrame = af; save(); await shot('port-03-angry');
  log.steps.angryRight = await page.evaluate(() => ({ money: window.__game.money, served: window.__game.served, angry: window.__game.angry,
    bubbles: [...document.querySelectorAll('#bbq-bubbles .bubble')].map((b) => b.innerText.trim()),
    orderCards: [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
    hudStars: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')) }));
  save();
  // serve with 8 rapid presses
  await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await at('crate-pork'); await press();
  await at('chop'); await press(); await sim(0.1);
  for (let i = 0; i < 3; i++) { await press(); await sim(0.1); }
  await press();
  await at('grill'); await press(); await sim(6.4);
  log.steps.grillStages = await page.evaluate(() => window.__game.grill.slots.map((s) => s.item ? s.item.stage : null));
  await press();
  await at('plate'); await press();
  const s0 = await st(); const tid = s0.customers[s0.customers.length - 1]?.table;
  await page.evaluate((t) => window.__test.teleportToTable(t), tid); await sim(0.05);
  const money0 = (await st()).money, served0 = (await st()).served;
  for (let i = 0; i < 8; i++) await press();
  const s1 = await st();
  log.steps.rapidServe = { tid, money0, served0, money1: s1.money, served1: s1.served, carrying: s1.carrying,
    popups: await page.evaluate(() => [...document.querySelectorAll('#bbq-popups .popup')].map((p) => p.textContent)) };
  save(); await shot('port-04-served');
  // settlement
  await page.evaluate(() => { window.__game.money = 300; window.__test.tick(0.05, 2); });
  await sim((await st()).timeLeft + 1.5);
  log.steps.results = await page.evaluate(() => {
    const p = document.querySelector('.bbq-panel'); const card = p.querySelector('.card'); const cr = card.getBoundingClientRect();
    return { text: p.innerText.replace(/\s+/g, ' ').trim(),
      starFills: [...p.querySelectorAll('.stars-big svg')].map((s) => s.getAttribute('fill')),
      cardRect: [cr.x | 0, cr.y | 0, cr.width | 0, cr.height | 0], scrollH: card.scrollHeight, clientH: card.clientHeight,
      buttons: [...p.querySelectorAll('button')].map((b) => b.textContent.trim()),
      state: { level: window.__game.level, money: window.__game.money, target: window.__game.cfg.target, angry: window.__game.angry, waste: window.__game.waste },
      ls: { level: localStorage.getItem('bbq.level'), best: localStorage.getItem('bbq.best') } };
  });
  save(); await shot('port-05-results');
  await page.evaluate(() => document.querySelector('.bbq-panel [data-btn="next"]')?.click());
  await sim(0.3);
  log.steps.nextLevel = await page.evaluate(() => ({ level: window.__game.level, target: window.__game.cfg.target,
    timeLeft: +window.__game.timeLeft.toFixed(1), hud: document.querySelector('#bbq-hud')?.innerText.replace(/\s+/g, ' ').trim(),
    starFills: [...document.querySelectorAll('#bbq-hud .stars svg')].map((s) => s.getAttribute('fill')),
    panelOpen: !!document.querySelector('.bbq-panel'), ls: localStorage.getItem('bbq.level') }));
  save(); await shot('port-06-lv2');
  await page.evaluate(() => { window.__game.money = 0; window.__test.tick(0.05, 2); });
  await sim((await st()).timeLeft + 1.5);
  log.steps.resultsFail = await page.evaluate(() => {
    const p = document.querySelector('.bbq-panel');
    return { text: p?.innerText.replace(/\s+/g, ' ').trim() ?? null, buttons: [...(p?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim()),
      starFills: [...(p?.querySelectorAll('.stars-big svg') ?? [])].map((s) => s.getAttribute('fill')) };
  });
  save(); await shot('port-07-results-fail');
  await page.evaluate(() => document.querySelector('.bbq-panel [data-btn="replay"]').click());
  await sim(0.3);
  log.steps.replay = await page.evaluate(() => ({ level: window.__game.level, target: window.__game.cfg.target, money: window.__game.money,
    timeLeft: +window.__game.timeLeft.toFixed(1), phase: window.__game.phase, panelOpen: !!document.querySelector('.bbq-panel'), ls: localStorage.getItem('bbq.level') }));
  save(); await shot('port-08-replay');
  log.perf = await page.evaluate(() => ({ calls: window.__perf.calls, tris: window.__perf.tris, frames: window.__frames }));
} catch (e) { log.fatal = String(e); }
save(); await browser.close().catch(() => {});
console.log('DONE', log.fatal ?? 'ok', log.errors.length);
