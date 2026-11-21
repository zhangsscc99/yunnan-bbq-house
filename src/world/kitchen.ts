// Builds the room shell + all kitchen stations. Returns runtime station
// objects the game layer drives. All materials come from core/materials.ts
// so mergeStatic can collapse the whole room into ~30 draws.

import * as THREE from 'three';
import { GRID, DISHES } from '../config.ts';
import { STATIONS, cellToWorld } from './layout.ts';
import type { StationDef } from './layout.ts';
import type { StationRuntime } from '../game/types.ts';
import { MATS } from '../core/materials.ts';

export interface KitchenBuild {
  group: THREE.Group;
  stations: StationRuntime[];
  grillSlots: THREE.Vector3[];   // 3 skewer anchor points on the grill
  grillLightPos: THREE.Vector3[]; // where charcoal point lights hang
  emberMat: THREE.MeshStandardMaterial; // pulsed by grill heat
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
    new THREE.PlaneGeometry(GRID.cols + 6, GRID.rows + 8),
    M.floor as THREE.Material,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -1.5);
  floor.receiveShadow = true;
  g.add(floor);

  // back wall (screen top) and near wall behind the counters
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.cols + 6, WALL_H), M.wall as THREE.Material,
  );
  backWall.position.set(0, WALL_H / 2, -GRID.rows / 2 - 0.55);
  backWall.receiveShadow = true;
  g.add(backWall);

  const nearWall = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.cols + 6, WALL_H), M.wall as THREE.Material,
  );
  nearWall.position.set(0, WALL_H / 2, GRID.rows / 2 + 0.9);
  nearWall.rotation.y = Math.PI;
  g.add(nearWall);

  const sideGeo = new THREE.PlaneGeometry(GRID.rows + 8, WALL_H);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(sideGeo, M.wall as THREE.Material);
    w.position.set(s * (GRID.cols / 2 + 0.55), WALL_H / 2, -1.2);
    w.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(w);
  }

  // green-tile eave strip along back wall (青瓦檐 hint)
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(GRID.cols + 6, 0.14, 0.5), M.eave as THREE.Material,
  );
  eave.position.set(0, WALL_H + 0.07, -GRID.rows / 2 - 0.45);
  eave.rotation.x = 0.25;
  g.add(eave);
}

// one 1m counter module: body + top slab
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

function buildCrate(dish: StationDef['dish'], M: ReturnType<typeof MATS>): THREE.Group {
  const g = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), M.bamboo as THREE.Material);
  bin.position.y = 0.11;
  bin.castShadow = true;
  g.add(bin);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), M.dark as THREE.Material);
  dark.rotation.x = -Math.PI / 2;
  dark.position.y = 0.2;
  g.add(dark);
  // skewers poking out
  const dishId = dish ?? 'pork';
  const m = new THREE.MeshStandardMaterial({ color: DISHES[dishId].hue, roughness: 0.6 });
  const stick = new THREE.CylinderGeometry(0.006, 0.006, 0.3, 5);
  for (let i = 0; i < 5; i++) {
    const sk = new THREE.Group();
    const st = new THREE.Mesh(stick, M.stick as THREE.Material);
    st.position.y = 0.15;
    sk.add(st);
    for (let j = 0; j < 3; j++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.045), m);
      cube.position.y = 0.05 + j * 0.05;
      sk.add(cube);
    }
    sk.position.set(((i * 37) % 5 - 2) * 0.05, 0.1, ((i * 23) % 5 - 2) * 0.05);
    sk.rotation.z = ((i % 3) - 1) * 0.18;
    sk.rotation.x = ((i % 2) - 0.5) * 0.15;
    g.add(sk);
  }
  return g;
}

