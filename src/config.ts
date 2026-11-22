// All tunable numbers for the game live here. See docs/GAME-DESIGN.md §0/§1 v2
// and docs/ART-DIRECTION.md — those docs are the authority, this file is the knob.

export const GRID = {
  cols: 12,          // x: 0..11
  rows: 9,           // z: 0..8  (z=0 far/top of screen, z=8 near/bottom)
  cell: 1,           // metres per cell
};

export const CAMERA = {
  pitchDeg: 50,                    // tilt down from horizontal
  followLerp: 0.12,                // per-frame at 60fps
  lookAheadZ: -1.2,                // default look-ahead
  dist: 12,                        // camera distance along view dir
  worldHalfW: GRID.cols / 2,       // 6m: max visible half-width on the ground
  worldHalfD: GRID.rows / 2,       // 4.5m: half depth of the world
  portraitHalfH: 9.0,              // portrait: fits all 4 tables + pass window horizontally
  portraitLookZ: 2.0,              // portrait: frames dining room + pass window cleanly in upper half above thumb dock
  landscapeAspect: 1.5,            // aspect >= this uses the landscape look-ahead below
  landscapeLookAheadZ: 0.4,        // floor of the landscape look-ahead (+z = toward the pass counter)
  benchZ: 3.0,                     // world z of the counter row (cell z=7)
  benchTopY: 0.72,                 // counter top height (world/kitchen.ts COUNTER_H)
  benchFromZ: 0,                   // player z >= this => counter row fully visible
  hudBottomPx: 140,                // bottom HUD dock clearance on landscape
  hudMarginPx: 4,
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

// ---- gameplay numbers (v2: GAME-DESIGN §0/§1) ----

export type DishId = 'pork' | 'mushroom' | 'mixian';

export interface Dish {
  id: DishId;
  name: string;
  shortName: string;
  price: number;
  patience: number;   // seconds
  hue: number;        // main ingredient colour
}

export const DISHES: Record<DishId, Dish> = {
  pork:     { id: 'pork',     name: '烤五花肉拼盘', shortName: '五花肉', price: 48, patience: 75,  hue: 0xe8907c },
  mushroom: { id: 'mushroom', name: '烤菌子',       shortName: '烤菌子', price: 32, patience: 90,  hue: 0xa97b4f },
  mixian:   { id: 'mixian',   name: '豆泥米线',     shortName: '米线',   price: 26, patience: 100, hue: 0xe8c96a },
};

export const COOK = {
  prepTime: 3.0,          // 后台自动备菜时长 (s)
  passCapacity: 3,        // 出菜窗口容量（满则暂停后台备菜）
  grillTotal: 8.0,        // 火候总时长 / 焦糊线 (s)
  perfectStart: 5.0,      // [0, 5.0) 夹生窗，[5.0, 7.0) 完美窗
  perfectEnd: 7.0,        // [7.0, 8.0) 快焦预警窗，>= 8.0 焦糊
  burnTime: 8.0,          // 焦糊线 (s)
  cleanTime: 2.0,         // 吃完离桌后桌面清理时长 (s)
  eatTime: 2.0,           // 顾客用餐时长 (s)
  rawLockSec: 0.35,       // 刚上桌烤防误双击保护窗 (s)
  rawPatienceDrop: 0.1,   // 夹生重烤时顾客耐心损耗比例
  burnPenalty: 15,        // 焦糊单次扣款 (¥)
  burnPatienceDrop: 0.4,  // 焦糊时顾客耐心大降比例
  burntLinger: 1.4,       // 焦糊作废卡片红态停留时长 (s)
  tipRate: 0.3,           // tip = round(price * tipRate * patienceFactor)
  fullTipPatience: 0.8,   // 剩余耐心 >= 80% 拿满小费
  overTipMult: 0.5,       // 快焦预警窗盛盘小费减半
};

export interface Level {
  duration: number;     // seconds
  target: number;       // ¥
  maxDiners: number;    // simultaneous seated customers
  spawnEvery: readonly [number, number]; // seconds between arrivals (min,max) while free table
  tableCooldown: number; // seconds before a freed table can re-seat (= COOK.cleanTime)
}

export const LEVELS: Level[] = [
  { duration: 180, target: 180, maxDiners: 3, spawnEvery: [10, 16], tableCooldown: COOK.cleanTime },
  { duration: 180, target: 260, maxDiners: 4, spawnEvery: [8, 13],  tableCooldown: COOK.cleanTime },
];

export const LEVEL = LEVELS[0];

export const PLAYER = {
  speed: 4.2,           // m/s (crisp auto-walk between Pass window and tables)
  radius: 0.32,         // collision circle
  interactRange: 1.15,  // metres
};

export const STARS = {
  threeWasteMax: 1,
};

export const SAVE_KEYS = { level: 'bbq.level', best: 'bbq.best' };
