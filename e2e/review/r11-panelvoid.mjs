// Is the landscape black band tied to the modal panel (backdrop-filter) or just capture lag?
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
const grab = async (name) => {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(800);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
  return page.evaluate(() => ({ panel: !!document.querySelector('.bbq-panel') }));
};
const out = [];
for (let i = 0; i < 3; i++) out.push({ n: `voidpanel-title-${i}`, ...(await grab(`voidpanel-title-${i}`)) });
await page.evaluate(() => { document.querySelector('.bbq-panel button').click(); window.__test.pauseSpawns(true); window.__test.tick(0.05, 3); });
await page.evaluate(() => { window.__game.money = 300; window.__game.timeLeft = 0.1; window.__test.tick(0.05, 6); });
for (let i = 0; i < 3; i++) out.push({ n: `voidpanel-results-${i}`, ...(await grab(`voidpanel-results-${i}`)) });
console.log(JSON.stringify(out));
await browser.close().catch(() => {});
