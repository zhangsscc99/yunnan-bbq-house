// DOM HUD: top strip (¥ / time / stars), order cards with countdown rings,
// world-anchored customer bubbles + floating popups. No emoji, inline SVG.

import * as THREE from 'three';
import { DISHES } from '../config.ts';
import type { Customer, CookWindow } from '../game/types.ts';
import type { OrderCardState } from '../game/flow.ts';
import type { TableRuntime } from '../world/dining.ts';
import { TABLES } from '../world/layout.ts';
import { FOOD_ICONS } from './controls.ts';

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
  position: absolute; top: max(8px, env(safe-area-inset-top)); left: 50%; z-index: 6;
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

#bbq-rings { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
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

/* Portrait default: 2-column bottom thumb-zone dock with 24px bottom safe margin */
#bbq-orders {
  position: absolute;
  left: 8px; right: 8px;
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  align-items: stretch;
  pointer-events: none;
}
#bbq-orders .card {
  display: grid;
  grid-template-columns: 22px 24px minmax(0, 1fr) 56px;
  grid-template-rows: auto auto;
  grid-template-areas:
    "badge ring nm nm"
    "pr    pr   pr btn";
  align-items: center;
  column-gap: 4px;
  row-gap: 3px;
  box-sizing: border-box;
  width: 100%; min-width: 0; max-width: 100%;
  background: rgba(24,16,12,.84); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.48); border-radius: 14px;
  padding: 5px 7px;
  pointer-events: auto;
  transition: border-color .15s, box-shadow .15s, background-color .15s;
}
#bbq-orders .card .tb-badge {
  grid-area: badge;
  width: 22px; height: 22px; flex: none; box-sizing: border-box;
  border-radius: 7px; border: 1.5px solid #f0c060;
  background: rgba(16,10,7,.9); color: #f0c060;
  font-size: 14px; font-weight: 800; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
}
#bbq-orders .card .ring { grid-area: ring; position: relative; width: 24px; height: 24px; flex: none; }
#bbq-orders .card .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); display: block; }
#bbq-orders .card .txt { display: contents; }
#bbq-orders .card .nm {
  grid-area: nm; min-width: 0;
  display: flex; align-items: center; gap: 3px;
  font-size: 13px; color: #f5e8d8; font-weight: 600; line-height: 1.25; white-space: nowrap;
}
#bbq-orders .card .nm svg.food-ico { width: 16px; height: 16px; flex: none; }
#bbq-orders .card .pr {
  grid-area: pr; min-width: 0; align-self: center;
  font-size: 13px; color: #f0c060; font-weight: 600; line-height: 1.2;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
#bbq-orders .card.angry { border-color: rgba(224,90,58,.8); }
#bbq-orders .card[data-cook-window="raw"] { border-color: rgba(154,160,166,.65); }
#bbq-orders .card[data-cook-window="raw"] .pr { color: #b8bec4; }
#bbq-orders .card[data-cook-window="raw"][data-lock-raw="true"] { border-color: rgba(220,214,204,.72); }
#bbq-orders .card[data-cook-window="raw"][data-lock-raw="true"] .pr { color: #dcd6cc; }
#bbq-orders .card[data-cook-window="perfect"] {
  border-color: #f0c060;
  box-shadow: 0 0 12px rgba(240,192,96,.32);
}
#bbq-orders .card[data-cook-window="perfect"] .pr { color: #f6cf70; }
#bbq-orders .card[data-cook-window="over"] {
  border-color: #ff8c24;
  box-shadow: 0 0 14px rgba(255,140,36,.42);
}
#bbq-orders .card[data-cook-window="over"] .pr { color: #ffa048; }
#bbq-orders .card[data-cook-window="burnt"] {
  border-color: #e04836;
  background: rgba(54,18,14,.86);
  box-shadow: 0 0 12px rgba(224,72,54,.42);
}
#bbq-orders .card[data-cook-window="burnt"] .pr { color: #ff7a66; }

#bbq-orders .card .card-btn {
  grid-area: btn; justify-self: end;
  position: relative;
  appearance: none; -webkit-appearance: none;
  box-sizing: border-box; font: inherit; margin: 0; padding: 0; border: 0;
  width: 56px; height: 56px; min-width: 56px; min-height: 56px; flex: none;
  border-radius: 50%; overflow: hidden;
  background: rgba(32,20,13,.92);
  color: #f5e8d8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px;
  pointer-events: auto; cursor: pointer; touch-action: manipulation;
  transition: transform .08s, background-color .15s, opacity .15s, box-shadow .15s;
}
#bbq-orders .card .card-btn:focus { outline: none; }
#bbq-orders .card .card-btn:focus-visible { outline: 2px solid #f0c060; outline-offset: 2px; }
#bbq-orders .card .card-btn:active:not(:disabled) { transform: scale(.93); }
#bbq-orders .card .card-btn:disabled {
  cursor: not-allowed; opacity: .65;
  background: rgba(24,17,13,.82);
}
#bbq-orders .card .card-btn svg.cook-ring {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; display: block;
}
#bbq-orders .card .card-btn .btn-ico {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  width: 19px; height: 19px;
}
#bbq-orders .card .card-btn .btn-ico svg { width: 19px; height: 19px; display: block; }
#bbq-orders .card .card-btn .btn-lbl {
  position: relative; z-index: 1;
  font-size: 10px; font-weight: 700; line-height: 1.1;
  color: #f5e8d8; white-space: nowrap; letter-spacing: 0;
}
#bbq-orders .card[data-cook-window="raw"] .card-btn { background: rgba(34,34,36,.92); color: #9aa0a6; }
#bbq-orders .card[data-cook-window="raw"] .card-btn .btn-lbl { color: #9aa0a6; }
#bbq-orders .card[data-cook-window="raw"][data-lock-raw="true"] .card-btn { background: rgba(38,30,22,.94); color: #e6dcc8; }
#bbq-orders .card[data-cook-window="raw"][data-lock-raw="true"] .card-btn .btn-lbl { color: #e6dcc8; }
#bbq-orders .card[data-cook-window="raw"][data-lock-raw="true"] .card-btn:active:not(:disabled) { transform: none; }
#bbq-orders .card[data-cook-window="perfect"] .card-btn {
  background: rgba(52,36,14,.94);
  box-shadow: 0 0 10px rgba(240,192,96,.45);
}
#bbq-orders .card[data-cook-window="perfect"] .card-btn .btn-lbl { color: #f6cf70; }
#bbq-orders .card[data-cook-window="over"] .card-btn {
  background: rgba(62,30,10,.94);
  animation: bbq-over-pulse .65s ease-in-out infinite;
}
#bbq-orders .card[data-cook-window="over"] .card-btn .btn-lbl { color: #ffad5c; }
#bbq-orders .card[data-cook-window="burnt"] .card-btn {
  background: rgba(68,18,14,.95); opacity: .92;
}
#bbq-orders .card[data-cook-window="burnt"] .card-btn .btn-lbl { color: #ff8070; }
@keyframes bbq-over-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255,140,36,.35); transform: scale(1); }
  50% { box-shadow: 0 0 16px rgba(255,140,36,.9); transform: scale(1.04); }
}
@media (prefers-reduced-motion: reduce) {
  #bbq-orders .card[data-cook-window="over"] .card-btn { animation: none; }
}
/* Landscape / wide screens: single equal-width bottom row of 4 cards clear of dining tables & grill */
@media (min-width: 600px) {
  #bbq-orders {
    left: 7px; right: 7px;
    bottom: max(10px, env(safe-area-inset-bottom));
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
  }
  #bbq-orders .card {
    grid-template-columns: 21px minmax(0, 1fr) 56px;
    grid-template-rows: auto auto;
    grid-template-areas:
      "badge nm btn"
      "ring  pr btn";
    column-gap: 3px;
    row-gap: 3px;
    padding: 5px 5px;
  }
  #bbq-orders .card .tb-badge { width: 21px; height: 21px; }
  #bbq-orders .card .ring { width: 22px; height: 22px; }
  #bbq-orders .card .nm { gap: 2px; }
}
@media (min-width: 960px) {
  #bbq-orders {
    left: 50%; right: auto;
    transform: translateX(-50%);
    width: min(920px, calc(100vw - 24px));
    bottom: max(16px, env(safe-area-inset-bottom));
    gap: 8px;
  }
  #bbq-orders .card { padding: 6px 8px; column-gap: 5px; }
}

