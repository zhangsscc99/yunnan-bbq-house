// Free GPU resources of a removed subtree. Anything flagged
// `userData.shared = true` (module-level geometries/materials/textures reused
// by many objects) is left alone.

import * as THREE from 'three';

function freeMaterial(m: THREE.Material): void {
  if (m.userData.shared) return;
  m.dispose();
}

export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh && !(o as THREE.Sprite).isSprite) return;
    if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(freeMaterial);
    else if (mat) freeMaterial(mat);
  });
}
