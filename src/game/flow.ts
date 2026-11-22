// Game orchestration (Gameplay v2):
// ① Customer seats → order card appears (ordering, 3.0s auto-prep ring, non-interactive)
// ② Prep completes → dish appears in Pass window (capacity 3; full pauses prep)
// ③ Click Pass tray (Click 1) → player auto-walks to Pass, carries { dishId, tableId } (blocks taking other trays)
// ④ Click Table order card / tabletop grill (Click 2) → player auto-walks to table, meat goes on tabletop grill (8.0s heat bar)
// ⑤ Click Table order card / tabletop grill in perfect/over window (Click 3) → plate & serve → done + money
//    Early click (<5.0s) = undercooked (reset heat bar); >8.0s = burnt (deduct money + big patience drop, order voided, ONCE)
// ⑥ Customer eats → leaves → 2.0s table cleaning → free table
// One update(dt) drives everything — zero setTimeout in simulation logic.

import * as THREE from 'three';
import { BIZ, COOK, ECON, LEVELS, SAVE_KEYS } from '../config.ts';
import type { DishId, Level } from '../config.ts';
import type {
  StationRuntime,
  Customer,
  GamePhase,
  OrderState,
  CookWindow,
  PassItem,
  CarryingState,
} from './types.ts';
import { buildPassTray, createItem, setItemStage } from './items.ts';
import { Highlighter, nextTarget, registerNavPoints } from './stations.ts';
import type { NextTarget } from './stations.ts';
import { TableGrillFX } from './grill.ts';
import { Player } from './player.ts';
import { disposeTree } from '../core/dispose.ts';
import { spawnCustomer, updateCustomer } from './customers.ts';
import type { TableRuntime } from '../world/dining.ts';
import { createEmptyTableGrill } from '../world/dining.ts';
import { PLAYER_SPAWN, cellToWorld } from '../world/layout.ts';
import { calcStars } from './stars.ts';
import type { StarRating } from './stars.ts';
import {
  calcDineDuration,
  calcEatDuration,
  calcEntryRevenue,
  calcServiceTip,
  calcTurnRate,
  clampSatisfaction,
  publishEcon,
  roundMoney,
} from './economy.ts';
import type { EconSnapshot } from './economy.ts';

export interface FlowEvents {
  onPhase(phase: GamePhase): void;
  onMoney(money: number): void;
  onTimeLeft(sec: number): void;
  onSync(): void;
  onPopup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void;
  onResults(r: Results): void;
}

export interface Results {
  stars: StarRating;
  money: number;
  entryFee: number;
  entryRevenue: number;
  tips: number;
  target: number;        // 保留字段名兼容，语义 = targetGuests
  targetGuests: number;
  seats: number;
  served: number;
  turnRate: number;
  satisfaction: number;
  earlyLeaves: number;
  angry: number;
  waste: number;
  pass: boolean;
  level: number;
  hasNext: boolean;
}

export const COOK_EPS = 1e-6;

export function cookWindowFor(t: number): Exclude<CookWindow, 'none'> {
  if (t + COOK_EPS >= COOK.burnTime) return 'burnt';
  if (t + COOK_EPS >= COOK.perfectEnd) return 'over';
  if (t + COOK_EPS >= COOK.perfectStart) return 'perfect';
  return 'raw';
}

export interface OrderCardState {
  tableId: string;
  tableNum: number;
  customerId: number;
  dish: DishId;
  orderState: OrderState;
  cookWindow: CookWindow;
  patience: number;
  patienceMax: number;
  prepT: number;
  prepPct: number;
  cookT: number;
  cookPct: number;
  passPaused: boolean;
  rawLocked: boolean;
  disabled: boolean;
  statusText: string;
  btnText: string;
  clicksUsed: number;
}

export interface PassSlotView {
  slotIndex: number;
  item: {
    id: number;
    dishId: DishId;
    tableId: string;
    tableNum: number;
    customerId: number;
  } | null;
}

function savedLevel(): number {
  const n = Math.floor(Number(localStorage.getItem(SAVE_KEYS.level) || 1));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, LEVELS.length) : 1;
}

let nextPassItemId = 1;

