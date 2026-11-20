// World-space "go here next" marker: one canvas-textured Sprite (1 draw call)
// floating over the target spot. Pulses/bobs unless prefers-reduced-motion,
// in which case it stays a static, fully opaque arrow.

import * as THREE from 'three';
import type { NextTarget } from './stations.ts';

const BASE_Y = 1.35;
const SIZE = 0.62;

function arrowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const halo = g.createRadialGradient(64, 64, 14, 64, 64, 62);
  halo.addColorStop(0, 'rgba(240,192,96,0.35)');
  halo.addColorStop(1, 'rgba(240,192,96,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, 128, 128);
  g.beginPath();
  g.moveTo(40, 24);
  g.lineTo(88, 24);
  g.lineTo(88, 62);
  g.lineTo(108, 62);
  g.lineTo(64, 110);
  g.lineTo(20, 62);
  g.lineTo(40, 62);
  g.closePath();
  g.lineJoin = 'round';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(24,16,12,0.95)';
  g.stroke();
  g.fillStyle = '#f0c060';
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class NextMarker {
  private sprite: THREE.Sprite;
  private mat: THREE.SpriteMaterial;
  private reduced: boolean;
  private t = 0;
  private x = 0;
  private z = 0;

  constructor(scene: THREE.Scene) {
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mat = new THREE.SpriteMaterial({
      map: arrowTexture(), transparent: true, depthTest: false, depthWrite: false, fog: false,
    });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.scale.setScalar(SIZE);
    this.sprite.renderOrder = 9;
    this.sprite.visible = false;
    this.sprite.position.y = BASE_Y;
    scene.add(this.sprite);
  }

  /** null hides the marker */
  set(target: NextTarget | null): void {
    this.sprite.visible = !!target;
    if (!target) return;
    this.x = target.pos.x;
    this.z = target.pos.z;
    this.sprite.position.x = this.x;
    this.sprite.position.z = this.z;
    if (this.reduced) this.sprite.position.y = BASE_Y;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.reduced || !this.sprite.visible) return;
    const k = Math.sin(this.t * 5.2);
    this.sprite.position.y = BASE_Y + 0.07 * k;
    this.sprite.scale.setScalar(SIZE * (1 + 0.08 * k));
    this.mat.opacity = 0.85 + 0.15 * k;
  }
}
