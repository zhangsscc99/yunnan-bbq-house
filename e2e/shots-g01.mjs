import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3999/bbq/';
const OUT = process.env.SHOT_DIR ?? 'e2e/shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
for (let i = 0; i < 40; i++) { const f = await page.evaluate(() => window.__frames ?? 0).catch(() => 0); if (f > 30) break; await page.waitForTimeout(1000); }
await page.evaluate(() => window.__test.start());
await page.evaluate(() => { for (let i = 0; i < 4000; i++) { window.__test.tick(0.05, 1); if (window.__game.customers.some((c) => c.phase === 'seated')) break; } window.__test.tick(0.05, 6); });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/g01-ordering-390x844.png`, timeout: 150000 });
// 等备菜完成，拍「菜出窗 + 卡片 ready」一帧
await page.evaluate(() => { for (let i = 0; i < 120; i++) { window.__test.tick(0.05, 1); if (window.__game.pass.length > 0) break; } });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/g01-pass-ready-390x844.png`, timeout: 150000 });
const s = await page.evaluate(() => window.__test.state());
console.log(JSON.stringify({ pass: s.pass.length, tables: Object.keys(s.tables), calls: s.calls, tris: s.tris }));
await browser.close();