#bbq-onboard {
  position: absolute; left: 0; top: 0; z-index: 5;
  display: none; align-items: center; justify-content: center;
  padding: 6px 12px; border-radius: 12px;
  background: rgba(24,16,12,.94);
  border: 1.5px solid #f0c060;
  box-shadow: 0 4px 16px rgba(0,0,0,.6), 0 0 12px rgba(240,192,96,.38);
  color: #f6cf70; font-size: 13px; font-weight: 700; line-height: 1.25;
  white-space: nowrap; pointer-events: none;
  animation: bbq-ob-bob 1.1s ease-in-out infinite;
}
#bbq-onboard .ob-arrow {
  position: absolute; bottom: -6px; left: var(--ax, 50%);
  width: 10px; height: 10px; box-sizing: border-box;
  background: rgba(24,16,12,.94);
  border-right: 1.5px solid #f0c060;
  border-bottom: 1.5px solid #f0c060;
  transform: translateX(-50%) rotate(45deg);
}
@keyframes bbq-ob-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  #bbq-onboard { animation: none; }
}

#bbq-bubbles { position: absolute; inset: 0; z-index: 2; overflow: hidden; pointer-events: none; }
.bubble {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: 4px;
  background: rgba(24,16,12,.76); border: 1.5px solid rgba(232,180,90,.5);
  border-radius: 16px; padding: 2px 8px 2px 3px; font-size: 10px; font-weight: 600;
  color: rgba(245,232,216,.88); white-space: nowrap; transition: opacity .2s;
}
.bubble .nm { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; line-height: 1.2; }
.bubble svg { flex: none; }
.bubble svg.food-ico { width: 16px; height: 16px; flex: none; }
.bubble.angry { border-color: #e05a3a; color: #ff9a80; }
.bubble.entering {
  width: 10px; height: 10px; box-sizing: border-box;
  padding: 0; gap: 0; border-radius: 50%;
  background: rgba(240,192,96,.92); border: 1.5px solid rgba(24,16,12,.85);
  box-shadow: 0 0 6px rgba(240,192,96,.6);
}
.bubble.entering > * { display: none; }

#bbq-popups { position: absolute; inset: 0; z-index: 3; overflow: hidden; pointer-events: none; }
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

interface Box { left: number; top: number; right: number; bottom: number }

const STAR = (filled: boolean): string => `
<svg viewBox="0 0 24 24" fill="${filled ? '#f0c060' : 'none'}" stroke="${filled ? '#f0c060' : 'rgba(240,192,96,.4)'}" stroke-width="1.8">
  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/>
</svg>`;

const RING_R = 12;
const RING_C = 2 * Math.PI * RING_R;

const PATIENCE_R = 13;
const PATIENCE_C = 2 * Math.PI * PATIENCE_R;

const COOK_RING_R = 25;
const COOK_RING_C = 2 * Math.PI * COOK_RING_R;

type CardBtnIconKey = 'fire' | 'lift' | 'warn' | 'full' | 'done';

// inline SVG icons for order-card primary circular button (no emoji)
const CARD_BTN_ICONS: Record<CardBtnIconKey, string> = {
  fire: `<svg viewBox="0 0 24 24" data-card-ico="fire" fill="none" stroke="#f0c060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3c1 3-2 4.5-2 7a4 4 0 0 0 8 0c0-1.5-.8-2.6-1.6-3.8-.5 1-1.2 1.6-1.9 1.8C14.7 6.5 14 4.5 12 3z"/>
    <path d="M7.5 14.5a6.5 6.5 0 1 0 9 0"/>
  </svg>`,
  lift: `<svg viewBox="0 0 24 24" data-card-ico="lift" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/>
    <path d="M4 18h16M6 18a6 6 0 0 1 12 0"/>
  </svg>`,
  warn: `<svg viewBox="0 0 24 24" data-card-ico="warn" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10.3 3.8L2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/>
    <path d="M12 9.2v4.6"/>
    <circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/>
  </svg>`,
  full: `<svg viewBox="0 0 24 24" data-card-ico="full" fill="none" stroke="rgba(245,232,216,.55)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="6" width="16" height="12" rx="2"/>
    <path d="M9 6v12M15 6v12"/>
  </svg>`,
  done: `<svg viewBox="0 0 24 24" data-card-ico="done" fill="none" stroke="#7fd08a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5"/>
  </svg>`,
};

interface CardView {
  tableId: string;
  root: HTMLElement;
  badge: HTMLElement;
  patienceArc: SVGCircleElement;
  nm: HTMLElement;
  pr: HTMLElement;
  btn: HTMLButtonElement;
  cookBg: SVGCircleElement;
  cookArc: SVGCircleElement;
  btnIco: HTMLElement;
  btnLbl: HTMLElement;
  dishKey: string;
  statusText: string;
  btnText: string;
  iconKey: CardBtnIconKey | '';
  cookWindow: CookWindow;
  cookT: number;
  progressPct: number;
  rawLocked: boolean;
  label: string;
  slotIndex: number;
}

export interface CardStateSnapshot {
  cookWindow: CookWindow;
  cookT: number;
  progressPct: number;
  btn: { w: number; h: number };
  disabled: boolean;
  rawLocked: boolean;
  label: string;
  slotIndex: number;
}

interface Bubble {
  root: HTMLElement;
  arc: SVGElement;
  nm: HTMLElement;
  label: string;
  frac: number;
  angry: boolean;
  entering: boolean;
}

const BUBBLE_EDGE = 4;
const BUBBLE_TOP_GAP = 6;
const BUBBLE_PAD = 4;
const BUBBLE_EPS = 0.5;
const RING_TOP_GAP = 6;
const RING_EPS = 0.5;

const POPUP_LIFT = 44;
const POPUP_EDGE = 8;
const POPUP_PAD = 4;
const POPUP_EPS = 1;
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
  private topbarEl: HTMLElement;
  private levelV: HTMLElement;
  private target = 0;
  private moneyV: HTMLElement;
  private timeV: HTMLElement;
  private starsEl: HTMLElement;
  private ringsEl: HTMLElement;
  private ordersEl: HTMLElement;
  private onboardEl: HTMLElement;
  private onboardTxt: HTMLElement;
  private onboardTableId = '';
  private onboardText = '';
  private servedCount = 0;
  private bubblesEl: HTMLElement;
  private popupsEl: HTMLElement;
  private cardMap = new Map<string, CardView>();
  private onCardAction: ((tableId: string) => void) | null = null;
  private bubbleMap = new Map<number, Bubble>();
  private ringMap = new Map<string, { ring: HTMLElement; num: HTMLElement }>();
  private lastMoney = -1;
  private lastSec = -1;
  private lastStars = -1;
  private playHudVisible = false;
  private cam: THREE.Camera;
  private tmp = new THREE.Vector3();
  private ringPos = new THREE.Vector3();
  private headPos = new THREE.Vector3();

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
    this.topbarEl = bar;
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
    this.setStars(1);

    this.ordersEl = el('div', '', this.root);
    this.ordersEl.id = 'bbq-orders';
    this.onboardEl = el('div', '', this.root);
    this.onboardEl.id = 'bbq-onboard';
    this.onboardEl.dataset.onboardTip = '';
    this.onboardEl.setAttribute('role', 'status');
    this.onboardTxt = el('span', 'ob-txt', this.onboardEl);
    const obArrow = el('span', 'ob-arrow', this.onboardEl);
    obArrow.setAttribute('aria-hidden', 'true');
    this.bubblesEl = el('div', '', this.root);
    this.bubblesEl.id = 'bbq-bubbles';
    this.popupsEl = el('div', '', this.root);
    this.popupsEl.id = 'bbq-popups';
    this.setPlayHudVisible(false);
  }

  /**
   * Single entry point for play-only HUD layers (B-126).
   * Top bar (#bbq-hud .topbar) remains visible in menu/results; order cards, onboarding tip,
   * bubbles, popups, and table rings hide & clear immediately.
   */
  setPlayHudVisible(v: boolean): void {
    this.playHudVisible = v;
    if (!v) {
      for (const [, c] of this.cardMap) c.root.remove();
      this.cardMap.clear();
      this.ordersEl.innerHTML = '';
      this.ordersEl.style.display = 'none';
      this.ordersEl.style.opacity = '0';
      this.ordersEl.style.pointerEvents = 'none';

      this.hideOnboard();
      this.servedCount = 0;

      for (const [, b] of this.bubbleMap) b.root.remove();
      this.bubbleMap.clear();
      this.bubblesEl.innerHTML = '';
      this.bubblesEl.style.display = 'none';

      this.popupsEl.innerHTML = '';
      this.popupsEl.style.display = 'none';

      for (const [, entry] of this.ringMap) {
        entry.ring.remove();
        entry.num.remove();
      }
      this.ringMap.clear();
      this.ringsEl.innerHTML = '';
      this.ringsEl.style.display = 'none';
    } else {
      this.ordersEl.style.display = '';
      this.ordersEl.style.opacity = '1';
      this.ordersEl.style.pointerEvents = '';
      this.bubblesEl.style.display = '';
      this.popupsEl.style.display = '';
      this.ringsEl.style.display = '';
    }
  }

  private hideOnboard(): void {
    this.onboardTableId = '';
    this.onboardText = '';
    this.onboardEl.dataset.onboardTip = '';
    if (this.onboardEl.style.display !== 'none') this.onboardEl.style.display = 'none';
  }

  private positionOnboard(view: CardView): void {
    if (!view.root.isConnected || this.onboardEl.style.display === 'none') return;
    const cardRect = view.root.getBoundingClientRect();
    const btnRect = view.btn.getBoundingClientRect();
    const obRect = this.onboardEl.getBoundingClientRect();
    if (cardRect.width <= 0 || btnRect.width <= 0 || obRect.width <= 0) return;

    const vw = window.innerWidth;
    const tb = this.topbarEl.getBoundingClientRect();
    const topSafe = (tb.height > 0 ? tb.bottom : 0) + 6;
    const btnCx = btnRect.left + btnRect.width / 2;
    const left = Math.min(Math.max(8, btnCx - obRect.width / 2), Math.max(8, vw - 8 - obRect.width));
    const anchorTop = Math.min(cardRect.top, btnRect.top);
    const top = Math.max(topSafe, anchorTop - obRect.height - 10);
    const arrowX = Math.min(Math.max(12, btnCx - left), Math.max(12, obRect.width - 12));

    this.onboardEl.style.left = `${Math.round(left)}px`;
    this.onboardEl.style.top = `${Math.round(top)}px`;
    this.onboardEl.style.setProperty('--ax', `${Math.round(arrowX)}px`);
  }

  /** Re-anchor onboarding bubble after viewport resize. */
  repositionOnboard(): void {
    if (!this.onboardTableId) return;
    const view = this.cardMap.get(this.onboardTableId);
    if (view) this.positionOnboard(view);
  }

  private updateOnboard(shown: OrderCardState[]): void {
    if (!this.playHudVisible || this.servedCount >= 1 || !shown.length) {
      this.hideOnboard();
      return;
    }
    const cooking = shown.find(
      (s) => s.cookWindow === 'raw' || s.cookWindow === 'perfect' || s.cookWindow === 'over',
    );
    const target = cooking ?? shown.find((s) => s.cookWindow === 'idle' && !s.disabled);
    if (!target) {
      this.hideOnboard();
      return;
    }
    const view = this.cardMap.get(target.tableId);
    if (!view) {
      this.hideOnboard();
      return;
    }
    const mode = cooking ? 'lift' : 'put';
    const text = cooking ? '金环亮起就起锅' : '点一下上炉';
    this.onboardTableId = target.tableId;
    if (this.onboardText !== text) {
      this.onboardText = text;
      this.onboardTxt.textContent = text;
    }
    if (this.onboardEl.dataset.onboardTip !== mode) {
      this.onboardEl.dataset.onboardTip = mode;
    }
    if (this.onboardEl.style.display !== 'flex') {
      this.onboardEl.style.display = 'flex';
    }
    this.positionOnboard(view);
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

  setStars(stars: number): void {
    if (stars === this.lastStars) return;
    this.lastStars = stars;
    this.starsEl.dataset.stars = String(stars);
    this.starsEl.setAttribute('aria-label', `评级 ${stars}/3`);
    this.starsEl.innerHTML = STAR(stars >= 1) + STAR(stars >= 2) + STAR(stars >= 3);
  }

  setOnCardAction(cb: (tableId: string) => void): void {
    this.onCardAction = cb;
  }

  private createCardView(tableId: string): CardView {
    const card = el('div', 'card', this.ordersEl);
    card.dataset.table = tableId;
    card.dataset.cookWindow = 'idle';
    card.dataset.lockRaw = 'false';
    const col = tableColor(tableId);

    const badge = el('div', 'tb-badge', card);
    badge.textContent = String(tableOrder(tableId));
    badge.style.borderColor = col;
    badge.style.color = col;

    const ring = el('div', 'ring', card);
    ring.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="${PATIENCE_R}" fill="none" stroke="rgba(240,192,96,.2)" stroke-width="3"/>
        <circle cx="15" cy="15" r="${PATIENCE_R}" fill="none" stroke="#f0c060"
          stroke-width="3" stroke-linecap="round" stroke-dasharray="${PATIENCE_C}" stroke-dashoffset="0"/>
      </svg>`;
    const patienceArc = ring.querySelector('circle:nth-of-type(2)') as SVGCircleElement;

    const txt = el('div', 'txt', card);
    const nm = el('div', 'nm', txt);
    const pr = el('div', 'pr', txt);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-btn';
    btn.innerHTML = `
      <svg class="cook-ring" viewBox="0 0 56 56" aria-hidden="true">
        <circle class="cook-bg" cx="28" cy="28" r="${COOK_RING_R}" fill="none" stroke="rgba(232,180,90,.65)" stroke-width="4"/>
        <circle class="cook-arc" cx="28" cy="28" r="${COOK_RING_R}" fill="none" stroke="#dcd6cc" stroke-width="4"
          stroke-linecap="round" stroke-dasharray="${COOK_RING_C}" stroke-dashoffset="${COOK_RING_C}"
          stroke-opacity="0" transform="rotate(-90 28 28)"/>
      </svg>
      <span class="btn-ico" aria-hidden="true"></span>
      <span class="btn-lbl"></span>`;
    card.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      this.onCardAction?.(tableId);
    });

    const view: CardView = {
      tableId,
      root: card,
      badge,
      patienceArc,
      nm,
      pr,
      btn,
      cookBg: btn.querySelector('.cook-bg') as SVGCircleElement,
      cookArc: btn.querySelector('.cook-arc') as SVGCircleElement,
      btnIco: btn.querySelector('.btn-ico') as HTMLElement,
      btnLbl: btn.querySelector('.btn-lbl') as HTMLElement,
      dishKey: '',
      statusText: '',
      btnText: '',
      iconKey: '',
      cookWindow: 'idle',
      cookT: 0,
      progressPct: 0,
      rawLocked: false,
      label: '',
      slotIndex: -1,
    };
    this.cardMap.set(tableId, view);
    return view;
  }

  setOrders(customers: Customer[], tables?: TableRuntime[], cardStates?: OrderCardState[], served?: number): void {
    if (!this.playHudVisible) return;
    if (typeof served === 'number') this.servedCount = served;
    const items: OrderCardState[] = cardStates
      ? [...cardStates]
      : customers
        .filter((c) => c.phase === 'seated' || c.phase === 'eating')
        .map((c): OrderCardState => {
          const price = DISHES[c.dish].price;
          const eating = c.phase === 'eating';
          return {
            tableId: c.table,
            customerId: c.id,
            dish: c.dish,
            phase: eating ? 'eating' : 'seated',
            patience: eating ? c.patienceMax : c.patience,
            patienceMax: c.patienceMax,
            cookWindow: eating ? 'eating' : 'idle',
            cookT: 0,
            progressPct: 0,
            disabled: eating,
            rawLocked: false,
            label: eating ? '用餐中' : '上炉',
            statusText: `¥${price} · ${eating ? '用餐中' : '等待'}`,
            slotIndex: -1,
          };
        });

    items.sort((a, b) => tableOrder(a.tableId) - tableOrder(b.tableId) || a.customerId - b.customerId);
    const shown = items.slice(0, 4);
    const liveTables = new Set<string>(shown.map((s) => s.tableId));

    // remove gone cards first
    for (const [tid, view] of this.cardMap) {
      if (!liveTables.has(tid)) {
        view.root.remove();
        this.cardMap.delete(tid);
      }
    }

    // reconcile in-place in strict ascending table order without destroying live <button> nodes
    shown.forEach((st, idx) => {
      let view = this.cardMap.get(st.tableId);
      if (!view) view = this.createCardView(st.tableId);
      const curChild = this.ordersEl.children[idx];
      if (curChild !== view.root) {
        this.ordersEl.insertBefore(view.root, curChild ?? null);
      }

      if (view.dishKey !== st.dish) {
        view.dishKey = st.dish;
        view.nm.innerHTML = FOOD_ICONS[st.dish];
        const nmTxt = document.createElement('span');
        nmTxt.textContent = DISHES[st.dish].name;
        view.nm.appendChild(nmTxt);
      }

      const frac = st.phase === 'eating'
        ? 1
        : st.patienceMax > 0
          ? Math.min(1, Math.max(0, st.patience / st.patienceMax))
          : 0;
      const angry = st.phase === 'seated' && frac < 0.25;
      view.root.classList.toggle('angry', angry);
      view.patienceArc.setAttribute('stroke', angry ? '#e05a3a' : '#f0c060');
      view.patienceArc.setAttribute('stroke-dashoffset', String(PATIENCE_C * (1 - frac)));

      if (view.statusText !== st.statusText) {
        view.statusText = st.statusText;
        view.pr.textContent = st.statusText;
      }

      view.cookWindow = st.cookWindow;
      view.cookT = st.cookT;
      view.progressPct = st.progressPct;
      view.rawLocked = st.rawLocked;
      view.label = st.label;
      view.slotIndex = st.slotIndex;

      if (view.root.dataset.cookWindow !== st.cookWindow) {
        view.root.dataset.cookWindow = st.cookWindow;
      }
      const lockRaw = st.rawLocked ? 'true' : 'false';
      if (view.root.dataset.lockRaw !== lockRaw) {
        view.root.dataset.lockRaw = lockRaw;
      }
      view.root.dataset.cookT = String(st.cookT);
      view.root.dataset.progressPct = String(st.progressPct);
      view.root.dataset.slotIndex = String(st.slotIndex);

      if (view.btn.disabled !== st.disabled) view.btn.disabled = st.disabled;

      // segmented progress ring color (raw=灰白/弱灰, perfect=金, over=橙+pulse, burnt=红) & icon/text
      let iconKey: CardBtnIconKey;
      let btnText: string;
      let bgStroke: string;
      let arcStroke = '#dcd6cc';
      let arcOpacity = '0';
      let arcOffset = COOK_RING_C;
      let icoColor = '#f0c060';

      switch (st.cookWindow) {
        case 'raw':
          if (st.rawLocked) {
            iconKey = 'fire';
            btnText = '上炉中';
            bgStroke = 'rgba(220,214,204,.22)';
            arcStroke = '#dcd6cc';
            arcOpacity = '1';
            arcOffset = COOK_RING_C * (1 - st.progressPct / 100);
            icoColor = '#f0c060';
          } else {
            iconKey = 'lift';
            btnText = '未熟';
            bgStroke = 'rgba(154,160,166,.22)';
            arcStroke = '#9aa0a6';
            arcOpacity = '1';
            arcOffset = COOK_RING_C * (1 - st.progressPct / 100);
            icoColor = '#9aa0a6';
          }
          break;
        case 'perfect':
          iconKey = 'lift';
          btnText = '起锅';
          bgStroke = 'rgba(240,192,96,.24)';
          arcStroke = '#f0c060';
          arcOpacity = '1';
          arcOffset = COOK_RING_C * (1 - st.progressPct / 100);
          icoColor = '#f0c060';
          break;
        case 'over':
          iconKey = 'warn';
          btnText = '快起';
          bgStroke = 'rgba(255,140,36,.26)';
          arcStroke = '#ff8c24';
          arcOpacity = '1';
          arcOffset = COOK_RING_C * (1 - st.progressPct / 100);
          icoColor = '#ff9a3c';
          break;
        case 'burnt':
          iconKey = 'warn';
          btnText = '焦糊';
          bgStroke = 'rgba(224,72,54,.32)';
          arcStroke = '#e04836';
          arcOpacity = '1';
          arcOffset = 0;
          icoColor = '#ff6b5a';
          break;
        case 'eating':
          iconKey = 'done';
          btnText = '已上';
          bgStroke = 'rgba(127,208,138,.45)';
          break;
        default: // 'idle'
          if (st.disabled) {
            iconKey = 'full';
            btnText = '烤位满了';
            bgStroke = 'rgba(245,232,216,.28)';
          } else {
            iconKey = 'fire';
            btnText = '上炉';
            bgStroke = 'rgba(232,180,90,.65)';
          }
          break;
      }

      view.cookBg.setAttribute('stroke', bgStroke);
      view.cookArc.setAttribute('stroke', arcStroke);
      view.cookArc.setAttribute('stroke-opacity', arcOpacity);
      view.cookArc.setAttribute('stroke-dashoffset', String(arcOffset));

      if (view.iconKey !== iconKey) {
        view.iconKey = iconKey;
        view.btnIco.innerHTML = CARD_BTN_ICONS[iconKey];
      }
      if (view.btnIco.style.color !== icoColor) view.btnIco.style.color = icoColor;
      if (view.btnText !== btnText) {
        view.btnText = btnText;
        view.btnLbl.textContent = btnText;
      }
      const aria = st.cookWindow === 'raw'
        ? (st.rawLocked ? `上炉中 · ${st.label}` : st.label)
        : st.cookWindow === 'perfect' || st.cookWindow === 'over'
          ? `起锅 · ${st.label}`
          : st.label;
      if (view.btn.getAttribute('aria-label') !== aria) {
        view.btn.setAttribute('aria-label', aria);
      }
    });

    this.updateOnboard(shown);
    if (tables) this.updateRings(customers, tables);
  }

  cardState(tableId: string): CardStateSnapshot | null {
    const view = this.cardMap.get(tableId);
    if (!view || !view.root.isConnected) return null;
    const r = view.btn.getBoundingClientRect();
    return {
      cookWindow: view.cookWindow,
      cookT: view.cookT,
      progressPct: view.progressPct,
      btn: { w: Number(r.width.toFixed(2)), h: Number(r.height.toFixed(2)) },
      disabled: view.btn.disabled,
      rawLocked: view.rawLocked,
      label: view.label,
      slotIndex: view.slotIndex,
    };
  }

  /** world-projected ground rings + table number badges under tables with active orders (seated / eating) */
  updateRings(customers: Customer[], tables: TableRuntime[]): void {
    if (!this.playHudVisible) return;
    const active = new Set<string>();
    for (const c of customers) {
      if (c.phase === 'seated' || c.phase === 'eating') active.add(c.table);
    }
    this.cam.updateMatrixWorld();
    const tb = this.topbarEl.getBoundingClientRect();
    const topSafe = (tb.height > 0 ? tb.bottom : 0) + RING_TOP_GAP + RING_EPS;
    let ordersTop = window.innerHeight;
    for (const [, view] of this.cardMap) {
      const r = view.root.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top < ordersTop) ordersTop = r.top;
    }
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
        entry.num.style.display = 'flex';
        const ringH = entry.ring.offsetHeight || 58;
        const numH = entry.num.offsetHeight || 28;
        let ringCy = Math.max(p.y, topSafe + ringH / 2);
        let numCy = Math.max(ringCy + 34, topSafe + numH / 2);
        if (ordersTop < window.innerHeight) {
          const maxRingCy = ordersTop - RING_TOP_GAP - ringH / 2;
          const maxNumCy = ordersTop - RING_TOP_GAP - numH / 2;
          if (ringCy > maxRingCy) ringCy = Math.max(topSafe + ringH / 2, maxRingCy);
          if (numCy > maxNumCy) numCy = Math.max(topSafe + numH / 2, maxNumCy);
        }
        entry.ring.style.left = `${p.x}px`;
        entry.ring.style.top = `${ringCy}px`;
        entry.num.style.left = `${p.x}px`;
        entry.num.style.top = `${numCy}px`;
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

  /** born fully visible (opacity 1, 24px), clamped to 4-edge viewport safe area (below live .topbar) and kept clear of topbar/bubbles/other popups */
  popup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void {
    if (!this.playHudVisible) return;
    this.cam.updateMatrixWorld();
    this.tmp.copy(worldPos).project(this.cam);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const px = Number.isFinite(this.tmp.x) ? (this.tmp.x * 0.5 + 0.5) * vw : vw / 2;
    const py = Number.isFinite(this.tmp.y) ? (-this.tmp.y * 0.5 + 0.5) * vh : 0;

    const e = el('div', `popup ${kind}`, this.popupsEl);
    e.textContent = text;
    e.style.left = '0px';
    e.style.top = '0px';
    const { width: bw, height: bh } = e.getBoundingClientRect();

    const topbarRect = this.topbarEl.getBoundingClientRect();
    const topSafe = Math.max(POPUP_EDGE, (topbarRect.height > 0 ? topbarRect.bottom : 0) + POPUP_EDGE);

    const minX = POPUP_EDGE + bw / 2 + POPUP_EPS;
    const maxX = vw - POPUP_EDGE - bw / 2 - POPUP_EPS;
    const minBottom = topSafe + bh + POPUP_EPS;
    const maxBottom = vh - POPUP_EDGE - POPUP_EPS;
    const clampX = (x: number): number => (minX <= maxX ? Math.min(Math.max(x, minX), maxX) : vw / 2);
    const clampY = (b: number): number => (minBottom <= maxBottom ? Math.min(Math.max(b, minBottom), maxBottom) : minBottom);

    const obs: DOMRect[] = [];
    if (topbarRect.width > 0 && topbarRect.height > 0) obs.push(topbarRect);
    const ordersRect = this.ordersEl.getBoundingClientRect();
    if (ordersRect.width > 0 && ordersRect.height > 0) obs.push(ordersRect);
    this.ordersEl.querySelectorAll('.card').forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) obs.push(r);
    });
    if (this.onboardEl.style.display !== 'none') {
      const r = this.onboardEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) obs.push(r);
    }
    this.bubblesEl.querySelectorAll('.bubble').forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) obs.push(r);
    });
    this.popupsEl.querySelectorAll('.popup').forEach((o) => {
      if (o !== e) {
        const r = o.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) obs.push(r);
      }
    });

    const clash = (x: number, bottom: number, pad = POPUP_PAD): boolean => {
      const l = x - bw / 2;
      const r = x + bw / 2;
      const t = bottom - bh;
      return obs.some((o) => l < o.right + pad && o.left - pad < r && t < o.bottom + pad && o.top - pad < bottom);
    };

    const anchorX = clampX(px);
    const preferredBottom = py - POPUP_LIFT;
    const startBottom = clampY(preferredBottom);
    const maxLocalDx = Math.max(bw + 48, 160);
    const stepX = Math.max(24, Math.round(bw * 0.4));

    const findXOnRow = (bottom: number, localOnly: boolean, pad = POPUP_PAD): number | null => {
      if (!clash(anchorX, bottom, pad)) return anchorX;
      const cands: number[] = [];
      const add = (raw: number): void => {
        const x = clampX(raw);
        if (localOnly && Math.abs(x - anchorX) > maxLocalDx) return;
        cands.push(x);
      };
      const t = bottom - bh;
      for (const o of obs) {
        if (t < o.bottom + pad && o.top - pad < bottom) {
          add(o.right + pad + bw / 2 + 0.5);
          add(o.left - pad - bw / 2 - 0.5);
        }
      }
      const maxK = localOnly ? Math.ceil(maxLocalDx / stepX) : Math.ceil(vw / stepX);
      for (let k = 1; k <= maxK; k++) {
        add(anchorX + k * stepX);
        add(anchorX - k * stepX);
      }
      if (!localOnly) { add(minX); add(maxX); }
      cands.sort((a, b) => Math.abs(a - anchorX) - Math.abs(b - anchorX));
      for (const x of cands) {
        if (!clash(x, bottom, pad)) return x;
      }
      return null;
    };

    const buildRows = (dir: 'up' | 'down', fromRaw: number, toRaw: number, pad = POPUP_PAD): number[] => {
      if (minBottom > maxBottom) return [minBottom];
      const from = clampY(fromRaw);
      const to = clampY(toRaw);
      const rows: number[] = [];
      const step = 8;
      if (dir === 'up') {
        for (let b = from; b >= to; b -= step) rows.push(b);
        rows.push(to);
        for (const o of obs) {
          const above = o.top - pad - 0.5;
          if (above <= from && above >= to) rows.push(above);
        }
        rows.sort((a, b) => b - a);
      } else {
        for (let b = from; b <= to; b += step) rows.push(b);
        rows.push(to);
        for (const o of obs) {
          const below = o.bottom + pad + bh + 0.5;
          if (below >= from && below <= to) rows.push(below);
        }
        rows.sort((a, b) => a - b);
      }
      return rows;
    };

    let best: { x: number; bottom: number } | null = null;
    const tryRows = (rows: number[], localOnly: boolean, pad = POPUP_PAD): boolean => {
      for (const bottom of rows) {
        const x = findXOnRow(bottom, localOnly, pad);
        if (x !== null) { best = { x, bottom }; return true; }
      }
      return false;
    };

    // 1) Try horizontal shift on startBottom first ("优先左右错位").
    // 2) If blocked: when clamped by topbar safe zone, move down below topbar/obstacles;
    //    when headroom exists above anchor, step up (preserving lift & B-059 stack), then down;
    //    when clamped to bottom edge, step up.
    if (!tryRows([startBottom], true)) {
      if (preferredBottom < minBottom) {
        tryRows(buildRows('down', minBottom, maxBottom), true);
      } else if (preferredBottom > maxBottom) {
        tryRows(buildRows('up', maxBottom, minBottom), true);
      } else if (!tryRows(buildRows('up', startBottom - 8, minBottom), true)) {
        tryRows(buildRows('down', startBottom + 8, maxBottom), true);
      }
    }

    // 3) Exhaustive full-safe-area fallback so popups never overlap if any free spot exists.
    if (!best) {
      for (const pad of [POPUP_PAD, 1, 0.5]) {
        const allRows = preferredBottom < minBottom
          ? buildRows('down', minBottom, maxBottom, pad)
          : buildRows('up', startBottom, minBottom, pad).concat(buildRows('down', startBottom + 8, maxBottom, pad));
        let bestDist = Infinity;
        for (const bottom of allRows) {
          const x = findXOnRow(bottom, false, pad);
          if (x !== null) {
            const dist = Math.abs(x - anchorX) + Math.abs(bottom - startBottom);
            if (dist < bestDist) { bestDist = dist; best = { x, bottom }; }
          }
        }
        if (best) break;
      }
    }

    const pos = best ?? { x: anchorX, bottom: startBottom };
    e.style.left = `${pos.x}px`;
    e.style.top = `${pos.bottom}px`;

    // Final subpixel guard: keep rendered bounding rect strictly inside the 4-edge safe zone.
    const r = e.getBoundingClientRect();
    let nx = pos.x;
    let ny = pos.bottom;
    if (r.left < POPUP_EDGE) nx += POPUP_EDGE - r.left;
    else if (r.right > vw - POPUP_EDGE) nx -= r.right - (vw - POPUP_EDGE);
    if (r.top < topSafe) ny += topSafe - r.top;
    else if (r.bottom > vh - POPUP_EDGE) ny -= r.bottom - (vh - POPUP_EDGE);
    if (nx !== pos.x || ny !== pos.bottom) {
      e.style.left = `${nx}px`;
      e.style.top = `${ny}px`;
    }

    e.dataset.ax = String(px);
    e.dataset.ay = String(py);
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

  private placeBubble(
    prefL: number,
    prefT: number,
    w: number,
    h: number,
    vw: number,
    vh: number,
    topSafe: number,
    hardObs: Box[],
    softObs: Box[],
  ): { l: number; t: number } {
    const minL = BUBBLE_EDGE + BUBBLE_EPS;
    const maxL = Math.max(minL, vw - BUBBLE_EDGE - w - BUBBLE_EPS);
    const minT = topSafe + BUBBLE_EPS;
    const maxT = Math.max(minT, vh - BUBBLE_EDGE - h - BUBBLE_EPS);
    const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
    const l0 = clamp(prefL, minL, maxL);
    const t0 = clamp(prefT, minT, maxT);
    const maxLocalUp = Math.max(h * 2 + 16, 80);
    const maxLocalDx = Math.max(w + 64, 150);
    const stepX = Math.max(12, Math.round(w * 0.4));
    const stepY = 8;

    const solve = (obs: Box[], pad: number): { l: number; t: number } | null => {
      const hits = (l: number, t: number): boolean =>
        obs.some((o) => l < o.right + pad && o.left - pad < l + w && t < o.bottom + pad && o.top - pad < t + h);

      if (!hits(l0, t0)) return { l: l0, t: t0 };

      const upRows = (limit: number): number[] => {
        const floorT = Math.max(minT, t0 - limit);
        const rows: number[] = [];
        for (const o of obs) {
          const above = o.top - pad - h - 0.5;
          if (above < t0 && above >= floorT) rows.push(above);
        }
        for (let t = t0 - stepY; t >= floorT; t -= stepY) rows.push(t);
        if (floorT < t0) rows.push(floorT);
        rows.sort((a, b) => b - a);
        return rows;
      };

      const downRows = (): number[] => {
        const rows: number[] = [];
        for (const o of obs) {
          const below = o.bottom + pad + 0.5;
          if (below > t0 && below <= maxT) rows.push(below);
        }
        for (let t = t0 + stepY; t <= maxT; t += stepY) rows.push(t);
        if (maxT > t0) rows.push(maxT);
        rows.sort((a, b) => a - b);
        return rows;
      };

      const findXOnRow = (t: number, localOnly: boolean): number | null => {
        if (!hits(l0, t)) return l0;
        const cands: number[] = [];
        const add = (raw: number): void => {
          const l = clamp(raw, minL, maxL);
          if (localOnly && Math.abs(l - l0) > maxLocalDx) return;
          cands.push(l);
        };
        for (const o of obs) {
          if (t < o.bottom + pad && o.top - pad < t + h) {
            add(o.left - pad - w - 0.5);
            add(o.right + pad + 0.5);
          }
        }
        const maxK = localOnly ? Math.ceil(maxLocalDx / stepX) : Math.ceil(vw / stepX);
        for (let k = 1; k <= maxK; k++) {
          add(l0 - k * stepX);
          add(l0 + k * stepX);
        }
        if (!localOnly) {
          add(minL);
          add(maxL);
        }
        cands.sort((a, b) => Math.abs(a - l0) - Math.abs(b - l0));
        for (const l of cands) {
          if (!hits(l, t)) return l;
        }
        return null;
      };

      // 1) Move up first within local headroom
      const localUp = upRows(maxLocalUp);
      for (const t of localUp) {
        if (!hits(l0, t)) return { l: l0, t };
      }

      // 2) Still conflicting -> shift left / right on anchor row, then upward rows
      const lx0 = findXOnRow(t0, true);
      if (lx0 !== null) return { l: lx0, t: t0 };
      for (const t of localUp) {
        const l = findXOnRow(t, true);
        if (l !== null) return { l, t };
      }

      // 3) Local downward + horizontal when pinned under topbar or #bbq-orders (closest Manhattan)
      let bestDown: { l: number; t: number } | null = null;
      let bestDownDist = Infinity;
      const down = downRows();
      for (const t of down) {
        const l = findXOnRow(t, true);
        if (l !== null) {
          const dist = Math.abs(l - l0) + Math.abs(t - t0);
          if (dist < bestDownDist) {
            bestDownDist = dist;
            bestDown = { l, t };
          }
        }
      }
      if (bestDown) return bestDown;

      // 4) Exhaustive safe-area fallback (closest Manhattan distance)
      let best: { l: number; t: number } | null = null;
      let bestDist = Infinity;
      const allRows = [t0, ...upRows(Infinity), ...down];
      for (const t of allRows) {
        const l = findXOnRow(t, false);
        if (l !== null) {
          const dist = Math.abs(l - l0) + Math.abs(t - t0);
          if (dist < bestDist) {
            bestDist = dist;
            best = { l, t };
          }
        }
      }
      return best;
    };

    const allObs = softObs.length ? hardObs.concat(softObs) : hardObs;
    for (const pad of [BUBBLE_PAD, 1, 0.5]) {
      const p = solve(allObs, pad);
      if (p) return p;
    }
    if (softObs.length) {
      for (const pad of [BUBBLE_PAD, 1, 0.5]) {
        const p = solve(hardObs, pad);
        if (p) return p;
      }
    }
    return { l: l0, t: t0 };
  }

  /** refresh world-anchored bubbles above customers: dish name + patience ring (seated/eating) or <=12px entering dot (walking-in), with order-card / bubble / topbar avoidance */
  updateBubbles(customers: Customer[]): void {
    if (!this.playHudVisible) return;
    this.cam.updateMatrixWorld();

    // Place seated/eating bubbles before walking-in dots in deterministic order so seated labels stay anchored.
    const ordered = customers
      .filter((c) => c.phase === 'seated' || c.phase === 'eating' || c.phase === 'walking-in')
      .sort((a, b) => {
        const ae = a.phase === 'walking-in' ? 1 : 0;
        const be = b.phase === 'walking-in' ? 1 : 0;
        if (ae !== be) return ae - be;
        return tableOrder(a.table) - tableOrder(b.table) || a.id - b.id;
      });

    const live = new Set<number>();
    const pending: { b: Bubble; px: number; py: number }[] = [];

    for (const c of ordered) {
      live.add(c.id);
      let b = this.bubbleMap.get(c.id);
      if (!b) {
        const root = el('div', 'bubble', this.bubblesEl);
        root.style.left = '0px';
        root.style.top = '0px';
        root.dataset.table = c.table;
        root.innerHTML = `<svg width="26" height="26" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="${RING_R}" fill="none" stroke="rgba(240,192,96,.22)" stroke-width="3.5"/>
          <circle class="arc" cx="15" cy="15" r="${RING_R}" fill="none" stroke="#f0c060" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="0" transform="rotate(-90 15 15)"/></svg>
          <span class="nm"></span>`;
        b = {
          root,
          arc: root.querySelector('.arc') as SVGElement,
          nm: root.querySelector('.nm') as HTMLElement,
          label: '', frac: -1, angry: false, entering: false,
        };
        this.bubbleMap.set(c.id, b);
      }

      if (b.root.dataset.phase !== c.phase) b.root.dataset.phase = c.phase;
      const entering = c.phase === 'walking-in';
      if (entering !== b.entering) {
        b.entering = entering;
        b.root.classList.toggle('entering', entering);
      }
      if (entering) {
        if (b.label !== '') {
          b.label = '';
          b.nm.innerHTML = '';
        }
        if (b.angry) {
          b.angry = false;
          b.root.classList.remove('angry');
          b.arc.setAttribute('stroke', '#f0c060');
        }
      } else {
        const frac = c.phase === 'eating' ? 1 : Math.min(1, Math.max(0, c.patience / c.patienceMax));
        const angry = c.phase === 'seated' && frac < 0.25;
        const label = c.phase === 'eating' ? '用餐中' : DISHES[c.dish].name;
        const labelKey = `${c.dish}|${label}`;
        if (labelKey !== b.label) {
          b.label = labelKey;
          b.nm.innerHTML = FOOD_ICONS[c.dish];
          const span = document.createElement('span');
          span.textContent = label;
          b.nm.appendChild(span);
        }
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

      this.headPos.copy(c.obj.position);
      this.headPos.y += 1.35;
      const p = this.project(this.headPos);
      if (!p) {
        b.root.style.opacity = '0';
        continue;
      }
      b.root.style.opacity = '1';
      pending.push({ b, px: p.x, py: p.y });
    }

    for (const [id, b] of this.bubbleMap) {
      if (!live.has(id)) {
        b.root.remove();
        this.bubbleMap.delete(id);
      }
    }

    if (!pending.length) return;

    // Batch layout reads once per frame: obstacles + bubble dimensions.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tb = this.topbarEl.getBoundingClientRect();
    const topSafe = (tb.height > 0 ? tb.bottom : 0) + BUBBLE_TOP_GAP;
    const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });

    const hardObs: Box[] = [];
    if (tb.width > 0 && tb.height > 0) hardObs.push(toBox(tb));
    const ordersRect = this.ordersEl.getBoundingClientRect();
    if (ordersRect.width > 0 && ordersRect.height > 0) hardObs.push(toBox(ordersRect));
    if (this.onboardEl.style.display !== 'none') {
      const obRect = this.onboardEl.getBoundingClientRect();
      if (obRect.width > 0 && obRect.height > 0) hardObs.push(toBox(obRect));
    }
    this.popupsEl.querySelectorAll<HTMLElement>('.popup').forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) hardObs.push(toBox(r));
    });

    const softObs: Box[] = [];
    this.ringsEl.querySelectorAll<HTMLElement>('.order-ring, .order-num').forEach((n) => {
      if (n.style.display === 'none') return;
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) softObs.push(toBox(r));
    });

    const measured = pending.map((item) => {
      const r = item.b.root.getBoundingClientRect();
      return { ...item, w: r.width, h: r.height };
    });

    // Place sequentially so every bubble avoids #bbq-orders, topbar, active popups, table rings, and earlier bubbles.
    const placedPos: { b: Bubble; cx: number; bottom: number }[] = [];
    for (const item of measured) {
      const { l, t } = this.placeBubble(
        item.px - item.w / 2,
        item.py - item.h,
        item.w,
        item.h,
        vw,
        vh,
        topSafe,
        hardObs,
        softObs,
      );
      hardObs.push({ left: l, top: t, right: l + item.w, bottom: t + item.h });
      placedPos.push({ b: item.b, cx: l + item.w / 2, bottom: t + item.h });
    }

    for (const p of placedPos) {
      p.b.root.style.left = `${p.cx}px`;
      p.b.root.style.top = `${p.bottom}px`;
    }
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? 'block' : 'none';
  }

  levelTarget(): number {
    return this.target;
  }
}