export function buildKitchen(): KitchenBuild {
  const M = MATS();
  const group = new THREE.Group();
  const stations: StationRuntime[] = [];
  buildRoom(group, M);

  const bodyMat = M.counterBody as THREE.Material;
  const topMat = M.counterTop as THREE.Material;

  const grillSlots: THREE.Vector3[] = [];
  const grillLightPos: THREE.Vector3[] = [];

  for (const s of STATIONS) {
    const cx = s.cells.reduce((a, c) => a + c[0], 0) / s.cells.length;
    const cz = s.cells.reduce((a, c) => a + c[1], 0) / s.cells.length;
    const w = s.cells.length;
    const { x, z } = cellToWorld(cx, cz);
    const use = cellToWorld(s.use[0], s.use[1]);

    const mod = counterModule(w, bodyMat, topMat);
    mod.position.set(x, 0, z);
    group.add(mod);

    const rt: StationRuntime = {
      id: s.id, kind: s.kind, dish: s.dish, label: s.label,
      pos: new THREE.Vector3(x, COUNTER_H, z),
      usePos: new THREE.Vector3(use.x, 0, use.z),
      mesh: mod, topY: COUNTER_H,
      held: null, chopLeft: 0,
    };

    switch (s.kind) {
      case 'crate': {
        const crate = buildCrate(s.dish, M);
        crate.position.set(x, COUNTER_H, z);
        group.add(crate);
        break;
      }
      case 'chop': {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.03, 0.4), M.board as THREE.Material,
        );
        board.position.set(x - 0.4, COUNTER_H + 0.015, z);
        board.castShadow = true;
        group.add(board);
        const cleaver = new THREE.Group();
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.2, 0.012), M.cleaverBlade as THREE.Material,
        );
        const grip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), M.cleaverGrip as THREE.Material,
        );
        grip.position.y = 0.15;
        cleaver.add(blade, grip);
        cleaver.rotation.z = -0.9;
        cleaver.position.set(x + 0.45, COUNTER_H + 0.12, z - 0.08);
        group.add(cleaver);
        break;
      }
      case 'grill': {
        const bed = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.2, 0.1, 0.5), M.ember as THREE.Material,
        );
        bed.position.set(x, COUNTER_H - 0.02, z);
        group.add(bed);
        const barGeo = new THREE.CylinderGeometry(0.008, 0.008, w - 0.15, 5);
        for (let b = 0; b < 8; b++) {
          const bar = new THREE.Mesh(barGeo, M.grillBar as THREE.Material);
          bar.rotation.z = Math.PI / 2;
          bar.position.set(x, COUNTER_H + 0.05, z - 0.21 + b * 0.06);
          group.add(bar);
        }
        for (let i = 0; i < 3; i++) {
          const sx = x + (i - 1) * (w / 3);
          grillSlots.push(new THREE.Vector3(sx, COUNTER_H + 0.09, z));
          grillLightPos.push(new THREE.Vector3(sx, COUNTER_H, z));
        }
        break;
      }
      case 'plate': {
        for (let i = 0; i < 4; i++) {
          const p = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.1, 0.02, 16), M.plate as THREE.Material,
          );
          p.position.set(x - 0.35, COUNTER_H + 0.012 + i * 0.022, z - 0.05);
          p.castShadow = true;
          group.add(p);
        }
        const tray = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.03, 0.34), M.bamboo as THREE.Material,
        );
        tray.position.set(x + 0.3, COUNTER_H + 0.015, z);
        tray.castShadow = true;
        group.add(tray);
        break;
      }
      case 'bin': {
        const bin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.22, 0.55, 12), M.bin as THREE.Material,
        );
        bin.position.set(x, COUNTER_H + 0.28, z);
        bin.castShadow = true;
        group.add(bin);
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.02, 6, 14), M.binRim as THREE.Material,
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(x, COUNTER_H + 0.55, z);
        group.add(rim);
        break;
      }
      default:
        break;
    }
    stations.push(rt);
  }

  return {
    group, stations, grillSlots, grillLightPos,
    emberMat: M.ember as THREE.MeshStandardMaterial,
  };
}
