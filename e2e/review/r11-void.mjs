// Verify whether landscape "black bars" are real world void or a swiftshader capture artifact.
const { chromium } = await import('playwright');
const { writeFileSync } = await import('node:fs');
const OUT = 'e2e/review/2026-11-21T01-37Z-r11';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const cdp = await page.context().newCDPSession(page);
await page.goto('https://openfolio.uk/bbq/', { waitUntil: 'commit', timeout: 60000 });
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate(() => (window.__frames ?? 0) > 3).catch(() => false)) break;
}
await page.evaluate(() => { document.querySelector('.bbq-panel button')?.click(); });
await page.evaluate(() => { window.__test.pauseSpawns(true); window.__test.tick(0.05, 4); });
const info = await page.evaluate(() => ({ vw: innerWidth, vh: innerHeight,
  canvas: (() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height, c.width, c.height]; })(),
  cam: (() => { const c = window.__game; return c ? { fov: c.camera?.fov ?? null } : null; })(),
}));
const shots = [];
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(1200);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const p = `${OUT}/land-void-${i}.png`;
  writeFileSync(p, Buffer.from(data, 'base64'));
  shots.push(p);
}
writeFileSync(`${OUT}/run-void.json`, JSON.stringify({ info, shots }, null, 1));
console.log(JSON.stringify({ info, shots }));
await browser.close().catch(() => {});
