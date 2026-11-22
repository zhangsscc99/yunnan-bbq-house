// Item meshes: raw pass tray → sizzling on tabletop grill (raw → golden → char) → plated dish.
// All share a tiny set of geometries and per-dish materials.

import * as THREE from 'three';
import { COOK, DISHES } from '../config.ts';
import type { DishId } from '../config.ts';
import type { Item, ItemStage } from './types.ts';

let nextId = 1;

// shared geometry
const stickGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.38, 5);
const cubeGeo = new THREE.BoxGeometry(0.068, 0.054, 0.068);
const cylGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.042, 8);   // mushroom cap
const noodleGeo = new THREE.TorusGeometry(0.042, 0.014, 6, 10);
const trayGeo = new THREE.BoxGeometry(0.42, 0.024, 0.30);
const plateGeo = new THREE.CylinderGeometry(0.16, 0.11, 0.028, 18);
const plateRimGeo = new THREE.TorusGeometry(0.15, 0.014, 6, 18);
const bowlGeo = new THREE.CylinderGeometry(0.105, 0.07, 0.08, 14, 1, true);

const stickMat = new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.8 });
const trayMat = new THREE.MeshStandardMaterial({ color: 0x9b7444, roughness: 0.72 });
const plateMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.3, metalness: 0.05 });
const bowlMat = new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.5, side: THREE.DoubleSide });
const fatMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b8, roughness: 0.6 });

for (const r of [
  stickGeo, cubeGeo, cylGeo, noodleGeo, trayGeo, plateGeo, plateRimGeo, bowlGeo,
  stickMat, trayMat, plateMat, bowlMat, fatMat,
]) {
  r.userData.shared = true;
}

const GOLDEN = new THREE.Color(0xe6a632);
const GLOW = new THREE.Color(0xc27a14);
const CHAR = new THREE.Color(0x241d18);
const RAW_TINT = new THREE.Color(0xffe8e0);

/** meat colour along v2 8s grill timeline: [0,5) raw→searing, [5,7) golden, [7,8) darkening, >=8 char */
export function meatColor(dish: DishId, stage: ItemStage, grillT = 0, out = new THREE.Color()): THREE.Color {
  out.set(DISHES[dish].hue);
  if (stage === 'waste') return out.copy(CHAR);
  if (stage === 'plated') return out.lerp(GOLDEN, 0.88);
  if (stage === 'cooked' || grillT >= COOK.perfectStart) {
    out.lerp(GOLDEN, 0.88);
    if (grillT > COOK.perfectEnd) {
      const k = Math.min(1, (grillT - COOK.perfectEnd) / Math.max(0.1, COOK.burnTime - COOK.perfectEnd));
      out.lerp(CHAR, k * 0.65);
    }
    return out;
  }
  if (grillT <= 0.01) return out.lerp(RAW_TINT, 0.25);
  const k = Math.min(1, grillT / COOK.perfectStart);
  return out.lerp(GOLDEN, k * 0.62);
}

/** live-tint a skewer while it sits on a tabletop grill */
export function tintItem(item: Item): void {
  const m = item.obj.userData.meat as THREE.MeshStandardMaterial | undefined;
  if (!m) return;
  meatColor(item.dish, item.stage, item.grillT, m.color);
  m.emissive.copy(GLOW);
  const isPerfect = item.grillT >= COOK.perfectStart && item.grillT < COOK.perfectEnd;
  const isOver = item.grillT >= COOK.perfectEnd && item.grillT < COOK.burnTime;
  m.emissiveIntensity = isPerfect ? 0.55 : isOver ? 0.25 : 0;
}

function dishMat(dish: DishId, stage: ItemStage, grillT = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: meatColor(dish, stage, grillT), roughness: 0.52 });
}

function buildSkewer(dish: DishId, stage: ItemStage): THREE.Group {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.rotation.z = Math.PI / 2;
  g.add(stick);

  const gap = 0.072;
  const burnt = stage === 'waste';
  const m = dishMat(dish, stage);
  g.userData.meat = m;

  if (dish === 'mixian') {
    for (let i = -1; i <= 1; i++) {
      const n = new THREE.Mesh(noodleGeo, m);
      n.position.set(i * 0.062, 0.01, 0);
      n.rotation.y = Math.PI / 2;
      g.add(n);
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      const geo = dish === 'mushroom' ? cylGeo : cubeGeo;
      const p = new THREE.Mesh(geo, m);
      p.position.set(i * gap, 0.014, 0);
      if (dish === 'mushroom') p.rotation.z = i * 0.25;
      g.add(p);
      if (dish === 'pork' && !burnt) {
        const fat = new THREE.Mesh(cubeGeo, fatMat);
        fat.scale.set(1.02, 0.3, 1.02);
        fat.position.copy(p.position);
        g.add(fat);
      }
    }
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** 3D tray with raw dish sitting on the Pass window shelf or carried in hand */
export function buildPassTray(dish: DishId): THREE.Group {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.y = 0.012;
  tray.castShadow = true;
  g.add(tray);

  const s1 = buildSkewer(dish, 'raw');
  s1.position.set(0, 0.055, -0.05);
  s1.rotation.y = 0.12;
  g.add(s1);

  const s2 = buildSkewer(dish, 'raw');
  s2.position.set(0, 0.055, 0.055);
  s2.rotation.y = -0.1;
  g.add(s2);

  g.userData.meat = s1.userData.meat;
  return g;
}

function buildPlated(dish: DishId, skewer: THREE.Group): THREE.Group {
  const g = new THREE.Group();
  if (dish === 'mixian') {
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = 0.04;
    g.add(bowl);
    for (let i = 0; i < 4; i++) {
      const n = new THREE.Mesh(noodleGeo, dishMat(dish, 'plated'));
      n.position.set(((i * 31) % 7 - 3) * 0.009, 0.06 + (i % 2) * 0.008, ((i * 17) % 5 - 2) * 0.011);
      n.rotation.x = -Math.PI / 2 + (i % 3) * 0.2;
      n.scale.setScalar(0.62);
      g.add(n);
    }
  } else {
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.014;
    g.add(plate);
    const rim = new THREE.Mesh(plateRimGeo, plateMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.026;
    g.add(rim);
    skewer.position.set(0, 0.055, -0.025);
    skewer.rotation.set(0, 0.28, 0);
    g.add(skewer);
    const s2 = buildSkewer(dish, 'plated');
    s2.position.set(0, 0.055, 0.045);
    s2.rotation.y = -0.22;
    g.add(s2);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function createItem(dish: DishId, stage: ItemStage = 'raw', onTray = false): Item {
  const obj = onTray ? buildPassTray(dish) : buildSkewer(dish, stage);
  return { id: nextId++, dish, stage, obj, grillT: 0 };
}

export function setItemStage(item: Item, stage: ItemStage): void {
  const old = item.obj;
  const parent = old.parent;
  const pos = old.position.clone();
  const rotY = old.rotation.y;
  item.stage = stage;
  const plated = stage === 'plated' && item.dish !== 'mixian';
  item.obj = stage === 'plated'
    ? buildPlated(item.dish, old as THREE.Group)
    : buildSkewer(item.dish, stage);
  if (plated) item.obj.userData.meat = old.userData.meat;
  item.obj.position.copy(pos);
  item.obj.rotation.y = rotY;
  if (!plated) {
    old.parent?.remove(old);
    (old.userData.meat as THREE.Material | undefined)?.dispose();
  }
  if (parent) parent.add(item.obj);
}
