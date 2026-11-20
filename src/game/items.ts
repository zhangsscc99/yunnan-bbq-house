// Item meshes: a skewer evolves raw → chopped → cooked → (plated) / waste.
// All share a tiny set of geometries and per-dish materials.

import * as THREE from 'three';
import { DISHES } from '../config.ts';
import type { DishId } from '../config.ts';
import type { Item, ItemStage } from './types.ts';

let nextId = 1;

// shared geometry
const stickGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.34, 5);
const cubeGeo = new THREE.BoxGeometry(0.055, 0.045, 0.055);
const cylGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.035, 8);   // mushroom cap
const noodleGeo = new THREE.TorusGeometry(0.035, 0.012, 6, 10);
const plateGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.025, 18);
const plateRimGeo = new THREE.TorusGeometry(0.13, 0.012, 6, 18);
const bowlGeo = new THREE.CylinderGeometry(0.09, 0.06, 0.07, 14, 1, true);

const stickMat = new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.8 });
const plateMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.3, metalness: 0.05 });
const bowlMat = new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.5, side: THREE.DoubleSide });
const charMat = new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 0.9 });
const fatMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b8, roughness: 0.6 });

function dishMat(dish: DishId, cooked: boolean): THREE.MeshStandardMaterial {
  const base = new THREE.Color(DISHES[dish].hue);
  if (cooked) base.lerp(new THREE.Color(0xd98a3d), 0.45);
  return new THREE.MeshStandardMaterial({ color: base, roughness: 0.55 });
}

function buildSkewer(dish: DishId, stage: ItemStage): THREE.Group {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(stickGeo, stickMat);
  stick.rotation.z = Math.PI / 2;
  g.add(stick);

  const burnt = stage === 'waste';
  const cooked = stage === 'cooked' || stage === 'plated';
  const m = burnt ? charMat : dishMat(dish, cooked);

  if (dish === 'mixian') {
    // noodle bundle: 3 small tori along the stick
    for (let i = -1; i <= 1; i++) {
      const n = new THREE.Mesh(noodleGeo, m);
      n.position.set(i * 0.055, 0, 0);
      n.rotation.y = Math.PI / 2;
      n.scale.setScalar(0.9);
      g.add(n);
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      const geo = dish === 'mushroom' ? cylGeo : cubeGeo;
      const p = new THREE.Mesh(geo, m);
      p.position.set(i * 0.06, 0.01, 0);
      if (dish === 'mushroom') p.rotation.z = i * 0.25;
      g.add(p);
      // pork belly: alternate a fat stripe
      if (dish === 'pork' && !burnt) {
        const fat = new THREE.Mesh(cubeGeo, fatMat);
        fat.scale.set(1.02, 0.32, 1.02);
        fat.position.copy(p.position);
        g.add(fat);
      }
    }
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function buildPlated(dish: DishId, skewer: THREE.Group): THREE.Group {
  const g = new THREE.Group();
  if (dish === 'mixian') {
    // plating turns the bundle into a small clay bowl of noodles
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    g.add(bowl);
    for (let i = 0; i < 4; i++) {
      const n = new THREE.Mesh(noodleGeo, dishMat(dish, true));
      n.position.set(((i * 31) % 7 - 3) * 0.008, 0.045 + (i % 2) * 0.008, ((i * 17) % 5 - 2) * 0.01);
      n.rotation.x = -Math.PI / 2 + (i % 3) * 0.2;
      n.scale.setScalar(0.55);
      g.add(n);
    }
  } else {
    const plate = new THREE.Mesh(plateGeo, plateMat);
    g.add(plate);
    const rim = new THREE.Mesh(plateRimGeo, plateMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.012;
    g.add(rim);
    skewer.position.y = 0.05;
    skewer.rotation.y = 0.3;
    g.add(skewer);
    // second skewer for a fuller plate
    const s2 = buildSkewer(dish, 'cooked');
    s2.position.set(0, 0.05, 0.045);
    s2.rotation.y = -0.25;
    g.add(s2);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function createItem(dish: DishId, stage: ItemStage = 'raw'): Item {
  const obj = buildSkewer(dish, stage);
  return { id: nextId++, dish, stage, obj, grillT: 0 };
}

// rebuild the mesh for a new stage (cheap: items are tiny, ≤40 live)
export function setItemStage(item: Item, stage: ItemStage): void {
  const parent = item.obj.parent;
  const pos = item.obj.position.clone();
  const rotY = item.obj.rotation.y;
  item.stage = stage;
  const skewer = stage === 'plated' ? item.obj : null;
  item.obj =
    stage === 'plated' && skewer
      ? buildPlated(item.dish, skewer as THREE.Group)
      : buildSkewer(item.dish, stage);
  item.obj.position.copy(pos);
  item.obj.rotation.y = rotY;
  if (parent) parent.add(item.obj);
}
