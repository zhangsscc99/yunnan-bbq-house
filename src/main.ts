// Bootstrap: renderer + scene + world + game + UI, one rAF loop.
// Test hooks: window.__frames / __perf / __game / __test (see TECH-STACK §4).

import * as THREE from 'three';
import { createRenderer, createScene } from './core/renderer.ts';
import { CameraRig } from './core/cameraRig.ts';
import { buildLighting } from './core/lighting.ts';
import { Input } from './core/input.ts';
import { buildKitchen } from './world/kitchen.ts';
import { buildDining } from './world/dining.ts';
import { buildProps } from './world/props.ts';
import { mergeStatic } from './core/merge.ts';
import { Flow } from './game/flow.ts';
import type { Interaction } from './game/stations.ts';
import type { GamePhase } from './game/types.ts';
import type { Results } from './game/flow.ts';
import { Hud } from './ui/hud.ts';
import { Controls } from './ui/controls.ts';
import { Panels } from './ui/panels.ts';
import { COOK } from './config.ts';
import { spawnCustomer } from './game/customers.ts';

console.info('[bbq] build', __BUILD__);
(window as any).__build = __BUILD__;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;

const renderer = createRenderer(canvas);
const scene = createScene();
const rig = new CameraRig();
const input = new Input();
input.attach();

// ---- world ----
const kitchen = buildKitchen();
const dining = buildDining();
const props = buildProps();
mergeStatic(kitchen.group);
mergeStatic(dining.group);
mergeStatic(props.group);
scene.add(kitchen.group);
scene.add(dining.group);
scene.add(props.group);

const lights = buildLighting(renderer, scene, kitchen.grillLightPos, props.pendantPos);

// ---- UI ----
const hud = new Hud(uiRoot, rig.cam);
const controls = new Controls(uiRoot, input);
const panels = new Panels(uiRoot);

// ---- game ----
let currentAction: Interaction = { action: 'none', label: '', icon: 'none', glyph: '' };

const flow = new Flow(scene, kitchen.stations, dining.tables, kitchen.grillSlots, dining.doorPos, {
  onPhase(phase: GamePhase) {
    controls.setVisible(phase === 'playing');
    if (phase === 'playing') panels.hide();
  },
  onMoney(m: number) { hud.setMoney(m); },
  onTimeLeft(s: number) {
    hud.setTime(s);
    // live stars preview: lose a star per angry guest / heavy waste
    const live = flow.angry === 0 && flow.waste <= 1 ? 3 : flow.angry <= 1 ? 2 : 1;
    hud.setStars(live);
  },
  onOrders(customers) { hud.setOrders(customers); },
  onPopup(pos, text, kind) { hud.popup(pos, text, kind); },
  onAction(a: Interaction) { currentAction = a; },
  onGuide(text: string) { hud.showGuide(text); },
  onResults(r: Results) { panels.showResults(r, restart, nextLevel); },
});
flow.placePlayer();
const chopBoard = kitchen.stations.find((st) => st.id === 'chop')!;

function restart(): void {
  hud.setLevel(flow.level, flow.cfg.target);
  flow.startLevel();
  rig.snapTo(flow.player.obj.position);
}

function nextLevel(): void {
  flow.nextLevel();
  if (flow.phase !== 'playing') return;
  hud.setLevel(flow.level, flow.cfg.target);
  rig.snapTo(flow.player.obj.position);
}

hud.setLevel(flow.level, flow.cfg.target);
panels.showStart(flow.cfg.target, flow.cfg.duration, restart, flow.level);

// ---- resize ----
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rig.resize(window.innerWidth, window.innerHeight);
});

// ---- loop ----
const clock = new THREE.Clock();
let frames = 0;
let emberPulse = 0;

const STEP = 1 / 60;
const MAX_FRAME = 1.5;
const MAX_STEPS = 90;
let acc = 0;
let pendingAction = 0;

/** one frame: rawDt = real wall-clock seconds. Simulation runs on a fixed-step accumulator so game time follows the wall clock at any fps. */
function step(rawDt: number, draw = true, move?: THREE.Vector2): void {
  let mv = move;
  if (!mv) { input.update(); mv = input.move; }
  acc += Math.min(rawDt, MAX_FRAME);
  let n = 0;
  pendingAction = Math.min(input.peekAction(), 4);
  while (acc >= STEP && n < MAX_STEPS) {
    let pressed = false;
    if (n === 0 && pendingAction > 0) {
      pressed = input.consumeAction();
      pendingAction = 0;
    }
    flow.update(STEP, mv, pressed);
    acc -= STEP;
    n += 1;
  }
  if (acc > STEP) acc = STEP;

  if (!draw) return;

  const t = clock.elapsedTime;
  frames += 1;
  const visDt = Math.min(rawDt, 0.1);
  rig.follow(flow.player.obj.position);
  rig.update(visDt);
  lights.update(t);

  // charcoal bed breathes with the flicker
  emberPulse = 3.0 + 0.45 * Math.sin(t * 7.3) + 0.15 * Math.sin(t * 17.1);
  kitchen.emberMat.emissiveIntensity = emberPulse;

  // action button semantics
  const enabled = currentAction.action !== 'none';
  controls.setAction(currentAction.icon, currentAction.label, enabled, flow.denyActive(), !!currentAction.guide);

  // world-anchored bubbles
  if (flow.phase === 'playing') hud.updateBubbles(flow.customers);
  hud.updateGrill(flow.grill.slots);
  hud.updateChop(chopBoard, COOK.chopTaps);

  renderer.render(scene, rig.cam);
}

