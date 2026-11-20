// DOM HUD: top strip (¥ / time / stars), order cards with countdown rings,
// world-anchored customer bubbles + floating popups. No emoji, inline SVG.

import * as THREE from 'three';
import { DISHES, LEVEL } from '../config.ts';
import type { Customer } from '../game/types.ts';

const CSS = `
#bbq-hud { position: absolute; inset: 0; pointer-events: none; font-family: inherit; }
#bbq-hud .topbar {
  position: absolute; top: max(8px, env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%); display: flex; gap: 14px; align-items: center;
  background: rgba(24,16,12,.72); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.55); border-radius: 12px;
  padding: 7px 16px; white-space: nowrap;
}
#bbq-hud .tb { display: flex; align-items: baseline; gap: 5px; }
#bbq-hud .tb .k { font-size: 12px; color: rgba(245,232,216,.65); font-weight: 500; }
#bbq-hud .tb .v { font-size: 15px; color: #f0c060; font-weight: 700; font-variant-numeric: tabular-nums; }
#bbq-hud .tb .v.time.low { color: #e05a3a; }
#bbq-hud .stars { display: flex; gap: 1px; }
#bbq-hud .stars svg { width: 15px; height: 15px; }

#bbq-orders {
  position: absolute; top: max(8px, env(safe-area-inset-top)); right: 10px;
  display: flex; flex-direction: column; gap: 8px; max-width: 168px;
}
#bbq-orders .card {
  display: flex; align-items: center; gap: 8px;
  background: rgba(24,16,12,.72); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.45); border-radius: 12px;
  padding: 7px 10px; min-width: 120px;
}
#bbq-orders .card .ring { position: relative; width: 30px; height: 30px; flex: none; }
#bbq-orders .card .ring svg { transform: rotate(-90deg); }
#bbq-orders .card .nm { font-size: 13px; color: #f5e8d8; font-weight: 600; line-height: 1.25; }
#bbq-orders .card .pr { font-size: 11px; color: #f0c060; font-weight: 600; }
#bbq-orders .card.angry { border-color: rgba(224,90,58,.8); }

#bbq-bubbles { position: absolute; inset: 0; overflow: hidden; }
.bubble {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: 6px;
  background: rgba(24,16,12,.8); border: 1.5px solid rgba(232,180,90,.55);
  border-radius: 16px; padding: 3px 10px 3px 4px; font-size: 12px; font-weight: 600;
  color: #f5e8d8; white-space: nowrap; transition: opacity .2s;
}
.bubble svg { flex: none; }
.bubble.angry { border-color: #e05a3a; color: #ff9a80; }

#bbq-guide {
  position: absolute; left: 50%; bottom: calc(150px + env(safe-area-inset-bottom));
  transform: translateX(-50%); display: none; max-width: 80vw; text-align: center;
  background: rgba(24,16,12,.82); border: 1.5px solid rgba(232,180,90,.7);
  border-radius: 14px; padding: 8px 16px; font-size: 14px; font-weight: 700;
  color: #f0c060; white-space: nowrap;
}
#bbq-guide.show { display: block; animation: bbq-guide-in .2s ease-out; }
@keyframes bbq-guide-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

#bbq-popups { position: absolute; inset: 0; overflow: hidden; }
.popup {
  position: absolute; transform: translate(-50%, -50%);
  font-size: 17px; font-weight: 800; color: #f0c060;
  text-shadow: 0 2px 6px rgba(0,0,0,.6); animation: bbq-rise .85s ease-out forwards;
}
.popup.warn { color: #e05a3a; }
.popup.ok { color: #9ecb6a; }
@keyframes bbq-rise {
  0% { opacity: 0; transform: translate(-50%, -30%) scale(.7); }
  15% { opacity: 1; transform: translate(-50%, -55%) scale(1.05); }
  100% { opacity: 0; transform: translate(-50%, -160%) scale(1); }
}
`;

const STAR = (filled: boolean): string => `
<svg viewBox="0 0 24 24" fill="${filled ? '#f0c060' : 'none'}" stroke="${filled ? '#f0c060' : 'rgba(240,192,96,.4)'}" stroke-width="1.8">
  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/>
</svg>`;

const RING_R = 12;
const RING_C = 2 * Math.PI * RING_R;

interface Bubble {
  root: HTMLElement;
  arc: SVGElement;
  nm: HTMLElement;
  label: string;
  frac: number;
  angry: boolean;
}

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  parent.appendChild(e);
  return e;
}

export class Hud {
  private root: HTMLElement;
  private moneyV: HTMLElement;
  private timeV: HTMLElement;
  private starsEl: HTMLElement;
  private ordersEl: HTMLElement;
  private bubblesEl: HTMLElement;
  private popupsEl: HTMLElement;
  private guideEl: HTMLElement;
  private guideTimer = 0;
  private bubbleMap = new Map<number, Bubble>();
  private lastMoney = -1;
  private lastSec = -1;
  private cam: THREE.Camera;
  private tmp = new THREE.Vector3();

  constructor(uiRoot: HTMLElement, cam: THREE.Camera) {
    this.cam = cam;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = el('div', '', uiRoot);
    this.root.id = 'bbq-hud';

    const bar = el('div', 'topbar', this.root);
    const tb1 = el('div', 'tb', bar);
    el('span', 'k', tb1).textContent = '营业额';
    this.moneyV = el('span', 'v', tb1);
    const tb2 = el('div', 'tb', bar);
    el('span', 'k', tb2).textContent = '时间';
    this.timeV = el('span', 'v time', tb2);
    const tb3 = el('div', 'tb', bar);
    el('span', 'k', tb3).textContent = '评级';
    this.starsEl = el('span', 'stars', tb3);
    this.moneyV.textContent = '¥0';
    this.timeV.textContent = '3:00';
    this.starsEl.innerHTML = STAR(true) + STAR(true) + STAR(true);

    this.ordersEl = el('div', '', this.root);
    this.ordersEl.id = 'bbq-orders';
    this.bubblesEl = el('div', '', this.root);
    this.bubblesEl.id = 'bbq-bubbles';
    this.popupsEl = el('div', '', this.root);
    this.popupsEl.id = 'bbq-popups';
    this.guideEl = el('div', '', this.root);
    this.guideEl.id = 'bbq-guide';
  }

