// Mobile-first DOM HUD (Gameplay v2, 390×844 portrait thumb-zone layout):
//  - Top bar: level / money / time / stars
//  - Bottom thumb-zone dock (#bbq-thumb-dock, strictly in lower half on 390×844):
//      1) #bbq-pass   — 出菜窗口 (3 tray slots, dish + table badge, >= 44px hitbox)
//      2) #bbq-hand   — 手部状态 ("手上：xx（送往 N 号桌）" / idle guidance)
//      3) #bbq-orders — 订单卡 (2×2 portrait, distinct 7-state colors/copy, 3s prep ring, 8s segmented grill heat bar)
//  - World-anchored table rings + table numbers + cleaning badges + customer bubbles + non-overlapping popups.

import * as THREE from 'three';
import { COOK, DISHES } from '../config.ts';
import type { CarryingState, Customer, CookWindow, OrderState } from '../game/types.ts';
import type { OrderCardState, PassSlotView } from '../game/flow.ts';
import type { TableRuntime } from '../world/dining.ts';
import { TABLES } from '../world/layout.ts';
import { FOOD_ICONS } from './controls.ts';

const TABLE_COLORS: Record<string, string> = {
  t1: '#f0c060',
  t2: '#7fd08a',
  t3: '#6aa8e0',
  t4: '#e08a6a',
};
const TABLE_ORDER = new Map<string, number>(TABLES.map((t) => [t.id, t.tableNum]));
const tableOrder = (id: string): number => TABLE_ORDER.get(id) ?? 99;
const tableColor = (id: string): string => TABLE_COLORS[id] ?? '#f0c060';

function fmtMoney(v: number): string {
  return v < 0 ? `-¥${Math.abs(v)}` : `¥${v}`;
}

const PERFECT_START_PCT = (COOK.perfectStart / COOK.grillTotal) * 100; // 62.5%
const PERFECT_END_PCT = (COOK.perfectEnd / COOK.grillTotal) * 100;     // 87.5%

