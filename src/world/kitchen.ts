// Builds the room shell, decorative back counter, and the v2 Pass Window (出菜窗口)
// with 3 tray slots and an animated background NPC prep chef silhouette.
// Legacy bin / chop / plate / crate interactive stations are removed per GAME-DESIGN §0/§1 v2.

import * as THREE from 'three';
import { GRID } from '../config.ts';
import { PASS_STATION, cellToWorld } from './layout.ts';
import type { StationRuntime } from '../game/types.ts';
import { MATS } from '../core/materials.ts';
import { buildChibi } from '../game/player.ts';

export interface KitchenBuild {
  group: THREE.Group;
  stations: StationRuntime[];      // Pass window only
  passStation: StationRuntime;
  passSlots: THREE.Vector3[];      // 3 tray anchor points on the Pass counter
  passLightPos: THREE.Vector3;     // warm overhead light over the Pass window
  passHitbox: THREE.Mesh;          // raycastable area for 3D Pass taps
  prepNpc: THREE.Group;            // background NPC prep chef silhouette behind Pass
}

const WALL_H = 2.6;
const COUNTER_H = 0.72;
export const COUNTER_D = 0.82;

function box(
  w: number, h: number, d: number,
  mat: THREE.Material, x = 0, y = 0, z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildRoom(g: THREE.Group, M: ReturnType<typeof MATS>): void {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.cols + 6, GRID.rows + 10),
    M.floor as THREE.Material,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -0.5);
  floor.receiveShadow = true;
  g.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.cols + 6, WALL_H), M.wall as THREE.Material,
  );
  backWall.position.set(0, WALL_H / 2, -GRID.rows / 2 - 0.55);
  backWall.receiveShadow = true;
  g.add(backWall);

  const nearWall = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.cols + 6, WALL_H), M.wall as THREE.Material,
  );
  nearWall.position.set(0, WALL_H / 2, GRID.rows / 2 + 1.4);
  nearWall.rotation.y = Math.PI;
  g.add(nearWall);

  const sideGeo = new THREE.PlaneGeometry(GRID.rows + 10, WALL_H);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(sideGeo, M.wall as THREE.Material);
    w.position.set(s * (GRID.cols / 2 + 0.55), WALL_H / 2, -0.5);
    w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(w);
  }

  // green-tile eave strip along back wall (青瓦檐)
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(GRID.cols + 6, 0.14, 0.5), M.eave as THREE.Material,
  );
  eave.position.set(0, WALL_H + 0.07, -GRID.rows / 2 - 0.45);
  eave.rotation.x = 0.25;
  g.add(eave);
}

function counterModule(
  w: number,
  bodyMat: THREE.Material,
  topMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w - 0.06, COUNTER_H - 0.06, COUNTER_D - 0.06, bodyMat, 0, (COUNTER_H - 0.06) / 2, 0));
  const top = box(w, 0.06, COUNTER_D, topMat, 0, COUNTER_H - 0.03, 0);
  top.receiveShadow = true;
  g.add(top);
  return g;
}