  /** one shared guide toast, visible for 2s (re-press restarts the timer, never stacks) */
  showGuide(text: string): void {
    this.guideEl.textContent = text;
    this.guideEl.classList.add('show');
    clearTimeout(this.guideTimer);
    this.guideTimer = window.setTimeout(() => this.guideEl.classList.remove('show'), 2000);
  }

  setMoney(v: number): void {
    if (v === this.lastMoney) return;
    this.lastMoney = v;
    this.moneyV.textContent = `¥${v}`;
  }

  setTime(sec: number): void {
    const s = Math.max(0, Math.ceil(sec));
    if (s === this.lastSec) return;
    this.lastSec = s;
    this.timeV.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.timeV.classList.toggle('low', s <= 30);
  }

  setStars(live: number): void {
    this.starsEl.innerHTML = STAR(live >= 1) + STAR(live >= 2) + STAR(live >= 3);
  }

  setOrders(customers: Customer[]): void {
    const seated = customers.filter((c) => c.phase === 'seated' || c.phase === 'eating');
    this.ordersEl.innerHTML = '';
    for (const c of seated.slice(0, 3)) {
      const card = el('div', 'card', this.ordersEl);
      if (c.patience / c.patienceMax < 0.25 && c.phase === 'seated') card.classList.add('angry');
      const ring = el('div', 'ring', card);
      const frac = c.phase === 'eating' ? 1 : Math.max(0, c.patience / c.patienceMax);
      const r = 13;
      const circ = 2 * Math.PI * r;
      ring.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="${r}" fill="none" stroke="rgba(240,192,96,.2)" stroke-width="3"/>
          <circle cx="15" cy="15" r="${r}" fill="none" stroke="${frac < 0.25 ? '#e05a3a' : '#f0c060'}"
            stroke-width="3" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - frac)}"/>
        </svg>`;
      const txt = el('div', '', card);
      el('div', 'nm', txt).textContent = DISHES[c.dish].name;
      el('div', 'pr', txt).textContent = `¥${DISHES[c.dish].price} · ${c.phase === 'eating' ? '用餐中' : '等待'}`;
    }
  }

  popup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void {
    const p = this.project(worldPos);
    if (!p) return;
    const e = el('div', `popup ${kind}`, this.popupsEl);
    e.textContent = text;
    e.style.left = `${p.x}px`;
    e.style.top = `${p.y}px`;
    setTimeout(() => e.remove(), 900);
  }

  private project(v: THREE.Vector3): { x: number; y: number } | null {
    this.tmp.copy(v).project(this.cam);
    if (this.tmp.z > 1) return null;
    return {
      x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  /** refresh world-anchored bubbles above customers: dish name + patience ring */
  updateBubbles(customers: Customer[]): void {
    const live = new Set<number>();
    for (const c of customers) {
      if (c.phase !== 'seated' && c.phase !== 'eating' && c.phase !== 'walking-in') continue;
      live.add(c.id);
      let b = this.bubbleMap.get(c.id);
      if (!b) {
        const root = el('div', 'bubble', this.bubblesEl);
        root.innerHTML = `<svg width="26" height="26" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="${RING_R}" fill="none" stroke="rgba(240,192,96,.22)" stroke-width="3.5"/>
          <circle class="arc" cx="15" cy="15" r="${RING_R}" fill="none" stroke="#f0c060" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="0" transform="rotate(-90 15 15)"/></svg>
          <span class="nm"></span>`;
        b = {
          root,
          arc: root.querySelector('.arc') as SVGElement,
          nm: root.querySelector('.nm') as HTMLElement,
          label: '', frac: -1, angry: false,
        };
        this.bubbleMap.set(c.id, b);
      }
      const head = c.obj.position.clone();
      head.y += 1.35;
      const p = this.project(head);
      if (!p) { b.root.style.opacity = '0'; continue; }
      b.root.style.opacity = '1';
      b.root.style.left = `${p.x}px`;
      b.root.style.top = `${Math.max(p.y, 66)}px`;
      const frac = c.phase === 'eating' ? 1 : Math.max(0, c.patience / c.patienceMax);
      const angry = c.phase === 'seated' && frac < 0.25;
      const label = c.phase === 'walking-in' ? '…' : c.phase === 'eating' ? '用餐中' : DISHES[c.dish].name;
      if (label !== b.label) { b.label = label; b.nm.textContent = label; }
      if (Math.abs(frac - b.frac) > 0.005) {
        b.frac = frac;
        b.arc.setAttribute('stroke-dashoffset', String(RING_C * (1 - frac)));
      }
      if (angry !== b.angry) {
        b.angry = angry;
        b.root.classList.toggle('angry', angry);
        b.arc.setAttribute('stroke', angry ? '#e05a3a' : '#f0c060');
      }
    }
    for (const [id, b] of this.bubbleMap) {
      if (!live.has(id)) {
        b.root.remove();
        this.bubbleMap.delete(id);
      }
    }
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? 'block' : 'none';
  }

  levelTarget(): number {
    return LEVEL.target;
  }
}
