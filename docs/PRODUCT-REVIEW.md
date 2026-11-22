# 产品走查报告 — 柳真真云南烤肉

> 只写文档，不改代码。每轮 3–4 个剧本步骤深挖，轮转覆盖 ①–⑩。
> 截图目录：`e2e/review/<UTC>-live/`（竖屏 `port-*` 390×844、横屏 `land-*` 844×390，含 `run-*.json` 原始测量）。

## 2026-11-22 00:30Z 第 25 轮

**本轮覆盖剧本**：① 首屏（文案、视觉锚点、入口与模态层）、② 移动（真实指针拖拽摇杆 + WASD/碰撞）、⑥ 顾客耐心归零离店与评级联动、⑦ 打烊结算面板与「进入第 2 关」/失败重开分支、⑧ 竖屏/横屏 3 客同屏 HUD 几何与遮挡；③④⑤⑨⑩ 已在第 24 轮覆盖，本轮不重复。
**环境说明**：被测对象为本机 `http://127.0.0.1:3035/`，`window.__build = 7a0b365-202611220002`，入口 `assets/index-YjesMXwn.js`，仓库 HEAD `7a0b365`。公网 `https://openfolio.uk/bbq/` 实测仍为香港旧源站（`__build = 2290acb-202611210547`、`assets/index-BklOlgyL.js`，`B-081` 未解决，仍是唯一 P0），**本轮结论只适用于 `7a0b365` 构建**。竖屏 390×844 与横屏 844×390 各独立会话，`deviceScaleFactor=1`，SwiftShader 软渲染；首屏从 goto 到面板可点实测 6.4s（软渲染耗时，不代表真机）。4 个会话录得 `pageerror + console.error = 0`，控制台仅 2 条 Three.js warning：`THREE.Clock ... deprecated`、`THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`。本轮逐张判读 `e2e/review/2026-11-22T00-30Z-r25/` 内全部 14 张截图。

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视/格子感/高饱和食材/Q 版角色） | 3.5 | 正交俯视木地板拼缝、一字厨房台面、三只料箱顶面食材实物与箱前斗方挂牌、左墙低饱和陶罐/空竹筐及白帽红围裙 Q 版厨师清晰可读（`port-15-hud-3seated.png`、`land-15-hud-3seated.png`）；扣分在竖屏后墙绿檐口上方仍露越界木地板且蓝色扎染穿檐（`port-03-joystick-move.png`、`port-15-hud-3seated.png`），横屏上排餐桌与顾客头身被顶缘截切、后墙装饰全出画（`land-15-hud-3seated.png`），首屏卡片重度虚化背景下无任何烤肉/经营视觉徽标（`port-01-title.png`、`land-01-title.png`），以及两名顾客同帧到店在门口模型与气泡完全重叠（`B-128`）。 |
| ② 灯光（暖光池/炭火点光/雾/明暗层次） | 3.3 | 竖屏餐区暖铜吊灯体积光锥、桌面暖光池与烤炉向台前地板漫射的炭火橙光层次分明（`port-03-joystick-move.png`、`port-15-hud-3seated.png`、`port-10-level2.png`）；扣分在横屏吊灯本体全部出画仅余桌面浅光斑、烤网前沿高光过亮（`land-15-hud-3seated.png`、`land-10-level2.png`），静态帧读不出 `FogExp2` 雾的纵深，竖屏底部纯暗控制带硬截断暖光木地板（`port-15-hud-3seated.png`）。 |
| ③ HUD 是否整齐（对齐/字号/不重叠/不挡操作） | 2.3 | `B-117` 已落地：动作键双端达 `84×84` 且文案 `16px` 清晰，横屏摇杆 `112×112 @(16,262)` 与动作键 `84×84 @(734,290)` 底边均 `374` 对齐且交叠 `0`，横屏 3 张订单卡落于 `159×133.5 @(675,150..283.5)`（`land-15-hud-3seated.png`）；但多客与模态态暴露多项严重 HUD 缺陷：竖屏 3 客时 t3 气泡右缘 `477.6` 出画 `87.6px`、桌号 `(3)` `450.2…478.2` 完全在 390px 视口外（`port-15-hud-3seated.png`），横屏 t2 气泡与顶栏交叠约 `92×10px`、t1 气泡与 `(1)` 交叠约 `18.7×13.3px`（`land-15-hud-3seated.png`），横屏摇杆仍压住垃圾桶与五花肉料箱（`land-03-joystick-move.png`），竖屏摇杆底 `822` 与动作键底 `814` 差 `8px`（`port-15-hud-3seated.png`），顶栏缺少本关目标额（`port-15-hud-3seated.png`），且首屏/结算态局内 HUD 未隐藏（`port-01-title.png`、`land-01-title.png`、`land-09-results.png`）。 |
| ④ 明显缺陷（穿模/悬空/贴图错误/文字溢出/错位） | 2.8 | 4 会话 `0` JS error，切关进入第 2 关、失败重开刷客及愤怒降星（`3★→1★`）链路稳定（`port-08-angry-gone.png`、`port-10-level2.png`、`land-10-level2.png`）；扣分在公网仍停旧包 `2290acb`（`B-081` P0）、竖屏 t3 顾客订单标注整块出画（`port-15-hud-3seated.png`）、同时到店顾客在门口模型与 `159.8×32 @(159.8,191.3)` 气泡完全重叠（`B-128`）、横屏气泡压顶栏与 `(1)` 错位叠压（`land-03-joystick-move.png`、`land-15-hud-3seated.png`）、模态态未隐藏局内 HUD（`land-01-title.png`、`land-09-results.png`）及控制台残留 2 条 Three.js warning。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 2.7 | 首屏卡片完整交代店名、五步流程与第 1 关 `¥180` 目标（`port-01-title.png`、`land-01-title.png`），耐心剩 3–4s 时订单卡与气泡同步转红 `#e05a3a` 警示明确（`port-06-patience-low.png`、`land-06-patience-low.png`）；但局内顶栏仅显示 `第 1 关 \| 营业额 ¥0 \| 时间 \| 评级` 无目标额与达成进度（`port-15-hud-3seated.png`），竖屏第 3 桌订单标注不可见（`port-15-hud-3seated.png`），结算页同屏出现绿字「目标达成，进入第 2 关」与 `★☆☆` / 愤怒离店 `3 位` 却零星级归因说明（`port-09-results.png`、`land-09-results.png`），首屏也缺品类徽标与「继续上次进度」。 |
| 操作手感 | 3.2 | 真实指针右推摇杆 `46px`（约 0.7R）双端位移稳定（竖屏 `4.15m`、横屏 `4.18m`，`port-03-joystick-move.png`、`land-03-joystick-move.png`），空旷区 WASD 四向可用，动作键已扩至 `84×84` 热区舒适（`B-117` 已修）；扣分在撞入餐桌/台面碰撞盒四向归零时零受阻反馈（`B-119`）、竖屏两键底距差 `8px`（`B-103`）及横屏摇杆遮挡最左料箱（`land-03-joystick-move.png`）。 |
| 正反馈（爽感） | 2.5 | 评级按状态准确联动（`money=200, served=3` 时 `data-stars="3"`，3 人愤怒离店后双端同步回落 `data-stars="1"`，`port-06-patience-low.png` → `port-08-angry-gone.png`、`land-06-patience-low.png` → `land-08-angry-gone.png`），达标点「进入第 2 关」后即时切换 `第 2 关` 且 `levelTarget=260, timeLeft=180`（`port-10-level2.png`、`land-10-level2.png`）；但顾客愤怒离店全程无飘字、无音效（`#bbq-popups` 空，`port-08-angry-gone.png`），结算缺小费拆解与星级原因，局内顶栏无目标达成进度感。 |

综合评分：2.9/5（比上轮 3.1 -0.2）

### 我能做的（Capability）
- **① 首屏基础信息完整可读与开店入口可用**：双端首屏卡片 `283.4×241`（竖屏 `@(53.3,301.5)`、横屏 `@(280.3,74.5)`）完整显示 `柳真真云南烤肉` / `炭火生香，小店开张。` / `取料 → 切配 → 炭烤 → 装盘 → 上菜` / `第 1 关 · 目标：3 分钟营业额 ¥180` 与 `150×45`（`16px`）`开 店` 按钮（`port-01-title.png`、`land-01-title.png`）。
- **② 虚拟摇杆拖拽与空旷区 WASD 移动稳定生效**：真实指针右推摇杆 `46px`（约 0.7R）录得竖屏位移 `4.15m`、横屏 `4.18m`（`port-03-joystick-move.png`、`land-03-joystick-move.png`）；WASD 0.55s 按键在空旷点（竖屏 `(0,0)` D `+1.65` / A `-2.93` / W `-1.17` / S `+2.13` m；横屏 `(4.5,1.5)` D `+0.91` / A `-3.63` / W `-2.03` / S `+0.64` m）均正常移动；动作键 `84×84`（`16px`）已达成 `B-117` 要求。
- **⑥ 耐心低谷警示、归零离店与评级下降闭环达标**：3 位顾客就座（t1 五花肉拼盘、t2 烤菌子、t3 豆泥米线）在 `setPatience(3~4)` 时订单卡加 `class="card angry"`、气泡加 `class="bubble angry"` 且圆环转红 `#e05a3a`（`port-06-patience-low.png`、`land-06-patience-low.png`）；`setPatience(0.2)` 后约 2.2s 全部进入离店流程、`angry 0→3`，再 3s 后顾客/卡片/气泡清零；顶栏评级从 `money=200, served=3` 的 `data-stars="3"` 在 3 人愤怒离店后双端同步回落为 `data-stars="1"`（`port-08-angry-gone.png`、`land-08-angry-gone.png`）。
- **⑦ 结算达标切关与失败重开双分支跑通 + ⑩ 零 JS 报错**：达标结算（`¥260 / ¥180`、服务 3、愤怒 3、废料 0、`1★`）点 `进入第 2 关`（`150×45`）切至 `phase=playing, level=2, levelTarget=260, timeLeft=180` 且面板消失（`port-09-results.png` → `port-10-level2.png`、`land-09-results.png` → `land-10-level2.png`）；失败分支（`money=0`）显示 `离目标还差 ¥180` 与唯一按钮 `再 开 一 局`，点击后回第 1 关、`timeLeft=180` 且推进 30s 后 2 位顾客自动就座。4 会话 `pageerror + console.error = 0`。

### 我看不懂的（Clarity）
1. **打到一半，我怎么知道离过关还差多少钱？** 顶栏只有 `第 1 关 | 营业额 ¥0 | 时间 2:52 | 评级 ★☆☆`（`port-15-hud-3seated.png`、`land-15-hud-3seated.png`），过关目标 `¥180` 仅在首屏和打烊结算出现，局中全程看不到目标额与达成进度（新 → `B-125`）。
2. **达标 ¥260/¥180 还写着绿字「目标达成，进入第 2 关」，为什么只给 1★？小费去哪了？** `port-09-results.png`、`land-09-results.png` 中 `.stars-big[data-stars="1"]`、绿字 `目标达成，进入第 2 关` 与红字 `愤怒离店 3 位` 直接并列，面板既无 `[data-star-reason]` 解释因愤怒 3 位锁 1★，也无 `[data-revenue-breakdown]` 拆解小费（沿用 `B-116`、`B-065`）。
3. **竖屏 3 张订单卡亮着，第 3 位顾客在哪？** `port-15-hud-3seated.png`、`port-06-patience-low.png` 右上显示 `3 豆泥米线`，但场景中 t3 气泡 `x=375.6…477.6` 出画 `87.6px`（仅最左 `14.4px` 残边露在屏右），桌号圆牌 `(3)` `x=450.2…478.2` 完全在 390px 视口外，竖屏找不到第 3 桌的标注与位置（新 → `B-127`，升级 `B-101`）。
4. **三位顾客怎么一声不吭就没了？** `port-08-angry-gone.png`、`land-08-angry-gone.png` 中 3 人耐心归零离店后 `#bbq-popups` 为空，无任何扣分飘字或音效，只能靠扫视顶栏降星和突然变空的餐桌事后察觉（沿用 `B-107`）。
5. **开屏重度糊底 + 纯文字卡片，首眼看不出是烤肉经营，也找不到继续上次进度**：`port-01-title.png`、`land-01-title.png` 正面无 `svg[data-brand-emblem]` 视觉徽标，入口仅 `开 店`，无「继续上次进度」（沿用 `B-120`）。

### 让我不爽的（Friction）
1. **模态首屏和结算面板下面，局内摇杆/动作键/订单卡还在**：首屏 `#bbq-stick` opacity `0.85`、`#bbq-act` opacity `0.55` 清晰透出（`port-01-title.png`、`land-01-title.png`）；结算态 DOM 实测 `#bbq-stick` `0.85`、`#bbq-act` `1`、`#bbq-orders` `1` 仍为 `visible`，横屏 `land-09-results.png` 面板外可辨出模糊的局内 HUD 轮廓，弹窗不干净（新 → `B-126`，延续 `B-070`）。
2. **横屏桌位气泡一边撞顶栏、一边被桌号牌压着**：`land-15-hud-3seated.png`、`land-06-patience-low.png` 中 3 桌气泡均在 `y=34…66`，与顶栏 `y=8…44` 冲突——t2 气泡 `x=340.8…432.8` 与顶栏 `x=264.3…579.7` 交叠约 `92×10px`（`B-093`）；同时 t1 气泡右端与 `(1)` 桌号牌（`175.9…203.9, 52.7…80.7`）交叠约 `18.7×13.3px`（`B-122`），`land-03-joystick-move.png` 中 t2/t4 气泡同样压住顶栏底缘与 `(2)`。
3. **竖屏 3 张订单卡吃掉右上 1/5 空间，且摇杆/动作键底边不齐**：竖屏 `#bbq-orders` 占 `187×159.5 @(193,60)` 左缘压到 `x=193`（`port-15-hud-3seated.png`）；左下摇杆 `130×130 @(22,692)` 底边 `822`（距底 `22px`），右下动作键 `84×84 @(280,730)` 底边 `814`（距底 `30px`），差 `8px`（沿用 `B-103`）。
4. **撞到餐桌或台面边角直接僵住零反馈**：在碰撞盒内（竖屏 `(2.5,-0.5)`、`(3.2,3.1)` 四向归零；`(-1,0)` 仅 W 可动）角色彻底停住，无轻弹、无提示、无声效，易被误认为输入卡死（沿用 `B-119`）。
5. **同时到店的顾客在门口叠成一个重影**：两名顾客同帧入场时模型叠在一起，`#bbq-bubbles .bubble` 出现两条 rect 完全相同（`159.8×32 @(159.8,191.3)`）的 `…` 气泡，观感粗糙（新 → `B-128`）。

### 让我想继续玩的（Hook）
- **升级后的 `84×84` 动作键与稳定摇杆让基础走位顺手了**：双端摇杆右推位移高度一致（`4.15m` / `4.18m`），`B-117` 改完后动作键热区放大到 `84×84` 且文案 `16px` 清晰，横屏左右两键底边齐平在 `374`（`land-10-level2.png`、`port-10-level2.png`）。
- **低耐心转红警示与星级扣分联动真实可信**：3 位顾客耐心降至 3–4s 时三张卡与气泡同步亮红环（`port-06-patience-low.png`、`land-06-patience-low.png`），放任离店后顶栏评级实打实从 `3★` 跌到 `1★`（`port-08-angry-gone.png`、`land-08-angry-gone.png`），紧迫感机制已经成立。
- **过关进第 2 关（目标升至 ¥260）与失败重开闭环可靠**：点「进入第 2 关」立即切关重计 `3:00`（`port-10-level2.png`、`land-10-level2.png`），差局重开也能正常刷客，关卡递进骨架已跑通。

### P0 阻塞（不修没法玩）
1) **公网 `https://openfolio.uk/bbq/` 仍停留在香港旧源站 `2290acb`，与本机 `7a0b365` 持续脱节（沿用 `B-081`；本机 `7a0b365` 本轮 ①②⑥⑦⑧ 无新 P0）**
   - 现象：公网实测仍返回 `__build = 2290acb-202611210547`、`assets/index-BklOlgyL.js`，而本机 `127.0.0.1:3035` 已是 `7a0b365-202611220002`、`assets/index-YjesMXwn.js`；线上玩家仍完全看不到 `B-094`/`B-106`/`B-110`/`B-117` 等所有近期修复。
   - 复现步骤：分别请求 `https://openfolio.uk/bbq/` 与 `http://127.0.0.1:3035/`，读取 `window.__build` 与 HTML 中入口 `<script>` 的 `assets/index-*.js` 文件名。
   - 截图路径：本轮 14 张截图均采自本机 `7a0b365`（例如 `e2e/review/2026-11-22T00-30Z-r25/port-15-hud-3seated.png`、`e2e/review/2026-11-22T00-30Z-r25/land-15-hud-3seated.png` 仅代表本机最新包）。
   - **验收标准**：部署完成后 60s 内，公网 `https://openfolio.uk/bbq/` 与本机 `127.0.0.1:3035` 返回的入口脚本名及 `window.__build` 完全一致，且公网双端（390×844、844×390）断言 `#bbq-act` 宽高 `>= 84×84`、料箱食材节点可见，连跑 3 次 0 JS error。

