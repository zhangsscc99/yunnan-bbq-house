// The charcoal grill: 3 slots, each timing a skewer raw-ish → done(6s) →
// burnt(12s). Per-slot fill bar + rising smoke puffs. Pure visuals here;
// game-state decisions live in flow.ts.

import * as THREE from 'three';
import { COOK } from '../config.ts';
import type { Item } from './types.ts';
import { setItemStage, tintItem } from './items.ts';

export interface GrillSlot {
  item: Item | null;
  pos: THREE.Vector3;
  barBg: THREE.Sprite;
  barFill: THREE.Sprite;
  smokeT: number;
  done: boolean;
  /** read-only: current skewer meat colour as '#rrggbb' ('' when empty) */
  readonly hex: string;
}

function makeBar(): [THREE.Sprite, THREE.Sprite] {
  const mk = (color: number): THREE.Sprite => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      color, transparent: true, opacity: 0.92, depthWrite: false,
    }));
    s.scale.set(0.34, 0.045, 1);
    return s;
  };
  const bg = mk(0x14100c);
  const fill = mk(0xf0c060);
  bg.renderOrder = 5;
  fill.renderOrder = 6;
  return [bg, fill];
}

// soft radial smoke sprite texture (shared)
function smokeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

interface Puff {
  sprite: THREE.Sprite;
  t: number;
  life: number;
  base: number;
}

export class Grill {
  readonly slots: GrillSlot[] = [];
  private puffs: Puff[] = [];
  private smokeTex = smokeTexture();
  private group = new THREE.Group();

  constructor(slotPositions: THREE.Vector3[]) {
    for (const pos of slotPositions) {
      const [bg, fill] = makeBar();
      bg.position.copy(pos).add(new THREE.Vector3(0, 0.42, 0));
      fill.position.copy(bg.position);
      bg.visible = fill.visible = false;
      this.group.add(bg, fill);
      this.slots.push({
        item: null, pos, barBg: bg, barFill: fill, smokeT: 0, done: false,
        get hex(): string {
          const m = this.item?.obj.userData.meat as THREE.MeshStandardMaterial | undefined;
          return m ? `#${m.color.getHexString()}` : '';
        },
      });
    }
  }

  attachTo(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  freeSlot(): GrillSlot | null {
    return this.slots.find((s) => !s.item) ?? null;
  }

  /** slot holding a cooked or burnt skewer (legacy chain only; skips card-bound one-click skewers), always preferring cooked (most-done first) over burnt */
  readySlot(): GrillSlot | null {
    const ready = this.slots.filter(
      (s) => s.item && s.item.orderCustomerId == null
        && (s.item.stage === 'cooked' || s.item.stage === 'waste' || s.item.grillT >= COOK.grillTime),
    );
    if (!ready.length) return null;
    const cooked = ready.filter(
      (s) => s.item!.stage === 'cooked' || (s.item!.stage !== 'waste' && s.item!.grillT < COOK.burnTime),
    );
    if (cooked.length) return cooked.sort((a, b) => b.item!.grillT - a.item!.grillT)[0];
    return ready.sort((a, b) => b.item!.grillT - a.item!.grillT)[0];
  }

  place(slot: GrillSlot, item: Item): void {
    slot.item = item;
    slot.done = false;
    item.obj.position.copy(slot.pos).add(new THREE.Vector3(0, 0.02, 0));
    item.obj.rotation.set(0, 0.3, 0);
    this.group.add(item.obj);
    slot.barBg.visible = slot.barFill.visible = true;
  }

  take(slot: GrillSlot): Item {
    const item = slot.item!;
    slot.item = null;
    slot.done = false;
    slot.barBg.visible = slot.barFill.visible = false;
    this.group.remove(item.obj);
    return item;
  }

  update(dt: number): void {
    for (const s of this.slots) {
      if (!s.item) continue;
      s.item.grillT += dt;
      const t = s.item.grillT;
      // progress bar fill (gold while cooking, red past done)
      const frac = Math.min(1, t / COOK.burnTime);
      s.barFill.scale.x = 0.34 * frac;
      s.barFill.position.x = s.barBg.position.x - 0.17 + (0.34 * frac) / 2;
      (s.barFill.material as THREE.SpriteMaterial).color.setHex(
        t >= COOK.grillTime ? 0xe05a3a : 0xf0c060,
      );
      // stage transitions
      if (t >= COOK.burnTime && s.item.stage !== 'waste') {
        setItemStage(s.item, 'waste');
      } else if (s.item.orderCustomerId != null && t + 1e-6 >= COOK.perfectStart && s.item.stage === 'raw') {
        setItemStage(s.item, 'cooked');
        s.done = true;
      } else if (s.item.orderCustomerId == null && t >= COOK.grillTime && s.item.stage === 'chopped') {
        setItemStage(s.item, 'cooked');
        s.done = true;
      }
      tintItem(s.item);
      // smoke puffs while cooking; darker + faster when burning
      s.smokeT -= dt;
      if (s.smokeT <= 0) {
        s.smokeT = t >= COOK.grillTime ? 0.55 : 0.9;
        const burnt = t >= COOK.burnTime;
        const done = t >= COOK.grillTime;
        const base = done ? 0.24 : 0.14;
        const mat = new THREE.SpriteMaterial({
          map: this.smokeTex,
          color: burnt ? 0x4a4540 : done ? 0xd9a743 : t >= COOK.grillTime * 0.8 ? 0x8a8078 : 0xcfc8c0,
          transparent: true,
          opacity: done ? 0.7 : 0.5,
          depthWrite: false,
        });
        const sp = new THREE.Sprite(mat);
        sp.position.copy(s.pos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.12, 0.12, (Math.random() - 0.5) * 0.1,
        ));
        sp.scale.setScalar(base);
        this.group.add(sp);
        this.puffs.push({ sprite: sp, t: 0, life: 1.4, base });
      }
    }
    // animate puffs
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.t += dt;
      const k = p.t / p.life;
      p.sprite.position.y += dt * 0.35;
      p.sprite.scale.setScalar(p.base + k * 0.3);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = (p.base > 0.14 ? 0.7 : 0.5) * (1 - k);
      if (k >= 1) {
        this.group.remove(p.sprite);
        (p.sprite.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
      }
    }
  }

  reset(): void {
    for (const s of this.slots) {
      if (s.item) this.group.remove(s.item.obj);
      s.item = null;
      s.barBg.visible = s.barFill.visible = false;
    }
    for (const p of this.puffs) { this.group.remove(p.sprite); (p.sprite.material as THREE.Material).dispose(); }
    this.puffs = [];
  }
}