export class Flow {
  phase: GamePhase = 'menu';
  money = 0;
  entryRevenue = 0;
  tips = 0;
  level = savedLevel();
  cfg: Level = LEVELS[this.level - 1];
  seats = this.cfg.maxDiners;
  timeLeft = this.cfg.duration;
  served = 0;
  satisfaction = ECON.satisfactionInit;
  earlyLeaves = 0;
  angry = 0;
  waste = 0;
  clickCount = 0;

  readonly player = new Player();
  readonly customers: Customer[] = [];
  readonly pass: PassItem[] = [];
  readonly grillFX = new TableGrillFX();

  private passStation: StationRuntime;
  private passSlots: THREE.Vector3[];
  private tables: TableRuntime[];
  private doorPos: THREE.Vector3;
  private scene: THREE.Scene;
  private ev: FlowEvents;
  private highlighter: Highlighter;
  private spawnT = 1.6;
  private hudSyncT = 0;

  spawnsPaused = false; // e2e hook for deterministic guests

  constructor(
    scene: THREE.Scene,
    passStation: StationRuntime,
    passSlots: THREE.Vector3[],
    tables: TableRuntime[],
    doorPos: THREE.Vector3,
    ev: FlowEvents,
  ) {
    this.scene = scene;
    this.passStation = passStation;
    this.passSlots = passSlots;
    this.tables = tables;
    this.doorPos = doorPos;
    this.ev = ev;
    this.grillFX.attachTo(scene);
    this.highlighter = new Highlighter(scene);
    registerNavPoints([passStation], tables);
    this.syncEcon();
  }

  econSnapshot(): EconSnapshot {
    return {
      entryFee: BIZ.entryFee,
      entryRevenue: this.entryRevenue,
      tips: this.tips,
      money: this.money,
      served: this.served,
      seats: this.seats,
      targetGuests: this.cfg.targetGuests,
      satisfaction: this.satisfaction,
      turnRate: calcTurnRate(this.served, this.seats),
      earlyLeaves: this.earlyLeaves,
      stars: this.starsNow(),
      phase: this.phase,
    };
  }

  syncEcon(): void {
    publishEcon(this.econSnapshot());
  }

  placePlayer(): void {
    this.spawnPlayer();
    this.scene.add(this.player.obj);
  }

  private spawnPlayer(): void {
    const s = cellToWorld(PLAYER_SPAWN[0], PLAYER_SPAWN[1]);
    this.player.obj.position.set(s.x, 0, s.z);
    this.player.obj.rotation.y = 0;
    this.player.cancelNav();
  }

  get passPaused(): boolean {
    return this.pass.length >= COOK.passCapacity;
  }

  get carrying(): CarryingState | null {
    return this.player.carrying;
  }

  get hint(): NextTarget | null {
    return this.phase === 'playing'
      ? nextTarget(this.player.carrying, this.pass, this.tables, this.customers)
      : null;
  }

  private tableById(tableId: string): TableRuntime | undefined {
    return this.tables.find((t) => t.id === tableId);
  }

  // ---------------- phase control ----------------

  startLevel(): void {
    this.phase = 'playing';
    this.seats = this.cfg.maxDiners;
    this.entryRevenue = calcEntryRevenue(this.seats, BIZ.entryFee);
    this.tips = 0;
    this.money = this.entryRevenue;
    this.timeLeft = this.cfg.duration;
    this.served = 0;
    this.satisfaction = ECON.satisfactionInit;
    this.earlyLeaves = 0;
    this.angry = 0;
    this.waste = 0;
    this.clickCount = 0;
    this.spawnT = 1.4;
    this.hudSyncT = 0;

    // Clear customers & served plates
    for (const c of this.customers) {
      const plate = (c as unknown as { _plate?: THREE.Object3D })._plate;
      if (plate) { this.scene.remove(plate); disposeTree(plate); }
      this.scene.remove(c.obj);
      disposeTree(c.obj);
    }
    this.customers.length = 0;

    // Clear Pass window
    for (const p of this.pass) {
      this.scene.remove(p.obj);
      disposeTree(p.obj);
    }
    this.pass.length = 0;

    // Clear tabletop grills & cooldowns
    for (const t of this.tables) {
      if (t.grill.item) {
        this.scene.remove(t.grill.item.obj);
        disposeTree(t.grill.item.obj);
      }
      t.grill = createEmptyTableGrill();
      t.guest = null;
      t.cooldown = 0;
    }
    this.grillFX.reset();

    // Clear player hand
    if (this.player.carrying) {
      disposeTree(this.player.carrying.item.obj);
      this.player.setCarrying(null);
    }
    this.spawnPlayer();

    this.syncEcon();
    this.ev.onPhase('playing');
    this.ev.onMoney(this.money);
    this.ev.onTimeLeft(this.timeLeft);
    this.ev.onSync();
  }