### P1 明显缺陷
1) **局内顶栏缺本关目标额与达成进度（新 → `B-125`）**
   - 现象：局内顶栏只有 `第 1 关 | 营业额 ¥0 | 时间 2:52 | 评级`，过关目标 `¥180`（第 2 关 `¥260`）仅在首屏和打烊结算出现，玩家局中无法判断距离达标还差多少。
   - 复现步骤：双端点击「开 店」进入第 1 关（及过关进入第 2 关），读取 `.topbar` 全部文本内容并查询 `[data-level-target]`。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/port-15-hud-3seated.png`、`e2e/review/2026-11-22T00-30Z-r25/port-10-level2.png`、`e2e/review/2026-11-22T00-30Z-r25/land-15-hud-3seated.png`、`e2e/review/2026-11-22T00-30Z-r25/land-10-level2.png`。
   - **验收标准**：顶栏存在可见的 `[data-level-target]` 节点，第 1 关开局文本含 `¥0 / ¥180`（第 2 关含 `¥0 / ¥260`），触发 `onMoney` 后当帧更新且与结算面板目标额严格一致；顶栏不换行不越界；双端 3 连跑 0 JS error。
2) **结算/菜单模态态局内 HUD 未隐藏，弹窗外仍透出触控层与订单卡（新 → `B-126`，延续 `B-070`）**
   - 现象：首屏模态态 `#bbq-stick` opacity `0.85`、`#bbq-act` opacity `0.55` 且 `visibility: visible`；结算模态态 `#bbq-stick` opacity `0.85`、`#bbq-act` opacity `1`、`#bbq-orders` opacity `1` 均为 `visible`，横屏结算图面板外可辨出已模糊的摇杆、动作键与订单卡（竖屏被面板主体遮挡基本不可见）。
   - 复现步骤：双端停在首屏（`phase === 'menu'`）以及完成一局进入打烊结算（`phase === 'results'`），读取 `#bbq-stick`、`#bbq-act`、`#bbq-orders` 的 `getComputedStyle().opacity` 与 `display`/`visibility`。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/port-01-title.png`、`e2e/review/2026-11-22T00-30Z-r25/land-01-title.png`、`e2e/review/2026-11-22T00-30Z-r25/port-09-results.png`、`e2e/review/2026-11-22T00-30Z-r25/land-09-results.png`。
   - **验收标准**：当 `phase === 'results' || phase === 'menu'` 时，`#bbq-stick`、`#bbq-act`、`#bbq-orders` 全部满足 `opacity === '0'` 或 `display === 'none'`；点击「开 店」/「进入第 2 关」/「再 开 一 局」退出模态后 1 帧内恢复可见；双端 3 连跑 0 JS error。
3) **竖屏第三位顾客的订单气泡整块出画、桌号圆牌 `(3)` 完全在视口外（新 → `B-127`，升级 `B-101`）**
   - 现象：竖屏 390×844 同时有 3 位顾客就座时，t1 气泡 `x=28…150`、t2 `210…303.8` 均在屏内，但 t3 气泡 `x=375.6…477.6` 右缘出画 `87.6px`（仅有 `14.4px` 可见），桌号圆牌 `(3)` `x=450.2…478.2` 完全在 390px 视口外，第 3 位顾客的订单标注实质不可见。
   - 复现步骤：390×844 竖屏让 t1（五花肉拼盘）、t2（烤菌子）、t3（豆泥米线）同时就座，读取所有 `#bbq-bubbles .bubble` 与 `.order-num` 的 `getBoundingClientRect()`。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/port-15-hud-3seated.png`、`e2e/review/2026-11-22T00-30Z-r25/port-06-patience-low.png`。
   - **验收标准**：3 位顾客就座时，每个可见气泡均满足 `left >= 4 && right <= vw - 4`，屏幕外桌位必须渲染贴右缘的离屏指示（带 `#bbq-offscreen` 类，含菜品图标与桌号）；双端 3 连跑 0 JS error。
4) **结算面板缺少星级归因说明与小费拆解，「目标达成」与 1★ / 愤怒离店 3 位零解释并列（沿用 `B-116`、`B-065`）**
   - 现象：达标局（`营业额 ¥260 / ¥180`、服务 `3 位`、愤怒离店 `3 位`、废料 `0 份`）结算面板显示 `.stars-big[data-stars="1"]` 与绿字 `目标达成，进入第 2 关`，无 `[data-star-reason]` 解释为何达标仅 1★，也无 `[data-revenue-breakdown]` 拆解小费。
   - 复现步骤：构造营业额 `¥260 / ¥180`、服务 3 位、愤怒离店 3 位进入打烊结算，检查面板 DOM 是否存在 `[data-star-reason]` 与 `[data-revenue-breakdown]`。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/port-09-results.png`、`e2e/review/2026-11-22T00-30Z-r25/land-09-results.png`。
   - **验收标准**：沿用 `B-116`，结算面板必须渲染可见的 `[data-star-reason]`（当 `angry >= 3` 时明确说明愤怒离店锁定 1★）与 `[data-revenue-breakdown]`（拆解 `含小费 ¥X` 且与 `flow` 累计一致），达标低星副标题与 1★ 语义自洽；双端 3 连跑 0 JS error。
5) **横屏顾客气泡压住顶栏且 1 号桌气泡被桌号圆牌 `(1)` 压截（沿用 `B-093`、`B-122`）**
   - 现象：横屏 844×390 3 客就座时，3 个气泡均位于 `y=34…66`，与顶栏 `y=8…44` 垂直重叠——第 2 桌气泡（`x 340.8…432.8`）与顶栏（`x 264.3…579.7`）在 `y 34–44` 交叠约 `92×10px`；同时气泡 1 右端与 `(1)` 桌号牌（`175.9…203.9, 52.7…80.7`）交叠约 `18.7×13.3px`。
   - 复现步骤：844×390 横屏让 t1/t2/t3 三桌同时就座（及移动至 t2/t4 在座态），测量 `.topbar`、全部 `.bubble` 与 `.order-num` 的交叠矩形。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/land-15-hud-3seated.png`、`e2e/review/2026-11-22T00-30Z-r25/land-06-patience-low.png`、`e2e/review/2026-11-22T00-30Z-r25/land-03-joystick-move.png`。
   - **验收标准**：沿用 `B-093`/`B-122`，横屏 3 客就座及移动态下，所有可见 `.bubble` 与 `.topbar`、`.order-num` 的交叠面积严格 `=== 0` 且气泡文本无截断；双端 3 连跑 0 JS error。
6) **顾客耐心归零愤怒离店全程无飘字、无音效（沿用 `B-107`）**
   - 现象：`setPatience(0.2)` 后约 2.2s 3 位顾客进入离店流程、`angry 0→3`，全程 `#bbq-popups` 为空，无任何扣分飘字或音效提示。
   - 复现步骤：令 3 位就座顾客耐心归零（`setPatience(0.2)`）并观测离店 5s 窗口内的 `#bbq-popups` 与场景表现。
   - 截图路径：`e2e/review/2026-11-22T00-30Z-r25/port-08-angry-gone.png`、`e2e/review/2026-11-22T00-30Z-r25/land-08-angry-gone.png`。
   - **验收标准**：沿用 `B-107`，`angry` 递增后 0.5s 内 `#bbq-popups .popup` 出现可见扣分提示（匹配 `/愤怒|满意度/` 且与 `.topbar` 交叠 `0`），离店顾客头顶展示 ≥20×20px 红怒图标 ≥0.6s；双端 3 连跑 0 JS error。

### P2 打磨项
1) **同时到店顾客在门口完全重叠（新 → `B-128`）**：两名顾客同帧入场时 `#bbq-bubbles .bubble` 出现两条 rect 完全相同（`159.8×32 @(159.8,191.3)`）的 `…` 气泡，角色模型也完全叠在一起，需错帧入场（间隔 ≥0.35s）或门口横向散开 ≥0.6m。
2) **竖屏摇杆与动作键底边未对齐（沿用 `B-103`；`B-117` 84×84 已修）**：竖屏 `#bbq-stick` `130×130 @(22,692)` 底边 `822`（距底 `22px`）vs `#bbq-act` `84×84 @(280,730)` 底边 `814`（距底 `30px`），差 `8px`（`port-15-hud-3seated.png`）；横屏两键底边均 `374` 已对齐。
3) **碰撞餐桌/台面时零受阻反馈（沿用 `B-119`）**：进入碰撞盒（竖屏 `(2.5,-0.5)`、`(3.2,3.1)` 四向归零；`(-1,0)` 仅 W 可动）时无轻弹、无滑行、无提示，需补轻阻反馈与边角滑行。
4) **首屏卡片缺烤肉/经营视觉徽标且无「继续上次进度」入口（沿用 `B-120`）**：`port-01-title.png`、`land-01-title.png` 均无 `svg[data-brand-emblem]`，且过关后无首屏继续入口。
5) **控制台残留 2 条 Three.js 弃用 warning**：4 会话均输出 `THREE.Clock ... deprecated` 与 `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`，待升级清理。

### 与本轮 SPEC 的差距
- **`docs/GAME-DESIGN.md` §3（关卡：Lv.1 时长 180s / 目标营业额 ¥180 / 同时在店上限 3 / 达标解锁下一关写 `bbq.level`）**：切关至第 2 关（`level=2, levelTarget=260, timeLeft=180`）与失败重开已跑通（`port-10-level2.png`、`land-10-level2.png`），但局内顶栏未展示目标额 `¥180`/`¥260` 与进度（新 → `B-125`），首屏也未提供「继续上次进度」入口（`port-01-title.png`）。
- **`docs/GAME-DESIGN.md` §4（评分：`angry ≥ 3` 星级上限锁 1★、局内顶栏与结算共用同一函数、结算展示星级/营业额+目标/服务/满意度/废料）**：局内降星（`3★→1★`）与结算 1★ 口径已一致（`port-06-patience-low.png`、`port-08-angry-gone.png`、`port-09-results.png`）；差距在结算页无 `[data-star-reason]` 解释为何达标仍 1★、无 `[data-revenue-breakdown]` 小费拆解（沿用 `B-116`、`B-065`）。
- **`docs/GAME-DESIGN.md` §5（场地 `12m × 9m，1m 网格`、台面不可穿越）**：餐桌/台面碰撞阻挡有效但零受阻反馈（沿用 `B-119`），且同帧入场顾客在门口完全重叠（新 → `B-128`）。
- **`docs/GAME-DESIGN.md` §6（交互：左下虚拟摇杆 `r=56px` / 速度 `3.2 m/s`、右下大按钮 `⌀72px`、桌面 WASD）**：横屏摇杆 `112×112`（`r=56px`）、动作键 `84×84`（高于 `⌀72px`，`B-117` 已修）、摇杆移动 `4.15m`/`4.18m` 与空旷区 WASD 均达标；差距在竖屏两键底边差 `8px`（沿用 `B-103`），且菜单/结算模态态未隐藏触控控件与订单卡（新 → `B-126`，延续 `B-070`）。
- **`docs/GAME-DESIGN.md` §7（手感与反馈：愤怒离店顾客头顶红怒符号 `0.6s`，路径回门）**：离店路径与 `angry 0→3` 数值生效，但 `#bbq-popups` 为空、无飘字无音效，缺少可读的离店负面反馈（`port-08-angry-gone.png`、`land-08-angry-gone.png`，沿用 `B-107`）。
- **`docs/ART-DIRECTION.md` §1（镜头：可见地面落在 12×9m 世界内；横屏摇杆 112px 竖屏 128px，摇杆与动作键同步贴底距 `max(16px, safe-area)`）**：横屏双键已对齐底边 `374`（距底 `16px`），但竖屏摇杆 `130×130` 距底 `22px` vs 动作键 `84×84` 距底 `30px` 未同步（沿用 `B-103`）；竖屏后墙绿檐口上方仍露越界木地板、横屏摇杆仍压五花肉料箱（`port-15-hud-3seated.png`、`land-15-hud-3seated.png`）。
- **`docs/ART-DIRECTION.md` §5（UI 皮肤：HUD 字号 `≥13px`、订单卡右上竖排 ≤3 张含金→红倒计时环、横屏 `max-width 168px / top:150px` 不压状态条不越右缘）**：动作键 `16px`、横屏订单卡 `159×133.5 @(675,150..283.5)` 与愤怒红环 `#e05a3a` 均达标；差距在竖屏 t3 气泡出画 `87.6px`、桌号 `(3)` 完全出画（新 → `B-127`），横屏 t2 气泡与顶栏交叠 `92×10px`（`B-093`）、t1 气泡与 `(1)` 交叠 `18.7×13.3px`（`B-122`），且模态态下局内 HUD 未隐藏（新 → `B-126`）。

## 2026-11-21 23:08Z 第 24 轮
**本轮覆盖剧本**：③ 料箱取生串→砧板切配（进度/文字）、④ 上烤炉（生/已熟/焦糊三态与提示→取下→丢弃）、⑤ 装盘→端到餐桌→顾客吃到→收钱/营业额增加、⑨ 反复快速点同一交互键（取料/切配/装盘/上菜各 4–5 连点）、⑩ 控制台错误与警告；① 首屏、② 移动、⑥ 愤怒离店、⑦ 结算、⑧ 全量多卡 HUD 留给后续轮。
**环境说明**：被测对象为本机 `http://127.0.0.1:3035/`，`window.__build = 5f7d148-202611212302`，入口 `assets/index-DXyUgwlT.js`，HEAD `5f7d148 fix(game): B-110 成品菜(stage=plated)禁止引导去垃圾桶`。公网 `https://openfolio.uk/bbq/` 源站仍为香港旧包（`B-081` 未解决），本轮不以公网为结论依据，**本轮结论只适用于 5f7d148 构建**。4 个独立会话（竖屏 390×844 / 横屏 844×390 × 2 次，deviceScaleFactor 1）均录得 `pageerror + console.error = 0`；控制台仍存在 2 条 Three.js 弃用 warning：`THREE.Clock: This module has been deprecated`、`THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`。本轮实看 `e2e/review/2026-11-21T23-09Z-r24/` 内 10 张正式截图。

