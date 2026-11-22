// Game orchestration: owns the phase machine, timer, money, customers,
// station interactions and scoring. One update(dt) drives everything —
// no setTimeout anywhere (see TECH-STACK boundaries).

import * as THREE from 'three';
import { COOK, DISHES, LEVELS, PLAYER, SAVE_KEYS } from '../config.ts';
import type { DishId, Level } from '../config.ts';
import type { StationRuntime, Customer, Item, GamePhase, CookWindow } from './types.ts';
import { createItem, setItemStage } from './items.ts';
import { resolveInteraction, Highlighter, setFootprint, nextTarget, registerNavPoints } from './stations.ts';
import type { Interaction, NextTarget } from './stations.ts';
import { NextMarker } from './nextMarker.ts';
import { Grill } from './grill.ts';
import { Player } from './player.ts';
import { disposeTree } from '../core/dispose.ts';
import { spawnCustomer, updateCustomer } from './customers.ts';
import type { TableRuntime } from '../world/dining.ts';
import { STATIONS, PLAYER_SPAWN, cellToWorld } from '../world/layout.ts';
import { calcStars } from './stars.ts';
import type { StarRating } from './stars.ts';

export interface FlowEvents {
  onPhase(phase: GamePhase): void;
  onMoney(money: number): void;
  onTimeLeft(sec: number): void;
  onOrders(customers: Customer[], tables: TableRuntime[]): void;
  onPopup(worldPos: THREE.Vector3, text: string, kind: 'money' | 'warn' | 'ok'): void;
  onAction(action: Interaction): void;      // current button semantics
  onGuide(text: string): void;              // action pressed with nothing in reach
  onResults(r: Results): void;
}

export interface Results {
  stars: StarRating;
  money: number;
  target: number;
  served: number;
  angry: number;
  waste: number;
  pass: boolean;
  level: number;
  hasNext: boolean;
}

export const COOK_EPS = 1e-6;

export function cookWindowFor(t: number): 'raw' | 'perfect' | 'over' | 'burnt' {
  if (t + COOK_EPS >= COOK.burnTime) return 'burnt';
  if (t + COOK_EPS >= COOK.overStart) return 'over';
  if (t + COOK_EPS >= COOK.perfectStart) return 'perfect';
  return 'raw';
}

export interface OrderCardState {
  tableId: string;
  customerId: number;
  dish: DishId;
  phase: 'seated' | 'eating' | 'burnt';
  patience: number;
  patienceMax: number;
  cookWindow: CookWindow;
  cookT: number;
  progressPct: number;
  disabled: boolean;
  label: string;
  statusText: string;
  slotIndex: number;
}

interface BurntCardEntry {
  tableId: string;
  customerId: number;
  dish: DishId;
  cookT: number;
  lingerLeft: number;
}

function savedLevel(): number {
  const n = Math.floor(Number(localStorage.getItem(SAVE_KEYS.level) || 1));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, LEVELS.length) : 1;
}

export class Flow {
  phase: GamePhase = 'menu';
  money = 0;
  level = savedLevel();
  cfg: Level = LEVELS[this.level - 1];
  timeLeft = this.cfg.duration;
  served = 0;
  angry = 0;
  waste = 0;

  readonly player = new Player();
  readonly customers: Customer[] = [];
  readonly grill: Grill;
  private stations: StationRuntime[];
  private tables: TableRuntime[];
  private doorPos: THREE.Vector3;
  private scene: THREE.Scene;
  private ev: FlowEvents;
  private highlighter: Highlighter;
  private cuts: THREE.Mesh[] = [];
  private marker: NextMarker;
  private spawnT = 2.5;                  // first guest soon after open
  private ordersT = 0;                  // throttle for periodic onOrders refresh
  private chopFlash = 0;
  private denyT = 0;
  private burntCards = new Map<string, BurntCardEntry>();
  current: Interaction = { action: 'none', label: '', icon: 'none', glyph: '' };

