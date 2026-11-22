// Bootstrap (Gameplay v2): renderer + scene + world + Flow + Hud + Panels + canvas 3D grill/pass raycast.
// Test hooks: window.__frames / __perf / __game / __test.

import * as THREE from 'three';
import { createRenderer, createScene } from './core/renderer.ts';
import { CameraRig } from './core/cameraRig.ts';
import { buildLighting } from './core/lighting.ts';
import { Input } from './core/input.ts';
import { buildKitchen, COUNTER_D } from './world/kitchen.ts';
import { STATIONS } from './world/layout.ts';
import { buildDining } from './world/dining.ts';
import { buildProps } from './world/props.ts';
import { mergeStatic } from './core/merge.ts';
import { Flow } from './game/flow.ts';
import type { Results } from './game/flow.ts';
import type { GamePhase } from './game/types.ts';
import { Hud } from './ui/hud.ts';
import type { CardStateSnapshot } from './ui/hud.ts';
import { Panels } from './ui/panels.ts';
import { MenuSheet } from './ui/menuSheet.ts';
import { BIZ, COOK, DISHES, ECON, MENU_EXPORT } from './config.ts';
import type { DishCategory, DishId } from './config.ts';
import { spawnCustomer } from './game/customers.ts';
import { calcDineDuration, calcEntryRevenue } from './game/economy.ts';

console.info('[bbq] build', __BUILD__);
(window as unknown as Record<string, unknown>).__build = __BUILD__;

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

// Lighting: warm charcoal point lights on each dining tabletop grill + pendant lamps + Pass light
const lights = buildLighting(
  renderer,
  scene,
  [...dining.grillLightPos, kitchen.passLightPos],
  props.pendantPos,
);

// ---- UI ----
const hud = new Hud(uiRoot, rig.cam);
const panels = new Panels(uiRoot);
const menuSheet = new MenuSheet(uiRoot);

// Non-invasive buffet economy status strip & panel adapter (leaves src/ui/* untouched for lane/ui)
const econStyle = document.createElement('style');
econStyle.textContent = `
#bbq-econ-strip {
  position: absolute; top: calc(max(8px, env(safe-area-inset-top)) + 40px); left: 50%; z-index: 6;
  transform: translateX(-50%); display: none; gap: 8px; align-items: center;
  background: rgba(24,16,12,.82); backdrop-filter: blur(8px);
  border: 1px solid rgba(232,180,90,.42); border-radius: 10px;
  padding: 3px 10px; white-space: nowrap; max-width: calc(100vw - 16px); box-sizing: border-box;
  font-size: 11px; color: rgba(245,232,216,.88); font-weight: 600; pointer-events: none;
  font-variant-numeric: tabular-nums;
}
#bbq-econ-strip b { color: #f0c060; font-weight: 700; }
#bbq-econ-strip b.low { color: #ff7a66; }
#bbq-econ-strip .sep { color: rgba(240,192,96,.38); }
`;
document.head.appendChild(econStyle);

const econStrip = document.createElement('div');
econStrip.id = 'bbq-econ-strip';
uiRoot.appendChild(econStrip);

function syncEconStrip(): void {
  const e = flow.econSnapshot();
  econStrip.style.display = e.phase === 'playing' ? 'flex' : 'none';
  if (e.phase !== 'playing') return;
  const satCls = e.satisfaction < ECON.earlyLeaveThreshold ? 'low' : '';
  econStrip.innerHTML =
    `<span>自助 <b>¥${e.entryFee}×${e.seats}位</b></span>` +
    `<span class="sep">·</span>` +
    `<span>客数 <b>${e.served}/${e.targetGuests}</b></span>` +
    `<span class="sep">·</span>` +
    `<span>翻台 <b>${e.turnRate.toFixed(2)}×</b></span>` +
    `<span class="sep">·</span>` +
    `<span>满意 <b class="${satCls}">${e.satisfaction}%</b></span>`;
}

function patchStartPanel(): void {
  const targetEl = uiRoot.querySelector('.bbq-panel .target');
  if (!targetEl) return;
  const seats = flow.cfg.maxDiners;
  const entryRev = calcEntryRevenue(seats, BIZ.entryFee);
  const mins = Math.round(flow.cfg.duration / 60);
  targetEl.textContent =
    `第 ${flow.level} 关 · 限时 ${mins} 分钟（模拟 ${BIZ.realMinutes} 分钟）· 入场 ¥${BIZ.entryFee}×${seats}位 = ¥${entryRev} · 目标 ${flow.cfg.targetGuests} 位`;
}

