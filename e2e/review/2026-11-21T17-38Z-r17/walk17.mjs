// Round 17 walkthrough: ① first-screen clarity, ② movement (joystick + keys),
// ⑥ patience -> 0 => angry leave, ⑦ settlement panel + replay button, ⑧ HUD geometry.
// Runs against the PUBLIC url (what users see). Screenshots + JSON to OUT.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.OUT;
const TAG = process.env.VIEW;
const VP = TAG === 'land' ? { width: 844, height: 390 } : { width: 390, height: 844 };
const URL = process.env.BBQ_URL ?? 'https://openfolio.uk/bbq/';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pw = await import('/www/yunnan-bbq-house/node_modules/playwright/index.js');
const { chromium } = pw.default ?? pw;
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1, hasTouch: TAG !== 'land' });
const page = await ctx.newPage();
const errors = [], warns = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
const cdp = await ctx.newCDPSession(page);
const shot = async (n) => {
  const p = `${OUT}/${TAG}-${n}.png`;
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(p, Buffer.from(data, 'base64'));
    R.shots.push(p);
    return p;
  } catch (e) {
    R.shotFails = R.shotFails || [];
    R.shotFails.push({ n, err: String(e).slice(0, 120) });
    return null;
  }
};
page.on('crash', () => { R.crashed = true; });
const st = () => page.evaluate(() => window.__test.state());
const sim = (s) => page.evaluate((x) => window.__test.tick(0.05, Math.ceil(x / 0.05)), s);
const press = () => page.evaluate(() => { window.__test.press(); window.__test.tick(0.05, 2); });

const R = { tag: TAG, url: URL, viewport: VP, shots: [], errors, warns, t: {} };
const T0 = Date.now();
const mark = (k) => { R.t[k] = Date.now() - T0; };

// ---- ① title screen -------------------------------------------------------
const nav0 = Date.now();
await page.goto(URL, { waitUntil: 'commit', timeout: 60000 });
let readyMs = null;
for (let i = 0; i < 120; i++) {
  const ok = await page.evaluate(() => !!document.querySelector('.bbq-panel button')).catch(() => false);
  if (ok) { readyMs = Date.now() - nav0; break; }
  await sleep(250);
}
R.readyMs = readyMs;
await sleep(1500);
R.build = await page.evaluate(() => window.__build ?? null);
R.title = await page.evaluate(() => {
  const p = document.querySelector('.bbq-panel');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return {
    text: p.innerText.replace(/\s+\n/g, '\n').trim(),
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    buttons: [...p.querySelectorAll('button')].map((b) => {
      const br = b.getBoundingClientRect();
      return { label: b.innerText.trim(), w: br.width, h: br.height, cx: br.x + br.width / 2, cy: br.y + br.height / 2 };
    }),
    overlayVisible: getComputedStyle(p).display !== 'none' && getComputedStyle(p).opacity !== '0',
  };
});
await shot('01-title');
mark('title');

// ---- ② start + movement ---------------------------------------------------
await page.evaluate(() => document.querySelector('.bbq-panel button').click());
await sleep(1200);
R.afterStart = await page.evaluate(() => ({
  overlay: (() => { const p = document.querySelector('.bbq-panel'); if (!p) return 'gone'; const s = getComputedStyle(p); return { display: s.display, opacity: s.opacity, pe: s.pointerEvents, text: p.innerText.slice(0, 60) }; })(),
  phase: window.__test.state().phase,
  player: window.__test.state().player,
  label: window.__test.state().actionLabel,
}));

