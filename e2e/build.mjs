// E2E build fingerprint: the page that is actually served must carry a
// __BUILD__ id, log it, and load the same index-*.js that index.html advertises.
// Usage: E2E_BASE=http://127.0.0.1:3035/bbq/ node e2e/build.mjs

const { chromium } = await import('playwright');
const { default: assert } = await import('node:assert/strict');

const BASE = (process.env.E2E_BASE ?? 'https://openfolio.uk/bbq/').replace(/\/?$/, '/');
const assetOf = (s) => s.match(/assets\/index-[^"'\s]*\.js/)?.[0];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errors = [];
const logs = [];
const scripts = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  logs.push(m.text());
});
page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });

await page.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
let build;
for (let i = 0; i < 40 && !build; i++) {
  await page.waitForTimeout(500);
  build = await page.evaluate(() => window.__build).catch(() => undefined);
}

assert.ok(typeof build === 'string' && build.length > 0, `A1 window.__build not a non-empty string: ${build}`);
assert.match(build, /^([0-9a-f]{7,}|dev)-/, `A1 bad __build format: ${build}`);

const line = logs.find((l) => l.includes('[bbq] build'));
assert.ok(line, 'A2 no "[bbq] build" console log');
assert.equal(line.replace(/^.*\[bbq\] build\s*/, '').trim(), build, `A2 log "${line}" != __build ${build}`);

const res = await fetch(new URL('index.html', BASE), { headers: { 'Cache-Control': 'no-cache' } });
const asset = assetOf(await res.text());
assert.ok(asset, 'A3 no assets/index-*.js in served index.html');
const loaded = scripts.map(assetOf).filter(Boolean);
assert.ok(loaded.includes(asset), `A3 page loaded [${loaded}] but index.html says ${asset}`);

await page.waitForTimeout(1500);
assert.equal(errors.length, 0, `A4 js errors:\n${errors.join('\n')}`);

await browser.close();
console.log(`BUILD OK ${build} ${asset}`);
