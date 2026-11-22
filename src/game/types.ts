import * as THREE from 'three';
import type { DishId } from '../config.ts';

// ---- items ----

export type ItemStage =
  | 'raw'       // raw dish ready from the pass window
  | 'cooked'    // golden on/off the tabletop grill
  | 'plated'    // finished dish served to customer
  | 'waste';    // burnt

export interface Item {
  id: number;
  dish: DishId;
  stage: ItemStage;
  obj: THREE.Object3D;   // live mesh, re-parented as it moves
  grillT: number;        // seconds spent on the tabletop grill
}

// ---- v2 order & cooking states ----

export type OrderState =
  | 'ordering'   // seated, background NPC prepping (3s ring), player cannot act
  | 'ready'      // dish sitting in the pass window, tap pass tray to pick up
  | 'carrying'   // player carrying this table's dish, tap order card to start grilling
  | 'grilling'   // sizzling on the table's built-in grill (0..5.0s raw window)
  | 'serving'    // grill hit perfect/over window (5.0..8.0s), tap card/grill to plate & serve
  | 'done'       // plated & settled (eating → leave → 2s table clean)
  | 'burnt';     // exceeded burn line (>8.0s), order voided (deducted once)

export type CookWindow = 'none' | 'raw' | 'perfect' | 'over' | 'burnt';

// ---- pass window & hand state ----

export interface StationRuntime {
  id: string;
  kind: 'pass';
  label: string;
  pos: THREE.Vector3;        // centre anchor
  usePos: THREE.Vector3;     // where the player stands when taking from pass
  mesh: THREE.Object3D;
  topY: number;
}

export interface PassItem {
  id: number;
  dishId: DishId;
  tableId: string;
  customerId: number;
  slotIndex: number;         // 0 | 1 | 2 visual slot on the 3D pass counter
  obj: THREE.Object3D;       // 3D raw tray mesh on the pass shelf
}

export interface CarryingState {
  dishId: DishId;
  tableId: string;
  customerId: number;
  item: Item;
}

export interface TableGrill {
  active: boolean;           // true while meat is cooking on this table's grill
  dishId: DishId | null;
  customerId: number | null;
  grillT: number;            // elapsed cook time on this table's grill (s)
  cookWindow: CookWindow;
  item: Item | null;
  burntHandled: boolean;     // strict single-shot guard against duplicate burn penalty
  smokeT: number;
}

// ---- customers ----

export type CustomerPhase =
  | 'walking-in'
  | 'seated'
  | 'eating'
  | 'burnt'
  | 'leaving-happy'
  | 'leaving-angry'
  | 'gone';

export interface Customer {
  id: number;
  dish: DishId;
  obj: THREE.Object3D;
  table: string;             // table id ('t1'..'t4')
  phase: CustomerPhase;
  orderState: OrderState;
  prepT: number;             // 0..COOK.prepTime background prep progress
  patience: number;          // seconds left
  patienceMax: number;
  satisfaction: number;      // per-guest satisfaction 0..100
  dineT: number;             // elapsed dining occupancy seconds since seated
  dineDuration: number;      // max occupancy seconds under 90-min compression (sessionSeconds / seats)
  longWaitPenalized: boolean;// single-shot guard for long-wait satisfaction drop
  earlyLeft: boolean;        // true when guest left early due to low satisfaction
  target: THREE.Vector3;     // current walk target
  eatT: number;              // eating countdown
  burntLinger: number;       // brief red-card linger before guest leaves
  burntHandled: boolean;     // guarantees burn deduction runs at most once per order
  clicksUsed: number;        // counts clicks spent on this order (target = 3)
  leaveStep: number;         // 0 rise→aisle, 1 slide→door-x, 2→door
  bubble: HTMLElement | null;
  paid?: boolean;
}

export type GamePhase = 'menu' | 'playing' | 'results';
