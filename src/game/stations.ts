// Interaction resolution: which station/table is "in reach", what the single
// action button would do right now, and the proximity highlight (glow plane
// + floating action glyph — counters share materials so we don't touch them).

import * as THREE from 'three';
import { PLAYER, COOK, DISHES } from '../config.ts';
import type { DishId } from '../config.ts';
import type { StationRuntime, ActionKind, Item, Customer } from './types.ts';
import type { TableRuntime } from '../world/dining.ts';
import type { Grill } from './grill.ts';

export interface Interaction {
  action: ActionKind;
  label: string;              // text for the world hint / button tooltip
  station?: StationRuntime;
  table?: TableRuntime;
  icon: string;               // svg icon key for ui/controls
  glyph: string;              // world-space single-char marker
  guide?: boolean;            // nothing in reach: button shows a "where to go" hint instead of a dead key
  goto?: boolean;             // label is a「去 X」direction (target = nextTarget); drives the HUD off-screen edge hint
}

const CRATE_NAME: Record<DishId, string> = {
  pork: '五花肉',
  mushroom: '菌子',
  mixian: '米线',
};

const META: Record<ActionKind, { icon: string; glyph: string }> = {
  'take-raw': { icon: 'grab', glyph: '取' },
  'chop': { icon: 'knife', glyph: '切' },
  'put-grill': { icon: 'fire', glyph: '烤' },
  'take-grill': { icon: 'grab', glyph: '取' },
  'plate': { icon: 'plate', glyph: '盘' },
  'serve': { icon: 'serve', glyph: '上' },
  'discard': { icon: 'bin', glyph: '丢' },
  'none': { icon: 'none', glyph: '' },
};

// station footprints (world-space rects) for distance checks
const FOOT = new Map<string, { x1: number; x2: number; z1: number; z2: number }>();

export function setFootprint(id: string, x1: number, x2: number, z1: number, z2: number): void {
  FOOT.set(id, { x1, x2, z1, z2 });
}

function distToStation(p: THREE.Vector3, s: StationRuntime): number {
  const f = FOOT.get(s.id);
  if (!f) return p.distanceTo(s.pos);
  const dx = Math.max(f.x1 - p.x, 0, p.x - f.x2);
  const dz = Math.max(f.z1 - p.z, 0, p.z - f.z2);
  return Math.hypot(dx, dz);
}

/** where to go next, from what the player is holding (shown when nothing is in reach) */
export function nextHint(carrying: Item | null, grill: Grill, hasGuest: boolean): string {
  switch (carrying?.stage) {
    case 'raw': return '去切配台';
    case 'chopped': return '去烤炉';
    case 'cooked': return '去装盘台';
    case 'plated': return hasGuest ? '送去客桌' : '去垃圾桶丢掉';
    case 'waste': return '去垃圾桶';
    default: return grill.readySlot() ? '去烤炉取串' : '去料箱取料';
  }
}

/** the seated guest (at a real table) who ordered the plated dish in hand, if any */
function matchingGuest(carrying: Item | null, tables: TableRuntime[], customers: Customer[]): Customer | undefined {
  if (carrying?.stage !== 'plated') return undefined;
  return customers.find((c) => c.phase === 'seated' && c.dish === carrying.dish
    && tables.some((t) => t.id === c.table));
}

export interface NextTarget {
  kind: 'station' | 'table';
  id: string;
  pos: { x: number; z: number };
}

// where the player stands for each station / table (filled once by the Flow)
const NAV = new Map<string, { x: number; z: number }>();

export function registerNavPoints(stations: StationRuntime[], tables: TableRuntime[]): void {
  NAV.clear();
  for (const s of stations) NAV.set(s.id, { x: s.usePos.x, z: s.usePos.z });
  for (const t of tables) NAV.set(t.id, { x: t.usePos.x, z: t.usePos.z });
}

/** world-space counterpart of nextHint: the spot to walk to next, or null if there is none */
export function nextTarget(
  carrying: Item | null,
  grill: Grill,
  tables: TableRuntime[],
  customers: Customer[],
): NextTarget | null {
  const at = (kind: NextTarget['kind'], id: string): NextTarget | null => {
    const pos = NAV.get(id);
    return pos ? { kind, id, pos: { x: pos.x, z: pos.z } } : null;
  };
  switch (carrying?.stage) {
    case 'raw': return at('station', 'chop');
    case 'chopped': return at('station', 'grill');
    case 'cooked': return at('station', 'plate');
    case 'waste': return at('station', 'bin');
    case 'plated': {
      const guest = matchingGuest(carrying, tables, customers);
      return guest ? at('table', guest.table) : at('station', 'bin');
    }
    default: return at('station', grill.readySlot() ? 'grill' : 'crate-pork');
  }
}

