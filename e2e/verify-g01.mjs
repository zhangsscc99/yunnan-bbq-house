// G-01 顾客自助点单（玩家零操作）——机器验收
// 断言：
//  a) 顾客入座当帧（≤300ms 内）该桌出现订单卡
//  b) 卡片处于 ordering 态、状态文案含「备菜」，备菜环形进度随时间推进（dashoffset 递减）
//  c) 对卡片/按钮任意点击不改变状态：orderState 不变、prepT 继续增长、clickCount/money/pass 不变、耐心不降
//  d) 0 console error / 0 failed request
// Usage: E2E_BASE=http://127.0.0.1:3999/bbq/ node e2e/verify-g01.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:3035/bbq/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
const failed = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => failed.push(r.url()));

let ok = true;
const check = (cond, msg) => { if (!cond) { ok = false; console.log('FAIL ' + msg); } else console.log('PASS ' + msg); };

try {
  await page.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
  let frames = 0;
  for (let i = 0; i < 60 && frames <= 30; i++) {
    await page.waitForTimeout(1500);
    frames = await page.evaluate(() => window.__frames ?? 0).catch(() => 0);
  }
  assert.ok(frames > 30, 'page never rendered frames');
  await page.evaluate(() => window.__test.start());

  // a) 逐帧推进（0.05s/帧），就座那 300ms 内卡片必须已存在
  const a = await page.evaluate(() => {
    for (let i = 0; i < 4000; i++) {
      window.__test.tick(0.05, 1);
      const seated = window.__game.customers.filter((c) => c.phase === 'seated');
      if (!seated.length) continue;
      const t = seated[0].table;
      const card = document.querySelector(`#bbq-orders .card[data-table="${t}"]`);
      const within = [];
      // 300ms 窗口 = 6 帧，逐帧记录卡片是否存在（同步 tick 内 HUD 也会更新）
      for (let k = 0; k < 6; k++) {
        const el = document.querySelector(`#bbq-orders .card[data-table="${t}"]`);
        within.push(el ? 1 : 0);
        if (k < 5) window.__test.tick(0.05, 1);
      }
      return { table: t, presentAtSeat: !!card, within300ms: within, simSec: +(i * 0.05).toFixed(2) };
    }
    return null;
  });
  check(!!a, `a) 顾客在模拟 ${a?.simSec}s 入座`);
  check(a && a.presentAtSeat === true, 'a) 入座当帧该桌订单卡已出现（延迟 0ms ≤300ms）');
  check(a && a.within300ms.every((v) => v === 1), `a) 入座后 300ms 内 6/6 帧卡片均在 (${a?.within300ms.join('')})`);

  // b) ordering 态 + 备菜文案 + 环进度推进
  const b1 = await page.evaluate((t) => {
    const card = document.querySelector(`#bbq-orders .card[data-table="${t}"]`);
    const ring = card?.querySelector('.prep-ring');
    const arc = card?.querySelector('.prep-arc');
    return {
      state: card?.dataset.orderState ?? null,
      status: card?.querySelector('.status-txt')?.textContent ?? '',
      btn: card?.querySelector('.btn-lbl')?.textContent ?? '',
      ringDisplay: ring ? getComputedStyle(ring).display : null,
      off1: arc ? Number(arc.getAttribute('stroke-dashoffset')) : null,
      prepT1: Number(card?.dataset.prepT ?? NaN),
    };
  }, a.table);
  check(b1.state === 'ordering', `b) 卡片状态 = ${b1.state}（应为 ordering）`);
  check(/备菜/.test(b1.status) || /备菜/.test(b1.btn), `b) 文案含「备菜」: status="${b1.status}" btn="${b1.btn}"`);
  check(b1.ringDisplay === 'block', `b) 备菜环可见 display=${b1.ringDisplay}`);
  await page.evaluate(() => window.__test.tick(0.05, 20)); // +1.0s
  const b2 = await page.evaluate((t) => {
    const card = document.querySelector(`#bbq-orders .card[data-table="${t}"]`);
    const arc = card?.querySelector('.prep-arc');
    return {
      state: card?.dataset.orderState ?? null,
      off2: arc ? Number(arc.getAttribute('stroke-dashoffset')) : null,
      prepT2: Number(card?.dataset.prepT ?? NaN),
    };
  }, a.table);
  check(b2.state === 'ordering', `b) +1.0s 仍为 ordering（prep 未完成前）: ${b2.state}`);
  check(b2.off2 < b1.off1 && b2.prepT2 > b1.prepT1, `b) 环形进度推进 dashoffset ${b1.off1.toFixed(2)}→${b2.off2.toFixed(2)}, prepT ${b1.prepT1}→${b2.prepT2}`);

  // c) 点击不改变状态（在 prep 未完成窗口内连点 3 次卡片 + 按钮）
  const before = await page.evaluate((t) => {
    const s = window.__test.state();
    const c = window.__test.cardState(t);
    return { clickCount: s.clickCount, money: s.money, pass: s.pass.length, carrying: !!s.carrying, state: c?.orderState, prepT: c?.prepT, status: c?.statusText, patience: s.customers.find((x) => x.table === t)?.patience };
  }, a.table);
  const box = await page.evaluate((t) => {
    const card = document.querySelector(`#bbq-orders .card[data-table="${t}"]`);
    const btn = card.querySelector('.card-btn');
    const r1 = card.getBoundingClientRect();
    const r2 = btn.getBoundingClientRect();
    return { cx: r1.left + r1.width / 2, cy: r1.top + r1.height / 2, bx: r2.left + r2.width / 2, by: r2.top + r2.height / 2 };
  }, a.table);
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(box.cx, box.cy);
    await page.mouse.click(box.bx, box.by);
  }
  await page.waitForTimeout(200);
  const after = await page.evaluate((t) => {
    const s = window.__test.state();
    const c = window.__test.cardState(t);
    return { clickCount: s.clickCount, money: s.money, pass: s.pass.length, carrying: !!s.carrying, state: c?.orderState, prepT: c?.prepT, status: c?.statusText, patience: s.customers.find((x) => x.table === t)?.patience };
  }, a.table);
  check(after.state === before.state, `c) 点击后状态不变 ${before.state} → ${after.state}`);
  check(after.clickCount === before.clickCount, `c) clickCount 不变 ${before.clickCount} → ${after.clickCount}`);
  check(after.money === before.money, `c) money 不变 ${before.money} → ${after.money}`);
  check(after.pass === 0 && before.pass === 0, `c) 出菜窗口数量不受点击影响 ${before.pass} → ${after.pass}`);
  check(after.carrying === false, 'c) 点击卡片不会让玩家手上出现东西');
  check(after.prepT >= before.prepT, `c) 备菜计时未被点击打断/重置 prepT ${before.prepT} → ${after.prepT}`);
  check(after.patience <= before.patience + 0.001, `c) 耐心未被点击扣减 ${before.patience} → ${after.patience}`);

  // d) 错误与失败请求
  check(errors.length === 0, `d) console error = ${errors.length}${errors.length ? ' :: ' + errors.slice(0, 3).join(' | ') : ''}`);
  check(failed.length === 0, `d) failed request = ${failed.length}${failed.length ? ' :: ' + failed.slice(0, 3).join(' | ') : ''}`);
} catch (e) {
  ok = false;
  console.log('EXCEPTION ' + (e && e.stack ? e.stack.split('\n')[0] : e));
} finally {
  await browser.close();
}
console.log(ok ? 'G01_RESULT=PASS' : 'G01_RESULT=FAIL');
process.exit(ok ? 0 : 1);
