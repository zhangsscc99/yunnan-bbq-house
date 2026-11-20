const { chromium } = await import('playwright');
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
p.on('pageerror', e => console.log('PAGEERR:', String(e)));
p.on('console', m => { if (m.type() === 'error') console.log('CONS:', m.text()); });
p.on('crash', () => console.log('PAGE CRASHED'));
await p.goto('http://127.0.0.1:5176/bbq/', { waitUntil: 'commit', timeout: 20000 });
for (let i=0;i<40;i++){ 
  try { await p.waitForTimeout(2000); } catch(e){ console.log('gone:', String(e).slice(0,80)); break; }
  const f = await p.evaluate(()=>window.__frames??0).catch(()=>-1);
  if (f === -1) { console.log('eval failed — page dead at i=',i); break; }
  if (i%5===0||f>30) console.log('i',i,'frames',f);
  if (f>60) break;
}
await b.close().catch(()=>{});
