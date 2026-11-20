const { chromium } = await import('playwright');
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
p.on('pageerror', e => console.log('PAGEERR', String(e)));
await p.goto('http://127.0.0.1:3035/bbq/', { waitUntil: 'commit', timeout: 20000 });
let frames = 0;
for (let i = 0; i < 60 && frames <= 30; i++) { await p.waitForTimeout(1500); frames = await p.evaluate(() => window.__frames ?? 0).catch(() => 0); }
await p.evaluate(() => { const g = window.__game; window.__test?.start?.(); window.__test?.pauseSpawns?.(true); window.__test?.tick?.(0.05, 2); }).catch(e => console.log('EVALERR', String(e)));
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const el = document.getElementById('bbq-act');
  const cap = el?.querySelector('.cap');
  return {
    frames: window.__frames,
    hasEl: !!el,
    opacity: el ? getComputedStyle(el).opacity : null,
    capText: cap ? JSON.stringify(cap.textContent) : 'no .cap',
    capHTML: cap ? cap.outerHTML.slice(0, 200) : null,
    btnHTML: el ? el.outerHTML.slice(0, 400) : null,
    cur: window.__game?.current,
    phase: window.__game?.phase,
    pos: window.__game?.player ? { x: window.__game.player.x, z: window.__game.player.z } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
