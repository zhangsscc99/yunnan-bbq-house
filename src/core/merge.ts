// Static-geometry merge: collapses a group's meshes into one draw per
// material. Kitchen/dining/props are built once and never move, so this is
// the main draw-call saver (see TECH-STACK §3).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const doomed: THREE.Mesh[] = [];

  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (mats.length !== 1) return;           // leave multi-material meshes alone
    const mat = mats[0];
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const list = byMat.get(mat);
    if (list) list.push(geo);
    else byMat.set(mat, [geo]);
    doomed.push(mesh);
  });

  for (const m of doomed) {
    m.parent?.remove(m);
  }

  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}
