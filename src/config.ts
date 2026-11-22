// All tunable numbers for the game live here. See docs/GAME-DESIGN.md and
// docs/ART-DIRECTION.md — those docs are the authority, this file is the knob.

export const GRID = {
  cols: 12,          // x: 0..11
  rows: 9,           // z: 0..8  (z=0 far/top of screen, z=8 near/bottom)
  cell: 1,           // metres per cell
};

export const CAMERA = {
  pitchDeg: 50,                    // tilt down from horizontal
  followLerp: 0.12,                // per-frame at 60fps
  lookAheadZ: -1.2,                // player sits lower-third: aim ahead(-z)
  dist: 12,                        // camera distance along view dir
  // framing (ART-DIRECTION §1): visible ground never leaves the GRID.cols x GRID.rows world
  worldHalfW: GRID.cols / 2,       // 6m: max visible half-width on the ground
  worldHalfD: GRID.rows / 2,       // 4.5m: half depth of the world
  portraitHalfH: 9,                // portrait: fixed half-height (old clamp ceiling), x-clamped to the world
  // landscape lens (ART-DIRECTION §1, B-072): from the spawn row on, the counter row (cell z=7) must sit
  // above the bottom HUD band. lookAheadZ is solved from halfH (see CameraRig.landscapeLookAhead).
  landscapeAspect: 1.5,            // aspect >= this uses the landscape look-ahead below
  landscapeLookAheadZ: 0.4,        // floor of the landscape look-ahead (+z = toward the counters)
  benchZ: 3.0,                     // world z of the station row (cell z=7)
  benchTopY: 0.72,                 // counter top height (world/kitchen.ts COUNTER_H)
  benchFromZ: 0,                   // player z >= this (spawn row z=0) => counter row fully visible
  hudBottomPx: 96,                 // bottom HUD band (joystick / action button) the counters must clear
  hudMarginPx: 2,                  // extra clearance above the band (leaves headroom for dining rings @t2)
};

export const COLORS = {
  floor: 0x3a3430,
  wall: 0x4a4238,
  counterBody: 0x332b24,
  counterTop: 0x6b5238,
  fog: 0x2a2118,
  charcoalEmissive: 0xff5a1e,
  charcoalLight: 0xff8a3c,         // ~1800K
  lampLight: 0xffb46b,             // ~2700K
  sunLight: 0xffe6c4,
  playerApron: 0xd94f30,
  uiGold: '#f0c060',
  uiInk: '#f5e8d8',
};

export const RENDER = {
  exposure: 1.05,
  envIntensity: 1.5,
  fogDensity: 0.03,
  shadowMapSize: 1024,
};

// ---- gameplay numbers (M1) ----

export type DishId = 'pork' | 'mushroom' | 'mixian';

export interface Dish {
  id: DishId;
  name: string;
  price: number;
  patience: number;   // seconds
  hue: number;        // main ingredient colour
}

export const DISHES: Record<DishId, Dish> = {
  pork:     { id: 'pork',     name: '烤五花肉拼盘', price: 48, patience: 75,  hue: 0xe8907c },
  mushroom: { id: 'mushroom', name: '烤菌子',       price: 32, patience: 90,  hue: 0xa97b4f },
  mixian:   { id: 'mixian',   name: '豆泥米线',     price: 26, patience: 100, hue: 0xe8c96a },
};

export const COOK = {
  chopTaps: 3,          // presses to finish chopping
  grillTime: 6,         // seconds → done (golden, legacy chain)
  burnTime: 12,         // seconds → burnt waste
  tipRate: 0.3,         // tip = price * tipRate * patienceFrac (full when >= fullTipPatience)
  fullTipPatience: 0.8, // patience fraction >= this earns full tip (GAME-DESIGN §2)
  // one-click order-card cooking windows (GAME-DESIGN §1)
  perfectStart: 4,      // [0, 4) raw (undercooked)
  overStart: 9,         // [4, 9) perfect, [9, 12) overcooked, >= 12 burnt
  overTipMult: 0.5,     // tip multiplier when lifted in overcooked window
  burntLinger: 1.2,     // seconds burnt card stays visible in red before returning to retryable idle
};

export interface Level {
  duration: number;     // seconds
  target: number;       // ¥
  maxDiners: number;    // simultaneous seated customers
  spawnEvery: readonly [number, number]; // seconds between arrivals (min,max) while free table
  tableCooldown: number; // seconds before a freed table can re-seat
}

export const LEVELS: Level[] = [
  { duration: 180, target: 180, maxDiners: 3, spawnEvery: [12, 20], tableCooldown: 4 },
  { duration: 180, target: 260, maxDiners: 3, spawnEvery: [9, 15],  tableCooldown: 4 },
];

export const LEVEL = LEVELS[0];

export const PLAYER = {
  speed: 3.2,           // m/s
  radius: 0.32,         // collision circle
  interactRange: 1.15,  // metres from station centre
};

export const STARS = {
  // see GAME-DESIGN §4
  threeWasteMax: 1,
};

export const SAVE_KEYS = { level: 'bbq.level', best: 'bbq.best' };