  starsNow(): StarRating {
    return calcStars({
      served: this.served,
      targetGuests: this.cfg.targetGuests,
      satisfaction: this.satisfaction,
      angry: this.angry,
      waste: this.waste,
    });
  }

  nextLevel(): void {
    const passed = this.served >= this.cfg.targetGuests && this.satisfaction >= ECON.tipMinSatisfaction;
    if (this.phase !== 'results' || !passed || this.level >= LEVELS.length) return;
    this.level += 1;
    this.cfg = LEVELS[this.level - 1];
    localStorage.setItem(SAVE_KEYS.level, String(this.level));
    this.startLevel();
  }

  endLevel(): void {
    this.phase = 'results';
    const stars = this.starsNow();
    const turnRate = calcTurnRate(this.served, this.seats);
    const pass = this.served >= this.cfg.targetGuests && this.satisfaction >= ECON.tipMinSatisfaction;
    const res: Results = {
      stars,
      money: this.money,
      entryFee: BIZ.entryFee,
      entryRevenue: this.entryRevenue,
      tips: this.tips,
      target: this.cfg.targetGuests,
      targetGuests: this.cfg.targetGuests,
      seats: this.seats,
      served: this.served,
      turnRate,
      satisfaction: this.satisfaction,
      earlyLeaves: this.earlyLeaves,
      angry: this.angry,
      waste: this.waste,
      pass,
      level: this.level,
      hasNext: this.level < LEVELS.length,
    };
    const best = Number(localStorage.getItem(SAVE_KEYS.best) ?? '0');
    if (this.served > best) localStorage.setItem(SAVE_KEYS.best, String(this.served));
    this.syncEcon();
    this.ev.onPhase('results');
    this.ev.onResults(res);
  }

  // ---------------- customer plumbing ----------------

  private freeTables(): TableRuntime[] {
    return this.tables.filter((t) => !t.guest && t.cooldown <= 0);
  }

  private activeGuestCount(): number {
    return this.customers.filter(
      (c) => c.phase === 'walking-in' || c.phase === 'seated' || c.phase === 'eating' || c.phase === 'burnt',
    ).length;
  }

  private cleanupCustomerItems(c: Customer): void {
    this.removePassByCustomer(c.id);
    if (this.player.carrying?.customerId === c.id) {
      disposeTree(this.player.carrying.item.obj);
      this.player.setCarrying(null);
    }
    const table = this.tableById(c.table);
    if (table && table.grill.customerId === c.id) {
      this.clearTableGrill(table);
    }
  }

  private releaseTableForCustomer(c: Customer): void {
    const table = this.tableById(c.table);
    if (!table) return;
    if (table.guest === c.id) {
      table.guest = null;
      table.cooldown = COOK.cleanTime; // 2.0s table cleanup before re-seating
    }
    const holder = c as unknown as { _plate?: THREE.Object3D };
    if (holder._plate) {
      this.scene.remove(holder._plate);
      disposeTree(holder._plate);
      holder._plate = undefined;
    }
  }

