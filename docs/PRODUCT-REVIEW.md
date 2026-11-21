# 产品走查报告 — 柳真真云南烤肉

> 只写文档，不改代码。每轮 3–4 个剧本步骤深挖，轮转覆盖 ①–⑩。
> 截图目录：`e2e/review/<UTC>-live/`（竖屏 `port-*` 390×844、横屏 `land-*` 844×390，含 `run-*.json` 原始测量）。

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

## 2026-11-21 19:38Z 第 20 轮

**本轮覆盖剧本**：② 角色移动、⑤ 装盘→上菜→吃饭→收钱→营业额（含焦糊→丢弃→废料）、⑨ 反复快速点同一交互键、⑩ 控制台错误；复核新上线的 B-090「离屏贴边指引」。竖屏 390×844 和横屏 844×390 各跑一轮，16 张截图逐张看过。
**走查对象**：本机 dist 快照 `5f0e889-202611211938`（`index-vH179KKl.js`）。公网仍是第 15 轮的 `index-BklOlgyL.js`，本机 pm2 仍在跑 `index-nc0uBx0_.js`，两条都归入 B-081，不计入评分。
**环境**：8 核 load 8，SwiftShader，约 1fps（整轮 132 帧），首屏可点 11.1s。时延只记录，不作产品结论。

**综合评分：3.4 / 5（比上轮 +0.1；竖 3.5 / 横 3.2）**

**本轮验证通过的部分**：主循环第一次在双端都从头跑通到尾，链路是「料箱 → 切配 3 下 → 烤 → 装盘 → 上菜 → `money 0→60 / served 0→1` → 顾客 `seated→eating` → 订单卡变『用餐中』」。焦糊链路也通了：`waste` 后按钮变「去垃圾桶」，走到垃圾桶丢弃后 `waste 0→1`、手空。料箱连点 12 次只拿到 1 根串，空手连点烤炉 15 次没有任何副作用。B-090 竖屏离屏指引的方向、贴边距离、与摇杆/动作键零交叠、走近后消失都符合验收（`port-06-offhint.png`）。双端 0 error。
**本轮最该修的两处**：
1. **焦串在世界里几乎看不见。** `port-05-grill-burnt.png` 烤炉条带内亮度 <45 的像素只有 **1 个**，`land-05` 也只有 18 个。「焦了」只靠一枚红标签表达，GAME-DESIGN §7 要求的「变黑 + 灰烟」两样都没有。
2. **世界内的标签在关键交互帧盖住玩家本体。** `port-04` 的「已切好 ✓」盖住厨师身体，`port-07` / `land-06` 桌号牌「1」压在厨师脸上，`port-09` 的「丢弃」飘字连同左墙装饰架把玩家整个遮没。

| 四问 | 分数 | 依据（截图文件名 + 像素/文字细节） |
|---|---|---|
| ① 像不像胡闹厨房 | **3.3**（竖 3.4 / 横 3.2） | 做得好的：`port-03-dining.png` 是正交俯视，木地板横缝规整，台面排从左到右依次是垃圾桶 (22,497) → 三个竹编方块 → 白砧板 (215,507) → 刀 → 烤炉 (285+)，与 §5 的格序一致。白帽红围裙的 Q 版厨师 (163,405) 头身比对味。扣分：三个料箱仍是同款竹编方块，`port-03` 采样 `#d2ac6e / #d1ab6c / #d2ae6f`，两两 RGB 距离 **2.2–4.4**。真正带食材色的是左墙装饰架（`#bc9256 / #ac713f / #bd9255`），OC 最核心的「箱上印食材」语汇仍缺（B-094 未动）。 |
| ② 灯光有没有 Saltline 味 | **3.4**（竖 3.5 / 横 3.3） | 做得好的：`port-07-served.png` 两盏铜吊灯 (272,245)、(365,245) 有锥形光柱，桌面上形成暖光池；烤炉条带把台前地板 y≈520–620 打成橙红色。`land-05-grill-burnt.png` 有炉面高光和泛光，有焦后的「热」感。扣分：静帧里看不出雾的纵深；烤炉仍是均匀横纹，空炉 `port-08` 条带均色 `#dfaa6f`，没有炭块颗粒，没有火星，也没有烟。 |
| ③ HUD 是否整齐 | **3.1**（竖 3.3 / 横 2.9） | 做得好的：`port-06` 离屏指引 96×44 @(8,451)，金边 `rgb(240,192,96)` 配深底 `rgb(25,18,12)`，15px，与摇杆/动作键交叠为 0。扣分：① `port-04` 第 3 桌气泡被右缘截成只剩「豆」(x≈347–390)，蓝色光圈「3」也被截掉一半；② `port-07` 的「+¥60」(85–168 × 238–271) 压住同桌「用餐中」气泡，目测交叠约 40×19px，「用餐中」三个字基本被盖住；③ `land-02` 顶栏 (265–578 × 8–43) 与「烤菌子」气泡上沿 (y≈35) 交叠约 8px；`land-04` 第 3 张订单卡 (677–833 × 243–283) 盖住装盘台白盘 (≈668–688 × 262–282)；④ 竖屏底部 y=674–843 共 **170 行恒为 `#1c1410`**（`port-02/04/08` 三张完全一致）。 |
| ④ 有没有明显缺陷 | **3.1**（竖 3.1 / 横 3.2） | 控制台双端 0 error。确认的问题：① 焦串不可读（`port-05` 暗像素 1 个，`land-05` 暗区仅 31×18px）；② `port-09` 丢弃那一帧画面上找不到玩家：左侧红色像素全部落在「丢弃」标签 (10–87 × 431–463) 里，没有独立的围裙色块；③ `port-02` 厨师 (175–210 × 365–425) 与 t4 圆凳 (≈165–190 × 388–415) 叠在一起，`land-02` 厨师 (520–560 × 105–175) 与 t4 桌左前角重叠，目测有穿凳/穿桌感；④ 竖屏桌位气泡出画截字（同③-①）。 |

| 体验维度 | 分数 | 依据 |
|---|---|---|
| 上手清晰度 | **3.6**（竖 3.7 / 横 3.4） | 做得好的：动作键文案把流程讲得很清楚，依次是「放上砧板 → 切配 1/3 → 2/3 → 3/3 → 取回切好的串 → 烤制中… → 取烤串 → 送去客桌 → 上菜 烤五花肉拼盘」，焦后变「去垃圾桶」。`port-06` / `port-08` / `port-02` 出现「← 垃圾桶」「← 料箱」贴边指引，开局有金色下箭头 (70,453) 指向第一个料箱（`port-03`）。扣分：三个料箱分不出哪个装什么；焦串在炉上和手上都认不出，只能读红标签和按钮字；顶栏没有废料数，玩家不知道 §4 的 3★ 只允许 w≤1。 |
| 操作手感 | **3.7**（竖 3.8 / 横 3.5） | 做得好的：WASD 单键 0.7s 走 2.29m（≈3.27 m/s，与 §6 的 3.2 m/s 吻合）；A+S 0.6s 走 1.71m（≈2.85 m/s），斜向没有 √2 加速。料箱连点 12 次只拿 1 根，砧板正好 3 下，空手连点烤炉 15 次三个烤位全空、金额不变（`port-08-tap-spam.png`），B-063 的修复保持住了。扣分：摇杆 0.42R 偏转 0.8s 位移 4.16m（≈5.2 m/s），高于满速，1fps 下读数可疑，见 B-104；横屏摇杆 112×112 @(16,262) 仍盖住料箱 `crate-pork` 和金箭头（`land-02`、`land-06`，B-078）。 |
| 正反馈（爽感） | **3.3**（竖 3.3 / 横 3.3） | 做得好的：`port-07` 上菜那一刻四件事同时成立：「+¥60」飘字、t1 桌面出现白盘 (120,318)、订单卡「¥48 · 用餐中」、顶栏「营业额 ¥60」；`land-06` 的「+¥61」(190–273 × 53–87) 落在顶栏下方，B-079 生效。扣分：订单卡写 ¥48、实收 ¥60，小费没有任何解释（B-065）；飘字盖住「用餐中」气泡；桌号牌「1」盖住厨师；没有金币飞向顶栏；全程无声（B-066）；丢弃只有一枚红字「丢弃」，没有计数落点。 |

