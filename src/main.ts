// Bootstrap: renderer + scene + world + game + UI, one rAF loop.
// Test hooks: window.__frames / __perf / __game / __test (see TECH-STACK §4).

import * as THREE from 'three';
import { createRenderer, createScene } from './core/renderer.ts';
import { CameraRig } from './core/cameraRig.ts';
import { buildLighting } from './core/lighting.ts';
import { Input } from './core/input.ts';
import { buildKitchen, COUNTER_D } from './world/kitchen.ts';
import { STATIONS, TABLES } from './world/layout.ts';
import { buildDining } from './world/dining.ts';
import { buildProps } from './world/props.ts';
import { mergeStatic } from './core/merge.ts';
import { Flow } from './game/flow.ts';
import { resolveInteraction } from './game/stations.ts';
import type { Interaction } from './game/stations.ts';
import type { GamePhase } from './game/types.ts';
import type { Results } from './game/flow.ts';
import { Hud } from './ui/hud.ts';
import type { OffscreenTarget } from './ui/hud.ts';
import { Controls } from './ui/controls.ts';
import { Panels } from './ui/panels.ts';
import { COOK } from './config.ts';
import type { DishId } from './config.ts';
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
    hud.setStars(flow.starsNow());
  },
  onOrders(customers, tables) { hud.setOrders(customers, tables); },
  onPopup(pos, text, kind) { hud.popup(pos, text, kind); },
  onAction(a: Interaction) {
    currentAction = a;
    syncAction();
  },
  onGuide(text: string) { hud.showGuide(text); },
  onResults(r: Results) { panels.showResults(r, restart, nextLevel); },
});
flow.placePlayer();
const chopBoard = kitchen.stations.find((st) => st.id === 'chop')!;

function syncAction(): void {
  const enabled = currentAction.action !== 'none';
  controls.setAction(
    currentAction.icon,
    currentAction.label,
    enabled,
    flow.denyActive(),
    !!currentAction.guide,
  );
}

function refreshAction(): void {
  if (flow.phase !== 'playing') return;
  currentAction = resolveInteraction(
    flow.player.obj.position,
    flow.player.carrying,
    kitchen.stations,
    dining.tables,
    flow.customers,
    flow.grill,
  );
  flow.current = currentAction;
  syncAction();
}

// B-090: short on-screen names for the「去 X」target of the off-screen edge hint
const OFF_NAMES: Record<string, string> = { bin: '垃圾桶', crate: '料箱', chop: '切配台', grill: '烤炉', plate: '装盘台' };
const offTarget: OffscreenTarget = { label: '', pos: new THREE.Vector3() };
/** the current「去 X」target while the action key is in its direction state, else null */
function offscreenTarget(): OffscreenTarget | null {
  if (flow.phase !== 'playing' || currentAction.action !== 'none' || !currentAction.goto) return null;
  const h = flow.hint;
  if (!h) return null;
  if (h.kind === 'station') {
    const st = kitchen.stations.find((s) => s.id === h.id);
    if (!st) return null;
    offTarget.label = OFF_NAMES[st.kind] ?? st.label;
    offTarget.pos.set(st.pos.x, st.topY, st.pos.z);
  } else {
    const tb = dining.tables.find((t) => t.id === h.id);
    if (!tb) return null;
    offTarget.label = `${TABLES.findIndex((t) => t.id === h.id) + 1}号桌`;
    offTarget.pos.set(tb.pos.x, tb.pos.y, tb.pos.z);
  }
  return offTarget;
}

function restart(): void {
  hud.setLevel(flow.level, flow.cfg.target);
  flow.startLevel();
  rig.snapTo(flow.player.obj.position);
  refreshAction();
}

function nextLevel(): void {
  flow.nextLevel();
  if (flow.phase !== 'playing') return;
  hud.setLevel(flow.level, flow.cfg.target);
  rig.snapTo(flow.player.obj.position);
  refreshAction();
}

hud.setLevel(flow.level, flow.cfg.target);
panels.showStart(flow.cfg.target, flow.cfg.duration, restart, flow.level);