  constructor(
    scene: THREE.Scene,
    stations: StationRuntime[],
    tables: TableRuntime[],
    grillSlots: THREE.Vector3[],
    doorPos: THREE.Vector3,
    ev: FlowEvents,
  ) {
    this.scene = scene;
    this.stations = stations;
    this.tables = tables;
    this.doorPos = doorPos;
    this.ev = ev;
    this.grill = new Grill(grillSlots);
    this.grill.attachTo(scene);
    this.highlighter = new Highlighter(scene);
    this.marker = new NextMarker(scene);
    registerNavPoints(stations, tables);
    const chop = stations.find((st) => st.id === 'chop')!;
    const cutGeo = new THREE.PlaneGeometry(0.012, 0.34);
    const cutMat = new THREE.MeshBasicMaterial({ color: 0x2a1a10 });
    for (let i = 0; i < COOK.chopTaps; i++) {
      const m = new THREE.Mesh(cutGeo, cutMat);
      m.rotation.set(-Math.PI / 2, 0, 0.12);
      m.position.set(chop.pos.x - 0.4 + (i - 1) * 0.13, chop.topY + 0.032, chop.pos.z);
      m.visible = false;
      scene.add(m);
      this.cuts.push(m);
    }
    // register station footprints for range checks
    for (const def of STATIONS) {
      const xs = def.cells.map((c) => c[0]);
      const zs = def.cells.map((c) => c[1]);
      setFootprint(
        def.id,
        Math.min(...xs) - 6 + 0.0,   // cellToWorld(x,·) of the left edge
        Math.max(...xs) - 6 + 1.0,
        Math.min(...zs) - 4.5 + 0.0,
        Math.max(...zs) - 4.5 + 1.0,
      );
    }
  }

  placePlayer(): void {
    this.spawnPlayer();
    this.scene.add(this.player.obj);
  }

  private spawnPlayer(): void {
    const s = cellToWorld(PLAYER_SPAWN[0], PLAYER_SPAWN[1]);
    this.player.obj.position.set(s.x, 0, s.z);
    this.player.obj.rotation.y = 0;   // face +z: the crate row
  }

  /** where the player should head next; null outside the playing phase */
  get hint(): NextTarget | null {
    return this.phase === 'playing'
      ? nextTarget(this.player.carrying, this.grill, this.tables, this.customers)
      : null;
  }

  get stationById(): Map<string, StationRuntime> {
    return new Map(this.stations.map((s) => [s.id, s]));
  }

  // ---------------- phase control ----------------

  startLevel(): void {
    this.phase = 'playing';
    this.money = 0;
    this.timeLeft = this.cfg.duration;
    this.served = 0;
    this.angry = 0;
    this.waste = 0;
    this.spawnT = 2.0;
    this.ordersT = 0;
    this.burntCards.clear();
    // clear leftovers
    for (const c of this.customers) { this.scene.remove(c.obj); disposeTree(c.obj); }
    this.customers.length = 0;
    for (const t of this.tables) { t.guest = null; t.cooldown = 0; }
    this.grill.reset();
    if (this.player.carrying) this.player.setCarrying(null);
    for (const s of this.stations) {
      if (s.held) { this.scene.remove(s.held.obj); s.held = null; }
      s.chopLeft = 0;
    }
    this.cuts.forEach((m) => { m.visible = false; });
    this.spawnPlayer();
    this.ev.onPhase('playing');
    this.ev.onMoney(0);
    this.ev.onTimeLeft(this.timeLeft);
    this.ev.onOrders(this.customers, this.tables);
  }

  starsNow(): StarRating {
    return calcStars({
      money: this.money,
      target: this.cfg.target,
      served: this.served,
      angry: this.angry,
      waste: this.waste,
    });
  }

  /** advance only after a passed level that has a successor; otherwise no-op */
  nextLevel(): void {
    if (this.phase !== 'results' || this.money < this.cfg.target || this.level >= LEVELS.length) return;
    this.level += 1;
    this.cfg = LEVELS[this.level - 1];
    localStorage.setItem(SAVE_KEYS.level, String(this.level));
    this.startLevel();
  }