### 我能做的（Capability）
- **② 三种移动方式都有效**：摇杆 `#bbq-stick` 130×130 @(22,692)，右拖 0.42R 后位移 4.16m；W 键 0.7s 走 2.29m；A+S 0.6s 走 1.71m，斜向正常。`port-02-joystick.png` 里厨师已经从出生点走到 t4 桌旁 (190,400)。
- **⑤ 出餐闭环全链路可用**：`carrying` 依次是 `{pork,raw}` → `{pork,chopped}` → 烤炉 `chopped@0.1`，6.0–7.5s 时变 `cooked` → `plated` → 站 t1 使用格 (-3.3,-1.2) 上菜 → `money 0→60`、`served 0→1`、`phase seated→eating`（`port-07`）。横屏同一流程得到 `money=61`（`land-06`）。
- **⑤ 焦糊 → 丢弃链路可用**：`waste` 时标签变「焦了 ✕」（`port-05` 110–185 × 457–490，`land-05` 420–493 × 217–250），按钮变「去垃圾桶」，`hint.id=bin`；站到 bin 使用格 (-5.5,2) 按下后 `waste 0→1`，手空，出现「丢弃」飘字（`port-09`）。
- **⑨ 连点稳定**：料箱 12 连点只拿 1 根，空手烤炉 15 连点无副作用，没有复制，没有卡死（`port-08`，顶栏 ¥60 / 2:22 正常走）。
- **B-090 竖屏离屏指引上线**：`[data-offscreen-hint]` 文字「垃圾桶」，`dir=left`，96×44 @(8,451)，左缘 8px，15px，`pointer-events:none`，`aria-label="垃圾桶在左方"`，走近后 `display:none`；料箱出画时同样出现「← 料箱」（`port-02`、`port-08`）。
- **⑩ 稳定性**：双端 `pageerror + console.error = 0`，warning 恒 2 条（`THREE.Clock` 弃用、`PCFSoftShadowMap` 移除）。

### 我看不懂的（Clarity）
1. **三个料箱哪个是五花肉？** `port-03`、`port-04` 台面上三个方块同色（距离 ≤4.4）。`port-02` 里料箱已出画，只剩 x=0–15 的一角。左墙架上的食材 (5–42 × 385–480) 比料箱显眼得多（沿用 B-094）。
2. **我手上拿的是不是焦串？** `port-06` 手持 `{pork,waste}` 站在烤炉前，厨师手里看不出黑色串体；炉面上 `port-05` 只有 1 个暗像素。没有按钮字和红标签就判断不出来（新 → B-097，色值口径沿用 B-064 ③ / B-091 ②）。
3. **丢了 1 根焦串，算不算扣分？** `port-09` 顶栏只有「第 1 关 营业额 ¥0 时间 2:44 评级 ★★★」，没有废料数。§4 的 3★ 条件 w≤1 对玩家不可见（新 → B-100）。
4. **¥48 的单为什么收了 ¥60 / ¥61？** 订单卡始终写 `¥48`（`port-07`、`land-06`），小费只在飘字总额里（沿用 B-065）。而且按 §2「耐心 ≥0.8 给满小费」，满额应为 ¥14，双端实收分别是 12 和 13（新 → B-099）。
5. **第 3 桌点的是什么？** `port-04` 气泡被右缘截成「豆」，第 1 桌气泡贴在左缘 x≈0（新 → B-101）。
6. **门边那个斜放的木块是什么？** `port-07`、`port-09` 门右侧 (≈95–122 × 272–300) 有一个转了 45° 的浅色方块，`land-06` 左上 (≈140–180 × 5–40) 也有。看不出是装饰、顾客的包，还是遗留物，没有一个可读的身份（只记录，不开单，请开发确认归属）。
7. **动作键在引导态为什么一会儿亮、一会儿暗？** 同样是「去料箱取料」，`port-02` 文字峰值亮度 202、外环 135；`port-08` 只有 120 / 84（约 60%）。`port-06` 的「去垃圾桶」也是暗态。暗态看着像「不可点」，而这正是玩家最需要被引导的时候（新 → B-102）。

### 让我不爽的（Friction）
1. **关键交互帧看不见自己**：`port-04` 的「已切好 ✓」(137–215 × 462–497) 把厨师盖得只剩帽尖；`port-07` 桌号牌「1」(≈113–140 × 355–383) 压在厨师身上，红色像素检测在 (125,350) 附近找不到围裙色块；`land-06` 桌号牌 (176–204 × 117–145) 压在厨师脸上；`port-09` 丢弃时玩家被「丢弃」飘字和左墙架完全遮住（新 → B-098）。
2. **横屏左拇指仍压第一个料箱和金箭头**：`land-02` 摇杆 (16–128 × 262–374) 盖住垃圾桶下半部分和 `crate-pork`；`land-06` 金色下箭头 (≈95–120 × 258–285) 的下半截落进摇杆圈（沿用 B-078）。
3. **竖屏底部 170px 死色带还在**：`port-02/04/08` 的 y=674–843 逐行均为 `rgb(28,20,16)`，场景到 y=673 戛然而止，两键「漂」在一块纯色上（沿用 B-060）。
4. **竖屏两键底距不齐**：摇杆底距 22px、动作键 30px，中心 y 757 vs 776。B-072 只管横屏，B-060 的验收也不约束「两键对齐」，这条到现在没人负责（新 → B-103）。
5. **上菜飘字压住同桌气泡**：`port-07` 的「+¥60」盖住「用餐中」。按 `f3661c3` 的 DONE 记录，popup 应与所有 `.bubble` 零交叠，这里属于回归（沿用 B-079 / B-085，不开新单）。
6. **全程无声**：烤熟没有「叮」，焦糊没有「嗤」，收款没有「叮当」（沿用 B-066）。

### 让我想继续玩的（Hook）
- **出餐节奏是对的**：切配 3 下有「1/3 → 2/3 → 3/3」的计数感，烤 6s 熟，熟后有一段窗口，再久就焦。第一次跑完一单，`port-07` 四件事同时亮起（飘字、白盘、用餐中、营业额），这一下是爽的。
- **焦了也能救**：焦串 → 去垃圾桶 → 丢弃这条路有明确指引（按钮字加贴边箭头），失误后不会卡住。
- **小费随耐心浮动**：竖 ¥60、横 ¥61，同一道菜收的钱不一样。只要能看见小费从哪来，这就是「再快一点」的直接动力。

