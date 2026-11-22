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

// ---- real store menu (柳真真·云贵山岭烤肉 · 17 exact dishes across 4 categories) ----

export type DishCategory = '真真牛' | '云贵风味鸡' | '云贵菌类' | '特色时蔬';

export const DISH_CATEGORIES: readonly DishCategory[] = [
  '真真牛',
  '云贵风味鸡',
  '云贵菌类',
  '特色时蔬',
] as const;

// 小程序左侧其它五个类目暂缺菜品图：仅在数据结构预留空位，不编菜
export const RESERVED_CATEGORIES = [
  '山味上新',
  '四大招牌',
  '真真必吃系列',
  '猪肉系列',
  '虾虾丸子',
] as const;

export type ReservedCategory = (typeof RESERVED_CATEGORIES)[number];
export type MenuCategory = DishCategory | ReservedCategory;

export type DishId =
  | 'modern-beef'
  | 'mint-beef'
  | 'cumin-beef'
  | 'basil-chili-beef'
  | 'secret-beef-intestine'
  | 'chili-oil-beef-tendon'
  | 'shancheng-beef-tripe'
  | 'beef-mid-intestine'
  | 'lemongrass-chicken-thigh'
  | 'lemongrass-chicken-gizzard'
  | 'yunnan-porcini'
  | 'velvet-antler-mushroom'
  | 'cordyceps-flower'
  | 'button-mushroom'
  | 'zucchini'
  | 'alpine-mint-leaf'
  | 'southwest-celtuce-tip';

export interface Dish {
  id: DishId;
  name: string;
  shortName: string;
  category: DishCategory;
  price: number;
  patience: number;   // seconds
  hue: number;        // natural ingredient colour
  isNew?: boolean;
  note?: string;
}

export interface MenuEntry {
  id: DishId;
  name: string;
  shortName: string;
  category: DishCategory;
  price: number;
  isNew: boolean;
  note: string | null;
}

// 自助制（docs/GAME-DESIGN.md §2.0）：入场费 ¥79.9/人开局统一收，所有菜品 price 恒为 0
export const DISHES: Record<DishId, Dish> = {
  // 真真牛 (8) — 牛肉偏红/酱红自然肉色，自助制 ¥0
  'modern-beef':                { id: 'modern-beef',                name: '摩登现烤牛肉',     shortName: '现烤牛肉', category: '真真牛',     price: 0, patience: 75, hue: 0xb8463a },
  'mint-beef':                  { id: 'mint-beef',                  name: '云南高山薄荷牛肉', shortName: '薄荷牛肉', category: '真真牛',     price: 0, patience: 75, hue: 0xad4a3e },
  'cumin-beef':                 { id: 'cumin-beef',                 name: '特色山岭孜然牛肉', shortName: '孜然牛肉', category: '真真牛',     price: 0, patience: 75, hue: 0xb55336 },
  'basil-chili-beef':           { id: 'basil-chili-beef',           name: '罗勒糊辣椒牛肉',   shortName: '糊椒牛肉', category: '真真牛',     price: 0, patience: 75, hue: 0xa83c32 },
  'secret-beef-intestine':      { id: 'secret-beef-intestine',      name: '真真秘制牛小肠',   shortName: '秘制小肠', category: '真真牛',     price: 0, patience: 75, hue: 0xc47b62, isNew: true },
  'chili-oil-beef-tendon':      { id: 'chili-oil-beef-tendon',      name: '油辣子牛板筋',     shortName: '牛板筋',   category: '真真牛',     price: 0, patience: 75, hue: 0xb85234 },
  'shancheng-beef-tripe':       { id: 'shancheng-beef-tripe',       name: '山城风味牛肚',     shortName: '风味牛肚', category: '真真牛',     price: 0, patience: 75, hue: 0x9e6348 },
  'beef-mid-intestine':         { id: 'beef-mid-intestine',         name: '烤牛中肠丝',       shortName: '牛中肠丝', category: '真真牛',     price: 0, patience: 75, hue: 0xb86e54 },

  // 云贵风味鸡 (2) — 腌渍浅金褐/深红褐，自助制 ¥0
  'lemongrass-chicken-thigh':   { id: 'lemongrass-chicken-thigh',   name: '云南香茅草鸡腿肉', shortName: '香茅鸡腿', category: '云贵风味鸡', price: 0, patience: 82, hue: 0xd69a68 },
  'lemongrass-chicken-gizzard': { id: 'lemongrass-chicken-gizzard', name: '云贵香茅草鸡胗',   shortName: '香茅鸡胗', category: '云贵风味鸡', price: 0, patience: 82, hue: 0xa95e4c },

  // 云贵菌类 (4) — 褐/杏/奶白菌菇色，自助制 ¥0
  'yunnan-porcini':             { id: 'yunnan-porcini',             name: '云南牛肝菌',       shortName: '牛肝菌',   category: '云贵菌类',   price: 0, patience: 90, hue: 0x9c6e46, note: '不可和啤酒同食' },
  'velvet-antler-mushroom':     { id: 'velvet-antler-mushroom',     name: '鹿茸菌',           shortName: '鹿茸菌',   category: '云贵菌类',   price: 0, patience: 90, hue: 0xb58656 },
  'cordyceps-flower':           { id: 'cordyceps-flower',           name: '虫草花',           shortName: '虫草花',   category: '云贵菌类',   price: 0, patience: 90, hue: 0xd49642, note: '婴幼儿、儿童、孕妇、食用菌过敏者不宜食用' },
  'button-mushroom':            { id: 'button-mushroom',            name: '口蘑',             shortName: '口蘑',     category: '云贵菌类',   price: 0, patience: 90, hue: 0xd6cbb8 },

  // 特色时蔬 (3) — 自然青翠时蔬色，自助制 ¥0
  'zucchini':                   { id: 'zucchini',                   name: '西葫芦',           shortName: '西葫芦',   category: '特色时蔬',   price: 0, patience: 95, hue: 0x7aa658 },
  'alpine-mint-leaf':           { id: 'alpine-mint-leaf',           name: '云南高山薄荷叶',   shortName: '薄荷叶',   category: '特色时蔬',   price: 0, patience: 95, hue: 0x4e8a52 },
  'southwest-celtuce-tip':      { id: 'southwest-celtuce-tip',      name: '西南翠凤尾',       shortName: '翠凤尾',   category: '特色时蔬',   price: 0, patience: 95, hue: 0x639c4c, isNew: true },
};

export const DISH_LIST: readonly Dish[] = Object.values(DISHES);

export const DISHES_BY_CATEGORY: Record<DishCategory, readonly Dish[]> = {
  '真真牛': DISH_LIST.filter((d) => d.category === '真真牛'),
  '云贵风味鸡': DISH_LIST.filter((d) => d.category === '云贵风味鸡'),
  '云贵菌类': DISH_LIST.filter((d) => d.category === '云贵菌类'),
  '特色时蔬': DISH_LIST.filter((d) => d.category === '特色时蔬'),
};

export const MENU_SCHEMA: Record<MenuCategory, readonly Dish[]> = {
  '山味上新': [],
  '四大招牌': [],
  '真真必吃系列': [],
  '猪肉系列': [],
  '虾虾丸子': [],
  ...DISHES_BY_CATEGORY,
};

export const MENU_EXPORT: readonly MenuEntry[] = Object.freeze(
  DISH_LIST.map((d) => Object.freeze({
    id: d.id,
    name: d.name,
    shortName: d.shortName,
    category: d.category,
    price: d.price,
    isNew: Boolean(d.isNew),
    note: d.note ?? null,
  })),
);

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