const CSS = `
#bbq-hud { position: absolute; inset: 0; pointer-events: none; font-family: inherit; overflow: hidden; }

/* ---- Top status strip ---- */
#bbq-hud .topbar {
  position: absolute; top: max(8px, env(safe-area-inset-top)); left: 50%; z-index: 6;
  transform: translateX(-50%); display: flex; gap: 12px; align-items: center;
  background: rgba(24,16,12,.78); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.55); border-radius: 12px;
  padding: 6px 14px; white-space: nowrap; max-width: calc(100vw - 16px); box-sizing: border-box;
}
#bbq-hud .tb { display: flex; align-items: baseline; gap: 4px; }
#bbq-hud .tb .k { font-size: 11px; color: rgba(245,232,216,.68); font-weight: 500; }
#bbq-hud .tb .v { font-size: 15px; color: #f0c060; font-weight: 700; font-variant-numeric: tabular-nums; }
#bbq-hud .tb .v.time.low { color: #e05a3a; }
#bbq-hud .tb .v.neg { color: #ff7a66; }
#bbq-hud .stars { display: flex; gap: 1px; }
#bbq-hud .stars svg { width: 14px; height: 14px; }

/* ---- World-projected table rings & table numbers & cleaning tags ---- */
#bbq-rings { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
#bbq-rings .order-ring {
  position: absolute; left: 0; top: 0;
  width: 96px; height: 44px; box-sizing: border-box;
  border-radius: 50%;
  border: 2.5px solid var(--rc, #f0c060);
  background: color-mix(in srgb, var(--rc, #f0c060) 14%, transparent);
  box-shadow: 0 0 12px var(--rc, #f0c060);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: bbq-ring-breathe 1.3s ease-in-out infinite;
}
@keyframes bbq-ring-breathe {
  0%, 100% { opacity: .88; }
  50% { opacity: .52; }
}
#bbq-rings .order-num {
  position: absolute; left: 0; top: 0; z-index: 1;
  width: 24px; height: 24px; box-sizing: border-box;
  border-radius: 50%;
  background: rgba(16, 10, 7, .92);
  border: 2px solid var(--rc, #f0c060);
  box-shadow: 0 2px 6px rgba(0, 0, 0, .55);
  color: var(--rc, #f0c060);
  font-size: 13px; font-weight: 800; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
#bbq-rings .clean-tag {
  position: absolute; left: 0; top: 0; z-index: 2;
  padding: 2px 8px; border-radius: 10px;
  background: rgba(20, 26, 22, .88);
  border: 1px solid rgba(127, 208, 138, .65);
  color: #a8e6b4; font-size: 11px; font-weight: 700; white-space: nowrap;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ---- Bottom Thumb-Zone Dock (strictly lower half on 390x844 portrait) ---- */
#bbq-thumb-dock {
  position: absolute;
  left: 8px; right: 8px;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 4;
  display: flex; flex-direction: column; gap: 6px;
  pointer-events: none;
}

/* 1) Pass Window Strip (#bbq-pass) */
#bbq-pass {
  background: rgba(22,15,11,.9); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.55); border-radius: 14px;
  padding: 6px 8px 7px;
  pointer-events: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,.45);
}
#bbq-pass.pass-full {
  border-color: #ff8c24;
  box-shadow: 0 0 12px rgba(255,140,36,.35);
}
#bbq-pass .pass-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 5px; gap: 6px;
}
#bbq-pass .pass-title {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #f5e8d8; white-space: nowrap;
}
#bbq-pass .pass-cap {
  font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 8px;
  background: rgba(240,192,96,.18); color: #f0c060;
  font-variant-numeric: tabular-nums;
}
#bbq-pass.pass-full .pass-cap {
  background: rgba(255,112,52,.28); color: #ffb07a;
}
#bbq-pass .pass-cue {
  font-size: 11px; font-weight: 600; color: rgba(245,232,216,.7);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#bbq-pass.has-ready:not(.hand-full) .pass-cue { color: #5ee0c4; }
#bbq-pass.hand-full .pass-cue { color: #f0c060; }

#bbq-pass .pass-slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
#bbq-pass .pass-slot {
  appearance: none; -webkit-appearance: none;
  box-sizing: border-box; font: inherit; margin: 0;
  min-height: 54px; width: 100%; min-width: 0;
  padding: 5px 6px; border-radius: 10px;
  border: 1.5px dashed rgba(245,232,216,.2);
  background: rgba(14,10,7,.55);
  color: rgba(245,232,216,.42);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  cursor: default; touch-action: manipulation;
  transition: transform .08s, border-color .15s, background-color .15s, box-shadow .15s, opacity .15s;
}
#bbq-pass .pass-slot[data-occupied="true"] {
  border-style: solid;
  border-color: var(--tc, #4ec9b0);
  background: rgba(20, 44, 40, .9);
  color: #f5e8d8;
  cursor: pointer;
  box-shadow: 0 0 10px color-mix(in srgb, var(--tc, #4ec9b0) 35%, transparent);
}
#bbq-pass .pass-slot[data-occupied="true"]:active:not(.blocked) { transform: scale(.96); }
#bbq-pass .pass-slot[data-occupied="true"].blocked {
  border-color: rgba(240,192,96,.35);
  background: rgba(30,22,16,.72);
  box-shadow: none;
  opacity: .56;
  cursor: not-allowed;
}
#bbq-pass .pass-slot .ps-top {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  width: 100%; min-width: 0;
}
#bbq-pass .pass-slot .ps-tb {
  font-size: 11px; font-weight: 800; line-height: 1;
  padding: 2px 5px; border-radius: 6px; flex: none;
  border: 1.5px solid var(--tc, #f0c060);
  color: var(--tc, #f0c060);
  background: rgba(16,10,7,.9);
  font-variant-numeric: tabular-nums;
}
#bbq-pass .pass-slot svg.food-ico { width: 15px; height: 15px; flex: none; }
#bbq-pass .pass-slot .ps-name {
  font-size: 12px; font-weight: 700; color: #f5e8d8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#bbq-pass .pass-slot .ps-act {
  font-size: 10px; font-weight: 700; line-height: 1.1;
  color: #6df0d4; white-space: nowrap;
}
#bbq-pass .pass-slot.blocked .ps-act { color: rgba(245,232,216,.6); }
#bbq-pass .pass-slot .ps-empty { font-size: 11px; font-weight: 600; color: rgba(245,232,216,.34); }

/* 2) Hand Status Strip (#bbq-hand) */
#bbq-hand {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  min-height: 32px; box-sizing: border-box;
  padding: 5px 10px; border-radius: 10px;
  background: rgba(24,16,12,.86); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.36);
  color: rgba(245,232,216,.84); font-size: 12px; font-weight: 600;
  pointer-events: auto;
  transition: border-color .15s, background-color .15s, box-shadow .15s;
}
#bbq-hand.carrying {
  border-color: #f0c060;
  background: rgba(62,40,14,.94);
  color: #fff2d6;
  box-shadow: 0 0 12px rgba(240,192,96,.36);
}
#bbq-hand .hand-main {
  display: flex; align-items: center; gap: 6px; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#bbq-hand .hand-main svg.food-ico { width: 16px; height: 16px; flex: none; }
#bbq-hand .hand-tag {
  flex: none; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 8px;
  background: rgba(240,192,96,.16); color: #f0c060; white-space: nowrap;
}
#bbq-hand.carrying .hand-tag { background: #f0c060; color: #241408; }

/* 3) Order Cards Grid (#bbq-orders) */
#bbq-orders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  align-items: stretch;
  pointer-events: none;
}
#bbq-orders .card {
  display: flex; flex-direction: column; gap: 3px;
  box-sizing: border-box;
  width: 100%; min-width: 0; max-width: 100%;
  background: rgba(24,16,12,.88); backdrop-filter: blur(10px);
  border: 1.5px solid rgba(232,180,90,.42); border-radius: 13px;
  padding: 5px 6px;
  pointer-events: auto;
  transition: border-color .15s, box-shadow .15s, background-color .15s;
}
#bbq-orders .card.clickable { cursor: pointer; }
#bbq-orders .card .c-top {
  display: flex; align-items: center; gap: 3px; min-width: 0;
}
#bbq-orders .card .tb-badge {
  width: 18px; height: 18px; flex: none; box-sizing: border-box;
  border-radius: 5px; border: 1.5px solid #f0c060;
  background: rgba(16,10,7,.92); color: #f0c060;
  font-size: 11px; font-weight: 800; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
}
#bbq-orders .card .nm {
  flex: 1 1 auto; min-width: 0;
  display: flex; align-items: center; gap: 3px;
  font-size: 11.5px; color: #f5e8d8; font-weight: 700; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#bbq-orders .card .nm span { overflow: hidden; text-overflow: ellipsis; }
#bbq-orders .card .nm svg.food-ico { width: 14px; height: 14px; flex: none; }
#bbq-orders .card .ring { width: 18px; height: 18px; flex: none; }
#bbq-orders .card .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); display: block; }
#bbq-orders .card .c-meta {
  display: flex; align-items: center; gap: 4px; min-width: 0;
  font-size: 10px; line-height: 1.15;
}
#bbq-orders .card .cat-tag {
  padding: 1px 5px; border-radius: 4px;
  background: rgba(240,192,96,.14);
  border: 1px solid rgba(240,192,96,.34);
  color: #ebd09e; font-size: 9.5px; font-weight: 700; white-space: nowrap;
}
#bbq-orders .card .new-badge {
  padding: 1px 4px; border-radius: 4px;
  background: #c83e2b; color: #fff4e8;
  border: 1px solid #ff9c82;
  font-size: 9px; font-weight: 800; letter-spacing: .4px; white-space: nowrap;
}
#bbq-orders .card .c-price {
  margin-left: auto; color: #f0c060; font-size: 10.5px; font-weight: 800;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
#bbq-orders .card .dish-note {
  display: none; align-items: flex-start; gap: 3px;
  padding: 2px 4px; border-radius: 5px;
  background: rgba(224,96,58,.18);
  border: 1px solid rgba(255,146,108,.45);
  color: #ffd49c; font-size: 9.5px; line-height: 1.25; font-weight: 600;
}
#bbq-orders .card .dish-note .note-tag {
  flex: none; padding: 0 3px; border-radius: 3px;
  background: rgba(224,96,58,.36); color: #ffe0cc;
  font-size: 8.5px; font-weight: 800;
}

/* Segmented Grill Heat Bar / Patience Strip */
#bbq-orders .card .bar-wrap {
  position: relative; width: 100%; height: 8px; border-radius: 4px;
  background: rgba(255,255,255,.1); overflow: hidden;
}
#bbq-orders .card .bar-zone-perfect {
  position: absolute; top: 0; bottom: 0;
  left: ${PERFECT_START_PCT}%; width: ${PERFECT_END_PCT - PERFECT_START_PCT}%;
  background: rgba(240,192,96,.34);
  border-left: 1.5px solid rgba(255,220,120,.9);
  border-right: 1.5px solid rgba(255,120,60,.9);
  box-sizing: border-box; display: none;
}
#bbq-orders .card .bar-zone-burn {
  position: absolute; top: 0; bottom: 0;
  left: ${PERFECT_END_PCT}%; right: 0;
  background: rgba(224,72,54,.32); display: none;
}
#bbq-orders .card .bar-fill {
  position: absolute; left: 0; top: 0; bottom: 0; width: 0%;
  border-radius: 4px; background: #f0c060;
  transition: background-color .12s;
}
#bbq-orders .card.show-heat .bar-wrap { height: 10px; background: rgba(18,12,9,.92); border: 1px solid rgba(255,255,255,.16); }
#bbq-orders .card.show-heat .bar-zone-perfect,
#bbq-orders .card.show-heat .bar-zone-burn { display: block; }

/* Card bottom row: status label + >=48px action button */
#bbq-orders .card .c-bot {
  display: flex; align-items: center; justify-content: space-between; gap: 5px; min-width: 0;
}
#bbq-orders .card .status-txt {
  flex: 1 1 auto; min-width: 0;
  font-size: 11px; font-weight: 700; line-height: 1.25;
  color: rgba(245,232,216,.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
#bbq-orders .card .card-btn {
  position: relative;
  appearance: none; -webkit-appearance: none;
  box-sizing: border-box; font: inherit; margin: 0; padding: 0 6px; border: 1.5px solid transparent;
  min-width: 58px; height: 46px; min-height: 46px; flex: none;
  border-radius: 11px; overflow: hidden;
  background: rgba(34,22,14,.92); color: #f5e8d8;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  cursor: pointer; touch-action: manipulation;
  transition: transform .08s, background-color .15s, border-color .15s, box-shadow .15s;
}
#bbq-orders .card .card-btn:active:not(:disabled) { transform: scale(.94); }
#bbq-orders .card .card-btn:disabled { cursor: default; opacity: .78; }
#bbq-orders .card .card-btn .prep-ring {
  position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; display: none;
}
#bbq-orders .card .card-btn .btn-lbl {
  position: relative; z-index: 1;
  font-size: 12px; font-weight: 800; line-height: 1.1; white-space: nowrap;
}

/* ---- Distinct per-state card palette (7 states, zero ambiguity) ---- */
/* 1. ordering (后台备菜 3s 环) */
#bbq-orders .card[data-order-state="ordering"] {
  border-color: #6c8399; background: rgba(22,26,32,.88);
}
#bbq-orders .card[data-order-state="ordering"] .status-txt { color: #a7bfd6; }
#bbq-orders .card[data-order-state="ordering"] .card-btn {
  background: rgba(30,38,48,.92); border-color: rgba(108,131,153,.55); color: #b7cee4;
}
#bbq-orders .card[data-order-state="ordering"] .card-btn .prep-ring { display: block; }
#bbq-orders .card[data-order-state="ordering"][data-pass-paused="true"] {
  border-color: #c88b3a; background: rgba(38,28,18,.9);
}
#bbq-orders .card[data-order-state="ordering"][data-pass-paused="true"] .status-txt { color: #f0b868; }

/* 2. ready (菜在出菜窗口) */
#bbq-orders .card[data-order-state="ready"] {
  border-color: #4ec9b0; background: rgba(18,34,32,.88);
}
#bbq-orders .card[data-order-state="ready"] .status-txt { color: #7ae8d2; }
#bbq-orders .card[data-order-state="ready"] .card-btn {
  background: rgba(24,52,48,.9); border-color: rgba(78,201,176,.55); color: #8af0dc;
}

/* 3. carrying (手上端着本桌菜 → 点此上桌烤!) */
#bbq-orders .card[data-order-state="carrying"] {
  border-color: #f0c060; background: rgba(54,36,14,.92);
  box-shadow: 0 0 14px rgba(240,192,96,.42);
}
#bbq-orders .card[data-order-state="carrying"] .status-txt { color: #ffe094; }
#bbq-orders .card[data-order-state="carrying"] .card-btn {
  background: linear-gradient(180deg, #f6cc6e, #d89a36);
  border-color: #fff0c2; color: #241408;
  box-shadow: 0 0 10px rgba(240,192,96,.55);
}

/* 4. grilling (桌边烤 0..5.0s 夹生窗) */
#bbq-orders .card[data-order-state="grilling"] {
  border-color: #d97c3e; background: rgba(40,24,15,.9);
}
#bbq-orders .card[data-order-state="grilling"] .status-txt { color: #f2aa74; }
#bbq-orders .card[data-order-state="grilling"] .bar-fill { background: linear-gradient(90deg, #c97236, #e89b4a); }
#bbq-orders .card[data-order-state="grilling"] .card-btn {
  background: rgba(54,32,20,.92); border-color: rgba(217,124,62,.65); color: #f0b98e;
}

/* 5a. serving — perfect (5.0..7.0s 金色完美窗!) */
#bbq-orders .card[data-order-state="serving"][data-cook-window="perfect"] {
  border-color: #ffd166; background: rgba(58,42,14,.94);
  box-shadow: 0 0 16px rgba(255,209,102,.52);
}
#bbq-orders .card[data-order-state="serving"][data-cook-window="perfect"] .status-txt { color: #ffe48a; }
#bbq-orders .card[data-order-state="serving"][data-cook-window="perfect"] .bar-fill { background: #ffd166; }
#bbq-orders .card[data-order-state="serving"][data-cook-window="perfect"] .card-btn {
  background: linear-gradient(180deg, #ffe07d, #e0a630);
  border-color: #fff4c4; color: #241408;
  box-shadow: 0 0 12px rgba(255,209,102,.65);
}

/* 5b. serving — over (7.0..8.0s 焦糊预警窗!) */
#bbq-orders .card[data-order-state="serving"][data-cook-window="over"] {
  border-color: #ff6b35; background: rgba(66,24,12,.94);
  box-shadow: 0 0 16px rgba(255,107,53,.55);
}
#bbq-orders .card[data-order-state="serving"][data-cook-window="over"] .status-txt { color: #ffad82; }
#bbq-orders .card[data-order-state="serving"][data-cook-window="over"] .bar-fill { background: #ff6b35; }
#bbq-orders .card[data-order-state="serving"][data-cook-window="over"] .card-btn {
  background: #e05228; border-color: #ffb899; color: #fff4ee;
  animation: bbq-over-pulse .55s ease-in-out infinite;
}

/* 6. done (已盛盘 · 结账用餐中) */
#bbq-orders .card[data-order-state="done"] {
  border-color: #5ec97a; background: rgba(18,38,24,.9);
}
#bbq-orders .card[data-order-state="done"] .status-txt { color: #8ce8a2; }
#bbq-orders .card[data-order-state="done"] .card-btn {
  background: rgba(28,60,36,.9); border-color: rgba(94,201,122,.6); color: #8ce8a2;
}

/* 7. burnt (焦糊作废) */
#bbq-orders .card[data-order-state="burnt"] {
  border-color: #e04836; background: rgba(60,16,14,.94);
  box-shadow: 0 0 14px rgba(224,72,54,.48);
}
#bbq-orders .card[data-order-state="burnt"] .status-txt { color: #ff8c7d; }
#bbq-orders .card[data-order-state="burnt"] .bar-fill { background: #e04836; }
#bbq-orders .card[data-order-state="burnt"] .card-btn {
  background: rgba(96,24,18,.94); border-color: rgba(255,112,96,.7); color: #ff9a8e;
}

#bbq-orders .card.angry { border-color: #e05a3a; }

@keyframes bbq-over-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255,107,53,.4); transform: scale(1); }
  50% { box-shadow: 0 0 16px rgba(255,107,53,.95); transform: scale(1.04); }
}

/* Landscape layout */
@media (min-width: 640px) {
  #bbq-thumb-dock {
    left: 10px; right: 10px; bottom: max(10px, env(safe-area-inset-bottom));
    gap: 5px;
  }
  #bbq-orders { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (min-width: 960px) {
  #bbq-thumb-dock {
    left: 50%; right: auto; transform: translateX(-50%);
    width: min(920px, calc(100vw - 24px));
  }
}

/* ---- First-order onboarding tip ---- */
#bbq-onboard {
  position: absolute; left: 0; top: 0; z-index: 6;
  display: none; align-items: center; justify-content: center;
  padding: 5px 11px; border-radius: 11px;
  background: rgba(24,16,12,.95);
  border: 1.5px solid #f0c060;
  box-shadow: 0 4px 14px rgba(0,0,0,.6), 0 0 10px rgba(240,192,96,.35);
  color: #f6cf70; font-size: 12px; font-weight: 700; line-height: 1.25;
  white-space: nowrap; pointer-events: none;
  animation: bbq-ob-bob 1.1s ease-in-out infinite;
}
#bbq-onboard .ob-arrow {
  position: absolute; bottom: -6px; left: var(--ax, 50%);
  width: 9px; height: 9px; box-sizing: border-box;
  background: rgba(24,16,12,.95);
  border-right: 1.5px solid #f0c060;
  border-bottom: 1.5px solid #f0c060;
  transform: translateX(-50%) rotate(45deg);
}
@keyframes bbq-ob-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* ---- World-anchored customer bubbles ---- */
#bbq-bubbles { position: absolute; inset: 0; z-index: 2; overflow: hidden; pointer-events: none; }
.bubble {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: 3px;
  background: rgba(24,16,12,.8); border: 1.5px solid rgba(232,180,90,.52);
  border-radius: 14px; padding: 2px 7px 2px 3px; font-size: 10px; font-weight: 600;
  color: rgba(245,232,216,.9); white-space: nowrap; transition: opacity .15s;
}
.bubble .nm { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; line-height: 1.2; }
.bubble svg { flex: none; }
.bubble svg.food-ico { width: 14px; height: 14px; flex: none; }
.bubble.angry { border-color: #e05a3a; color: #ff9a80; }
.bubble.entering {
  width: 9px; height: 9px; box-sizing: border-box;
  padding: 0; gap: 0; border-radius: 50%;
  background: rgba(240,192,96,.92); border: 1.5px solid rgba(24,16,12,.85);
}
.bubble.entering > * { display: none; }

/* ---- Floating popups (capped at 3, always clear of topbar & thumb dock) ---- */
#bbq-popups { position: absolute; inset: 0; z-index: 5; overflow: hidden; pointer-events: none; }
.popup {
  position: absolute; transform: translate(-50%, -100%);
  font-size: 16px; line-height: 1.25; font-weight: 800; color: #f0c060; white-space: nowrap;
  padding: 4px 12px; border-radius: 12px; opacity: 1;
  background: rgba(24,16,12,.9); border: 1.5px solid rgba(240,192,96,.75);
  box-shadow: 0 3px 12px rgba(0,0,0,.55);
  animation: bbq-popup-hold 1.5s linear forwards;
}
.popup.warn { color: #ff8066; border-color: rgba(224,90,58,.9); }
.popup.ok { color: #7ae8d2; border-color: rgba(78,201,176,.8); }
@keyframes bbq-popup-hold {
  0%, 68% { opacity: 1; }
  100% { opacity: 0; }
}
`;