综合评分：3.1/5（比上轮 2.8 +0.3）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房 | 3.5 | 本机 `5f7d148` 已可见 `B-094` 三个料箱顶面食材实物（粉白五花肉块、褐色菌子簇、黄色米线团）与箱前斗方挂牌，左墙陶罐/竹筐低饱和不抢戏，Q 版白帽红围裙厨师与 1m 模块台面骨架清晰（`port-01-chop-progress.png`、`land-01-chop-progress.png`）；扣分在烤炉 3 烤位仍是整条连续横纹、炉上串过小几乎不可见（实测肉块 ≈ 3px、整串 ≈ 16px，`port-02-grill-cooked.png`、`land-02-grill-cooked.png`），竖屏后墙绿檐口上方仍露越界木地板、扎染穿檐且黑板右缘被裁（`port-01-chop-progress.png`、`port-05-serve-paid.png`），横屏餐区上排桌子被顶缘切掉大半（`land-01-chop-progress.png`）。 |
| ② 灯光 | 3.3 | 竖屏餐区 3 盏暖铜吊灯体积光锥、桌面暖光池与烤炉向台前地板漫射的炭火橙光层次到位（`port-02-grill-cooked.png`、`port-04-plated-guide.png`）；扣分在烤网前沿高光反射过强把炉上烤串完全淹没（`port-02-grill-cooked.png`、`land-02-grill-cooked.png`），静态帧读不出 `FogExp2` 纵深，横屏吊灯本体全部出画（`land-02-grill-cooked.png`），竖屏底部约 170px 纯暗色带硬截断暖光地板（`port-01-chop-progress.png`）。 |
| ③ HUD | 2.7 | 顶栏评级 `★☆☆`（`data-stars=1`）口径准确，横屏订单卡已落到 `159×42 @(675,150)` 不再撞顶栏（`land-01-chop-progress.png`）；但多处明显遮挡仍在：竖屏 1 号桌气泡左侧金环被 `x=0` 裁切（`port-01-chop-progress.png`）；横屏 1 号桌气泡尾字「盘」被圆牌 `(1)` 压截成「烤五花肉拼」（`land-01-chop-progress.png`–`land-03-grill-burnt.png`），装盘引导时 `↑ 1号桌` 又压在 `(1)` 与气泡上形成三层叠压（`land-04-plated-guide.png`）；横屏摇杆仍压住五花肉料箱与挂牌（`land-01-chop-progress.png`、`land-05-serve-paid.png`）；切配条 `.cb` 挡厨师脸、「取」字章和 `(1)` 牌压厨师身体（`port-01-chop-progress.png`、`port-02-grill-cooked.png`、`land-05-serve-paid.png`）；动作键 76×76 偏紧且引导态呈低对比虚线圆占位（`port-04-plated-guide.png`）。 |
| ④ 明显缺陷 | 2.8 | 4 次会话 `0` JS error，取料 5 连点、切配 4 连点、装盘 5 连点、上菜 4 连点均零复制、零吞物、零重复收钱，`B-110` 成品菜导向 `1号桌` 真实生效（`port-04-plated-guide.png`、`land-04-plated-guide.png`）；但存在新旧明显缺陷：烤炉焦糊态动作键仍显示正常金色「取烤串」（`port-03-grill-burnt.png`、`land-03-grill-burnt.png`），炉上肉块 `BoxGeometry(0.055,0.045,0.055)` 投影仅 ≈ 3px、整串 ≈ 16px，熟 `#dc9a2e` / 焦 `#241d18` 色差读不出且无烟粒子（`port-02-grill-cooked.png`、`land-02-grill-cooked.png`）；另有 P2：世界飘字驻留 2.2s 长于 §7 的 0.8s，切换新操作阶段时不主动清场（`port-04-plated-guide.png` 截图恰落在丢弃后 2.2s 窗口内）；控制台保留 2 条 Three.js warning，公网旧包 `B-081` 仍未解。 |
| 体验 · 上手清晰度 | 3.2 | 料箱实物+挂牌、`切配 1/3`、`已熟 ✓`/`焦了 ✗`、`← 1号桌` 指引与 `B-110` 修复让单次出餐链路基本自解释（`port-01-chop-progress.png`、`port-04-plated-guide.png`）；扣分在焦糊态按钮仍写「取烤串」未预警（`port-03-grill-burnt.png`）、丢弃后紧接装盘时红字「丢弃」因 2.2s 驻留仍与 `← 1号桌` 引导同屏并存（`port-04-plated-guide.png`）、收款 `+¥57` 与订单卡 `¥48` 不解释差额 9 元小费且「用餐中」圆环固定满环、与刚坐下耐心满的等待态不可区分（源码 `frac` 在 `eating` 时恒为 1；`port-05-serve-paid.png`、`land-05-serve-paid.png`）。 |
| 体验 · 操作手感 | 3.2 | 高频连点防重非常稳（取料/切配/装盘/上菜 4–5 连点全部安全无脏状态），从料箱到收钱闭环顺畅；扣分在动作键 `76×76` 小于 84px 舒适热区且引导态灰暗偏小（`port-04-plated-guide.png`），竖屏摇杆 `.nub` 底 `785` 与动作键底 `814` 视觉仍不齐，切配需「放+切×3+取」偏繁琐，熟/焦无烟雾与音效提示全靠盯小字芯片（`port-02-grill-cooked.png`、`port-03-grill-burnt.png`）。 |
| 体验 · 正反馈（爽感） | 2.9 | 上菜后桌面立刻出白盘、飘出 `+¥57`、顶栏营业额跳至 `¥57`、订单卡转 `用餐中`、评级按 `¥0→1★` / `¥120,served2→1★` / `¥200,served3→3★` / `angry=3→1★` 稳定反馈（`port-05-serve-paid.png`、`land-05-serve-paid.png`）；扣分在无小费明细拆解、无烤熟金烟与音效反馈、顶栏无 `waste` 废料预算显示（丢弃后 `waste=1` 顶栏无感知）。 |

### 我能做的（Capability）
- **③ 取料→切配进度与文案闭环打通**：料箱取生串后在砧板逐步完成 `chopLeft 3 → 2 → 1 → 0`，切完 `stage='chopped'`；HUD 芯片 `.cb`（80×35）显示 `切配 1/3`，进度条 `.cb-bar`（64×8）内 `.cb-fill`（21×8）与 1/3 进度精确匹配，右下动作键同步显示 `切配 1/3`（`port-01-chop-progress.png`、`land-01-chop-progress.png`）。
- **④ 烤炉生/熟/焦三态定时演进与垃圾桶丢弃闭环**：放置后 `grillT 0.1` 起步；+6.0s 进入 `stage='cooked'`，`#bbq-grillbars .gb`（76×34）显示金色 `已熟 ✓`（`port-02-grill-cooked.png`、`land-02-grill-cooked.png`）；再 +8.0s（累计 14.1s）转入 `stage='waste'`，卡片切为红框 `焦了 ✗`（`port-03-grill-burnt.png`、`land-03-grill-burnt.png`）；取下焦串到垃圾桶触发 `action='discard'` / `丢弃` 后 `waste=1`。
- **⑤ 装盘、B-110 成品引导与上菜收款闭环**：`plate`/`装盘` 得到 `stage='plated'`（厨师双手端起白盘可见），`B-110` 修复生效，引导正确指向 `1号桌`（`platedGuide={label:'1号桌'}`）而非垃圾桶（`port-04-plated-guide.png`、`land-04-plated-guide.png`）；到 t1 桌执行 `action='serve'` / `上菜 烤五花肉拼盘`（剩余耐心 47.7s）后 `money 0→57`（菜价 48 + 小费 9，符合 §2 公式 `round(48×0.3×47.7/75)=9`）、`served 0→1`、顾客切 `phase='eating'`、桌面出白盘、飘字 `+¥57`、订单卡转 `¥48·用餐中`（`port-05-serve-paid.png`、`land-05-serve-paid.png`）。
- **⑨ 高频连点防重可靠 & 评级口径一致 & ⑩ 零 JS 报错**：取料 5 连点手上仍为 1 件 `raw`；切配台 4 连点不复制不吞；拿到 `plated` 连点 5 次仍为 1 件且 `waste` 未变；上菜后再连点 4 次 `money`/`served` 不再增长。评级验证 `¥0` 时 `.stars[data-stars=1]`（1 实 2 空，符合 `B-106`）、`¥120/served2` 为 1★、`¥200/served3` 为 3★、`angry=3` 回落 1★。4 次会话 `pageerror + console.error = 0`。

### 我看不懂的（Clarity）
1. **刚端起装盘好的成品菜，为什么红字「丢弃」还和 `← 1号桌` 引导同时亮着？** `port-04-plated-guide.png` 与 `land-04-plated-guide.png` 的截图恰好落在丢弃焦串后的 2.2s 飘字窗口内：`src/ui/hud.ts` 中 `.popup` 为 `bbq-popup-hold 2.2s linear forwards`（`0%,64%` 不透明 → `100%` 淡出，约 2.2–2.4s 由 JS 移除），真实时钟探针 t=0 / 0.9s / 2.1s opacity 均为 1、t=3.4s 节点已不在 DOM。这不是 bug 残留，但 `GAME-DESIGN.md §7` 要求飘字上浮 0.8s，实现为 2.2s（约 2.75 倍），且切换到新操作阶段时不主动清场，快节奏操作链下旧飘字会与新引导并存最多 2.2s（新 → `B-123`）。
2. **炉上串都写着红字「焦了 ✗」了，右下按钮为什么还亮着正常金色「取烤串」？** 对比 `port-02-grill-cooked.png` / `land-02-grill-cooked.png`（`已熟 ✓`）与 `port-03-grill-burnt.png` / `land-03-grill-burnt.png`（`焦了 ✗`），按钮图标、金色外环、文案 `取烤串` 以及厨师胸口金色 `取` 字圆章完全一模一样，毫无焦糊废料警示（新 → `B-121`）。
3. **数据说熟了/焦了，眼睛在烤炉上却几乎看不到串**：`port-02-grill-cooked.png`、`port-03-grill-burnt.png`、`land-02-grill-cooked.png`、`land-03-grill-burnt.png` 里，炉上肉块为 `BoxGeometry(0.055,0.045,0.055)`、整串长 `0.34m`；实测 1 世界单位 ≈ 47px（竖屏 `x=0.5→148px`、`x=1.5→195px`），即肉块 ≈ 3px、整串 ≈ 16px，熟（`#dc9a2e` 金）/焦（`#241d18` 炭黑）色差在 3px 内读不出来，既无 3 烤位分格，也无烟粒子；`.gb` 卡片下方露出的只是 `src/world/kitchen.ts` 静态炉栅横条的高光纹，玩家只能纯靠 DOM 文字猜状态（沿用 `B-092`/`B-097`/`B-111`）。
4. **为什么菜单写 ¥48，收钱却是 +¥57？「用餐中」的订单卡为什么还亮满格金圈？** `port-05-serve-paid.png`、`land-05-serve-paid.png` 飘字 `+¥57` 不拆出 `+¥9 小费`（沿用 `B-065`/`B-112`）；同时 `src/ui/hud.ts` 中 `const frac = c.phase === 'eating' ? 1 : patience / patienceMax`，已上菜进入 `用餐中` 的订单卡与桌位气泡圆环固定满环，而刚坐下且耐心满的新客同样是满环，两者不可区分，忙乱时容易误判成还没上菜的急单而重复做菜（依据为源码与 DOM，不是截图颜色读数；新 → `B-124`）。
5. **丢了 1 份焦串，顶栏毫无变化**：遥测 `waste=1`，但顶栏只有关数、营业额、时间、评级，看不到 `w ≤ 1`（3★ 门槛）的当前废料余量（沿用 `B-100`）。

### 让我不爽的（Friction）
1. **横屏 1 号桌气泡被 `(1)` 压截，装盘时再被 `↑ 1号桌` 叠成三明治**：`land-01-chop-progress.png`–`land-03-grill-burnt.png` 中 1 号桌气泡「烤五花肉拼盘」的「盘」字被圆牌 `(1)` 盖死；`land-04-plated-guide.png` 里 `#bbq-offhint` 弹出 `↑ 1号桌` 直接压在 `(1)` 与气泡上，上方还叠着 3D 金箭头，左上角四层糊成一团（新 → `B-122`）。
2. **竖屏 1 号桌气泡左缘被裁**：`port-01-chop-progress.png` 中 1 号桌气泡左侧金环裁出 `x=0` 左缘（沿用 `B-101`）。
3. **横屏摇杆依旧压着五花肉料箱与挂牌**：即便在 `5f7d148` 新包下，`land-01-chop-progress.png`–`land-05-serve-paid.png` 左下摇杆仍盖住垃圾桶底部、五花肉料箱左半和箱前五花肉斗方挂牌（沿用 `B-078`）。
4. **世界浮标反复挡住主角脸和身体**：`port-01-chop-progress.png`、`land-01-chop-progress.png` 中 `.cb`（`切配 1/3`）正盖厨师整张脸（沿用 `B-113`）；`port-02-grill-cooked.png`、`port-03-grill-burnt.png`、`land-02-grill-cooked.png`、`land-03-grill-burnt.png` 中「取」字圆章贴在厨师胸口，`land-05-serve-paid.png` 中 `(1)` 圆牌正盖厨师正脸（沿用 `B-098`）。
5. **动作键 76×76 偏小且引导态灰暗难辨**：双端 `#bbq-act` 仍为 `76×76`（小于 84px 舒适热区，沿用 `B-117`），且在 `port-04-plated-guide.png`、`land-04-plated-guide.png`、`port-05-serve-paid.png`、`land-05-serve-paid.png` 引导态下只显示低对比灰字 `送去客桌` / `去料箱取料` 与虚线圆占位符 `◌`（沿用 `B-102`/`B-094` ③）。

### 让我想继续玩的（Hook）
- **后厨三个料箱终于一眼分清**：`5f7d148` 实装 `B-094` 后，五花肉、菌子、米线的实物模型与斗方牌在双端画面里清晰可辨（`port-01-chop-progress.png`、`land-01-chop-progress.png`），开局不再猜盲盒。
- **操作稳定度让人放心**：取料/切配/装盘/上菜全部 4–5 连点零复制、零吞物、零重复扣/收钱，且 `B-110` 成品菜导向 1 号桌不再劝玩家丢掉辛辛苦苦烤好的菜（`port-04-plated-guide.png`、`land-04-plated-guide.png`），核心循环已经具备扎实的可玩底座。
- **上菜到账即时、评级变化可预期**：白盘落桌、营业额即刻跳升 `¥0→¥57`、订单卡同步切 `用餐中`、评级随营业额/服务数/愤怒数实时联动（`port-05-serve-paid.png`、`land-05-serve-paid.png`），闭环爽点骨架已立住。

### P0 阻塞（不修没法玩）
1) **公网 `https://openfolio.uk/bbq/` 源站仍为香港旧包，未同步至 `5f7d148`（沿用 `B-081`；本机 `5f7d148` 本轮 ③④⑤⑨⑩ 闭环无新 P0）**
   - 复现步骤：对比公网 `https://openfolio.uk/bbq/` 与本机 `http://127.0.0.1:3035/` 的 `window.__build` 与入口 JS 资产名；本机已为 `5f7d148-202611212302` / `assets/index-DXyUgwlT.js`，公网仍停留在香港源站旧包，导致线上玩家无法获得 `B-094`/`B-106`/`B-110` 等修复。
   - 截图路径：本轮 10 张截图均采自本机 `5f7d148`（如 `e2e/review/2026-11-21T23-09Z-r24/port-04-plated-guide.png`、`e2e/review/2026-11-21T23-09Z-r24/land-04-plated-guide.png` 仅代表本机最新构建）。
   - **验收标准**：部署后 60s 内公网与本机 `:3035` 返回完全一致的入口脚本 `assets/index-DXyUgwlT.js`（或当轮最新构建）及 `window.__build`，公网双视口通过 `e2e/plated-hint.mjs` 与 `e2e/stars.mjs` 回归，连跑 3 次 0 JS error。

### P1 明显缺陷
1) **烤炉焦糊态动作键未区分警示文案与样式，与「已熟 ✓」共用完全相同的金色「取烤串」（新 → `B-121`）**
   - 复现步骤：取生五花肉切配后放上烤炉，分别在 +6.0s（`stage='cooked'`，`已熟 ✓`）与 +14.1s（`stage='waste'`，`焦了 ✗`）站到烤炉前观察右下 `#bbq-act` 与角色胸口浮标。
   - 截图路径：`e2e/review/2026-11-21T23-09Z-r24/port-02-grill-cooked.png` 对比 `port-03-grill-burnt.png`；`e2e/review/2026-11-21T23-09Z-r24/land-02-grill-cooked.png` 对比 `land-03-grill-burnt.png`。
   - **验收标准**：`cooked` 态 `#bbq-act` 显示正常金色 `取烤串`；仅剩焦糊串（`stage='waste'`）时 `#bbq-act` 切换为警示红态（`data-act-warn="true"`，边框色为警示红 `#e05a3a`）且文案改为 `取焦串` 或 `清理焦串`；多烤位混有熟串与焦串时优先取熟串；双视口各连跑 3 次 0 JS error。
2) **横屏 1 号桌气泡被桌号圆牌 `(1)` 压截文字，装盘引导时与 `#bbq-offhint`「↑ 1号桌」三层叠压（新 → `B-122`）**
   - 复现步骤：844×390 横屏开局让 1 号桌点「烤五花肉拼盘」，分别在切配/烤炉（①）和装盘手持 `plated`（②）截帧，检查 `.bubble`、`.order-num` 与 `#bbq-offhint` 矩形交叠与文本完整度。
   - 截图路径：`e2e/review/2026-11-21T23-09Z-r24/land-01-chop-progress.png`、`land-02-grill-cooked.png`、`land-03-grill-burnt.png`（气泡尾字「盘」被 `(1)` 遮盖）、`land-04-plated-guide.png`（`↑ 1号桌` 叠压在 `(1)` 与气泡上）。
   - **验收标准**：双视口切配/烤炉/装盘三机位下，任意可见 `.bubble` 与 `.order-num` 重叠面积 `= 0`、`.bubble` 文本无裁切（`scrollWidth <= clientWidth` 且落于 `[4, vw-4]`）；`#bbq-offhint` 可见时与所有可见 `.bubble`、`.order-num`、`.topbar` 重叠面积均为 `0`；双视口各连跑 3 次 0 JS error。
3) **炉上烤串投影过小（肉块 ≈ 3px、整串 ≈ 16px），熟/焦色差不可读、无 3 烤位分格、无烟雾（沿用 `B-092`/`B-097`/`B-111`）**
   - 复现步骤：切好五花肉串放上烤炉，于 6.1s（已熟）与 14.1s（焦糊）截帧，检查烤炉台面串体轮廓、3 烤位分格与烟雾粒子；按 1 世界单位 ≈ 47px（竖屏 `x=0.5→148px`、`x=1.5→195px`）换算肉块 `BoxGeometry(0.055,0.045,0.055)` ≈ 3px、整串 `0.34m` ≈ 16px，熟 `#dc9a2e` 与焦 `#241d18` 在该尺寸下无法分辨；`.gb` 下方可见横纹为 `src/world/kitchen.ts` 静态炉栅（`CylinderGeometry(0.008,0.008,w-0.15,5)` × 若干）高光。
   - 截图路径：`e2e/review/2026-11-21T23-09Z-r24/port-02-grill-cooked.png`、`port-03-grill-burnt.png`、`land-02-grill-cooked.png`、`land-03-grill-burnt.png`。
   - **验收标准**：沿用 `B-111`，烤串放大清晰可见且 3 烤位有明显物理分格；`cooked` 呈 `#d98a3d` 金黄配金烟，`waste` 亮度较 `cooked` 降 ≥50% 配浓灰烟；双视口各连跑 3 次 0 JS error。
