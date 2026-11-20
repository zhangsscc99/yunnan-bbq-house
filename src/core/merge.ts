// Static-geometry merge: collapses a group's meshes into a few draws per
// material. Kitchen/dining/props are built once and never move, so this is
// the main draw-call saver (see TECH-STACK §3).
//
// Safety rules: batches are capped (MAX_VERTS) so no single buffer gets huge,
// shadow flags are preserved per mesh (transparent materials never cast), and
// a batch that fails to merge keeps its original meshes instead of vanishing.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MAX_VERTS = 40000;
const KEEP = ['position', 'normal', 'uv'];

interface Entry { mesh: THREE.Mesh; geo: THREE.BufferGeometry; verts: number }

function normalise(src: THREE.BufferGeometry, world: THREE.Matrix4): THREE.BufferGeometry {
  const geo = src.clone().applyMatrix4(world);
  for (const name of Object.keys(geo.attributes)) {
    if (!KEEP.includes(name)) geo.deleteAttribute(name);
  }
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  }
  if (!geo.index) {
    const n = geo.attributes.position.count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  geo.clearGroups();
  return geo;
}

export function mergeStatic(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; list: Entry[] }>();
  const matIds = new Map<THREE.Material, number>();

  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (mats.length !== 1) return;           // leave multi-material meshes alone
    const mat = mats[0];
    if (!matIds.has(mat)) matIds.set(mat, matIds.size);
    const cast = mesh.castShadow && !mat.transparent;
    const recv = mesh.receiveShadow;
    const key = `${matIds.get(mat)}|${+cast}|${+recv}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat, cast, recv, list: [] }));
    const geo = normalise(mesh.geometry, mesh.matrixWorld);
    b.list.push({ mesh, geo, verts: geo.attributes.position.count });
  });

  for (const { mat, cast, recv, list } of buckets.values()) {
    let batch: Entry[] = [];
    let verts = 0;
    const flush = (): void => {
      if (!batch.length) return;
      const merged = mergeGeometries(batch.map((e) => e.geo), false);
      if (merged) {
        for (const e of batch) { e.mesh.parent?.remove(e.mesh); e.geo.dispose(); }
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = cast;
        mesh.receiveShadow = recv;
        group.add(mesh);
      } else {
        console.warn(`mergeStatic: batch of ${batch.length} failed, keeping originals`);
        for (const e of batch) e.geo.dispose();
      }
      batch = [];
      verts = 0;
    };
    for (const e of list) {
      if (verts + e.verts > MAX_VERTS) flush();
      batch.push(e);
      verts += e.verts;
    }
    flush();
  }
}
