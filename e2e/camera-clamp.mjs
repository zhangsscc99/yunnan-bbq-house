// E2E: B-025 — the camera must never show void outside the 12×9m world, portrait or landscape.
// Per viewport: spawn + teleport(±5, ±4.5) four corners (5 frames); every CDP screenshot is reduced to per-column
// mean luminance. Asserts: no run of >=24 consecutive columns with mean < 26, and the dark band hugging the
// left / right edge differs by <= 8px.
// Usage: E2E_BASE=http://127.0.0.1:4175/bbq/ xvfb-run -a node e2e/camera-clamp.mjs

const { chromium } = await import('playwright');
const { mkdirSync, writeFileSync, appendFileSync } = await import('node:fs');
const { default: assert } = await import('node:assert/strict');

const BASE = process.env.E2E_BASE ?? 'https://openfolio.uk/bbq/';
const DARK = 26;
const RUN = 24;
const SIDE_DIFF = 8;
const ENV_CRASH = /has been closed|Target page|SharedImageManager|crash/i;
const MAX_RETRY = 2;
const RUN_LOG = 'e2e/shots/camera-clamp-run.json';
mkdirSync('e2e/shots', { recursive: true });
writeFileSync(RUN_LOG, '');
const errors = [];
const results = [];

// column luminance means, computed in-page from the CDP png
const COLS_FN = async (b64) => {
  const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
  const cv = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = cv.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
  const cols = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      cols[x] += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  return cols.map((v) => v / height);
};

function analyse(cols) {
  let left = 0;
  while (left < cols.length && cols[left] < DARK) left++;
  let right = 0;
  while (right < cols.length && cols[cols.length - 1 - right] < DARK) right++;
  let maxRun = 0, run = 0;
  for (const v of cols) { run = v < DARK ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
  const mean = (a, b) => cols.slice(a, b).reduce((s, v) => s + v, 0) / Math.max(1, b - a);
  return { left, right, maxRun, meanL: mean(0, 160), meanR: mean(cols.length - 160, cols.length) };
}

async function runViewport(tag, width, height, attempt, out, errs) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  try {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
  page.on('crash', () => console.error('PAGE CRASH'));
  page.on('pageerror', (e) => errs.push(`${tag}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`${tag}: ${m.text()}`); });
  const cdp = await page.context().newCDPSession(page);
  const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const frames = () => page.evaluate(() => window.__frames ?? 0);

  await page.goto(BASE, { waitUntil: 'commit', timeout: 30000 });
  let f = 0;
  for (let i = 0; i < 60 && f <= 30; i++) {
    await page.waitForTimeout(1500);
    f = await frames().catch(() => 0);
  }
  assert.ok(f > 30, `${tag}: page never rendered frames`);

  // start the level with a real touch tap on the title-panel button
  const btn = await page.waitForSelector('.bbq-panel button', { timeout: 20000 });
  const bb = await btn.boundingBox();
  await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForFunction(() => window.__test.state().phase === 'playing', null, { timeout: 20000 });

  const poses = [['spawn', null], ['NW', [-5, -4.5]], ['NE', [5, -4.5]], ['SW', [-5, 4.5]], ['SE', [5, 4.5]]];
  for (const [name, p] of poses) {
    if (p) await page.evaluate(([x, z]) => window.__test.teleport(x, z), p);
    // let at least 2 fresh renders land with the snapped camera, then 2 rAFs
    const f0 = await frames();
    for (let i = 0; i < 40 && (await frames()) < f0 + 3; i++) await page.waitForTimeout(250);
    await raf2();
    await raf2();
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(`e2e/shots/camera-clamp-${tag}-${name}.png`, Buffer.from(data, 'base64'));
    const cols = await page.evaluate(COLS_FN, data);
    const a = analyse(cols);
    const rec = { tag, name, attempt, ...a };
    out.push(rec);
    appendFileSync(RUN_LOG, JSON.stringify(rec) + '\n');
    console.log(
      `${tag} ${name.padEnd(5)} 左暗=${a.left}px 右暗=${a.right}px 差=${Math.abs(a.left - a.right)} ` +
      `最大连续暗列=${a.maxRun} 左160列均值=${a.meanL.toFixed(1)} 右160列均值=${a.meanR.toFixed(1)}`,
    );
  }
  } finally {
    await browser.close().catch(() => {});
  }
}

// one fresh browser per viewport; retry only environment crashes (assertion failures propagate immediately)
async function runWithRetry(tag, width, height) {
  for (let attempt = 0; ; attempt++) {
    const out = [], errs = [];
    try {
      await runViewport(tag, width, height, attempt, out, errs);
      results.push(...out);
      errors.push(...errs);
      return;
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (e?.name === 'AssertionError' || !ENV_CRASH.test(msg) || attempt >= MAX_RETRY) throw e;
      console.error(`${tag}: environment crash (${msg.split('\n')[0]}), relaunching browser, retry ${attempt + 1}/${MAX_RETRY}`);
    }
  }
}

await runWithRetry('portrait', 390, 844);
await runWithRetry('landscape', 844, 390);

assert.ok(results.length >= 10, `need >=10 frames, got ${results.length}`);
for (const r of results) {
  assert.ok(r.maxRun < RUN, `${r.tag}/${r.name}: ${r.maxRun} consecutive dark columns (limit ${RUN - 1})`);
  assert.ok(Math.abs(r.left - r.right) <= SIDE_DIFF, `${r.tag}/${r.name}: left dark ${r.left}px vs right ${r.right}px`);
}
assert.equal(errors.length, 0, `page errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(`frames=${results.length} maxRun=${Math.max(...results.map((r) => r.maxRun))}`);
console.log('CAMERA CLAMP OK');