### P0 阻塞（不修没法玩）
1. **交付链路三份构建互不一致（沿用 `B-081`，本轮不新开单）**
   - 现象：公网 `https://openfolio.uk/bbq/` 返回 `index-BklOlgyL.js`（第 15 轮）；本机 pm2 返回 `index-nc0uBx0_.js`（第 18 轮）；`dist/index.html` 引用 `index-vH179KKl.js`（本轮）。本轮所有结论只对 dist 快照成立，B-090 离屏指引在公网和本机 pm2 上都看不到。
   - 复现步骤：`curl -s https://openfolio.uk/bbq/ | grep -o 'assets/index-[^"]*js'`；`curl -s http://127.0.0.1:3035/ | grep -o 'assets/index-[^"]*js'`；`grep -o 'index-[^"]*js' dist/index.html`，三者对比。
   - 截图路径：本轮截图全部来自 dist 快照（`e2e/review/2026-11-21T19-38Z-r20/`），没有公网对照图。
   - **验收标准**：沿用 `B-081`，并补一条本机断言：一次 deploy 后 60s 内，公网 index、`127.0.0.1:3035/` index、`dist/index.html` 三者引用的 js 文件名完全相同；三处 `window.__build` 都等于最新 commit 的 build 串；连续 2 次部署都成立。

### P1 明显缺陷
1. **焦串在炉上和手上都不可读，没有烟（新 → `B-097`）**
   - 现象：`waste` 状态下，竖屏烤炉条带 (128–262 × 495–520) 内亮度 <45 的像素只有 1 个；横屏 (428–628 × 258–295) 有 18 个，集中在 31×18px 的一小团里。串体太小，变色根本看不出。手持焦串时（`port-06`）厨师手里也认不出黑串。全程没有 §7 要求的灰烟或金烟。
   - 复现步骤：任一端开店，取 pork → 切 3 下 → 放上烤炉 → 不取，推进到 `__game.grill.slots[0].stage === 'waste'`；截帧，统计烤炉投影矩形内 `luminance < 45` 的像素数；再取下焦串，在手持状态下对玩家投影矩形做同样统计。
   - 截图路径：`e2e/review/2026-11-21T19-38Z-r20/port-05-grill-burnt.png`、`land-05-grill-burnt.png`、`port-06-offhint.png`；空炉对照 `port-08-tap-spam.png`（暗像素 0）。
   - **验收标准**：见 `B-097`。`waste` 帧烤位投影内暗像素（lum<45）竖屏 ≥ 120、横屏 ≥ 200；存在 `userData.fx === 'smoke'` 的粒子节点，且 `waste` 态烟色亮度 ≤ `cooked` 态 −40；手持焦串时玩家投影矩形内暗像素 ≥ 60；双端连跑 3 次。
2. **世界内标签盖住玩家本体（新 → `B-098`）**
   - 现象：切配完成签、桌号牌、丢弃飘字在关键交互帧压在厨师身上。玩家在「我刚做成了一件事」的那一刻看不见自己。
   - 复现步骤：竖屏站砧板切满 3 下，读「已切好」签 rect 与 `__test.worldToScreen` 玩家包围盒（脚底到帽顶 y=0…1.1m）的交叠；站 t1 使用格上菜，读 `.order-num[data-table=t1]` 与玩家包围盒的交叠；站 bin 使用格丢弃，读「丢弃」`.popup` 与玩家包围盒的交叠。横屏重复以上三步。
   - 截图路径：`e2e/review/2026-11-21T19-38Z-r20/port-04-chop-done.png`、`land-04-chop-done.png`、`port-07-served.png`、`land-06-served.png`、`port-09-bin-discard.png`。
   - **验收标准**：见 `B-098`。上述三类节点与玩家屏幕包围盒的交叠面积 ≤ 包围盒面积的 10%；丢弃帧玩家头顶点投影不被任何不透明 DOM 节点覆盖；双端连跑 3 次。
3. **横屏摇杆压住开局料箱与金箭头（沿用 `B-078`）**
   - 现象：`#bbq-stick` 112×112 @(16,262) 盖住 `crate-pork` 和垃圾桶下半部分（`land-02`）；在 t1 上菜机位，金色引导箭头下半截落进摇杆圈（`land-06`）。
   - 复现步骤：844×390 开店，断言 `hint.id === 'crate-pork'`；读 `#bbq-stick` rect 与 `__test.worldToScreen('crate-pork')` 台面投影、与世界内引导箭头的屏幕 rect，分别求交叠。
   - 截图路径：`e2e/review/2026-11-21T19-38Z-r20/land-02-joystick.png`、`land-06-served.png`。
   - **验收标准**：沿用 `B-078`，并补一条：世界内引导箭头的屏幕 rect 与 `#bbq-stick` 交叠为 0；双端各 3 个机位（出生点 / crate-pork / t1 使用格），连跑 3 次。
4. **横屏 HUD 压世界内容（沿用 `B-093`）**
   - 现象：`land-03` 顾客只露出头顶 (≈130,0–10)，t2/t3 的「…」气泡 (360–478 × 35–65) 跨在顶栏下沿 y=43 上；`land-02`「烤菌子」气泡与顶栏交叠约 8px；`land-04` 第 3 张订单卡盖住装盘台白盘。
   - 复现步骤：844×390 开店，用 `spawnNow` 让 t1–t3 就座（≤maxDiners），读 `.bubble`、`.order-num` 与 `.topbar` 的交叠，读 `.card[data-table=t3]` 与 `plate` 台面投影的交叠。
   - 截图路径：`e2e/review/2026-11-21T19-38Z-r20/land-03-dining.png`、`land-02-joystick.png`、`land-04-chop-done.png`。
   - **验收标准**：沿用 `B-093` (a)–(d)，连跑 3 次。
5. **三个料箱同色、无食材（沿用 `B-094`）**
   - 现象：`port-03` 三箱均色 `#d2ac6e / #d1ab6c / #d2ae6f`，两两距离 2.2–4.4；横屏 `land-02` 后两箱 `#d1ab6c / #d4af70`，距离 6.4（第一箱被摇杆半透明层压暗，不计入）。左墙装饰架反而带食材色。
   - 复现步骤：任一端开店，出生点截帧，对三个 `crate-*` 顶面中心 22×18px 取均色。
   - 截图路径：`e2e/review/2026-11-21T19-38Z-r20/port-03-dining.png`、`port-04-chop-done.png`、`land-02-joystick.png`。
   - **验收标准**：沿用 `B-094`，三箱两两 RGB 距离 ≥ 40，双端连跑 3 次。

