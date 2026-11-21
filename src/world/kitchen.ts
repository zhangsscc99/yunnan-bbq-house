// Builds the room shell + all kitchen stations. Returns runtime station
// objects the game layer drives. All materials come from core/materials.ts
// so mergeStatic can collapse the whole room into ~30 draws.

import * as THREE from 'three';
import { GRID } from '../config.ts';
import type { DishId } from '../config.ts';
import { STATIONS, cellToWorld } from './layout.ts';
import type { StationDef } from './layout.ts';
import type { StationRuntime } from '../game/types.ts';
import { MATS } from '../core/materials.ts';
import { mergeStatic } from '../core/merge.ts';

export interface CrateFoodRoot {
  id: string;
  food: DishId;
  node: THREE.Group;
  crateW: number;
  crateD: number;
}

export interface KitchenBuild {
  group: THREE.Group;
  stations: StationRuntime[];
  grillSlots: THREE.Vector3[];   // 3 skewer anchor points on the grill
  grillLightPos: THREE.Vector3[]; // where charcoal point lights hang
  emberMat: THREE.MeshStandardMaterial; // pulsed by grill heat
  foodRoots: CrateFoodRoot[];
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

const CRATE_W = 0.68;
const CRATE_D = 0.56;
const SIGN_TILE: Record<DishId, number> = { pork: 0, mushroom: 1, mixian: 2 };

function buildCrate(
  stationId: string,
  dish: StationDef['dish'],
  M: ReturnType<typeof MATS>,
): { crate: THREE.Group; foodRoot: CrateFoodRoot } {
  const dishId: DishId = dish ?? 'pork';
  const g = new THREE.Group();

  // open-top bamboo crate: lower body + dark interior liner + 4 low rim walls
  const bamboo = M.bamboo as THREE.Material;
  const baseH = 0.13;
  const rimH = 0.055;
  const rimT = 0.045;
  const base = box(CRATE_W, baseH, CRATE_D, bamboo, 0, baseH / 2, 0);
  g.add(base);
  const dark = new THREE.Mesh(
    new THREE.PlaneGeometry(CRATE_W - rimT * 1.8, CRATE_D - rimT * 1.8),
    M.dark as THREE.Material,
  );
  dark.rotation.x = -Math.PI / 2;
  dark.position.y = baseH + 0.003;
  g.add(dark);
  const rimY = baseH + rimH / 2;
  g.add(box(CRATE_W, rimH, rimT, bamboo, 0, rimY, -(CRATE_D - rimT) / 2));
  g.add(box(CRATE_W, rimH, rimT, bamboo, 0, rimY, (CRATE_D - rimT) / 2));
  g.add(box(rimT, rimH, CRATE_D - rimT * 2, bamboo, -(CRATE_W - rimT) / 2, rimY, 0));
  g.add(box(rimT, rimH, CRATE_D - rimT * 2, bamboo, (CRATE_W - rimT) / 2, rimY, 0));

  // front-edge inline canvas ingredient sign (tilted slightly toward the 50° camera)
  const placard = new THREE.Group();
  placard.position.set(0, 0.128, CRATE_D / 2 + 0.044);
  placard.rotation.x = -0.34;
  const back = box(0.48, 0.23, 0.016, M.counterBody as THREE.Material, 0, 0, -0.009);
  placard.add(back);
  const signGeo = new THREE.PlaneGeometry(0.46, 0.215);
  const tileIdx = SIGN_TILE[dishId];
  const u0 = tileIdx / 3;
  const u1 = (tileIdx + 1) / 3;
  const uv = signGeo.attributes.uv as THREE.BufferAttribute;
  uv.setXY(0, u0, 1);
  uv.setXY(1, u1, 1);
  uv.setXY(2, u0, 0);
  uv.setXY(3, u1, 0);
  const signMesh = new THREE.Mesh(signGeo, M.crateSign as THREE.Material);
  placard.add(signMesh);
  g.add(placard);

  // per-dish distinct 3D food model covering >=60% of the crate top width
  const foodGroup = new THREE.Group();
  let primaryMat: THREE.Material;

  if (dishId === 'pork') {
    // 3 diagonal raw pork-belly skewers: lean #e8907c + fat stripe #f5d0b8
    primaryMat = M.cratePorkLean as THREE.Material;
    const fatMat = M.cratePorkFat as THREE.Material;
    const stickMat = M.stick as THREE.Material;
    const stickGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.44, 6);
    const leanGeo = new THREE.BoxGeometry(0.112, 0.086, 0.098);
    const fatGeo = new THREE.BoxGeometry(0.115, 0.022, 0.068);
    for (let i = 0; i < 3; i++) {
      const sk = new THREE.Group();
      const st = new THREE.Mesh(stickGeo, stickMat);
      st.castShadow = true;
      sk.add(st);
      for (let j = -1; j <= 1; j++) {
        const y = j * 0.112;
        const lean = new THREE.Mesh(leanGeo, primaryMat);
        lean.position.set(0, y, 0);
        lean.castShadow = true;
        lean.receiveShadow = true;
        sk.add(lean);
        const fat = new THREE.Mesh(fatGeo, fatMat);
        fat.position.set(0, y + 0.032, 0.022);
        fat.castShadow = true;
        sk.add(fat);
      }
      sk.position.set((i - 1) * 0.17, 0.225, (i === 1 ? -0.015 : 0.015));
      sk.rotation.set(0.22, (i - 1) * 0.08, -0.46);
      foodGroup.add(sk);
    }
  } else if (dishId === 'mushroom') {
    // cluster of 6 round-cap wild mushrooms: brown #a97b4f caps + cream-white stems
    primaryMat = M.crateMushCap as THREE.Material;
    const stemMat = M.crateMushStem as THREE.Material;
    const caps: readonly [number, number, number, number, number, number][] = [
      // [x, z, capR, stemH, tiltX, tiltZ]
      [-0.17, -0.07, 0.108, 0.145, -0.22,  0.34],
      [ 0.01, -0.10, 0.120, 0.165, -0.26, -0.08],
      [ 0.17, -0.05, 0.104, 0.145, -0.20, -0.36],
      [-0.15,  0.09, 0.098, 0.135,  0.32,  0.30],
      [ 0.02,  0.09, 0.110, 0.150,  0.35,  0.04],
      [ 0.17,  0.10, 0.094, 0.135,  0.30, -0.32],
    ];
    for (const [mx, mz, capR, stemH, tx, tz] of caps) {
      const sh = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(capR * 0.36, capR * 0.48, stemH, 8),
        stemMat,
      );
      stem.position.y = stemH / 2;
      stem.castShadow = true;
      sh.add(stem);

      const gill = new THREE.Mesh(
        new THREE.CylinderGeometry(capR * 0.92, capR * 0.42, 0.02, 10),
        stemMat,
      );
      gill.position.y = stemH - 0.008;
      sh.add(gill);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(capR, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
        primaryMat,
      );
      cap.scale.set(1, 0.72, 1);
      cap.position.y = stemH - 0.005;
      cap.castShadow = true;
      cap.receiveShadow = true;
      sh.add(cap);

      sh.position.set(mx, baseH + 0.01, mz);
      sh.rotation.set(tx, 0, tz);
      foodGroup.add(sh);
    }
  } else {
    // coiled golden rice-noodle skein (#e8c96a)
    primaryMat = M.crateMixian as THREE.Material;
    const coils: readonly [number, number, number, number, number, number, number, number][] = [
      // [radius, tube, x, y, z, rx, ry, arc]
      [0.228, 0.032,  0.000, 0.185,  0.000, Math.PI / 2,        0.00, Math.PI * 2],
      [0.195, 0.030, -0.022, 0.220,  0.016, Math.PI / 2 + 0.16, 0.14, Math.PI * 2],
      [0.148, 0.028,  0.024, 0.255, -0.016, Math.PI / 2 - 0.18, -0.15, Math.PI * 2],
      [0.090, 0.026,  0.000, 0.285,  0.008, Math.PI / 2 + 0.12, 0.08, Math.PI * 2],
      [0.044, 0.022,  0.000, 0.300,  0.000, Math.PI / 2 - 0.08, 0.00, Math.PI * 2],
      [0.168, 0.024, -0.015, 0.275,  0.012, Math.PI / 2 + 0.28, 0.55, Math.PI * 1.45],
      [0.162, 0.024,  0.018, 0.280, -0.014, Math.PI / 2 - 0.26, 3.50, Math.PI * 1.45],
    ];
    for (const [r, tube, cx, cy, cz, rx, ry, arc] of coils) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20, arc), primaryMat);
      m.position.set(cx, cy, cz);
      m.rotation.set(rx, ry, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      foodGroup.add(m);
    }
  }

  // merge locally within foodGroup (still at origin) so each crate's food stays
  // intact in the scene graph with userData.food while using <=3 draw calls
  mergeStatic(foodGroup);
  foodGroup.userData.food = dishId;
  foodGroup.userData.crateId = stationId;
  foodGroup.userData.noMerge = true;
  foodGroup.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.userData.food = dishId;
    if (mesh.material === primaryMat) mesh.userData.foodPrimary = true;
  });

  g.add(foodGroup);
  return {
    crate: g,
    foodRoot: { id: stationId, food: dishId, node: foodGroup, crateW: CRATE_W, crateD: CRATE_D },
  };
}

export function buildKitchen(): KitchenBuild {
  const M = MATS();
  const group = new THREE.Group();
  const stations: StationRuntime[] = [];
  const foodRoots: CrateFoodRoot[] = [];
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
        const { crate, foodRoot } = buildCrate(s.id, s.dish, M);
        crate.position.set(x, COUNTER_H, z);
        group.add(crate);
        foodRoots.push(foodRoot);
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
    foodRoots,
  };
}
