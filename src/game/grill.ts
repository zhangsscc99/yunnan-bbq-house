// Visual effects for per-table tabletop charcoal grills:
// live meat tinting, charcoal ember glow intensity, and rising savory/burn smoke puffs.
// Game-state decisions live in flow.ts.

import * as THREE from 'three';
import { COOK } from '../config.ts';
import type { TableRuntime } from '../world/dining.ts';
import { setItemStage, tintItem } from './items.ts';

function smokeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.88)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Puff {
  sprite: THREE.Sprite;
  t: number;
  life: number;
  base: number;
  maxOpacity: number;
}

export class TableGrillFX {
  private puffs: Puff[] = [];
  private smokeTex = smokeTexture();
  private group = new THREE.Group();
  private clockT = 0;

  attachTo(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  private emitPuff(pos: THREE.Vector3, color: number, base: number, maxOpacity: number): void {
    const mat = new THREE.SpriteMaterial({
      map: this.smokeTex,
      color,
      transparent: true,
      opacity: maxOpacity,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.14,
      0.1,
      (Math.random() - 0.5) * 0.12,
    ));
    sp.scale.setScalar(base);
    sp.renderOrder = 4;
    this.group.add(sp);
    this.puffs.push({ sprite: sp, t: 0, life: 1.35, base, maxOpacity });
  }

  /** Dark smoke burst when a tabletop grill burns. */
  spawnBurnBurst(pos: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      this.emitPuff(pos, 0x3b3530, 0.34, 0.85);
    }
  }

  update(dt: number, tables: TableRuntime[]): void {
    this.clockT += dt;
    for (const tb of tables) {
      const g = tb.grill;
      const pulse = 0.35 * Math.sin(this.clockT * 7.3 + tb.tableNum) + 0.15 * Math.sin(this.clockT * 16.5);
      tb.emberMat.emissiveIntensity = g.active ? 3.5 + pulse : 1.5 + pulse * 0.4;

      if (!g.active || !g.item) continue;
      const t = g.grillT;

      if (t >= COOK.perfectStart && g.item.stage === 'raw') {
        setItemStage(g.item, 'cooked');
      }
      tintItem(g.item);

      g.smokeT -= dt;
      if (g.smokeT <= 0) {
        const isOver = t >= COOK.perfectEnd;
        const isPerfect = t >= COOK.perfectStart && t < COOK.perfectEnd;
        g.smokeT = isOver ? 0.35 : isPerfect ? 0.52 : 0.78;
        const color = isOver ? 0x5c534c : isPerfect ? 0xf0be54 : 0xd6cfc6;
        const base = isOver ? 0.28 : isPerfect ? 0.24 : 0.16;
        const opacity = isOver ? 0.78 : isPerfect ? 0.68 : 0.45;
        this.emitPuff(tb.grillPos, color, base, opacity);
      }
    }

    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.t += dt;
      const k = p.t / p.life;
      p.sprite.position.y += dt * 0.42;
      p.sprite.scale.setScalar(p.base + k * 0.32);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = p.maxOpacity * (1 - k);
      if (k >= 1) {
        this.group.remove(p.sprite);
        mat.dispose();
        this.puffs.splice(i, 1);
      }
    }
  }

  reset(): void {
    for (const p of this.puffs) {
      this.group.remove(p.sprite);
      (p.sprite.material as THREE.Material).dispose();
    }
    this.puffs = [];
  }
}