4) **切配进度条 `.cb` 遮挡厨师整张脸、「取」字章与 `(1)` 牌压挡厨师身体（沿用 `B-098`/`B-113`）**
   - 复现步骤：双端在砧板切配 1/3、站烤炉取串、站 1 号桌上菜三机位截帧，测量 `.cb`、世界浮标与 `.order-num` 与玩家屏幕包围盒的交叠。
   - 截图路径：`e2e/review/2026-11-21T23-09Z-r24/port-01-chop-progress.png`、`land-01-chop-progress.png`（`.cb` 盖厨师脸）、`port-02-grill-cooked.png`、`land-02-grill-cooked.png`（`取` 盖胸口）、`land-05-serve-paid.png`（`(1)` 盖正脸）。
   - **验收标准**：沿用 `B-098`/`B-113`，`.cb`、`.order-num` 与角色屏幕包围盒交叠面积 ≤ 包围盒面积 10%（`.cb` 为 0），双视口各连跑 3 次 0 JS error。
5) **横屏摇杆仍压住五花肉料箱与挂牌，且竖屏后墙越界木地板/黑板裁切未修（沿用 `B-078`/`B-114`）**
   - 复现步骤：844×390 横屏核验 `#bbq-stick` 与 `crate-pork` 投影交叠；390×844 竖屏切配/上菜机位观察绿檐口上方与右上黑板。
   - 截图路径：`e2e/review/2026-11-21T23-09Z-r24/land-01-chop-progress.png`、`land-05-serve-paid.png`（摇杆覆盖五花肉箱与挂牌）；`port-01-chop-progress.png`、`port-05-serve-paid.png`（后墙外木地板、扎染穿檐、黑板裁切）。
   - **验收标准**：沿用 `B-078`/`B-114`，横屏摇杆与 `crate-*` 投影交叠 ≤5% 且斗方挂牌完整可见；竖屏后墙顶沿上方无木地板纹理溢出，黑板完整落于墙内视口内；双视口各连跑 3 次 0 JS error。

### P2 打磨项
1) **世界飘字 `#bbq-popups` 驻留 2.2s 长于 `GAME-DESIGN.md §7` 的 0.8s，且切换到新操作阶段时不主动清场（新 → `B-123`）**：`src/ui/hud.ts` 中 `.popup` 为 `bbq-popup-hold 2.2s linear forwards`（`0%,64%` opacity 1 → `100%` opacity 0，约 2.2–2.4s 由 JS 移除），约为 §7 的 2.75 倍；快节奏操作链切换时旧飘字会与新引导并存最多 2.2s。`port-04-plated-guide.png` / `land-04-plated-guide.png` 中的红字 `丢弃` 是截图恰好落在丢弃后 2.2s 窗口内。
2) **收款飘字不拆解小费（`+¥57` 未标 `含小费 ¥9`）（沿用 `B-065`/`B-112`）**：`port-05-serve-paid.png`、`land-05-serve-paid.png` 收款飘字只显示总额 `+¥57`，与订单卡 `¥48` 的 9 元差额无解释。
3) **「用餐中」订单卡与桌位气泡圆环固定满环，与刚坐下耐心满的等待新客不可区分（新 → `B-124`）**：`src/ui/hud.ts` `const frac = c.phase === 'eating' ? 1 : patience / patienceMax`，`port-05-serve-paid.png`、`land-05-serve-paid.png` 上菜后订单卡与气泡均为满环，未切换 `ART-DIRECTION §5` 定义的 ok 绿 `#9ecb6a` 或完成态图标（依据为源码与 DOM，不是截图颜色读数）。
4) **控制台 2 条 Three.js 弃用 warning 仍在（沿用 `B-006`）**：4 次会话均输出 `THREE.Clock: This module has been deprecated` 与 `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`。
5) **竖屏 1 号桌气泡左侧裁出屏幕边缘（沿用 `B-101`）**：`port-01-chop-progress.png` 1 号桌气泡左侧金环被 `x=0` 裁去约 1/4。
6) **动作键 76×76 偏紧、引导态灰暗虚线圆占位、竖屏底部死色带与两键底距不齐（沿用 `B-117`/`B-102`/`B-060`/`B-103`）**：竖屏 `#bbq-act` 76×76 底 814、`#bbq-stick .nub` 56×56 底 785，底部约 170px 纯暗色带；`port-04-plated-guide.png` / `land-04-plated-guide.png` 引导态 `送去客桌` 仍用灰暗文字与虚线圆 `◌`。
7) **顶栏缺废料计数、全程无音频反馈（沿用 `B-100`/`B-066`）**：丢弃焦串后 `waste=1` 在顶栏无显示；切配/烤熟/烤焦/收款仍无声音提示。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md` §1（炭火烤炉 3 烤位 / 6s 熟 / 12s 焦）& §7（烤熟：串变金黄 + "叮" + 站点上方飘烟变金；烤焦：变黑 + 灰烟）**：数值状态机达标（6.1s `cooked`、14.1s `waste`），但视觉与音频大幅落后——3 烤位无分格、肉块投影 ≈ 3px / 整串 ≈ 16px 导致熟 `#dc9a2e` / 焦 `#241d18` 色差不可读、无金烟/灰烟粒子、无音效，且焦糊态动作键未区分仍写 `取烤串`（`port-02-grill-cooked.png`、`port-03-grill-burnt.png`，沿用 `B-092`/`B-097`/`B-111`/`B-066`，新 → `B-121`）。
- **`GAME-DESIGN.md` §2（小费公式）& §7（收款：桌面飘 `+¥xx` 上浮文字 0.8s，HUD 营业额滚动）**：小费数值正确（47.7s/75s → ¥9，总计 ¥57），但飘字实现为 2.2s 驻留（约 §7 的 2.75 倍）且切换到新操作阶段时不主动清场（`port-04-plated-guide.png` 截图恰落在丢弃后 2.2s 窗口内，新 → `B-123`）；收款飘字 `+¥57` 不拆解小费（`port-05-serve-paid.png`，沿用 `B-065`/`B-112`）。
- **`GAME-DESIGN.md` §4（评分：3★ 要求 `w ≤ 1`）**：星级计算与展示达标（`¥0→1★`、`¥120/served2→1★`、`¥200/served3→3★`、`angry=3→1★`），但局内顶栏不显示当前废料数 `w`，丢弃后 `waste=1` 无处查看（沿用 `B-100`）。
- **`GAME-DESIGN.md` §5（开局/离开站点圈时右下按钮不置灰：显示引导语、opacity 1）& §6（右下大按钮语义）**：`B-110` 引导语语义已修正（成品不再指向垃圾桶），但引导态按钮实际呈灰暗低对比 + 虚线圆占位（`port-04-plated-guide.png`、`land-04-plated-guide.png`），动作键 76×76 仍小于移动端舒适热区（沿用 `B-102`/`B-117`）。
- **`ART-DIRECTION.md` §1（可见地面永远落在 12×9m 世界里；工作站必须完整可见；横屏摇杆不压操作台）**：横屏站操作排时摇杆仍盖住五花肉料箱与斗方挂牌（`land-01-chop-progress.png`，沿用 `B-078`）；竖屏后墙绿檐口上方仍可见越界木地板且右上黑板裁切（`port-01-chop-progress.png`，沿用 `B-114`）。
- **`ART-DIRECTION.md` §2（料箱识别 B-094）**：本机 `5f7d148` 已达标（三箱食材实物与箱前斗方挂牌清晰，左墙装饰架低饱和，`port-01-chop-progress.png`、`land-01-chop-progress.png`），但横屏左第一箱挂牌仍被摇杆遮挡（`B-078`），公网未上线（`B-081`）。
- **`ART-DIRECTION.md` §5（UI 皮肤：ok `#9ecb6a`、按钮图标用内联 SVG、横屏订单卡 `top:150px` 不压状态条）**：横屏订单卡位置已对齐 `159×42 @(675,150)`（`land-01-chop-progress.png`）；但引导态按钮仍用虚线圆占位、`用餐中` 订单卡与气泡圆环固定满环（源码 `frac` 在 `eating` 时恒为 1）且未用 `#9ecb6a` 区分等待态（`port-05-serve-paid.png`，新 → `B-124`）、横屏 1 号桌气泡被 `(1)` 与 `↑ 1号桌` 叠压（`land-04-plated-guide.png`，新 → `B-122`）。

## 2026-11-21 22:08Z 第 23 轮
**本轮覆盖剧本**：① 首屏（复审）、② 移动（摇杆拖动 + WASD/方向键）、⑥ 顾客耐心归零离店与评级、⑦ 打烊结算面板数字与「下一关/重开」按钮、⑧ 竖屏/横屏 HUD 遮挡与热区；上轮（第 22 轮）已覆盖 ③④⑤⑨⑩，本轮不对切配/烤炉/装盘上菜链路下结论。
**环境说明**：公网 `https://openfolio.uk/bbq/` 仍运行旧包 `window.__build = 2290acb-202611210547`（入口 `assets/index-BklOlgyL.js`，连 `window.__test.stationGeom()` 均不存在）；本机 `:3035` 与仓库 `dist` 一致且为新包 `1de884e-202611212205`（入口 `index-DDOXf5Qv.js`，含 `stationGeom()` 与 `B-106`/`B-094` 等改动），线上与本地构建持续脱节（`B-081`）。运行环境为真实 Playwright（xvfb + SwiftShader 软渲染，宿主 load ≈12/8 核），公网首屏「开 店」可见耗时竖屏 390×844 为 **11068ms**、横屏 844×390 为 **8789ms**（绝对值受软渲染与高负载放大，但无首屏骨架仍属产品缺口，见 `B-109` / 提纲注 `B-102`）。4 个独立会话（公网双视口 + 本机双视口）`pageerror + console.error = 0`。本轮实看 `e2e/review/2026-11-21T22-08Z-r23/` 内 18 张截图（其中 `land-02-orders-live.png` 为横屏活单 HUD 布局、`port-02-orders-live.png` 为竖屏活单 HUD 布局）。

综合评分：2.8/5（比上轮 +0.1）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房 | 3.1 | 正交俯视、木地板拼缝、一字厨房台面、餐桌竹凳及白帽红围裙 Q 版厨师骨架清晰（`port-03-customer-waiting.png`、`land-03-customer-waiting.png`），本机新包 `1de884e` 模糊背景已可见 B-094 料箱实物与挂牌（`land-01-results-badrun.png`）；但公网旧包三个料箱仍为近乎同色的占位竹盒，首屏卡片纯文字无任何烤肉经营视觉元素（`port-01-first-screen.png`、`land-01-first-screen.png`），竖屏后墙绿檐口上方露出越界木地板且扎染布幔硬切穿出檐口（`port-03-customer-waiting.png`、`port-08-after-next.png`），横屏把后墙、黑板、辣椒串等云南装饰全部切出画外（`land-03-customer-waiting.png`）。 |
| ② 灯光 | 3.3 | 竖屏餐区 3 盏暖铜吊灯投下柔和锥形体积光束，桌面暖光池与烤炉向台前地板漫射的橙红炭火光晕层次明确（`port-02-move-drag.png`、`port-03-customer-waiting.png`、`port-08-after-next.png`）；扣分在横屏吊灯本体全部出画仅余浅光斑（`land-03-customer-waiting.png`、`land-08-after-next.png`），静态帧读不出 `FogExp2` 雾的纵深，竖屏底部约 170px 纯暗色带硬截断暖光地板（`port-02-orders-live.png`）。 |
| ③ HUD | 2.4 | 竖屏主控件与顶栏/订单卡两两重叠面积全为 `0`（`#bbq-stick` `130×130 @(22,692)`、`#bbq-act` `76×76 @(288,738)`、`.topbar` `315×36 @(37,8)`、`#bbq-orders` `142×47 @(238,54)`，`port-02-orders-live.png`）；但横屏订单卡 `#bbq-orders` `@(692,8)` 顶到屏幕最上沿 `y=8` 与 `.topbar` `@(264,8)` 同带、旧包 `130×130 @(22,238)` 摇杆整块压住五花肉料箱、垃圾桶边与金色引导箭头（`land-02-move-drag.png`、`land-03-customer-waiting.png`）；顾客气泡盖住头顶（`land-02-move-drag.png`）；`#bbq-act` 与 `#bbq-stick` 是裸 `div` 无 `button`/`role`/`aria-label` 语义致热区清单 `hitTargets=[]`；动作键 `76×76` 离移动端 `88px` 舒适热区偏紧；竖屏两键底距不齐（22px vs 30px，`port-02-move-drag.png`）；首屏菜单态左右下角仍透出摇杆与动作键轮廓（`port-01-first-screen.png`、`land-01-first-screen.png`）。 |
| ④ 明显缺陷 | 2.4 | 4 次会话 `0` JS error，达标后「进入第 2 关」与差局「再 开 一 局」状态重置真实生效（`port-08-after-next.png`、`land-08-after-next.png`）；但公网长期停在旧包 `2290acb`（`B-081`）；本机新包 `1de884e` 结算弹窗展开时，右侧 4 号桌红色圆牌 `(4)` 未被模态遮罩压暗模糊且贴右缘裁切（`port-03-results-angry3.png`），且同屏并列「目标达成，进入第 2 关」与 `★☆☆` / `服务顾客 0 位` / `愤怒离店 3 位` 零解释；旧包横屏拿到生串后 `#bbq-act` 滞留「去料箱取料」；横屏角色与 t4 桌左沿叠画（`land-02-move-drag.png`）；t1 左上门口旁仍斜插不明竹块（`port-03-customer-waiting.png`、`land-03-customer-waiting.png`）。 |
| 体验 · 上手清晰度 | 2.7 | 首屏卡片写明店名、五步流程与第 1 关目标（`port-01-first-screen.png`、`land-01-first-screen.png`），但首行只有店名无品类语境、卡面无视觉锚点、首屏 8.8–11.1s 等待期无骨架、缺「继续上次进度」与关卡选择；结算面板缺少星级规则说明与小费/废料扣分拆解（`port-03-results-angry3.png`、`port-07-results.png`）；公网旧包料箱无区分且无桌号徽章。 |
| 体验 · 操作手感 | 3.0 | 真实 pointer 拖 130×130 摇杆位移稳定（竖屏 **4.15m**、横屏 **4.16m**，`port-02-move-drag.png`、`land-02-move-drag.png`），空旷区键盘位移正常（横屏 A **2.83m** / D **2.45m**，竖屏 W **3.04m**）；结算按钮切关/重开可靠。扣分：角色撞到台面/料箱边角被挡住时零反馈（无撞击音、无抖动、无滑行提示，只剩「人不动」）；动作键 `76×76` 偏紧且无按钮 ARIA 语义；横屏 130px 摇杆盖死左侧料箱与引导箭头（`land-02-move-drag.png`）。 |
| 体验 · 正反馈（爽感） | 2.3 | 点「进入第 2 关」后顶栏真实切到 `第 2 关` 且计时从 3:00 正常倒数（`port-08-after-next.png`、`land-08-after-next.png`），3★/2★ 达标卡片层级清晰（`port-04-results-stars.png`、`port-07-results.png`）；但顾客耐心归零离开瞬间零飘字、零音效、零头顶红怒符号（`port-05-customer-left.png`、`land-05-customer-left.png`），仅人消失；结算不拆解小费且不解释为什么只得 1★/2★，新包甚至出现「目标达成」与「愤怒离店 3 位 + 1★」矛盾并列（`port-03-results-angry3.png`）。 |

