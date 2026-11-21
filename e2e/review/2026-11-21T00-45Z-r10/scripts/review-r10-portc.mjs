// Round 10 / part C — ⑤ correct-serve payout popup (measurable size + real lifetime),
// wrong-dish feedback, and ④ skewer on-screen pixel size / colour change.
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');
const TS = process.argv[2] ?? 'run';
const OUT = `e2e/review/${TS}`;
mkdirSync(OUT, { recursive: true });
const log = { ts: new Date().toISOString(), part: 'portC', steps: {}, errors: [], warnings: [] };
const save = () => writeFileSync(`${OUT}/run-portc.json`, JSON.stringify(log, null, 1));
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

async function cookAndPlate(dish) {
  await at(`crate-${dish === 'pork' ? 'pork' : dish === 'mushroom' ? 'mush' : 'mix'}`); await act(1);
  await at('chop'); await act(1); await act(3); await act(1);
  await at('grill'); await act(1);
  await sim(6.4);
}
async function takePlateServe() {
  await at('grill'); await act(1);
  await at('plate'); await act(1);
  const t = await page.evaluate(() => { const c = window.__game.customers.find((x) => x.phase === 'seated'); return c ? c.table : null; });
  await page.evaluate((tid) => window.__test.teleportToTable(tid), t);
  await sim(0.05);
}

try {
  const t0 = Date.now();
  await page.goto('https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 60000 });
  let frames = 0;
  for (let i = 0; i < 120 && frames <= 20; i++) { await page.waitForTimeout(1000); frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0); }
  log.bootMs = Date.now() - t0;
  await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); });

  // ---- ④ skewer on-screen size + colour while cooking ----
  await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await cookAndPlate('pork');
  const skewer = await page.evaluate(() => {
    const slot = window.__game.grill.slots.find((s) => s.item);
    const o = slot?.item?.obj;
    if (!o) return { err: 'no obj on slot' };
    o.updateWorldMatrix(true, true);
    const THREEBox = o.geometry ? o : null;
    // world-space bbox via traversal
    let min = { x: 1e9, y: 1e9, z: 1e9 }, max = { x: -1e9, y: -1e9, z: -1e9 };
    o.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      n.geometry.computeBoundingBox();
      const bb = n.geometry.boundingBox;
      for (const cx of [bb.min.x, bb.max.x]) for (const cy of [bb.min.y, bb.max.y]) for (const cz of [bb.min.z, bb.max.z]) {
        const v = n.localToWorld(new (n.position.constructor)(cx, cy, cz));
        min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
        max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
      }
    });
    // project to screen using the render camera (exposed through hud? fall back to __game.camera)
    const cam = window.__game.camera || (window.__game.player && window.__game.player.obj && null);
    return { worldSize: { x: +(max.x - min.x).toFixed(3), y: +(max.y - min.y).toFixed(3), z: +(max.z - min.z).toFixed(3) },
             stage: slot.item.stage, hex: slot.hex, hasCam: !!cam, meshes: (() => { let k = 0; o.traverse((n) => { if (n.isMesh) k++; }); return k; })() };
  });
  log.steps.skewer = skewer;
  const before = await page.evaluate(() => window.__game.grill.slots.find((s) => s.item)?.hex);
  await sim(0.4);
  const rawHex = await page.evaluate(() => window.__game.grill.slots.find((s) => s.item)?.hex);
  log.steps.hexRaw = rawHex;
  await shot('port-11-cook-raw');
  await sim(6);
  const cookedHex = await page.evaluate(() => window.__game.grill.slots.find((s) => s.item)?.hex);
  log.steps.hexCooked = cookedHex;
  await shot('port-12-cook-done');
  save();

  // ---- ⑤ correct serve: popup size + lifetime sampled every 100ms ----
  await page.evaluate(() => window.__test.start());
  await page.evaluate(() => window.__test.pauseSpawns(true));
  await page.evaluate(() => window.__test.spawnNow('pork'));
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  await cookAndPlate('pork');
  await takePlateServe();
  log.steps.serveAction = { a: (await st()).action, label: (await st()).actionLabel };
  const t1 = Date.now();
  await page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
  const samples = [];
  for (let i = 0; i < 14; i++) {
    const s = await page.evaluate(() => {
      const e = document.querySelector('#bbq-popups .popup');
      if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { text: e.textContent, box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], op: cs.opacity, tf: cs.transform,
               fontPx: parseFloat(cs.fontSize), overflow: r.x < 0 || r.y < 0 || r.x + r.width > innerWidth || r.y + r.height > innerHeight };
    });
    samples.push({ ms: Date.now() - t1, s });
    if (i === 0) await shot('port-13-pay0ms');
    if (i === 2) await shot('port-14-pay200ms');
    await page.waitForTimeout(100);
  }
  log.steps.popupSamples = samples;
  log.steps.payState = { money: (await st()).money, served: (await st()).served };
  await sim(3.4);
  log.steps.eatDone = { cust: (await st()).customers.length };
  save();

  // ---- wrong dish: guest wants mushroom, we bring pork ----
  await page.evaluate(() => { window.__test.spawnNow('mushroom'); });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__game.customers.some((c) => c.phase === 'seated'))) break; await sim(0.5); }
  const guest = await page.evaluate(() => window.__game.customers.map((c) => ({ dish: c.dish, phase: c.phase })));
  await cookAndPlate('pork');
  await takePlateServe();
  const wrong = await page.evaluate(() => {
    const before = { a: window.__test.state().action, label: window.__test.state().actionLabel };
    const m0 = window.__test.state().money;
    window.__test.press(); window.__test.tick(0.05, 2);
    const s = window.__test.state();
    return { before, m0, money: s.money, served: s.served, carry: s.carrying, guest: s.customers.map((c) => c.phase),
             pops: [...document.querySelectorAll('#bbq-popups .popup')].map((e) => ({ text: e.textContent, cls: e.className, box: [e.getBoundingClientRect().x | 0, e.getBoundingClientRect().y | 0, e.getBoundingClientRect().width | 0, e.getBoundingClientRect().height | 0] })),
             hudHint: [...document.querySelectorAll('#bbq-hud > *')].map((e) => e.id + ':' + (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)).filter((x) => x.length > 5) };
  });
  log.steps.wrongDish = { guest, ...wrong };
  await shot('port-15-wrongdish');
  const spam = [];
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 1); });
    const s = await st();
    spam.push({ money: s.money, served: s.served, carry: s.carrying?.stage ?? null, label: s.actionLabel });
  }
  log.steps.wrongSpam = spam;
  await shot('port-16-wrongdish-spam');
  log.ok = true;
} catch (e) { log.fatal = String((e && e.stack) || e); }
finally {
  save();
  console.log(JSON.stringify({ fatal: log.fatal, errors: log.errors, bootMs: log.bootMs, skewer: log.steps.skewer, hex: [log.steps.hexRaw, log.steps.hexCooked],
    popup: (log.steps.popupSamples || []).map((x) => [x.ms, x.s && x.s.text, x.s && x.s.box, x.s && x.s.op]), pay: log.steps.payState,
    wrong: log.steps.wrongDish && { before: log.steps.wrongDish.before, after: { money: log.steps.wrongDish.money, served: log.steps.wrongDish.served, carry: log.steps.wrongDish.carry, guest: log.steps.wrongDish.guest }, pops: log.steps.wrongDish.pops },
    spam: log.steps.wrongSpam }, null, 1));
  await browser.close().catch(() => {});
}
