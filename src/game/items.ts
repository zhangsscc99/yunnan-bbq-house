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
const capGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.042, 8);    // wild fungus cap
const sliceGeo = new THREE.BoxGeometry(0.072, 0.026, 0.076);          // crisp vegetable slice
const trayGeo = new THREE.BoxGeometry(0.42, 0.024, 0.30);
const plateGeo = new THREE.CylinderGeometry(0.16, 0.11, 0.028, 18);
const plateRimGeo = new THREE.TorusGeometry(0.15, 0.014, 6, 18);

const stickMat = new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.8 });
const trayMat = new THREE.MeshStandardMaterial({ color: 0x9b7444, roughness: 0.72 });
const plateMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.3, metalness: 0.05 });
const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c4, roughness: 0.6 });

for (const r of [
  stickGeo, cubeGeo, capGeo, sliceGeo, trayGeo, plateGeo, plateRimGeo,
  stickMat, trayMat, plateMat, marbleMat,
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
  const cat = DISHES[dish].category;
  const m = dishMat(dish, stage);
  g.userData.meat = m;

  for (let i = -1; i <= 1; i++) {
    const geo = cat === '云贵菌类' ? capGeo : cat === '特色时蔬' ? sliceGeo : cubeGeo;
    const p = new THREE.Mesh(geo, m);
    p.position.set(i * gap, 0.014, 0);
    if (cat === '云贵菌类') p.rotation.z = i * 0.25;
    if (cat === '特色时蔬') p.rotation.y = i * 0.22;
    if (cat === '云贵风味鸡') p.scale.set(1.06, 0.88, 0.94);
    g.add(p);
    if (cat === '真真牛' && !burnt) {
      const marble = new THREE.Mesh(cubeGeo, marbleMat);
      marble.scale.set(1.02, 0.24, 1.02);
      marble.position.copy(p.position);
      g.add(marble);
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
  const plated = stage === 'plated';
  item.obj = plated
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