// ---- resize ----
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rig.resize(window.innerWidth, window.innerHeight);
  if (flow.phase === 'playing') hud.updateRings(flow.customers, dining.tables);
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
  if (n > 0 && flow.phase === 'playing') refreshAction();

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

  // action button semantics (same-frame DOM sync)
  syncAction();

  // world-anchored bubbles & table order rings
  if (flow.phase === 'playing') {
    hud.updateBubbles(flow.customers);
    hud.updateRings(flow.customers, dining.tables);
  }
  hud.updateGrill(flow.grill.slots);
  hud.updateChop(chopBoard, COOK.chopTaps);
  hud.updateOffscreen(offscreenTarget());

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
  moveCustomer(id: number, x: number, z: number): boolean;
  press(): void;
  start(): void;
  tick(dt?: number, n?: number, mx?: number, mz?: number): void;
  state(): Record<string, unknown>;
  worldToScreen(x: number, y: number, z: number): { x: number; y: number; z: number };
  stationGeom(): { id: string; kind: string; x: number; z: number; topY: number; w: number; d: number }[];
  camera(): ReturnType<CameraRig['info']>;
  guideTarget(): { label: string; x: number; y: number; z: number } | null;
  foodNodes(): { id: string; food: DishId; color: [number, number, number]; cover: number; sat: number }[];
  decorSat(): number;
}
function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function rgbSat(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
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
  moveCustomer(id, x, z) {
    const c = flow.customers.find((cc) => cc.id === id);
    if (!c) return false;
    c.obj.position.x = x;
    c.obj.position.z = z;
    return true;
  },
  press() { input.pressAction(); },
  start() { restart(); },
  // step the simulation synchronously: n frames, each with rawDt = dt (no render).
  // A queued action press fires on the first frame.
  tick(dt = 0.05, n = 1, mx = 0, mz = 0) {
    const mv = mx || mz ? new THREE.Vector2(mx, mz) : ZERO_MOVE;
    for (let i = 0; i < n; i++) step(dt, false, mv);
    syncAction();
    hud.updateGrill(flow.grill.slots);
    hud.updateChop(chopBoard, COOK.chopTaps);
    hud.updateOffscreen(offscreenTarget());
    if (flow.phase === 'playing') hud.updateRings(flow.customers, dining.tables);
  },
  // read-only: world point -> CSS px in the current viewport (same math as the HUD anchors)
  worldToScreen(x, y, z) {
    rig.cam.updateMatrixWorld();
    const v = new THREE.Vector3(x, y, z).project(rig.cam);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, z: v.z };
  },
  // read-only: counter footprint per station (centre x/z, top height, width along x, depth along z)
  stationGeom() {
    return kitchen.stations.map((st) => ({
      id: st.id, kind: st.kind, x: st.pos.x, z: st.pos.z, topY: st.topY,
      w: STATIONS.find((d) => d.id === st.id)?.cells.length ?? 1, d: COUNTER_D,
    }));
  },
  camera() { return rig.info(); },
  // read-only (B-090): the「去 X」target the off-screen edge hint points at, or null when not in that state
  guideTarget() {
    const t = offscreenTarget();
    return t ? { label: t.label, x: t.pos.x, y: t.pos.y, z: t.pos.z } : null;
  },
  // read-only (B-094): per-crate 3D food telemetry (id, food, primary sRGB [r,g,b], horizontal cover, HSV saturation)
  foodNodes() {
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    return kitchen.foodRoots.map((entry) => {
      entry.node.updateMatrixWorld(true);
      box.setFromObject(entry.node);
      box.getSize(size);
      let hex = 0;
      entry.node.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.userData.foodPrimary) return;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat?.color) hex = mat.color.getHex();
      });
      const color = hexToRgb(hex);
      return {
        id: entry.id,
        food: entry.node.userData.food as DishId,
        color,
        cover: Number(Math.min(1, size.x / entry.crateW).toFixed(4)),
        sat: Number(rgbSat(color[0], color[1], color[2]).toFixed(4)),
      };
    });
  },
  // read-only (B-094): mean HSV saturation of the left-wall decor shelf items
  decorSat() {
    const sats: number[] = [];
    props.decorGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.userData.decorItem) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat?.color) return;
      const [r, g, b] = hexToRgb(mat.color.getHex());
      sats.push(rgbSat(r, g, b));
    });
    if (!sats.length) return 0;
    return Number((sats.reduce((a, v) => a + v, 0) / sats.length).toFixed(4));
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
