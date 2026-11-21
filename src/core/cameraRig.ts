// Orthographic rig pitched 50°, lerping after the player. Portrait: the player stays
// in the lower third of frame via a lookAt target nudged -z. Landscape (aspect >= 1.5):
// the look-ahead is solved from halfH so the counter row clears the bottom HUD (B-072).

import * as THREE from 'three';
import { CAMERA } from '../config.ts';

export class CameraRig {
  readonly cam: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private smooth = new THREE.Vector3();
  private aspect = 1;
  private halfW = 1;
  private halfH = 1;
  private lookAheadZ: number = CAMERA.lookAheadZ;

  constructor() {
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
    const pitch = THREE.MathUtils.degToRad(CAMERA.pitchDeg);
    this.offset = new THREE.Vector3(
      0,
      Math.sin(pitch) * CAMERA.dist,
      Math.cos(pitch) * CAMERA.dist,
    );
    this.resize(window.innerWidth, window.innerHeight);
  }

  private offset: THREE.Vector3;

  resize(w: number, h: number): void {
    this.aspect = w / h;
    // ground depth seen = 2*halfH / sin(pitch); width seen = 2*halfW (see ART-DIRECTION §1)
    const sinP = Math.sin(THREE.MathUtils.degToRad(CAMERA.pitchDeg));
    let halfH: number;
    if (this.aspect >= 1) {
      // landscape: fit world width, but never see more depth than the world has
      halfH = Math.min(CAMERA.worldHalfW / this.aspect, CAMERA.worldHalfD * sinP);
    } else {
      // portrait: keep the old zoom, never wider than the world
      halfH = Math.min(CAMERA.portraitHalfH, CAMERA.worldHalfW / this.aspect);
    }
    this.halfH = halfH;
    this.halfW = halfH * this.aspect;
    this.lookAheadZ = this.aspect >= CAMERA.landscapeAspect ? this.landscapeLookAhead(halfH, h) : CAMERA.lookAheadZ;
    const c = this.cam;
    c.top = halfH;
    c.bottom = -halfH;
    c.left = -this.halfW;
    c.right = this.halfW;
    c.updateProjectionMatrix();
    this.updateCam();
  }

  /**
   * Landscape look-ahead solved from halfH (B-072). A point (y, z) sits y*cos(p) - (z - lookZ)*sin(p)
   * above screen centre; require the counter-top centre line (benchTopY, benchZ) to stay
   * hudBottomPx + hudMarginPx above the bottom edge once the player is at z >= benchFromZ.
   * The result still goes through the world clamp in updateCam, so the view never leaves 12×9m.
   */
  private landscapeLookAhead(halfH: number, hPx: number): number {
    const p = THREE.MathUtils.degToRad(CAMERA.pitchDeg);
    const band = ((CAMERA.hudBottomPx + CAMERA.hudMarginPx) / Math.max(1, hPx)) * 2 * halfH;
    const lookZ = CAMERA.benchZ - (halfH - band + CAMERA.benchTopY * Math.cos(p)) / Math.sin(p);
    return Math.max(CAMERA.landscapeLookAheadZ, lookZ - CAMERA.benchFromZ);
  }

  /** read-only lens snapshot for tests / docs */
  info(): { aspect: number; halfW: number; halfH: number; lookAheadZ: number; lookX: number; lookZ: number } {
    const p = this.cam.position;
    return {
      aspect: this.aspect, halfW: this.halfW, halfH: this.halfH, lookAheadZ: this.lookAheadZ,
      lookX: p.x - this.offset.x, lookZ: p.z - this.offset.z,
    };
  }

  snapTo(p: THREE.Vector3): void {
    this.target.copy(p);
    this.smooth.copy(p);
    this.updateCam();
  }

  follow(p: THREE.Vector3): void {
    this.target.copy(p);
  }

  update(dt: number): void {
    // lerp normalised to 60fps
    const k = 1 - Math.pow(1 - CAMERA.followLerp, dt * 60);
    this.smooth.lerp(this.target, k);
    this.updateCam();
  }

  private updateCam(): void {
    // lookAt = ground point at screen centre; keep the view rect inside the world,
    // locking to the centre axis when the view is larger than the world.
    const sinP = Math.sin(THREE.MathUtils.degToRad(CAMERA.pitchDeg));
    const limX = Math.max(0, CAMERA.worldHalfW - this.halfW);
    const limZ = Math.max(0, CAMERA.worldHalfD - this.halfH / sinP);
    const look = new THREE.Vector3(
      THREE.MathUtils.clamp(this.smooth.x, -limX, limX),
      0,
      THREE.MathUtils.clamp(this.smooth.z + this.lookAheadZ, -limZ, limZ),
    );
    this.cam.position.copy(look).add(this.offset);
    this.cam.lookAt(look);
  }
}
