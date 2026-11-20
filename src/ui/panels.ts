// Start + results panels. Same skin as the HUD (see ART-DIRECTION §5).

import type { Results } from '../game/flow.ts';

const CSS = `
.bbq-panel {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; background: rgba(12,8,5,.45);
  backdrop-filter: blur(3px); pointer-events: auto;
}
.bbq-panel .card {
  background: rgba(24,16,12,.78); border: 1.5px solid rgba(232,180,90,.6);
  border-radius: 16px; padding: 26px 30px; text-align: center;
  backdrop-filter: blur(12px); max-width: min(320px, 86vw);
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
}
.bbq-panel h1 {
  margin: 0 0 4px; font-size: 26px; font-weight: 800; color: #f5e8d8;
  letter-spacing: 1px;
}
.bbq-panel .sub { font-size: 13px; color: rgba(245,232,216,.7); margin-bottom: 14px; line-height: 1.5; }
.bbq-panel .target {
  font-size: 13px; color: #f0c060; font-weight: 700; margin-bottom: 18px;
  border: 1px dashed rgba(240,192,96,.4); border-radius: 8px; padding: 6px 10px;
}
.bbq-panel button {
  font: inherit; font-size: 16px; font-weight: 700; cursor: pointer;
  color: #241408; background: linear-gradient(180deg, #f0c060, #d89a40);
  border: none; border-radius: 12px; padding: 12px 34px; min-width: 150px;
  box-shadow: 0 4px 14px rgba(240,192,96,.3); pointer-events: auto;
}
.bbq-panel button.ghost {
  background: transparent; color: #f0c060;
  border: 1.5px solid rgba(240,192,96,.55); box-shadow: none;
  margin-top: 10px; font-size: 14px; padding: 10px 30px;
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

  showStart(target: number, duration: number, onStart: () => void): void {
    this.clear();
    const p = document.createElement('div');
    p.className = 'bbq-panel';
    p.innerHTML = `
      <div class="card">
        <h1>柳真真云南烤肉</h1>
        <div class="sub">炭火生香，小店开张。<br/>取料 → 切配 → 炭烤 → 装盘 → 上菜</div>
        <div class="target">目标：${Math.floor(duration / 60)} 分钟营业额 ¥${target}</div>
        <button data-btn="start">开 店</button>
      </div>`;
    this.root.appendChild(p);
    p.querySelector('button')!.addEventListener('click', onStart);
  }

  showResults(r: Results, onReplay: () => void): void {
    this.clear();
    const p = document.createElement('div');
    p.className = 'bbq-panel';
    const stars = STAR(r.stars >= 1) + STAR(r.stars >= 2) + STAR(r.stars >= 3);
    p.innerHTML = `
      <div class="card">
        <h1>打烊结算</h1>
        <div class="stars-big">${stars}</div>
        <div class="verdict ${r.pass ? 'pass' : 'fail'}">
          ${r.pass ? '目标达成，解锁下一关！' : `离目标还差 ¥${r.target - r.money}`}
        </div>
        <div class="row"><span>营业额</span><b>¥${r.money} / ¥${r.target}</b></div>
        <div class="row"><span>服务顾客</span><b>${r.served} 位</b></div>
        <div class="row ${r.angry ? 'neg' : ''}"><span>愤怒离店</span><b>${r.angry} 位</b></div>
        <div class="row ${r.waste ? 'neg' : ''}"><span>废料</span><b>${r.waste} 份</b></div>
        <button data-btn="next" ${r.pass ? '' : 'disabled'}>下 一 关</button>
        <br/>
        <button class="ghost" data-btn="replay">再 开 一 局</button>
      </div>`;
    this.root.appendChild(p);
    p.querySelector('[data-btn="replay"]')!.addEventListener('click', onReplay);
    const next = p.querySelector('[data-btn="next"]') as HTMLButtonElement | null;
    if (next && r.pass) next.addEventListener('click', onReplay);
  }

  hide(): void {
    this.clear();
  }
}
