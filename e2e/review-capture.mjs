// Compact capture: 6 stills per viewport into OUT (outside repo to survive git clean).
const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync } = await import('node:fs');
const OUT = process.env.OUT;
const TAG = process.env.VIEW;
const VP = TAG === 'land' ? { width: 844, height: 390 } : { width: 390, height: 844 };
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: VP });
const errors = []; const warns = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
const shot = async (n) => {
  const p = `${OUT}/${TAG}-${n}.png`;
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(p, Buffer.from(data, 'base64'));
  return p;
};
const st = () => page.evaluate(() => window.__test.state());
const sim = (s) => page.evaluate(`window.__test.tick(0.05, ${Math.ceil(s / 0.05)})`);
const press = () => page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });
const R = { shots: [], errors, warns };

await page.goto(process.env.BBQ_URL ?? 'https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 30000 });
for (let i = 0; i < 70; i++) { if (await page.evaluate(() => !!document.querySelector('.bbq-panel button')).catch(() => false)) break; await sleep(200); }
await sleep(1200);
R.shots.push(await shot('01-title'));
R.titleText = await page.evaluate(() => document.querySelector('.bbq-panel .card')?.innerText ?? null);
await page.evaluate(() => document.querySelector('.bbq-panel button').click());
await sleep(900);

// joystick drag (real pointer)
const sr = await page.evaluate(() => { const r = document.querySelector('#bbq-stick').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
await page.mouse.move(sr.x + sr.w / 2, sr.y + sr.h / 2);
await page.mouse.down();
await page.mouse.move(sr.x + sr.w / 2 + 58, sr.y + sr.h / 2, { steps: 5 });
await sleep(700);
R.shots.push(await shot('02-joystick'));
await page.mouse.up();
await sleep(400);

// chop mid
await page.evaluate(() => window.__test.teleportToStation('crate-pork')); await sleep(400); await press(); await sleep(300);
await page.evaluate(() => window.__test.teleportToStation('chop')); await sleep(500); await press(); await sleep(400); await press(); await sleep(400);
R.shots.push(await shot('03-chop-mid'));
R.chopMid = (await st()).chop;

// grill cooked
for (let i = 0; i < 2; i++) { await press(); await sleep(400); }
R.chopDone = (await st()).chop;
await press(); await sleep(400);
R.carry = (await st()).carrying;
await page.evaluate(() => window.__test.teleportToStation('grill')); await sleep(500);
R.atGrill = await page.evaluate(() => ({ a: window.__test.state().action, l: window.__test.state().actionLabel }));
await press(); await sleep(400);
R.grill0 = (await st()).grill;
R.shots.push(await shot('04-grill-raw'));
await sim(3.2); R.grill3 = (await st()).grill;
R.shots.push(await shot('05-grill-t3'));
await sim(3.4); R.grill65 = (await st()).grill;
R.shots.push(await shot('06-grill-cooked'));

// orders during wait
await page.evaluate(() => { window.__test.start(); window.__test.pauseSpawns(true); }); await sleep(500);
await page.evaluate(() => window.__test.spawnNow('pork')); await sim(1.5);
R.orders = await page.evaluate(() => ({ cards: document.querySelectorAll('#bbq-orders .card').length, txt: [...document.querySelectorAll('#bbq-orders .card')].map((c) => c.innerText.replace(/\n/g, ' ')) }));
R.shots.push(await shot('07-orders-wait'));

// results
await page.evaluate(() => { window.__game.money = 200; window.__game.timeLeft = 0.05; }); await sim(0.6);
R.results = await page.evaluate(() => ({ phase: window.__test.state().phase, verdict: document.querySelector('.bbq-panel .verdict')?.innerText ?? null, btns: [...document.querySelectorAll('.bbq-panel button')].map((b) => b.innerText.trim()) }));
R.shots.push(await shot('08-results'));

writeFileSync(`${OUT}/run-${TAG}.json`, JSON.stringify(R, null, 2));
console.log(TAG, 'ok', R.shots.length);
await browser.close();
