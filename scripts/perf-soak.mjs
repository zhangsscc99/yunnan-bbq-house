// Frame-rate soak: loads the game, starts a level, samples window.__frames
// once per second for SOAK_SEC (default 60) and asserts min fps / no errors.
// Usage: node scripts/perf-soak.mjs   (env: BBQ_URL, SOAK_SEC, MIN_FPS)

const { chromium } = await import('playwright');

const URL = process.env.BBQ_URL ?? 'http://127.0.0.1:5176/bbq/';
const SOAK_SEC = Number(process.env.SOAK_SEC ?? 60);
const MIN_FPS = Number(process.env.MIN_FPS ?? 15);
const WARMUP = 3; // shader compile seconds excluded from the min

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('crash', () => errors.push('PAGE CRASHED'));

await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
let f0 = 0;
for (let i = 0; i < 60 && f0 <= 10; i++) {
  await page.waitForTimeout(1000);
  f0 = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
}
if (f0 <= 10) { console.error('FAIL — never rendered frames'); await browser.close(); process.exit(1); }

await page.evaluate(() => window.__test.start());
const fps = [];
let prev = await page.evaluate(() => window.__frames);
for (let s = 0; s < SOAK_SEC; s++) {
  await page.waitForTimeout(1000);
  const f = await page.evaluate(() => window.__frames).catch(() => -1);
  if (f < 0) { errors.push(`page dead at t=${s}s`); break; }
  fps.push(f - prev);
  prev = f;
}
const perf = await page.evaluate(() => window.__perf).catch(() => null);
await browser.close();

const steady = fps.slice(WARMUP);
const min = Math.min(...steady);
const avg = steady.reduce((a, b) => a + b, 0) / steady.length;
console.log(`fps/s: ${fps.join(' ')}`);
console.log(`samples=${fps.length} min=${min} avg=${avg.toFixed(1)} perf=${JSON.stringify(perf)}`);
if (errors.length) console.log(`errors:\n${errors.join('\n')}`);
const ok = fps.length === SOAK_SEC && min >= MIN_FPS && errors.length === 0;
console.log(ok ? 'SOAK OK' : 'SOAK FAILED');
process.exit(ok ? 0 : 1);
