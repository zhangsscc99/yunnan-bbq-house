// DOM HUD: top strip (¥ / time / stars), order cards with countdown rings,
// world-anchored customer bubbles + floating popups. No emoji, inline SVG.

import * as THREE from 'three';
import { DISHES } from '../config.ts';
import { COOK } from '../config.ts';
import type { Customer } from '../game/types.ts';
import type { GrillSlot } from '../game/grill.ts';
import type { StationRuntime } from '../game/types.ts';
import type { TableRuntime } from '../world/dining.ts';
import { TABLES } from '../world/layout.ts';

const TABLE_COLORS: Record<string, string> = {
  t1: '#f0c060',
  t2: '#7fd08a',
  t3: '#6aa8e0',
  t4: '#e08a6a',
};
const TABLE_ORDER = new Map<string, number>(TABLES.map((t, i) => [t.id, i + 1]));
const tableOrder = (id: string): number => TABLE_ORDER.get(id) ?? 99;
const tableColor = (id: string): string => TABLE_COLORS[id] ?? '#f0c060';

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

#bbq-rings { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
#bbq-rings .order-ring {
  position: absolute; left: 0; top: 0;
  width: 128px; height: 58px; box-sizing: border-box;
  border-radius: 50%;
  border: 3px solid var(--rc, #f0c060);
  background: color-mix(in srgb, var(--rc, #f0c060) 16%, transparent);
  box-shadow: 0 0 16px var(--rc, #f0c060);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: bbq-ring-breathe 1.2s ease-in-out infinite;
}
@keyframes bbq-ring-breathe {
  0%, 100% { opacity: .9; }
  50% { opacity: .55; }
}
#bbq-rings .order-num {
  position: absolute; left: 0; top: 0; z-index: 1;
  width: 28px; height: 28px; box-sizing: border-box;
  border-radius: 50%;
  background: rgba(16, 10, 7, .92);
  border: 2.5px solid var(--rc, #f0c060);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .55), 0 0 10px var(--rc, #f0c060);
  color: var(--rc, #f0c060);
  font-size: 16px; font-weight: 800; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

#bbq-orders {
  position: absolute; top: max(8px, env(safe-area-inset-top)); right: 10px;
  display: flex; flex-direction: column; gap: 8px; max-width: 196px;
}
#bbq-orders .card {
  display: flex; align-items: center; gap: 7px;
  background: rgba(24,16,12,.72); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.45); border-radius: 12px;
  padding: 7px 10px; min-width: 148px;
}
#bbq-orders .card .tb-badge {
  width: 24px; height: 24px; flex: none; box-sizing: border-box;
  border-radius: 7px; border: 1.5px solid #f0c060;
  background: rgba(16,10,7,.9); color: #f0c060;
  font-size: 14px; font-weight: 800; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
}
#bbq-orders .card .ring { position: relative; width: 30px; height: 30px; flex: none; }
#bbq-orders .card .ring svg { transform: rotate(-90deg); }
#bbq-orders .card .txt { min-width: 0; }
#bbq-orders .card .nm { font-size: 13px; color: #f5e8d8; font-weight: 600; line-height: 1.25; white-space: nowrap; }
#bbq-orders .card .pr { font-size: 11px; color: #f0c060; font-weight: 600; white-space: nowrap; }
#bbq-orders .card.angry { border-color: rgba(224,90,58,.8); }
@media (max-width: 430px) {
  #bbq-orders { top: calc(max(8px, env(safe-area-inset-top)) + 52px); }
}
@media (max-height: 450px) and (min-width: 600px) {
  #bbq-orders { top: 164px; gap: 4px; }
  #bbq-orders .card { padding: 3px 8px; gap: 6px; }
  #bbq-orders .card .ring { width: 26px; height: 26px; }
  #bbq-orders .card .ring svg { width: 100%; height: 100%; }
  #bbq-orders .card .nm { font-size: 12px; line-height: 1.2; }
  #bbq-orders .card .pr { font-size: 10px; line-height: 1.2; }
}

#bbq-bubbles { position: absolute; inset: 0; overflow: hidden; }
.bubble {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: 4px;
  background: rgba(24,16,12,.76); border: 1.5px solid rgba(232,180,90,.5);
  border-radius: 16px; padding: 2px 8px 2px 3px; font-size: 10px; font-weight: 600;
  color: rgba(245,232,216,.88); white-space: nowrap; transition: opacity .2s;
}
.bubble .nm { font-size: 10px; line-height: 1.2; }
.bubble svg { flex: none; }
.bubble.angry { border-color: #e05a3a; color: #ff9a80; }

#bbq-grillbars { position: absolute; inset: 0; overflow: hidden; }
.gb {
  position: absolute; left: 0; top: 0; display: none; flex-direction: column; align-items: center; gap: 3px;
  background: rgba(24,16,12,.82); border: 1.5px solid rgba(232,180,90,.55);
  border-radius: 9px; padding: 3px 5px 4px; white-space: nowrap; will-change: transform;
}
.gb .gb-bar {
  position: relative; width: 64px; height: 8px; flex: none; border-radius: 4px;
  background: rgba(245,232,216,.18); overflow: hidden;
}
.gb .gb-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #f0c060; border-radius: 4px; }
.gb .gb-mark { position: absolute; right: 0; top: 0; bottom: 0; width: 2px; background: rgba(24,16,12,.85); }
.gb .gb-txt { font-size: 12px; line-height: 14px; font-weight: 700; color: #f5e8d8; }
.gb.done { border-color: #f0c060; }
.gb.done .gb-txt { color: #f0c060; }
.gb.burnt { border-color: #e05a3a; }
.gb.warn { border-color: #ff7a1a; animation: gb-warn 1s ease-in-out infinite; }
.gb.warn .gb-fill { background: #ff7a1a; }
.gb.warn .gb-txt { color: #ff9a40; }
@keyframes gb-warn { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.gb.burnt .gb-fill { background: #8e2a1c; }
.gb.burnt .gb-txt { color: #ff6a4a; }

#bbq-chop { position: absolute; inset: 0; overflow: hidden; }
#bbq-chop .cb {
  position: absolute; left: 0; top: 0; display: none; flex-direction: column; align-items: center; gap: 3px;
  background: rgba(24,16,12,.82); border: 1.5px solid rgba(232,180,90,.55);
  border-radius: 9px; padding: 3px 7px 4px; white-space: nowrap; will-change: transform;
}
#bbq-chop .cb-bar {
  position: relative; width: 64px; height: 8px; flex: none; border-radius: 4px;
  background: rgba(245,232,216,.18); overflow: hidden;
}
#bbq-chop .cb-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #f0c060; border-radius: 4px; }
#bbq-chop .cb-txt { font-size: 13px; line-height: 15px; font-weight: 700; color: #f5e8d8; }
#bbq-chop .cb.done { border-color: #9ecb6a; }
#bbq-chop .cb.done .cb-fill { background: #9ecb6a; }
#bbq-chop .cb.done .cb-txt { color: #9ecb6a; }

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
  position: absolute; transform: translate(-50%, -100%);
  font-size: 24px; line-height: 1.25; font-weight: 800; color: #f0c060; white-space: nowrap;
  padding: 1px 14px; border-radius: 14px; opacity: 1;
  background: rgba(24,16,12,.82); border: 1.5px solid rgba(240,192,96,.7);
  text-shadow: 0 2px 6px rgba(0,0,0,.6); animation: bbq-popup-hold 2.2s linear forwards;
}
.popup.warn { color: #ff7a5c; border-color: rgba(224,90,58,.85); }
.popup.ok { color: #9ecb6a; border-color: rgba(158,203,106,.7); }
@keyframes bbq-popup-hold {
  0%, 64% { opacity: 1; }
  100% { opacity: 0; }
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

const POPUP_LIFT = 44;
const POPUP_LIFE_MS = 2200;
const POPUP_MAX_MS = 8000;

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  parent.appendChild(e);
  return e;
}

export class Hud {
  private root: HTMLElement;
  private levelV: HTMLElement;
  private target = 0;
  private moneyV: HTMLElement;
  private timeV: HTMLElement;
  private starsEl: HTMLElement;
  private ringsEl: HTMLElement;
  private ordersEl: HTMLElement;
  private bubblesEl: HTMLElement;
  private popupsEl: HTMLElement;
  private guideEl: HTMLElement;
  private grillEl: HTMLElement;
  private chopEl: HTMLElement;
  private cb: { root: HTMLElement; fill: HTMLElement; txt: HTMLElement; label: string; done: boolean } | null = null;
  private gbs: { root: HTMLElement; fill: HTMLElement; txt: HTMLElement; state: string; label: string }[] = [];
  private guideTimer = 0;
  private bubbleMap = new Map<number, Bubble>();
  private ringMap = new Map<string, { ring: HTMLElement; num: HTMLElement }>();
  private lastMoney = -1;
  private lastSec = -1;
  private cam: THREE.Camera;
  private tmp = new THREE.Vector3();
  private ringPos = new THREE.Vector3();

  constructor(uiRoot: HTMLElement, cam: THREE.Camera) {
    this.cam = cam;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = el('div', '', uiRoot);
    this.root.id = 'bbq-hud';

    this.ringsEl = el('div', '', this.root);
    this.ringsEl.id = 'bbq-rings';

    const bar = el('div', 'topbar', this.root);
    this.levelV = el('span', 'v level', el('div', 'tb', bar));
    this.levelV.textContent = '第 1 关';
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
    this.grillEl = el('div', '', this.root);
    this.grillEl.id = 'bbq-grillbars';
    this.chopEl = el('div', '', this.root);
    this.chopEl.id = 'bbq-chop';
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

  setLevel(level: number, target: number): void {
    this.target = target;
    this.levelV.textContent = `第 ${level} 关`;
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

  setOrders(customers: Customer[], tables?: TableRuntime[]): void {
    const seated = customers
      .filter((c) => c.phase === 'seated' || c.phase === 'eating')
      .sort((a, b) => tableOrder(a.table) - tableOrder(b.table) || a.id - b.id);
    this.ordersEl.innerHTML = '';
    for (const c of seated.slice(0, 3)) {
      const card = el('div', 'card', this.ordersEl);
      card.dataset.table = c.table;
      const col = tableColor(c.table);
      if (c.patience / c.patienceMax < 0.25 && c.phase === 'seated') card.classList.add('angry');
      const badge = el('div', 'tb-badge', card);
      badge.textContent = String(tableOrder(c.table));
      badge.style.borderColor = col;
      badge.style.color = col;
      const ring = el('div', 'ring', card);
      const frac = c.phase === 'eating' ? 1 : Math.min(1, Math.max(0, c.patience / c.patienceMax));
      const r = 13;
      const circ = 2 * Math.PI * r;
      ring.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="${r}" fill="none" stroke="rgba(240,192,96,.2)" stroke-width="3"/>
          <circle cx="15" cy="15" r="${r}" fill="none" stroke="${frac < 0.25 ? '#e05a3a' : '#f0c060'}"
            stroke-width="3" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - frac)}"/>
        </svg>`;
      const txt = el('div', 'txt', card);
      el('div', 'nm', txt).textContent = DISHES[c.dish].name;
      el('div', 'pr', txt).textContent = `¥${DISHES[c.dish].price} · ${c.phase === 'eating' ? '用餐中' : '等待'}`;
    }
    if (tables) this.updateRings(customers, tables);
  }

  /** world-projected ground rings + table number badges under tables with active orders (seated / eating) */
  updateRings(customers: Customer[], tables: TableRuntime[]): void {
    const active = new Set<string>();
    for (const c of customers) {
      if (c.phase === 'seated' || c.phase === 'eating') active.add(c.table);
    }
    this.cam.updateMatrixWorld();
    const byId = new Map<string, TableRuntime>(tables.map((t) => [t.id, t]));
    for (const tableId of active) {
      const table = byId.get(tableId);
      if (!table) continue;
      let entry = this.ringMap.get(tableId);
      if (!entry) {
        const col = tableColor(tableId);
        const ring = el('div', 'order-ring', this.ringsEl);
        ring.dataset.orderRing = tableId;
        ring.style.setProperty('--rc', col);
        const num = el('div', 'order-num', this.ringsEl);
        num.dataset.orderNum = tableId;
        num.textContent = String(tableOrder(tableId));
        num.style.setProperty('--rc', col);
        entry = { ring, num };
        this.ringMap.set(tableId, entry);
      }
      this.ringPos.set(table.pos.x, 0.02, table.pos.z);
      const p = this.project(this.ringPos);
      if (!p) {
        entry.ring.style.display = 'none';
        entry.num.style.display = 'none';
      } else {
        entry.ring.style.display = 'block';
        entry.ring.style.left = `${p.x}px`;
        entry.ring.style.top = `${p.y}px`;
        entry.num.style.display = 'flex';
        entry.num.style.left = `${p.x}px`;
        entry.num.style.top = `${p.y + 34}px`;
      }
    }
    for (const [tableId, entry] of this.ringMap) {
      if (!active.has(tableId)) {
        entry.ring.remove();
        entry.num.remove();
        this.ringMap.delete(tableId);
      }
    }
  }

  /** born fully visible (opacity 1, 24px), lifted >= POPUP_LIFT px above the anchor and kept clear of bubbles/other popups */
  popup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void {
    this.cam.updateMatrixWorld();
    const p = this.project(worldPos);
    if (!p) return;
    const e = el('div', `popup ${kind}`, this.popupsEl);
    e.textContent = text;
    const w = window.innerWidth;
    const { width: bw, height: bh } = e.getBoundingClientRect();
    const obs: DOMRect[] = [];
    this.bubblesEl.querySelectorAll('.bubble').forEach((b) => obs.push(b.getBoundingClientRect()));
    this.popupsEl.querySelectorAll('.popup').forEach((o) => { if (o !== e) obs.push(o.getBoundingClientRect()); });
    const clash = (x: number, bottom: number): boolean =>
      obs.some((r) => x - bw / 2 < r.right + 4 && r.left - 4 < x + bw / 2 && bottom - bh < r.bottom + 4 && r.top - 4 < bottom);
    const clampX = (x: number): number => Math.min(Math.max(x, bw / 2 + 4), Math.max(w - bw / 2 - 4, bw / 2 + 4));
    let best = { x: clampX(p.x), bottom: p.y - POPUP_LIFT };
    search: for (const dx of [0, 1, -1, 2, -2, 3, -3]) {
      const x = clampX(p.x + dx * (bw * 0.6 + 8));
      for (let bottom = p.y - POPUP_LIFT; bottom - bh >= 0; bottom -= 6) {
        if (!clash(x, bottom)) { best = { x, bottom }; break search; }
      }
    }
    e.style.left = `${best.x}px`;
    e.style.top = `${best.bottom}px`;
    e.dataset.ax = String(p.x);
    e.dataset.ay = String(p.y);
    const t0 = performance.now();
    e.dataset.t0 = String(Math.round(t0));
    const kill = (): void => { if (!e.isConnected) return; e.dataset.life = String(Math.round(performance.now() - t0)); e.remove(); };
    let frames = 0;
    const tick = (): void => {
      frames++;
      if (performance.now() - t0 >= POPUP_LIFE_MS && frames >= 3) kill();
      else if (performance.now() - t0 < POPUP_MAX_MS) requestAnimationFrame(tick);
      else kill();
    };
    requestAnimationFrame(tick);
    setTimeout(kill, POPUP_MAX_MS);
  }

  private project(v: THREE.Vector3): { x: number; y: number } | null {
    this.tmp.copy(v).project(this.cam);
    if (this.tmp.z > 1) return null;
    return {
      x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  /** screen-space grill badges: one per occupied slot, constant pixel size (64×8 bar + status line) */
  updateGrill(slots: GrillSlot[]): void {
    this.cam.updateMatrixWorld();
    const w = window.innerWidth;
    const h = window.innerHeight;
    slots.forEach((slot, i) => {
      let b = this.gbs[i];
      if (!b) {
        const root = el('div', 'gb', this.grillEl);
        root.dataset.slot = String(i);
        const bar = el('div', 'gb-bar', root);
        const fill = el('div', 'gb-fill', bar);
        el('div', 'gb-mark', bar);
        b = this.gbs[i] = { root, fill, txt: el('div', 'gb-txt', root), state: '', label: '' };
      }
      const item = slot.item;
      this.tmp.copy(slot.pos);
      this.tmp.y += 0.5;
      this.tmp.project(this.cam);
      const x = (this.tmp.x * 0.5 + 0.5) * w;
      const y = (-this.tmp.y * 0.5 + 0.5) * h;
      if (!item || this.tmp.z > 1 || x < 0 || x > w || y < 0 || y > h) {
        b.root.style.display = 'none';
        return;
      }
      const t = item.grillT;
      const state = t >= COOK.burnTime ? 'burnt' : t >= COOK.burnTime - 2 ? 'warn' : t >= COOK.grillTime ? 'done' : 'cooking';
      const label = state === 'burnt' ? '焦了 ✗' : state === 'warn' ? `快焦了 ${Math.ceil(COOK.burnTime - t)}s` : state === 'done' ? '已熟 ✓' : `烤制中 ${Math.ceil(COOK.grillTime - t)}s`;
      if (label !== b.label) { b.label = label; b.txt.textContent = label; }
      if (state !== b.state) {
        b.state = state;
        b.root.classList.toggle('done', state === 'done');
        b.root.classList.toggle('warn', state === 'warn');
        b.root.classList.toggle('burnt', state === 'burnt');
      }
      b.fill.style.width = `${Math.min(1, t / COOK.grillTime) * 100}%`;
      b.root.style.display = 'flex';
      b.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    });
  }

  /** screen-space chop progress over the board: 切配 n/total → 已切好 ✓; hidden while the board is empty */
  updateChop(board: StationRuntime, total: number): void {
    let b = this.cb;
    if (!b) {
      const root = el('div', 'cb', this.chopEl);
      const bar = el('div', 'cb-bar', root);
      b = this.cb = { root, fill: el('div', 'cb-fill', bar), txt: el('div', 'cb-txt', root), label: '', done: false };
    }
    this.cam.updateMatrixWorld();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.tmp.set(board.pos.x - 0.4, board.topY + 0.38, board.pos.z).project(this.cam);
    const x = (this.tmp.x * 0.5 + 0.5) * w;
    const y = (-this.tmp.y * 0.5 + 0.5) * h;
    if (!board.held || this.tmp.z > 1 || x < 0 || x > w || y < 0 || y > h) {
      b.root.style.display = 'none';
      return;
    }
    const n = total - board.chopLeft;
    const done = board.chopLeft <= 0;
    const label = done ? '已切好 ✓' : `切配 ${n}/${total}`;
    if (label !== b.label) { b.label = label; b.txt.textContent = label; }
    if (done !== b.done) { b.done = done; b.root.classList.toggle('done', done); }
    b.fill.style.width = `${(n / total) * 100}%`;
    b.root.style.display = 'flex';
    b.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
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
      const frac = c.phase === 'eating' ? 1 : Math.min(1, Math.max(0, c.patience / c.patienceMax));
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
    return this.target;
  }
}
