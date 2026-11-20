// Look-metrics gate: loads the running game, starts a level, screenshots the
// viewport and asserts luminance stats so "the scene got too dark" can't
// regress silently. Software WebGL (SwiftShader) — we measure pixels.
// Usage: node scripts/measure-look.mjs   (server must run, default :3031)

const { chromium } = await import('playwright');

const URL = process.env.BBQ_URL ?? 'http://127.0.0.1:5176/bbq/';
const WIDTH = 844;
const HEIGHT = 390;
const SETTLE_MS = 2500;

const LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
];

let browser = null;
let page = null;
const errors = [];
for (let attempt = 0; attempt < 3 && !page; attempt++) {
  const b = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  try {
    const p = await b.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(URL, { waitUntil: 'commit', timeout: 20000 });
    let frames = 0;
    for (let i = 0; i < 40 && frames <= 30; i++) {
      await p.waitForTimeout(1500);
      frames = await p.evaluate(() => window.__frames ?? 0).catch(() => 0);
    }
    if (frames <= 30) throw new Error('frames never advanced past 30');
    browser = b;
    page = p;
  } catch (e) {
    console.log(`nav attempt ${attempt + 1} failed: ${String(e).split('\n')[0]}`);
    await b.close().catch(() => {});
  }
}
if (!page) {
  console.error('FAIL — page never rendered frames');
  process.exit(1);
}

// start the level via the test hook (same code path as the 开店 button)
await page.evaluate(() => window.__test.start());
await page.waitForTimeout(SETTLE_MS);
const png = await page.screenshot({ timeout: 150000 });

// decode the png back inside the page — no native deps needed
const stats = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = `data:image/png;base64,${b64}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const n = width * height;
  const luma = new Float32Array(n);
  let sum = 0;
  let dark = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      luma[y * width + x] = l;
      sum += l;
      if (l < 10) dark++;
    }
  }
  luma.sort();
  return {
    mean: sum / n,
    darkFrac: dark / n,
    p95: luma[Math.floor(0.95 * (n - 1))],
  };
}, png.toString('base64'));

await browser.close();

const checks = [
  ['mean', stats.mean, '>=', 70],
  ['mean', stats.mean, '<=', 110],
  ['darkFrac', stats.darkFrac, '<=', 0.25],
  ['p95', stats.p95, '>=', 150],
];
let ok = errors.length === 0;
for (const [name, value, op, threshold] of checks) {
  const pass = op === '>=' ? value >= threshold : value <= threshold;
  if (!pass) ok = false;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(8)} ${value.toFixed(2)}  ${op} ${threshold}`);
}
if (errors.length) console.log(`FAIL  js errors:\n${errors.join('\n')}`);
console.log(ok ? 'LOOK OK' : 'LOOK FAILED');
process.exit(ok ? 0 : 1);
