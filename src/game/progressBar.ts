// World-space progress bar (two sprites). Used over the chopping board; the
// grill keeps its own per-slot bars.

import * as THREE from 'three';

export class ProgressBar {
  private bg: THREE.Sprite;
  private fill: THREE.Sprite;
  private w: number;
  private x: number;

  constructor(parent: THREE.Object3D, pos: THREE.Vector3, width = 0.5, color = 0xf0c060) {
    this.w = width;
    this.x = pos.x;
    const mk = (c: number, order: number): THREE.Sprite => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        color: c, transparent: true, opacity: 0.94, depthWrite: false,
      }));
      s.renderOrder = order;
      s.position.copy(pos);
      s.visible = false;
      parent.add(s);
      return s;
    };
    this.bg = mk(0x14100c, 5);
    this.bg.scale.set(width + 0.05, 0.12, 1);
    this.fill = mk(color, 6);
  }

  /** frac < 0 hides the bar */
  set(frac: number): void {
    const on = frac >= 0;
    this.bg.visible = this.fill.visible = on;
    if (!on) return;
    const f = Math.min(1, Math.max(0.001, frac));
    this.fill.scale.set(this.w * f, 0.085, 1);
    this.fill.position.x = this.x - this.w / 2 + (this.w * f) / 2;
    (this.fill.material as THREE.SpriteMaterial).color.setHex(f >= 1 ? 0x9ecb6a : 0xf0c060);
  }
}
