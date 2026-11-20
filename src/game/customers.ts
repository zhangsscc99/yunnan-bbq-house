// Customers: walk in the door, take a free table, order one dish, tick down
// patience, eat when served, leave happy (pay) or angry (patience 0).
// Movement is a simple two-leg path (along the back wall, then down to seat).

import * as THREE from 'three';
import { DISHES } from '../config.ts';
import type { DishId } from '../config.ts';
import type { Customer } from './types.ts';
import type { TableRuntime } from '../world/dining.ts';
import { buildChibi } from './player.ts';
import { disposeTree } from '../core/dispose.ts';

const WALK_SPEED = 1.6;

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

export function pickDish(rng: () => number = Math.random): DishId {
  const r = rng();
  if (r < 0.45) return 'pork';
  if (r < 0.75) return 'mushroom';
  return 'mixian';
}

export function spawnCustomer(
  scene: THREE.Scene,
  table: TableRuntime,
  doorPos: THREE.Vector3,
  dish?: DishId,
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
    patience: DISHES[d].patience,
    patienceMax: DISHES[d].patience,
    target: table.seatPos.clone(),
    eatT: 0,
    leaveStep: 0,
    bubble: null,
  };
  table.guest = c.id;
  return c;
}

// two-leg walk: first along x at z≈door.z+0.4 aisle, then to target
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
    onAngry: (c: Customer) => void;
    onGone: (c: Customer) => void;
  },
): void {
  const p = c.obj.position;
  switch (c.phase) {
    case 'walking-in': {
      // leg 1: slide along the door-line until x matches the seat
      // (keeps guests off the tables), leg 2: straight to the seat.
      const aisleZ = ctx.doorPos.z + 0.6;
      if (p.z < aisleZ && Math.abs(p.x - c.target.x) > 0.08) {
        stepToward(c, new THREE.Vector3(c.target.x, 0, p.z), dt);
        break;
      }
      if (stepToward(c, c.target, dt)) {
        c.phase = 'seated';
        const tp = ctx.tablePos;
        c.obj.rotation.y = Math.atan2(tp.x - p.x, tp.z - p.z);
      } else {
        c.obj.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.04;
      }
      break;
    }
    case 'seated': {
      c.patience -= dt;
      p.y = 0.32; // perched on stool
      if (c.patience <= 0) {
        c.patience = 0;
        c.phase = 'leaving-angry';
        c.obj.position.y = 0;
        ctx.onAngry(c);
      }
      break;
    }
    case 'eating': {
      c.eatT -= dt;
      p.y = 0.32 + Math.abs(Math.sin(performance.now() / 200)) * 0.02;
      if (c.eatT <= 0) {
        c.phase = 'leaving-happy';
        c.obj.position.y = 0;
      }
      break;
    }
    case 'leaving-happy':
    case 'leaving-angry': {
      // deterministic waypoints: rise to aisle → slide to door-x → out.
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