### 我能做的（Capability）
- **① 首屏基础可读与开局入口可用**：双端首屏展示 `柳真真云南烤肉 / 炭火生香，小店开张。/ 取料 → 切配 → 炭烤 → 装盘 → 上菜 / 第 1 关 · 目标：3 分钟营业额 ¥180 / 开 店`，点击唯一按钮「开 店」正常入局（`port-01-first-screen.png`、`land-01-first-screen.png`）。
- **② 摇杆与空旷区键盘移动生效**：130×130 摇杆真实 pointer 拖动位移竖屏 **4.15m**、横屏 **4.16m**（`port-02-move-drag.png`、`land-02-move-drag.png`）；键盘空旷区横屏 A 键 **2.83m**、D 键 **2.45m**，竖屏 W 键 **3.04m**。
- **⑥ 耐心归零离店状态流转生效**：t1 桌顾客（烤五花肉拼盘，初始耐心 74.65s）`setPatience(0.3)` 推进 4s 后从 `phase:'seated'` 变为 `customers:[]`、`angry 0→1`、`money=0`、`served=0`（`port-03-customer-waiting.png` → `port-05-customer-left.png`、`land-03-customer-waiting.png` → `land-05-customer-left.png`）；新包 `1de884e` 已落实 `B-106` 的 1★ 封顶与局内/结算一致（`port-01-results-badrun.png`、`port-03-results-angry3.png`、`land-01-results-badrun.png` 顶栏与大星均为 `★☆☆`）。
- **⑦ 结算面板数字展示与切关/重开按钮真实生效**：达标局（¥200/¥180、服务 3 位、愤怒 1 位、废料 0 份，`port-07-results.png`、`land-07-results.png`）点「进入第 2 关」切至 `phase playing / level 2 / money 0 / served 0 / timeLeft 180`（1.5s 后 157/158，`port-08-after-next.png`、`land-08-after-next.png`）；新包差局点「再 开 一 局」重置 `level 1 / money 0 / served 0 / angry 0 / timeLeft 179`。
- **⑧ 竖屏单卡期主 HUD 零互叠 + 4 会话 0 报错**：竖屏 390×844 下摇杆、动作键、顶栏、单张订单卡两两重叠面积均为 `0`（`port-02-orders-live.png`）；公网与本机共 4 次会话 `pageerror + console.error = 0`。

### 我看不懂的（Clarity）
1. **为什么「目标达成，进入第 2 关」却只给 1★，还挂着「愤怒离店 3 位」？** 本机新包 `1de884e`（`port-03-results-angry3.png`）在营业额 ¥300/¥180、服务 0 位、愤怒 3 位时，绿字庆祝「目标达成，进入第 2 关」同时亮 `★☆☆`；公网 `port-07-results.png` 营业额 ¥200/¥180、愤怒 1 位给 `★★☆` 同样无任何说明。面板既不解释星级计算口径，也不拆解小费与废料/愤怒扣分（新 → `B-116`）。
2. **顾客怎么突然没了？** 耐心归零后（`port-05-customer-left.png`、`land-05-customer-left.png`），屏幕上无「顾客生气走了」飘字、无音效、顾客离店前头顶无红怒符号，玩家只看到桌位突然空了；另需勘误：探针检测旧包 `.stars` 3 枚 SVG 均带 `#f0c060` 似无变化，但逐图核对 `port-05-customer-left.png` 与 `land-05-customer-left.png` 可见第 3 颗星实已转为空心描边（`★★★ → ★★☆`，仅描边仍为 `#f0c060` 导致对比偏弱且易被颜色探针误判），且旧包开局 `¥0` 时就满亮 `★★★`（归因未部署 `B-106`，离店反馈沿用 `B-107`）。
3. **首屏 3 秒看不到「经营烤肉摊」的画面信号，也找不到上次进度**：`port-01-first-screen.png`、`land-01-first-screen.png` 卡片纯文字排版，首行「柳真真云南烤肉」仅为店名，背景重度模糊看不清烤炉与食材；入口只有单一「开 店」按钮，没有「继续上次进度」或关卡选择（继续入口沿用 `B-057`，视觉锚点新 → `B-120`）。
4. **结算弹窗外面为什么浮着一个清楚的红圈「4」？** 新包 `1de884e` 的 `port-03-results-angry3.png` 中，整张场景与订单卡都已被模态遮罩压暗模糊，但右缘中段浮出一枚清晰未模糊且被右缘裁掉一角的红色圆牌 `(4)`，极像渲染错乱（新 → `B-118`）。
5. **走到台面边角为什么人突然不动了？** 实测落入台面/料箱碰撞盒（`(4.5,1.5)` W/S 位移 0、`(-1,3.5)` 四向全 0）及正常走路贴边角被挡时，无撞击音、无角色微弹、无提示，玩家难以区分是撞墙还是操作失灵（新 → `B-119`）。

### 让我不爽的（Friction）
1. **公网持续滞留旧包，线上/本机体验撕裂（`B-081`）**：公网仍是 `2290acb`（`index-BklOlgyL.js`），本机 `:3035` 与 `dist` 已是 `1de884e`（`index-DDOXf5Qv.js`）；B-072（横屏 112px 摇杆）、B-076（横屏 `top:150px` 订单卡）、B-094（料箱实物与挂牌）、B-106（统一星级）线上全部不可见，旧包横屏拿生串后动作键还会滞留「去料箱取料」。
2. **横屏 HUD 挤压视野与操作区**：`land-02-move-drag.png`、`land-03-customer-waiting.png` 中订单卡 `#bbq-orders` `@(692,8)` 贴顶与顶栏 `.topbar` `@(264,8)` 同水平带（多单极易碰撞），130×130 摇杆 `@(22,238)` 直接罩住五花肉料箱、垃圾桶边缘与金色引导箭头；竖屏 `#bbq-orders` 右边缘 `380` 距视口右缘仅 `10px`，叠加 B-068/B-094 桌号与菜品图标后多卡极易挤压（沿用 `B-072`/`B-076`/`B-078`/`B-093`）。
3. **核心操作键无按钮/ARIA 语义且热区偏紧**：`#bbq-act`（76×76）与 `#bbq-stick` 为裸 `div`，`hitTargets=[]`，无障碍与自动化均取不到交互控件；76×76 距移动端 88px 舒适热区仍有差距（新 → `B-117`）。
4. **首屏 8.8–11.1s 干等无骨架 + 菜单态透出控件残影**：公网首屏「开 店」可见需 11068ms（竖）/ 8789ms（横），全程无加载骨架（沿用 `B-109`）；首屏 `port-01-first-screen.png`、`land-01-first-screen.png` 底部仍透出半透明摇杆与动作键圆环（沿用 `B-070`）。
5. **横屏结算面板贴顶贴底 + 差局唯一按钮做成了弱描边样式**：`land-07-results.png` 与 `land-01-results-badrun.png` 面板上下余量极小（沿用 `B-018`）；新包差局面板（`port-01-results-badrun.png`、`land-01-results-badrun.png`）只有 1 个「再 开 一 局」按钮，却用暗色描边次按钮样式且含空格撑字距（沿用 `B-071`/`B-096`）。

### 让我想继续玩的（Hook）
- **「进入第 2 关」与重开闭环扎实可信**：达标后点「进入第 2 关」能立刻清零营业额、切到 `第 2 关` 并按 3:00 正常倒计时（`port-08-after-next.png`、`land-08-after-next.png`），差局点「再 开 一 局」能彻底清空愤怒计数与营业额重来，没有假按钮感。
- **新包 `1de884e` 的后厨识别度进步明显**：从 `land-01-results-badrun.png` 模糊背景可见，三个料箱已换上大块五花肉串/菌子簇/米线团与箱前斗方牌，左墙装饰架同步降饱和，一旦解决 `B-081` 上线，上手阻力将显著下降。
- **基础走位响应直接 + 竖屏暖光氛围讨喜**：摇杆拖动双端 4.15–4.16m 稳定响应，配竖屏三盏暖铜吊灯与炭火暖光池，云南小店氛围基调已经立住（`port-02-move-drag.png`）。

### P0 阻塞（不修没法玩）
1) **公网持续运行旧构建 `2290acb`，与本机 `:3035`/仓库 `dist`（`1de884e`）脱节（沿用 `B-081`）**
   - 复现步骤：打开公网 `https://openfolio.uk/bbq/` 读取 `window.__build`、入口脚本名及 `typeof window.__test.stationGeom`；同时检查 `http://127.0.0.1:3035/` 与 `dist/assets/`。实测公网返回 `2290acb-202611210547`、`assets/index-BklOlgyL.js`、`stationGeom === undefined`；本机 `:3035` 与 `dist` 为 `1de884e-202611212205`、`index-DDOXf5Qv.js`、`stationGeom` 存在。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/land-02-move-drag.png`（旧包横屏 130px 摇杆与 `y=8` 订单卡）、`e2e/review/2026-11-21T22-08Z-r23/land-01-results-badrun.png`（本机新包已含 B-094 料箱实物与 B-106 1★）。
   - **验收标准**：部署后 60s 内，`curl -s https://openfolio.uk/bbq/ | grep -o 'assets/index-[^"]*js'` 与 `http://127.0.0.1:3035/` 及 `dist/index.html` 三者严格全等；Playwright 访问公网断言 `window.__build === '1de884e-...'`（等于当轮最新构建）、`typeof window.__test.stationGeom === 'function'`，且横屏 844×390 下 `#bbq-stick` 宽高为 `112×112`（±1px）、`#bbq-orders` `top >= 140px`；连续两次部署均 100% 通过。

### P1 明显缺陷
1) **结算面板缺少星级归因解释与小费拆解，且「目标达成」与「愤怒离店 3 位 + 1★」矛盾并列（新 → `B-116`）**
   - 复现步骤：在本机新包 `1de884e` 构造 `money=300, target=180, served=0, angry=3` 与 `money=40, target=180, served=0, angry=2` 进入打烊结算；以及在公网/本机构造 `money=200, target=180, served=3, angry=1` 结算，检查面板文案。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/port-03-results-angry3.png`、`e2e/review/2026-11-21T22-08Z-r23/port-01-results-badrun.png`、`e2e/review/2026-11-21T22-08Z-r23/port-07-results.png`、`e2e/review/2026-11-21T22-08Z-r23/land-01-results-badrun.png`。
   - **验收标准**：结算面板新增 `[data-star-reason]` 节点并按 `GAME-DESIGN §4` 精确输出星级原因（`served===0` 或 `angry>=3` 时匹配 `/未服务|愤怒离店.*1★/`，`r>=1 && angry===1` 时匹配 `/愤怒离店.*1.*3★/`）；当达标但星级被锁 1★ 时副标题改「营业额达标（评分偏低），可进入第 2 关」；营业额明细附 `[data-revenue-breakdown]` 显示 `含小费 ¥X` 且与 `flow` 累计一致；双视口（390×844、844×390）下所有按钮 `rect.bottom <= innerHeight`，各连跑 3 次 0 JS error。
2) **HUD 动作键与摇杆为裸 `div` 缺失按钮/ARIA 语义，动作键热区 76×76 偏紧且缺文案同帧同步门禁（新 → `B-117`）**
   - 复现步骤：进入对局后查询 `button, [role="button"]` 统计游戏内交互热区（实测 `hitTargets=[]`），读取 `#bbq-act` 与 `#bbq-stick` 的标签名、`role`、`aria-label` 及 `getBoundingClientRect()`（实测 `76×76`）；横屏取生串后比对 `state().actionLabel` 与 `#bbq-act` DOM 文案。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/port-02-orders-live.png`、`e2e/review/2026-11-21T22-08Z-r23/land-02-move-drag.png`。
   - **验收标准**：`#bbq-act` 为 `<button type="button">` 或具备 `role="button" tabindex="0"`，实时同步 `aria-label === state().actionLabel` 与 `aria-disabled`，点击热区 `rect.width >= 84 && rect.height >= 84`；`#bbq-stick` 具备 `role="application"` 及非空 `aria-label`；双端拿到生串后等待 2 帧 rAF 断言 `#bbq-act` 文本与 `aria-label` 均等于 `state().actionLabel`（不再滞留「去料箱取料」）；双视口各连跑 3 次 0 JS error。
3) **新包 `1de884e` 结算模态遮罩层级错误，桌号圆牌 `.order-num` 穿透遮罩并在右缘裁切（新 → `B-118`）**
   - 复现步骤：在本机新包 `1de884e` 390×844 竖屏下让 `t4` 桌存在活跃订单/桌号牌，直接触发打烊进入 `phase === 'results'`，观察结算遮罩与画面右侧中段。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/port-03-results-angry3.png`（右缘清晰未模糊的红色圆牌 `4`）。
   - **验收标准**：进入 `phase === 'menu' || phase === 'results'` 后 1 帧内，`#bbq-rings`、`#bbq-bubbles`、`#bbq-offscreen` 全部满足 `display === 'none'` 或 `opacity === '0'`，且模态遮罩层 `parseInt(getComputedStyle.zIndex)` 严格大于所有世界标注层 `zIndex`；`t4` 活跃态进结算截帧双端连跑 3 次 0 穿透、0 JS error。
4) **愤怒离店瞬间缺少飘字、红怒符号与音效反馈（沿用 `B-107` / `B-066`）**
   - 复现步骤：在 `t1` 生成顾客（烤五花肉拼盘），`setPatience(0.3)` 推进 4s 至 `angry 0→1`、`customers:[]`，检查 `#bbq-popups` 与离店瞬间画面。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/port-05-customer-left.png`、`e2e/review/2026-11-21T22-08Z-r23/land-05-customer-left.png`。
   - **验收标准**：`angry` 递增后 0.5s 内 `#bbq-popups .popup` 至少出现 1 条含「愤怒/满意度」的可见文本（`top >= topbar.bottom + 4 && bottom <= vh - 8`、与 `.topbar` 交叠 `0`），离店顾客头顶存在 ≥20×20px 红怒图标 ≥0.6s，并触发下行离店音效（接入 `B-066` 后断言 `lastSound`）；双端各连跑 3 次。
5) **横屏订单卡贴顶 `y=8`、130px 摇杆压料箱及竖屏多卡边界待部署验收（沿用 `B-072`/`B-076`/`B-078`/`B-093`，依赖 `B-081` 上线）**
   - 复现步骤：线上横屏 844×390 与竖屏 390×844 让 1–3 名顾客就座，实测 `#bbq-orders`、`.topbar`、`#bbq-stick`、`crate-pork` 投影矩形。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/land-02-move-drag.png`、`e2e/review/2026-11-21T22-08Z-r23/land-03-customer-waiting.png`、`e2e/review/2026-11-21T22-08Z-r23/port-02-orders-live.png`。
   - **验收标准**：`B-081` 同步线上后，横屏 3 单同屏断言 `#bbq-orders` `top >= 140px`、与 `.topbar` 及台面投影交叠均为 `0`，`#bbq-stick` ≤112px 且与 `crate-*` 投影交叠 ≤5%；竖屏 3 单同屏断言全部 `.card` 满足 `rect.right <= 386`、不换行压 `.topbar`；双端各连跑 3 次。
6) **首屏无「继续上次进度」与关卡选择入口（沿用 `B-057`）**
   - 复现步骤：通关第 1 关后刷新页面回到首屏，检查入口按钮数组（实测仅 `["开 店"]`）。
   - 截图路径：`e2e/review/2026-11-21T22-08Z-r23/port-01-first-screen.png`、`e2e/review/2026-11-21T22-08Z-r23/land-01-first-screen.png`。
   - **验收标准**：存在 `bbq.level >= 2` 存档时首屏渲染「继续 · 第 N 关」主按钮与「重新开始」次按钮，点前者进入 `level === N`、点后者重置 `level === 1`；双端各连跑 3 次。

