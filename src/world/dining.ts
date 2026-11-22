// Dining area: 4 tables (each with a built-in charcoal grill + grate), stools,
// customer entry door, and chalk menu board.

import * as THREE from 'three';
import { TABLES, DOOR, cellToWorld } from './layout.ts';
import type { TableGrill } from '../game/types.ts';
import { MATS } from '../core/materials.ts';

export interface TableRuntime {
  id: string;
  tableNum: number;
  pos: THREE.Vector3;
  grillPos: THREE.Vector3;     // anchor for meat sizzling on this table's grill
  platePos: THREE.Vector3;     // anchor for plated dish served to the seated guest
  usePos: THREE.Vector3;
  seatPos: THREE.Vector3;
  group: THREE.Group;
  grillMesh: THREE.Mesh;       // raycastable tabletop grill hitbox
  emberMat: THREE.MeshStandardMaterial;
  cooldown: number;            // 2.0s table cleaning countdown after guest leaves
  guest: number | null;        // customer id seated here
  grill: TableGrill;           // built-in tabletop grill state
}

export interface DiningBuild {
  group: THREE.Group;
  tables: TableRuntime[];
  grillLightPos: THREE.Vector3[];
  doorPos: THREE.Vector3;
}

export function createEmptyTableGrill(): TableGrill {
  return {
    active: false,
    dishId: null,
    customerId: null,
    grillT: 0,
    cookWindow: 'none',
    item: null,
    burntHandled: false,
    smokeT: 0,
  };
}

export function buildDining(): DiningBuild {
  const M = MATS();
  const group = new THREE.Group();
  const topMat = M.counterTop as THREE.Material;
  const legMat = M.tableLeg as THREE.Material;
  const stoolMat = M.bamboo as THREE.Material;
  const rimMat = M.grillRim as THREE.Material;
  const barMat = M.grillBar as THREE.Material;
  const baseEmberMat = M.ember as THREE.MeshStandardMaterial;

  const legGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.6, 6);
  const stoolGeo = new THREE.CylinderGeometry(0.19, 0.22, 0.4, 10);
  const barGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.44, 5);

  const tables: TableRuntime[] = [];
  const grillLightPos: THREE.Vector3[] = [];

  for (const t of TABLES) {
    const { x, z } = cellToWorld(t.pos[0], t.pos[1]);
    const use = cellToWorld(t.use[0], t.use[1]);
    const seat = cellToWorld(t.seat[0], t.seat[1]);
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.05, 1.08), topMat);
    top.position.y = 0.62;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);

    for (const [lx, lz] of [[-0.44, -0.42], [0.44, -0.42], [-0.44, 0.42], [0.44, 0.42]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.3, lz);
      leg.castShadow = true;
      g.add(leg);
    }
    for (const s of [-0.88, 0.88]) {
      const stool = new THREE.Mesh(stoolGeo, stoolMat);
      stool.position.set(s, 0.2, 0);
      stool.castShadow = true;
      g.add(stool);
    }

    // ---- built-in tabletop charcoal grill + metal grate ----
    const gx = 0.08;
    const gz = 0;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.055, 0.44), rimMat);
    rim.position.set(gx, 0.655, gz);
    rim.castShadow = true;
    g.add(rim);

    // Individual ember material per table so active grilling tables flare brighter
    const emberMat = baseEmberMat.clone();
    emberMat.emissiveIntensity = 1.6;
    const ember = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.35), emberMat);
    ember.position.set(gx, 0.668, gz);
    ember.userData.noMerge = true;
    g.add(ember);

    for (let b = 0; b < 6; b++) {
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(gx, 0.692, gz - 0.14 + b * 0.056);
      g.add(bar);
    }

    // Raycast hitbox for tapping this tabletop grill directly
    const grillHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.45, 0.8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    grillHit.position.set(gx, 0.78, gz);
    grillHit.userData.noMerge = true;
    grillHit.userData.tableId = t.id;
    g.add(grillHit);

    group.add(g);
    const grillPos = new THREE.Vector3(x + gx, 0.72, z + gz);
    const platePos = new THREE.Vector3(x - 0.34, 0.66, z + 0.08);
    grillLightPos.push(new THREE.Vector3(x + gx, 0.68, z + gz));

    tables.push({
      id: t.id,
      tableNum: t.tableNum,
      pos: new THREE.Vector3(x, 0.65, z),
      grillPos,
      platePos,
      usePos: new THREE.Vector3(use.x, 0, use.z),
      seatPos: new THREE.Vector3(seat.x, 0, seat.z),
      group: g,
      grillMesh: grillHit,
      emberMat,
      cooldown: 0,
      guest: null,
      grill: createEmptyTableGrill(),
    });
  }

  // door: frame posts + lintel + warm light spilling onto the floor
  const d = cellToWorld(DOOR[0], DOOR[1]);
  const doorPos = new THREE.Vector3(d.x, 0, -4.4);
  const doorMat = M.doorWood as THREE.Material;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.18), doorMat);
  doorFrame.position.set(d.x, 2.15, -4.45);
  group.add(doorFrame);
  for (const s of [-0.65, 0.65]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.15, 0.14), doorMat);
    post.position.set(d.x + s, 1.07, -4.45);
    group.add(post);
  }
  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }),
  );
  opening.position.set(d.x, 1.05, -4.52);
  group.add(opening);
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.1),
    M.doorGlow as THREE.Material,
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(d.x, 0.012, -4.1);
  group.add(spill);

  // chalk menu board on the back wall
  const menu = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    M.menuBoard as THREE.Material,
  );
  menu.position.set(3.6, 1.7, -4.92);
  group.add(menu);

  return { group, tables, grillLightPos, doorPos };
}
