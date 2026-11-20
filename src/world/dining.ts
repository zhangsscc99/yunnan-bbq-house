// Dining area: tables + stools + the door customers walk through.

import * as THREE from 'three';
import { TABLES, DOOR, cellToWorld } from './layout.ts';
import { MATS } from '../core/materials.ts';

export interface TableRuntime {
  id: string;
  pos: THREE.Vector3;
  usePos: THREE.Vector3;
  seatPos: THREE.Vector3;
  group: THREE.Group;
  cooldown: number;           // seconds until it can re-seat
  guest: number | null;       // customer id seated here
}

export interface DiningBuild {
  group: THREE.Group;
  tables: TableRuntime[];
  doorPos: THREE.Vector3;
}

export function buildDining(): DiningBuild {
  const M = MATS();
  const group = new THREE.Group();
  const topMat = M.counterTop as THREE.Material;
  const legMat = M.tableLeg as THREE.Material;
  const stoolMat = M.bamboo as THREE.Material;

  const legGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.6, 6);
  const stoolGeo = new THREE.CylinderGeometry(0.19, 0.22, 0.4, 10);
  const potGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.09, 8);
  const leafGeo = new THREE.SphereGeometry(0.055, 7, 6);

  const tables: TableRuntime[] = [];
  for (const t of TABLES) {
    const { x, z } = cellToWorld(t.pos[0], t.pos[1]);
    const use = cellToWorld(t.use[0], t.use[1]);
    const seat = cellToWorld(t.seat[0], t.seat[1]);
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 1.05), topMat);
    top.position.y = 0.62;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    for (const [lx, lz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.3, lz);
      leg.castShadow = true;
      g.add(leg);
    }
    for (const s of [-0.85, 0.85]) {
      const stool = new THREE.Mesh(stoolGeo, stoolMat);
      stool.position.set(s, 0.2, 0);
      stool.castShadow = true;
      g.add(stool);
    }
    const pot = new THREE.Mesh(potGeo, M.clay as THREE.Material);
    pot.position.set(0.25, 0.69, -0.2);
    g.add(pot);
    const leaf = new THREE.Mesh(leafGeo, M.leaf as THREE.Material);
    leaf.position.set(0.25, 0.76, -0.2);
    g.add(leaf);

    group.add(g);
    tables.push({
      id: t.id,
      pos: new THREE.Vector3(x, 0.65, z),
      usePos: new THREE.Vector3(use.x, 0, use.z),
      seatPos: new THREE.Vector3(seat.x, 0, seat.z),
      group: g, cooldown: 0, guest: null,
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
  // dark opening behind the frame
  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }),
  );
  opening.position.set(d.x, 1.05, -4.52);
  group.add(opening);
  // warm light spill on the floor in front of the door
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

  return { group, tables, doorPos };
}