### P2 打磨项
1) **角色撞到台面/料箱边角被挡住时零反馈与直角卡顿（新 → `B-119`）**：贴台面/料箱方向输入位移为 0 时无撞击轻音、无微弹动画、无边角顺滑滑行，易误以为操作卡死。
2) **首屏开店卡片纯文字无烤肉经营视觉锚点（新 → `B-120`）**：`port-01-first-screen.png`、`land-01-first-screen.png` 卡面仅文字，标题首行仅为店名，缺少炭火/烤串 SVG 徽标与首眼经营品类标识。
3) **公网首屏 8.8–11.1s 等待期无加载骨架（沿用 `B-109`，提纲误注 `B-102`）**：虽绝对耗时受 SwiftShader 与 load≈12 放大，但 `index.html` 缺少内联暖色加载骨架仍是产品体验缺口。
4) **菜单态未隐藏底部触控层 + 竖屏两键底距不齐（沿用 `B-070`/`B-103`）**：`port-01-first-screen.png`、`land-01-first-screen.png` 底部透出摇杆与动作键圈；竖屏摇杆底距 22px、动作键 30px 未对齐（`port-02-move-drag.png`）。
5) **横屏结算面板贴边、差局按钮弱样式与空格字距（沿用 `B-018`/`B-071`/`B-096`）**：`land-07-results.png` 面板上下边距仅约 8px；差局唯一按钮「再 开 一 局」用暗色描边而非实心主色且带空格（`port-01-results-badrun.png`、`land-01-results-badrun.png`）。
6) **既有场景穿帮延续（沿用 `B-105`/`B-114`）**：`land-02-move-drag.png` 角色与 t4 桌左沿叠画；`port-03-customer-waiting.png` 竖屏后墙上方露出木地板、扎染边缘穿出檐口、t1 门口旁仍有不明斜放竹块。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md` §1（核心循环）& §7（手感与反馈）**：要求「顾客耐心归零 → 愤怒离店(满意度 -1)」「愤怒离店：顾客头顶红怒符号 0.6s，路径回门」，实测 `port-05-customer-left.png`、`land-05-customer-left.png` 顾客离开瞬间无红怒符号、无扣分飘字与音效确认，玩家只见人消失（`B-107`）。
- **`GAME-DESIGN.md` §3（关卡）**：要求「进度写 localStorage `bbq.level`」，当前切关写入有效，但首屏缺少「继续上次进度」入口与关卡选择（`port-01-first-screen.png`，`B-057`），且文档表格仍写「M1 仅 1 关」滞后于实装的 2 关（`B-074`）。
- **`GAME-DESIGN.md` §4（评分）**：要求「上限条款：`served = 0` 或 `angry >= 3` 时星级上限锁 1★；局内顶栏评级与结算面板共用同一计算函数；结算面板展示：星级 / 营业额(+目标) / 服务顾客数 / 满意度 / 废料数」。本机新包 `1de884e` 已对齐星级公式与两处一致，但结算面板既未解释为何锁 1★、未将「目标达成」文案与 1★ 惩罚解耦、也未拆解小费（`port-03-results-angry3.png` → `B-116`）；公网旧包未含 `B-106`，开局 `¥0` 即亮 `★★★`（`port-03-customer-waiting.png`）。
- **`GAME-DESIGN.md` §5（场地）& §6（交互）**：要求「台面 = 1m 模块单元，玩家不可穿越」「左下虚拟摇杆 r=56px，死区 8px」「右下大按钮 ⌀72px」。实测公网摇杆为 `130×130`（r=65px）、动作键 `76×76` 且为裸 `div` 无 ARIA 语义（`B-117`），碰台面边角被挡时零反馈（`B-119`）。
- **`ART-DIRECTION.md` §1（镜头与横屏摇杆）**：要求「可见地面永远落在 12×9m 世界里」「横屏摇杆 112px（竖屏 128px），底距 `max(16px, env(safe-area-inset-bottom))`，动作键同步贴底距」。公网实测横屏摇杆仍 `130×130 @(22,238)` 压住料箱与金箭头（`land-02-move-drag.png`），竖屏后墙外仍露越界木地板且两键底距不齐（22px vs 30px，`port-02-move-drag.png`）。
- **`ART-DIRECTION.md` §2（构图与配色 · 料箱识别 B-094）**：要求「每个料箱顶面必须摆对应食材实物、横向覆盖箱顶 ≥60%、箱前沿贴斗方挂牌」。本机新包 `1de884e` 已落地（`land-01-results-badrun.png` 模糊背景可见），公网因 `B-081` 仍为占位竹盒（`port-03-customer-waiting.png`）。
- **`ART-DIRECTION.md` §5（UI 皮肤与订单卡）**：要求「横屏订单卡加宽（`max-width 168px`）+ `top:150px` 竖排，不压状态条、不越右缘」「按钮图标用内联 SVG」。公网旧包横屏订单卡仍在 `142×47 @(692,8)` 贴顶与顶栏同带（`land-02-move-drag.png`、`land-03-customer-waiting.png`），且动作键仍用虚线圆圈占位、缺少按钮 ARIA 语义。

## 2026-11-21 21:08Z 第 22 轮
**本轮覆盖剧本**：③ 取料→切配、④ 上烤炉（生/熟/快焦/焦糊/丢桶）、⑤ 装盘→上菜→收款、⑨ 高频连点、⑩ 控制台与渲染预算；未覆盖 ① 首屏、② 移动、⑥ 耐心归零离店、⑦ 结算面板（第 20/21 轮已验证，本轮不下结论）。

**环境说明**：线上 https://openfolio.uk/bbq/ 仍为公网旧包 `2290acb-202611210547`（`index-BklOlgyL.js`），与本机 `:3035`（`index-Shggdsxc.js`）及仓库 `dist/assets/`（`index-Juy7ZBi9.js`）三方不一致（`B-081` 未修），SwiftShader 软渲染宿主 load ≈6/8 核（首屏 6.8–9.5s），烤制时间点采用冻结时钟 + `window.__test.tick(1/60, n)` 定步长实测。

综合评分：2.7/5（比上轮 -0.2）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房 | 3.0 | 正交俯视、1m 模块厨房台面与 Q 版红围裙厨师/便服顾客骨架清晰（`land-serve-serve-paid.png`）；但旧包三个料箱仍是几乎雷同的浅黄竹盒（`B-081` 致 B-094 未生效），烤炉上的串细如发丝、3 烤位的分隔线很弱（两次判读一次读成三个槽位、一次读成连续横纹，需凑近才看得出），竖屏顶部墙外木地板越界、右上菜单黑板被画面右缘裁切，加上底部大黑带割裂画面（`port-chop-chop-1of3.png`）。 |
| ② 灯光 | 3.6 | 竖屏餐区三盏暖铜吊灯+锥形体积光束、桌椅柔和落地影、烤炉向地板漫射的暖橘炭火光池及台面湿反已具 Saltline 质感（`port-grill-grill-raw.png`、`port-serve-serve-plated.png`）；但烤炉前沿镜面高光过曝反吞掉烤串轮廓（`land-grill-grill-cooked.png`），装盘台选中高光偏刺眼（`land-serve-serve-plated.png`），横屏厨房视角看不到吊灯层次。 |
| ③ HUD | 2.2 | 顶栏 `.topbar` 与卡片视觉皮肤统一；但横屏 `+¥62` 飘字直接盖住顶栏左侧「第 1 关」的「第」字（`land-serve-serve-paid.png`），竖屏 `+¥62` 压住顾客「用餐中」气泡（`port-serve-serve-paid.png`），切配进度条 `.cb` 横竖屏均压住角色整张脸（`port-chop-chop-1of3.png`、`land-chop-chop-1of3.png`），横屏 130×130 旧摇杆罩死垃圾桶与五花肉料箱（`land-chop-chop-1of3.png`，`B-072` 未在线上生效），`.gb-txt` 等局部文字目测仍偏小（`B-108`）。 |
| ④ 明显缺陷 | 2.0 | 刚装好的成品菜在装盘台按钮竟写 `去垃圾桶丢掉`，横屏金色引导箭头还指向左侧货架底层（`port-serve-serve-plated.png`、`land-serve-serve-plated.png`）；竖屏后墙上方露出越界木地板、右上菜单黑板被画面右缘裁切（`port-grill-grill-raw.png`）；烤炉 DOM 进度条下方还能看到一小截更短的暗色短条——源码 `src/game/grill.ts` 另画了一套 3D sprite 进度条，疑似与 HUD 的 `.gb` 并存未隐藏（`port-grill-grill-cooked.png`，需开发确认）；连点持物后屏幕中央残留 `去料箱取料` 与按钮 `手上有东西` 矛盾（`land-serve-serve-spam.png`）；公网旧包 `B-081` 持续阻塞验证新包。 |
| 体验 · 上手清晰度 | 2.3 | 核心状态流转跑通，但成品菜提示「去垃圾桶丢掉」极度误导；砧板需按 5 次（放+切×3+取）无预期说明；烤串熟与焦肉眼难辨只能硬盯小字；公网缺桌号徽章、桌底光圈、离屏指引与料箱挂牌（`B-081`）。 |
| 体验 · 操作手感 | 2.8 | 稳定性过关：料箱连点 12 次不复制、上菜连点 10 次不重复收款、6 次会话 0 条 JS error，draw calls 102–118 / 三角面 10798–11450 均在预算（120 / 150k）内；但砧板 5 次点按偏碎、横屏 130px 摇杆盖住 1 号料箱与角色下半身（`land-chop-chop-spam.png`）。 |
| 体验 · 正反馈（爽感） | 2.6 | 切好变绿 `已切好 ✓`、烤熟金框 `已熟 ✓`、上菜即刻 `+¥62`（菜价 ¥48 + 小费 ¥14）并更新顶栏营业额（`port-serve-serve-paid.png`）；但烤串无金黄变化与金色飘烟、装盘后反被引导去丢垃圾、收款飘字未拆出小费且撞烂顶栏、本轮静态截图未观察到营业额滚动过程。 |

### 我能做的（Capability）
- **完整跑通「取料→切配→烤熟/烤焦→装盘→上菜→收款」主闭环**：站五花肉料箱按 `取 烤五花肉拼盘` 得 `stage:'raw'`；砧板 3 刀切至 `100%`（`切配 1/3`→`2/3`→`已切好 ✓`，`port-chop-chop-1of3.png`、`port-chop-chop-done.png`）并取回 `stage:'chopped'`；上烤炉经 `t=0.12`（`烤制中 6s`）→`t=3.12`（`烤制中 3s`，~26%）→`t=6.72`（`已熟 ✓`，`gb done`）→`t=10.72`（`快焦了 2s`，`gb warn`）→`t=13.72`（`焦了 ✗`，`gb burnt`，`port-grill-grill-raw.png`~`burnt.png`）；废料丢垃圾桶后 `waste=1` 计数准确；取熟串（`t=6.27`）装盘得 `stage:'plated'`，送至 `t1` 顾客（耐心 74.7s）后 `money 0→62`（¥48 + 小费 ¥14）、`served=1`，2.2s 后顾客 `phase=eating` 且 `+¥62` 飘字清除（`port-serve-serve-paid.png`、`port-serve-serve-after.png`）。
- **高频连点与渲染稳定性达标**：同帧连点料箱 12 次仅持有 1 件 `raw` 无复制（`port-chop-chop-spam.png`、`land-chop-chop-spam.png`）；上菜后再连点 10 次保持 `money=62`、`served=1`、`angry=0` 无重复收款（`port-serve-serve-spam.png`、`land-serve-serve-spam.png`）；6 次独立会话 `pageerror + console.error` 为 0，draw calls 102–118、三角面 10798–11450 均低于预算（120 / 150k）。

### 我看不懂的（Clarity）
1. **刚装好盘的成品菜为什么叫我扔掉？**：在装盘台做出 `stage:'plated'` 烤五花肉拼盘后，右下按钮灰显 `去垃圾桶丢掉`（`port-serve-serve-plated.png`），横屏金色引导箭头还指向左侧货架底层（`land-serve-serve-plated.png`），极易让人误判为废料或操作失败。
2. **烤炉上的串到底熟没熟、能放几串？**：烤串在炉网上只有几像素粗细，高光过曝下 `t=6.72`「已熟」与 `t=13.72`「焦了」缺乏清晰的金黄→焦黑 3D 外观差异（`land-grill-grill-cooked.png`、`land-grill-grill-burnt.png`）；且 3 个烤位的分隔线极弱，两次判读结论不一致（一次读成 3 个槽位、一次读成连续横纹）。
3. **持物状态与引导提示自相矛盾**：`land-serve-serve-spam.png` 中玩家已手持生串、右下按钮红圈提示 `手上有东西`，但屏幕正中同时飘着 `去料箱取料` 胶囊，上方金色箭头又指向砧板，三处信息互相打架。
4. **公网旧包缺失多项已定稿指引（归因 `B-081`）**：三个料箱外形几乎无区分、无斗方挂牌；餐桌无桌号徽章、无桌底光圈、无离屏指引；营业额 `¥0` 时顶栏已亮满 `★★★`（`B-106`）。

### 让我不爽的（Friction）
1. **收款 `+¥62` 飘字到处撞 UI**：横屏直接盖住顶栏 `第 1 关` 的「第」字（`land-serve-serve-paid.png`），竖屏直接糊在顾客头顶 `用餐中` 气泡文字上（`port-serve-serve-paid.png`）。
2. **切配进度条糊在角色脸上 + 砧板操作繁琐**：无论竖屏还是横屏，`#bbq-chop .cb` 都正好挡住柳真真的脸和身体，只露半顶厨师帽（`port-chop-chop-1of3.png`、`land-chop-chop-1of3.png`）；且生串到砧板要先按 1 次放上台、再按 3 次切、最后按 1 次取回，共 5 次点按才能拿走。
3. **横屏大摇杆死死压住左侧操作区（`B-072` 公网未生效）**：130×130 摇杆 @(22,238) 直接盖住垃圾桶右半部、整个五花肉料箱及角色下半身（`land-chop-chop-1of3.png`、`land-chop-chop-spam.png`），右下动作键 @(742,284) 也轻压最右侧备用台。
4. **烤炉疑似两套进度条并存**：DOM `.gb` 进度条下方还能看到一小截更短的暗色短条（`port-grill-grill-cooked.png` 裁剪放大可见），与源码 `src/game/grill.ts` 里另画的一套 3D sprite 进度条吻合，看着像渲染残影。
5. **竖屏上下穿帮与画幅浪费**：后墙上方露出越界木地板、右上菜单黑板被画面右缘裁掉一部分，下方则是整片黑边（`port-grill-grill-raw.png`）。

### 让我想继续玩的（Hook）
- **烤制节奏的紧张感已成型**：6s 熟→10s 橙色闪烁 `快焦了 2s`→12s 变暗红 `焦了 ✗` 的时间窗与色彩梯度直观，能跑出胡闹厨房式抢救烤串的紧迫感（`port-grill-grill-cooked.png`→`warn.png`→`burnt.png`）。
- **云南夜宵摊暖光氛围有辨识度**：炭火暖橘光池漫过台面湿反、餐区三盏暖铜吊灯投下柔和光锥（`port-grill-grill-raw.png`、`port-serve-serve-paid.png`），配色与光影底子讨喜。
- **高小费即时回馈有基础**：快速上菜拿到 ¥48 菜价 + ¥14 小费（共 ¥62）并立刻计入营业额，机制本身有冲分动力。

### P0 阻塞（不修没法玩）
1. **公网旧包未部署，公网/本机/仓库三方构建不一致（`B-081`）**
   - 复现步骤：2026-11-21 21:08Z 打开线上 https://openfolio.uk/bbq/ 检查 `window.__build` 与加载的入口脚本名，并比对 `127.0.0.1:3035` 与仓库 `dist/assets/`。
   - 后果：公网停在 `2290acb-202611210547`（`index-BklOlgyL.js`），与本机 `index-Shggdsxc.js`、仓库 `index-Juy7ZBi9.js` 三方不一致；仓库中已落地的横屏摇杆 112px（`B-072`）、料箱 60% 食材+挂牌（B-094）、桌号徽章/桌底光圈/离屏指引、横屏 `top:150px` 订单卡（B-076）全部未上线，真实玩家体验与后续走查持续被旧包阻塞。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/land-chop-chop-1of3.png`、`e2e/review/2026-11-21T21-08Z-r22/port-serve-serve-paid.png`
   - **验收标准**：`https://openfolio.uk/bbq/`、`http://127.0.0.1:3035/` 与仓库 `dist/assets/` 的入口 JS 文件名及 `window.__build` 三方完全一致；线上 844×390 实测 `#bbq-stick` 为 `112×112`（±1px）、订单卡位于右侧 `top≥140px` 且不压顶栏、餐桌显示桌号徽章。

### P1 明显缺陷
1. **装盘台成品菜误导「去垃圾桶丢掉」，引导箭头还指向左侧货架（对应 `B-110`）**
   - 复现步骤：无匹配待上菜顾客时，完成取料→切配→烤熟（`t=6.27`），站到装盘台按动作键使 `carrying={dish:'pork',stage:'plated'}`，保持站在装盘台观察右下按钮与世界空间引导箭头。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/port-serve-serve-plated.png`、`e2e/review/2026-11-21T21-08Z-r22/land-serve-serve-plated.png`
   - **验收标准**：`carrying.stage === 'plated'` 且场上无匹配顾客时，`#bbq-act` 文本禁止包含「垃圾桶」或「丢掉」（应提示等待上菜/端菜待出餐），且引导目标 `hint` 不等于 `trash`；仅 `carrying.stage === 'waste'` 时指向垃圾桶（横竖屏各跑 3 次 100% 通过）。
2. **收款 `+¥62` 飘字在横屏压住顶栏「第 1 关」、竖屏压住顾客「用餐中」气泡（对应 `B-112`）**
   - 复现步骤：在 `t1` 生成顾客并上菜（烤五花肉拼盘），在收款瞬间检查 `#bbq-popups` 与 `.topbar` 及顾客头顶气泡的屏幕位置。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/land-serve-serve-paid.png`、`e2e/review/2026-11-21T21-08Z-r22/port-serve-serve-paid.png`
   - **验收标准**：横屏 844×390 与竖屏 390×844 上菜瞬间，`#bbq-popups` 飘字元素的 `getBoundingClientRect()` 与 `.topbar` 重叠面积为 `0`（`popup.top >= topbar.bottom + 8`），与同桌顾客头顶气泡重叠面积为 `0`，且 1.5s 内自动清除（双视口各连跑 3 次）。
