// v2 navigation anchor registry & subtle world target hint (Pass window ↔ Dining tables).
// Legacy five-step interaction branches (crate / chop / plate / bin / discard) have been
// completely deleted per docs/GAME-DESIGN.md §0/§1 v2.

import * as THREE from 'three';
import type { StationRuntime, CarryingState, PassItem, Customer } from './types.ts';
import type { TableRuntime } from '../world/dining.ts';

export interface NextTarget {
  kind: 'pass' | 'table';
  id: string;
  pos: { x: number; z: number };
}

const NAV = new Map<string, { x: number; z: number }>();

export function registerNavPoints(stations: StationRuntime[], tables: TableRuntime[]): void {
  NAV.clear();
  for (const s of stations) NAV.set(s.id, { x: s.usePos.x, z: s.usePos.z });
  for (const t of tables) NAV.set(t.id, { x: t.usePos.x, z: t.usePos.z });
}

/** v2 next suggested target: serving table (urgent) → carried dish's table → Pass window → null. */
export function nextTarget(
  carrying: CarryingState | null,
  pass: PassItem[],
  tables: TableRuntime[],
  customers: Customer[],
): NextTarget | null {
  const at = (kind: NextTarget['kind'], id: string): NextTarget | null => {
    const pos = NAV.get(id);
    return pos ? { kind, id, pos: { x: pos.x, z: pos.z } } : null;
  };

  // Urgent: any tabletop grill ready to plate & serve (prefer overcooked before perfect)
  const serving = tables
    .filter((tb) => tb.grill.active && (tb.grill.cookWindow === 'over' || tb.grill.cookWindow === 'perfect'))
    .sort((a, b) => b.grill.grillT - a.grill.grillT)[0];
  if (serving) return at('table', serving.id);

  // If carrying a dish, deliver to its target table's grill
  if (carrying) {
    const valid = customers.some((c) => c.id === carrying.customerId && c.phase === 'seated');
    if (valid) return at('table', carrying.tableId);
  }

  // Otherwise if Pass window has a ready dish, go pick it up
  if (pass.length > 0) return at('pass', 'pass');

  return null;
}

// ---- subtle pulsing ground/counter highlight for active target ----

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 18, 64, 64, 62);
  grad.addColorStop(0, 'rgba(240,192,96,0.5)');
  grad.addColorStop(0.75, 'rgba(240,192,96,0.16)');
  grad.addColorStop(1, 'rgba(240,192,96,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class Highlighter {
  private glow: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene) {
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.0),
      new THREE.MeshBasicMaterial({
        map: glowTexture(), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.renderOrder = 4;
    this.glow.visible = false;
    scene.add(this.glow);
  }

  show(pos: THREE.Vector3, width = 1.2): void {
    this.glow.visible = true;
    this.glow.position.set(pos.x, pos.y + 0.04, pos.z);
    this.glow.scale.set(width, 1, 1);
  }

  hide(): void {
    this.glow.visible = false;
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.glow.visible) return;
    const m = this.glow.material as THREE.MeshBasicMaterial;
    m.opacity = 0.55 + 0.35 * Math.sin(this.t * 5.2);
  }
}