### P2 打磨项
1. **顶栏没有废料计数（新 → `B-100`）**：`port-09` 丢弃后 `waste=1`，顶栏没有任何变化。验收：`waste` 递增当帧，顶栏出现 `[data-waste-count]`，数字等于 `state.waste`。
2. **小费不符合 §2「耐心 ≥0.8 给满小费」（新 → `B-099`）**：竖屏实收 60（小费 12），横屏 61（小费 13）。满额是 round(48×0.3)=14，两次都没给到。验收：`setPatience(0.9×max)` 后上菜，`money` 增量 === 48+14。
3. **竖屏气泡与光圈出画截字（新 → `B-101`）**：`port-04` 第 3 桌气泡只剩「豆」，蓝圈「3」被截一半；`port-05` 最急的 1 号桌（卡片已变红）气泡完全不在画内。验收：所有可见 `.bubble` 满足 `left ≥ 4 && right ≤ vw−4`。
4. **离屏指引缺目标图标，引导态动作键半亮（新 → `B-102`）**：`port-06` 指引只有箭头加「垃圾桶」三个字，没有 B-090 ② 要求的目标图标；动作键引导态文字峰值亮度 120，比 `port-02` 的 202 低 40%。横屏可见态本轮没测到，需要一个可构造的机位。验收见 B-102。
5. **竖屏摇杆和动作键的尺寸、底距三份口径打架（新 → `B-103`）**：实现是 130px / 76px，底距 22 / 30；ART §1 写竖屏 128px；GD §6 写 r=56（即 112px）、动作键 ⌀72。验收：两键 `rect.bottom` 相等，尺寸与文档唯一数值一致。
6. **摇杆偏转与速度的映射需要用固定步长锁死（新 → `B-104`）**：0.42R 偏转得到约 5.2 m/s，高于 WASD 满速 3.27 m/s。1fps 下读数可能失真，但现在没有任何确定性断言兜底。
7. **玩家穿过圆凳/桌角的视觉穿模（新 → `B-105`）**：`port-02` 厨师与 t4 圆凳叠画，`land-02` 厨师与 t4 桌左前角叠画。§5 规定椅子不挡路，所以要从视觉上处理。
8. **上菜飘字压住同桌气泡（沿用 `B-079` / `B-085` 回归）**：`port-07` 的「+¥60」与「用餐中」目测交叠约 40×19px。验收沿用 `f3661c3`：popup 与 `.bubble` 交叠为 0。
9. **订单卡不写小费（沿用 `B-065`）**：`port-07` / `land-06` 订单卡写 ¥48，实收 ¥60 / ¥61。
10. **开始面板背后仍露出摇杆和动作键（沿用 `B-070`）**：`port-01` 摇杆圈约 22–152 × 692–822、动作键圈约 288–364 × 738–814；`land-01` 摇杆圈约 20–125 × 265–370、动作键圈约 745–815 × 300–370。「开 店」仍用全角空格撑字距（沿用 `B-071`）。
11. **烤炉 3 个烤位看不出（沿用 `B-092`）**：`port-08` 空炉是一整条均匀横纹（均色 `#dfaa6f`），看不出 3 个分格。
12. **引导态图标仍是虚线圆圈占位（沿用 `B-094` ③）**：`port-06/07/08/09` 的动作键中心都是「◌」；动作态（`port-04` 串图标、`port-05` 手形图标）已经有真图标，两种状态不一致。

**本轮判断点结论**
1. **竖屏摇杆 130×130、底距 22/30**：不是本轮新出的问题，第 13 轮就记过。B-072 只管横屏；B-060 只要求「距屏底 ≥ safe-area」，不要求两键对齐，所以这条一直没人负责。本轮开 B-103 专门处理。
2. **B-060 死色带**：还在。`port-02/04/08` 的 y=674–843 共 170 行，逐行恒为 `rgb(28,20,16)`（`#1c1410`），三张图完全一致。
3. **B-094 料箱差异**：没有。`port-03` 三箱距离 2.2–4.4；`port-02` 里料箱在画外，只剩 x=0–15 一角；`port-04` 的三个方块 (18–42 / 65–90 / 112–137 × 492–512) 目测同款。
4. **B-093 横屏顾客**：还是只露头顶。`land-03` 的 t1 顾客头顶在 y≈0–10，t2/t3 气泡跨在顶栏下沿上。
5. **焦糊视觉**：串体没有可辨识的变黑（暗像素竖 1 个 / 横 18 个），也没有烟；唯一可辨识的是红色「焦了 ✕」标签和动作键「去垃圾桶」。
6. **上菜正反馈**：飘字、白盘、「用餐中」、营业额四件事都在，能及格。不够的地方：小费不解释、飘字压气泡、桌号牌压厨师、无声、没有金币飞向顶栏。
7. **连点稳定性**：稳定，没有复制，没有卡死（12 连点 / 15 连点，`port-08`）。
8. **废料计数**：顶栏没有废料数，只有一次性的「丢弃」飘字（`port-09`）。
9. **B-090 醒目度与重复表达**：够醒目（96×44、金边、15px、贴左 8px、y 与台面排同高）。与动作键不算重复：动作键回答「做什么」，指引回答「在哪边」。但缺目标图标，动作键在这一刻又是半亮，两者没有视觉上的联动（B-102）。横屏只验证了「隐藏路径」，「可见路径」待测。
10. **首屏 3 秒**：能看懂是「烤肉店经营」。`port-01` / `land-01` 卡片依次写着店名、「取料 → 切配 → 炭烤 → 装盘 → 上菜」、「第 1 关 · 目标：3 分钟营业额 ¥180」和唯一按钮「开 店」。背景重度虚化，看不出画面长什么样（沿用 B-036）；背后露出控件（B-070）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN §1`「切配台 → 点按 3 次」「烤炉 6s 熟 / 12s 焦」「装盘 → 上菜 → 收款」**：链路达标，切配 3 下准确，熟成实测 6.0–7.5s（1fps 容差内）。焦糊只在 t≈25s 采到 `waste`，12s 这个节点没有采样，不能判定是否达标。建议 B-064 验收补 `t=11.9 / 12.1` 两点断言。
- **`GAME-DESIGN §1`「收款 = 菜价 + 小费(按剩余耐心比例)」+ §2「耐心比例 ≥0.8 给满小费」**：未达标。双端小费 12 / 13，满额应为 14（B-099）；小费在 UI 上不可见（B-065）。
- **`GAME-DESIGN §1`「炭火烤炉(3 烤位)」**：功能上能放，视觉上看不出 3 个烤位（`port-08`，B-092）。
- **`GAME-DESIGN §4`「3★: … 且 w ≤ 1」「结算展示 … 废料数」**：计数逻辑在（`waste 0→1`），但局内看不到 w，玩家无法管理这项预算（B-100；计数时机口径沿用 B-091）。
- **`GAME-DESIGN §5`「x=0 垃圾桶 | x=1..3 料箱×3 | x=4,5 切配台 | x=6..8 烤炉 | x=9,10 装盘台」**：格序达标（`port-03` 从左到右与文档一致）。
- **`GAME-DESIGN §5`「开局/离开站点圈时右下按钮不置灰：显示引导语、opacity 1」**：开局达标（`port-02` 文字亮度 202）。站在站点圈内但当前无有效动作时，按钮降到约 60% 亮度（`port-06/08`，120），文档没有覆盖这个状态，B-102 要求补齐口径。
- **`GAME-DESIGN §6`「左下虚拟摇杆 r=56px」「右下单一大按钮 ⌀72px」「速度 3.2 m/s」**：竖屏摇杆 130px、动作键 76px，都与文档不符（B-103）；WASD 3.27 m/s 达标；摇杆 0.42R 偏转得到 5.2 m/s，可疑（B-104）。
- **`GAME-DESIGN §7`「烤熟：串变金黄 + 叮 + 站点上方飘烟变金；烤焦：变黑 + 灰烟」**：未达标。没有烟，没有声音，焦串不可读（B-097 / B-066）。
- **`ART-DIRECTION §1`「横屏摇杆 112px…；竖屏 128px」「工作站必须完整可见…竖屏在各站点使用格成立」**：横屏 112px 达标，但仍压住料箱（B-078）。竖屏实际 130px，与 128 差 2px。竖屏站烤炉时垃圾桶在画外，由 B-090 指引兜底，按 B-090 (b) 分支达标。
- **`ART-DIRECTION §2`「高饱和暖色只给：食材/炭火/围裙…」+ 食材色板 `#e8907c / #a97b4f / #e8c96a`，焦 `#241d18`**：未达标。料箱上没有食材色（B-094）；焦色 `#241d18` 在 `port-05` 的炉面上只占 1 个像素（B-097）。
- **`ART-DIRECTION §2`「角色 Q 版…玩家 `#d94f30` 朱红 + 白厨师帽」**：造型达标，但 `port-07` / `port-09` 的关键交互帧里玩家被世界标签遮住（B-098）。
- **`ART-DIRECTION §5`「面板 rgba(24,16,12,.72) + 金边」「字号 HUD ≥13px」**：离屏指引达标（底 `rgb(25,18,12)`、边 `rgb(240,192,96)`、15px）。
- **`ART-DIRECTION §5`「按钮图标用内联 SVG（禁 emoji 占位）」**：动作态达标，引导态仍是虚线圆圈占位（B-094 ③）。
- **`ART-DIRECTION §5`「订单卡…横屏夹在桌位光圈与动作键之间，不压状态条」**：`land-04` 第 3 张卡压住装盘台白盘（B-093）。

