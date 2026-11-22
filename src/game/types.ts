import * as THREE from 'three';
import type { DishId } from '../config.ts';

// ---- items ----

export type ItemStage =
  | 'raw'       // raw skewer straight from the crate
  | 'chopped'   // chopped, ready for the grill
  | 'cooked'    // golden off the grill (still a skewer)
  | 'plated'    // finished dish on a plate — servable
  | 'waste';    // burnt / binned

export interface Item {
  id: number;
  dish: DishId;
  stage: ItemStage;
  obj: THREE.Object3D;   // live mesh, re-parented as it moves
  grillT: number;        // seconds spent on the grill
  orderCustomerId?: number; // bound customer when placed by one-click order card
  orderTableId?: string;    // bound table when placed by one-click order card
}

export type CookWindow = 'idle' | 'raw' | 'perfect' | 'over' | 'burnt' | 'eating';

// ---- stations ----

export type ActionKind =
  | 'take-raw'    // grab a raw skewer from a crate
  | 'chop'        // one chop press (×3)
  | 'put-grill'   // place chopped skewer on a free grill slot
  | 'take-grill'  // lift a cooked skewer off the grill
  | 'plate'       // plate a cooked skewer
  | 'serve'       // deliver a plated dish to a table
  | 'discard'     // bin the held item
  | 'none';

export interface StationRuntime {
  id: string;
  kind: 'crate' | 'chop' | 'grill' | 'plate' | 'table' | 'bin' | 'decor';
  dish?: DishId;
  label: string;
  pos: THREE.Vector3;        // centre (interaction anchor)
  usePos: THREE.Vector3;     // where the player stands
  mesh: THREE.Object3D;      // for highlight pulse
  topY: number;              // counter height for item placement
  // per-station mutable state
  held: Item | null;         // item resting on this station
  chopLeft: number;          // chop progress remaining
}

// ---- customers / orders ----

export type CustomerPhase =
  | 'walking-in'
  | 'seated'
  | 'eating'
  | 'leaving-happy'
  | 'leaving-angry'
  | 'gone';

export interface Customer {
  id: number;
  dish: DishId;
  obj: THREE.Object3D;
  table: string;             // table id
  phase: CustomerPhase;
  patience: number;          // seconds left
  patienceMax: number;
  target: THREE.Vector3;     // current walk target
  eatT: number;              // eating countdown
  leaveStep: number;         // 0 rise→aisle, 1 slide→door-x, 2→door
  bubble: HTMLElement | null;
  paid?: boolean;            // prevents duplicate settlement across one-click & legacy chains
}

export type GamePhase = 'menu' | 'playing' | 'results';