function patchResultsPanel(r: Results): void {
  const card = uiRoot.querySelector('.bbq-panel .card');
  if (!card) return;
  const verdictEl = card.querySelector('.verdict');
  if (verdictEl) {
    const nextN = r.level + 1;
    verdictEl.textContent = !r.pass
      ? (r.served < r.targetGuests
        ? `客数差 ${r.targetGuests - r.served} 位（目标 ${r.targetGuests} 位）`
        : `满意度 ${r.satisfaction}%（需 ≥${ECON.tipMinSatisfaction}%）`)
      : (r.hasNext ? `达标！进入第 ${nextN} 关` : '全部关卡通关！');
  }
  const oldRows = card.querySelectorAll('.row');
  oldRows.forEach((n) => n.remove());
  const anchor = card.querySelector('button');
  const tipSuffix = r.tips > 0 ? ` + 小费¥${r.tips}` : '';
  const rows: { label: string; value: string; neg?: boolean; key: string }[] = [
    { key: 'revenue', label: '营业额（入场费）', value: `¥${r.money}（¥${r.entryFee}×${r.seats}${tipSuffix}）` },
    { key: 'served', label: '服务客数', value: `${r.served} / ${r.targetGuests} 位` },
    { key: 'turnRate', label: '翻台率', value: `${r.turnRate.toFixed(2)}×（${r.seats} 座）` },
    { key: 'satisfaction', label: '满意度', value: `${r.satisfaction}%`, neg: r.satisfaction < ECON.tipMinSatisfaction },
    { key: 'earlyLeaves', label: '提前离店 / 焦糊', value: `${r.earlyLeaves} 位 / ${r.waste} 份`, neg: r.earlyLeaves > 0 || r.waste > 0 },
  ];
  for (const row of rows) {
    const div = document.createElement('div');
    div.className = `row${row.neg ? ' neg' : ''}`;
    div.dataset.econRow = row.key;
    div.innerHTML = `<span>${row.label}</span><b>${row.value}</b>`;
    card.insertBefore(div, anchor);
  }
}

// ---- game ----
function syncPhase(phase: GamePhase): void {
  const playing = phase === 'playing';
  hud.setPlayHudVisible(playing);
  if (playing) panels.hide();
  syncEconStrip();
}

function syncHud(): void {
  flow.syncEcon();
  syncEconStrip();
  if (flow.phase !== 'playing') return;
  hud.syncState(
    flow.passSlotViews(),
    flow.carrying,
    flow.orderCardStates(),
    flow.customers,
    dining.tables,
    flow.served,
  );
  hud.setStars(flow.starsNow());
}

const flow = new Flow(
  scene,
  kitchen.passStation,
  kitchen.passSlots,
  dining.tables,
  dining.doorPos,
  {
    onPhase(phase: GamePhase) {
      syncPhase(phase);
    },
    onMoney(m: number) {
      hud.setMoney(m);
      hud.setStars(flow.starsNow());
    },
    onTimeLeft(s: number) {
      hud.setTime(s);
      hud.setStars(flow.starsNow());
    },
    onSync() {
      syncHud();
    },
    onPopup(pos, text, kind) {
      hud.popup(pos, text, kind);
    },
    onResults(r: Results) {
      panels.showResults(r, restart, nextLevel);
      patchResultsPanel(r);
      syncEconStrip();
    },
  },
);
flow.placePlayer();

hud.setOnPassTake((slotIndex: number) => {
  if (flow.takeFromPass(slotIndex)) {
    syncHud();
  }
});

hud.setOnCardAction((tableId: string) => {
  if (flow.handleTableAction(tableId)) {
    syncHud();
  }
});

// ---- Direct 3D tabletop grill & Pass window tap raycasting ----
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const rayTargets: THREE.Object3D[] = [
  ...dining.tables.map((t) => t.grillMesh),
  kitchen.passHitbox,
];

canvas.addEventListener('pointerdown', (e) => {
  if (flow.phase !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  ndc.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -(((e.clientY - rect.top) / rect.height) * 2 - 1),
  );
  rig.cam.updateMatrixWorld();
  raycaster.setFromCamera(ndc, rig.cam);
  const hits = raycaster.intersectObjects(rayTargets, false);
  if (!hits.length) return;
  const hitObj = hits[0].object;
  if (typeof hitObj.userData.tableId === 'string') {
    if (flow.handleTableAction(hitObj.userData.tableId)) syncHud();
  } else if (hitObj.userData.passHit) {
    if (flow.takeFromPass()) syncHud();
  }
});

