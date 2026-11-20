# 技术栈与工程约定

## 1. 栈

- Vite 7 + TypeScript 5.6(strict) + three.js 0.187 — 版本与 transport-ship-fps 对齐。
- 无后端：静态站 + `server/index.js`(zero-dep node http) 反代到 `/bbq/`。
- 进度持久化：`localStorage`(键 `bbq.level`, `bbq.best`)。
- 部署：pm2 `yunnan-bbq`，127.0.0.1:3035，公网 `https://openfolio.uk/bbq/`。

## 2. 目录结构 / 模块边界

```
index.html            canvas#game + #ui(DOM HUD 层)
src/
  main.ts             bootstrap：renderer/scene/loop/resize，挂 __game/__perf
  config.ts           全部可调数值(网格/时间/售价/颜色/灯参) — 改数值只动这里
  core/
    renderer.ts       WebGLRenderer + ACES + 阴影 + resize
    cameraRig.ts      OrthographicCamera 50° + lerp 跟随 + aspect 适配
    lighting.ts       PMREM 环境 / 炭火点光+flicker / 吊灯+光锥 / 雾 / 主光阴影
    textures.ts       程序化 canvas 贴图工厂(≤8 张，集中注册)
    input.ts          键盘 + 虚拟摇杆 + 动作键 → {move:Vec2, actionPressed}
  world/
    layout.ts         12×9 格子数据：walkable / 站点占位表
    kitchen.ts        台面/烤炉/料箱/切配/装盘/垃圾桶 几何+站点实体
    dining.ts         门/餐桌/椅/等待位
    props.ts          云南装饰(辣椒串/陶罐/扎染/青瓦/菌筐/吊灯杆)
  game/
    types.ts          Dish/Item/Station/Customer/Order/Phase 类型
    items.ts          物品工厂 + 网格外观(串→切→熟→焦→菜)
    stations.ts       站点行为表(可交互判定/动作语义/动画钩子)
    player.ts         Q版角色 + 移动 + 手持挂点
    customers.ts      生成/寻桌/就座/耐心/离店 + 头顶气泡
    grill.ts          3 烤位计时器 + 熟度外观 + 烟特效
    flow.ts           状态机 menu→playing→results；订单/经济/星级
  ui/
    hud.ts            顶栏(¥/⏱/★) + 订单卡 + 飘字层
    controls.ts       摇杆/动作按钮 DOM + 图标随语义切换
    panels.ts         开店面板 / 结算面板(星级/数据/重玩)
scripts/
  ci-deploy.sh        build→备份→发布→pm2→健康检查→回滚
  measure-look.mjs    Playwright 截图 + 亮度统计门槛
e2e/smoke.mjs         全链路断言(拿→切→烤→装→上→收 + 耐心归零离店)
server/index.js       静态服务 /bbq 前缀 + /api/health
```

边界规则：
- `world/*` 只建几何与数据，不含玩法判定；`game/*` 读写 world 暴露的站点/桌子实体。
- 所有 `setTimeout`/帧外逻辑禁止；一切走 `flow.update(dt)`。
- UI 层(DOM)不 import three；世界内提示用 sprite/canvas 由 `world`/`game` 管。

## 3. 性能预算

| 指标 | 上限 |
|---|---|
| draw calls | ≤120(`renderer.info.render.calls` 挂 `__perf.calls`) |
| 三角面 | ≤150k |
| 贴图 | ≤8 张 canvas(512–1024) |
| 同屏 PointLight | ≤7(3 烤炉 + 3 吊灯 + 1 门灯) 不投影 |
| 移动端 | ≥30fps(4 核 VPS 上 swiftshader e2e 只测像素) |

- 复用几何/材质；台面身、椅、烤位签、辣椒粒走 `InstancedMesh`。
- 物品(串/盘)≤ 40 个同时存在，超出走对象池(items.ts Pool)。
- 体积光锥 additive 无深度写；雾让远墙自然暗。

## 4. 验收门槛(回归必过)

```
npx tsc --noEmit
npm run build
node scripts/measure-look.mjs   # mean 70–110, darkFrac ≤0.25, p95 ≥150
node e2e/smoke.mjs              # 全链路 + 耐心归零
bash scripts/ci-deploy.sh       # DEPLOY OK
```

`window.__game` 暴露只读状态(phase/money/time/player/orders/customers) +
`window.__test` 测试钩子(传送/加速/造客) — e2e 专用，勿删。

## 5. 提交规范

`chore: scaffold` / `feat(world): …` / `feat(lighting): …` /
`feat(loop): …` / `feat(ui): …` / `test(e2e): …`，每块独立可 revert。