  endLevel(): void {
    const stars = this.starsNow();
    const res: Results = {
      stars, money: this.money, target: this.cfg.target,
      served: this.served, angry: this.angry, waste: this.waste,
      pass: this.money >= this.cfg.target,
      level: this.level,
      hasNext: this.level < LEVELS.length,
    };
    this.phase = 'results';
    this.burntCards.clear();
    const best = Number(localStorage.getItem(SAVE_KEYS.best) ?? '0');
    if (this.money > best) localStorage.setItem(SAVE_KEYS.best, String(this.money));
    this.ev.onPhase('results');
    this.ev.onResults(res);
  }

  // ---------------- customer plumbing ----------------

  private freeTables(): TableRuntime[] {
    return this.tables.filter((t) => !t.guest && t.cooldown <= 0);
  }

  private seatedCount(): number {
    return this.customers.filter(
      (c) => c.phase === 'seated' || c.phase === 'walking-in' || c.phase === 'eating',
    ).length;
  }

  spawnsPaused = false;                  // e2e hook: deterministic guests

  private trySpawn(dt: number): void {
    if (this.spawnsPaused) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const free = this.freeTables();
    if (free.length && this.seatedCount() < this.cfg.maxDiners) {
      const t = free[Math.floor(Math.random() * free.length)];
      this.customers.push(spawnCustomer(this.scene, t, this.doorPos));
      const [a, b] = this.cfg.spawnEvery;
      this.spawnT = a + Math.random() * (b - a);
      this.ev.onOrders(this.customers, this.tables);
    } else {
      this.spawnT = 3; // poll again soon
    }
  }

  // ---------------- actions ----------------

  private station(id: string): StationRuntime {
    return this.stations.find((s) => s.id === id)!;
  }

  private act(it: Interaction): void {
    const p = this.player;
    switch (it.action) {
      case 'take-raw': {
        const item = createItem(it.station!.dish!, 'raw');
        p.setCarrying(item);
        break;
      }
      case 'chop': {
        const s = it.station!;
        if (!p.carrying && s.held && s.chopLeft > 0) {
          // a chop tap
          s.chopLeft -= 1;
          this.chopFlash = 0.22;
          const k = s.held;
          k.obj.position.y = s.topY + 0.06;
          if (s.chopLeft === 0) setItemStage(k, 'chopped');
        } else if (!p.carrying && s.held && s.chopLeft <= 0) {
          // pick the chopped skewer back up
          const item = s.held;
          s.held = null;
          this.scene.remove(item.obj);
          p.setCarrying(item);
        } else if (p.carrying?.stage === 'raw' && !s.held) {
          // place raw skewer on the board
          const item = p.carrying;
          p.setCarrying(null);
          s.held = item;
          s.chopLeft = COOK.chopTaps;
          item.obj.position.set(s.pos.x - 0.4, s.topY + 0.04, s.pos.z);
          item.obj.rotation.set(0, 0.2, 0);
          this.scene.add(item.obj);
        }
        break;
      }
      case 'put-grill': {
        const slot = this.grill.freeSlot();
        if (slot && p.carrying) {
          const item = p.carrying;
          p.setCarrying(null);
          item.grillT = 0;
          this.grill.place(slot, item);
        }
        break;
      }
      case 'take-grill': {
        const slot = this.grill.readySlot();
        if (slot && !p.carrying) {
          const item = this.grill.take(slot);
          if (item.stage === 'waste') {
            // burnt — straight to hand as waste, count it when binned
          }
          p.setCarrying(item);
        }
        break;
      }
      case 'plate': {
        if (p.carrying) setItemStage(p.carrying, 'plated');
        break;
      }
      case 'serve': {
        const t = it.table!;
        const guest = this.customers.find((c) => c.table === t.id && c.phase === 'seated' && !c.paid);
        if (guest && p.carrying) {
          const dish = p.carrying;
          p.setCarrying(null);
          this.settleServe(guest, t, dish, 1);
        }
        break;
      }
      case 'discard': {
        if (p.carrying) {
          const countsWaste = p.carrying.stage === 'waste' || p.carrying.stage === 'plated';
          disposeTree(p.carrying.obj);
          p.setCarrying(null);
          if (countsWaste) this.waste += 1;
          this.ev.onPopup(it.station!.pos.clone(), '丢弃', 'warn');
        }
        break;
      }
      case 'none':
        if (it.guide) this.ev.onGuide(it.label);
        else this.denyT = 0.25;
        break;
    }
  }