function restart(): void {
  acc = 0;
  hud.setLevel(flow.level, flow.cfg.target);
  flow.startLevel();
  rig.snapTo(flow.player.obj.position);
  syncHud();
}

function nextLevel(): void {
  flow.nextLevel();
  if (flow.phase !== 'playing') return;
  acc = 0;
  hud.setLevel(flow.level, flow.cfg.target);
  rig.snapTo(flow.player.obj.position);
  syncHud();
}

hud.setLevel(flow.level, flow.cfg.target);
syncPhase(flow.phase);
panels.showStart(flow.cfg.target, flow.cfg.duration, restart, flow.level);
patchStartPanel();

// ---- resize ----
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rig.resize(window.innerWidth, window.innerHeight);
  if (flow.phase === 'playing') {
    syncHud();
    hud.updateBubbles(flow.customers);
  }
});

// ---- loop ----
const clock = new THREE.Clock();
let frames = 0;

const STEP = 1 / 60;
const MAX_FRAME = 1.5;
const MAX_STEPS = 90;
let acc = 0;

function step(rawDt: number, draw = true, move?: THREE.Vector2): void {
  let mv = move;
  if (!mv) {
    input.update();
    mv = input.move;
  }
  acc += Math.min(rawDt, MAX_FRAME);
  let n = 0;
  while (acc >= STEP && n < MAX_STEPS) {
    flow.update(STEP, mv);
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

  // Subtle lively bobbing on the background NPC prep chef behind the Pass window
  const npcBusy = flow.customers.some((c) => c.phase === 'seated' && c.orderState === 'ordering') && !flow.passPaused;
  kitchen.prepNpc.position.y = npcBusy ? Math.abs(Math.sin(t * 7.5)) * 0.045 : Math.sin(t * 2.2) * 0.012;
  kitchen.prepNpc.rotation.z = npcBusy ? Math.sin(t * 7.5) * 0.05 : 0;

  if (flow.phase === 'playing') {
    syncHud();
    hud.updateBubbles(flow.customers);
  }

  renderer.render(scene, rig.cam);
}

renderer.setAnimationLoop(() => step(clock.getDelta()));

// ---- test / perf hooks ----
interface TestHooks {
  teleport(x: number, z: number): void;
  pauseSpawns(v: boolean): void;
  spawnNow(dish?: DishId): string | false;
  setPatience(sec: number): void;
  start(): void;
  tick(dt?: number, n?: number, mx?: number, mz?: number): void;
  state(): Record<string, unknown>;
  worldToScreen(x: number, y: number, z: number): { x: number; y: number; z: number };
  stationGeom(): { id: string; kind: string; x: number; z: number; topY: number; w: number; d: number }[];
  camera(): ReturnType<CameraRig['info']>;
  cardState(tableId: string): CardStateSnapshot | null;
  passDomRects(): ReturnType<Hud['passDomRects']>;
  openMenu(cat?: DishCategory | 'all'): void;
  closeMenu(): void;
}

const ZERO_MOVE = new THREE.Vector2(0, 0);
const hooks: TestHooks = {
  teleport(x, z) {
    flow.player.cancelNav();
    flow.player.obj.position.set(x, 0, z);
    rig.snapTo(flow.player.obj.position);
  },
  pauseSpawns(v: boolean) {
    flow.spawnsPaused = v;
  },
  spawnNow(dish) {
    const free = dining.tables.filter((tb) => !tb.guest && tb.cooldown <= 0);
    if (!free.length) return false;
    const c = spawnCustomer(scene, free[0], dining.doorPos, dish, calcDineDuration(flow.seats));
    flow.customers.push(c);
    syncHud();
    return free[0].id;
  },
  setPatience(sec) {
    for (const c of flow.customers) {
      if (c.phase === 'seated') c.patience = sec;
    }
  },
  start() {
    restart();
  },
  tick(dt = 0.05, n = 1, mx = 0, mz = 0) {
    const mv = mx || mz ? new THREE.Vector2(mx, mz) : ZERO_MOVE;
    for (let i = 0; i < n; i++) step(dt, false, mv);
    if (flow.phase === 'playing') {
      syncHud();
      hud.updateBubbles(flow.customers);
    }
  },
  worldToScreen(x, y, z) {
    rig.cam.updateMatrixWorld();
    const v = new THREE.Vector3(x, y, z).project(rig.cam);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, z: v.z };
  },
  stationGeom() {
    return kitchen.stations.map((st) => ({
      id: st.id,
      kind: st.kind,
      x: st.pos.x,
      z: st.pos.z,
      topY: st.topY,
      w: STATIONS.find((d) => d.id === st.id)?.cells.length ?? 1,
      d: COUNTER_D,
    }));
  },
  camera() {
    return rig.info();
  },
  cardState(tableId) {
    return hud.cardState(tableId);
  },
  passDomRects() {
    return hud.passDomRects();
  },
  openMenu(cat = 'all') {
    menuSheet.open(cat);
  },
  closeMenu() {
    menuSheet.close();
  },
  state() {
    const nt = flow.player.navTarget;
    return {
      phase: flow.phase,
      level: flow.level,
      levelTarget: flow.cfg.targetGuests,
      money: flow.money,
      entryRevenue: flow.entryRevenue,
      tips: flow.tips,
      seats: flow.seats,
      satisfaction: flow.satisfaction,
      earlyLeaves: flow.earlyLeaves,
      econ: flow.econSnapshot(),
      dishes: DISHES,
      biz: BIZ,
      timeLeft: Number(flow.timeLeft.toFixed(3)),
      served: flow.served,
      angry: flow.angry,
      waste: flow.waste,
      clickCount: flow.clickCount,
      passCapacity: COOK.passCapacity,
      passPaused: flow.passPaused,
      pass: flow.pass.map((p) => ({
        id: p.id,
        dishId: p.dishId,
        tableId: p.tableId,
        customerId: p.customerId,
        slotIndex: p.slotIndex,
      })),
      carrying: flow.carrying
        ? {
          dishId: flow.carrying.dishId,
          tableId: flow.carrying.tableId,
          customerId: flow.carrying.customerId,
        }
        : null,
      hint: ((h) => (h ? { kind: h.kind, id: h.id, x: +h.pos.x.toFixed(2), z: +h.pos.z.toFixed(2) } : null))(flow.hint),
      player: {
        x: Number(flow.player.obj.position.x.toFixed(3)),
        z: Number(flow.player.obj.position.z.toFixed(3)),
        navTarget: nt ? { x: Number(nt.x.toFixed(3)), z: Number(nt.z.toFixed(3)) } : null,
      },
      passPos: {
        x: Number(kitchen.passStation.usePos.x.toFixed(3)),
        z: Number(kitchen.passStation.usePos.z.toFixed(3)),
      },
      stations: Object.fromEntries(kitchen.stations.map((st) => [st.id, { x: st.usePos.x, z: st.usePos.z }])),
      tables: Object.fromEntries(dining.tables.map((tb) => [tb.id, {
        tableNum: tb.tableNum,
        x: tb.usePos.x,
        z: tb.usePos.z,
        guest: tb.guest,
        cooldown: Number(tb.cooldown.toFixed(3)),
        grill: {
          active: tb.grill.active,
          grilling: tb.grill.active,
          dishId: tb.grill.dishId,
          customerId: tb.grill.customerId,
          grillT: Number(tb.grill.grillT.toFixed(4)),
          cookWindow: tb.grill.cookWindow,
          burntHandled: tb.grill.burntHandled,
        },
      }])),
      customers: flow.customers.map((c) => ({
        id: c.id,
        dish: c.dish,
        phase: c.phase,
        orderState: c.orderState,
        prepT: Number(c.prepT.toFixed(3)),
        patience: Number(c.patience.toFixed(2)),
        patienceMax: c.patienceMax,
        satisfaction: c.satisfaction,
        dineT: Number(c.dineT.toFixed(2)),
        dineDuration: c.dineDuration,
        eatT: Number(c.eatT.toFixed(2)),
        earlyLeft: c.earlyLeft,
        longWaitPenalized: c.longWaitPenalized,
        table: c.table,
        clicksUsed: c.clicksUsed,
        burntHandled: c.burntHandled,
        x: Number(c.obj.position.x.toFixed(2)),
        z: Number(c.obj.position.z.toFixed(2)),
      })),
      calls: renderer.info.render.calls,
      tris: renderer.info.render.triangles,
    };
  },
};

(window as unknown as Record<string, unknown>).__frames = 0;
(window as unknown as Record<string, unknown>).__perf = { calls: 0, tris: 0 };
(window as unknown as Record<string, unknown>).__menu = MENU_EXPORT;
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
