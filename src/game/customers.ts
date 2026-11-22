// Customers: walk in the door, take a free table, self-order one dish,
// tick down patience, eat when served, or leave after burnt/angry.

import * as THREE from 'three';
import { DISHES, ECON, LEVELS, DISHES_BY_CATEGORY } from '../config.ts';
import type { DishCategory, DishId } from '../config.ts';
import type { Customer } from './types.ts';
import type { TableRuntime } from '../world/dining.ts';
import { buildChibi } from './player.ts';
import { disposeTree } from '../core/dispose.ts';
import { calcDineDuration } from './economy.ts';

const WALK_SPEED = 1.9;

const OUTFITS = [
  { shirt: 0x7a8a6a, hair: 0x2a2018 },
  { shirt: 0x6a7a8a, hair: 0x1c1814 },
  { shirt: 0xa08858, hair: 0x4a3020 },
  { shirt: 0x8a6a7a, hair: 0x241c20 },
  { shirt: 0x5d7a6a, hair: 0x3a2a1c },
  { shirt: 0x9a7a4a, hair: 0x181410 },
];
const SKINS = [0xf0c8a0, 0xe8b890, 0xd8a880, 0xf5d0b0];

let nextCustomerId = 1;

const CATEGORY_WEIGHTS: readonly [DishCategory, number][] = [
  ['真真牛', 0.48],
  ['云贵风味鸡', 0.16],
  ['云贵菌类', 0.22],
  ['特色时蔬', 0.14],
];

export function pickDish(rng: () => number = Math.random): DishId {
  const r = Math.min(0.999999, Math.max(0, rng()));
  let acc = 0;
  for (const [cat, weight] of CATEGORY_WEIGHTS) {
    if (r < acc + weight) {
      const list = DISHES_BY_CATEGORY[cat];
      const frac = (r - acc) / weight;
      const idx = Math.min(list.length - 1, Math.floor(frac * list.length));
      return list[idx].id;
    }
    acc += weight;
  }
  const fallback = DISHES_BY_CATEGORY['真真牛'];
  return fallback[0].id;
}

export function spawnCustomer(
  scene: THREE.Scene,
  table: TableRuntime,
  doorPos: THREE.Vector3,
  dish?: DishId,
  dineDuration = calcDineDuration(LEVELS[0].maxDiners),
): Customer {
  const o = OUTFITS[nextCustomerId % OUTFITS.length];
  const obj = buildChibi({
    apron: null,
    shirt: o.shirt,
    hat: 'hair',
    hairColor: o.hair,
    skin: SKINS[nextCustomerId % SKINS.length],
  });
  obj.position.copy(doorPos);
  scene.add(obj);
  const d = dish ?? pickDish();
  const c: Customer = {
    id: nextCustomerId++,
    dish: d,
    obj,
    table: table.id,
    phase: 'walking-in',
    orderState: 'ordering',
    prepT: 0,
    patience: DISHES[d].patience,
    patienceMax: DISHES[d].patience,
    satisfaction: ECON.satisfactionInit,
    dineT: 0,
    dineDuration,
    longWaitPenalized: false,
    earlyLeft: false,
    target: table.seatPos.clone(),
    eatT: 0,
    burntLinger: 0,
    burntHandled: false,
    clicksUsed: 0,
    leaveStep: 0,
    bubble: null,
  };
  table.guest = c.id;
  return c;
}

function stepToward(c: Customer, target: THREE.Vector3, dt: number): boolean {
  const p = c.obj.position;
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return true;
  const step = Math.min(dist, WALK_SPEED * dt);
  p.x += (dx / dist) * step;
  p.z += (dz / dist) * step;
  const targetRot = Math.atan2(dx, dz);
  let d = targetRot - c.obj.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  c.obj.rotation.y += d * Math.min(1, dt * 10);
  return false;
}

export function updateCustomer(
  c: Customer,
  dt: number,
  ctx: {
    doorPos: THREE.Vector3;
    tablePos: THREE.Vector3;
    scene: THREE.Scene;
    onLongWait?: (c: Customer) => void;
    onLeaveTable?: (c: Customer) => void;
    onAngry: (c: Customer) => void;
    onGone: (c: Customer) => void;
  },
): void {
  const p = c.obj.position;
  switch (c.phase) {
    case 'walking-in': {
      const aisleZ = ctx.doorPos.z + 0.6;
      if (p.z < aisleZ && Math.abs(p.x - c.target.x) > 0.08) {
        stepToward(c, new THREE.Vector3(c.target.x, 0, p.z), dt);
        break;
      }
      if (stepToward(c, c.target, dt)) {
        c.phase = 'seated';
        c.orderState = 'ordering';
        c.prepT = 0;
        c.dineT = 0;
        const tp = ctx.tablePos;
        c.obj.rotation.y = Math.atan2(tp.x - p.x, tp.z - p.z);
      } else {
        c.obj.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.04;
      }
      break;
    }
    case 'seated': {
      c.patience -= dt;
      c.dineT += dt;
      p.y = 0.32;
      if (!c.longWaitPenalized && c.patienceMax > 0 && c.patience / c.patienceMax <= ECON.longWaitFrac) {
        c.longWaitPenalized = true;
        ctx.onLongWait?.(c);
        // Long-wait penalty may drop satisfaction below threshold and trigger early departure immediately
        if (c.phase !== 'seated') break;
      }
      if (c.patience <= 0 || c.dineT >= c.dineDuration) {
        c.patience = Math.max(0, c.patience);
        c.phase = 'leaving-angry';
        c.obj.position.y = 0;
        ctx.onAngry(c);
        ctx.onLeaveTable?.(c);
      }
      break;
    }
    case 'burnt': {
      // Order voided by burn: linger briefly in red state without draining patience or double-penalizing angry
      p.y = 0.32;
      c.burntLinger -= dt;
      if (c.burntLinger <= 0) {
        c.burntLinger = 0;
        c.phase = 'leaving-angry';
        c.obj.position.y = 0;
        ctx.onLeaveTable?.(c);
      }
      break;
    }
    case 'eating': {
      c.dineT += dt;
      c.eatT -= dt;
      p.y = 0.32 + Math.abs(Math.sin(performance.now() / 200)) * 0.02;
      if (c.eatT <= 0 || c.dineT >= c.dineDuration) {
        c.eatT = 0;
        c.phase = 'leaving-happy';
        c.obj.position.y = 0;
        ctx.onLeaveTable?.(c);
      }
      break;
    }
    case 'leaving-happy':
    case 'leaving-angry': {
      const door = ctx.doorPos;
      const aisleZ = door.z + 0.6;
      if (c.leaveStep === 0) {
        if (Math.abs(p.z - aisleZ) <= 0.08) c.leaveStep = 1;
        else { stepToward(c, new THREE.Vector3(p.x, 0, aisleZ), dt); break; }
      }
      if (c.leaveStep === 1) {
        if (Math.abs(p.x - door.x) <= 0.08) c.leaveStep = 2;
        else { stepToward(c, new THREE.Vector3(door.x, 0, aisleZ), dt); break; }
      }
      if (stepToward(c, door, dt)) {
        c.phase = 'gone';
        ctx.scene.remove(c.obj);
        disposeTree(c.obj);
        ctx.onGone(c);
      }
      break;
    }
    case 'gone':
      break;
  }
}