  // ---------------- shared settlement & one-click order cycle ----------------

  private releaseGuestGrillSlot(customerId: number): boolean {
    const slot = this.grill.slots.find((s) => s.item?.orderCustomerId === customerId);
    if (!slot) return false;
    const item = this.grill.take(slot);
    disposeTree(item.obj);
    return true;
  }

  /** Shared payment & serving logic used by both one-click order cards and the legacy carry-to-table chain. */
  private settleServe(guest: Customer, table: TableRuntime, dish: Item, tipMult = 1): boolean {
    if (guest.phase !== 'seated' || guest.paid) return false;
    guest.paid = true;
    this.releaseGuestGrillSlot(guest.id);
    this.burntCards.delete(guest.table);

    // plate lands on the table, guest eats
    dish.obj.position.set(table.pos.x - 0.15, table.pos.y + 0.03, table.pos.z + 0.1);
    this.scene.add(dish.obj);
    guest.phase = 'eating';
    guest.eatT = 3;
    (guest as unknown as { _plate?: THREE.Object3D })._plate = dish.obj;

    // pay: price + tip scaled by patience (GAME-DESIGN §2: >=0.8 earns full tip; over window scales tip by 0.5)
    const rawFrac = guest.patienceMax > 0
      ? Math.max(0, Math.min(1, guest.patience / guest.patienceMax))
      : 1;
    const patienceFactor = rawFrac >= COOK.fullTipPatience ? 1 : rawFrac;
    const tip = Math.round(DISHES[guest.dish].price * COOK.tipRate * patienceFactor * tipMult);
    const total = DISHES[guest.dish].price + tip;
    this.money += total;
    this.served += 1;
    this.ev.onMoney(this.money);
    this.ev.onPopup(table.pos.clone(), `+¥${total}`, 'money');
    this.ev.onOrders(this.customers, this.tables);
    return true;
  }

  private triggerAutoBurn(slotIndex: number): void {
    const slot = this.grill.slots[slotIndex];
    if (!slot?.item || slot.item.orderCustomerId == null) return;
    const customerId = slot.item.orderCustomerId;
    const item = this.grill.take(slot);
    const cookT = item.grillT;
    const dish = item.dish;
    const tableId = item.orderTableId ?? '';
    disposeTree(item.obj);

    this.waste += 1;
    const guest = this.customers.find((c) => c.id === customerId && c.phase === 'seated');
    if (guest) {
      guest.phase = 'leaving-angry';
      guest.obj.position.y = 0;
      this.angry += 1;
      const table = this.tables.find((t) => t.id === guest.table);
      const popPos = table
        ? table.pos.clone().add(new THREE.Vector3(0, 0.5, 0))
        : guest.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.ev.onPopup(popPos, '焦糊了', 'warn');
      this.burntCards.set(guest.table, {
        tableId: guest.table,
        customerId: guest.id,
        dish: guest.dish,
        cookT,
        lingerLeft: COOK.burntLinger,
      });
    } else if (tableId) {
      this.burntCards.set(tableId, {
        tableId,
        customerId,
        dish,
        cookT,
        lingerLeft: COOK.burntLinger,
      });
    }
    this.ev.onOrders(this.customers, this.tables);
  }

  /** One-click order card primary button: click 1 puts raw skewer on free grill slot; click 2 lifts & resolves by window. */
  handleOrderCardAction(tableId: string): boolean {
    if (this.phase !== 'playing') return false;
    const guest = this.customers.find((c) => c.table === tableId && c.phase === 'seated' && !c.paid);
    if (!guest) return false;
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) return false;

    const slotIndex = this.grill.slots.findIndex((s) => s.item?.orderCustomerId === guest.id);
    if (slotIndex < 0) {
      const slot = this.grill.freeSlot();
      if (!slot) return false;
      const item = createItem(guest.dish, 'raw');
      item.grillT = 0;
      item.orderCustomerId = guest.id;
      item.orderTableId = guest.table;
      this.grill.place(slot, item);
      this.burntCards.delete(tableId);
      this.ev.onOrders(this.customers, this.tables);
      return true;
    }

