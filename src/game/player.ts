// Chibi rig + Player controller with v2 auto-navigation (Pass window ↔ Dining tables).
// No virtual joystick — movement is driven automatically by player clicks on Pass trays / order cards.

import * as THREE from 'three';
import { COLORS, PLAYER } from '../config.ts';
import { isWalkable } from '../world/layout.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CarryingState } from './types.ts';

export interface ChibiOpts {
  skin?: number;
  apron?: number | null;   // null → plain clothes
  hat?: 'chef' | 'hair' | 'none';
  hairColor?: number;
  shirt?: number;
}

const blobGeo = new THREE.CircleGeometry(0.3, 14);
const blobMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false,
});
blobGeo.userData.shared = true;
blobMat.userData.shared = true;

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

  const armGeo = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.set(s * 0.21, 0.48, 0.02);
    arm.rotation.z = s * -0.35;
    g.add(arm);
  }

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

  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  blob.renderOrder = 1;
  g.add(blob);

  return g;
}

const TMP_DIR = new THREE.Vector2();

function segmentClear(ax: number, az: number, bx: number, bz: number): boolean {
  const steps = Math.max(4, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    if (!isWalkable(ax + (bx - ax) * k, az + (bz - az) * k, PLAYER.radius + 0.04)) return false;
  }
  return true;
}

export class Player {
  readonly obj: THREE.Group;
  readonly carryAnchor: THREE.Group;
  carrying: CarryingState | null = null;
  private bob = 0;
  private popT = 1;
  private moving = false;
  private waypoints: THREE.Vector3[] = [];
  private facePos: THREE.Vector3 | null = null;
  facing = new THREE.Vector2(0, 1);

  constructor() {
    this.obj = buildChibi();
    this.carryAnchor = new THREE.Group();
    this.carryAnchor.position.set(0, 0.56, 0.34);
    this.obj.add(this.carryAnchor);
  }

  get navTarget(): THREE.Vector3 | null {
    return this.waypoints.length ? this.waypoints[this.waypoints.length - 1] : null;
  }

  setCarrying(state: CarryingState | null): void {
    this.carrying = state;
    this.carryAnchor.clear();
    if (state) {
      this.carryAnchor.add(state.item.obj);
      state.item.obj.position.set(0, 0, 0);
      state.item.obj.rotation.set(0, 0, 0);
      state.item.obj.scale.setScalar(0.6);
      this.popT = 0;
    }
  }

  /** Command the chef to auto-walk smoothly between Pass window and dining tables. */
  walkTo(target: THREE.Vector3, lookAt?: THREE.Vector3): void {
    const px = this.obj.position.x;
    const pz = this.obj.position.z;
    this.waypoints.length = 0;
    this.facePos = lookAt ? lookAt.clone() : null;

    if (segmentClear(px, pz, target.x, target.z)) {
      this.waypoints.push(new THREE.Vector3(target.x, 0, target.z));
      return;
    }

    // Route cleanly around middle dining table (t4) via the open main aisle (z = 1.15) or central lane (x = 0.2)
    const candidates: THREE.Vector3[] = [
      new THREE.Vector3(target.x, 0, 1.15),
      new THREE.Vector3(px, 0, 1.15),
      new THREE.Vector3(0.2, 0, 1.15),
      new THREE.Vector3(0.2, 0, target.z),
    ];
    for (const wp of candidates) {
      if (
        isWalkable(wp.x, wp.z, PLAYER.radius + 0.04) &&
        segmentClear(px, pz, wp.x, wp.z) &&
        segmentClear(wp.x, wp.z, target.x, target.z)
      ) {
        this.waypoints.push(wp, new THREE.Vector3(target.x, 0, target.z));
        return;
      }
    }
    // Two-leg fallback through open aisle z = 1.15
    this.waypoints.push(
      new THREE.Vector3(px, 0, 1.15),
      new THREE.Vector3(target.x, 0, 1.15),
      new THREE.Vector3(target.x, 0, target.z),
    );
  }

  cancelNav(): void {
    this.waypoints.length = 0;
    this.facePos = null;
    this.moving = false;
  }

  /** Advance auto-navigation by dt seconds. Returns true while walking. */
  stepAutoNav(dt: number): boolean {
    if (!this.waypoints.length) {
      this.moving = false;
      if (this.facePos) {
        const dx = this.facePos.x - this.obj.position.x;
        const dz = this.facePos.z - this.obj.position.z;
        if (dx * dx + dz * dz > 0.001) {
          this.lerpYaw(Math.atan2(dx, dz), dt);
        }
      }
      return false;
    }

    const wp = this.waypoints[0];
    const dx = wp.x - this.obj.position.x;
    const dz = wp.z - this.obj.position.z;
    const dist = Math.hypot(dx, dz);
    const step = PLAYER.speed * dt;
    if (dist <= Math.max(0.08, step)) {
      if (isWalkable(wp.x, wp.z, PLAYER.radius)) {
        this.obj.position.x = wp.x;
        this.obj.position.z = wp.z;
      }
      this.waypoints.shift();
      this.moving = this.waypoints.length > 0;
      return this.moving;
    }

    TMP_DIR.set(dx / dist, dz / dist);
    this.move(TMP_DIR, dt);
    return true;
  }

  private lerpYaw(targetRot: number, dt: number): void {
    let d = targetRot - this.obj.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.obj.rotation.y += d * Math.min(1, dt * 14);
  }

  move(dir: THREE.Vector2, dt: number): void {
    this.moving = dir.lengthSq() > 0.0001;
    if (!this.moving) return;
    const step = PLAYER.speed * dt;
    const nx = this.obj.position.x + dir.x * step;
    const nz = this.obj.position.z + dir.y * step;
    if (isWalkable(nx, nz, PLAYER.radius)) {
      this.obj.position.set(nx, 0, nz);
    } else if (isWalkable(nx, this.obj.position.z, PLAYER.radius)) {
      this.obj.position.x = nx;
    } else if (isWalkable(this.obj.position.x, nz, PLAYER.radius)) {
      this.obj.position.z = nz;
    }
    this.facing.copy(dir).normalize();
    this.lerpYaw(Math.atan2(dir.x, dir.y), dt);
  }

  update(dt: number): void {
    if (this.carrying && this.popT < 1) {
      this.popT = Math.min(1, this.popT + dt / 0.12);
      this.carrying.item.obj.scale.setScalar(0.6 + 0.4 * this.popT);
    }
    if (this.moving) {
      this.bob += dt * 12;
      this.obj.position.y = Math.abs(Math.sin(this.bob)) * 0.055;
      this.obj.rotation.z = Math.sin(this.bob) * 0.04;
    } else {
      this.obj.position.y *= 0.82;
      this.obj.rotation.z *= 0.82;
    }
  }
}