3. **烤炉烤串过小且熟/焦缺乏可辨色变、三烤位分格弱、DOM 与 3D 进度条疑似并存（对应 `B-111`）**
   - 复现步骤：将切好的五花肉串放上烤炉 1 号位，冻结时钟定步长推进至 `t=0.12`、`t=3.12`、`t=6.72`（熟）、`t=10.72`（快焦）、`t=13.72`（焦），对比 3D 串外观、烤炉格线与 `.gb` 进度条下方区域。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/port-grill-grill-cooked.png`、`e2e/review/2026-11-21T21-08Z-r22/port-grill-grill-burnt.png`、`e2e/review/2026-11-21T21-08Z-r22/land-grill-grill-cooked.png`、`e2e/review/2026-11-21T21-08Z-r22/land-grill-grill-burnt.png`
   - **验收标准**：烤炉具有清晰的 3 个独立槽位分格（分隔物对比度足够，单帧截图能一眼数出 3 格）；烤串在 `t=6.72` 呈现明确金黄材质与金色粒子、`t=13.72` 呈现明确焦黑材质（材质亮度较 `cooked` 下降 ≥50%）与浓灰烟；烤位只保留一套进度 UI（场景中不存在与 DOM `.gb` 重复的 3D 进度条对象）。
4. **切配进度条 `.cb` 在横竖屏均直接压住角色脸部与躯干（对应 `B-113`）**
   - 复现步骤：手持生串站到砧板前，按下放上台并切 1/3、切至 3/3，观察 `#bbq-chop .cb`（竖屏 80×35 @(136,462)、横屏 @(284,229)）与柳真真角色的位置关系。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/port-chop-chop-1of3.png`、`e2e/review/2026-11-21T21-08Z-r22/port-chop-chop-done.png`、`e2e/review/2026-11-21T21-08Z-r22/land-chop-chop-1of3.png`
   - **验收标准**：横竖屏切配过程中，`#bbq-chop .cb` 边界框既不与角色头身屏幕投影区重叠，也不遮挡砧板菜面食材，且不落入左下摇杆/右下动作键矩形内（横竖屏各断言重叠面积为 `0`）。
5. **竖屏后墙外越界木地板穿帮与黑板被右缘裁切（对应 `B-114`）**
   - 复现步骤：以 390×844 竖屏进入对局并移动至砧板、烤炉、餐桌区，观察画面上方后墙、绿色檐口及右上角菜单黑板。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/port-chop-chop-1of3.png`、`e2e/review/2026-11-21T21-08Z-r22/port-grill-grill-raw.png`、`e2e/review/2026-11-21T21-08Z-r22/port-serve-serve-paid.png`
   - **验收标准**：390×844 竖屏下，后墙顶沿之外不再露出重复木地板；菜单黑板完整位于视口内且标题「柳真真烤肉」不被裁切。
6. **既有线上遗留 P1 仍未生效（`B-072`、`B-108`、`B-106`）**
   - 复现步骤：线上横屏 844×390 检查 `#bbq-stick` 尺寸与料箱遮挡；检查 `.gb-txt`/按钮文字/桌号徽章；检查 `营业额 ¥0` 时的顶栏星级显示。
   - 截图路径：`e2e/review/2026-11-21T21-08Z-r22/land-chop-chop-1of3.png`、`e2e/review/2026-11-21T21-08Z-r22/port-grill-grill-raw.png`
   - **验收标准**：随 `B-081` 同步最新包后，按既有单验收：横屏摇杆 112×112 不压五花肉料箱与垃圾桶（`B-072`）；全部 HUD 字号 ≥13px 且餐桌与订单卡带匹配桌号徽章（`B-108`）；营业额 ¥0 时不得显示满 3★（`B-106`）。

### P2 打磨项
1. **持物后残留过期的中央引导 Toast（对应 `B-115`）**：`land-serve-serve-spam.png` 中玩家已手持生串（右下红圈 `手上有东西`），中央仍悬着前序触发的 `去料箱取料` 胶囊，需在 `carrying` 变更时立即清掉旧提示。
2. **砧板首按交互与图标语义打磨（并入 `B-113`）**：生串到砧板需「放+切×3+取」5 次点按偏碎，且动作键切配与取串均沿用斜串图标而非菜刀 SVG（`port-chop-chop-1of3.png`、`port-chop-chop-done.png`）。
3. **收款明细与已上菜订单卡状态（明细并入 `B-112`）**：`+¥62` 未拆出小费构成（¥48 + 小费 ¥14），且顾客已上菜进入 `用餐中` 后右上订单卡仍常驻显示 `¥48 · 用餐中`（`port-serve-serve-after.png`、`land-serve-serve-after.png`）。
4. **`t1` 餐桌左后方竹编方块穿插**：门口台阶与 `t1` 桌左上角之间斜插一块竹编立方体（`port-serve-serve-paid.png`、`land-serve-serve-paid.png`），建议归位或移除。
5. **控制台弃用告警与首屏软渲染基线**：每局稳定输出 2 条 Three.js warning（`THREE.Clock` 弃用、`PCFSoftShadowMap` 移除），需替换 API；软渲染首屏 6.8–9.5s 仅留作环境基线。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md` §1 & §2（核心循环/切配）**：要求「切配台 → 点按 3 次 → 切好的串」，实测需第 1 次放上台 + 3 次切 + 第 5 次取回共 5 次点按。
- **`GAME-DESIGN.md` §7（手感与反馈）**：要求「烤熟：串变金黄 + 站点上方飘烟变金；烤焦：变黑 + 灰烟」，实测 `t=6.72` 串过小看不出金黄且无金烟、`t=13.72` 仅极淡灰烟；要求「HUD 营业额滚动」，本轮静态截图未见滚动过程；另要求成品菜进入上菜环节，实测装盘无客时按钮/箭头反指向垃圾桶。
- **`GAME-DESIGN.md` §4（评分）**：要求 3★ 需达成 `r ≥ 1.0 且 a = 0 且 w ≤ 1`，线上实测 `营业额 ¥0` 即显示满 3★（`B-106`）。
- **`ART-DIRECTION.md` §1（镜头与横屏摇杆）**：要求「可见地面永远落在 12×9m 世界里」「横屏摇杆 112px」，实测竖屏后墙外露出越界木地板、横屏摇杆仍为 130×130 压住垃圾桶与五花肉箱（旧包 `B-081`/`B-072`）。
- **`ART-DIRECTION.md` §2（配色与料箱识别 B-094）**：要求「烤熟统一偏 `#d98a3d` 金边、焦 `#241d18`」「料箱食材横向覆盖箱顶 ≥60% + 斗方挂牌」，实测烤串过小难辨金黄/焦黑，线上料箱仍为旧包占位竹盒（`B-081`）。
- **`ART-DIRECTION.md` §5（UI 皮肤与字号/订单卡）**：要求「HUD ≥13px」「横屏订单卡 `top:150px` 竖排不压状态条」，线上订单卡仍在 @(692,8)（`B-081`）、局部字号低于 13px（`B-108`），且 `+¥62` 飘字直接压住顶栏状态条。

---

**本轮判读说明**：四问/体验评分与画像由 agy（`gemini-4-neon-high`，Opus 5.5 额度耗尽回落）基于 24 张截图给出；
其中「3 烤位分格是否存在」「进度条下方暗色短条」两处两次判读结论不一致，已在正文标注待确认，不当成定论。

## 2026-11-21 20:38Z 第 21 轮

**本轮覆盖剧本**：① 首屏 3 秒可读性、② 移动手感（WASD 定步长 + 真实指针摇杆）、⑥ 顾客耐心归零离店与评级、⑦ 打烊结算与「进入第 2 关」、⑧ 双端 HUD 遮挡、⑩ 控制台。**本轮未重跑取料→切配→上炉→上菜全链**（第 20 轮已验证），以下结论不涉及该链路。竖屏 390×844（8 张）+ 横屏 844×390（6 张），共 14 张截图逐张看过。

**环境说明**：走查对象是公网 `https://openfolio.uk/bbq/`（构建 `index-BklOlgyL.js`，`window.__build = 2290acb-202611210547`；本机 pm2 `:3035` 为 `index-Shggdsxc.js`，仓库 `dist/assets/` 为 `index-DBAY4hMS.js`，公网落后）。运行环境为 SwiftShader 软件渲染 + 宿主 load 13.6/8 核，首屏耗时数据受软件渲染与高负载放大，只作公网基线记录，不等同真机。

综合评分：2.9/5（比上轮 −0.5；四问均分 `(3.2+3.3+2.5+2.6)/4 = 2.9`，主因直测公网旧包并曝出局内/结算星级自相矛盾）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视、格子感、高饱和食材、Q 版角色） | **3.2** | 正交俯视、木地板板缝、台面排格（垃圾桶→3 料箱→砧板→菜刀→烤炉→装盘台）与 Q 版白帽红围裙厨师造型成立（`port-06-level2.png`、`land-06-level2.png`）。扣分：3 个料箱在 `port-06-level2.png`、`land-06-level2.png` 上仍是三块几乎同色的竹编方块，肉眼分不出五花肉/菌子/米线；横屏 `land-02-joystick.png`、`land-06-level2.png` 把后墙、扎染、辣椒串、黑板切出画外，云南辨识度只剩竖屏。 |
| ② 灯光有没有 Saltline 那种味道（暖光池、炭火点光、雾、明暗层次） | **3.3** | 竖屏 `port-02-joystick.png`、`port-04-after-leave.png`、`port-06-level2.png` 可见 3 盏吊灯投下柔和体积光锥，桌面暖光池清晰，烤炉条带往台前地板投出大片橙红暖光，明暗层次有氛围。扣分：静帧读不到雾的纵深；烤炉仍是一整条均匀橙棕横纹（`port-02-joystick.png`、`land-06-level2.png`），缺炭块颗粒、火星、3 烤位分格与烟雾；横屏吊灯本体全部出画，只剩地板浅色光斑（`land-02-joystick.png`）。 |
| ③ HUD 是否整齐（对齐、字号、不重叠、不挡操作） | **2.5** | 主 HUD 6 组两两交叠面积全为 `0`、出屏元素 `0`（竖屏 `topbar 315×36 @(37,8)`、`orders 142×47 @(238,54)`、`stick 130×130 @(22,692)`、`act 76×76 @(288,738)`；横屏 `topbar 315×36 @(264,8)`、`orders 142×47 @(692,8)`、`stick 130×130 @(22,238)`、`act 76×76 @(742,284)`）。重扣分：4 处字号低于 `ART-DIRECTION §5` 的 13px（`#bbq-act .cap` **10px**、`.card .pr` **11px**、`.topbar .k` **12px**、`.gb-txt` **12px**），`.tb-badge`/`.order-num` 均为 `null`；横屏 130×130 摇杆整块压住 `crate-pork` 与半个垃圾桶，金色引导箭头被压在摇杆球正后方（`land-02-joystick.png`、`land-04-after-leave.png`、`land-06-level2.png`）；动作键压住右端台面；`烤五花肉拼盘` 气泡叠压顶栏下沿（`land-02-joystick.png`），两条 `愤怒离店` 胶囊被视口上沿拦腰裁半（`land-03-angry.png`）；竖屏底部约 170px 纯暗死色带、两键底距不齐（22px vs 30px，`port-02-joystick.png`），右缘气泡圆环被裁（`port-07-angry-hud.png`）。 |
| ④ 有没有明显缺陷（穿模、悬空、贴图错误、文字溢出、错位） | **2.6** | 2 套视口 + 3 次会话 **JS error 0**（仅 2 条固定 THREE warning），第 2 关跳转真实生效（`port-06-level2.png`、`land-06-level2.png`）。重扣分：同一状态下局内顶栏给 **1★**、结算面板给 **2★**（`port-07-angry-hud.png` vs `port-08-results-angry.png`）；`served=0 / angry=5、6` 仍给 2★ 并庆祝「目标达成」（`port-05-results.png`、`land-05-results.png`）；首屏菜单态左右下角仍显示半透明摇杆与动作键圈（`port-01-title.png`、`land-01-title.png`，`controls.setVisible` 只在 phase 变化时调用，菜单态没隐藏）；横屏厨师与 t4 桌左沿叠画（`land-02-joystick.png`、`land-03-angry.png`）；公网构建落后多轮（三处 hash 不一致）。 |
| 体验 · 上手清晰度 | **3.2** | 首屏卡片一屏交代店名、五步流程（`取料 → 切配 → 炭烤 → 装盘 → 上菜`）、第 1 关目标（`3 分钟营业额 ¥180`）与居中金色 `开 店` 按钮（`150×45`，`port-01-title.png`、`land-01-title.png`），开局动作键写明 `去料箱取料`。扣分：3 个料箱长相一致、横屏金箭头被摇杆圆球遮死（`land-04-after-leave.png`、`land-06-level2.png`）、动作键是虚线圆圈占位且说明字仅 10px、缺 `.tb-badge`/`.order-num` 导致卡与桌无法编号对应、公网冷启动 8.95s–29.36s 无加载反馈。 |
| 体验 · 操作手感 | **3.3** | `__test.tick(1/60, 60, 1, 0)` 推进 1s 实测位移 **3.200m**（与 `GAME-DESIGN §6` 的 3.2 m/s 零误差）；真实指针拖摇杆 40px 后持续渲染移动（`port-02-joystick.png`、`land-02-joystick.png`）；点 `进入第 2 关`（`150×45`）可靠切关（`level=2, levelTarget=260, timeLeft=179.0`）。扣分：横屏左拇指摇杆覆盖首个交互目标 `crate-pork`（`land-02-joystick.png`）；结算次按钮 `再 开 一 局` 仅 `150×40`（低于 44px 触控下限，`port-05-results.png`、`land-05-results.png`）；竖屏两键底距不齐（22px vs 30px）。 |
| 体验 · 正反馈（爽感） | **2.5** | 达标结算面板的金星、绿色过关文案、金色主按钮层次清晰，点 `进入第 2 关` 后目标真实抬到 ¥260（`port-05-results.png`、`port-06-level2.png`、`land-06-level2.png`）。扣分：顾客愤怒离店时 `#bbq-popups` 文本为空字符串，没有 HUD 扣分飘字，顾客头顶也没有红怒符号，横屏离店标签还被顶边裁半（`land-03-angry.png`）；同一局面局内 1★ 与结算 2★ 打架（`port-07-angry-hud.png`、`port-08-results-angry.png`），`0 服务 / 5–6 愤怒` 照样 2★（`port-05-results.png`、`land-05-results.png`），奖惩可信度被削弱。 |

### 我能做的（Capability）
- **① 首屏可读且入口可用**：双端首屏卡片完整展示 `柳真真云南烤肉 / 炭火生香，小店开张。/ 取料 → 切配 → 炭烤 → 装盘 → 上菜 / 第 1 关 · 目标：3 分钟营业额 ¥180 / 开 店`，主按钮 `150×45`（竖屏 `@(120,471)`、横屏 `@(347,244)`，满足 ≥44px），点击正常开局（`port-01-title.png`、`land-01-title.png`）。公网实测 TTFB `680ms`、JS bundle `614KB`，SwiftShader + load 13.6/8 核下 `DOMContentLoaded` `8947ms`（另一次 `29358ms`）、`开 店` 可见 `8969ms`（另一次 `10674ms`）。
- **② 移动速度与摇杆响应正常**：`__test.tick(1/60, 60, 1, 0)` 推进 1s 位移 **3.200m**（精确命中 `GAME-DESIGN §6` 的 3.2 m/s）；真实指针拖摇杆 40px 后画面持续渲染、角色位移生效，动作键文案保持「去料箱取料」（`port-02-joystick.png`、`land-02-joystick.png`）。
- **⑥ 耐心归零离店链路生效**：3 位顾客就座后 `setPatience(0.9)` 推进，3 张订单卡全部进入 `class="card angry"`；继续推进 `angry 0→3`、`customers` 从 `3` 降到 `1`（离店生效、空桌补新客）、`served=0`、`money=0`；`angry=2` 时局内顶栏星级从 3★ 掉到 1★（`port-03-angry.png`、`port-04-after-leave.png`、`port-07-angry-hud.png`、`land-03-angry.png`、`land-04-after-leave.png`）。
- **⑦ 打烊结算与「进入第 2 关」真实闭环**：竖屏结算面板 `214×373 @(88,236)`，两个按钮 `进入第 2 关`（`150×45`）、`再 开 一 局`（`150×40`）；点击后 `level=2`、`levelTarget=260`、`money=0`、`timeLeft=179.0`、`localStorage['bbq.level']='2'`，顶栏同步 `第 2 关 / 营业额 ¥0 / 时间 3:00 / 评级 ★★★`（`port-05-results.png`、`port-06-level2.png`、`land-05-results.png`、`land-06-level2.png`）。
- **⑧ 主 HUD 容器几何无相互重叠、无出屏**：竖屏 4 容器 + 说明条、横屏 4 容器，6 组两两交叠面积均为 **0**，出屏元素 **0**（矩形见上表③）。
- **⑩ 控制台稳定性**：2 套视口 + 3 次独立会话 **JS error 0**；warning 恒为 2 条（`THREE.Clock` 弃用、`PCFSoftShadowMap` 移除）。