    const slot = this.grill.slots[slotIndex];
    const item = slot.item!;
    const win = cookWindowFor(item.grillT);
    if (win === 'raw') {
      const rawItem = this.grill.take(slot);
      disposeTree(rawItem.obj);
      this.ev.onPopup(table.pos.clone(), '夹生 · 重烤', 'warn');
      this.ev.onOrders(this.customers, this.tables);
      return true;
    }
    if (win === 'burnt') {
      this.triggerAutoBurn(slotIndex);
      return true;
    }
    const tipMult = win === 'over' ? COOK.overTipMult : 1;
    const lifted = this.grill.take(slot);
    lifted.obj.position.set(0, 0, 0);
    setItemStage(lifted, 'plated');
    this.settleServe(guest, table, lifted, tipMult);
    return true;
  }

  /** Current per-card cooking/UI snapshot for all seated, eating, and briefly lingering burnt orders. */
  orderCardStates(): OrderCardState[] {
    const out: OrderCardState[] = [];
    const activeTables = new Set<string>();
    const grillFull = !this.grill.freeSlot();

    for (const c of this.customers) {
      if (c.phase !== 'seated' && c.phase !== 'eating') continue;
      activeTables.add(c.table);
      const price = DISHES[c.dish].price;
      if (c.phase === 'eating') {
        out.push({
          tableId: c.table,
          customerId: c.id,
          dish: c.dish,
          phase: 'eating',
          patience: c.patienceMax,
          patienceMax: c.patienceMax,
          cookWindow: 'eating',
          cookT: 0,
          progressPct: 0,
          disabled: true,
          label: '用餐中',
          statusText: `¥${price} · 用餐中`,
          slotIndex: -1,
        });
        continue;
      }

      const slotIndex = this.grill.slots.findIndex((s) => s.item?.orderCustomerId === c.id);
      if (slotIndex >= 0) {
        const rawT = this.grill.slots[slotIndex].item!.grillT;
        const win = cookWindowFor(rawT);
        const cookT = Number(rawT.toFixed(4));
        const progressPct = Number(Math.min(100, Math.max(0, (rawT / COOK.burnTime) * 100)).toFixed(4));
        let label: string;
        if (win === 'raw') {
          const rem = Math.max(1, Math.ceil(COOK.perfectStart - (rawT + COOK_EPS)));
          label = `生串 ${rem}s`;
        } else if (win === 'perfect') {
          const rem = Math.max(1, Math.ceil(COOK.overStart - (rawT + COOK_EPS)));
          label = `完美 ${rem}s`;
        } else if (win === 'over') {
          const rem = Math.max(1, Math.ceil(COOK.burnTime - (rawT + COOK_EPS)));
          label = `偏老 ${rem}s`;
        } else {
          label = '焦糊';
        }
        out.push({
          tableId: c.table,
          customerId: c.id,
          dish: c.dish,
          phase: 'seated',
          patience: c.patience,
          patienceMax: c.patienceMax,
          cookWindow: win,
          cookT,
          progressPct,
          disabled: win === 'burnt',
          label,
          statusText: `¥${price} · ${label}`,
          slotIndex,
        });
      } else {
        const label = grillFull ? '烤位满了' : '上炉';
        out.push({
          tableId: c.table,
          customerId: c.id,
          dish: c.dish,
          phase: 'seated',
          patience: c.patience,
          patienceMax: c.patienceMax,
          cookWindow: 'idle',
          cookT: 0,
          progressPct: 0,
          disabled: grillFull,
          label,
          statusText: grillFull ? `¥${price} · 烤位满了` : `¥${price} · 等待`,
          slotIndex: -1,
        });
      }
    }

    for (const entry of this.burntCards.values()) {
      if (activeTables.has(entry.tableId)) continue;
      const price = DISHES[entry.dish].price;
      out.push({
        tableId: entry.tableId,
        customerId: entry.customerId,
        dish: entry.dish,
        phase: 'burnt',
        patience: 0,
        patienceMax: 1,
        cookWindow: 'burnt',
        cookT: Number(entry.cookT.toFixed(4)),
        progressPct: 100,
        disabled: true,
        label: '焦糊',
        statusText: `¥${price} · 焦糊`,
        slotIndex: -1,
      });
    }

    return out;
  }

  get highlightState(): { visible: boolean; char: string; warn: boolean } {
    return this.highlighter.state;
  }

  syncHighlight(it: Interaction): void {
    if (it.station || it.table) {
      const anchor = it.station?.pos ?? it.table!.pos;
      const w = it.station?.id === 'grill' ? 3 : 1.1;
      this.highlighter.show(anchor, w, it.glyph, !!it.warn);
    } else {
      this.highlighter.hide();
    }
  }

  // ---------------- per-frame ----------------

  update(dt: number, move: THREE.Vector2, actionPressed: boolean): void {
    this.highlighter.update(dt);
    if (this.phase !== 'playing') {
      this.marker.set(null);
      return;
    }

    // timer
    this.timeLeft -= dt;
    this.ev.onTimeLeft(this.timeLeft);
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endLevel();
      return;
    }

    // player
    this.player.move(move, dt);
    this.player.update(dt);

    // interaction + highlight
    this.current = resolveInteraction(
      this.player.obj.position, this.player.carrying,
      this.stations, this.tables, this.customers, this.grill,
    );
    this.syncHighlight(this.current);
    this.marker.set(this.current.action === 'none' ? this.hint : null);
    this.marker.update(dt);
    this.ev.onAction(this.current);
    if (actionPressed) this.act(this.current);

    // chop board: item settles back after a tap
    if (this.chopFlash > 0) {
      this.chopFlash -= dt;
      if (this.chopFlash <= 0) {
        const s = this.station('chop');
        if (s.held) s.held.obj.position.y = s.topY + 0.04;
      }
    }
    if (this.denyT > 0) this.denyT -= dt;
    const board = this.station('chop');
    const done = board.held ? COOK.chopTaps - board.chopLeft : 0;
    this.cuts.forEach((m, i) => { m.visible = i < done; });

    // grill
    this.grill.update(dt);
    for (let i = 0; i < this.grill.slots.length; i++) {
      const it = this.grill.slots[i].item;
      if (it && it.orderCustomerId != null && it.grillT + COOK_EPS >= COOK.burnTime) {
        this.triggerAutoBurn(i);
      }
    }
    let burntChanged = false;
    for (const [tid, entry] of this.burntCards) {
      entry.cookT += dt;
      entry.lingerLeft -= dt;
      if (entry.lingerLeft <= 0) {
        this.burntCards.delete(tid);
        burntChanged = true;
      }
    }

    // customers
    let justSeated = false;
    for (const c of [...this.customers]) {
      const table = this.tables.find((t) => t.id === c.table)!;
      const was = c.phase;
      updateCustomer(c, dt, {
        doorPos: this.doorPos,
        tablePos: table.pos,
        scene: this.scene,
        onAngry: (cc) => {
          this.releaseGuestGrillSlot(cc.id);
          this.angry += 1;
          this.ev.onPopup(cc.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0)), '愤怒离店', 'warn');
          this.ev.onOrders(this.customers, this.tables);
        },
        onGone: (cc) => {
          table.guest = null;
          table.cooldown = this.cfg.tableCooldown;
          const plate = (cc as unknown as { _plate?: THREE.Object3D })._plate;
          if (plate) { this.scene.remove(plate); disposeTree(plate); }
          const i = this.customers.indexOf(cc);
          if (i >= 0) this.customers.splice(i, 1);
          this.ev.onOrders(this.customers, this.tables);
        },
      });
      if (was === 'walking-in' && c.phase === 'seated') {
        this.burntCards.delete(c.table);
        justSeated = true;
      }
    }
    for (const t of this.tables) if (t.cooldown > 0) t.cooldown -= dt;

    this.ordersT += dt;
    if (justSeated || burntChanged || this.ordersT >= 0.25) {
      this.ordersT = 0;
      this.ev.onOrders(this.customers, this.tables);
    }

    this.trySpawn(dt);
  }

  denyActive(): boolean {
    return this.denyT > 0;
  }
}