## 2026-11-21 19:20Z 第 19 轮

**本轮覆盖剧本**：① 首屏理解成本、⑥ 耐心归零离店、⑦ 打烊结算与第 2 关、⑧ 竖屏/横屏 HUD 遮挡。竖屏 390×844、横屏 844×390 各跑一遍，12 张截图逐张看过。
**线上基线**：本机最新构建 `f3661c3-202611211840`（走查对象）；公网 `https://openfolio.uk/bbq/` 仍是 `assets/index-BklOlgyL.js` 旧构建（B-081 未修），公网不计入本轮评分。
**环境**：8 核 load 17、软件渲染；首屏可点 7.4s（竖）/ 6.2s（横），时延不作产品结论。控制台双端 0 error，warning 恒 2 条。

**综合评分：3.3 / 5（比上轮 ±0.0；竖 3.5 / 横 3.1）**
一句话：**本轮验证通过的部分：耐心归零后顾客当帧全部离店，`angry` 和顶栏星级同步变化（竖 2 位、横 3 位，星级都从 3 实降到 1 实 2 空）；两张结算面板的差额、星级与 `GAME-DESIGN §4` 公式逐项对得上；「进入第 2 关」确实把关卡推到 `level=2 / target=260 / 3:00`。本轮最该修的有两处：一是横屏摇杆缩到 112px 以后，仍然整块盖住开局金箭头指向的第一个料箱 `crate-pork`（台面中心约 (105,284)，落在摇杆 `16–128 × 262–374` 内）；二是公网仍是第 15 轮旧构建（B-081）。**

| 四问 | 分数 | 依据（截图文件名 + 实测数字） |
|---|---|---|
| ① 像不像胡闹厨房 | **3.3**（竖 3.5 / 横 3.1） | `port-02-entered.png` 是正交俯视，木地板横向板缝很规整，有格子感；圆竹凳、方木桌、白帽红围裙的 Q 版厨师（约 (163,405)，头身比接近 1:1.6）都对味。扣分：① 台面上 3 个料箱（`land-02-entered.png` x≈85–125 / 155–195 / 225–265，y≈270–298）是三块一样的竹编方块，像素均色 `#947549 / #cba364 / #cca567`，后两个几乎同色，箱上看不到任何食材。`oc1.jpg` 左列料箱都印着玉米、洋葱、黄瓜、番茄图标，一眼就知道里面装什么，这是最核心的 OC 语汇，这里缺了；② 横屏（`land-02/03/04/08`）后墙、门、扎染布幔、辣椒串全部出画，三张餐桌只剩 y=0–57 的下半截，云南元素只在竖屏 `port-02` 顶部（扎染 50–210 × 160–195、辣椒串约 x=170–215）看得到。 |
| ② 灯光有没有 Saltline 味 | **3.4**（竖 3.6 / 横 3.2） | `port-02-entered.png` 的两盏铜吊灯（约 (272,245)、(365,245)）有清晰的锥形光柱，打在两张桌面上形成暖光池；烤炉条带（285–390 × 497–517）往台前地板投出一片橙红暖光（约 y 540–620），明暗层次成立。扣分：静帧里看不到雾的纵深；烤炉还是均匀的橙色横纹（`land-02` 428–627 × 278–302，均色 `#c88148`），没有炭块颗粒和火星；横屏完全看不到吊灯，`land-02` 顶栏背后只有一圈很淡的暖色光晕（约 400–600 × 0–45）。 |
| ③ HUD 是否整齐 | **3.1**（竖 3.5 / 横 2.7） | 竖屏：场景到 y=674 结束，`#bbq-stick 130×130 @(22,692)` 和 `#bbq-act 76×76 @(288,738)` 都在下方深色带里，不压任何世界物体；`port-03-patience-low.png` 两条「愤怒离店」分别在 25–152 × 182–216 和 86–212 × 221–255，错行、互不重叠，都在顶栏下沿（y=42）之下。横屏问题集中：① `#bbq-stick 112×112 @(16,262)` 盖住 `crate-pork`（约 85–125 × 268–300）和垃圾桶下半部分（约 15–55 × 252–292），摇杆中心 (72,318) 到 `crate-pork` 只有约 47px；② `land-03-patience-low.png` 里「烤五花肉拼盘」气泡的红描边在 y≈34，顶栏下沿 y=42，两者交叠约 9px，顶栏还把 t2 桌位和顾客整个盖住；③ 第 3 张订单卡（x 680–833，y≈243–283）的下沿压在装盘台台面上（台面从 y≈268 开始），约 15px；④ 竖屏两键底距不一致（摇杆 22px / 动作键 30px，中心 y 757 vs 776）。 |
| ④ 有没有明显缺陷 | **3.2**（竖 3.4 / 横 3.0） | 没看到穿模、悬空、贴图错误，控制台 0 error。确认的问题：① 横屏餐区顾客在厨房机位下基本出画，`land-03` 只在顶边露出 t1/t3 顾客的头顶（y≈0–10），t2 被顶栏盖住；② `port-02` 出生点烤炉右段被画面右缘切掉（x=389 仍是烤炉橙色 `#bc7039`），装盘台（x=4m，投影约 470px）整个在画外；③ `port-01-title.png` / `land-01-title.png` 的开始面板背后仍透出摇杆圈和动作键圈，`port-06` / `land-06` 的结算面板已经隐藏了它们，两个面板做法不一致；④ `port-03` 归零那一帧，两位顾客还坐在 t1/t2，订单卡和气泡已经消失，人身上也没有怒符号，人和单据的状态脱节。 |