export function buildKitchen(): KitchenBuild {
  const M = MATS();
  const group = new THREE.Group();
  buildRoom(group, M);

  const bodyMat = M.counterBody as THREE.Material;
  const topMat = M.counterTop as THREE.Material;

  // ---- decorative flanking counters (scenery only, non-interactive) ----
  const leftCounter = counterModule(5, bodyMat, topMat);
  const leftPos = cellToWorld(2, 7);
  leftCounter.position.set(leftPos.x, 0, leftPos.z);
  group.add(leftCounter);

  const rightCounter = counterModule(4, bodyMat, topMat);
  const rightPos = cellToWorld(9.5, 7);
  rightCounter.position.set(rightPos.x, 0, rightPos.z);
  group.add(rightCounter);

  // decorative Yunnan pottery & stacked bowls on flanking counters (non-interactive scenery)
  for (const [cx, r, h] of [[1.0, 0.16, 0.3], [2.4, 0.13, 0.24], [9.2, 0.15, 0.28]] as const) {
    const p = cellToWorld(cx, 7);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, h, 10), M.decorClay as THREE.Material);
    jar.position.set(p.x, COUNTER_H + h / 2, p.z);
    jar.castShadow = true;
    group.add(jar);
  }
  const stackPos = cellToWorld(10.3, 7);
  for (let i = 0; i < 4; i++) {
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.1, 0.02, 14), M.plate as THREE.Material,
    );
    dish.position.set(stackPos.x, COUNTER_H + 0.012 + i * 0.022, stackPos.z);
    group.add(dish);
  }

  // ---- Pass Window (出菜窗口): 3 cells wide at x=5..7, z=7 ----
  const cx = PASS_STATION.cells.reduce((a, c) => a + c[0], 0) / PASS_STATION.cells.length;
  const cz = PASS_STATION.cells.reduce((a, c) => a + c[1], 0) / PASS_STATION.cells.length;
  const passW = PASS_STATION.cells.length;
  const { x, z } = cellToWorld(cx, cz);
  const use = cellToWorld(PASS_STATION.use[0], PASS_STATION.use[1]);

  const passMod = counterModule(passW, bodyMat, topMat);
  passMod.position.set(x, 0, z);
  group.add(passMod);

  // Brass front trim strip + 2 side window posts with warm pass lamps
  group.add(box(passW + 0.04, 0.055, 0.06, M.passTrim as THREE.Material, x, COUNTER_H - 0.02, z - COUNTER_D / 2 - 0.01));
  for (const sx of [-1, 1]) {
    const px = x + sx * (passW / 2 - 0.06);
    group.add(box(0.1, 0.56, 0.1, M.doorWood as THREE.Material, px, COUNTER_H + 0.28, z + 0.28));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), M.passLamp as THREE.Material);
    lamp.position.set(px, COUNTER_H + 0.6, z + 0.28);
    group.add(lamp);
  }

  // Tilted signboard ("出菜窗口") along the dining-side top lip of the Pass counter (never occluded by NPC chef)
  const signBack = box(1.26, 0.28, 0.03, M.doorWood as THREE.Material, x, COUNTER_H + 0.05, z - COUNTER_D / 2 - 0.02);
  signBack.rotation.x = -0.78;
  group.add(signBack);
  const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.24), M.passSign as THREE.Material);
  signPlane.position.set(x, COUNTER_H + 0.065, z - COUNTER_D / 2 - 0.005);
  signPlane.rotation.x = -0.78;
  group.add(signPlane);

  // 3 tray pads on top of the Pass counter
  const passSlots: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    const sx = x + (i - 1) * 0.88;
    const pad = box(0.62, 0.018, 0.44, M.passSlotMat as THREE.Material, sx, COUNTER_H + 0.009, z - 0.04);
    group.add(pad);
    const rim = box(0.66, 0.01, 0.48, M.passTrim as THREE.Material, sx, COUNTER_H + 0.004, z - 0.04);
    group.add(rim);
    passSlots.push(new THREE.Vector3(sx, COUNTER_H + 0.025, z - 0.04));
  }

  // Raycastable hitbox over the Pass counter (kept unmerged)
  const passHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(passW, 0.6, COUNTER_D + 0.2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  passHitbox.position.set(x, COUNTER_H + 0.25, z);
  passHitbox.userData.noMerge = true;
  passHitbox.userData.passHit = true;
  group.add(passHitbox);

  // NPC prep chef silhouette standing right behind the Pass counter
  const prepNpc = buildChibi({
    skin: 0x6a584c,
    shirt: 0x26201c,
    apron: 0x4a3a2e,
    hat: 'chef',
  });
  prepNpc.position.set(x, 0, z + 0.72);
  prepNpc.rotation.y = Math.PI; // face -z toward the dining room
  prepNpc.userData.noMerge = true;
  group.add(prepNpc);

  const passStation: StationRuntime = {
    id: PASS_STATION.id,
    kind: 'pass',
    label: PASS_STATION.label,
    pos: new THREE.Vector3(x, COUNTER_H, z),
    usePos: new THREE.Vector3(use.x, 0, use.z),
    mesh: passMod,
    topY: COUNTER_H,
  };

  return {
    group,
    stations: [passStation],
    passStation,
    passSlots,
    passLightPos: new THREE.Vector3(x, COUNTER_H + 0.75, z),
    passHitbox,
    prepNpc,
  };
}