### 我看不懂的（Clarity）
1. **到底算 1★ 还是 2★？为什么 0 个顾客被服务、2 人气走还能拿 2★？** `port-07-angry-hud.png` 顶栏 **1★**（`#f0c060, none, none`），同一状态进结算，背景顶栏还是 1★，前景 `.stars-big` 却给 **2★**（`#f0c060, #f0c060, none`，`port-08-results-angry.png`）；`port-05-results.png`（服务 0 位、愤怒 5 位）、`land-05-results.png`（服务 0 位、愤怒 6 位）也都绿字庆祝「目标达成，进入第 2 关」并亮 2 颗星。星级规则对玩家完全不可推理（新 → `B-106`）。
2. **三个料箱哪个装五花肉、菌子、米线？** `port-06-level2.png`、`land-06-level2.png` 的三个料箱外观几乎相同，没有食材本体或图标；反而是不可交互的左墙装饰架摆满陶罐竹筐，容易误导新手（沿用 `B-094`）。
3. **订单卡对应哪张桌子？** 公网构建 `.tb-badge` 与 `.order-num` 均为 `null`，`port-02-joystick.png`、`land-02-joystick.png` 的订单卡与桌位气泡都没有桌号；多名顾客同点或气泡被裁（`port-07-angry-hud.png` 右缘残缺圆环）时只能靠猜（新 → `B-108`）。
4. **动作键里的虚线圆圈是什么？文字小得费眼**：`port-02`/`port-06`、`land-02`/`land-06` 动作键中心是虚线圆圈占位，`#bbq-act .cap` 仅 **10px**、`.card .pr` 仅 **11px**、`.topbar .k` 与 `.gb-txt` 仅 **12px**，全低于 `ART-DIRECTION §5`（→ `B-108`）。
5. **门旁斜放的竹编方块是什么？** `port-06-level2.png`、`land-06-level2.png` 中 t1 桌左上角与门口之间贴着 45° 斜放的竹编方块，既不像椅子也不像料箱，看不出交互或装饰意图（第 20 轮已提，未答复）。
6. **刚点开链接为什么要干等近 9–29 秒？** 公网 `DOMContentLoaded` 8947ms（另一次 29358ms）、`开 店` 可见 8969ms（另一次 10674ms），614KB JS 加载与 WebGL 初始化期间没有任何进度/骨架（受 SwiftShader + 高负载放大，但无骨架本身仍是产品缺口，→ `B-109`）。

### 让我不爽的（Friction）
1. **公网一直在跑旧代码**：公网 `index-BklOlgyL.js` vs 本机 `:3035` `index-Shggdsxc.js` vs 仓库 `dist/assets/index-DBAY4hMS.js`，三方互不一致；近几轮修的离屏指引（B-090）、横屏缩摇杆（B-072）、飘字钳制（B-079）在真实用户访问的地址上全看不到（沿用 `B-081`）。
2. **横屏摇杆与动作键双双压死厨房台面，金箭头被摇杆压在正下方**：`land-02-joystick.png`、`land-04-after-leave.png`、`land-06-level2.png` 中 130×130 摇杆 `@(22,238)` 盖住 `crate-pork`、垃圾桶与左架底格；动作键 `@(742,284)` 压住右端台面（沿用 `B-078`）。
3. **横屏世界标签叠顶栏、被视口上沿拦腰截断**：`land-02-joystick.png` 的 `烤五花肉拼盘` 气泡盖住顾客头顶并叠压 `.topbar` 下沿；`land-03-angry.png` 三条 `愤怒离店` 胶囊里上方两条只露出下半截汉字（沿用 `B-093`、`B-085`）。
4. **愤怒离店在 HUD 层零飘字反馈**：3 位顾客离店后 `#bbq-popups` 实测为空字符串，顶栏也没有愤怒计数（`port-04-after-leave.png`、`land-04-after-leave.png`），玩家既没看到扣分飘字，也看不出顾客头顶的红怒符号（新 → `B-107`）。
5. **菜单态控件没隐藏、横屏结算几乎顶满屏幕**：`port-01-title.png`、`land-01-title.png` 下左右下角的摇杆/动作键圈仍是可见的半透明状态（`phase='menu'` 时 `controls.setVisible` 没被调用），而结算面板反而把它们藏了，两处不一致；`land-05-results.png` 面板上下边距只剩约 10px，`再 开 一 局` 仅 40px 高（<44px）且用空格撑字距（沿用 `B-070`、`B-018`、`B-071`）。
6. **竖屏底部死色带 + 两键不对齐**：`port-02-joystick.png`、`port-06-level2.png` 底部约 170px 纯暗色带硬切场景，摇杆底距 22px、动作键底距 30px（沿用 `B-060`、`B-103`）。

### 让我想继续玩的（Hook）
- **「进入第 2 关」不是假按钮**：达标后点主按钮确实切到 `第 2 关`、目标从 ¥180 提到 ¥260、计时重置 3:00 并写进 `localStorage['bbq.level']='2'`（`port-06-level2.png`、`land-06-level2.png`）。
- **开店首屏简洁直给**：一屏把 5 步流程和「3 分钟 ¥180」讲明白，点金色 `开 店` 直接入场，没有冗长教程弹窗（`port-01-title.png`、`land-01-title.png`）。
- **基础走位手感扎实**：3.200 m/s 精确、摇杆拖拽响应直接，配餐区吊灯暖光池与炭火地板泛光，小店氛围底子是成立的（`port-02-joystick.png`）。

### P0 阻塞（不修没法玩）
1. **公网构建长期落后，三端 hash 互不一致，线上用户看不到最新修复（沿用 `B-081`）**
   - 复现步骤：依次 `curl -s https://openfolio.uk/bbq/ | grep -o 'index-[A-Za-z0-9_-]*\.js'`（→ `index-BklOlgyL.js`）、`curl -s http://127.0.0.1:3035/ | grep -o 'index-[A-Za-z0-9_-]*\.js'`（→ `index-Shggdsxc.js`）、`ls dist/assets/index-*.js`（→ `index-DBAY4hMS.js`），比对三个文件名；再用 Playwright 打开公网读 `window.__build`（→ `2290acb-202611210547`）。
   - 后果：B-072、B-079、B-090、`.tb-badge`/`.order-num` 等已开发项在线上全部缺失，走查与交付口径失真。
   - 截图路径：`e2e/review/2026-11-21T20-38Z-r21/land-02-joystick.png`（横屏摇杆仍 130×130）、`e2e/review/2026-11-21T20-38Z-r21/land-03-angry.png`（离店标签仍被顶边裁半）。
   - **验收标准**：一次发布完成 60s 内断言 ① 公网、`127.0.0.1:3035`、`dist/index.html` 三者引用的 `index-*.js` 文件名严格全等；② 公网 `window.__build` 等于本次 commit 的构建串且与本机一致；③ 连续 2 次构建部署后双端（390×844、844×390）冒烟全绿。

### P1 明显缺陷
1. **局内顶栏 1★ 与结算面板 2★ 自相矛盾，且「服务 0 位 / 愤怒 2–6 位」仍给 2★（新 → `B-106`）**
   - 复现：竖屏 390×844 开店 → 让 2 位顾客耐心归零（`angry=2`）→ 读 `#bbq-hud .stars` 实心星数 = **1**（`port-07-angry-hud.png`）→ 置 `money=190`（≥¥180）保持 `served=0, angry=2, waste=0` 直接结束关卡 → 读 `.stars-big` = **2**（`port-08-results-angry.png`）。
   - 根因（读码确认）：局内 `live` 只看 `angry`/`waste`（`main.ts` `onTimeLeft`），结算 `endLevel()` 只看 `r = money/target ≥ 1` 就保底 2★（`game/flow.ts`），两套公式互不相干。
   - 截图：`port-07-angry-hud.png`、`port-08-results-angry.png`、`port-05-results.png`、`land-05-results.png`。
   - **验收标准**：局内与结算调用同一个 `calcStars(state)`；e2e 构造 4 组状态（`money 0/190` × `served 0/4` × `angry 0/2/5`），断言结束前 1 帧与结算首帧星数严格相等；`served === 0` 或 `angry >= 3` 时星级强制 ≤1；双端各连跑 3 次。
2. **愤怒离店零反馈：`#bbq-popups` 空、顾客头顶无红怒符号、横屏标签被顶边裁半（新 → `B-107`）**
   - 复现：双端开店 → 3 位顾客就座后 `__test.setPatience(0.9)` 推进至 `angry 0→3` → 用 `MutationObserver` 记录 `#bbq-popups`：**文本为空字符串**；`port-03-angry.png` 离店顾客头顶无红怒符号，只有三枚大号 `愤怒离店` 文字胶囊压住檐口与黑板；`land-03-angry.png` 上方两枚胶囊被视口上沿裁掉上半截。
   - 截图：`port-03-angry.png`、`port-04-after-leave.png`、`land-03-angry.png`、`land-04-after-leave.png`。
   - **验收标准**：`angry` 递增后 0.5s 内 `#bbq-popups .popup` 至少 1 条含「愤怒/满意度」的非空文本且可见 ≥0.8s；所有 `.popup` 与离店标签满足 `top ≥ topbar.bottom+4 && bottom ≤ vh-8 && left ≥ 8 && right ≤ vw-8`，与 `.topbar` 交叠 `0`；离店顾客头顶存在 ≥20px 红怒图标节点 ≥0.6s；双端各连跑 3 次。
3. **横屏摇杆 130×130 压死开局料箱与金箭头、动作键压台面、气泡叠压顶栏（沿用 `B-078` / `B-093`）**
   - 复现：844×390 开店，截帧计算 `#bbq-stick` `@(22,238,130,130)` 与 `crate-pork`/`bin` 台面投影及引导箭头的交叠（`land-02-joystick.png`、`land-04-after-leave.png`、`land-06-level2.png`）；t2 顾客就座时计算 `.bubble` 与 `.topbar` 交叠（`land-02-joystick.png`）。
   - **验收标准**：844×390 下 `#bbq-stick` ≤112px 且与 `crate-*`/`bin` 台面投影、金箭头屏幕 rect 交叠 `0`；`#bbq-act` 与台面投影交叠 `0`；所有 `.bubble` 与 `.topbar` 交叠 `0`；390×844 回归同样通过，各连跑 3 次。
4. **HUD 四处字号仍 <13px（第 5 次复发），且公网缺 `.tb-badge`/`.order-num`（新 → `B-108`）**
   - 实测：`.topbar .k` **12px**、`#bbq-act .cap` **10px**、`.card .pr` **11px**、`.gb-txt` **12px**（`ART-DIRECTION §5` 要求 ≥13px）；`.tb-badge`、`.order-num` 查询为 `null`。
   - 截图：`port-02-joystick.png`、`port-07-angry-hud.png`、`land-02-joystick.png`。
   - **验收标准**：双端 `parseFloat(fontSize) ≥ 13`（上述 6 类文本）、无 `scrollWidth > clientWidth`；就座后 `.tb-badge`（≥14px）与 `.order-num` 数量等于就座顾客数且编号一一对应；针对**线上公网 URL** 验证，各连跑 3 次。

### P2 打磨项
1. **公网首屏 9–29s 空等、无加载骨架（新 → `B-109`）**：TTFB 680ms、bundle 614KB，`DOMContentLoaded` 8947/29358ms、`开 店` 可见 8969/10674ms，等待期无骨架无进度。
2. **竖屏下半部大片低信息砖地**（新）：`port-06-level2.png` 中前景长台与底部 UI 之间有一大片横跨画面的空白砖地，没有角色、家具或装饰；横屏对应的是中右部地板空区（沿用 `B-025` 变体）。
3. **菜单态控件未隐藏 + 结算次按钮 40px + 横屏结算贴边（沿用 `B-070`/`B-071`/`B-018`）**：`port-01-title.png`、`land-01-title.png` 左右下角透出摇杆/动作键圈；`再 开 一 局` 仅 `150×40`；`land-05-results.png` 面板高 373/390px。
4. **竖屏底部死色带、两键底距不齐、右缘气泡裁切（沿用 `B-060`/`B-103`/`B-101`）**：约 170px 纯暗带；22px vs 30px；`port-07-angry-hud.png` 右缘圆环被裁一半。
5. **场景美术细节（沿用 `B-016`/`B-094`/`B-105`）**：3 个料箱无食材区分；横屏厨师与 t4 桌左沿叠画；门旁 45° 竹编方块身份不明（本轮 vision 未复现「扎染穿模」，该条解除）。
6. **2 条固定 THREE warning 未清零（沿用 `B-006`）**：`THREE.Clock` 弃用、`PCFSoftShadowMap` 移除。

### 与本轮 SPEC 的差距（引用条款）
- **`GAME-DESIGN §1`「顾客耐心归零 → 愤怒离店（满意度 −1）」+ `§7`「愤怒离店：顾客头顶红怒符号 0.6s，路径回门」**：未达标。离店与空桌生效，但 `#bbq-popups` 为空、头顶无红怒符号、横屏标签被裁半（`port-03-angry.png`、`land-03-angry.png` → `B-107`）。
- **`GAME-DESIGN §3`「达标（≥¥180）→ 解锁下一关，进度写 `localStorage.bbq.level`」**：达标。真实进入第 2 关（`level=2, levelTarget=260, bbq.level='2'`）。
- **`GAME-DESIGN §4`「星级 = f(达成率 r, 愤怒离店 a, 废料 w)」「2★: r ≥ 1.0 或 (r ≥ 0.7 且 a ≤ 1)」「结算展示：星级/营业额(+目标)/服务顾客/满意度/废料」**：口径撕裂。局内顶栏不按 §4 算（`angry=2` 给 1★），结算按 `r ≥ 1.0` 给 2★，同局 1★ vs 2★；且 `r ≥ 1.0` 不校验 `served > 0` 与高 `angry`，`0 服务/5–6 愤怒` 仍 2★（`B-106`）。「满意度」一栏至今未展示（`B-074`）。
- **`GAME-DESIGN §6`「摇杆 r=56px、速度 3.2 m/s」「动作键 ⌀72px」**：速度实测 **3.200 m/s** 精确达标；摇杆实测 `130×130`（r=65px）、动作键 `76×76`，与条款不符。
- **`ART-DIRECTION §1`「横屏摇杆 112px（竖屏 128px），底距 `max(16px, env(safe-area-inset-bottom))`」「工作站必须完整可见（横屏硬规则）」**：未达标。横屏摇杆仍 130×130 `@(22,238)`、动作键底距 30px，两者各压台面（`land-02/06`）；竖屏 22px vs 30px 不齐（`port-02/06`）。
- **`ART-DIRECTION §2`「高饱和暖色只给食材/炭火/围裙/辣椒串/扎染」「食材色板 #e8907c/#a97b4f/#e8c96a」**：未达标。3 个料箱无食材色区分（`port-06`、`land-06`）；横屏云南装饰全部出画。
- **`ART-DIRECTION §3`「炭火关键光、炭堆 emissive #ff5a1e」「吊灯 3 盏体积光锥」「雾 FogExp2」**：部分达标。竖屏吊灯光锥与炉前暖光成立，但烤炉无炭块/火星/3 烤位分隔，静帧读不到雾，横屏吊灯本体出画。
- **`ART-DIRECTION §5`「HUD ≥13px、横屏不降级、`.nm/.pr` 13px、`.tb-badge` 14px、按钮图标用内联 SVG」**：全面未达标。4 处字号 10–12px、`.tb-badge`/`.order-num` 为 `null`、动作键仍虚线圆圈占位、横屏订单卡停在 142px 宽（→ `B-108`、`B-081`）。

### 本轮方法学（给下一轮）
1. **开跑前先做部署一致性门禁**：先比对公网、`127.0.0.1:3035`、`dist/index.html` 三个 hash；若公网仍未同步（`B-081`），报告开头必须区分「线上用户实况」与「本机待发快照」，避免两套口径混用。
2. **耐心归零要用 `MutationObserver` + 关键帧连拍**：在耐心归零的 0s/0.2s/0.6s/1.5s 连续抓帧并监听 `#bbq-popups` 增删，才能区分「从未生成飘字」与「飘字早逝」。
3. **星级回归改成矩阵同帧对比**：把 `served={0,3} × angry={0,2,5} × money={0,190}` 参数化，在打烊前 1 帧与结算首帧同时抓两处星数。
4. **vision 判读要交叉复核**：本轮 agy 报的「扎染穿模青瓦檐口」经二次 vision 复核为误判（布幔不规则边缘被当成碎角），已从缺陷清单撤下；下一轮凡涉及「穿模/悬空」的条目一律二次复核后再开单。
5. **下一轮轮转重点**：待 `B-081` 同步公网后，回公网重验 ③④⑤ 全链与 ⑨ 连点，并在低负载/真机补测一次冷启动 TTI，剔除 SwiftShader 干扰。
