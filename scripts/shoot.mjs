// Quick screenshot tool: loads the game, optionally starts + drives it,
// saves pngs to e2e/shots/. Usage:
//   node scripts/shoot.mjs [url] [name] [--start] [--script file.mjs]
const { chromium } = await import('playwright');
const { mkdirSync } = await import('node:fs');

const URL = process.argv[2] ?? 'http://127.0.0.1:5176/bbq/';
const NAME = process.argv[3] ?? 'shot';
const DO_START = process.argv.includes('--start');

mkdirSync('e2e/shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'commit', timeout: 20000 });
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(500);
  const f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  if (f > 30) break;
}

if (DO_START) {
  await page.evaluate(() => window.__test.start());
  await page.waitForTimeout(3000);
}

await page.screenshot({ path: `e2e/shots/${NAME}.png`, timeout: 150000 });
const state = await page.evaluate(() => window.__test?.state?.() ?? null).catch(() => null);
console.log(JSON.stringify({ errors, calls: state?.calls, tris: state?.tris, phase: state?.phase }));
await browser.close();