| 体验维度 | 分数 | 依据 |
|---|---|---|
| 上手清晰度 | **3.5**（竖 3.6 / 横 3.3） | 首屏文字 3 秒内能读出「烤肉店经营」：`柳真真云南烤肉 / 炭火生香，小店开张。/ 取料 → 切配 → 炭烤 → 装盘 → 上菜 / 第 1 关 · 目标：3 分钟营业额 ¥180`，唯一按钮 `开 店` 居中（竖 `150×45 @(120,471)`、横 `@(347,244)`），没有歧义。开局有金色下箭头指向 `crate-pork`，按钮显示 `去料箱取料`（`port-02`、`land-02`）。结算面板字段清楚，差额算对（180−137=43）。扣分：首屏背景重度虚化，`port-01` 只认得出吊灯光锥和顶栏残影，看不出烤炉和串；三个料箱长得一样，不知道哪个是五花肉（B-094）；横屏看不到顾客本人，只能靠订单卡红框推断「快走了」（`land-03`）。 |
| 操作手感 | **3.5**（竖 3.7 / 横 3.3） | 结算按钮点下立即生效：未达标点 `再 开 一 局` → `level 1 / money 0 / timeLeft 178.6`；达标点 `进入第 2 关` → `level 2 / target 260 / timeLeft 180`；达标点 `再 开 一 局` → `level 1 / timeLeft 180`（`run-probe.json`）。动作键 76×76、首屏按钮高 45px，满足 44px 下限。扣分：横屏开局要去的第一个工位就在左拇指下面，走到料箱时手指会挡住目标（`land-08-hud.png`）；结算按钮 `150×40`（竖 `@(120,519)`、横 `@(347,292)`），低于 44px。 |
| 正反馈（爽感） | **3.1**（竖 3.3 / 横 2.8） | `port-10-results-win.png` 的达标面板有两颗金色实心星、绿字 `目标达成，进入第 2 关`，以及金色实心主按钮 `进入第 2 关`，过关这一刻成立。愤怒离店也有负反馈：竖屏两条红框「愤怒离店」，星级当帧从 3 实降到 1 实（`port-03`）。扣分：顾客在 `customers` 数组里当帧清空，没有走回门口的过程（`port-03` → `port-04` 桌边直接空了）；横屏 12 张截图里没有一帧拍到「愤怒离店」飘字，`land-04` 只剩星级变化；全程无声（B-066）。 |

### 我能做的（Capability）
- **① 首屏一屏讲清楚**：店名、口号、5 步流程、关卡目标、唯一的开店入口都在一张卡片里，卡片字号 16px。竖屏卡片约 53–337 × 303–543，横屏约 281–563 × 75–315，都居中，按钮金色实心。
- **⑥ 耐心归零真的离店，并且算分**：`setPatience` 后 `patience` 递减到 0，竖屏 2 位、横屏 3 位顾客当帧离店，`customers=[]`，`angry` 分别为 2 和 3，`money` 保持 0，订单卡数归 0。顶栏星级变化：`port-02` 开局 3 颗实心 → `port-03` / `port-04` 1 实 2 空；横屏 `land-03` 3 实 → `land-04` 1 实 2 空。
- **⑦ 结算数字与公式一致**：未达标 `¥137/¥180`，r=0.76、a=2，不满足 2 星条件「r≥0.7 且 a≤1」，给 1 星，正确（`port-06`、`land-06`）。达标 `¥245/¥180`，r=1.36、a=1，3 星要求 a=0，所以给 2 星，正确（`port-10`）。
- **⑦ 关卡推进链路真实可用**：`进入第 2 关` → `level=2, target=260, timeLeft=180, money=0`，HUD 显示「第 2 关 … 3:00」。第 2 关 0 营业额打烊，面板显示 `离目标还差 ¥260`，`营业额 ¥0 / ¥260`。
- **⑧ 横屏摇杆尺寸与贴底已落地（B-072 本机生效）**：`#bbq-stick 112×112 @(16,262)`，左 16、底 16；`#bbq-act 76×76 @(742,298)`，底 16。竖屏两键都在场景外的深色带里，不压世界物体。
- **⑩ 稳定性**：双端加 3 个探针脚本，`pageerror + console.error = 0`。

### 我看不懂的（Clarity）
1. **三个料箱哪个装什么？** `land-02-entered.png` 和 `port-02-entered.png` 台面上的 `crate-pork/mush/mix` 是三块同款竹编方块，没有食材，也没有标牌。左墙装饰架（`land-02` x 5–62 / y 105–265）反而摆着像肉、菌子、米线的东西，最显眼的「食材」并不能交互（新 → B-094）。
2. **横屏顾客在哪、急不急？** `land-03-patience-low.png` 里三位顾客只露出头顶，或被顶栏盖住。低耐心只能从订单卡和气泡的红描边看出来，人本身看不到（新 → B-093）。
3. **顶栏的星到底算什么？** 开局 `¥0` 时显示 3 颗实心星（`port-02`、`land-02`）。按 `§4` 公式，r=0 应为 1 星，说明顶栏星不是预计星级。愤怒 2 位（`port-04`）和 3 位（`land-04`）都显示 1 实 2 空，第 3 位离店在顶栏上看不出任何差别。HUD 文本只有 `第 1 关 / 营业额 / ¥0 / 时间 / 2:13 / 评级`，没有愤怒计数（新 → B-095，口径沿用 B-023/B-082）。
4. **「目标达成，进入第 2 关」是已经进了还是要点？** `port-10` 的副标题读起来像已经进了第 2 关，实际 `level` 仍是 1，要点下面的按钮才会推进（新 → B-096）。
5. **动作键图标是占位符**：`port-02` 动作键中心只有一个虚线圆圈（约 (326,767)），下面写 `去料箱取料`，图标不表达「料箱」（并入 B-094 ③）。
6. **首屏背景看不出玩什么**：`port-01-title.png` 只认得出两道吊灯光锥和顶栏残影，`land-01` 只认得出一个虚化的厨师，烤炉、串、顾客都辨认不了（沿用 B-036）。

### 让我不爽的（Friction）
1. **横屏左拇指压住第一个工位**：开局 `hint.id='crate-pork'`，金箭头（约 (105,207)）指向的料箱正好在摇杆圈里；垃圾桶也被盖住下半部分（`land-02`、`land-08`）。上轮的 130px 摇杆盖住 `(22,238)` 一带，这轮缩到 112px，只是往左下挪了，目标仍在下面（沿用 B-078）。
2. **顾客「瞬移消失」**：`port-03` 归零帧人还坐着、单据已经消失，下一张 `port-04` 桌边已经空了，没有走向门口的过程。第二条「愤怒离店」中心约 x=149，对应的 t2 顾客在约 x=258，偏了约 110px（沿用 B-069）。
3. **第 2 关打不过只能重打第 2 关**：面板只有 `再 开 一 局`，不能回第 1 关，也不能回首页（新 → B-096）。
4. **竖屏底部 170px 死色带**：y 675–843 的像素恒为 `#1c1410`，场景与按钮分层割裂；摇杆底距 22px、动作键 30px，两键不齐（沿用 B-060）。
5. **全程无声**：愤怒离店没有音效，打烊也没有（沿用 B-066）。

