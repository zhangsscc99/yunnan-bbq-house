// Yunnan-flavour dressing: chili strings, pottery, tie-dye banner, woven
// bamboo baskets, pendant lamp hardware. Shared MATS → merges cheaply.

import * as THREE from 'three';
import { cellToWorld } from './layout.ts';
import { MATS } from '../core/materials.ts';
import { mergeStatic } from '../core/merge.ts';

export interface PropsBuild {
  group: THREE.Group;
  pendantPos: THREE.Vector3[];   // bulb positions for point lights + cones
  decorGroup: THREE.Group;       // left-wall shelf items (empty baskets / clay pots)
}

export function buildProps(): PropsBuild {
  const M = MATS();
  const group = new THREE.Group();
  const pendantPos: THREE.Vector3[] = [];

  // ---- hanging chili strings on the back wall ----
  const chiliGeo = new THREE.PlaneGeometry(0.34, 1.1);
  for (const cx of [-1.8, -1.35, -0.9, 6.6, 7.05]) {
    const strand = new THREE.Mesh(chiliGeo, M.chili as THREE.Material);
    strand.position.set(cx - 0.5, 1.85, -4.88);
    group.add(strand);
  }

  // ---- tie-dye banner swag across the dining wall ----
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.0, 24, 4),
    M.tiedye as THREE.Material,
  );
  const posAttr = cloth.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    posAttr.setY(i, posAttr.getY(i) - Math.cos((x / 3.4) * Math.PI) * 0.28 + 0.28);
  }
  cloth.position.set(-3.2, 2.15, -4.86);
  group.add(cloth);

  // ---- pendant lamps over the dining tables ----
  const cordGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.2, 5);
  const shadeGeo = new THREE.ConeGeometry(0.3, 0.24, 14, 1, true);
  const bulbGeo = new THREE.SphereGeometry(0.07, 10, 8);
  for (const lx of [-1.4, 0.6, 2.6]) {
    const lxWorld = lx + 1.2;
    const cord = new THREE.Mesh(cordGeo, M.cord as THREE.Material);
    cord.position.set(lxWorld, 3.1, -2.9);
    group.add(cord);
    const shade = new THREE.Mesh(shadeGeo, M.shade as THREE.Material);
    shade.position.set(lxWorld, 2.52, -2.9);
    group.add(shade);
    const bulb = new THREE.Mesh(bulbGeo, M.bulb as THREE.Material);
    bulb.position.set(lxWorld, 2.44, -2.9);
    group.add(bulb);
    pendantPos.push(new THREE.Vector3(lxWorld, 2.4, -2.9));
  }

  // ---- left-wall L decor: muted empty bamboo baskets & earthenware clay pots (x=0, z=4..6) ----
  const bamboo = M.bamboo as THREE.Material;
  const decorBamboo = M.decorBamboo as THREE.Material;
  const decorClay = M.decorClay as THREE.Material;
  const decorDark = M.decorDark as THREE.Material;
  const bodyMat = M.counterBody as THREE.Material;
  const topMat = M.counterTop as THREE.Material;
  const decorGroup = new THREE.Group();

  const addEmptyBasket = (cx: number, cy: number, cz: number, topR: number, botR: number, h: number): void => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(topR, botR, h, 12), decorBamboo);
    body.position.set(cx, cy + h / 2, cz);
    body.castShadow = true;
    body.receiveShadow = true;
    decorGroup.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(topR - 0.01, 0.02, 6, 14), decorBamboo);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, cy + h, cz);
    decorGroup.add(rim);
    const hollow = new THREE.Mesh(new THREE.CircleGeometry(topR - 0.024, 12), decorDark);
    hollow.rotation.x = -Math.PI / 2;
    hollow.position.set(cx, cy + h + 0.004, cz);
    group.add(hollow);
  };

  const addClayPot = (cx: number, cy: number, cz: number, r: number, h: number): void => {
    const belly = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), decorClay);
    belly.position.set(cx, cy + h * 0.46, cz);
    belly.scale.y = h / (2 * r);
    belly.castShadow = true;
    belly.receiveShadow = true;
    decorGroup.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.56, r * 0.45, 10), decorClay);
    neck.position.set(cx, cy + h * 0.88, cz);
    decorGroup.add(neck);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, r * 0.09, 6, 12), decorClay);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(cx, cy + h * 1.05, cz);
    decorGroup.add(lip);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(r * 0.44, 10), decorDark);
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.set(cx, cy + h * 1.07, cz);
    group.add(mouth);
  };

  for (let i = 0; i < 3; i++) {
    const { x, z } = cellToWorld(0, 4 + i);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.66, 0.8), bodyMat);
    counter.position.set(x, 0.33, z);
    counter.castShadow = true;
    counter.receiveShadow = true;
    group.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, 0.88), topMat);
    top.position.set(x, 0.68, z);
    group.add(top);
    const shelfY = 0.705;
    if (i === 0) {
      addEmptyBasket(x - 0.05, shelfY, z - 0.08, 0.21, 0.16, 0.17);
      addEmptyBasket(x + 0.14, shelfY, z + 0.2, 0.13, 0.1, 0.12);
    } else if (i === 1) {
      addClayPot(x - 0.12, shelfY, z - 0.1, 0.13, 0.25);
      addClayPot(x + 0.15, shelfY, z + 0.14, 0.105, 0.21);
      addClayPot(x + 0.13, shelfY, z - 0.18, 0.085, 0.17);
    } else {
      addEmptyBasket(x - 0.04, shelfY, z + 0.06, 0.22, 0.17, 0.12);
      addClayPot(x + 0.16, shelfY, z - 0.22, 0.09, 0.18);
    }
  }

  mergeStatic(decorGroup);
  decorGroup.userData.noMerge = true;
  decorGroup.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.userData.decorItem = true;
  });
  group.add(decorGroup);

  // ---- a stray crate by the door (market feel) ----
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), bamboo);
  const dp = cellToWorld(1.8, 0.4);
  crate.position.set(dp.x, 0.15, dp.z);
  crate.rotation.y = 0.4;
  crate.castShadow = true;
  group.add(crate);

  return { group, pendantPos, decorGroup };
}