const STAR = (filled: boolean): string => `
<svg viewBox="0 0 24 24" fill="${filled ? '#f0c060' : 'none'}" stroke="${filled ? '#f0c060' : 'rgba(240,192,96,.4)'}" stroke-width="1.8">
  <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/>
</svg>`;

const PATIENCE_R = 11;
const PATIENCE_C = 2 * Math.PI * PATIENCE_R;
const PREP_R = 18;
const PREP_C = 2 * Math.PI * PREP_R;
const BUBBLE_RING_R = 11;
const BUBBLE_RING_C = 2 * Math.PI * BUBBLE_RING_R;

interface CardView {
  tableId: string;
  root: HTMLElement;
  badge: HTMLElement;
  patienceArc: SVGCircleElement;
  nm: HTMLElement;
  metaEl: HTMLElement;
  noteEl: HTMLElement;
  barFill: HTMLElement;
  statusEl: HTMLElement;
  btn: HTMLButtonElement;
  prepArc: SVGCircleElement;
  btnLbl: HTMLElement;
  dishKey: string;
  orderState: OrderState;
  cookWindow: CookWindow;
  cookT: number;
  prepT: number;
  progressPct: number;
  statusText: string;
  btnText: string;
}

export interface CardStateSnapshot {
  orderState: OrderState;
  cookWindow: CookWindow;
  cookT: number;
  prepT: number;
  progressPct: number;
  btn: { w: number; h: number };
  disabled: boolean;
  statusText: string;
  btnText: string;
}

