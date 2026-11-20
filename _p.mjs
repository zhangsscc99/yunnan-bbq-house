const { chromium } = await import('playwright');
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
await p.goto('http://127.0.0.1:5176/bbq/', { waitUntil: 'commit' });
for (let i=0;i<30;i++){ await p.waitForTimeout(1000); if (await p.evaluate(()=>window.__frames??0).catch(()=>0) > 10) break; }
const r = await p.evaluate(()=>{
  const t=window.__test; t.start(); t.pauseSpawns(true);
  const out={};
  for (const [name,[tx,tz]] of Object.entries({t1:[-3.3,-1.2],t2:[0.3,-1.2],t3:[3.9,-1.2],t4:[2.1,0.8]})) {
    t.teleport(tx, 2.0);
    let pos;
    for (let i=0;i<200;i++){ pos=t.state().player; const dx=tx-pos.x,dz=tz-pos.z,d=Math.hypot(dx,dz); if(d<0.12)break; t.tick(0.05,1,dx/d,dz/d);} 
    out[name]=[+pos.x.toFixed(2),+pos.z.toFixed(2),t.state().tables[name]];
  }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
