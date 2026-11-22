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

// ---- gameplay numbers (v2: GAME-DESIGN §0/§1 + §2.0 自助制) ----

// 自助制商业参数（docs/GAME-DESIGN.md §2.0）：
// 门店限时 1.5 小时（90 分钟）压缩为游戏内 5 分钟（300 秒）一局；
// 换算比：1 游戏秒 = (90 * 60) / 300 = 18 真实秒（0.3 真实分钟）。
export const BIZ = {
  entryFee: 79.9,       // 入场费 (¥/人)，开局按座位数统一收取，整局收入固定
  sessionSeconds: 300,  // 游戏内单局时长 (s) = 5 分钟
  realMinutes: 90,      // 对应门店真实限时 (min) = 1.5 小时（1 游戏秒 = 18 真实秒）
};

// 自助制满意度、小费、提前离店与用餐时长权重
export const ECON = {
  satisfactionMax: 100,       // 满意度上限 (%)
  satisfactionInit: 100,      // 开局初始满意度 (%)
  earlyLeaveThreshold: 40,    // 满意度跌破 40% 触发顾客提前离店（腾桌后清桌 2s）
  penaltyRaw: 8,              // 夹生重烤：不扣钱，门店满意度 -8（单客满意度 -25）
  guestPenaltyRaw: 25,
  penaltyBurn: 18,            // 焦糊作废：不扣钱，门店满意度 -18（单客满意度 -45）
  guestPenaltyBurn: 45,
  penaltyLongWait: 10,        // 顾客久等（剩余耐心 <= 40% 触发一次）：门店满意度 -10（单客满意度 -25）
  guestPenaltyLongWait: 25,
  longWaitFrac: 0.4,          // 剩余耐心比例 <= 40% 记一次久等
  penaltyTimeout: 20,         // 耐心耗尽或超出单客用餐限时未上菜离店：门店满意度 -20
  bonusPerfect: 4,            // 完美窗盛盘：门店满意度 +4（上限 100）
  bonusOver: 0,               // 快焦预警窗盛盘：满意度不加分，小费减半
  tipRate: 0.05,              // 小费基数 = BIZ.entryFee（非菜价），100% 满意完美窗约 ¥4/客
  tipMinSatisfaction: 60,     // 门店满意度 >= 60% 才给小费（亦作关卡达标最低满意度）
  eatFractionOfDine: 0.2,     // 上菜后用餐耗时占单客压缩占桌上限的比例（Lv.1: 20s，Lv.2: 15s）
};

export type DishId = 'pork' | 'mushroom' | 'mixian';

export interface Dish {
  id: DishId;
  name: string;
  shortName: string;
  price: number;      // 自助制菜价恒为 0（保留字段供菜单车道复用）
  patience: number;   // seconds
  hue: number;        // main ingredient colour
}

export const DISHES: Record<DishId, Dish> = {
  pork:     { id: 'pork',     name: '烤五花肉拼盘', shortName: '五花肉', price: 0, patience: 75,  hue: 0xe8907c },
  mushroom: { id: 'mushroom', name: '烤菌子',       shortName: '烤菌子', price: 0, patience: 90,  hue: 0xa97b4f },
  mixian:   { id: 'mixian',   name: '豆泥米线',     shortName: '米线',   price: 0, patience: 100, hue: 0xe8c96a },
};

export const COOK = {
  prepTime: 3.0,          // 后台自动备菜时长 (s)
  passCapacity: 3,        // 出菜窗口容量（满则暂停后台备菜）
  grillTotal: 8.0,        // 火候总时长 / 焦糊线 (s)
  perfectStart: 5.0,      // [0, 5.0) 夹生窗，[5.0, 7.0) 完美窗
  perfectEnd: 7.0,        // [7.0, 8.0) 快焦预警窗，>= 8.0 焦糊
  burnTime: 8.0,          // 焦糊线 (s)
  cleanTime: 2.0,         // 吃完/提前离桌后桌面清理时长 (s)
  eatTime: 2.0,           // 最小用餐表现时长 (s)；自助制由 economy.ts 按 90min 压缩比计算
  rawLockSec: 0.35,       // 刚上桌烤防误双击保护窗 (s)
  rawPatienceDrop: 0.1,   // 夹生重烤时顾客耐心损耗比例
  burnPenalty: 0,         // 自助制焦糊不扣钱 (¥0)，只扣满意度与星级
  burnPatienceDrop: 0.4,  // 焦糊时顾客耐心大降比例
  burntLinger: 1.4,       // 焦糊作废卡片红态停留时长 (s)
  tipRate: 0.3,           // 旧字段保留兼容；自助制小费基数为 BIZ.entryFee（见 ECON.tipRate）
  fullTipPatience: 0.8,   // 剩余耐心 >= 80% 拿满小费
  overTipMult: 0.5,       // 快焦预警窗盛盘小费减半
};

export interface Level {
  duration: number;      // 单局时长 (s)，固定 BIZ.sessionSeconds = 300（5 分钟 = 90 真实分钟）
  target: number;        // 目标服务的客数 / 翻台客数（保留字段名兼容旧调用，语义与 targetGuests 一致）
  targetGuests: number;  // 目标服务客数（自助制以翻台客数 + 满意度考核）
  maxDiners: number;     // 最大同时用餐人数 / 本局客位数 (seats)
  spawnEvery: readonly [number, number]; // seconds between arrivals (min,max) while free table
  tableCooldown: number; // seconds before a freed table can re-seat (= COOK.cleanTime)
}

export const LEVELS: Level[] = [
  { duration: BIZ.sessionSeconds, target: 6,  targetGuests: 6,  maxDiners: 3, spawnEvery: [9, 14], tableCooldown: COOK.cleanTime },
  { duration: BIZ.sessionSeconds, target: 10, targetGuests: 10, maxDiners: 4, spawnEvery: [7, 11], tableCooldown: COOK.cleanTime },
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