interface PassSlotDom {
  btn: HTMLButtonElement;
  slotIndex: number;
  key: string;
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

interface Box { left: number; top: number; right: number; bottom: number }

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
  private dockEl: HTMLElement;
  private passEl: HTMLElement;
  private passCapEl: HTMLElement;
  private passCueEl: HTMLElement;
  private passSlotsDom: PassSlotDom[] = [];
  private handEl: HTMLElement;
  private handMainEl: HTMLElement;
  private handTagEl: HTMLElement;
  private ordersEl: HTMLElement;
  private onboardEl: HTMLElement;
  private onboardTxt: HTMLElement;
  private bubblesEl: HTMLElement;
  private popupsEl: HTMLElement;

  private cardMap = new Map<string, CardView>();
  private bubbleMap = new Map<number, Bubble>();
  private ringMap = new Map<string, { ring: HTMLElement; num: HTMLElement }>();
  private cleanMap = new Map<string, HTMLElement>();

  private onPassTake: ((slotIndex: number) => void) | null = null;
  private onCardAction: ((tableId: string) => void) | null = null;

  private lastMoney = NaN;
  private lastSec = -1;
  private lastStars = -1;
  private lastHandKey = '';
  private playHudVisible = false;
  private servedCount = 0;
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

    // Top bar
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
    this.setMoney(0);
    this.timeV.textContent = '3:00';
    this.setStars(1);

    // Bottom thumb-zone dock: Pass Window + Hand Status + Order Cards
    this.dockEl = el('div', '', this.root);
    this.dockEl.id = 'bbq-thumb-dock';

    // 1) Pass Window Strip
    this.passEl = el('div', '', this.dockEl);
    this.passEl.id = 'bbq-pass';
    const passHead = el('div', 'pass-head', this.passEl);
    const titleWrap = el('div', 'pass-title', passHead);
    el('span', '', titleWrap).textContent = '出菜窗口';
    this.passCapEl = el('span', 'pass-cap', titleWrap);
    this.passCapEl.textContent = `0/${COOK.passCapacity}`;
    this.passCueEl = el('span', 'pass-cue', passHead);
    this.passCueEl.textContent = '备菜自动出窗';

