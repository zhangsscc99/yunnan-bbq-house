// Start + results panels. Same warm-timber & gold skin as the HUD.

import type { Results } from '../game/flow.ts';

function fmtMoney(v: number): string {
  return v < 0 ? `-¥${Math.abs(v)}` : `¥${v}`;
}

const CSS = `
.bbq-panel {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; background: rgba(12,8,5,.48);
  backdrop-filter: blur(3px); pointer-events: auto; z-index: 20;
}
.bbq-panel .card {
  background: rgba(24,16,12,.84); border: 1.5px solid rgba(232,180,90,.65);
  border-radius: 16px; padding: 24px 26px; text-align: center;
  backdrop-filter: blur(12px); max-width: min(332px, 88vw);
  box-shadow: 0 12px 40px rgba(0,0,0,.55);
}
.bbq-panel h1 {
  margin: 0 0 6px; font-size: 25px; font-weight: 800; color: #f5e8d8;
  letter-spacing: 1px;
}
.bbq-panel .sub { font-size: 13px; color: rgba(245,232,216,.82); margin-bottom: 14px; line-height: 1.6; }
.bbq-panel .sub b { color: #f0c060; font-weight: 700; }
.bbq-panel .target {
  font-size: 13px; color: #f0c060; font-weight: 700; margin-bottom: 18px;
  border: 1px dashed rgba(240,192,96,.45); border-radius: 8px; padding: 7px 10px;
}
.bbq-panel button {
  font: inherit; font-size: 16px; font-weight: 700; cursor: pointer;
  color: #241408; background: linear-gradient(180deg, #f0c060, #d89a40);
  border: none; border-radius: 12px; padding: 12px 34px; min-width: 156px; min-height: 48px;
  letter-spacing: 0.14em;
  box-shadow: 0 4px 14px rgba(240,192,96,.3); pointer-events: auto;
}
.bbq-panel button.ghost {
  background: transparent; color: #f0c060;
  border: 1.5px solid rgba(240,192,96,.55); box-shadow: none;
  margin-top: 10px; font-size: 15px; padding: 11px 30px; min-height: 48px;
}
@media (max-height: 450px) {
  .bbq-panel .card { padding: 14px 24px; max-height: calc(100dvh - 16px); overflow-y: auto; }
  .bbq-panel h1 { font-size: 22px; }
  .bbq-panel .sub { margin-bottom: 10px; }
  .bbq-panel .target { margin-bottom: 12px; }
}
.bbq-panel button:disabled { opacity: .45; cursor: default; }
.bbq-panel .stars-big { display: flex; gap: 6px; justify-content: center; margin: 6px 0 12px; }
.bbq-panel .stars-big svg { width: 34px; height: 34px; }
.bbq-panel .row {
  display: flex; justify-content: space-between; font-size: 14px;
  padding: 5px 2px; color: rgba(245,232,216,.85);
  border-bottom: 1px solid rgba(240,192,96,.15);
}
.bbq-panel .row b { color: #f0c060; font-variant-numeric: tabular-nums; }
.bbq-panel .row.neg b { color: #e05a3a; }
.bbq-panel .verdict { font-size: 15px; font-weight: 700; margin: 10px 0 2px; }
.bbq-panel .verdict.pass { color: #9ecb6a; }
.bbq-panel .verdict.fail { color: #e05a3a; }
`;

const STAR = (filled: boolean): string => `
<svg viewBox="0 0 24 24" fill="${filled ? '#f0c060' : 'none'}" stroke="${filled ? '#f0c060' : 'rgba(240,192,96,.4)'}" stroke-width="1.6">
  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/>
</svg>`;

export class Panels {
  private root: HTMLElement;

  constructor(uiRoot: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    uiRoot.appendChild(this.root);
  }

  private clear(): void {
    this.root.innerHTML = '';
  }

  showStart(target: number, duration: number, onStart: () => void, level = 1): void {
    this.clear();
    const p = document.createElement('div');
    p.className = 'bbq-panel';
    p.innerHTML = `
      <div class="card">
        <h1>柳真真云南烤肉</h1>
        <div class="sub">顾客自助点单 · 三步出餐：<b>窗口取菜 → 桌边烤 → 盛盘</b><br/>火候进金色完美窗盛盘拿满小费 · 出菜窗口最多放 3 份</div>
        <div class="target">第 ${level} 关 · 目标：${Math.floor(duration / 60)} 分钟营业额 ¥${target}</div>
        <button data-btn="start">开店</button>
      </div>`;
    this.root.appendChild(p);
    p.querySelector('button')!.addEventListener('click', onStart);
  }

  showResults(r: Results, onReplay: () => void, onNext: () => void): void {
    this.clear();
    const p = document.createElement('div');
    p.className = 'bbq-panel';
    const stars = STAR(r.stars >= 1) + STAR(r.stars >= 2) + STAR(r.stars >= 3);
    const nextN = r.level + 1;
    const diff = Math.max(0, r.target - r.money);
    const verdict = !r.pass ? `离目标还差 ¥${diff}`
      : r.hasNext ? `目标达成，进入第 ${nextN} 关` : '全部关卡通关！';
    const nextBtn = r.pass && r.hasNext ? `<button data-btn="next">进入第 ${nextN} 关</button><br/>` : '';
    p.innerHTML = `
      <div class="card">
        <h1>打烊结算</h1>
        <div class="stars-big" data-stars="${r.stars}" aria-label="评级 ${r.stars}/3">${stars}</div>
        <div class="verdict ${r.pass ? 'pass' : 'fail'}">${verdict}</div>
        <div class="row"><span>营业额</span><b>${fmtMoney(r.money)} / ¥${r.target}</b></div>
        <div class="row"><span>服务顾客</span><b>${r.served} 位</b></div>
        <div class="row ${r.angry ? 'neg' : ''}"><span>愤怒离店</span><b>${r.angry} 位</b></div>
        <div class="row ${r.waste ? 'neg' : ''}"><span>焦糊废料</span><b>${r.waste} 份</b></div>
        ${nextBtn}
        <button class="ghost" data-btn="replay">再开一局</button>
      </div>`;
    this.root.appendChild(p);
    p.querySelector('[data-btn="replay"]')!.addEventListener('click', onReplay);
    p.querySelector('[data-btn="next"]')?.addEventListener('click', onNext);
  }

  hide(): void {
    this.clear();
  }
}
