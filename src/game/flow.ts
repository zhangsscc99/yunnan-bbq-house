// Game orchestration: owns the phase machine, timer, money, customers,
// station interactions and scoring. One update(dt) drives everything —
// no setTimeout anywhere (see TECH-STACK boundaries).

import * as THREE from 'three';
import { COOK, DISHES, LEVELS, PLAYER, SAVE_KEYS } from '../config.ts';
import type { DishId, Level } from '../config.ts';
import type { StationRuntime, Customer, Item, GamePhase } from './types.ts';
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
        const guest = this.customers.find((c) => c.table === t.id && c.phase === 'seated');
        if (guest && p.carrying) {
          // plate lands on the table, guest eats
          const dish = p.carrying;
          p.setCarrying(null);
          dish.obj.position.set(t.pos.x - 0.15, t.pos.y + 0.03, t.pos.z + 0.1);
          this.scene.add(dish.obj);
          guest.phase = 'eating';
          guest.eatT = 3;
          // pay: price + tip scaled by patience fraction
          const frac = guest.patience / guest.patienceMax;
          const tip = Math.round(DISHES[guest.dish].price * COOK.tipRate * frac);
          const total = DISHES[guest.dish].price + tip;
          this.money += total;
          this.served += 1;
          this.ev.onMoney(this.money);
          this.ev.onPopup(t.pos.clone(), `+¥${total}`, 'money');
          this.ev.onOrders(this.customers, this.tables);
          // the plate itself clears when the guest leaves (kept simple)
          const obj = dish.obj;
          const orig = guest;
          const detach = (): void => {
            this.scene.remove(obj);
          };
          // stash removal on the customer record via a tiny side-channel
          (orig as unknown as { _plate?: THREE.Object3D })._plate = obj;
          void detach;
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
      if (was === 'walking-in' && c.phase === 'seated') justSeated = true;
    }
    for (const t of this.tables) if (t.cooldown > 0) t.cooldown -= dt;

    this.ordersT += dt;
    if (justSeated || this.ordersT >= 0.25) {
      this.ordersT = 0;
      this.ev.onOrders(this.customers, this.tables);
    }

    this.trySpawn(dt);
  }

  denyActive(): boolean {
    return this.denyT > 0;
  }
}