    const slotsWrap = el('div', 'pass-slots', this.passEl);
    for (let i = 0; i < COOK.passCapacity; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pass-slot';
      btn.dataset.slotIndex = String(i);
      btn.dataset.occupied = 'false';
      btn.disabled = true;
      btn.innerHTML = `<span class="ps-empty">空位</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.occupied !== 'true') return;
        this.onPassTake?.(i);
      });
      slotsWrap.appendChild(btn);
      this.passSlotsDom.push({ btn, slotIndex: i, key: 'empty' });
    }

    // 2) Hand Status Strip
    this.handEl = el('div', '', this.dockEl);
    this.handEl.id = 'bbq-hand';
    this.handMainEl = el('div', 'hand-main', this.handEl);
    this.handTagEl = el('span', 'hand-tag', this.handEl);

    // 3) Order Cards Grid
    this.ordersEl = el('div', '', this.dockEl);
    this.ordersEl.id = 'bbq-orders';

    // First-order onboarding tip
    this.onboardEl = el('div', '', this.root);
    this.onboardEl.id = 'bbq-onboard';
    this.onboardEl.dataset.onboardTip = '';
    this.onboardEl.setAttribute('role', 'status');
    this.onboardTxt = el('span', 'ob-txt', this.onboardEl);
    el('span', 'ob-arrow', this.onboardEl).setAttribute('aria-hidden', 'true');

    this.bubblesEl = el('div', '', this.root);
    this.bubblesEl.id = 'bbq-bubbles';
    this.popupsEl = el('div', '', this.root);
    this.popupsEl.id = 'bbq-popups';

    this.setPlayHudVisible(false);
  }

  setOnPassTake(cb: (slotIndex: number) => void): void {
    this.onPassTake = cb;
  }

  setOnCardAction(cb: (tableId: string) => void): void {
    this.onCardAction = cb;
  }

  setPlayHudVisible(v: boolean): void {
    this.playHudVisible = v;
    if (!v) {
      for (const [, c] of this.cardMap) c.root.remove();
      this.cardMap.clear();
      this.ordersEl.innerHTML = '';
      this.dockEl.style.display = 'none';
      this.onboardEl.style.display = 'none';
      this.servedCount = 0;

      for (const [, b] of this.bubbleMap) b.root.remove();
      this.bubbleMap.clear();
      this.bubblesEl.innerHTML = '';
      this.bubblesEl.style.display = 'none';

      this.popupsEl.innerHTML = '';
      this.popupsEl.style.display = 'none';

      for (const [, entry] of this.ringMap) { entry.ring.remove(); entry.num.remove(); }
      this.ringMap.clear();
      for (const [, tag] of this.cleanMap) tag.remove();
      this.cleanMap.clear();
      this.ringsEl.innerHTML = '';
      this.ringsEl.style.display = 'none';
    } else {
      this.dockEl.style.display = 'flex';
      this.bubblesEl.style.display = '';
      this.popupsEl.style.display = '';
      this.ringsEl.style.display = '';
    }
  }

  setLevel(level: number, target: number): void {
    this.target = target;
    this.levelV.textContent = `第 ${level} 关`;
  }

  setMoney(v: number): void {
    if (v === this.lastMoney) return;
    this.lastMoney = v;
    this.moneyV.textContent = fmtMoney(v);
    this.moneyV.classList.toggle('neg', v < 0);
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

  // ---- Pass Window + Hand + Order Cards Sync ----

  syncState(
    passSlots: PassSlotView[],
    carrying: CarryingState | null,
    cardStates: OrderCardState[],
    customers: Customer[],
    tables: TableRuntime[],
    served: number,
  ): void {
    if (!this.playHudVisible) return;
    this.servedCount = served;

    // 1) Update Pass Window strip
    const count = passSlots.filter((s) => s.item !== null).length;
    const isFull = count >= COOK.passCapacity;
    const handFull = carrying !== null;
    this.passEl.classList.toggle('pass-full', isFull);
    this.passEl.classList.toggle('has-ready', count > 0);
    this.passEl.classList.toggle('hand-full', handFull);
    this.passCapEl.textContent = isFull ? `${count}/${COOK.passCapacity} 满` : `${count}/${COOK.passCapacity}`;
    this.passCueEl.textContent = handFull
      ? '手上有菜 · 先上桌烤'
      : isFull
        ? '已满暂停备菜 · 快取菜'
        : count > 0
          ? '点托盘取菜'
          : '后台自动备菜中';

    for (let i = 0; i < this.passSlotsDom.length; i++) {
      const dom = this.passSlotsDom[i];
      const slot = passSlots[i];
      const it = slot?.item ?? null;
      const key = it ? `${it.id}:${it.tableId}:${it.dishId}:${handFull ? 'b' : 'a'}` : 'empty';
      if (dom.key === key) continue;
      dom.key = key;

      if (!it) {
        dom.btn.dataset.occupied = 'false';
        dom.btn.dataset.table = '';
        dom.btn.dataset.dish = '';
        dom.btn.classList.remove('blocked');
        dom.btn.removeAttribute('aria-disabled');
        dom.btn.disabled = true;
        dom.btn.innerHTML = `<span class="ps-empty">空位</span>`;
      } else {
        const col = tableColor(it.tableId);
        dom.btn.dataset.occupied = 'true';
        dom.btn.dataset.table = it.tableId;
        dom.btn.dataset.dish = it.dishId;
        dom.btn.disabled = false;
        dom.btn.classList.toggle('blocked', handFull);
        if (handFull) dom.btn.setAttribute('aria-disabled', 'true');
        else dom.btn.removeAttribute('aria-disabled');
        dom.btn.style.setProperty('--tc', col);
        dom.btn.innerHTML = `
          <div class="ps-top">
            <span class="ps-tb">${it.tableNum}号桌</span>
            ${FOOD_ICONS[it.dishId]}
            <span class="ps-name">${DISHES[it.dishId].shortName}</span>
          </div>
          <span class="ps-act">${handFull ? '手上有菜' : '点取菜'}</span>`;
      }
    }

    // 2) Update Hand Status Strip
    const hasServing = cardStates.some((c) => c.orderState === 'serving');
    const hasGrilling = cardStates.some((c) => c.orderState === 'grilling');
    const handKey = carrying
      ? `carry:${carrying.dishId}:${carrying.tableId}`
      : `empty:${hasServing ? 's' : count > 0 ? 'p' : hasGrilling ? 'g' : 'w'}`;
    if (this.lastHandKey !== handKey) {
      this.lastHandKey = handKey;
      this.handEl.classList.toggle('carrying', carrying !== null);
      if (carrying) {
        const tNum = tableOrder(carrying.tableId);
        this.handMainEl.innerHTML = `${FOOD_ICONS[carrying.dishId]}<span>手上：${DISHES[carrying.dishId].name}（送往 ${tNum} 号桌）</span>`;
        this.handTagEl.textContent = `点 ${tNum} 号卡上桌`;
      } else if (hasServing) {
        this.handMainEl.textContent = '手上：空手 · 烤盘火候已到！';
        this.handTagEl.textContent = '点金色卡盛盘';
      } else if (count > 0) {
        this.handMainEl.textContent = '手上：空手 · 出菜窗口有菜';
        this.handTagEl.textContent = '点窗口取菜';
      } else if (hasGrilling) {
        this.handMainEl.textContent = '手上：空手 · 正在桌边烤制';
        this.handTagEl.textContent = '看火候条';
      } else {
        this.handMainEl.textContent = '手上：空手 · 等待顾客点单备菜';
        this.handTagEl.textContent = '自动备菜';
      }
    }

    // 3) Reconcile Order Cards
    const shown = cardStates.slice(0, 4);
    const liveTables = new Set(shown.map((s) => s.tableId));
    for (const [tid, view] of this.cardMap) {
      if (!liveTables.has(tid)) {
        view.root.remove();
        this.cardMap.delete(tid);
      }
    }

    shown.forEach((st, idx) => {
      let view = this.cardMap.get(st.tableId);
      if (!view) view = this.createCardView(st.tableId);
      const curChild = this.ordersEl.children[idx];
      if (curChild !== view.root) this.ordersEl.insertBefore(view.root, curChild ?? null);

      if (view.dishKey !== st.dish) {
        view.dishKey = st.dish;
        const dish = DISHES[st.dish];
        view.nm.innerHTML = `${FOOD_ICONS[st.dish]}<span>${dish.name}</span>`;
        const newHtml = dish.isNew ? `<span class="new-badge">NEW</span>` : '';
        view.metaEl.innerHTML = `<span class="cat-tag">${dish.category}</span>${newHtml}<span class="c-price">¥${dish.price}</span>`;
        if (dish.note) {
          view.noteEl.innerHTML = `<span class="note-tag">提示</span><span>${dish.note}</span>`;
          view.noteEl.style.display = 'flex';
        } else {
          view.noteEl.innerHTML = '';
          view.noteEl.style.display = 'none';
        }
        view.root.dataset.dish = st.dish;
        view.root.dataset.category = dish.category;
        view.root.dataset.isNew = dish.isNew ? 'true' : 'false';
        view.root.dataset.hasNote = dish.note ? 'true' : 'false';
      }

      const patFrac = st.orderState === 'done'
        ? 1
        : st.patienceMax > 0 ? Math.min(1, Math.max(0, st.patience / st.patienceMax)) : 0;
      const angry = st.orderState !== 'done' && st.orderState !== 'burnt' && patFrac < 0.25;
      view.root.classList.toggle('angry', angry);
      view.patienceArc.setAttribute('stroke', angry ? '#e05a3a' : '#f0c060');
      view.patienceArc.setAttribute('stroke-dashoffset', String(PATIENCE_C * (1 - patFrac)));

      const showHeat = st.orderState === 'grilling' || st.orderState === 'serving' || st.orderState === 'burnt';
      view.root.classList.toggle('show-heat', showHeat);
      view.root.classList.toggle('clickable', !st.disabled);

      if (showHeat) {
        view.barFill.style.width = `${st.cookPct}%`;
        view.barFill.style.backgroundColor = '';
      } else {
        view.barFill.style.width = `${Math.round(patFrac * 100)}%`;
        view.barFill.style.backgroundColor = angry ? '#e05a3a' : st.orderState === 'done' ? '#5ec97a' : 'rgba(240,192,96,.68)';
      }

      if (st.orderState === 'ordering') {
        view.prepArc.setAttribute('stroke-dashoffset', String(PREP_C * (1 - st.prepPct / 100)));
        view.prepArc.setAttribute('stroke', st.passPaused ? '#f0b868' : '#7ec2f8');
      }

      if (view.statusText !== st.statusText) {
        view.statusText = st.statusText;
        view.statusEl.textContent = st.statusText;
      }
      if (view.btnText !== st.btnText) {
        view.btnText = st.btnText;
        view.btnLbl.textContent = st.btnText;
      }
      if (view.btn.disabled !== st.disabled) view.btn.disabled = st.disabled;

      view.orderState = st.orderState;
      view.cookWindow = st.cookWindow;
      view.cookT = st.cookT;
      view.prepT = st.prepT;
      view.progressPct = showHeat ? st.cookPct : st.prepPct;

      view.root.dataset.orderState = st.orderState;
      view.root.dataset.cookWindow = st.cookWindow;
      view.root.dataset.cookT = String(st.cookT);
      view.root.dataset.prepT = String(st.prepT);
      view.root.dataset.progressPct = String(view.progressPct);
      view.root.dataset.passPaused = st.passPaused ? 'true' : 'false';
      view.btn.setAttribute('aria-label', `${st.tableNum}号桌 ${st.btnText}`);
    });

    this.updateOnboard(passSlots, carrying, shown);
    this.updateRings(customers, tables);
  }

  private createCardView(tableId: string): CardView {
    const card = el('div', 'card', this.ordersEl);
    card.dataset.table = tableId;
    card.dataset.orderState = 'ordering';
    card.dataset.cookWindow = 'none';
    const col = tableColor(tableId);

    const top = el('div', 'c-top', card);
    const badge = el('div', 'tb-badge', top);
    badge.textContent = String(tableOrder(tableId));
    badge.style.borderColor = col;
    badge.style.color = col;

    const nm = el('div', 'nm', top);
    const ring = el('div', 'ring', top);
    ring.innerHTML = `
      <svg viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="${PATIENCE_R}" fill="none" stroke="rgba(240,192,96,.2)" stroke-width="2.8"/>
        <circle cx="13" cy="13" r="${PATIENCE_R}" fill="none" stroke="#f0c060"
          stroke-width="2.8" stroke-linecap="round" stroke-dasharray="${PATIENCE_C}" stroke-dashoffset="0"/>
      </svg>`;
    const patienceArc = ring.querySelector('circle:nth-of-type(2)') as SVGCircleElement;

    const metaEl = el('div', 'c-meta', card);
    const noteEl = el('div', 'dish-note', card);

    const barWrap = el('div', 'bar-wrap', card);
    el('div', 'bar-zone-perfect', barWrap);
    el('div', 'bar-zone-burn', barWrap);
    const barFill = el('div', 'bar-fill', barWrap);

    const bot = el('div', 'c-bot', card);
    const statusEl = el('div', 'status-txt', bot);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-btn';
    btn.innerHTML = `
      <svg class="prep-ring" viewBox="0 0 58 46" aria-hidden="true">
        <circle cx="29" cy="23" r="${PREP_R}" fill="none" stroke="rgba(167,191,214,.22)" stroke-width="3.5"/>
        <circle class="prep-arc" cx="29" cy="23" r="${PREP_R}" fill="none" stroke="#7ec2f8" stroke-width="3.5"
          stroke-linecap="round" stroke-dasharray="${PREP_C}" stroke-dashoffset="${PREP_C}"
          transform="rotate(-90 29 23)"/>
      </svg>
      <span class="btn-lbl"></span>`;
    bot.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      this.onCardAction?.(tableId);
    });
    card.addEventListener('click', () => {
      if (btn.disabled) return;
      this.onCardAction?.(tableId);
    });

    const view: CardView = {
      tableId,
      root: card,
      badge,
      patienceArc,
      nm,
      metaEl,
      noteEl,
      barFill,
      statusEl,
      btn,
      prepArc: btn.querySelector('.prep-arc') as SVGCircleElement,
      btnLbl: btn.querySelector('.btn-lbl') as HTMLElement,
      dishKey: '',
      orderState: 'ordering',
      cookWindow: 'none',
      cookT: 0,
      prepT: 0,
      progressPct: 0,
      statusText: '',
      btnText: '',
    };
    this.cardMap.set(tableId, view);
    return view;
  }

  private updateOnboard(
    passSlots: PassSlotView[],
    carrying: CarryingState | null,
    shown: OrderCardState[],
  ): void {
    if (!this.playHudVisible || this.servedCount >= 1 || !shown.length) {
      this.onboardEl.style.display = 'none';
      this.onboardEl.dataset.onboardTip = '';
      return;
    }

    let anchor: HTMLElement | null = null;
    let mode = '';
    let text = '';

    const serving = shown.find((s) => s.orderState === 'serving');
    const grilling = shown.find((s) => s.orderState === 'grilling');
    const firstReadyPass = passSlots.find((s) => s.item !== null);

    if (serving) {
      anchor = this.cardMap.get(serving.tableId)?.btn ?? null;
      mode = 'serve';
      text = serving.cookWindow === 'over' ? '快焦了，立刻盛盘！' : '火候正好，点盛盘！';
    } else if (carrying) {
      anchor = this.cardMap.get(carrying.tableId)?.btn ?? null;
      mode = 'grill';
      text = '点这里上桌烤';
    } else if (firstReadyPass) {
      anchor = this.passSlotsDom[firstReadyPass.slotIndex]?.btn ?? null;
      mode = 'take';
      text = '菜出窗了，点托盘取菜';
    } else if (grilling) {
      anchor = this.cardMap.get(grilling.tableId)?.root ?? null;
      mode = 'wait';
      text = '等火候进金色区再盛盘';
    } else {
      this.onboardEl.style.display = 'none';
      this.onboardEl.dataset.onboardTip = '';
      return;
    }

    if (!anchor || !anchor.isConnected) {
      this.onboardEl.style.display = 'none';
      return;
    }

    this.onboardTxt.textContent = text;
    this.onboardEl.dataset.onboardTip = mode;
    this.onboardEl.style.display = 'flex';

    const ar = anchor.getBoundingClientRect();
    const or = this.onboardEl.getBoundingClientRect();
    const dockRect = this.dockEl.getBoundingClientRect();
    if (ar.width <= 0 || or.width <= 0) return;

    const vw = window.innerWidth;
    const tb = this.topbarEl.getBoundingClientRect();
    const topSafe = (tb.height > 0 ? tb.bottom : 0) + 6;
    const cx = ar.left + ar.width / 2;
    const left = Math.min(Math.max(8, cx - or.width / 2), Math.max(8, vw - 8 - or.width));
    // Place onboarding tip just above the entire thumb dock so it never occludes pass slots or cards
    const top = Math.max(topSafe, dockRect.top - or.height - 10);
    const arrowX = Math.min(Math.max(12, cx - left), Math.max(12, or.width - 12));

    this.onboardEl.style.left = `${Math.round(left)}px`;
    this.onboardEl.style.top = `${Math.round(top)}px`;
    this.onboardEl.style.setProperty('--ax', `${Math.round(arrowX)}px`);
  }

  cardState(tableId: string): CardStateSnapshot | null {
    const view = this.cardMap.get(tableId);
    if (!view || !view.root.isConnected) return null;
    const r = view.btn.getBoundingClientRect();
    return {
      orderState: view.orderState,
      cookWindow: view.cookWindow,
      cookT: view.cookT,
      prepT: view.prepT,
      progressPct: view.progressPct,
      btn: { w: Number(r.width.toFixed(2)), h: Number(r.height.toFixed(2)) },
      disabled: view.btn.disabled,
      statusText: view.statusText,
      btnText: view.btnText,
    };
  }

  passDomRects(): { slotIndex: number; occupied: boolean; tableId: string; w: number; h: number; top: number; bottom: number }[] {
    return this.passSlotsDom.map((d) => {
      const r = d.btn.getBoundingClientRect();
      return {
        slotIndex: d.slotIndex,
        occupied: d.btn.dataset.occupied === 'true',
        tableId: d.btn.dataset.table ?? '',
        w: Number(r.width.toFixed(2)),
        h: Number(r.height.toFixed(2)),
        top: Number(r.top.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
      };
    });
  }

  // ---- World-projected Table Rings & Cleaning Tags ----

  updateRings(customers: Customer[], tables: TableRuntime[]): void {
    if (!this.playHudVisible) return;
    const active = new Set<string>();
    for (const c of customers) {
      if (c.phase === 'seated' || c.phase === 'eating' || c.phase === 'burnt') active.add(c.table);
    }

    this.cam.updateMatrixWorld();
    const tbRect = this.topbarEl.getBoundingClientRect();
    const topSafe = (tbRect.height > 0 ? tbRect.bottom : 0) + 6;
    const dockRect = this.dockEl.getBoundingClientRect();
    const bottomSafe = dockRect.height > 0 ? dockRect.top - 8 : window.innerHeight - 10;

    for (const table of tables) {
      // Active table ground ring + table number badge
      if (active.has(table.id)) {
        let entry = this.ringMap.get(table.id);
        if (!entry) {
          const col = tableColor(table.id);
          const ring = el('div', 'order-ring', this.ringsEl);
          ring.dataset.orderRing = table.id;
          ring.style.setProperty('--rc', col);
          const num = el('div', 'order-num', this.ringsEl);
          num.dataset.orderNum = table.id;
          num.textContent = String(table.tableNum);
          num.style.setProperty('--rc', col);
          entry = { ring, num };
          this.ringMap.set(table.id, entry);
        }
        this.ringPos.set(table.pos.x, 0.02, table.pos.z);
        const p = this.project(this.ringPos);
        if (!p || p.y > bottomSafe) {
          entry.ring.style.display = 'none';
          entry.num.style.display = 'none';
        } else {
          entry.ring.style.display = 'block';
          entry.num.style.display = 'flex';
          const ringCy = Math.max(topSafe + 22, Math.min(p.y, bottomSafe - 22));
          const numCy = Math.max(topSafe + 14, Math.min(ringCy + 24, bottomSafe - 14));
          entry.ring.style.left = `${p.x}px`;
          entry.ring.style.top = `${ringCy}px`;
          entry.num.style.left = `${p.x}px`;
          entry.num.style.top = `${numCy}px`;
        }
      } else {
        const entry = this.ringMap.get(table.id);
        if (entry) {
          entry.ring.remove();
          entry.num.remove();
          this.ringMap.delete(table.id);
        }
      }

      // Table cleaning countdown tag (2.0s after guest leaves)
      if (!table.guest && table.cooldown > 0) {
        let tag = this.cleanMap.get(table.id);
        if (!tag) {
          tag = el('div', 'clean-tag', this.ringsEl);
          tag.dataset.cleanTable = table.id;
          this.cleanMap.set(table.id, tag);
        }
        tag.textContent = `清桌 ${Math.ceil(table.cooldown)}s`;
        this.ringPos.set(table.pos.x, 0.72, table.pos.z);
        const p = this.project(this.ringPos);
        if (!p || p.y > bottomSafe) {
          tag.style.display = 'none';
        } else {
          tag.style.display = 'block';
          tag.style.left = `${p.x}px`;
          tag.style.top = `${Math.max(topSafe + 12, p.y - 12)}px`;
        }
      } else {
        const tag = this.cleanMap.get(table.id);
        if (tag) {
          tag.remove();
          this.cleanMap.delete(table.id);
        }
      }
    }
  }

  // ---- Popups (max 3 concurrent, never covering topbar or thumb dock) ----

  popup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void {
    if (!this.playHudVisible) return;
    // Cap concurrent popups at 3
    while (this.popupsEl.children.length >= 3) {
      this.popupsEl.firstElementChild?.remove();
    }

    this.cam.updateMatrixWorld();
    this.tmp.copy(worldPos).project(this.cam);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const px = Number.isFinite(this.tmp.x) ? (this.tmp.x * 0.5 + 0.5) * vw : vw / 2;
    const py = Number.isFinite(this.tmp.y) ? (-this.tmp.y * 0.5 + 0.5) * vh : vh * 0.35;

    const e = el('div', `popup ${kind}`, this.popupsEl);
    e.textContent = text;
    e.style.left = '0px';
    e.style.top = '0px';
    const { width: bw, height: bh } = e.getBoundingClientRect();

    const tbRect = this.topbarEl.getBoundingClientRect();
    const dockRect = this.dockEl.getBoundingClientRect();
    const topSafe = (tbRect.height > 0 ? tbRect.bottom : 0) + 8;
    const bottomSafe = dockRect.height > 0 ? dockRect.top - 10 : vh - 12;

    const minX = 8 + bw / 2;
    const maxX = Math.max(minX, vw - 8 - bw / 2);
    let x = Math.min(Math.max(px, minX), maxX);
    let bottom = Math.min(Math.max(py - 28, topSafe + bh), Math.max(topSafe + bh, bottomSafe));

    // Avoid overlapping existing popups by stepping vertically
    const existing = [...this.popupsEl.querySelectorAll<HTMLElement>('.popup')]
      .filter((n) => n !== e)
      .map((n) => n.getBoundingClientRect());
    for (let attempt = 0; attempt < 6; attempt++) {
      const l = x - bw / 2;
      const r = x + bw / 2;
      const t = bottom - bh;
      const hit = existing.find((o) => l < o.right + 4 && o.left - 4 < r && t < o.bottom + 4 && o.top - 4 < bottom);
      if (!hit) break;
      const tryUp = hit.top - 4;
      if (tryUp - bh >= topSafe) bottom = tryUp;
      else bottom = Math.min(bottomSafe, hit.bottom + bh + 4);
    }

    e.style.left = `${Math.round(x)}px`;
    e.style.top = `${Math.round(bottom)}px`;

    const t0 = performance.now();
    const kill = (): void => { if (e.isConnected) e.remove(); };
    const tick = (): void => {
      if (performance.now() - t0 >= 1500) kill();
      else if (e.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(kill, 4000);
  }

  private project(v: THREE.Vector3): { x: number; y: number } | null {
    this.tmp.copy(v).project(this.cam);
    if (this.tmp.z > 1) return null;
    return {
      x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  updateBubbles(customers: Customer[]): void {
    if (!this.playHudVisible) return;
    this.cam.updateMatrixWorld();

    const ordered = customers
      .filter((c) => c.phase === 'seated' || c.phase === 'eating' || c.phase === 'walking-in' || c.phase === 'burnt')
      .sort((a, b) => tableOrder(a.table) - tableOrder(b.table) || a.id - b.id);

    const live = new Set<number>();
    const pending: { b: Bubble; px: number; py: number }[] = [];

    for (const c of ordered) {
      live.add(c.id);
      let b = this.bubbleMap.get(c.id);
      if (!b) {
        const root = el('div', 'bubble', this.bubblesEl);
        root.dataset.table = c.table;
        root.innerHTML = `<svg width="22" height="22" viewBox="0 0 26 26">
          <circle cx="13" cy="13" r="${BUBBLE_RING_R}" fill="none" stroke="rgba(240,192,96,.22)" stroke-width="3"/>
          <circle class="arc" cx="13" cy="13" r="${BUBBLE_RING_R}" fill="none" stroke="#f0c060" stroke-width="3"
            stroke-linecap="round" stroke-dasharray="${BUBBLE_RING_C}" stroke-dashoffset="0" transform="rotate(-90 13 13)"/></svg>
          <span class="nm"></span>`;
        b = {
          root,
          arc: root.querySelector('.arc') as SVGElement,
          nm: root.querySelector('.nm') as HTMLElement,
          label: '', frac: -1, angry: false, entering: false,
        };
        this.bubbleMap.set(c.id, b);
      }

      const entering = c.phase === 'walking-in';
      if (entering !== b.entering) {
        b.entering = entering;
        b.root.classList.toggle('entering', entering);
      }
      if (!entering) {
        const frac = c.phase === 'eating' ? 1 : Math.min(1, Math.max(0, c.patience / c.patienceMax));
        const angry = c.phase === 'burnt' || (c.phase === 'seated' && frac < 0.25);
        const label = c.phase === 'eating' ? '用餐中' : c.phase === 'burnt' ? '焦糊!' : DISHES[c.dish].shortName;
        const labelKey = `${c.dish}|${label}`;
        if (labelKey !== b.label) {
          b.label = labelKey;
          b.nm.innerHTML = `${FOOD_ICONS[c.dish]}<span>${label}</span>`;
        }
        if (Math.abs(frac - b.frac) > 0.005) {
          b.frac = frac;
          b.arc.setAttribute('stroke-dashoffset', String(BUBBLE_RING_C * (1 - frac)));
        }
        if (angry !== b.angry) {
          b.angry = angry;
          b.root.classList.toggle('angry', angry);
          b.arc.setAttribute('stroke', angry ? '#e05a3a' : '#f0c060');
        }
      }

      this.headPos.copy(c.obj.position);
      this.headPos.y += 1.32;
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

    const vw = window.innerWidth;
    const tbRect = this.topbarEl.getBoundingClientRect();
    const dockRect = this.dockEl.getBoundingClientRect();
    const topSafe = (tbRect.height > 0 ? tbRect.bottom : 0) + 6;
    const bottomSafe = dockRect.height > 0 ? dockRect.top - 6 : window.innerHeight - 8;

    const placed: Box[] = [];
    for (const item of pending) {
      const r = item.b.root.getBoundingClientRect();
      const w = r.width || 60;
      const h = r.height || 24;
      let l = Math.min(Math.max(4, item.px - w / 2), Math.max(4, vw - 4 - w));
      let t = Math.min(Math.max(topSafe, item.py - h), Math.max(topSafe, bottomSafe - h));

      for (let k = 0; k < 4; k++) {
        const hit = placed.find((o) => l < o.right + 4 && o.left - 4 < l + w && t < o.bottom + 4 && o.top - 4 < t + h);
        if (!hit) break;
        if (hit.top - h - 4 >= topSafe) t = hit.top - h - 4;
        else if (hit.right + 4 + w <= vw - 4) l = hit.right + 4;
        else l = Math.max(4, hit.left - w - 4);
      }
      placed.push({ left: l, top: t, right: l + w, bottom: t + h });
      item.b.root.style.left = `${Math.round(l + w / 2)}px`;
      item.b.root.style.top = `${Math.round(t + h)}px`;
    }
  }

  repositionOnboard(): void {
    // Re-evaluated cleanly on the next syncState
  }

  levelTarget(): number {
    return this.target;
  }
}