### 让我想继续玩的（Hook）
- **关卡推进是真的**：第 2 关目标抬到 ¥260，时长不变。「再快一点」的追求有了第二级台阶。
- **结算可信**：差额、星级、愤怒数和废料数都能与规则对账，不会让人觉得被系统坑了。
- **过关面板有仪式感**：`port-10` 两颗金星、绿色达成语、金色主按钮的配色层次清楚，想点下去看第 2 关。

### P0 阻塞（不修没法玩）
1. **公网构建持续落后，本机已修复的功能对真实用户无效（沿用 `B-081` / `B-077`，本轮复测仍未解决，不新开单）**
   - 现象：本机 dist 已是 `assets/index-nc0uBx0_.js`（`f3661c3-202611211840`），公网仍返回 `assets/index-BklOlgyL.js`（第 15 轮）。`B-072`（112px 摇杆）、`B-079` / `B-084`（飘字安全钳制）在公网都没有生效。
   - 复现步骤：`curl -s https://openfolio.uk/bbq/ | grep -o 'assets/index-[^"]*js'`，与 `ls dist/assets/index-*.js` 对比；Playwright 打开公网 URL，读 `window.__build`。
   - 截图路径：公网只拿到 1 张首屏就被高负载中断，本轮不入库；本机对照见 `e2e/review/2026-11-21T19-30Z-r19/land-08-hud.png`（摇杆 112px）。
   - **验收标准**：沿用 `B-081`。一次 deploy 后 60s 内公网 index 引用的 js 文件名等于当轮 `dist/`；公网 `window.__build` 等于最新 commit 的 build 串；公网横屏 `#bbq-stick` 宽度 `≤ 112px`；连续 2 次部署都成立。

### P1 明显缺陷
1. **横屏摇杆压住开局引导目标 `crate-pork` 和垃圾桶（沿用 `B-078`；`B-072` 缩到 112px 后仍不达标）**
   - 现象：横屏开局唯一引导目标就在摇杆圈内，拇指放上去就看不到要去的料箱。
   - 复现步骤：844×390 开店，断言 `__test.state().hint.id === 'crate-pork'`；读 `#bbq-stick` 得到 `112×112 @(16,262)`；用 `__test.worldToScreen` 取 `crate-pork` 台面中心，截图目测约 (105,284)，落在摇杆矩形内，摇杆中心 (72,318) 到它约 47px。垃圾桶（约 15–55 × 252–292）的下半部分同样在摇杆圈内。
   - 根因（规格层）：`ART-DIRECTION §1` 横屏取景按 `hudBottomPx(96)` 预留底部带，但实际摇杆上沿在 `vh − 128 = 262`，预留比实际 HUD 矮 32px，所以台面被允许落进摇杆区。
   - 截图路径：`e2e/review/2026-11-21T19-30Z-r19/land-02-entered.png`、`land-08-hud.png`（`land-03` / `land-04` 同一机位）。
   - **验收标准**：沿用 `B-078`，并补两条断言：(a) 横屏出生点和 `crate-pork` / `bin` 使用格两个机位，`#bbq-stick` 矩形与 `crate-*`、`bin` 台面屏幕投影矩形的交叠面积为 0，或摇杆中心到最近可交互台面 ≥ 70px；(b) `CAMERA.hudBottomPx ≥ stick.height + stickBottom`（即 ≥128），或文档改用 live 读数。双端各连跑 3 次。
2. **横屏 HUD 压住世界内容：顶栏盖住中桌顾客，气泡叠顶栏，订单卡压装盘台（新 → `B-093`）**
   - 现象：横屏 3 位顾客就座后，人基本在画外；t2 顾客和桌位被顶栏整个盖住；「烤五花肉拼盘」气泡与顶栏交叠约 9px；第 3 张订单卡下沿压在装盘台台面上约 15px。
   - 复现步骤：844×390 开店，`__test.spawnNow` 让 t1/t2/t3 坐满（不超过 `maxDiners`），玩家留在出生点。读 `#bbq-hud .topbar` rect（像素实测下沿 y=42），读 `#bbq-bubbles .bubble` 中 t2 的 rect（红描边上沿 y≈34），读 `#bbq-orders .card[data-table=t3]` rect（约 x 680–833，y 243–283），读 `__test.worldToScreen('plate')` 的台面上沿（约 y 268）。
   - 截图路径：`e2e/review/2026-11-21T19-30Z-r19/land-03-patience-low.png`（对照 `land-02-entered.png` 的空场）。
   - **验收标准**：见 `B-093`。所有 `.bubble`、`.order-num` 与顶栏交叠面积为 0；`.card` 与 `crate-*` / `grill` / `plate` 台面投影交叠面积为 0；每位就座顾客要么头部投影在 `[topbarBottom+4, vh]` 内，要么对应订单卡存在 `[data-mood]` 情绪态；连跑 3 次。
3. **耐心归零后「人直接没了」，横屏没截到离店飘字（沿用 `B-039` / `B-069` / `B-085`，不新开单）**
   - 现象：数值链路对（`angry` 和星级当帧变化）。但画面上归零帧人还坐着、身上没有怒符号，下一帧桌边已空；离店飘字离对应顾客约 110px；横屏 `land-04` 只剩星级变化。
   - 复现步骤：任一端开店，等 t1/t2 就座，`__test.setPatience` 把所有顾客设到 1.0s，推进 1.5s 游戏时间。逐帧读 `customers[*].phase` 和坐标：`leaving-angry` 阶段时长实测为 0（数组当帧清空）；读 `#bbq-popups .popup` rect，与 t2 顾客投影的水平距离约 110px。
   - 截图路径：`e2e/review/2026-11-21T19-30Z-r19/port-03-patience-low.png`、`port-04-after-zero.png`、`land-03-patience-low.png`、`land-04-after-zero.png`。
   - **验收标准**：沿用 `B-069`：`leaving-angry` 阶段持续 ≥1.2s，`customers[i].z` 单调递减 ≥1.0m，飘字到顾客投影 ≤80px。沿用 `B-039`：`angry` 递增当帧，顾客头顶存在 ≥24px 红色怒符号节点。沿用 `B-085`：横屏 `angry` 递增后 0.5s 内至少有 1 条完整可见的 `.popup`。双端连跑 3 次。