// real pointer drag on the joystick (toward +x on screen)
const sr = await page.evaluate(() => { const r = document.querySelector('#bbq-stick').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const before = (await st()).player;
await page.mouse.move(sr.x + sr.w / 2, sr.y + sr.h / 2);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(sr.x + sr.w / 2 + (sr.w / 2 - 6) * i / 8, sr.y + sr.h / 2, { steps: 2 }); await sleep(70); }
await sleep(1400);
await page.mouse.up();
const afterDrag = (await st()).player;
R.move = {
  stickRect: sr,
  before, afterDrag,
  dx: +(afterDrag.x - before.x).toFixed(2),
  dz: +(afterDrag.z - before.z).toFixed(2),
  moved: Math.hypot(afterDrag.x - before.x, afterDrag.z - before.z) > 0.3,
};
await shot('02-joystick');

// keyboard fallback (desktop parity)
const kb0 = (await st()).player;
await page.keyboard.down('w'); await sleep(900); await page.keyboard.up('w');
await sleep(300);
const kb1 = (await st()).player;
R.keys = { from: kb0, to: kb1, dz: +(kb1.z - kb0.z).toFixed(2), moved: Math.hypot(kb1.x - kb0.x, kb1.z - kb0.z) > 0.2 };
mark('movement');

// ---- ⑥ patience -> 0 : angry leave + satisfaction -------------------------
await page.evaluate(() => { window.__test.pauseSpawns(true); window.__test.spawnNow('pork'); });
await sim(2.0);
R.six = { before: (await st()) };
R.six.beforeMoney = R.six.before.money;
R.six.beforeAngry = R.six.before.angry;
R.six.customer0 = R.six.before.customers.map((c) => ({ phase: c.phase, patience: +c.patience.toFixed(1) }));

// drain patience to ~0 and watch what happens frame by frame
await page.evaluate(() => window.__test.setPatience(0.6));
const trail = [];
for (let i = 0; i < 24; i++) {
  await sim(0.5);
  const s = await st();
  trail.push({
    t: i * 0.5,
    phase: s.phase,
    customers: s.customers.map((c) => ({ ph: c.phase, pat: +c.patience.toFixed(1), x: c.x, z: c.z })),
    angry: s.angry, money: s.money, served: s.served,
    bubble: await page.evaluate(() => {
      const b = document.querySelector('#bbq-bubbles');
      return b ? b.children.length : null;
    }),
  });
  if (i === 3) await shot('03-patience-low');
  const gone = (await st()).customers.length === 0;
  if (gone) { R.six.leaveAt = i * 0.5; break; }
}
R.six.trail = trail;
await shot('04-angry-after');
R.six.after = await st();
R.six.deltaAngry = R.six.after.angry - R.six.beforeAngry;

// ---- ⑦ settlement panel ---------------------------------------------------
await page.evaluate(() => { window.__test.pauseSpawns(true); });
// earn something so the panel has non-trivial numbers
await page.evaluate(() => { window.__game.money = 61; window.__game.served = 1; window.__game.waste = 2; window.__game.timeLeft = 0.05; });
await sim(0.8);
await sleep(900);
R.seven = await page.evaluate(() => {
  const p = document.querySelector('.bbq-panel');
  if (!p) return { panel: null, phase: window.__test.state().phase };
  const s = window.__test.state();
  return {
    panel: p.innerText.replace(/\n{2,}/g, '\n').trim(),
    phase: s.phase, money: s.money, served: s.served, waste: s.waste, angry: s.angry,
    buttons: [...p.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { label: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height) };
    }),
    overlay: (() => { const cs = getComputedStyle(p); return { display: cs.display, opacity: cs.opacity, pe: cs.pointerEvents }; })(),
    stars: [...p.querySelectorAll('*')].filter((e) => /★|☆/.test(e.textContent || '') && e.children.length === 0).map((e) => e.textContent.trim()).slice(0, 8),
  };
});
await shot('05-results');
mark('results');

// replay / next level button really works
const btn = await page.evaluate(() => {
  const bs = [...document.querySelectorAll('.bbq-panel button')];
  const b = bs.find((x) => /重玩|下一关|再来/.test(x.innerText)) || bs[0];
  return b ? b.innerText.trim() : null;
});
R.seven.clicked = btn;
if (btn) {
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('.bbq-panel button')];
    (bs.find((x) => /重玩|下一关|再来/.test(x.innerText)) || bs[0]).click();
  });
  await sleep(1500);
  R.seven.afterClick = await page.evaluate(() => {
    const p = document.querySelector('.bbq-panel');
    const s = window.__test.state();
    return {
      phase: s.phase, money: s.money, timeLeft: +s.timeLeft.toFixed(1), served: s.served, level: s.level,
      overlay: p ? getComputedStyle(p).display : 'gone',
      label: s.actionLabel,
    };
  });
  await sleep(600);
  await shot('06-after-replay');
}

// ---- ⑧ HUD geometry -------------------------------------------------------
R.hud = await page.evaluate(() => {
  const ids = ['#bbq-topbar', '#bbq-orders', '#bbq-stick', '#bbq-act', '#bbq-guide'];
  const vw = innerWidth, vh = innerHeight;
  const boxes = [];
  for (const id of ids) {
    const e = document.querySelector(id);
    if (!e) { boxes.push({ id, missing: true }); continue; }
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    boxes.push({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, out: r.x < -1 || r.y < -1 || r.right > vw + 1 || r.bottom > vh + 1 });
  }
  const overlaps = [];
  const solid = boxes.filter((b) => !b.missing && b.disp !== 'none');
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = solid[i], b = solid[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0) overlaps.push({ a: a.id, b: b.id, ox, oy });
  }
  const fonts = {};
  for (const sel of ['.card .nm', '.card .pr', '.card .k', '.pr', '.k', '#bbq-orders .card']) {
    const e = document.querySelector(sel);
    if (e) fonts[sel] = getComputedStyle(e).fontSize;
  }
  return { vw, vh, boxes, overlaps, fonts };
});

R.errorsFinal = errors.slice(0, 40);
R.warnCount = warns.length;
R.warnSample = [...new Set(warns.map((w) => w.slice(0, 120)))].slice(0, 6);
writeFileSync(`${OUT}/run-${TAG}.json`, JSON.stringify(R, null, 2));
console.log(TAG, 'OK', 'shots=' + R.shots.length, 'errors=' + errors.length, 'move=' + JSON.stringify(R.move.moved), 'leaveAt=' + R.six.leaveAt);
await browser.close();
