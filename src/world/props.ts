// Yunnan-flavour dressing: chili strings, pottery, tie-dye banner, dried
// mushroom baskets, pendant lamp hardware. Shared MATS → merges cheaply.

import * as THREE from 'three';
import { cellToWorld } from './layout.ts';
import { MATS } from '../core/materials.ts';

export interface PropsBuild {
  group: THREE.Group;
  pendantPos: THREE.Vector3[];   // bulb positions for point lights + cones
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

  // ---- left-wall L decor: baskets / clay pots / steamers (x=0, z=4..6) ----
  const bamboo = M.bamboo as THREE.Material;
  const bodyMat = M.counterBody as THREE.Material;
  const topMat = M.counterTop as THREE.Material;
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
    if (i === 0) {
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.2, 10), bamboo);
      basket.position.set(x, 0.8, z);
      group.add(basket);
      for (let m = 0; m < 6; m++) {
        const sh = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 5), M.shroom as THREE.Material,
        );
        sh.position.set(
          x + ((m * 41) % 5 - 2) * 0.05,
          0.9 + (m % 2) * 0.03,
          z + ((m * 29) % 5 - 2) * 0.05,
        );
        sh.scale.y = 0.55;
        group.add(sh);
      }
    } else if (i === 1) {
      const clay = M.clay as THREE.Material;
      for (const [px, pz, s] of [[-0.12, -0.1, 1], [0.15, 0.12, 0.8], [0.14, -0.18, 0.65]] as const) {
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 10, 8), clay);
        pot.position.set(x + px, 0.8, z + pz);
        pot.scale.y = 1.15;
        pot.castShadow = true;
        group.add(pot);
      }
    } else {
      for (let s = 0; s < 3; s++) {
        const steamer = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 12), bamboo);
        steamer.position.set(x, 0.75 + s * 0.09, z);
        steamer.castShadow = true;
        group.add(steamer);
      }
    }
  }

  // ---- a stray crate by the door (market feel) ----
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), bamboo);
  const dp = cellToWorld(1.8, 0.4);
  crate.position.set(dp.x, 0.15, dp.z);
  crate.rotation.y = 0.4;
  crate.castShadow = true;
  group.add(crate);

  return { group, pendantPos };
}