4. **三个料箱外观相同，玩家分不出五花肉 / 菌子 / 米线（新 → `B-094`）**
   - 现象：台面上三个料箱是同款竹编方块，看不到食材；左墙装饰架反而摆着食材，容易被误认成料箱。
   - 复现步骤：任一端开店，在出生点截帧，对 `crate-pork/mush/mix` 台面中心各取 36×28 像素均色。`land-02` 实测为 `#947549 / #cba364 / #cca567`，mush 与 mix 的 RGB 差小于 5。
   - 截图路径：`e2e/review/2026-11-21T19-30Z-r19/land-02-entered.png`、`port-02-entered.png`；对照 `docs/reference/oc1.jpg` 左列印图标的料箱。
   - **验收标准**：见 `B-094`。三箱顶面采样均色两两 RGB 欧氏距离 ≥ 40；站 `crate-mush` 使用格时 `#bbq-act` 文本含「菌子」；vision 只看开局截图能说出三个箱各装什么；双端连跑 3 次。

### P2 打磨项
1. **顶栏没有愤怒计数，星级口径不明（新 → `B-095`）**：愤怒 2 位与 3 位顶栏都是 1 实 2 空（`port-04` vs `land-04`）；开局 `¥0` 却显示 3 颗实心星（`port-02`）。
2. **结算面板关卡出口不全，文案先于行为（新 → `B-096`）**：第 2 关失败只能 `再 开 一 局`，不能回第 1 关或首页。达标副标题「进入第 2 关」先于点击出现。未达标时唯一按钮是描边次级样式（`port-06` 约 120–270 × 519–559，`land-06` 约 347–497 × 292–332），与 `B-040` ①「提为金色实心主按钮」不符。
3. **按钮高度与字距（沿用 `B-071`）**：结算按钮 `150×40` 低于 44px；`开 店`、`再 开 一 局` 仍靠全角空格撑字距（`port-01`、`port-06`）。
4. **开始面板背后露出摇杆和动作键（沿用 `B-070` / `B-056`）**：`port-01` 底部可见摇杆圈（约 22–152 × 692–822）和动作键圈（约 288–364 × 738–814）；`land-01` 可见摇杆圈（约 20–125 × 265–370）和动作键圈（约 745–815 × 300–370）。结算面板已经隐藏了这两个控件，两边实现不一致。
5. **首屏背景过度虚化，看不出玩法（沿用 `B-036`）**：`port-01` 只剩光锥和顶栏残影。首屏字体是系统栈 `-apple-system, BlinkMacSystemFont, "Ping…`，标题「柳真真云南烤肉」没有品牌字形。`ART-DIRECTION §5` 没有规定字体，建议补一条（不单独开单）。
6. **未达标没有失分归因（沿用 `B-083`）**：`port-06` 只有「离目标还差 ¥43」，愤怒 2 位、废料 3 份和差额之间的关系没有提示。
7. **竖屏底部 170px 死色带，两键底距不一致（沿用 `B-060`）**：y 675–843 恒为 `#1c1410`；摇杆底距 22px、动作键 30px。
8. **竖屏出生点烤炉被切、装盘台出画（沿用 `B-090`）**：`port-02` 烤炉延伸到 x=389 被截断；`plate`（x=4m）投影约 470px，在视口外。
9. **竖屏低耐心预警态待复核（`B-069`）**：`port-03` 的 HUD 时钟是 2:32，而数据采样时（顾客 `patience=1.0`）是 2:34，截到的已经是归零帧，红框订单卡没拍到。横屏 `land-03` 拍到了红描边卡片和气泡。下轮需要在 `patience ∈ [1,3]s` 区间截帧。
10. **达标面板行距偏紧**：`port-10` 中「废料 0 份」的分隔线（约 y 483）与「进入第 2 关」按钮上沿（约 y 487）只隔约 4px，主按钮像贴在表格上。建议 ≥12px（并入 `B-096`）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN §1`「顾客耐心归零 → 愤怒离店（满意度 -1）」**：数值达标（`angry` 递增、`customers` 清空、星级下降）。「满意度」这个字段在 HUD 和结算里都没有出现，结算写的是「愤怒离店 N 位」（沿用 `B-074`）。
- **`GAME-DESIGN §7`「愤怒离店：顾客头顶红怒符号 0.6s，路径回门」**：未达标。`port-03` 顾客身上没有怒符号，`customers` 当帧清空，没有走回门口的路径（`B-039` / `B-069`）。
- **`GAME-DESIGN §4` 星级公式**：达标。未达标面板 r=0.76、a=2 给 1 星；达标面板 r=1.36、a=1 给 2 星。两张面板都与公式一致。
- **`GAME-DESIGN §4`「结算面板展示：星级 / 营业额(+目标) / 服务顾客数 / 满意度 / 废料数」**：部分达标。「满意度」被「愤怒离店 N 位」替代，文档没有同步（`B-074`）。
- **`GAME-DESIGN §3`「M1 仅 1 关，结算面板预留"下一关"按钮」**：文档漂移。实现已有第 2 关（¥260 / 180s），推进链路本轮验证可用；文档仍写「仅 1 关」（`B-074`）。
- **`GAME-DESIGN §3`「达标 → 解锁下一关…进度写 localStorage `bbq.level`」**：本轮没有验证刷新后首屏能否「继续 · 第 2 关」（`B-057`）。
- **`GAME-DESIGN §6`「左下虚拟摇杆 r=56px」「右下单一大按钮 ⌀72px」**：横屏摇杆 112px 达标；竖屏摇杆 130px，与 `ART-DIRECTION §1`「竖屏 128px」差 2px；动作键双端 76px，与 ⌀72 差 4px。建议文档与实现统一一个数。
- **`ART-DIRECTION §1`「横屏摇杆 112px，底距 max(16px, safe-area)，左 16px；动作键同步贴底距」**：达标。摇杆 `@(16,262)`，底边 374；动作键底边 374。
- **`ART-DIRECTION §1` 横屏 lens 用 `hudBottomPx(96)+hudMarginPx(2)` 推 `lookAheadZ`**：参数与实际 HUD 不一致。摇杆上沿在 `vh−128`，台面因此被允许落进摇杆区，`crate-pork` 被盖（P1-1，`B-078`）。
- **`ART-DIRECTION §1`「工作站必须完整可见…竖屏在各站点使用格成立」**：竖屏出生点 `plate` 在画外、烤炉右段被切（`port-02`）。条款只要求竖屏在使用格成立，出生点不算违规，但会影响开局读图（`B-090`）。
- **`ART-DIRECTION §2`「餐区在屏幕上半（远）」**：横屏未达标，餐区几乎整个出画（`land-03`，`B-093`）。
- **`ART-DIRECTION §2`「高饱和暖色只给：食材/炭火/围裙…」与食材色板 `#e8907c / #a97b4f / #e8c96a`**：未达标。料箱上看不到食材，三箱均色都在竹编棕范围（`#947549 / #cba364 / #cca567`），食材色板在开局画面里完全缺席（`B-094`）。
- **`ART-DIRECTION §3`「吊灯 3 盏 + 体积光锥」「雾 FogExp2」**：竖屏 `port-02` 可见 2 盏带光锥，第 3 盏在画外；横屏完全看不到吊灯；静帧里看不到雾的纵深。
- **`ART-DIRECTION §5`「按钮图标用内联 SVG」**：动作键图标是虚线圆圈占位，不表达动作对象（`port-02`，并入 `B-094`）。
- **`ART-DIRECTION §5`「字号：HUD ≥13px」**：首屏卡片 16px 达标；本轮没有对 HUD 叶子节点做 DOM 遍历，沿用 `B-061`。