renderer.setAnimationLoop(() => step(clock.getDelta()));

// ---- test / perf hooks ----
interface TestHooks {
  teleport(x: number, z: number): void;
  teleportToStation(id: string): void;
  teleportToTable(id: string): void;
  pauseSpawns(v: boolean): void;
  spawnNow(dish?: string): boolean;
  setPatience(sec: number): void;
  press(): void;
  start(): void;
  tick(dt?: number, n?: number, mx?: number, mz?: number): void;
  state(): Record<string, unknown>;
}
const ZERO_MOVE = new THREE.Vector2(0, 0);
const hooks: TestHooks = {
  teleport(x, z) {
    flow.player.obj.position.set(x, 0, z);
    rig.snapTo(flow.player.obj.position);
  },
  teleportToStation(id) {
    const s = kitchen.stations.find((st) => st.id === id);
    if (s) hooks.teleport(s.usePos.x, s.usePos.z);
  },
  teleportToTable(id) {
    const t = dining.tables.find((tb) => tb.id === id);
    if (t) hooks.teleport(t.usePos.x, t.usePos.z);
  },
  pauseSpawns(v: boolean) {
    flow.spawnsPaused = v;
  },
  spawnNow(dish) {
    const free = dining.tables.filter((tb) => !tb.guest && tb.cooldown <= 0);
    if (!free.length) return false;
    const c = spawnCustomer(scene, free[0], dining.doorPos, dish as never);
    (flow as unknown as { customers: unknown[] }).customers.push(c);
    return true;
  },
  setPatience(sec) {
    for (const c of flow.customers) {
      if (c.phase === 'seated') c.patience = sec;
    }
  },
  press() { input.pressAction(); },
  start() { restart(); },
  // step the simulation synchronously: n frames, each with rawDt = dt (no render).
  // A queued action press fires on the first frame.
  tick(dt = 0.05, n = 1, mx = 0, mz = 0) {
    const mv = mx || mz ? new THREE.Vector2(mx, mz) : ZERO_MOVE;
    for (let i = 0; i < n; i++) step(dt, false, mv);
    hud.updateGrill(flow.grill.slots);
    hud.updateChop(chopBoard, COOK.chopTaps);
  },
  state() {
    const g = (s: string): unknown => {
      const st = kitchen.stations.find((x) => x.id === s);
      return st ? { held: st.held?.stage ?? null, chopLeft: st.chopLeft } : null;
    };
    return {
      phase: flow.phase,
      level: flow.level,
      levelTarget: flow.cfg.target,
      money: flow.money,
      timeLeft: flow.timeLeft,
      served: flow.served,
      angry: flow.angry,
      waste: flow.waste,
      hint: ((h) => h ? { kind: h.kind, id: h.id, x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2) } : null)(flow.hint),
      carrying: flow.player.carrying
        ? { dish: flow.player.carrying.dish, stage: flow.player.carrying.stage }
        : null,
      action: currentAction.action,
      actionLabel: currentAction.label,
      player: { x: flow.player.obj.position.x, z: flow.player.obj.position.z },
      stations: Object.fromEntries(kitchen.stations.map((st) => [st.id, { x: st.usePos.x, z: st.usePos.z }])),
      tables: Object.fromEntries(dining.tables.map((tb) => [tb.id, { x: tb.usePos.x, z: tb.usePos.z }])),
      customers: flow.customers.map((c) => ({
        id: c.id, dish: c.dish, phase: c.phase,
        patience: c.patience, table: c.table,
        x: +c.obj.position.x.toFixed(2), z: +c.obj.position.z.toFixed(2),
      })),
      grill: (flow as unknown as { grill: { slots: { item: { stage: string; grillT: number } | null }[] } })
        .grill.slots.map((s) => s.item ? { stage: s.item.stage, t: s.item.grillT } : null),
      chop: g('chop'),
      calls: renderer.info.render.calls,
      tris: renderer.info.render.triangles,
    };
  },
};

(window as unknown as Record<string, unknown>).__frames = 0;
(window as unknown as Record<string, unknown>).__perf = { calls: 0, tris: 0 };
(window as unknown as Record<string, unknown>).__game = flow;
(window as unknown as Record<string, unknown>).__test = hooks;

setInterval(() => {
  (window as unknown as Record<string, unknown>).__frames = frames;
  (window as unknown as Record<string, unknown>).__perf = {
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles,
    programs: renderer.info.programs?.length ?? 0,
  };
}, 250);