  /** Dissatisfied guest leaves early (frees table into 2.0s cleanup, no money deduction). */
  private triggerEarlyLeave(c: Customer, reason = '不满提前离店'): boolean {
    if (c.phase !== 'seated') return false;
    this.cleanupCustomerItems(c);
    c.earlyLeft = true;
    c.phase = 'leaving-angry';
    c.obj.position.y = 0;
    this.earlyLeaves += 1;
    this.angry += 1;
    this.releaseTableForCustomer(c);
    this.ev.onPopup(c.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0)), reason, 'warn');
    this.syncEcon();
    return true;
  }

  /** Apply satisfaction change and trigger early leave when falling below ECON.earlyLeaveThreshold. */
  private applySatisfactionDelta(delta: number, targetGuest?: Customer, guestDelta = 0): void {
    const wasAbove = this.satisfaction >= ECON.earlyLeaveThreshold;
    this.satisfaction = clampSatisfaction(this.satisfaction + delta);
    if (targetGuest && guestDelta !== 0) {
      targetGuest.satisfaction = clampSatisfaction(targetGuest.satisfaction + guestDelta);
    }

    if (delta < 0) {
      if (
        targetGuest &&
        targetGuest.phase === 'seated' &&
        (targetGuest.satisfaction < ECON.earlyLeaveThreshold || this.satisfaction < ECON.earlyLeaveThreshold)
      ) {
        this.triggerEarlyLeave(targetGuest, '不满提前离店');
      }
      if (wasAbove && this.satisfaction < ECON.earlyLeaveThreshold) {
        for (const other of [...this.customers]) {
          if (other.phase === 'seated') {
            this.triggerEarlyLeave(other, '口碑跌破阈值 · 提前离店');
          }
        }
      }
    }

    this.syncEcon();
    this.ev.onMoney(this.money);
  }

  private trySpawn(dt: number): void {
    if (this.spawnsPaused) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const free = this.freeTables();
    if (free.length && this.activeGuestCount() < this.cfg.maxDiners) {
      const t = free[Math.floor(Math.random() * free.length)];
      this.customers.push(spawnCustomer(this.scene, t, this.doorPos, undefined, calcDineDuration(this.seats)));
      const [a, b] = this.cfg.spawnEvery;
      this.spawnT = a + Math.random() * (b - a);
      this.ev.onSync();
    } else {
      this.spawnT = 2.0;
    }
  }

  // ---------------- Pass window (出菜窗口) ----------------

  private pushToPass(guest: Customer): boolean {
    if (this.pass.length >= COOK.passCapacity) return false;
    const usedSlots = new Set(this.pass.map((p) => p.slotIndex));
    let slotIndex = 0;
    while (usedSlots.has(slotIndex) && slotIndex < COOK.passCapacity) slotIndex++;
    if (slotIndex >= COOK.passCapacity) return false;

    const id = nextPassItemId++;
    const obj = buildPassTray(guest.dish);
    const anchor = this.passSlots[slotIndex] ?? this.passStation.pos;
    obj.position.copy(anchor);
    obj.userData.passItemId = id;
    this.scene.add(obj);

    this.pass.push({
      id,
      dishId: guest.dish,
      tableId: guest.table,
      customerId: guest.id,
      slotIndex,
      obj,
    });
    guest.orderState = 'ready';
    return true;
  }

  private removePassByCustomer(customerId: number): void {
    const idx = this.pass.findIndex((p) => p.customerId === customerId);
    if (idx < 0) return;
    const [removed] = this.pass.splice(idx, 1);
    this.scene.remove(removed.obj);
    disposeTree(removed.obj);
  }

  /** Click 1: take a ready dish from a Pass window tray slot (0..2). Invalid while already carrying! */
  takeFromPass(slotIndex?: number): boolean {
    if (this.phase !== 'playing') return false;
    if (this.player.carrying) {
      // Holding a dish blocks taking any other tray from the Pass window
      const targetNum = this.tableById(this.player.carrying.tableId)?.tableNum ?? 1;
      this.ev.onPopup(this.passStation.pos.clone().add(new THREE.Vector3(0, 0.55, 0)), `先送去 ${targetNum} 号桌`, 'warn');
      return false;
    }

    const idx = slotIndex !== undefined
      ? this.pass.findIndex((p) => p.slotIndex === slotIndex)
      : 0;
    if (idx < 0 || idx >= this.pass.length) return false;

    const entry = this.pass[idx];
    const guest = this.customers.find((c) => c.id === entry.customerId && c.phase === 'seated');
    if (!guest) {
      this.removePassByCustomer(entry.customerId);
      this.ev.onSync();
      return false;
    }

    // Remove from Pass queue & place carried tray in player's hands
    this.pass.splice(idx, 1);
    this.scene.remove(entry.obj);
    disposeTree(entry.obj);

    const carriedItem = createItem(entry.dishId, 'raw', true);
    this.player.setCarrying({
      dishId: entry.dishId,
      tableId: entry.tableId,
      customerId: entry.customerId,
      item: carriedItem,
    });
    guest.orderState = 'carrying';
    this.clickCount += 1;
    guest.clicksUsed += 1;

    // Auto-walk toward the Pass window
    this.player.walkTo(this.passStation.usePos, this.passStation.pos);
    this.ev.onSync();
    return true;
  }

  /** Pass slots snapshot (always length = COOK.passCapacity = 3). */
  passSlotViews(): PassSlotView[] {
    const out: PassSlotView[] = [];
    for (let i = 0; i < COOK.passCapacity; i++) {
      const p = this.pass.find((x) => x.slotIndex === i) ?? null;
      const tb = p ? this.tableById(p.tableId) : undefined;
      out.push({
        slotIndex: i,
        item: p
          ? {
            id: p.id,
            dishId: p.dishId,
            tableId: p.tableId,
            tableNum: tb?.tableNum ?? 1,
            customerId: p.customerId,
          }
          : null,
      });
    }
    return out;
  }

  // ---------------- Tabletop Grill & Serving (Clicks 2 & 3) ----------------

  private clearTableGrill(table: TableRuntime): void {
    const g = table.grill;
    if (g.item) {
      this.scene.remove(g.item.obj);
      disposeTree(g.item.obj);
    }
    table.grill = createEmptyTableGrill();
  }

  /** Trigger burn penalty strictly ONCE for a tabletop grill exceeding burnTime (>8.0s). */
  private triggerTableBurn(table: TableRuntime): boolean {
    const g = table.grill;
    if (!g.active || g.burntHandled) return false;
    g.burntHandled = true;

    const customerId = g.customerId;
    const item = g.item;
    g.active = false;
    g.item = null;
    g.dishId = null;
    g.customerId = null;
    g.cookWindow = 'none';
    if (item) {
      this.scene.remove(item.obj);
      disposeTree(item.obj);
    }

    const guest = this.customers.find((c) => c.id === customerId);
    if (guest) {
      if (guest.burntHandled) return false;
      guest.burntHandled = true;
      guest.orderState = 'burnt';
      guest.phase = 'burnt';
      guest.burntLinger = COOK.burntLinger;
      const drop = Math.max(10, Math.round(guest.patienceMax * COOK.burnPatienceDrop));
      guest.patience = Math.max(0, guest.patience - drop);
    }

    this.grillFX.spawnBurnBurst(table.grillPos);
    // 自助制：焦糊作废不扣钱，只扣满意度与星级
    this.waste += 1;
    this.applySatisfactionDelta(-ECON.penaltyBurn, guest, -ECON.guestPenaltyBurn);
    this.ev.onPopup(table.pos.clone().add(new THREE.Vector3(0, 0.48, 0)), `焦糊作废 · 满意度-${ECON.penaltyBurn}`, 'warn');
    this.ev.onSync();
    return true;
  }

  /** Click 2 (put carried raw meat onto tabletop grill) & Click 3 (plate cooked meat to customer). */
  handleTableAction(tableId: string): boolean {
    if (this.phase !== 'playing') return false;
    const table = this.tableById(tableId);
    if (!table) return false;
    const guest = this.customers.find((c) => c.table === tableId && c.phase === 'seated' && !c.paid);
    if (!guest) return false;

    // ---- Click 2: carrying this table's dish → place onto this table's built-in grill ----
    const hand = this.player.carrying;
    if (hand && hand.tableId === tableId && hand.customerId === guest.id && guest.orderState === 'carrying' && !table.grill.active) {
      disposeTree(hand.item.obj);
      this.player.setCarrying(null);

      const grillItem = createItem(guest.dish, 'raw', false);
      grillItem.grillT = 0;
      grillItem.obj.scale.setScalar(1.25);
      grillItem.obj.position.copy(table.grillPos);
      grillItem.obj.rotation.set(0, 0.22, 0);
      this.scene.add(grillItem.obj);

      table.grill = {
        active: true,
        dishId: guest.dish,
        customerId: guest.id,
        grillT: 0,
        cookWindow: 'raw',
        item: grillItem,
        burntHandled: false,
        smokeT: 0.18,
      };
      guest.orderState = 'grilling';
      this.clickCount += 1;
      guest.clicksUsed += 1;

      this.player.walkTo(table.usePos, table.pos);
      this.ev.onSync();
      return true;
    }

    // ---- Click 3 (or early raw tap): tabletop grill is active ----
    if (table.grill.active && table.grill.customerId === guest.id && table.grill.item) {
      const win = cookWindowFor(table.grill.grillT);

      // Early (< 5.0s) → undercooked: unhappy customer, reset heat bar to 0 (no money deduction)
      if (win === 'raw') {
        if (table.grill.grillT + COOK_EPS < COOK.rawLockSec) return false;
        table.grill.grillT = 0;
        table.grill.cookWindow = 'raw';
        table.grill.item.grillT = 0;
        guest.orderState = 'grilling';
        const drop = Math.max(4, Math.round(guest.patienceMax * COOK.rawPatienceDrop));
        guest.patience = Math.max(1, guest.patience - drop);
        this.player.walkTo(table.usePos, table.pos);
        this.applySatisfactionDelta(-ECON.penaltyRaw, guest, -ECON.guestPenaltyRaw);
        if (guest.phase === 'seated') {
          this.ev.onPopup(table.pos.clone().add(new THREE.Vector3(0, 0.45, 0)), `夹生重烤 · 满意度-${ECON.penaltyRaw}`, 'warn');
        }
        this.ev.onSync();
        return true;
      }

      if (win === 'burnt') {
        this.triggerTableBurn(table);
        return false;
      }

      // Perfect (5.0–7.0s) or Over (7.0–8.0s) → Plate & serve to customer!
      const lifted = table.grill.item;
      this.scene.remove(lifted.obj);
      table.grill = createEmptyTableGrill();

      lifted.obj.scale.setScalar(1);
      lifted.obj.position.set(0, 0, 0);
      setItemStage(lifted, 'plated');
      lifted.obj.position.copy(table.platePos);
      this.scene.add(lifted.obj);
      (guest as unknown as { _plate?: THREE.Object3D })._plate = lifted.obj;

      guest.paid = true;
      guest.orderState = 'done';
      guest.phase = 'eating';
      guest.eatT = calcEatDuration(guest.dineDuration, guest.dineT);
      this.clickCount += 1;
      guest.clicksUsed += 1;

      const cookWin = win === 'over' ? 'over' : 'perfect';
      if (cookWin === 'perfect') {
        this.satisfaction = clampSatisfaction(this.satisfaction + ECON.bonusPerfect);
      }
      // 自助制所有菜价为 ¥0；整局收入由入场费 + 满意度小费构成，绝不因菜品价格变化
      const tip = calcServiceTip(this.satisfaction, cookWin);
      this.tips = roundMoney(this.tips + tip);
      this.money = roundMoney(this.entryRevenue + this.tips);
      this.served += 1;
      this.player.walkTo(table.usePos, table.pos);
      this.syncEcon();
      this.ev.onMoney(this.money);
      this.ev.onPopup(
        table.pos.clone().add(new THREE.Vector3(0, 0.48, 0)),
        tip > 0 ? `上菜成功 +¥${tip}小费` : '上菜成功',
        tip > 0 ? 'money' : 'ok',
      );
      this.ev.onSync();
      return true;
    }

    // Helpful guidance if tapping wrong table while carrying, or tapping a 'ready' table before picking up
    if (hand && hand.tableId !== tableId) {
      const targetNum = this.tableById(hand.tableId)?.tableNum ?? 1;
      this.ev.onPopup(table.pos.clone().add(new THREE.Vector3(0, 0.45, 0)), `请送往 ${targetNum} 号桌`, 'warn');
      return false;
    }
    if (!hand && guest.orderState === 'ready') {
      this.ev.onPopup(this.passStation.pos.clone().add(new THREE.Vector3(0, 0.55, 0)), '先点出菜窗口取菜', 'ok');
      return false;
    }
    return false;
  }

  // ---------------- HUD Snapshot ----------------

  orderCardStates(): OrderCardState[] {
    const out: OrderCardState[] = [];
    const paused = this.passPaused;

    for (const c of this.customers) {
      if (c.phase !== 'seated' && c.phase !== 'eating' && c.phase !== 'burnt') continue;
      const tb = this.tableById(c.table);
      const tableNum = tb?.tableNum ?? 1;
      const grill = tb?.grill;

      let cookWindow: CookWindow = 'none';
      let cookT = 0;
      let cookPct = 0;
      let rawLocked = false;
      let disabled = true;
      let statusText = '';
      let btnText = '';

      const prepT = Number(Math.min(COOK.prepTime, c.prepT).toFixed(3));
      const prepPct = Number(Math.min(100, Math.max(0, (c.prepT / COOK.prepTime) * 100)).toFixed(2));

      switch (c.orderState) {
        case 'ordering': {
          const rem = Math.max(1, Math.ceil(COOK.prepTime - (c.prepT + COOK_EPS)));
          statusText = paused ? '窗口满 · 暂停备菜' : `后台备菜 · ${rem}s`;
          btnText = paused ? '等取菜' : '备菜中';
          disabled = true;
          break;
        }
        case 'ready': {
          statusText = '已出窗 · 去窗口取';
          btnText = '在窗口';
          disabled = true;
          break;
        }
        case 'carrying': {
          statusText = '已端在手 · 可上桌';
          btnText = '上桌烤';
          disabled = false;
          break;
        }
        case 'grilling':
        case 'serving': {
          const rawT = grill?.active ? grill.grillT : 0;
          const win = cookWindowFor(rawT);
          cookWindow = win;
          cookT = Number(rawT.toFixed(4));
          cookPct = Number(Math.min(100, Math.max(0, (rawT / COOK.grillTotal) * 100)).toFixed(2));
          rawLocked = win === 'raw' && rawT + COOK_EPS < COOK.rawLockSec;
          if (win === 'raw') {
            const rem = Math.max(1, Math.ceil(COOK.perfectStart - (rawT + COOK_EPS)));
            statusText = `桌边烤 · 离熟 ${rem}s`;
            btnText = rawLocked ? '铺肉中' : '烤制中';
            disabled = false;
          } else if (win === 'perfect') {
            const rem = Math.max(1, Math.ceil(COOK.perfectEnd - (rawT + COOK_EPS)));
            statusText = `火候正好 · ${rem}s`;
            btnText = '盛盘';
            disabled = false;
          } else if (win === 'over') {
            statusText = '快焦了 · 立刻起';
            btnText = '快盛盘';
            disabled = false;
          } else {
            statusText = `烤焦作废 · 满意度-${ECON.penaltyBurn}`;
            btnText = '已作废';
            disabled = true;
          }
          break;
        }
        case 'done': {
          statusText = '已盛盘 · 用餐中';
          btnText = '用餐中';
          disabled = true;
          break;
        }
        case 'burnt': {
          cookWindow = 'burnt';
          cookT = COOK.burnTime;
          cookPct = 100;
          statusText = `烤焦作废 · 满意度-${ECON.penaltyBurn}`;
          btnText = '已作废';
          disabled = true;
          break;
        }
      }

      out.push({
        tableId: c.table,
        tableNum,
        customerId: c.id,
        dish: c.dish,
        orderState: c.orderState,
        cookWindow,
        patience: c.patience,
        patienceMax: c.patienceMax,
        prepT,
        prepPct,
        cookT,
        cookPct,
        passPaused: paused && c.orderState === 'ordering',
        rawLocked,
        disabled,
        statusText,
        btnText,
        clicksUsed: c.clicksUsed,
      });
    }

    out.sort((a, b) => a.tableNum - b.tableNum || a.customerId - b.customerId);
    return out;
  }

  // ---------------- per-frame simulation ----------------

  update(dt: number, debugMove?: THREE.Vector2): void {
    this.highlighter.update(dt);
    if (this.phase !== 'playing') {
      this.highlighter.hide();
      return;
    }

    // Level timer
    this.timeLeft -= dt;
    this.ev.onTimeLeft(this.timeLeft);
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endLevel();
      return;
    }

    // Player auto-navigation (no joystick; keyboard WASD only for optional desktop debug)
    if (debugMove && debugMove.lengthSq() > 0.0001) {
      this.player.cancelNav();
      this.player.move(debugMove, dt);
    } else {
      this.player.stepAutoNav(dt);
    }
    this.player.update(dt);

    // Subtle world highlight on next target (Pass window or active target Table)
    const hint = this.hint;
    if (hint?.kind === 'pass') {
      this.highlighter.show(this.passStation.pos, 2.8);
    } else if (hint?.kind === 'table') {
      const tb = this.tableById(hint.id);
      if (tb) this.highlighter.show(tb.pos, 1.35);
      else this.highlighter.hide();
    } else {
      this.highlighter.hide();
    }

    let stateChanged = false;

    // 1) Background NPC automatic prep (pauses when Pass window has 3 dishes)
    if (!this.passPaused) {
      const ordering = this.customers
        .filter((c) => c.phase === 'seated' && c.orderState === 'ordering')
        .sort((a, b) => a.id - b.id);
      for (const c of ordering) {
        if (this.passPaused) break;
        c.prepT += dt;
        if (c.prepT + COOK_EPS >= COOK.prepTime) {
          c.prepT = COOK.prepTime;
          if (this.pushToPass(c)) stateChanged = true;
        }
      }
    }

    // 2) Per-table built-in grills
    for (const tb of this.tables) {
      const g = tb.grill;
      if (!g.active || !g.item) continue;
      g.grillT += dt;
      g.item.grillT = g.grillT;
      const win = cookWindowFor(g.grillT);
      const prevWin = g.cookWindow;
      g.cookWindow = win;

      if (win === 'burnt') {
        if (this.triggerTableBurn(tb)) stateChanged = true;
      } else if (win === 'perfect' || win === 'over') {
        const guest = this.customers.find((c) => c.id === g.customerId && c.phase === 'seated');
        if (guest && guest.orderState !== 'serving') {
          guest.orderState = 'serving';
          stateChanged = true;
        } else if (prevWin !== win) {
          stateChanged = true;
        }
      }
    }
    this.grillFX.update(dt, this.tables);

    // 3) Customers (walking-in, seated, eating, burnt linger, leaving)
    for (const c of [...this.customers]) {
      const table = this.tableById(c.table)!;
      const was = c.phase;
      updateCustomer(c, dt, {
        doorPos: this.doorPos,
        tablePos: table.pos,
        scene: this.scene,
        onLongWait: (cc) => {
          this.applySatisfactionDelta(-ECON.penaltyLongWait, cc, -ECON.guestPenaltyLongWait);
          if (cc.phase === 'seated') {
            this.ev.onPopup(cc.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0)), `久等了 · 满意度-${ECON.penaltyLongWait}`, 'warn');
          }
          stateChanged = true;
        },
        onLeaveTable: (cc) => {
          this.releaseTableForCustomer(cc);
          stateChanged = true;
        },
        onAngry: (cc) => {
          // Clean up any dish in Pass, player hand, or tabletop grill so no softlock occurs
          this.cleanupCustomerItems(cc);
          this.angry += 1;
          this.applySatisfactionDelta(-ECON.penaltyTimeout);
          this.ev.onPopup(cc.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0)), `久等离店 · 满意度-${ECON.penaltyTimeout}`, 'warn');
          stateChanged = true;
        },
        onGone: (cc) => {
          this.cleanupCustomerItems(cc);
          this.releaseTableForCustomer(cc);
          const i = this.customers.indexOf(cc);
          if (i >= 0) this.customers.splice(i, 1);
          stateChanged = true;
        },
      });
      if (was !== c.phase) stateChanged = true;
    }

    // 4) Table cleaning countdown (2.0s)
    for (const t of this.tables) {
      if (t.cooldown > 0) {
        t.cooldown = Math.max(0, t.cooldown - dt);
        if (t.cooldown === 0) stateChanged = true;
      }
    }

    this.hudSyncT += dt;
    if (stateChanged || this.hudSyncT >= 0.12) {
      this.hudSyncT = 0;
      this.ev.onSync();
    }

    this.trySpawn(dt);
  }
}
