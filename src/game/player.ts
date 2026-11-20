// Chibi rig: head:body ≈ 1:1.6, cylinder arms, apron colour coding.
// Shared by the player (chef hat + red apron) and customers (plain clothes).

import * as THREE from 'three';
import { COLORS, PLAYER } from '../config.ts';
import { isWalkable } from '../world/layout.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Item } from './types.ts';

export interface ChibiOpts {
  skin?: number;
  apron?: number | null;   // null → plain clothes
  hat?: 'chef' | 'hair' | 'none';
  hairColor?: number;
  shirt?: number;
}

// shared blob shadow (replaces shadow-map casting on characters — cheap)
const blobGeo = new THREE.CircleGeometry(0.3, 14);
const blobMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false,
});

// merge every same-material part in place → ~7 draws per character
function collapse(parts: THREE.Group): void {
  parts.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const doomed: THREE.Mesh[] = [];
  parts.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.Material;
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const l = byMat.get(mat);
    if (l) l.push(geo); else byMat.set(mat, [geo]);
    doomed.push(m);
  });
  for (const m of doomed) m.parent?.remove(m);
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    parts.add(mesh);
  }
}

export function buildChibi(opts: ChibiOpts = {}): THREE.Group {
  const {
    skin = 0xf0c8a0,
    apron = COLORS.playerApron,
    hat = 'chef',
    hairColor = 0x3a2a1c,
    shirt = 0x8a7a68,
  } = opts;

  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });

  // body: rounded capsule torso (~0.42m)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.22, 6, 12), shirtMat);
  body.position.y = 0.42;
  g.add(body);

  if (apron !== null && apron !== undefined) {
    const apronMat = new THREE.MeshStandardMaterial({ color: apron, roughness: 0.75 });
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.05), apronMat);
    bib.position.set(0, 0.44, 0.16);
    g.add(bib);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.22, 10, 1, true), apronMat);
    skirt.position.y = 0.26;
    g.add(skirt);
  }

  // head: big sphere (≈0.42 diam → head:body ≈ 1:1.6 at total ~1.1m)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), skinMat);
  head.position.y = 0.82;
  g.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x201a16, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
    eye.position.set(s * 0.075, 0.83, 0.185);
    g.add(eye);
  }
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xe8907c, roughness: 1 });
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), blushMat);
    b.position.set(s * 0.12, 0.79, 0.16);
    b.scale.set(1, 0.6, 0.5);
    g.add(b);
  }

  if (hat === 'chef') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.7 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.08, 14), hatMat);
    brim.position.y = 0.97;
    g.add(brim);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 9), hatMat);
    puff.position.y = 1.08;
    puff.scale.y = 0.85;
    g.add(puff);
  } else if (hat === 'hair') {
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 10), hairMat);
    hair.position.y = 0.86;
    hair.scale.set(1, 0.72, 1);
    g.add(hair);
  }

  // arms: stubby cylinders on the sides, slight outward angle
  const armGeo = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.set(s * 0.21, 0.48, 0.02);
    arm.rotation.z = s * -0.35;
    g.add(arm);
  }

  // legs: two stubs
  const legGeo = new THREE.CapsuleGeometry(0.05, 0.1, 4, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(s * 0.08, 0.12, 0);
    g.add(leg);
  }

  if (!location.hash.includes('nocollapse')) {
    collapse(g);
    for (const m of g.children) if (m instanceof THREE.Mesh) m.castShadow = false;
  }

  // blob shadow — grounds the character without touching the shadow map
  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  blob.renderOrder = 1;
  g.add(blob);

  return g;
}

export class Player {
  readonly obj: THREE.Group;
  readonly carryAnchor: THREE.Group;
  carrying: Item | null = null;
  private bob = 0;
  private moving = false;
  facing = new THREE.Vector2(0, -1);

  constructor() {
    this.obj = buildChibi();
    this.carryAnchor = new THREE.Group();
    this.carryAnchor.position.set(0, 0.58, 0.3);
    this.obj.add(this.carryAnchor);
  }

  setCarrying(item: Item | null): void {
    this.carrying = item;
    this.carryAnchor.clear();
    if (item) {
      this.carryAnchor.add(item.obj);
      item.obj.position.set(0, 0, 0);
      item.obj.rotation.set(0, 0, 0);
      item.obj.scale.setScalar(1);
      // little pop so the pickup reads
      item.obj.scale.setScalar(0.01);
      const t0 = performance.now();
      const grow = (): void => {
        const k = Math.min(1, (performance.now() - t0) / 120);
        item.obj.scale.setScalar(0.6 + 0.4 * k);
        if (k < 1) requestAnimationFrame(grow);
      };
      grow();
    }
  }

  move(dir: THREE.Vector2, dt: number): void {
    this.moving = dir.lengthSq() > 0.0001;
    if (!this.moving) return;
    const step = PLAYER.speed * dt;
    const nx = this.obj.position.x + dir.x * step;
    const nz = this.obj.position.z + dir.y * step;
    // slide along walls: try full, then each axis
    if (isWalkable(nx, nz, PLAYER.radius)) {
      this.obj.position.set(nx, 0, nz);
    } else if (isWalkable(nx, this.obj.position.z, PLAYER.radius)) {
      this.obj.position.x = nx;
    } else if (isWalkable(this.obj.position.x, nz, PLAYER.radius)) {
      this.obj.position.z = nz;
    }
    this.facing.copy(dir).normalize();
    const targetRot = Math.atan2(dir.x, dir.y);
    // shortest-arc lerp on yaw
    let d = targetRot - this.obj.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.obj.rotation.y += d * Math.min(1, dt * 14);
  }

  update(dt: number): void {
    // walk bob + idle sway
    if (this.moving) {
      this.bob += dt * 11;
      this.obj.position.y = Math.abs(Math.sin(this.bob)) * 0.05;
      this.obj.rotation.z = Math.sin(this.bob) * 0.04;
    } else {
      this.obj.position.y *= 0.85;
      this.obj.rotation.z *= 0.85;
    }
  }
}