export function resolveInteraction(
  p: THREE.Vector3,
  carrying: Item | null,
  stations: StationRuntime[],
  tables: TableRuntime[],
  customers: Customer[],
  grill: Grill,
): Interaction {
  const mk = (action: ActionKind, label: string, station?: StationRuntime, table?: TableRuntime): Interaction =>
    ({ action, label, station, table, icon: META[action].icon, glyph: META[action].glyph });

  // nearest station within range
  let best: StationRuntime | null = null;
  let bestD = Infinity;
  for (const s of stations) {
    const d = distToStation(p, s) - (s.kind === 'grill' ? 0.35 : 0);
    if (d < bestD) { bestD = d; best = s; }
  }
  const nearStation = best && bestD <= PLAYER.interactRange ? best : null;

  // nearest table for serving
  let bestT: TableRuntime | null = null;
  let bestTD = Infinity;
  for (const t of tables) {
    const d = p.distanceTo(t.pos);
    if (d < bestTD) { bestTD = d; bestT = t; }
  }
  const nearTable = bestT && bestTD <= PLAYER.interactRange + 0.35 ? bestT : null;

  const hasGuest = carrying?.stage !== 'plated' || !!matchingGuest(carrying, tables, customers);
  const hintText = nextHint(carrying, grill, hasGuest);
  const go = (station?: StationRuntime): Interaction => ({ ...mk('none', hintText, station), goto: true });

  // serving wins when holding a plated dish near a waiting guest
  if (carrying?.stage === 'plated' && nearTable) {
    const guest = customers.find((c) => c.table === nearTable.id && c.phase === 'seated');
    if (guest) {
      if (guest.dish === carrying.dish) {
        return mk('serve', `上菜 ${DISHES[carrying.dish].name}`, undefined, nearTable);
      }
      return { ...mk('none', `这桌要的是 ${DISHES[guest.dish].name} · ${hasGuest ? '送去别桌' : '去垃圾桶丢掉'}`, undefined, nearTable), goto: true };
    }
  }

  if (!nearStation) return { ...go(), guide: true };

  switch (nearStation.kind) {
    case 'crate':
      if (!carrying) {
        const d = nearStation.dish!;
        return { ...mk('take-raw', `取 ${CRATE_NAME[d]}`, nearStation), icon: `food-${d}` };
      }
      return mk('none', '手上有东西', nearStation);
    case 'chop':
      if (!carrying && nearStation.held) {
        return nearStation.chopLeft > 0
          ? mk('chop', `切配 ${COOK.chopTaps - nearStation.chopLeft}/${COOK.chopTaps}`, nearStation)
          : mk('chop', '取回切好的串', nearStation);
      }
      if (carrying?.stage === 'raw') return mk('chop', '放上砧板', nearStation);
      return go(nearStation);
    case 'grill': {
      if (carrying?.stage === 'chopped' && grill.freeSlot())
        return mk('put-grill', '上烤炉', nearStation);
      if (!carrying && grill.readySlot())
        return mk('take-grill', '取烤串', nearStation);
      if (!carrying && grill.slots.some((s) => s.item)) return mk('none', '烤制中…', nearStation);
      return go(nearStation);
    }
    case 'plate':
      if (carrying?.stage === 'cooked') return mk('plate', '装盘', nearStation);
      return go(nearStation);
    case 'bin':
      if (carrying) return mk('discard', '丢弃', nearStation);
      return go(nearStation);
    default:
      return go(nearStation);
  }
}

// ---- highlight FX: pulsing gold glow sheet + floating action glyph ----

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 18, 64, 64, 62);
  grad.addColorStop(0, 'rgba(240,192,96,0.55)');
  grad.addColorStop(0.75, 'rgba(240,192,96,0.18)');
  grad.addColorStop(1, 'rgba(240,192,96,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function glyphSprite(char: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(48, 48, 42, 0, Math.PI * 2);
  g.fillStyle = 'rgba(24,16,12,0.85)';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#f0c060';
  g.stroke();
  g.fillStyle = '#f5e8d8';
  g.font = '600 44px "PingFang SC", "Noto Sans SC", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(char, 48, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: t, transparent: true, depthWrite: false,
  }));
  s.scale.setScalar(0.34);
  s.renderOrder = 8;
  return s;
}

export class Highlighter {
  private glow: THREE.Mesh;
  private glyph: THREE.Sprite | null = null;
  private glyphChar = '';
  private t = 0;
  private scene: THREE.Scene;
  private anchor = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.95),
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

  /** show over an interaction anchor (counter top or table centre) */
  show(pos: THREE.Vector3, width: number, glyphChar: string): void {
    this.anchor.copy(pos);
    this.glow.visible = true;
    this.glow.position.set(pos.x, pos.y + 0.045, pos.z);
    this.glow.scale.set(width, 1, 1);
    if (glyphChar !== this.glyphChar) {
      this.glyphChar = glyphChar;
      if (this.glyph) {
        this.scene.remove(this.glyph);
        this.glyph = null;
      }
      if (glyphChar) {
        this.glyph = glyphSprite(glyphChar);
        this.scene.add(this.glyph);
      }
    }
    if (this.glyph) {
      this.glyph.position.set(pos.x, pos.y + 0.78, pos.z);
    }
  }

  hide(): void {
    this.glow.visible = false;
    if (this.glyph) {
      this.scene.remove(this.glyph);
      this.glyph = null;
      this.glyphChar = '';
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.glow.visible) return;
    const m = this.glow.material as THREE.MeshBasicMaterial;
    m.opacity = 0.6 + 0.4 * Math.sin(this.t * 5.2);
    if (this.glyph) {
      this.glyph.position.y = this.anchor.y + 0.78 + Math.sin(this.t * 3.1) * 0.035;
    }
  }
}
