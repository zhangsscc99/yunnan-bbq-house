// Round 10 / part B — portrait: correct-dish serve → pay (HUD + popup + eating), wrong-dish feedback, size of feed.
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');
const TS = process.argv[2] ?? 'run';
const OUT = `e2e/review/${TS}`;
mkdirSync(OUT, { recursive: true });
const log = { ts: new Date().toISOString(), part: 'portB', steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-portb.json`, JSON.stringify(log, null, 1));

const browser = await chromium.launch({ headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-CN' });
page.on('pageerror', (e) => log.errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); else if (m.type() === 'warning') log.warnings.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
async function shot(name) {
  try { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64')); }
  catch { try { await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 60000 }); } catch (e) { log.steps[`shotFail_${name}`] = String(e); } }
}
const sim = (s) => page.evaluate((sec) => window.__test.tick(0.05, Math.round(sec / 0.05)), s);
const st = () => page.evaluate(() => window.__test.state());
async function act(n = 1) { await page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__test.press(); window.__test.tick(0.05, 2); } }, n); }
const at = async (id) => { await page.evaluate((i) => window.__test.teleportToStation(i), id); await sim(0.05); };

try {
  const t0 = Date.now();
  await page.goto('https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 60000 });
  let frames = 0;
  for (let i = 0; i < 120 && frames <= 20; i++) { await page.waitForTimeout(1000); frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0); }
  log.bootMs = Date.now() - t0;
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });
  await sim(0.3);
  const okSpawn = await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  log.steps.guest = await page.evaluate(() => window.__game.customers.map((c) => ({ dish: c.dish, phase: c.phase, patience: +c.patience.toFixed(1) })));
  // build pork skewer, cooked, plate, serve
  await at('crate-pork'); await act(1);
  await at('chop'); await act(1); await act(3); await act(1);
  await at('grill'); await act(1);
  await sim(6.4);
  await at('grill'); await act(1);
  await at('plate'); await act(1);
  const tgt = await page.evaluate(() => { const c = window.__game.customers.find((x) => x.phase === 'seated'); return c ? c.table : null; });
  await page.evaluate((tid) => window.__test.teleportToTable(tid), tgt);
  await sim(0.05);
  log.steps.atTable = { a: (await st()).action, label: (await st()).actionLabel, carry: (await st()).carrying };
  const pay = await page.evaluate(() => {
    const hudMoney = () => [...document.querySelectorAll('#bbq-hud *')].filter((e) => e.children.length === 0 && /^¥-?\d+$/.test((e.textContent || '').trim())).map((e) => e.textContent.trim());
    const m0 = hudMoney();
    window.__test.press(); window.__test.tick(0.05, 2);
    const pops = [...document.querySelectorAll('#bbq-popups .popup')].map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { text: e.textContent, cls: e.className, box: [r.x | 0, r.y | 0, r.width | 0, r.height | 0], fontPx: parseFloat(cs.fontSize), color: cs.color,
               op: cs.opacity, tf: cs.transform, inView: r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight };
    });
    return { m0, m1: hudMoney(), pops, s: window.__test.state() };
  });
  log.steps.serve = { moneyBefore: 0, moneyAfter: pay.s.money, served: pay.s.served, hudMoney: [pay.m0, pay.m1], pops: pay.pops,
                      guest: pay.s.customers.map((c) => ({ dish: c.dish, phase: c.phase, patience: +c.patience.toFixed(1) })) };
  log.steps.serve.cards = await page.evaluate(() => [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
  await shot('port-09-pay');
  // popup lifetime in wall clock
  const life = [];
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(150); const n = await page.evaluate(() => document.querySelectorAll('#bbq-popups .popup').length); life.push([(i + 1) * 150, n]); if (!n) break; }
  log.steps.popupLife = life;
  // guest eats 3s then leaves happy
  await sim(3.4);
  log.steps.afterEat = { s: (await st()).customers.map((c) => c.phase), money: (await st()).money, cards: await page.evaluate(() => document.querySelectorAll('#bbq-orders .card').length) };
  await sim(3);
  log.steps.afterLeave = { cust: (await st()).customers.length, table: await page.evaluate(() => window.__game.tables.map((t) => ({ id: t.id, guest: !!t.guest, cd: +t.cooldown.toFixed(1) }))) };

  // wrong-dish: new guest wants mushroom, we hold cooked pork
  await page.evaluate(() => { window.__test.spawnNow('mush'); });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await at('crate-pork'); await act(1); await at('chop'); await act(1); await act(3); await act(1); await at('grill'); await act(1);
  await sim(6.4); await at('grill'); await act(1); await at('plate'); await act(1);
  const t2 = await page.evaluate(() => { const c = window.__game.customers.find((x) => x.phase === 'seated'); return c ? { table: c.table, dish: c.dish } : null; });
  await page.evaluate((tid) => window.__test.teleportToTable(tid), t2.table);
  await sim(0.05);
  const wrong = await page.evaluate(() => {
    const before = { a: window.__test.state().action, label: window.__test.state().actionLabel, pops: document.querySelectorAll('#bbq-popups .popup').length };
    window.__test.press(); window.__test.tick(0.05, 2);
    const s = window.__test.state();
    return { before, after: { a: s.action, label: s.actionLabel, carrying: s.carrying, money: s.money, served: s.served, guest: s.customers.map((c) => c.phase) },
             pops: [...document.querySelectorAll('#bbq-popups .popup')].map((e) => ({ text: e.textContent, box: [e.getBoundingClientRect().x | 0, e.getBoundingClientRect().y | 0, e.getBoundingClientRect().width | 0, e.getBoundingClientRect().height | 0] })),
             hints: [...document.querySelectorAll('#bbq-hud .hint, #bbq-toast')].map((e) => e.textContent) };
  });
  log.steps.wrongDish = { guestWants: t2.dish, ...wrong };
  await shot('port-10-wrongdish');
  // 6 more presses: any duplicated payout?
  const spam = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 6; i++) { window.__test.press(); window.__test.tick(0.05, 1); out.push({ money: window.__test.state().money, served: window.__test.state().served, carry: window.__test.state().carrying?.stage ?? null }); }
    return out;
  });
  log.steps.wrongDishSpam = spam;
  log.ok = true;
} catch (e) { log.fatal = String((e && e.stack) || e); }
finally {
  save();
  console.log(JSON.stringify({ fatal: log.fatal, errors: log.errors, bootMs: log.bootMs,
    serve: log.steps.serve && { money: log.steps.serve.moneyAfter, served: log.steps.serve.served, hud: log.steps.serve.hudMoney, pops: log.steps.serve.pops, life: log.steps.popupLife, guest: log.steps.serve.guest },
    afterEat: log.steps.afterEat, wrongDish: log.steps.wrongDish && { at: log.steps.atTable, before: log.steps.wrongDish.before, after: log.steps.wrongDish.after, pops: log.steps.wrongDish.pops },
    spam: log.steps.wrongDishSpam }, null, 1));
  await browser.close().catch(() => {});
}
