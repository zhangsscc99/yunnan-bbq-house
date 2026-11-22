# 产品走查报告 — 柳真真云南烤肉

> 只写文档，不改代码。每轮 3–4 个剧本步骤深挖，轮转覆盖 ①–⑩。
> 截图目录：`e2e/review/<UTC>-live/`（竖屏 `port-*` 390×844、横屏 `land-*` 844×390，含 `run-*.json` 原始测量）。


## 2026-11-22 14:45Z 第 39 轮
综合评分：3.4/5（比上轮 3.2 +0.2）

> 本轮实测构建为线上 `https://openfolio.uk/bbq/` 部署包 `assets/index-DWwGaBS0.js`（实测 `window.__build = "948f569-202611221511"`），覆盖竖屏 `390×844`、横屏 `844×390` 全流程探针（`run-port.json` / `run-land.json`）及双炉焦糊专测（`burnt-port.json` / `burnt-land.json`），四次独立运行 `console.error / pageerror / requestfailed` 合计 **0**（仅余 2 条既有 Three.js 弃用 warning），渲染开销竖屏 `calls 75 / tris 10,598 / programs 13`、横屏 `calls 72 / tris 11,280 / programs 12`。上轮长期卡死的 **v2 核心玩法 P0（`B-160` / `B-161`）已正式上线并跑通闭环**，本轮转入 v2 自身体验与横竖屏 HUD 深度排查。

### 我能做的（Capability）
- **v2 三步出餐闭环与自助制经济上线跑通**：首屏准确展示 `窗口取菜 → 桌边烤 → 盛盘` 与自助制 `限时 5 分钟（模拟 90 分钟）· 入场 ¥79.9×3位 = ¥239.7 · 目标 6 位`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-01-title.png`）；开局入账 `¥239.7`，后台自动备菜 `3s` 自动出窗（`pass: 1`，卡片切 `ready / 已出窗 · 去窗口取`），点击窗口托盘（`114.7×54` / `264.7×54`）进入手持态，点击目标桌卡（`58×46`）启动桌边 `8s` 烤制（`grillT: 0.15 → 2.15 raw → 5.65 perfect`），完美窗盛盘准确入账 `+¥4` 小费（`money: 239.7 → 243.7`、`served: 1`、`翻台 0.33×`），转 `已盛盘 · 用餐中`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-02-pass.png`–`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-06-served.png`）。
- **双炉并行、焦糊严格单次扣分与手持互斥均验证有效**：焦糊专测（`burnt-port.json` / `burnt-land.json`）证实 1 号桌（五花肉）与 2 号桌（烤菌子）可同时桌边开烤；2 号桌于 `grillT = 5.75`（`perfect`）盛盘拿 `+¥4` 小费（`money: 243.7, served: 1`），1 号桌故意过 `8s` 焦糊后 `afterBurnt` 与驻留后的 `linger` 读数完全一致（双端均为 `money: 243.7` 不扣钱、`waste: 1`、`angry: 0`、`burntHandled: true`、满意度 `100% → 82%`），确认焦糊只扣一次、无重复扣分（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-13-serve2.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-11-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-12-burnt-linger.png`）；手持 3 号桌菜时，窗口内 2 号桌槽位明确锁死为 `手上有菜`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-07-burnt.png`）。
- **3D 桌边烤盘实体、NPC 出菜窗口、自动走位与重玩重置成立**：4 张餐桌全部嵌入 3D 烤盘网格、厨房区改为带后台 NPC 的「出菜窗口」，柳真真自动往返窗口与餐桌并端着生肉托盘铺盘（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-04-grill-raw.png`）；备菜期连点 `4–5` 次状态零错乱（`rapid` 均保持 `ordering / pass: 0 / carrying: false`）；结算点「再开一局」瞬时切回 `phase: "playing" / money: 239.7 / timeLeft: 300`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-10-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-10-results.png`）。

### 我看不懂的（Clarity）
1. **打烊结算里明明有 2 位顾客久等气跑、满意度跌到 `40%`，为什么「提前离店」写着 `0 位`？**：`run-port.json` 中 `afterAngry` 实测 `angry: 2`（顾客 1、3 均 `patience: 0 / phase: "leaving-angry"`），`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-08-angry.png` 连续弹出 `久等离店 · 满意度-20` ×2 与 `久等了 · 满意度-10`，顶栏满意度掉至 `40%`；但 `/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-10-results.png` 结算账单仍写着 **`提前离店 / 焦糊: 0 位 / 0 份`**，让玩家完全看不懂 60% 满意度到底扣在了哪。
2. **新手引导箭头喊着「点这里上桌烤」「火候正好，点盛盘！」，为什么箭头却直指空着的出菜窗口、甚至指着 3 号桌的托盘？**：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-03-carrying.png`、`port-04-grill-raw.png`、`port-05-perfect.png` 与 `land-03/04/05` 中，引导气泡始终停留在 `#bbq-pass` 上方；尤其在 `port-05-perfect.png`，1 号桌正处于盛盘完美窗，气泡写「火候正好，点盛盘！」箭头却戳向窗口里的 `3号桌 五花肉 点取菜`，会直接把新手带偏去取别的菜。
3. **进入金色「完美窗」时，火候进度条里的彩色填充条去哪了？**：生串期（`port-04-grill-raw.png`）有亮橙填充条、快焦期（`port-13-serve2.png`）有橙红填充条，但一进最关键的 `perfect` 窗（`grillT = 5.65`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-05-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-05-perfect.png`），进度条左侧突然变成近黑空槽，只能看到 5s 刻度白线与微弱底色，完全看不出当前火候离 7s 过火线还有多远。
4. **手持状态栏右边的金色胶囊（`点 1 号卡上桌` / `点窗口取菜` / `点金色卡盛盘`）长得像主按钮，到底能不能点？** 加上右上 3D 黑板还写着 `¥48 / ¥32 / ¥26`，店里有 4 张桌（实测坐到 4 号桌）而账单写 `3 座`，这些细节都在制造认知噪音（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-02-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-09-rapid.png`）。

### 让我不爽的（Friction）
1. **横屏（844×390）下 HUD 简直把 3D 烤肉店“吃掉”了，飘字还被顶栏活活压住**：底部「出菜窗口 `824×91` + 手持栏 + 订单卡」三层垂直堆叠占去 `y≈148..385`（**约 61% 屏高**），加上顶部双层状态栏（`y≈6..74`），整个 3D 餐厅只剩中间一条约 74px（19%）的缝——3D 出菜窗口被完全遮死、柳真真被腰斩、上排三桌被顶边裁半；更糟的是第二层顶栏直接叠压盖住了 `上菜成功 +¥4小费`、`焦糊作废 · 满意度-18` 飘字主体和 2 号桌顾客（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-02-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-07-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-13-serve2.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-11-burnt.png`）。
2. **烤焦一次就直接把还有 31 秒耐心的顾客赶走清桌，没有任何补救余地**：`burnt-port.json` 中 1 号客焦糊时剩余耐心仍有 `31.53`（横屏 `31.42`），却当场转 `leaving-angry` 并触发 `清桌 1s`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-11-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-11-burnt.png`），直接损失一个宝贵的客数名额（目标 6 位），与 `GAME-DESIGN.md §4`「1.2s 后该桌回『重烤』可救」的容错设计相悖。
3. **竖屏 3 客同屏时底部卡片贴边侵入系统手势区，且已完成的 `用餐中` 卡片不沉底**：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-07-burnt.png` 中 1 号卡已 `用餐中` 却占着左上首槽，把手上正端着菜、最急需点的 3 号卡 `上桌烤` 挤到第 2 行，卡片底边落于 `y≈832`（距底仅 `12px`，落入 iOS 34px Home Indicator 误触带）；同时 `备菜中` 蓝色圆环压过文字、双端 16 处文字过小（`dom.tinyText`），长时间单手盯看偏累。

### 让我想继续玩的（Hook）
- **v2 的「窗口取菜 → 走位铺肉 → 多桌并行盯火候 → 完美盛盘」节奏骨架已经立起来了**：看到 NPC 在窗口后默默备菜、柳真真端着托盘穿梭到桌边铺上烤盘、两桌并烤一桌抢在金色窗盛盘拿 `+¥4`、一桌飙红提醒 `快焦了 · 立刻起`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-13-serve2.png`），配合 `75 calls` 极轻渲染与云南暖光木屋氛围，单手多线程控火的乐趣终于从纸面落到了真机画面上。只要修好完美窗进度条隐身、结算离店账目、引导锚点、焦糊可补烤与横屏 HUD 压缩，就能稳步迈向 4 分档。

### P0 阻塞（不修没法玩）
- **本轮无 P0 阻塞**（上轮 P0 `B-160` / `B-161` v2 主循环与出菜窗口已上线，`948f569-202611221511` 双端全程 `0` JS error，竖屏主平台三击出餐、单手互斥、双炉并行、焦糊单次扣分与结算重玩均可完整跑通）。

### P1 明显缺陷
1) **横屏（844×390）底部三层 HUD 叠堆侵占约 61% 屏高且第二层顶栏压死飘字与 2 号桌顾客（新增 `B-173`，并联动沿用竖屏安全区 `B-167`）**
   - 现象：横屏 `844×390` 下 `#bbq-pass`（`824×91`）+ 手持状态栏 + `#bbq-orders` 纵向堆叠占据 `y≈148..385`（约 237px / 61% 视口高），与顶部双栏（`y≈6..74`）夹击后仅剩中部 ~74px（19%）3D 可视带，3D 出菜窗口被彻底盖死、柳真真与 4 号桌被截断；同时第二层顶栏（`自助 ¥79.9×3位 · 客数…`）直接覆盖 `上菜成功 +¥4小费`、`焦糊作废 · 满意度-18` 飘字主体与 2 号桌顾客/气泡。另竖屏 `390×844` 下第 2 行订单卡底边落于 `y≈832`（距底 12px < iOS 34px 安全区，`B-167`）。
   - 复现步骤：在 `844×390` 打开 `https://openfolio.uk/bbq/` 开店，等待顾客备菜出窗并完成取菜→桌边烤→盛盘（或触发焦糊），分别读取 `#bbq-pass`、`#bbq-orders`、第二层顶栏与 `#bbq-popups .popup` 的 `getBoundingClientRect()`；在 `390×844` 令 3 客同时在店并读取底部 `.card` 的 `bottom`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-02-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-07-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-13-serve2.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-11-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-07-burnt.png`
   - 验收标准（对应 `B-173` & `B-167`）：(a) 横屏 `844×390` 底部交互区（窗口+订单卡，合并手持提示）总占高 `<= 38%` 视口高（`<= 148px`）或采用左右分栏并排布局，3D 出菜窗口台面与 1–4 号桌主体可见不被底部 DOM 面板覆盖；(b) 双端所有可见 `#bbq-popups .popup` 与顶栏两行容器的矩形交叠面积严格 `=== 0`；(c) 竖屏 `390×844` 渲染 1–4 张订单卡时全部 `.card` 满足 `rect.bottom <= innerHeight - 34`（保留 `>= 34px` 底部安全区）；(d) 双端连跑 3 次 `0` JS error。

2) **打烊结算「提前离店」计数与局内实际失客数断链（`angry = 2` 时仍显示 `0 位`）（新增 `B-174`）**
   - 现象：`run-port.json` 实测 `afterAngry` 有 2 位顾客耐心归零进入 `leaving-angry`（`angry: 2`，满意度由 `100%` 跌至 `40%`，画面弹出两次 `久等离店 · 满意度-20`），但同一局随后进入 `results` 态，打烊结算面板 `提前离店 / 焦糊` 却显示 **`0 位 / 0 份`**（与 `满意度 40%` 自相矛盾）；`run-land.json` 中 2 号客因焦糊转 `leaving-angry` 离店后结算同样显示 `提前离店 0 位`。
   - 复现步骤：在 `390×844` 正常开店服务 1 位顾客后，令剩余 2 位在座顾客耐心耗尽至 `0` 触发 `leaving-angry`（验证 `state().angry === 2`、满意度 `40%`），再推进倒计时归零进入 `results` 态，读取结算面板 `提前离店 / 焦糊` 行文本。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-08-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-10-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-10-results.png`
   - 验收标准（对应 `B-174`）：双端冻结时钟下令 `k` 位顾客（测试 `k = 1` 与 `k = 2`）耐心归零离店（`state().angry === k`）并结算，断言结算面板文本严格包含 `${k} 位`（正则 `/提前离店[\s\S]*${k}\s*位/`），与 `state().angry` 恒等，且仅当 `state().angry === 0` 时才显示 `0 位`；双端连跑 3 次 `0` JS error。

3) **桌边烤进入 `perfect` 金色完美窗时火候条进度填充消失/不可见（新增 `B-175`）**
   - 现象：订单卡 8s 火候条在 `raw`（`grillT = 2.15`）与 `over`（`grillT > 7s`）阶段均可清晰看到橙/橙红填充条推进，但一旦进入最核心的 `perfect` 窗口（`grillT = 5.65`，`cookWindow = "perfect"`），进条填充色变为透明或与深色底槽同色，轨道左侧 `0–5s` 呈现纯黑空槽，玩家无法直观看到火候在 `5–7s` 黄金区内的实时推进位置。
   - 复现步骤：双端取菜上桌烤，冻结时钟推进至 `grillT = 2.15s`（`raw`）、`5.65s`（`perfect`）、`7.3s`（`over`），读取订单卡火候条填充元素的计算样式（`width`、`backgroundColor` / `backgroundImage`、`opacity`）并对比截图像素。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-04-grill-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-05-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-05-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-13-serve2.png`
   - 验收标准（对应 `B-175`）：双端冻结时钟推进至 `grillT = 5.65s`（`cookWindow === 'perfect'`）时断言：(a) 火候条填充 DOM 节点可见、`opacity >= 0.9`、宽度比例位于 `65%–76%`（对应 `5.65/8 ≈ 70.6%`）；(b) 其计算背景色为高对比亮金色（非透明、与底槽背景色 RGB 欧氏距离 `>= 120`）；(c) `raw` / `perfect` / `over` 三态填充色互不相同且全程单调推进；双端连跑 3 次 `0` JS error。

4) **v2 新手引导气泡 `[data-onboard-tip]` 写死在出菜窗口上方，端菜与盛盘阶段指错操作控件（新增 `B-176`）**
   - 现象：点取菜后进入手持态，`点这里上桌烤` 气泡仍浮在 `#bbq-pass` 上方、箭头直指空位槽；进入完美窗后，`火候正好，点盛盘！` 气泡箭头甚至直指窗口内新出窗的 `3号桌 五花肉 · 点取菜` 托盘，与实际应点击的 1 号桌卡片 `盛盘` 按钮位置南辕北辙。
   - 复现步骤：双端开店走完首单「出窗 → 取菜 → 烤制中 → 完美窗盛盘」四步，同时令另一桌出窗进入槽 1，检查每一步 `[data-onboard-tip]` 底部中心与当前唯一推荐操作按钮（窗口托盘或目标 `.card-btn`）的屏幕几何距离。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-04-grill-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-05-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-05-perfect.png`
   - 验收标准（对应 `B-176`）：双端首单三步中，读取 `[data-onboard-tip]` 与当步目标按钮（取菜=窗口托盘，上桌烤/盛盘=目标桌 `.card[data-table] .card-btn`）的 `getBoundingClientRect()`，断言：(a) 气泡水平中心落在目标按钮水平区间 ±40px 内，且垂直间距 `Math.abs(target.top - tip.bottom) <= 28px`（绝不跨越 `#bbq-pass` 指错槽位）；(b) 气泡不溢出视口且不压住目标按钮本身（交叠面积 `=== 0`）；(c) 完成首单盛盘（`served === 1`）后同帧销毁；双端连跑 3 次 `0` JS error。

5) **焦糊当帧直接赶走高耐心顾客并清桌，缺少 `GAME-DESIGN §4` 规定的重烤/重做补救机制（沿用 `B-156` / `B-164`，补充 v2 专测实证）**
   - 现象：`burnt-port.json` 与 `burnt-land.json` 中 1 号桌烤过 `8s` 焦糊后，`waste` 正确只加一次（`0→1`）、`money` 保持 `243.7`、`angry` 保持 `0`、满意度扣 `-18%`，但剩余耐心仍高达 `31.53`（横屏 `31.42`）的 1 号客当场被设为 `phase: "leaving-angry"` 并立即清桌（`清桌 1s`，订单卡移除），违背 `GAME-DESIGN.md §4`「焦糊只计废料 +1，不计愤怒离店，1.2s 后该桌回『重烤』可救」及 `B-156` 明确要求的 v2 规则继承。
   - 复现步骤：双炉上菜后让 1 号桌烤满 `8s` 触发焦糊，分别在焦糊当帧与驻留 `1.5s` 后读取 `state().waste`、`state().angry`、1 号客 `phase/patience` 及 1 号桌订单卡状态。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-11-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-12-burnt-linger.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-11-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-12-burnt-linger.png`
   - 验收标准（沿用 `B-156` / `B-164`）：双端冻结时钟下令 1 号桌（顾客耐心 `> 20s`）过 `8s` 焦糊，断言：(a) 当帧与驻留 `1.5s` 后均保持 `waste === 1`、`angry === 0`、`money` 不变、满意度仅扣一次；(b) 顾客保持 `phase === 'seated'`（不转 `leaving-angry`、不触发 `清桌`），焦糊态驻留 `1.2s` 后该桌自动回退重备/重烤流程并可再次成功盛盘（`served +1`）；(c) 双端连跑 3 次 `0` JS error。

6) **双端 HUD 存在 16 处超小字违背 `ART-DIRECTION §5`（`≥13px`），`备菜中` 进度环压字且手持栏右侧胶囊伪装成按钮（新增 `B-177`，接续 `B-008`）**
   - 现象：`run-port.json` 与 `run-land.json` 的 `dom.tinyText` 均检出 **16 处**小于基线的文本（`营业额`、`时间`、`评级`、`0/3`、`后台自动备菜中`、`空位×3`、`自动备菜`、`¥79.9×3位`、`0/6`、`0.00×`、`100%` 等）；`ordering` 态卡片内蓝色备菜进度圆环直接压在 `备菜中` 汉字上降低可读性；手持状态条右侧金边胶囊（`点窗口取菜`、`点 1 号卡上桌`、`点金色卡盛盘`）视觉与主按钮一致却不可点击，易误导玩家反复点按无反馈。
   - 复现步骤：双端开店进入备菜、出窗、手持、烤制四态，扫描 HUD 所有可见文本节点计算字号，并检查 `ordering` 态按钮内 `.prep-ring` 与文字位置以及手持栏右侧标签是否可交互。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-02-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-03-carrying.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-04-grill-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/port-09-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T14-45Z-r39/land-09-rapid.png`
   - 验收标准（对应 `B-177`）：双端扫描顶栏、出菜窗口、手持栏与订单卡所有可见文本，断言：(a) `dom.tinyText.length === 0`（正文/数字 `>= 13px`，次级标签 `>= 12px` 且顶栏不换行不溢出）；(b) `ordering` 态备菜环与按钮内文字零重叠（环置于外圈或独立图标位，文字清晰完整）；(c) 手持栏右侧非交互提示去除实心/描边按钮胶囊样式（或改为真实快捷操作按钮并纳入可点击验收）；(d) 双端连跑 3 次 `0` JS error。

### P2 打磨项
1) **3D 桌边烤盘缺炭火暖光、烤串缺生→熟→焦视觉色阶与烟效（沿用 `B-027` / `B-097`）**：4 张餐桌已嵌入烤盘并可见生肉（`port-04-grill-raw.png`），但烤盘缺少炭火暖红发光（`#ff8a3c` / `#ff5a1e`），`raw → perfect` 无明显金黄变色与热烟，`burnt` 帧炉面直接清空无焦黑/灰烟表现（`port-05-perfect.png`、`port-11-burnt.png`）。
2) **世界气泡缺可见桌号与桌色绑定、飘字叠压气泡、`用餐中` 卡片不沉底（沿用 `B-170` / `B-154` / `B-151`）**：世界气泡无可见桌号且外环全为固定 `#f0c060`（`port-07-burnt.png`）；`上菜成功 +¥4小费` 与 `焦糊作废 · 满意度-18` 飘字直接遮盖餐桌气泡（`port-06-served.png`、`port-13-serve2.png`、`port-11-burnt.png`、`land-06-served.png`）；已完成 `用餐中` 的 1 号卡滞留首槽不沉底，把待操作 3 号卡挤至底行（`port-07-burnt.png`）。
3) **场景边角穿帮、黑板旧菜价与自助制/座位数口径微差及工程债（沿用 `B-016` / `B-135` / `B-006` / `B-162`）**：竖屏左上绿檐仍露斜切杂块、扎染布幔被硬截断、1 号客与 3 号桌被屏边裁切（`port-02-pass.png`、`port-07-burnt.png`）；3D 黑板仍写旧价 `¥48/¥32/¥26` 与自助制 `菜价 ¥0` 冲突；店面有 4 张桌（`port-09-rapid.png` 实测使用 4 号桌）而账单标 `3 座`；控制台仍留 2 条 Three.js 弃用 warning（`THREE.Clock` / `PCFSoftShadowMap`）；`GAME-DESIGN.md` `§2.0` 的 17 道菜菜单尚未扩充且文档旧条款仍待同步。

### 与本轮 SPEC 的差距（引用 `GAME-DESIGN.md` / `ART-DIRECTION.md` 具体条款）
- **`GAME-DESIGN.md §0 / §1`（v2 三步玩法链，最高优先）**：
  - **已达成**：顾客自助点单 → 后台自动备菜 `3s` → 3 槽「出菜窗口」→ 单手持物互斥取菜 → 4 桌自带炭炉 `8s` 桌边烤 → 完美窗盛盘 → 吃完清桌 `2s`（`清桌 1s`）已全部落地，彻底移除旧切配台/装盘台/料箱走动/垃圾桶交互。
  - **仍存差距**：① 新手引导气泡在端菜与盛盘期指错控件（`B-176`），`perfect` 完美窗火候条填充消失（`B-175`），削弱「时机与优先级」核心可读性；② 窗口满 3 份暂停后台备菜压力本轮探针未打满 `3/3`（最高 `pass: 2`），仍需按 `G-02` 专项断言满槽冻结计时。
- **`GAME-DESIGN.md §2.0 / §4`（自助制商业模式与评分/焦糊容错）**：
  - **已达成**：开局统一收 `¥79.9×3位 = ¥239.7`、5 分钟局时（模拟 90 分钟）、菜价 `¥0`、完美窗给小费 `+¥4`、焦糊不扣钱仅扣满意度 `-18` 且只扣一次（`burnt-port.json` / `burnt-land.json`）。
  - **仍存差距**：① `§4` 规定焦糊仅计废料 +1、不赶客且 `1.2s` 后可重烤，现行实现直接将 `patience = 31.53` 的顾客转 `leaving-angry` 清桌（`B-156` / `B-164`）；② 打烊结算「提前离店」在 `angry = 2` 时误显 `0 位`（`B-174`）；③ `§2.0` 规划的 17 道菜菜单目前仅 3 道且 3D 黑板仍标旧菜价，文档 `§1/§2/§3/§5/§6/§7` 旧条款仍与 `§2.0` 自相矛盾（`B-162`）。
- **`ART-DIRECTION.md §1 / §3 / §4 / §5`（构图、Saltline 灯光、性能预算与 UI 皮肤）**：
  - **已达成**：`§4` 预算优秀（`72–75 calls <= 120`、`10.6k–11.3k tris <= 150k`）；暖黑金边面板、吊灯暖光池与木地板湿反在线。
  - **仍存差距**：① `§5` 明确规定 `HUD ≥ 13px`、横屏不降级、不重叠不挡操作，现行横屏底部 HUD 占去 ~61% 屏高且双层顶栏压死飘字与 2 号桌（`B-173`），双端各有 16 处 `tinyText`（`B-177`），竖屏第 2 行卡侵入底部 34px 安全区（`B-167`）；② `§3` 炭火 `1800K #ff8a3c` 点光/炭块自发光与烤串熟焦烟效在 4 张桌边烤盘上尚未体现（`B-027` / `B-097`）；③ `§1` 竖屏顶檐杂块、扎染布幔截断与左右桌位裁切仍未收敛（`B-016` / `B-135`）。

## 2026-11-22 13:00Z 第 38 轮（规格实现轮 · G-01）

综合评分：不重评（本轮只做 `SPEC-BACKLOG-V2` G-01 的机器验收，不改代码）

> 本轮对象：本机 `:3035` 与网关 `:80/bbq/`，部署包 `assets/index-BurmCeOO.js`（main `c09d56f`）。
> 部署前线上是 `index-zczXh931.js`（v2 逻辑已在，但非 main HEAD 构建）；本轮已重新 `ci-deploy.sh`，`3035`/网关均 200 且同为 `BurmCeOO`。

### G-01 顾客自助点单（玩家零操作）→ 通过
- 断言实测（`e2e/verify-g01.mjs`，390×844，冻结时钟逐帧 0.05s）：顾客在模拟 `4.65s` / `6.65s` 入座，**入座当帧**该桌 `.card[data-table]` 已存在（延迟 0ms ≤300ms），入座后 300ms 窗口 6/6 帧卡片均在。
- 卡片 `data-order-state=ordering`，文案「后台备菜 · 3s」+ 按钮「备菜中」，`.prep-ring` `display:block`，备菜环形 `stroke-dashoffset` `78.53→40.84`、`prepT 0.917→1.917`（+1.0s），进度确实在走。
- 零操作：卡片整体 + `.card-btn` 各连点 3 次后 `orderState` 仍 `ordering`、`clickCount 0→0`、`money 0→0`、`pass 0`、`carrying false`、`prepT` 未被重置、顾客耐心 `98.08` 不降。
- 双端（本机 preview + `:3035`）各跑一遍：`console error 0` / `failed request 0`。
- 证据截图：`/www/yunnan-bbq-house/e2e/shots/g01-ordering-390x844.png`（备菜中环形进度）、`/www/yunnan-bbq-house/e2e/shots/g01-pass-ready-390x844.png`（3 份出窗 + 卡片 ready）。
- 性能实测（同一帧读数）：`renderer.info.render.calls = 156`、`triangles = 15,852`（G-01 属既有能力，本轮无新增开销）。

### 本轮发现（留给后续 G 条目）
1) **出菜窗口会一次堆到 3 份而卡片仍全在 ordering**：截图 `g01-pass-ready` 里同时 3 份出窗，说明同时入座的多桌会集中备好；`G-02`（窗口容量 3 / 第 4 份暂停）必须验证「堆满后后台计时是否真停」，这是 v2 唯一的压力来源，别只测 UI。
2) **备菜 ring 与耐心 ring 在小卡上都是圆环**（`g01-ordering` 里左侧金环 + 按钮蓝环并存），两圈语义不同但形态近似，`G-08` 做六态可辨时应顺手确认不会误读。
3) 线上包刚与 main HEAD 拉齐，`G-02…G-10` 的后续验收都应固定在 `index-BurmCeOO.js` 这个构建上，避免又出现「测的包不是线上包」。

## 2026-11-22 12:10Z 第 37 轮
综合评分：3.2/5（比上轮 -0.1）

> 本轮评测对象为本机 `:3035` 与公网 `openfolio.uk/bbq/` 同包构建 `assets/index-BsdaUpmb.js`（`window.__build = 5c45b93-202611221108`），双端（竖屏 `390×844` / 横屏 `844×390`）冻结时钟实跑 `console.error + pageerror + requestfailed` 合计 **0**（两端各 0），但线上仍运行已废止的 v1 两步循环且 `lane/gameplay-v2` 截至 `12:10Z` 仅有一个 `wip(snapshot)` 提交、无任何功能实现。

| 维度 | 分数 | 证据（截图文件名 + 实测数字） |
|---|---|---|
| ① 像不像胡闹厨房 | 3.0/5 | 正交俯视木地板拼缝、L 形模块台面、高饱和五花肉/菌子/米线实物料箱及斗方挂牌、Q 版白帽朱红围裙店员与竹凳方桌底座仍在（`port-02-orders.png`、`land-02-orders.png`）；但依据实拍截图视觉判读，4 张餐桌全为裸木方桌、未见 v2 要求的桌边自带炭炉，且实测点击订单卡上炉并 `tick(0.05,60)` 前后 `state().player` 均为 `(-2.5, 0)`，店员柳真真全程零走位、原地罚站（`port-02-orders.png`、`port-03-cook-raw.png`、`port-04-perfect.png`、`land-04-perfect.png`），炉上烤串体量极小；竖屏绿檐上方仍露越界木板且靛蓝扎染布幔被檐口截切（`port-02-orders.png`），横屏上排三桌及顾客头顶/入场客身体均被视口顶缘裁切、仅见黄点（`land-03-cook-raw.png`、`land-07-cards4.png`）。 |
| ② 灯光 Saltline | 3.4/5 | 竖屏与横屏 WebGL 画布均满屏渲染（竖屏 `canvas = 390×844 @(0,0)`、横屏 `844×390 @(0,0)`，容器 `#bbq-hud`、`#bbq-orders`、`#bbq-bubbles` 背景均为透明 `rgba(0, 0, 0, 0)`，`body` 背景 `rgb(24,16,8)`），竖屏暖铜吊灯体积光锥、桌面暖光池与炭火烤炉前木地板的橙暖湿反仍具氛围层次（`port-02-orders.png`、`port-05-angry.png`、`port-08-after-replay.png`）；扣分在 3D 场景取景与地面光照导致竖屏视口下缘偏暗、地面暖光在视口下缘中断（`port-02-orders.png`–`port-08-after-replay.png`），横屏吊灯本体全部出画、烤炉前沿高光偏白（`land-02-orders.png`、`land-05-angry.png`），且烤串上炉后未见明暗火候色阶与金烟/灰烟表现（`port-03-cook-raw.png`、`land-04-perfect.png`）。 |
| ③ HUD 整齐 | 3.3/5 | 局内 `.topbar`（竖屏 `315.4×36 @(37.3,8)` / 横屏 `315.4×36 @(264.3,8)`，bottom `44`，底色 `rgba(24,16,12,.72)` + `blur(10px)`）与底部订单卡 `.card`（竖屏 `184×95 @(8,725)` / 横屏 `203.8×68 @(7,312)`）及 `56×56` 按钮无交叠，竖屏结算卡为 `218×336 @(86,254)`、标题 `h1` 为 `156×35 @(117,281)`，布局工整（`port-01-title.png`、`port-02-orders.png`、`port-06-results.png`、`land-01-title.png`、`land-03-cook-raw.png`）。实测扣分：① 横屏结算卡为 `206×307 @(319,41.5)`（标题 `h1` 为 `156×30 @(344,56.5)`），与 `.topbar` bottom `44` **实测交叠 2.5px**（`land-06-results.png`）；② 竖屏底行 `.card` bottom `820`（距底 `24px`）、`.card-btn` bottom `814`，紧贴底部手势区（`port-02-orders.png`、`port-04-perfect.png`）；③ 横屏订单卡 `@(7,312)` 压住台面前沿柜身、引导气泡叠压菌子料箱（`land-03-cook-raw.png`、`land-04-perfect.png`）；④ 世界气泡 `.bubble` 仅带菜名文本与 `data-table` 属性、画面无可见桌号，且耐心环描边全场固定 `#f0c060`，与底部按桌配色的订单卡映射割裂（`port-04-perfect.png`、`land-04-perfect.png`）。 |
| ④ 明显缺陷 | 2.9/5 | 双端 `console.error + pageerror + requestfailed = 0`，真点「再开一局」准确重置为 `phase→playing`、`timeLeft 180`、`money 0` 且清空卡片（`port-08-after-replay.png`、`land-08-after-replay.png`），失败态结算仅保留「再开一局」（`port-06-results.png`、`land-06-results.png`）。明显缺陷实锤：① 规范级 P0 未动，线上仍是 v1 两步循环、`lane/gameplay-v2` 仅 `wip(snapshot)`；② 生串期 `2s` 连点主按钮 3 次在竖屏触发 `waste 0→1` 与飘字「夹生丢弃 · 废料 +1」（横屏 `1.6s` 时 `0→0`，位于锁内），且 `raw` 态丢菜价、文案重复（`port-03-cook-raw.png`、`port-04-perfect.png`）；③ 横屏结算卡顶缘与 `.topbar` 交叠 `2.5px`（`land-06-results.png`）；④ 运行时 `state().actionLabel === "去料箱取料"`、`stations` 仍含 `bin/crate-pork/crate-mush/chop/plate`，生产包仍含 `去料箱取料`×1、`切配台`×2、`装盘台`×2、`crate-pork`×2。 |

| 维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 3.2/5 | 首屏文案「点订单卡两步出餐：上炉 → 起锅上菜」「金色完美窗起锅拿满小费 · 3 个烤位排队」「第 1 关 · 目标：3 分钟营业额 ¥180」与局内「点一下上炉」→「金环亮起就起锅」气泡对旧 v1 清晰（`port-01-title.png`、`port-02-orders.png`、`port-03-cook-raw.png`），但与 v2 规范彻底脱节；且进烤后卡面由 `¥48 · 等待 \| 上炉` 变为 `未熟 · 离熟 4s \| 上炉中`，导致菜价 `¥48` 消失且副行/按钮语义重复（`port-03-cook-raw.png`、`port-04-perfect.png`）；世界气泡 `.bubble` 仅有菜名文本与 `data-table` 属性、画面看不到任何桌号徽标，且耐心环描边全场固定 `#f0c060`，与底部按桌配色的订单卡割裂；顶栏全程不显示目标额 `¥180`，且金额 `¥0` 时 `data-stars=1`。 |
| 操作手感 | 3.3/5 | 双端 `.card-btn` 均为 `56×56`（竖屏 bottom `814`），生串锁内防抖有效（横屏 `1.6s` 时 `0→0`），点击「再开一局」即时重置为 `phase→playing`、`timeLeft 180`、`money 0`（`port-08-after-replay.png`、`land-08-after-replay.png`）；主要扣分在竖屏生串 `2s` 连点 3 次即无确认丢串 `waste 0→1`、竖屏卡底 `bottom 820`（距底 `24px`）紧贴系统手势区（`port-02-orders.png`），以及上炉前后店员坐标均为 `(-2.5, 0)` 原地不动、操作缺乏实体动作反馈（`port-03-cook-raw.png`、`land-04-perfect.png`）。 |
| 正反馈 | 3.1/5 | 暖色调木屋灯光基调与失败态仅保留「再开一局」（不给虚假「下一关」）处理克制准确（`port-06-results.png`、`land-06-results.png`）；但顾客全部超时致 `愤怒 3` 后，顶栏毫无持久失客计数、底部订单区空置无任何提示（`port-05-angry.png`、`land-05-angry.png`），结算在 `营业额 ¥0/¥180`、`服务 0`、`愤怒 3`、`废料 1–2` 下仍给 `data-stars=1` 且无星级归因，3D 烤炉端亦无金黄变色与烟效，局内情绪起伏平淡。 |

### 我能做的（Capability）
- **首屏直出与双端满屏零报错运行**：公网 `openfolio.uk/bbq/` 与本机 `:3035` 同包部署 `assets/index-BsdaUpmb.js`（`5c45b93-202611221108`），双端全流程 `console.error + pageerror + requestfailed = 0`，画布满屏铺展（竖屏 `390×844 @(0,0)`、横屏 `844×390 @(0,0)`），HUD 容器背景透明 `rgba(0, 0, 0, 0)`（`port-01-title.png`、`land-01-title.png`）。
- **底部订单卡热区稳定与锁内防抖有效**：单张卡在竖屏为 `184×95 @(8,725)`、横屏为 `203.8×68 @(7,312)`，主按钮 `.card-btn` 均为 `56×56`（竖屏 bottom `814`），与顶栏 `.topbar`（竖屏 `315.4×36 @(37.3,8)` / 横屏 `315.4×36 @(264.3,8)`，bottom `44`）零交叠；生串锁内连点不扣废料（横屏 `1.6s` 时 `0→0`）（`port-02-orders.png`、`land-03-cook-raw.png`）。
- **结算账单核对与真实重开闭环可靠**：顾客全部超时后准确累计 `愤怒 3` 并清空 `#bbq-orders`，打烊结算准确展示 `营业额 ¥0/¥180`、`服务 0`、`愤怒 3`、`废料 1–2`，失败态仅显示「再开一局」（无「下一关」）；真点「再开一局」准确重置为 `phase→playing`、`timeLeft 180`、`money 0` 并清空旧卡片（`port-06-results.png`、`port-08-after-replay.png`、`land-06-results.png`、`land-08-after-replay.png`）。

### 我看不懂的（Clarity）
1. **世界订单气泡上看不到任何桌号，且所有桌的外环描边都是同一种颜色 `#f0c060`，多桌同时点单时与底部订单卡对不上号**：实测世界气泡 DOM `.bubble` 除 `data-table="t1..t4"` 与 `data-phase` 属性外无任何可见桌号元素，画面上只显示菜名文本；同时气泡耐心环描边全场固定为 `stroke="#f0c060"`（所有桌同色），与底部按桌配色的订单卡桌号视觉割裂，多桌同时点菜时玩家无法一眼完成桌面气泡到底部卡片的映射（`port-04-perfect.png`、`land-04-perfect.png`）。
2. **点完「上炉」后菜价 `¥48` 怎么不见了，按钮又写着「上炉中」**：`idle` 态卡面显示 `¥48 · 等待 | 上炉`，进入 `raw` 态后变为 `未熟 · 离熟 4s | 上炉中`，菜价凭空消失、副行与按钮语义重叠，玩家难以判断此刻能否操作，竖屏 `2s` 时连点 3 次反而触发 `waste 0→1` 与飘字「夹生丢弃 · 废料 +1」（`port-03-cook-raw.png`、`port-04-perfect.png`）。
3. **3 位顾客全气跑了、1 块钱没赚，为什么顶栏毫无变化、结算仍是 `data-stars=1`**：顾客超时致 `愤怒 3`、`#bbq-orders` 卡片归零后，顶栏仍既无本关目标额 `¥180`、也无失客计数，底部订单区完全空置无状态说明，像页面静默卡住；打烊后 `营业额 ¥0/¥180`、`服务 0`、`愤怒 3`、`废料 1–2` 下 `data-stars=1` 且无星级口径说明（`port-05-angry.png`、`port-06-results.png`、`land-05-angry.png`、`land-06-results.png`）。
4. **首屏和局内玩法与最新设计规范完全不是同一款游戏**：首屏仍教玩家「点订单卡两步出餐：上炉 → 起锅上菜 · 3 个烤位排队」，运行时与构建包还留着 `去料箱取料` 与 `切配台/装盘台`，但最新定调的 v2 应为「自动备菜 3s → 出菜窗口 3 槽取菜 → 桌边烤 8s → 盛盘」。

### 让我不爽的（Friction）
1. **横屏结算卡片顶边被常驻顶栏压住 `2.5px`**：实测横屏结算卡为 `206×307 @(319,41.5)`（标题 `h1` 为 `156×30 @(344,56.5)`），而 `.topbar` bottom 为 `44`，两者顶缘实打实交叠 `2.5px`，视觉上顶栏直接骑在结算卡上边框（`land-06-results.png`）。
2. **生串期误点主按钮直接销毁食材并扣废料，竖屏卡底还紧贴系统手势区**：竖屏 `2s` 时对生串卡主按钮连点 3 次立即触发 `waste 0→1` 与「夹生丢弃 · 废料 +1」，缺乏防误触保护；同时竖屏订单卡 bottom 落于 `820`（距底 `24px`）、主按钮 bottom `814`，真机单手点按极易误触底部手势条，横屏卡区 `@(7,312)` 则叠压台面前沿柜身（`port-02-orders.png`、`land-03-cook-raw.png`）。
3. **点卡上炉后厨师全程原地罚站、餐桌光秃无烤盘，3D 场景沦为静态壁纸**：实测点击订单卡上炉并 `tick(0.05,60)` 前后，`state().player` 均为 `(-2.5, 0)`，柳真真零走位、纹丝不动；依据实拍截图视觉判读，4 张木桌均无自带炭炉（`port-02-orders.png`–`port-04-perfect.png`、`land-03-cook-raw.png`、`land-04-perfect.png`），大幅削弱了 3D 经营的沉浸与反馈感。
4. **全客离店或重开初期底部空场无提示，横屏入场顾客被顶边切得只剩黄点**：`port-05-angry.png`、`port-08-after-replay.png` 底部订单区空无一字，`land-07-cards4.png` 中正在入场的顾客身体被视口上缘裁切、仅见漂浮黄点，玩家难以预判客流节奏。

### 让我想继续玩的（Hook）
- **当前唯一成立的钩子**：双端 `0` 报错的满屏稳定运行底座、`56×56` 底部单手热区 + 暖铜吊灯与竹凳烤摊的云南夜市视觉基调（`port-02-orders.png`、`land-02-orders.png`），以及失败重开零延迟的利落节奏（`port-08-after-replay.png`）。
- **v2 上线后的真正期待点**：一旦按 `GAME-DESIGN.md §0/§1` 落地「后台自动备菜 3s → 出菜窗口 3 槽堆满暂停备菜（外部压力）→ 单手取菜互斥（排序取舍）→ 4 桌自带 8s 炭炉并行盯 5–7s 完美窗（时机张力）→ 店员自动穿梭桌边端菜盛盘（视觉爽感）」，游戏才会从当前的“原地静态点卡片”蜕变为具备真实忙碌感与多线调度乐趣的竖屏单手《胡闹厨房》。

### P0 阻塞（不修没法玩）
1) **线上构建 `5c45b93` 仍运行已废止的 v1 两步循环，v2 核心三击循环与出菜窗口尚未交付（沿用 `B-160` / `B-161`，本轮新增进度证据）**
   - 现象：线上与本机同包 `assets/index-BsdaUpmb.js`（`5c45b93-202611221108`）首屏仍显示 `点订单卡两步出餐：上炉 → 起锅上菜 / 金色完美窗起锅拿满小费 · 3 个烤位排队`，局内仍为点订单卡直接占后厨 3 烤位、无 `3s` 自动备菜环、无「出菜窗口 3 槽」与堆满暂停压力机制、无手持唯一约束与每桌 `8s` 炭炉（完美窗 `5–7s`）；且截至 `2026-11-22 12:10Z`，v2 开发车道 `lane/gameplay-v2` 仅有一个 `wip(snapshot)` 提交，无任何有效代码落地。
   - 复现步骤：在竖屏 `390×844` 与横屏 `844×390` 打开本机 `:3035` / 公网 `openfolio.uk/bbq/`，读取首屏规则文案，点击「开店」后观察首位顾客就座是否存在 `3s` 备菜倒计时环、3 槽出菜窗口与每桌独立 `8s` 炭炉。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-03-cook-raw.png`
   - 验收标准：沿用 `B-160` / `B-161`——双端冻结时钟下：(a) 首屏文案含 `取菜`、`烤`、`盛盘` 且不匹配 `/两步出餐|3 个烤位|取料|切配|装盘/`；(b) 顾客就座自动执行 `3s` 备菜并送入出菜窗口，窗口托盘数严格封顶 `=== 3`，满 3 份时挂载 `[data-window-full="true"]` 且第 4 位顾客备菜计时冻结，取走 1 份后同帧恢复；(c) 跑通「点窗口取菜（手持非空时再点窗口被拦截）→ 点桌卡上桌烤（启动每桌独立 `8s` 火候条、完美窗 `5–7s`）→ 点一次盛盘自动结账（`served === 1 && money > 0`）」固定 3 击链路；(d) 公网与本机同包、`console.error + pageerror + requestfailed === 0`。

### P1 明显缺陷
1) **世界订单气泡缺可见桌号与统一桌色标（对应新增 `B-170`）**
   - 现象：实测世界气泡 DOM `.bubble` 仅带 `data-table="t1..t4"`、`data-phase` 属性与菜名文本，DOM 内无任何可见桌号元素，画面上看不到桌号徽标；同时所有气泡的耐心环描边固定为 `stroke="#f0c060"`（全场同色），与底部订单卡按桌配色的桌号割裂，多桌同时点单时难以快速对应目标桌。
   - 复现步骤：双端进局令多桌顾客就座，检查 `.bubble` 的 `outerHTML` 与耐心环 `stroke` 色值，并与底部 `.card` 的桌号配色对照。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-04-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-04-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-03-cook-raw.png`
   - 验收标准：见 `B-170`——双端（`390×844` / `844×390`）多桌顾客就座时断言：(a) 每个可见 `.bubble` 内显式渲染可见桌号元素 `[data-bubble-table="1..4"]`，其可见文本与 `data-table` 对应；(b) 气泡桌号徽标及耐心环描边不再全场固定 `#f0c060`，而是按桌绑定对应主题色，与对应底部 `.card` 桌号色标一致；(c) 双端连跑 3 次 `console.error + pageerror + requestfailed === 0`。

2) **四张餐桌无 3D 嵌入式炭炉且店员柳真真全程原地罚站零自动走位表现（对应新增 `B-171`）**
   - 现象：依据双端实拍截图视觉判读，4 张餐桌当前全为平坦裸木方桌、完全缺失 `GAME-DESIGN.md §1` 要求的“每桌自带炭炉”3D 实体；同时 DOM 探针实测点击订单卡上炉并 `tick(0.05,60)` 前后，`state().player` 均为 `(-2.5, 0)`，店员柳真真零走位、原地罚站，导致 3D 场景与卡片操作脱节。
   - 复现步骤：双端开店并令顾客就座，记录 `window.__test.state().player` 初始坐标 `(-2.5, 0)`；点击订单卡上炉（或 v2 取菜/上桌烤）并执行 `tick(0.05,60)`，复查店员坐标变化与实拍截图/新增只读钩子的桌边炭炉节点。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-04-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-04-perfect.png`
   - 验收标准：见 `B-171`——双端冻结时钟下：(a) 新增只读钩子 `window.__test.tableGrills()`，返回数组长度 `=== 4`（该钩子当前不存在，需实现时新增），且不突破 `ART-DIRECTION.md §4` 预算（`calls <= 120`、`tris <= 150000`）；(b) 执行取菜或上桌烤点击并 `tick(0.05,60)` 后，`state().player` 相对初始 `(-2.5, 0)` 产生明显位移并朝目标位置移动，手持态挂载可见托盘/食材模型；(c) 双端连跑 3 次 `console.error + pageerror + requestfailed === 0`。

3) **生串期丢菜价且主按钮误丢弃扣废料 + 横屏结算顶栏实测压边 `2.5px` + 竖屏底距不足（沿用 `B-166` / `B-167`，本轮补充精确 DOM 探针证据）**
   - 现象：① 卡面文案由 idle 态 `¥48 · 等待 | 上炉` 变为 raw 态 `未熟 · 离熟 4s | 上炉中`，菜价 `¥48` 消失且副行/按钮语义重复；竖屏生串 `2s` 连点主按钮 3 次实测 `waste 0→1`、飘字「夹生丢弃 · 废料 +1」（横屏 `1.6s` 时 `0→0`，位于锁内）；② 横屏结算卡实测 `206×307 @(319,41.5)`（标题 `h1` 为 `156×30 @(344,56.5)`），与 `.topbar`（`315.4×36 @(264.3,8)`，bottom `44`）**交叠 2.5px**；③ 竖屏单张 `.card` 为 `184×95 @(8,725)`，**bottom `820`（距底 `24px`）**，`.card-btn` 为 `56×56`、bottom `814`，紧贴底部手势区；横屏 `.card` `203.8×68 @(7,312)` 压住台面前沿柜身。
   - 复现步骤：① 上炉后于竖屏 `2s` 连点主按钮 3 次读取 `state().waste`、卡面文案与飘字；② 横屏推进至 `results` 态读取 `.topbar` 与结算卡的 `getBoundingClientRect()`；③ 竖屏读取 `.card` 与 `.card-btn` 的 bottom 与距底距离。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-04-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-06-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-03-cook-raw.png`
   - 验收标准：沿用 `B-166` / `B-167`——(a) 生串全时段卡面匹配 `/¥\d+/`、按钮为不可破坏进行态（`disabled === true` 或点击零副作用），连点 3 次以上 `waste === 0`；(b) 横屏 `results` 态 `.topbar` 隐藏或与结算卡交叠面积 `=== 0`（消除 `2.5px` 压边）；(c) 竖屏 `390×844` 所有 `.card` 抬离底部手势安全区（沿用 `B-167` 标准），横屏 `.card` 不压台面前沿柜身；双端 `0` JS error。

4) **生产包与运行时仍残留废弃五步字符串 + 失客/目标额顶栏缺席（沿用 `B-168` / `B-163` / `B-149` / `B-125`，本轮补充包内精确计数证据）**
   - 现象：① 本轮静态扫描生产包 `assets/index-BsdaUpmb.js` 实测残留 `去料箱取料`×1、`切配台`×2、`装盘台`×2、`crate-pork`×2；运行时 `state().actionLabel === "去料箱取料"`、`stations` 仍含 `bin/crate-pork/crate-mush/chop/plate`，直接违反 `GAME-DESIGN.md §1` 零残留禁令；② 顾客全部超时致 `愤怒 3` 后，顶栏仍无持久失客计数且全程缺失本关目标额 `¥180`。
   - 复现步骤：① 对 `dist/assets/*.js` 检索废弃关键词并在 `playing` 态读取 `__test.state()`；② 令顾客超时致 `愤怒 3` 后检查 `.topbar` 文本是否含失客计数与目标额 `¥180`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-05-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/land-05-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T12-10Z-r37/port-02-orders.png`
   - 验收标准：沿用 `B-168` / `B-163` / `B-149` / `B-125`——(a) 生产包 `dist/assets/*.js` 匹配 `/去料箱取料|切配台|装盘台|crate-pork/` 命中数 `=== 0`，运行时 `JSON.stringify(__test.state())` 命中数 `=== 0` 且 `stations` 不含 `bin/chop/plate`；(b) 双端顶栏常驻显示 `¥{money}/¥{target}` 与 `[data-angry-count]`（3 客超时后同帧更新为 `3/3` 且不溢出顶栏），双端 `0` JS error。

### P2 打磨项
1) **订单区空态提示与横屏入场顾客顶缘方向标缺失（对应新增 `B-172`）**：顾客全部超时离店致 `愤怒 3`（`port-05-angry.png`、`land-05-angry.png`）与刚重开阶段（`port-08-after-replay.png`、`land-08-after-replay.png`）时 `#bbq-orders` 为 `0` 张卡、底部完全空置无状态说明，易误判卡死；横屏多客在店入场阶段（`land-07-cards4.png`），走动入场中的顾客身体被视口上缘裁切、仅见漂浮黄点。验收：空单态在订单区展示轻提示 `[data-orders-empty]`（如「等待顾客入座…」或「有顾客正在入座…」），横屏顶缘对画外入场客给方向徽标 `[data-incoming-badge]`，有卡渲染后自动隐藏，双端 `0` JS error。
2) **既有打磨项沿用（不新开编号）**：首屏加载骨架（`B-169`）；金额 `¥0/¥180` 时 `data-stars=1` 缺乏丢星归因文案与明确关卡重打/回关入口（`B-153`）；3D 烤串熟/焦变色与金/灰烟缺失（`B-097`）；竖屏绿檐上方露越界木板、扎染布幔截断、横屏顶排顾客头部裁切，以及 3D 场景取景/地面光照致竖屏下缘偏暗、地面暖光在视口下缘中断（`B-135`）；`docs/GAME-DESIGN.md §2/§5/§6/§7` 旧条款自相矛盾（`B-162`）与 `docs/ART-DIRECTION.md §5` 订单卡文档过期（`B-159`）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md §0 / §1`（2026-11-22 10:06Z 用户定调 v2，最高优先）逐条对照**：
  - **顾客自助点单 → 后台自动备菜 3s**：线上包 `5c45b93` 完全缺失「备菜中 3s 环」被动等待阶段，顾客落座直接弹出待上炉订单卡（`¥48 · 等待 | 上炉`）（沿用 `B-161`）。
  - **出菜窗口 3 槽（堆满后后台暂停备菜）**：线上包无任何「出菜窗口」UI 面板或 3D 实体，不存在 3 槽上限及满槽暂停备菜压力系统（沿用 `B-161`）。
  - **点窗口取菜（手持唯一约束）**：线上包无窗口取菜交互与“手上有菜时不能再取”的排序约束，店员上炉前后坐标均停在 `(-2.5, 0)`、无端菜状态与自动走位表现（沿用 `B-160`，3D 表现对应新增 `B-171`）。
  - **每桌自带烤盘 8s（完美窗 5–7s）**：线上包仍是后厨共享「3 个烤位排队」（非每桌 `8s` / 完美窗 `5–7s`），且依据截图视觉判读 4 张餐桌在 3D 场景中均为裸木方桌、无桌边炭炉（沿用 `B-160`，桌边炭炉实体对应新增 `B-171`）。
  - **点一次盛盘 → 自动结账，每道菜固定 3 次点击**：线上包仍是已废止的 v1 两次点击循环（`上炉 → 起锅上菜`），未实现「取菜 1 击 + 上桌烤 1 击 + 盛盘 1 击 = 3 次」链路（沿用 `B-160`）。
  - **明令删除切配台 / 装盘台 / 垃圾桶 / 料箱走动取料 / 手持跑图（代码里出现即视为 bug）**：线上包运行时仍导出 `state().actionLabel === "去料箱取料"`、`stations` 仍含 `bin/crate-pork/crate-mush/chop/plate`，生产包 `assets/index-BsdaUpmb.js` 仍含 `去料箱取料`×1、`切配台`×2、`装盘台`×2、`crate-pork`×2，且 3D 后厨台面仍完整保留料箱、砧板、装盘台与垃圾桶（沿用 `B-168` / `B-163`）。
- **`GAME-DESIGN.md §3 / §4`（关卡目标与星级反馈）**：失败结算仅保留「再开一局」且重开重置准确（`phase→playing`、`timeLeft 180`、`money 0`），但局内顶栏仍缺目标额 `¥180`（`B-125`）、顾客超时致 `愤怒 3` 后无持久失客计数（`B-149`），且 `¥0/¥180` / `服务 0` / `愤怒 3` / `废料 1–2` 下结算 `data-stars=1` 而无规则解释（`B-153`）。
- **`ART-DIRECTION.md §1 / §3 / §5`（镜头边界、Saltline 灯光与 UI 皮肤）**：
  - `§1` 要求可见地面落在世界边界内且底部交互区遵守安全边距：实测竖屏绿檐上方仍露越界木板、横屏顶排客及入场客被上缘裁切，且竖屏 3D 取景与地面光照使下缘偏暗、地面暖光在视口下缘中断（`B-135`），竖屏底卡 `bottom 820`（距底 `24px`）与按钮 `bottom 814` 仍紧贴底部手势区（沿用 `B-167`）。
  - `§3` 与 `GAME-DESIGN §7` 要求火候变色与烟效清晰可读：3D 烤串熟/焦变色与烟效仍缺席（`B-097`）。
  - `§5` 要求 HUD 不重叠、不挡操作与清晰映射：横屏结算卡 `206×307 @(319,41.5)` 与 `.topbar` bottom `44` 实测交叠 `2.5px`（沿用 `B-167`），世界气泡 `.bubble` 缺可见桌号元素且耐心环描边全场固定 `#f0c060`（新增 `B-170`）。

## 2026-11-22 11:09Z 第 36 轮
综合评分：3.3/5（比上轮 +0.2）

> 本轮评测对象为线上 `https://openfolio.uk/bbq/` 与本机 `:3035` 同包构建 `assets/index-BsdaUpmb.js`（`window.__build = "5c45b93-202611221108"`，双端 `0` JS error，仅 2 条既有 Three.js 弃用 warning）。本轮已逐张核对全部 25 张实拍截图，确认上轮核心止血项 **已修复**：① 订单卡已迁至竖屏底部拇指区与横屏底部单排（与顶栏交叠 `0`、`<44px` 按钮 `0` 个、无出界/无滚动，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`）；② `B-156` 焦糊解耦已修复——烤满 `12s` 仅计 `waste 0→1`、不瞬间赶客，驻留 `1.2s` 后恢复可点「重烤」并可二次上炉完美出餐，`waste=1 / angry=0` 正常达成 `3★`（见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-05-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-05-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-06-burnt-retry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-03-results.png`）；③ `B-157` 卡片色阶与「焦糊 焦糊」重名已修复（现为红框 + `¥48 · 重烤可上炉` + `重烤`）；④ `B-152` 生串 `0.6s` 锁内连点防抖有效（见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-01-lock-tap.png`）；⑤ 首屏文案已清除「取料/切配/装盘」且鼠标真点「进入第 2 关」稳定切关运行（见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-04-after-next-click.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-05-after-next-2s.png`）。以下基于实拍证据与机测事实给出本轮评分与问题清单。

| 维度 | 分数 | 证据（含截图文件名） |
|---|---|---|
| ① 画面像不像《胡闹厨房》 | 3.2/5 | 正交俯视木板拼缝、模块化一字台面、高饱和五花肉/菌子/米线实物料箱与斗方挂牌、Q 版白帽朱红围裙厨师及竹凳方桌辨识度稳定（`port-02-orders.png`、`land-02-orders.png`）；扣分在竖屏绿檐上方仍露多余木板、靛蓝扎染布幔上下截断且右侧 3 号桌与烤炉右半截出画（`port-03-cook-raw.png`），横屏顶排三桌与顾客头顶被视口顶缘裁切（`land-03-cook-raw.png`），且炉上烤串体量偏小、视觉存在感弱于 OC。 |
| ② 灯光有没有 Saltline 味道 | 3.2/5 | 竖屏暖铜吊灯体积光锥、桌面暖光池与炭火烤炉前木地板的橙暖湿反明暗层次在线（`port-02-orders.png`、`port-08-angry.png`）；扣分在横屏吊灯本体全部出画（`land-02-orders.png`），竖屏底部纯黑停靠带硬截断地板暖光（`port-07-served.png`），且烤串在生→熟→焦全周期未见 3D 串体金黄/焦黑变色与金烟/灰烟层次（`port-03-cook-raw.png`、`port-05-burnt.png`、`land-05-burnt.png`）。 |
| ③ HUD 是否整齐 | 3.5/5 | 订单卡已落竖屏底部拇指区（`184×95 @(8,725)`、按钮 `56×56 @(128,758)`）与横屏底部单排，顶栏 `315×36` 与卡区交叠 `0`、无滚动、无 `<44px` 按钮、无出界元素（`port-02-orders.png`、`port-03-cook-raw.png`、`land-03-cook-raw.png`）。扣分集中在四处实拍瑕疵：① **横屏结算态顶栏 `.topbar` 压住结算卡上缘、标题紧贴顶栏**（`land-09-results.png`；机器复核：标题字面完整可读，属压边而非截断）；② 竖屏底行卡底边在 `y=820`（距底仅 `24px`），侵占 iPhone 底部 `34px` 手势安全区（`port-03-cook-raw.png`）；③ 横屏 3 张订单卡压住台面前沿柜身（`land-02-orders.png`、`land-03-cook-raw.png`）；④ 顶栏缺本关目标额与持久失客计数（`port-06-burnt-retry.png`、`verify-04-after-next-click.png`）。 |
| ④ 有没有明显缺陷 | 3.3/5 | 双端 `0` JS error，`B-156` 焦糊重烤、`B-157` 焦糊色阶/文案去重、`B-152` `0.6s` 防双击锁与真点切入第 2 关均核实通过（`port-05-burnt.png`、`land-06-burnt-retry.png`、`verify-01-lock-tap.png`、`verify-04-after-next-click.png`）。主要扣分项：① **规范级 P0**：线上仍跑已废止的 v1 两步循环，未合入 `GAME-DESIGN §0/§1` v2 三步链；② 横屏结算顶栏压住结算卡上缘（`land-09-results.png`）；③ 生串期 `0.6–4.0s` 按钮仍带“向上起锅”图标且双写「未熟」并抹掉菜价，误点即丢串 `waste+1`（`port-03-cook-raw.png`、`port-04-doubleclick.png`）；④ 愤怒离店无顶栏持久计数（`port-08-angry.png`、`land-08-angry.png`）与代码/包内残留旧五步语义（`actionLabel === "去料箱取料"`）。 |

| 维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 3.3/5 | 首屏已全面切换清晰两步文案与唯一金色 CTA「开店」（`port-01-title.png`、`land-01-title.png`），开局气泡 `点一下上炉` → `金环亮起就起锅` 并在首单收款后自动撤掉（`port-02-orders.png`、`port-03-cook-raw.png`、`verify-02-hud-stars.png`），焦糊后 `¥48 · 重烤可上炉` + `重烤` 语义明确（`port-05-burnt.png`、`land-05-burnt.png`）。扣分在：① 生串期 `未熟 · 离熟 2s` 与按钮 `未熟` 重复、隐藏菜价 `¥48` 且配向上“起锅”图标，易诱导玩家补点（`port-03-cook-raw.png`、`verify-01-lock-tap.png`）；② 顶栏无目标额，进第 2 关后全程看不到 `¥260` 门槛（`verify-04-after-next-click.png`、`verify-05-after-next-2s.png`）；③ 顶栏无持久失客数，开局零营业额即亮 `1★`（`port-02-orders.png`、`port-08-angry.png`）。 |
| 操作手感 | 3.6/5 | 竖屏底部 `56×56` 拇指热区顺手、无误滑滚动（`port-02-orders.png`），`0.6s` 生串锁拦下瞬间连点不扣废料（`verify-01-lock-tap.png`），焦糊 `1.2s` 后「重烤」可救回订单并正常进完美窗出餐（`land-06-burnt-retry.png`），真点「进入第 2 关」瞬时清屏切关（`verify-04-after-next-click.png`）。扣分在：① 过 `0.6s` 锁后至 `4.0s` 期间点主按钮无二次确认即直接丢串 `waste+1`（`port-04-doubleclick.png`、`land-04-doubleclick.png`），手机高频点按误触代价过高；② 竖屏第 2 行卡片底边落 `y=820`（距底 `24px < 34px` iOS 手势条高），真机易误触发系统底部横条（`port-03-cook-raw.png`）。 |
| 正反馈/爽感 | 3.2/5 | `B-156` 落地后焦糊不再一击击穿 `3★` 容错，实测 `waste=1 / angry=0` 仍能拿到满星 `★★★`（`verify-03-results.png`），起锅收款有明确金色 `+¥26` 飘字、顶栏营业额同步跳涨至 `¥26` / `¥59` 且卡切绿勾 `✓ 已上`（`port-07-served.png`、`verify-02-hud-stars.png`）。扣分在：3D 烤炉端缺乏火候变金黄/焦黑与烟效反馈，爽感仍高度依赖 2D 订单卡圆环与文字（`port-03-cook-raw.png`、`port-05-burnt.png`），且顾客愤怒离店后顶栏毫无持久红线提示（`port-06-burnt-retry.png`、`land-08-angry.png`），失分张力不足。 |

### 我能做的（Capability）
- **双端零报错同包上线、底部单手热区达标（已修复）**：公网 `https://openfolio.uk/bbq/` 与本机 `:3035` 同跑 `5c45b93-202611221108`（`assets/index-BsdaUpmb.js`），双端 `0` JS error；订单卡落竖屏底部拇指区（`184×95 @(8,725)`、按钮 `56×56 @(128,758)`）与横屏底部单排，与顶栏 `315×36` 交叠 `0`、无滚动、无 `<44px` 按钮（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`）。
- **焦糊解耦可重烤与色阶去重闭环成立（已修复）**：烤满 `12s` 仅计 `waste 0→1`、飘字 `焦糊 · 废料 +1`，顾客仍在座，卡片切红框并经 `1.2s` 进入 `¥48 · 重烤可上炉` + `重烤`（无「焦糊 焦糊」重名），点击「重烤」可再次进入 `perfect/起锅` 出餐，`waste=1, angry=0` 可达 `3★`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-05-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-05-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-06-burnt-retry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-03-results.png`）。
- **生串 `0.6s` 防抖、收款与第 2 关切换可靠**：`0.6s` 锁内连点 2–3 次 `waste` 不变（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-01-lock-tap.png`）；起锅收款触发 `+¥26` 飘字与顶栏 `¥0→¥26`/`¥59` 同步（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-07-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-02-hud-stars.png`）；结算面板鼠标真点「进入第 2 关」稳定进入 `level=2, timeLeft=179.27, panel=null` 并持续运行（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-04-after-next-click.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-05-after-next-2s.png`）；横屏 `served=0 / angry=3` 正确锁 `1★`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-09-results.png`）。

### 我看不懂的（Clarity）
1. **生串期按钮画着“向上起锅”图标且双写「未熟」、隐藏菜价 `¥48`**：上炉进入 `raw` 后（`0.6–4.0s`），卡片副行写 `未熟 · 离熟 2s`（菜价 `¥48` 消失），右侧圆钮同时写 `未熟` 并配向上箭头“拿起”图标（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-01-lock-tap.png`），玩家既看不清是否正在烤、也看不出点它竟会“丢弃生串 +1 废料”。
2. **愤怒离店与废料损耗在顶栏零留痕**：无论失客 2 位（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-08-angry.png`）还是 3 位（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-08-angry.png`），飘字消失后顶栏始终只有 `营业额` 与 `★☆☆`（`[data-angry-count]` 为 `null`），玩家完全不知道距离 `angry ≥ 3` 锁 `1★` 红线还有多少余量。
3. **局内与第 2 关全程缺失目标营业额，结算无丢星归因**：顶栏只写 `第 1 关 营业额 ¥26` / `第 2 关 营业额 ¥0`，切入第 2 关后全程看不到 `¥260` 目标额（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-04-after-next-click.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-05-after-next-2s.png`）；`2★` 结算仅列数字，未说明为何未满 `3★`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-09-results.png`）。
4. **冷启动长达 11.5–16.2s 无加载骨架与进度提示**：软渲染下竖屏首屏可读需 `16.2s`、横屏 `11.5s`，期间缺乏即时加载反馈，新手极易误判页面卡死。

### 让我不爽的（Friction）
1. **生串期误点主按钮无确认即丢串扣 `waste +1`**：虽有 `0.6s` 锁防瞬间双击，但只要玩家在 `0.6–4.0s` 期间惯性再点「未熟」圆钮，系统立刻执行 `夹生丢弃 · 废料 +1` 并释放/重烤（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-04-doubleclick.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-04-doubleclick.png`），一次误触直接用光 `3★` 允许的唯一 1 份废料容错。
2. **横屏结算态顶栏压住结算卡上缘**：在 `844×390` 结算态下，常驻顶栏 `.topbar` 叠压在结算卡片最上方，压住卡面上缘、标题紧贴顶栏（机器复核：标题字面完整可读，属压边/观感冲突，非截断）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-09-results.png`）。
3. **竖屏底部卡区贴进 iPhone 手势安全区、横屏卡区压住台面前沿柜身**：竖屏 `390×844` 底行卡底边 `y=820`、按钮底边 `y=814`（距底 `24px / 30px`），落入 iOS 底部 `34px` Home Indicator 禁区（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`）；横屏 3 张卡紧贴烤炉下沿、压住台面前沿柜身（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`）。

### 让我想继续玩的（Hook）
- **单手底部停靠区 + 焦糊可重烤让核心循环首次具备“容错与翻盘感”**：订单卡迁到底部拇指区、`56×56` 热区稳固，加上 `B-156` 让烤焦一次后仍可留桌重烤并保住 `3★`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-05-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-06-burnt-retry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-03-results.png`），配合暖光池与竹凳烤炉的云南夜市基调，只要补齐 v2 出菜窗口三击节奏、去掉生串误触丢菜陷阱并修掉顶栏/安全区缺陷，单手轻经营的爽感底座就能立住。

### P0 阻塞（不修没法玩）
1) **线上仍运行已废止的 v1 两步循环，未合入 `GAME-DESIGN.md §0/§1` v2 核心玩法（沿用既有 `B-160`、`B-161`）**
   - 现象：线上同包 `5c45b93-202611221108`（`assets/index-BsdaUpmb.js`）首屏仍为 `点订单卡两步出餐：上炉 → 起锅上菜 / 金色完美窗起锅拿满小费 · 3 个烤位排队`，局内点订单卡直接占后厨 3 个共享烤位（`12s` 焦糊），完全没有 `GAME-DESIGN.md §0/§1` 最高优先定调的 v2 玩法（顾客自助点单 → 后台自动备菜 `3s` → 出菜窗口 `3` 槽堆满暂停 → 取菜手持唯一 → 桌边 `8s` 自带炭炉烤制 → 盛盘）。
   - 复现步骤：在竖屏 `390×844` 与横屏 `844×390` 打开 `https://openfolio.uk/bbq/` 与 `http://127.0.0.1:3035/bbq/`，读取首屏规则文案，点击「开店」后观察顾客就座是否存在 `3s` 自动备菜环与「出菜窗口」3 槽队列。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-02-orders.png`
   - **验收标准**：沿用 `B-160` / `B-161`——双端冻结时钟下：(a) 首屏文本含 `取菜`、`烤`、`盛盘` 且不匹配 `/两步出餐|3 个烤位|取料|切配|装盘/`；(b) 顾客就座自动 `3s` 备菜并送入出菜窗口，窗口托盘上限 `=== 3` 且满 3 份时第 4 客备菜计时冻结；(c) 跑通「点窗口取菜（手持期间再点窗口被拦截）→ 点桌卡上桌烤（每桌独立 `8s` 炭炉）→ 盛盘收款（`served === 1 && money > 0`）」固定 3 击链路；(d) 公网与本机同包、双端 `0` JS error。

### P1 明显缺陷
1) **生串期（`0.6–4.0s`）主按钮带“向上起锅”图标且双写「未熟」+ 丢菜价，轻点无确认即丢串 `waste +1`（对应新增 `B-166`）**
   - 现象：订单卡点击上炉进入 `raw` 态后，副行显示 `未熟 · 离熟 2s`（原菜价 `¥48` 消失），右侧 `56×56` 主按钮同时写「未熟」并展示向上“拿起/起锅”箭头图标；虽 `0.6s` 锁能拦下瞬间双击，但只要玩家在 `0.6–4.0s` 期间再点一次该按钮，即无二次确认直接触发 `夹生丢弃 · 废料 +1` 并释放烤位/重烤，连点 6 次实测 `waste 0→1`。
   - 复现步骤：双端开店后对 1 号桌 `烤五花肉拼盘` 点 1 次上炉，待 `grillT > 0.6s` 且 `< 4.0s` 时观察卡面文案、菜价与按钮图标，再对该卡主按钮执行点击或连续点击，读取 `state().waste`、卡面文案与飘字。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-04-doubleclick.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-04-doubleclick.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-01-lock-tap.png`
   - **验收标准**：见 `B-166`——双端冻结时钟下对订单卡上炉并在 `raw` 全时段（`t = 0.2s / 1.5s / 3.0s`）断言：(a) 卡面可见文本始终匹配 `/¥\d+/`（菜价不消失），按钮文案为进行态「烤制中」（副行与按钮去空白后不等，不匹配 `/未熟[\s\S]*未熟/`）且按钮为非破坏态（`disabled === true` 或 `aria-disabled="true"`）；(b) 在 `t = 0.2s` 与 `t = 1.5s` 分别真实连点 6 次该按钮，断言 `state().waste === 0`、烤位占用恒为 `1`、不触发 `夹生丢弃` 飘字；(c) 推进至 `perfect` 窗口后按钮立即恢复可点「起锅」并正常收款，双端 `0` JS error。

2) **横屏结算顶栏压住结算卡上缘 + 竖屏底部卡区侵占 iPhone 手势安全区 + 横屏卡区压住台面前沿（对应新增 `B-167`，联动 `B-159`）**
   - 现象：① 横屏 `844×390` 进入结算态时，常驻顶栏 `.topbar`（`y=8..44`）直接叠压在结算卡片顶端，压住卡面上缘、标题紧贴顶栏（机器复核：标题字面完整可读，属压边/观感冲突而非截断）；② 竖屏 `390×844`（iPhone 12/13/14 视口）底部 2 行订单卡底边落在 `y=820`（距视口底仅 `24px`），按钮底边 `y=814`（距底 `30px`），均侵占 iOS 底部 `34px` Home Indicator 手势安全区，真机易被横条压边或误触上滑；
   - 复现步骤：① 横屏 `844×390` 推进至 `results` 态，读取 `.topbar` 与 `.bbq-panel h1` 的 `getBoundingClientRect()`；② 竖屏 `390×844` 坐满 3 位顾客，读取底部行 `.card` 与 `.card-btn` 的 `bottom` 距 `innerHeight` 余量；③ 横屏 `844×390` 首位顾客就座与上炉态，读取 `[data-onboard-tip]` 与菌子料箱投影包围盒交叠面积。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-09-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`
   - **验收标准**：见 `B-167`——(a) 横屏 `844×390` 与竖屏 `390×844` 在 `menu` / `results` 态下，`.topbar` 隐藏（`display === 'none'` 或 `visibility === 'hidden'`）或与 `.bbq-panel .card` 及 `.bbq-panel h1` 矩形交叠面积均 `=== 0`，且结算双按钮底边 `<= innerHeight - 8`；(b) 竖屏 `390×844` 渲染 3–4 张订单卡时，所有 `.card` 底边满足 `rect.bottom <= innerHeight - 34`（同时 CSS 绑定 `max(34px, env(safe-area-inset-bottom))`），卡内按钮仍 `>= 48×48px`、无滚动、与 `.topbar` 交叠 `0`；(c) 横屏 `844×390` 下底部 `.card` 与台面前沿柜身投影矩形交叠面积 `=== 0`，且 `[data-onboard-tip]` 与料箱/挂牌投影交叠面积 `=== 0`，双端 `0` JS error。

3) **顾客愤怒离店缺少持久 HUD 失客计数与锁星红线提示（沿用既有 `B-149`）**
   - 现象：顾客耐心归零转 `leaving-angry` 后仅同帧闪过 `愤怒离店` 飘字，DOM 实测 `document.querySelector('[data-angry-count]') === null`，顶栏 `#bbq-hud .stars` 全程维持 `data-stars="1"`（即使愤怒离店 2 位或 3 位），玩家从顶栏读不出已失客数量，也感知不到 `angry ≥ 3` 锁 `1★` 红线。
   - 复现步骤：双端开店并令 1–3 位顾客耐心归零离店，待飘字消失后检查顶栏 `.topbar` 文本、`[data-angry-count]` 节点与 `.stars` 状态。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-06-burnt-retry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-08-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-07-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-08-angry.png`
   - **验收标准**：沿用 `B-149`——双端冻结时钟下：(a) 开局 `[data-angry-count]` 可见且含 `0/3`、顶栏不溢出；(b) 1 位顾客愤怒离店后同帧更新为 `1/3` 且呈警示红 `#e05a3a`（`rgb(224, 90, 58)`）；(c) 累计 3 位离店后挂载 `data-star-capped="true"` 并含 `3/3`，双端 `0` JS error。

4) **状态机与线上包内仍残留已废弃的五步出餐语义（`去料箱取料 / 取料 / 切配 / 装盘` 与 `crate-pork/chop/plate/bin`）（对应新增 `B-168`，协同 `B-158` / `B-163`）**
   - 现象：尽管界面上已移除摇杆与旧动作键，但运行时实测 `__test.state().actionLabel === "去料箱取料"`、`stations` 仍返回 `crate-pork / crate-mush / crate-mix / chop / plate / bin`，且线上生产包 `assets/index-BsdaUpmb.js` 内仍完整打包了 `去料箱取料 / 取料 / 切配 / 装盘` 文案分支，直接触发 `GAME-DESIGN.md §1`「已废弃条款，代码里出现即视为 bug」。
   - 复现步骤：打开 `https://openfolio.uk/bbq/` 进入 `playing` 态，读取 `window.__test.state().actionLabel` 与 `window.__test.state().stations`，并对构建产物 `dist/assets/index-*.js` 做关键字检索。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-02-orders.png`
   - **验收标准**：见 `B-168`——(a) 运行时双端进入 `playing` 态读取 `window.__test.state()`，断言 `JSON.stringify(state)` 不匹配 `/去料箱取料|取料|切配|装盘|crate-pork|crate-mush|crate-mix/`，且 `stations`（若存在）不含 `bin`、`chop`、`plate`；(b) 生产构建产物 `dist/assets/*.js` 字符串扫描匹配 `/去料箱取料|切配台|装盘台/` 命中数为 `0`；(c) 全套 E2E 回归通过、双端 `0` JS error。

5) **文档内部自相矛盾与局内缺目标额/结算缺归因（沿用既有 `B-162`、`B-125`、`B-153`）**
   - 现象：① `docs/GAME-DESIGN.md` `§0/§1` 已改为 v2 三步链，但文首导语与 `§6` 仍写「两次点击：上炉 → 起锅上菜」、`§2` 仍写「切配 3 次点按 / 6.0s 熟 12.0s 焦 / 桌子 4s 后再坐」、`§5` 仍列料箱/切配台/装盘台/垃圾桶、`§7` 仍写台面跳切，整份权威文档前后互斥；② 顶栏缺失目标营业额，真点进入第 2 关后全程看不到 `¥260` 门槛（`verify-04-after-next-click.png`、`verify-05-after-next-2s.png`）；③ 结算面板无星级归因文案，重玩仍写含糊的「再开一局」且无「回到第 1 关」出口（`port-09-results.png`）。
   - 复现步骤：① 检视 `docs/GAME-DESIGN.md` 导语及 `§0–§7`；② 通关第 1 关后真点「进入第 2 关」，观察局内顶栏与屏幕是否存在 `¥260` 提示；③ 核查结算页是否存在 `[data-star-reason]` 与回第 1 关入口。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-09-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-04-after-next-click.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/verify-05-after-next-2s.png`
   - **验收标准**：沿用 `B-162` / `B-125` / `B-153`——(a) `docs/GAME-DESIGN.md` 除废弃声明段外无旧两步/切配/料箱站点自相矛盾条款；(b) 双端局内顶栏常驻显示 `¥{money}/¥{target}`（第 2 关匹配 `/¥\d+\s*\/\s*¥260/`）且不溢出；(c) 结算面板展示 `[data-star-reason]`、`重打第 N 关` 与第 2 关 `[data-back-lv1]` 入口。

### P2 打磨项
1) **首屏冷启动耗时 11.5–16.2s 缺少即时加载骨架与进度提示（对应新增 `B-169`，升级 `B-009`）**
   - 现象：软渲染环境下竖屏首屏可读需 `16.2s`、横屏 `11.5s`，资源与 WebGL 管线初始化期间无内联加载骨架或进度条提示，弱网/低端机玩家易误判白屏卡死。
   - 复现步骤：冷启动（清缓存/禁用 GPU 软渲染）访问 `https://openfolio.uk/bbq/`，记录 `DOMContentLoaded` 至 `phase === 'menu'` 期间的首屏渲染节点。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-01-title.png`
   - **验收标准**：见 `B-169`——`DOMContentLoaded` 后 `<= 300ms` 页面可见内联加载骨架 `[data-boot-skeleton]`（含店招与状态文案如「正在生火…」），`__game.phase === 'menu'` 就绪后 `<= 500ms` 自动销毁且不阻挡「开店」点击。
2) **既有可复用打磨项（均沿用旧编号，不新开）**：
   - 控制台 2 条 Three.js 弃用 warning（`THREE.Clock` → `THREE.Timer`、`PCFSoftShadowMap` → `PCFShadowMap`，沿用 `B-006`）。
   - 3D 烤炉串体无熟/焦变色与烟效（`B-097`，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-03-cook-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-05-burnt.png`）。
   - 竖屏绿檐上方露多余木板、靛蓝扎染布幔截断与横屏顶排客头顶裁切（`B-135` / `B-016`，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/land-03-cook-raw.png`）；开局零营业额即亮 `1★`（`B-106`）；「用餐中」完成态卡未降噪沉底（`B-151`，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T11-09Z-r36/port-07-served.png`）；`docs/ART-DIRECTION.md §5` 过期订单卡规格（`B-159`）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md §0 / §1`（最高优先 v2 玩法：顾客自助点单 → 后台自动备菜 `3s` → 出菜窗口 `3` 槽 → 取菜 → 桌边 `8s` 烤制 → 盛盘，3 击/份、手持唯一；「已废弃条款：切配台 / 装盘台 / 料箱走动取料 / 垃圾桶 / 五步出餐链 / `stations.ts` 旧语义，代码里出现即视为 bug」）**：
  - 线上 `5c45b93` 仍是 v1 两步点击（3 个后厨烤位排队、`12s` 焦糊），`lane/gameplay-v2` 尚未合入，属本轮最大 SPEC 差距（沿用 `B-160`、`B-161`）。
  - 运行时 `__test.state().actionLabel === "去料箱取料"`、`stations` 仍含 `crate-pork/mush/mix/chop/plate/bin`，且生产包仍残留 `去料箱取料 / 取料 / 切配 / 装盘` 文案分支，直接违背 `§1` 零残留规定（对应新增 `B-168`）。
- **`GAME-DESIGN.md §2 / §5 / §6 / §7`（规范自洽性）**：
  - 文档导语及 `§2/§5/§6/§7` 仍保留「两次点击」「切配 3 次点按」「6.0s 熟 → 12.0s 焦」「桌子 4s 后再坐」「料箱/切配台/装盘台/垃圾桶」等旧条款，与最高优先 `§0/§1` 严重自相矛盾（沿用 `B-162`）。
- **`GAME-DESIGN.md §4`（评分公式与焦糊/失客规则）**：
  - `§4`「焦糊只计废料 +1，不计愤怒离店，1.2s 后该桌回『重烤』可救」与 `served=0 / angry≥3` 锁 `1★` 条款**本轮已核实达标**（`port-05-burnt.png`、`land-09-results.png`、`verify-03-results.png`）。
  - 差距在顶栏缺失持久失客计数与红线提示（`[data-angry-count]` 为 `null`，沿用 `B-149`）、缺目标营业额（`B-125`）及结算缺星级归因（`B-153`）。
- **`ART-DIRECTION.md §1 / §2 / §3 / §5`（镜头安全区、布景、灯光与 UI 皮肤）**：
  - `§1` 底部交互区须遵守 `env(safe-area-inset-bottom)` 安全边距，但竖屏底行订单卡底边 `y=820`（距底 `24px < 34px` iOS 手势区）；同时横屏结算态常驻 `.topbar` 压住结算卡上缘（标题未截断，属压边，对应新增 `B-167`）。
  - `§5` 订单卡字号与无滚动达标，但文档仍写过期的「右上竖排 `top:150px` / 动作键」（沿用 `B-159`），且横屏底部订单卡压住台面前沿柜身（`land-03-cook-raw.png`）。
  - `§3` 灯光暖光池与台面湿反在线，但 `GAME-DESIGN §7` 要求的烤熟金黄/焦黑变色与烟效仍缺失（`B-097`），且控制台遗留 2 条 Three.js 弃用 warning（`B-006`）。

---

## 2026-11-22 10:38Z 第 35 轮
综合评分：3.1/5（比上轮 3.4 −0.3，线上仍为同包 `de55a6c` 且 `B-081` 保持解决，但本轮深挖角色移动与焦糊全生命周期，坐实触屏引导死路「去料箱取料」与焦糊同帧 `angry+waste` 双扣清桌无重烤两大体验缺陷，且 v2 仍停留在 `worktree gameplay-v2` 未提交）

本轮被测构建为线上 **v1（两次点击）**包 `window.__build = "de55a6c-202611220933"`（入口 `assets/index-DNtp-AqZ.js`；本机 `http://127.0.0.1:3035/bbq/` 与公网 `https://openfolio.uk/bbq/` 返回同一入口文件，`B-081` 已解决）。双端（竖屏 `390×844` / 横屏 `844×390`）全程冻结时钟（钉死 `performance.now` 后仅靠 `__test.tick` 推进）下 `pageerror + console.error = 0`，两端 `window.__build` 一致，静态资产 `tris=16998`、`calls=77`（远低于 `ART-DIRECTION §4` 上限）。本轮深挖 **② 角色移动（含触屏控件核对）/ ④ 烤制→偏老→焦糊全生命周期 / ⑧ 竖屏 HUD 几何与热区**，并复测 **① 首屏、⑩ 控制台**。双轨口径声明：`docs/GAME-DESIGN.md §0/§1` 已于 `2026-11-22 10:06:46Z` 由提交 `311425f` 改定为 **v2（顾客自助点单 → 后台自动备菜 3s → 出菜窗口 3 槽 → 取菜 → 桌边烤 8s → 盛盘，3 击/份，手持唯一）**，目前开发侧 `worktree gameplay-v2` 仅有 `src/game/flow.ts`、`grill.ts`、`customers.ts`、`player.ts` 等 `10+` 文件未提交改动、尚无 commit，仓库 main 亦未落地 `B-156`–`B-162`；**本报告凡属 v1 专有交互的结论均标注「v1 口径，v2 上线后作废」**，引导语义、焦糊容错与 HUD 几何结论则跨版本生效。

| 四问 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房 | 3.2（±0.0） | 对照 `docs/reference/oc1.jpg`–`oc4.jpg`，正交俯视木地板拼缝、一字模块台面、高饱和五花肉/菌子/米线实物料箱与挂牌、Q 版白帽朱红围裙厨师及竹凳方桌在双端清晰成立，且 `tris=16998`、`calls=77` 轻量克制（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）；扣分在竖屏绿檐上方仍露木板、靛蓝扎染布幔截断且右侧 3 号桌与烤炉右端出画，横屏上排厨师头顶受顶缘裁切，且炉上烤串轮廓远弱于 OC 食物读数。 |
| ② 灯光有没有 Saltline 味道 | 3.2（±0.0） | 竖屏暖铜吊灯体积光锥、桌面暖光池、炭火烤炉投向木地板的橙暖湿反与暗暖明暗层次在线（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`）；扣分在横屏吊灯本体出画（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`），且烤制进入 `t≈9.5s` 偏老与 `t≈12.0s` 焦糊全程未见 3D 串体焦黑变色与金/灰烟氛围（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。 |
| ③ HUD 是否整齐 | 3.6（−0.1） | 依实测矩形严格判定：竖屏 3 张订单卡 `184×95`，第 1 行 `y=624`（`x=8/198`，两卡水平间隙 `6px`、无重叠），第 2 行 `y=725`（与第 1 行底 `719` 间隙 `6px`、底 `820` 距视口底 `24px`），`.card-btn` 全 `56×56`（`y=657/758`），卡内字号 `16px`；横屏 4 张卡 `203.8×68 @y=312`（`x=7 / 215.8 / 424.5 / 633.3`，最右 `837.1 < 844`，底 `380` 距底 `10px`，卡间无重叠），按钮全 `56×56`；顶栏 `.topbar` 竖屏 `315.4×36 @(37.3,8)`（底 `44 < 624`）、横屏 `315.4×36 @(264.3,8)`（底 `44 < 312`），与订单卡及首屏 CTA「开店」`156×48 @(117,469.6)` 均零重叠（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）。扣分在顶栏缺目标额 `¥180`（`B-125`）、开局 `data-stars="1"`（`B-106`）、`t≈1.6s` 丢失菜价 `¥48` 且双写「未熟」、`t≈12.0s` 双写「焦糊 焦糊」（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。 |
| ④ 有没有明显缺陷 | 2.9（−0.4） | 双端 `pageerror + console.error = 0`、`B-081` 同包已解决、WASD 空旷点位移正常；但实测坐实四项核心缺陷：① 线上仍跑已被 `GAME-DESIGN §0/§1`（`311425f`）废止的 v1，且 `worktree gameplay-v2` 尚无 commit；② 移动端引导死路——`state().hint = {kind:"station", id:"crate-pork", x:-4.5, z:2}` 与 `actionLabel = "去料箱取料"` 仍指向触屏无法执行的动作（`#bbq-joy` / `#bbq-stick` / `#bbq-act` 全为 `null`）；③ 焦糊同帧 `angry 0→1` + `waste 0→1` 双扣，1 号桌顾客当场 `leaving-angry`、订单卡立即消失且 `tick(1.4s)` 后桌空无重烤入口（双端一致，`B-156` 未上线，`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）；④ `t≈1.6s` 丢 `¥48` 且双写「未熟」、`t≈12.0s` 双写「焦糊」（`B-157` 未上线）。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 3.1（−0.2） | 首屏展示明确规则与唯一 CTA「开店」`156×48 @(117,469.6)`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-01-title.png`）；但进店后 `state().hint` 与 `actionLabel` 仍指 `crate-pork` /「去料箱取料」，而触屏无摇杆/动作键且满屏实体料箱/砧板/烤炉不可交互，叠加顶栏无目标额 `¥180`、开局 `data-stars="1"`、`t≈1.6s` 丢 `¥48` 且双写「未熟」与 `t≈12.0s` 双写「焦糊」（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`），新手预期多处断裂。 |
| 操作手感 | 3.4（−0.3） | 双端 `.card-btn` 均为 `56×56`、字号 `16px`，竖屏停靠底距 `24px`、横屏底距 `10px`，单手点击热区稳定；桌面键盘 `page.keyboard` 按 `900ms` 在空旷点 `(5,-3.5)` 按 D `dx=+0.64`、`(2.5,-3)` 按 S `dz=+2.13`、`(-4,-3.5)` 按 D `dx=+4.80` / 按 S `dz=+0.64` 响应正常（`(0,4.2)` 四点全 `0` 属四面被挡的场景边界）。扣分在手机端无任何移动/动作控件（`#bbq-joy` / `#bbq-stick` / `#bbq-act` 全 `null`）且点站台无反馈，以及焦糊后卡片立刻消失、`tick(1.4s)` 后 1 号桌空桌无「重烤」补救入口（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。 |
| 正反馈（爽感） | 2.7（−0.3） | 本轮深挖烤制中后段至焦糊闭环（v1 口径，v2 上线后作废），暴露出惩罚过猛而过程反馈扁平：`t≈9.5s` 偏老态（`¥48 · 偏老 3s / 快起`）仅靠卡内橙环提醒、3D 烤炉无明显视觉焦变与烟效（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-03-over.png`）；`t≈12.0s` 焦糊飘字仅 `焦糊了`，却在同帧静默双扣 `angry 0→1` + `waste 0→1` 并令 1 号桌顾客即刻 `leaving-angry`、全程 `money 0 / served 0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`），一次失手直接击穿 3★ 容错，挫败感远大于掌控感。 |

### 我能做的（Capability）
- **公网/本机同包稳定运行且零脚本报错（`B-081` 保持解决）**：本机 `http://127.0.0.1:3035/bbq/` 与公网 `https://openfolio.uk/bbq/` 返回同一入口 `assets/index-DNtp-AqZ.js`（`window.__build = "de55a6c-202611220933"`），双端冻结时钟下 `pageerror + console.error = 0`，场景静态开销稳定在 `tris=16998`、`calls=77`。
- **首屏直出与双端单手订单卡停靠区几何达标（v1 口径，v2 上线后作废）**：双端首屏展示两步说明与唯一 CTA「开店」（竖屏 `156×48 @(117,469.6)`）；局内竖屏订单卡 `184×95`（行 1 `y=624`，`x=8/198`；行 2 `y=725`，底 `820` 距底 `24px`）、横屏 4 卡单排 `203.8×68 @y=312`（`x=7 / 215.8 / 424.5 / 633.3`，最右 `837.1`，底 `380` 距底 `10px`），全部 `.card-btn` 为 `56×56`、字号 `16px`，与顶栏 `.topbar`（`315.4×36`，竖屏 `@(37.3,8)` / 横屏 `@(264.3,8)`）零重叠（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）。
- **桌面键盘 WASD 空旷点移动与单卡烤制全段推进可确定性复现**：真实时钟 + `page.keyboard` 按 `900ms` 在 `(5,-3.5)` 按 D `dx=+0.64`、`(2.5,-3)` 按 S `dz=+2.13`、`(-4,-3.5)` 按 D `dx=+4.80` / 按 S `dz=+0.64` 均正常响应；点五花肉 `¥48` 卡 1 次即上炉，冻结时钟下状态依次走完 `t≈0.2s`（`上炉中`）→ `t≈1.6s`（`未熟 · 离熟 3s`）→ `t≈9.5s`（`¥48 · 偏老 3s / 快起`）→ `t≈12.0s`（`¥48 · 焦糊`），双端行为一致（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。

### 我看不懂的（Clarity）
1. **移动端引导指向手机上无法执行的动作**：进店后玩家停在 `(-4,-3.5)` 原地不动，`state().hint = {kind:"station", id:"crate-pork", x:-4.5, z:2}`、`actionLabel = "去料箱取料"`，但 `src/ui/controls.ts` 第 2 行已写明第 32 轮移除了虚拟摇杆与动作键（DOM 中 `#bbq-joy` / `#bbq-stick` / `#bbq-act` 均为 `null`），手机端既不能走位也没有任何「去料箱取料」按钮，点场景里的料箱也无响应（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`）。
2. **烤制中段抹掉菜价、按钮与副行重复词（v1 口径，v2 上线后作废；沿用 `B-157`）**：五花肉 `¥48` 卡在 `t≈1.6s` 变为 `1 / 烤五花肉拼盘 / 未熟 · 离熟 3s / 未熟`，菜价 `¥48` 突然消失且副行与按钮双写「未熟」；到 `t≈12.0s` 变为 `1 / 烤五花肉拼盘 / ¥48 · 焦糊 / 焦糊`，状态词与按钮词同名重复，飘字只写 `焦糊了` 却不交代既扣 `waste` 又扣 `angry`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。
3. **顶栏缺本关目标额且开局即亮 1 星（跨版本有效，沿用 `B-125` / `B-106`）**：顶栏 `.topbar` 双端文案仅为 `第 1 关 / 营业额 / ¥0 / 时间 / 2:50 / 评级`，进局后全程不显示目标额 `¥180`，且零营业额开局 `.stars` 即为 `data-stars="1"`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）。
4. **站台布景与唯一卡片操作形成视觉误导**：画面中五花肉/菌子/米线实物料箱、切配台砧板与刀、炭火烤炉占据核心视野且挂牌醒目，但玩家在手机端既无法走过去也无法点选站台，只能操作底部订单卡，新手容易把纯静态布景误当成可交互工作站（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`）。

### 让我不爽的（Friction）
1. **烤焦一次双扣 `angry` + `waste` 且瞬间赶客清卡、无「重烤」挽救（`B-156` 未上线）**：五花肉 `¥48` 卡推进至 `t≈12.0s` 焦糊当帧，同时触发 `angry 0→1` 与 `waste 0→1` 双扣，1 号桌顾客 2 当场切 `phase="leaving-angry"`、订单卡立刻消失，`tick(1.4s)` 后 1 号桌空桌且无任何「重烤」入口，横屏复现完全一致（`angry 1 / waste 1`、`money 0 / served 0`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`）。这直接导致 `GAME-DESIGN §4` 的 `3★` 条件（`a = 0` 且 `w ≤ 1`）中 `w ≤ 1` 的废料容错形同虚设——只要烤焦 1 份，不仅赔掉订单和食材，还顺带打破 `a = 0` 一票否决满星。
2. **线上玩法与最高优先设计规范持续割裂**：`GAME-DESIGN §0/§1` 已在 `10:06:46Z`（`311425f`）定调为 v2（自动备菜 `3s` → 出菜窗口 `3` 槽 → 取菜 → 桌边烤 `8s` → 盛盘，3 击/份，手持唯一），但线上仍跑旧 v1，且 `worktree gameplay-v2` 的 `10+` 改动文件尚无 commit，`B-156`–`B-162` 全部滞留未交付。
3. **偏老态预警视觉分化不足（v1 口径，v2 上线后作废；沿用 `B-157`）**：`t≈9.5s` 进入 `¥48 · 偏老 3s / 快起` 时，整张订单卡边框与其余 `idle` 卡保持近似浅金细边，且上方新手气泡仍停在「金环亮起就起锅」，3D 炉上亦无冒烟变色提示（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-03-over.png`）。

### 让我想继续玩的（Hook）
- **单手底部停靠区骨架已稳、画面暖调氛围成立**：双端 `56×56` 触控热区、竖屏底距 `24px` / 横屏底距 `10px`、`16px` 卡面字号与 `tris=16998 / calls=77` 的轻量 Saltline 暖光池表现，为即将上线的 v2 单手三击循环打好了扎实的展示与操作底座（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）。
- **补齐 v2 核心节奏与合理容错后潜力明确**：一旦 `worktree gameplay-v2` 落地「出菜窗口 3 槽堆满暂停备菜 + 手持唯一 + 桌边 8s 炭炉」并同步修通焦糊不瞬间赶客、清掉「去料箱取料」死引导、补上顶栏目标额（`B-125`），游戏就会从“静等两击点卡”升级为有真实优先级取舍与翻盘空间的轻量云南夜市经营体验。

### P0 阻塞（不修没法玩）
1) **线上构建 `de55a6c` 仍停留在已废止的 v1 两步循环，v2 核心玩法尚未提交上线（沿用既有 `B-160`、`B-161`，不新开编号）**
   - 现象：线上公网与本机同包 `window.__build = "de55a6c-202611220933"`（`assets/index-DNtp-AqZ.js`）首屏仍写 `点订单卡两步出餐：上炉 → 起锅上菜 | 金色完美窗起锅拿满小费 · 3 个烤位排队`，局内点五花肉 `¥48` 卡 1 次直接占后厨烤位、总长 `12.0s` 焦糊；而 `docs/GAME-DESIGN.md §0/§1` 已于 `2026-11-22 10:06:46Z`（`311425f`）改定为 v2（自动备菜 `3s` → 出菜窗口 `3` 槽 → 取菜 → 桌边烤 `8s` → 盛盘，`3` 击/份，手持唯一），开发侧 `worktree gameplay-v2` 仅存 `10+` 文件未提交改动、尚无 commit。
   - 复现步骤：双端（`390×844` / `844×390`）打开 `https://openfolio.uk/bbq/` 与 `http://127.0.0.1:3035/bbq/`，读取首屏文案与 `window.__build`，开店后核对是否存在 `3s` 自动备菜态、出菜窗口 `3` 槽堆叠与桌边 `8s` 炭炉三击闭环。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`
   - 验收标准：沿用 `B-160`/`B-161`——双端冻结时钟下：(a) 首屏文案切换为 v2 三击口径（含 `取菜`/`烤`/`盛盘`，不匹配 `/两步出餐|3 个烤位/`）；(b) 顾客就座自动 `3s` 备菜并产出至出菜窗口，窗口托盘上限 `<= 3` 且满 3 份暂停后续备菜；(c) 跑通「点窗口取菜（手持期间再点窗口被拦截）→ 点桌卡上桌烤（`8s` 火候条、每桌独立烤盘）→ 盛盘收款（`served === 1 && money > 0`）」固定 3 击链路；(d) 公网与本机同包、双端 `pageerror + console.error = 0`。

### P1 明显缺陷
1) **移动端引导死路：`state().hint` 与 `actionLabel` 仍指引「去料箱取料」，但触屏已无摇杆/动作键且点站台无响应（对应新增 `B-163`，协同 `B-158`）**
   - 现象：进店后玩家位于 `(-4,-3.5)` 原地不动，`state().hint = {kind:"station", id:"crate-pork", x:-4.5, z:2}`、`actionLabel = "去料箱取料"`；但 DOM 实测 `#bbq-joy`、`#bbq-stick`、`#bbq-act` 均为 `null`（`src/ui/controls.ts` 第 2 行注释已写明第 32 轮删除摇杆与动作键），屏幕上不存在任何可让触屏玩家移动或执行「去料箱取料」的控件，引导彻底指向死路。
   - 复现步骤：在竖屏 `390×844` 与横屏 `844×390` 点击「开店」进入局内，查询 `#bbq-joy`、`#bbq-stick`、`#bbq-act` DOM 节点，并读取 `window.__test.state()` 中的 `hint` 与 `actionLabel` 字段；再在触屏视角尝试点击料箱位置观察状态是否变化。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`
   - 验收标准：见 `B-163`——双端进入 `playing` 态并有顾客就座后断言：(a) `JSON.stringify(window.__test.state().hint)` 与 `state().actionLabel` 均不匹配 `/crate-pork|去料箱|取料|切配|装盘/`；(b) `state().hint` 指向当前触屏真实可点击的唯一主入口（v1 为可点订单卡，v2 为可点出菜窗口托盘或目标桌卡）且对应 DOM 按钮存在、可见、可命中点击（尺寸 `>= 48×48px`）；(c) 严禁出现「引导要求执行动作但移动端无对应控件」的不一致，双端 `pageerror + console.error = 0`。
2) **焦糊同帧双扣 `angry` + `waste`、顾客立即离店且卡片消失无「重烤」入口，破坏 `GAME-DESIGN §4` 3★ 容错（对应新增 `B-164`，与既有 `B-156` 合并）**
   - 现象：竖屏点五花肉 `¥48` 卡上炉并冻结时钟推进至 `t≈12.0s` 焦糊，同帧 `angry 0→1` 且 `waste 0→1` 双扣，1 号桌顾客 2 当场切 `phase="leaving-angry"`、订单卡立即消失，再 `tick(1.4s)` 后 1 号桌为空且无任何「重烤」入口（全程 `money 0`、`served 0`，飘字仅 `焦糊了`）；横屏复现完全一致（`angry 1 / waste 1`、卡片消失）。因 `GAME-DESIGN §4` 要求 `3★` 须 `a = 0` 且 `w ≤ 1`（`angry ≥ 3` 锁 `1★`），一次焦糊即同时触发 `angry+1` 与 `waste+1`，直接令 `w ≤ 1` 的 3★ 容错失效（`B-156` 尚未上线）。
   - 复现步骤：双端开店后等待 1 号桌五花肉 `¥48` 卡出现，点击 1 次上炉，冻结时钟 `__test.tick` 依次推进至 `t≈9.5s`、`t≈12.0s` 及焦糊后再 `tick(1.4s)`，记录每步 `state().angry / waste / money / served`、顾客 `phase`、飘字文本与 `#bbq-orders .card` 列表。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`
   - 验收标准：见 `B-164`（合并 `B-156`）——双端冻结时钟下令订单烤至焦糊当帧断言：(a) `state().waste === 1` 且当顾客剩余耐心未归零时 `state().angry === 0`、顾客仍为 `seated`（不直接转 `leaving-angry`）；(b) 焦糊飘字明确写明损耗（如含 `焦糊` 与 `废料` 或 v2 口径下的扣款/耐心变化），订单卡在焦糊留痕后恢复可操作「重烤/重做」入口而非直接清桌；(c) 在重烤完成并达标营业额、`angry === 0 && waste === 1` 时结算星级 `=== 3`；(d) 双端 `pageerror + console.error = 0`。
3) **顶栏全程缺失本关目标额 `¥180`（跨版本有效，沿用既有 `B-125`，不新开编号）**
   - 现象：双端局内顶栏 `.topbar`（`315.4×36`，竖屏 `@(37.3,8)` / 横屏 `@(264.3,8)`）文案仅为 `第 1 关 / 营业额 / ¥0 / 时间 / 2:50 / 评级`，未显示 `¥180` 目标额，离开首屏后玩家在局内看不到进度参照。
   - 复现步骤：双端点击「开店」进入局内，读取 `.topbar` 可见文本并核对是否包含目标额 `180`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`
   - 验收标准：沿用 `B-125`——双端局内 `.topbar` 文本常驻包含 `¥{money}/¥{target}`（第 1 关匹配 `/¥\d+\s*\/\s*¥180/`），`scrollWidth <= clientWidth` 且 `.topbar` 与 `#bbq-orders` 矩形交叠面积 `=== 0`，双端 `pageerror + console.error = 0`。
4) **`raw` 态丢失菜价 `¥48` 且双写「未熟」、`burnt` 态双写「焦糊 焦糊」（v1 口径，v2 上线后作废；沿用既有 `B-157`，不新开编号）**
   - 现象：五花肉 `¥48` 卡在 `t≈1.6s` 显示 `1 / 烤五花肉拼盘 / 未熟 · 离熟 3s / 未熟`（菜价 `¥48` 消失、副行与按钮双写「未熟」）；`t≈12.0s` 显示 `1 / 烤五花肉拼盘 / ¥48 · 焦糊 / 焦糊`（状态词与按钮词同名重复）。
   - 复现步骤：竖屏 `390×844` 对五花肉 `¥48` 卡点 1 次上炉，冻结时钟分别推进至 `t≈0.2s`、`t≈1.6s`、`t≈9.5s`、`t≈12.0s` 读取卡内文本与 `.card-btn` 文本。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-03-over.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-04-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-04-burnt.png`
   - 验收标准：沿用 `B-157`（并约束 v2 桌边烤盘卡 `B-160`）——烤制全周期各采样点卡面文本均匹配 `/¥\d+/`，且副行状态词与按钮词去空白后严格不等（不匹配 `/未熟[\s\S]*未熟|焦糊\s*焦糊/`），双端 `pageerror + console.error = 0`。

### P2 打磨项
1) **站台静态布景与可交互对象视觉混淆（对应新增 `B-165`）**
   - 现象：竖屏与横屏台面排仍高饱和展示五花肉/菌子/米线实物料箱+挂牌、切配台砧板+菜刀与后厨烤炉，但手机端无摇杆/动作键且点击站台零反馈（`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T10-38Z-r35/land-02-orders.png`）；在转向 v2 时须明确压暗非交互后厨布景或将视觉焦点收束到「唯一可交互的出菜窗口 + 每桌炭炉」。
2) **既有可复用打磨项（均沿用旧编号，不新开）**：开局零营业额即亮 `data-stars="1"`（`B-106`，`port-01-title.png`/`port-02-orders.png`）；`docs/GAME-DESIGN.md` 文首导语与 `§2/§5/§6/§7` 仍与 v2 `§0/§1` 冲突（`B-162`）；`docs/ART-DIRECTION.md §5` 订单卡规格过期（`B-159`）；3D 炉上烤串熟/焦变色与烟效缺失（`B-097`，`port-03-over.png`/`port-04-burnt.png`）；竖屏绿檐上方露木板与横屏上排厨师头顶裁切（`B-135`，`port-02-orders.png`/`land-02-orders.png`）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md §0 / §1`（v2 最高优先规则：顾客自助点单 → 后台自动备菜 `3s` → 出菜窗口 `3` 槽 → 取菜 → 桌边烤 `8s` → 盛盘，`3` 击/份，手持唯一；废弃料箱走动/切配台/装盘台/垃圾桶/`stations.ts` 旧语义）**：
  - 线上 `de55a6c` 仍运行已被废止的 v1 两步循环（首屏写「点订单卡两步出餐：上炉 → 起锅上菜 · 3 个烤位排队」），与 v2 存在全链路差距（`worktree gameplay-v2` 尚无 commit，沿用 `B-160`/`B-161`）。
  - 尽管 `src/ui/controls.ts` 已按 `§0/§1` 移除虚拟摇杆与动作键（`#bbq-joy` / `#bbq-stick` / `#bbq-act` 全 `null`），但运行时仍导出 `state().hint = {kind:"station", id:"crate-pork", x:-4.5, z:2}` 与 `actionLabel = "去料箱取料"`，直接违背 `§1` 末尾「已废弃条款：料箱走动取料 / `stations.ts` 旧语义，代码里出现即视为 bug」（对应新增 `B-163`，协同 `B-158`）。
- **`GAME-DESIGN.md §4`（评分公式：`3★` 要求 `r ≥ 1.0` 且 `a = 0` 且 `w ≤ 1`；`angry ≥ 3` 锁 `1★`）**：
  - 实测 `t≈12.0s` 焦糊同帧 `angry 0→1` + `waste 0→1` 双扣并立即令 1 号桌顾客 `leaving-angry`、卡片消失无重烤入口，导致 `w ≤ 1` 的 3★ 废料容错实际不可达（对应新增 `B-164`，合并 `B-156`）；另顶栏缺目标额 `¥180`（沿用 `B-125`）、开局即 `data-stars="1"`（沿用 `B-106`）。
- **`GAME-DESIGN.md §2 / §5 / §6 / §7`（规范文档内部自相矛盾）**：文档正文仍保留「两次点击」「切配 3 次点按」「6.0s 熟 → 12.0s 焦」「切配台/装盘台/垃圾桶」等旧条款，与 `§0/§1` v2 冲突（沿用 `B-162`）。
- **`ART-DIRECTION.md §1 / §2 / §4 / §5`（镜头、布景识别、性能预算与 UI 皮肤）**：
  - `§4` 预算全面达标：实测 `tris=16998`（`≤150k`）、`calls=77`（`≤120`）。
  - `§5` 字号达标（卡内实测 `16px ≥ 13px`），竖屏 `184×95`（底距 `24px`）与横屏 `203.8×68 @y=312`（底距 `10px`）、`56×56` 按钮停靠整齐且与 `.topbar`（`315.4×36`）零重叠，但 `§5` 文本本身仍写着过期的「右上竖排 `top:150px` / 动作键」与 `§1` 摇杆条款（沿用 `B-159`）。
  - `§2` 要求装饰与可交互元素有明确视觉区分，但现版本高饱和料箱/砧板/烤炉在无走位/动作键的触屏模式下与唯一可点卡片形成视觉混淆（对应新增 `B-165`）。

## 2026-11-22 10:20Z 第 34 轮
综合评分：3.4/5（比上轮 3.2 +0.2，公网 `B-081` 首次同包且 `B-152` 根治连点乒乓与飘字糊屏显著拉升稳定性，但 10:06Z 玩法已改口径为 v2 致线上 v1 构建面临规范级重写，且第 2 关盲打目标与结算缺归因/锁关仍未收口）

本节评测对象是仍在线上服务的 **v1（两次点击）构建 `window.__build = "de55a6c-202611220933"`**（入口 `assets/index-DNtp-AqZ.js`，git HEAD `de55a6c`，工作树 clean；本机 `http://127.0.0.1:3035/bbq/` 与公网 `https://openfolio.uk/bbq/` 入口 JS sha256 均为 `9a65664d99bf163525c10d272da04f5bdc13723d6a0fe7675bb6f058fc4ee707` 且 HTTP 200 ⇒ **`B-081` 本轮首次确认已解决**，`B-141` 脏树部署未复现），双端（竖屏 `390×844`、横屏 `844×390`）冻结时钟下 `pageerror + console.error = 0`（仅 2 条既有 Three.js 弃用 warning）。本轮深挖 **① 首屏识别、⑤ 上菜收款营业额、⑥ 耐心归零离店、⑦ 结算与下一关/重玩**，并复测 **⑧ HUD 热区、⑨ 连点、⑩ 控制台**（未覆盖 ④ 焦糊解耦、② 移动）。三条核心发现：① `B-152` 防双击保护已生效，100ms 连点 8 次稳守 1 烤位、`waste 0` 且零飘字堆积，4 客底部停靠区双端与厨师头部交叠全 `0`，5 单 `¥222/¥180` 正常结算 `3★` 并顺滑切入第 2 关；② 信息与体验缺口集中在 `raw` 态抹掉菜价且按钮/状态双写「未熟」、`burnt` 态仍重复 `焦糊 焦糊`（`B-157`）、顶栏缺本关目标额导致进第 2 关（`¥260`）全程盲打（`B-125`）、结算无星级归因且无「回到第 1 关」出口（`B-153`）；③ 拍摄期间仓库 main 于 2026-11-22 `10:06:46Z` 提交 `311425f` 将 `docs/GAME-DESIGN.md §0/§1` 改定为 **v2 三步循环（自动备菜 → 出菜窗口取菜 → 桌边烤 → 盛盘）**，线上 v1 玩法已成被废止版本且 `§2/§5/§6/§7` 与 v2 自相矛盾——**本报告全部 v1 交互结论均按「v1 口径，v2 上线后作废」标注**，仅跨版本通用的 HUD/结算/构图结论在 v2 延续有效。

| 四问 | 分数(1–5，比上轮 ±) | 证据（截图路径 + 本文数字） |
|---|---|---|
| ① 画面像不像胡闹厨房 | 3.2（±0.0） | 对照 `docs/reference/oc1.jpg`–`oc4.jpg`，正交俯视木板拼缝、模块化一字台面、五花肉/菌子/米线实物料箱及斗方挂牌、Q 版白帽朱红围裙厨师与竹凳方桌在双端清晰成立（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`）；扣分在竖屏绿檐上方仍露越界木板与截断靛蓝扎染布幔、右侧 3 号桌与烤炉右半截出画（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-03-grill-perfect.png`），横屏上排餐桌与顾客头顶被视口顶缘裁切（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`、`B-135`），炉上烤串远小于 OC 食物轮廓，且切入第 2 关后场景视觉零变化（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`）。 |
| ② 灯光有没有 Saltline 味道 | 3.2（±0.0） | 竖屏暖铜吊灯体积光锥、桌面暖光池与烤炉前方木地板橙暖湿反层次鲜明（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`）；扣分在横屏吊灯本体出画、烤炉前沿台面高光仍略泛白（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-03-grill-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`），竖屏底部纯黑停靠带生硬截断下方地板暖光，且完美窗烤串仍缺金黄变色与金烟氛围（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-03-grill-perfect.png`、`B-097`）。 |
| ③ HUD 是否整齐 | 3.7（+0.2） | 4 客同屏竖屏 2×2 停靠卡 `184×95`（行1 `y=624`、行2 `y=725`、底 `820` 余 `24px`）、横屏单排 `203.8×68 @y312`（最右 `837.1`、底 `380` 余 `10px`），按钮全 `56×56`，双端与厨师头部投影（`16×28` hitbox）交叠全 `0`；8 次连点零飘字堆积，夹生飘字 `229×34 @(11.9,214.2)` 与订单卡交叠 `0`、收款 `+¥34` 落点洁净，达标结算双按钮双端均 `inView`（竖屏底 `529/587 < 844`，横屏 `299.5/357.5 < 390`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`）。扣分在：① 横屏引导气泡 `91×30.3 @(131,272)` 仍压菌子料箱与挂牌（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-03-grill-perfect.png`、`B-159`）；② `.topbar`（`264.3, 8, 315.4×36`，`z-index 6`、`opacity 1`）在 menu/results 态仍在模糊背景上透出，竖屏与菜单卡（`48.8,299.4,292.4×245.3`）/结算卡（`86,254,218×336`）交叠均为 `0`，横屏未达标结算下仅与 `.bbq-panel .card`（`319, 41.5, 206×307`）顶缘交叠 `515 px²`（切掉约 `2.5px` 高边框），标题 `.bbq-panel h1`（`打烊结算`，`344, 56.5, 156×30`）与顶栏交叠 `0` 且 `elementFromPoint` 命中 `H1|打烊结算` 完好未遮挡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`、`B-133`）；③ 顶栏无目标额（`B-125`）、`用餐中` 卡未降噪沉底（`B-151`）。 |
| ④ 有没有明显缺陷 | 3.3（+0.4） | 公网与本机同包 `de55a6c` 且 `pageerror + console.error = 0`（`B-081` 首次关闭）、`B-152` 根治连点乒乓与糊屏、且 DOM 二次探针证实横屏结算标题 `打烊结算` 完好未遮挡（仅卡片顶缘 `515 px²` 交叠降级 P2）；扣分集中在：① **规范级 P0**：10:06Z `311425f` 已将玩法定调为 v2，但线上 `de55a6c` 仍跑已废止的 v1 两步循环且 `GAME-DESIGN.md §2/§5/§6/§7` 自相矛盾；② **v1 交互与文案瑕疵**（v1 口径，v2 上线后作废）：`raw` 态抹掉菜价 `¥32` 且 `t=1.6/3.8s` 状态与按钮双写 `未熟`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`），`burnt` 态仍重复 `焦糊 焦糊`（`B-157`）；③ **跨版本缺陷**：顶栏缺目标额致第 2 关盲打（`B-125`）、结算 `[data-star-reason]` 为 `null` 且无「回到第 1 关」（`B-153`）、愤怒离店缺顶栏持久失客计数且 `.stars` `innerText` 为空（`B-149`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-06-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-06-angry.png`）。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 3.3（比上轮 3.6 −0.3） | 首屏两步文案清晰、唯一 CTA「开店」`156×48`（竖屏 `@(117,470)`、横屏 `@(344,235)`）醒目，首单引导 `点一下上炉` → `金环亮起就起锅` → 收款后 rect 归 0 自动销毁（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-03-grill-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`）；但本轮深挖暴露四大理解断层：① `raw` 态 `t=1.6/3.8s` 卡面与按钮双写「未熟」且丢失菜价（v1 口径，v2 上线后作废，`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`）；② 进第 2 关全程看不到目标额 `¥260`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`）；③ 结算 `[data-star-reason]` 为 `null`，且重玩只写「再开一局」未指明关卡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`）；④ `burnt` 仍为 `焦糊 焦糊`（`B-157`）。 |
| 操作手感 | 3.7（比上轮 3.2 +0.5） | `B-152` 生效成为本轮最大进步：同卡 `100ms` 连点 8 次仅占 1 烤位（`raw t=0.6`）、`waste 0`、无复制无飘字堆积（v1 口径，v2 上线后作废，`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`）；双端底部 `56×56` 按钮热区舒适、进度环 `svg.cook-ring` `strokeDashoffset` 从 `157.08 → 155.77 → 136.14 → 107.34 → 91.63 → 32.72 → 0` 连续平滑，结算「进入第 2 关」（`165.5×48`）与「再开一局」（`156×48`）切换 `playing, timeLeft=179.8` 干净利落（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`）；扣分在 `t=1.6s` 若因误解「未熟」再点即直接计 `waste 0→1`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`），以及第 2 关失败后缺少回第 1 关出口（`B-153`）。 |
| 正反馈（爽感） | 3.0（比上轮 2.8 +0.2） | 完美窗起锅即时触发满小费收款（米线 `+¥34` = 26+8、菌子 `+¥42` = 32+10、五花肉 `+¥62` = 48+14）与桌面出盘，5 单 `¥222/¥180`、`served 5 / angry 0 / waste 0` 稳拿 `data-stars="3"`，情绪闭环通畅（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`）；扣分在炉上烤串仍无金黄变色与金/灰烟（`B-097`）、愤怒离店顶栏仅维持 `★☆☆` 无持久失客计数（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-06-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-06-angry.png`、`B-149`）、以及第 2 关开局缺乏新目标仪式感与结算星级归因。 |

### 我能做的（Capability）
- **公网/本机首次完全同包且双端零报错（`B-081` 已解决）**：线上 `https://openfolio.uk/bbq/` 与本机 `http://127.0.0.1:3035/bbq/` 均返回 HTTP 200，入口 `assets/index-DNtp-AqZ.js` sha256 均为 `9a65664d99bf163525c10d272da04f5bdc13723d6a0fe7675bb6f058fc4ee707`（git HEAD `de55a6c` clean，`B-141` 未复现），双端全程 `pageerror + console.error = 0`（仅 2 条既有 Three.js 弃用 warning）。
- **首屏直出开店与 4 客底部停靠区零碰撞（v1 口径，v2 上线后作废）**：双端首屏展示两步说明与唯一金色 CTA「开店」`156×48`（竖屏 `@(117,470)`、横屏 `@(344,235)`）；`spawnNow()` 后 `1.65s` 就座出卡，4 客同屏竖屏 2×2 停靠 `184×95`（底 `820`，余 `24px`）、横屏单排 `203.8×68 @y312`（底 `380`，余 `10px`），`56×56` 按钮与厨师头部投影（`16×28`）交叠 `0/0/0/0`，新手气泡 `点一下上炉`（`91×30.3`）→ `金环亮起就起锅` → 首单收款后自动隐藏（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`）。
- **连点防误撤、连续进度环与满小费收款稳定走通（v1 口径，v2 上线后作废）**：`100ms` 间隔连点同卡 8 次仅占 1 烤位（`raw t=0.6`）、`waste 0`、无复制无飘字堆积（`B-152` 验证有效）；`svg.cook-ring` 双端连续推进（`strokeDashoffset` `157.08 → 0`）；完美窗起锅精准给满小费（米线 `+¥34`、菌子 `+¥42`、五花肉 `+¥62`），`t=1.6s` 夹生撤回触发 `waste 0→1`、飘字 `夹生丢弃 · 废料 +1`（`229×34 @(11.9,214.2)`，与订单卡交叠 `0`）且顾客保持在座（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-03-grill-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-03-grill-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-04-served.png`）。
- **耐心离店与达标/失败结算状态流转可靠**：`setPatience(0.15)` 后 2 位顾客转 `leaving-angry`、`angry 0→2`、订单卡清零、双端弹出 2 条「愤怒离店」且顶栏同步 `data-stars="1"` + `aria-label="评级 1/3"`；5 单 `¥222/¥180` 达标结算准确给 `data-stars="3"`，双按钮完整 `inView`，点「进入第 2 关」切入 `level=2, levelTarget=260, timeLeft=179.8`，未达标隐藏下一关按钮且「再开一局」重置 `timeLeft=179.8`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-06-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-06-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`）。

### 我看不懂的（Clarity）
1. **【判断题 1 · v1 口径，v2 上线后作废】点了「上炉」后 `0.6s–4.0s` 卡面写「未熟 · 离熟 3s」、按钮也写「未熟」，玩家真的会以为没点上炉吗？结论：会！** 对照实测时间线：`t=0.1s` 时按钮写 `上炉中` 尚能反馈操作已受理，但一过 `0.6s` 保护窗（`t=1.6s` `未熟 · 离熟 3s / 未熟`、`t=3.8s` `未熟 · 离熟 1s / 未熟`），副行与按钮叠加两个静态负面词「未熟」，虽有 `svg.cook-ring` 缓慢推进（`strokeDashoffset` `155.77 → 136.14 → 107.34`），在快节奏手速下极易误判为“状态未切进去、需再点一次”——结果一补点反而触发 `夹生丢弃 · 废料 +1` 遭到反噬（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`）。v2 桌边 8s 烤盘态必须吸取教训：未熟期按钮应写明进行态（如 `烤制中`）而非复读静态词 `未熟`。
2. **【判断题 2 · v1 口径，v2 上线后作废】`raw` 烤制态卡面抹掉菜价 `¥32`（`idle`/`perfect`/`over` 均有），对玩家预期有无伤害？结论：有明显伤害！** `idle` 显示 `¥32 · 等待`、`perfect` 显示 `¥32 · 完美 4s`、`over` 显示 `¥32 · 偏老 3s`，唯独 `raw` 4 秒里把 `¥32` 整个抹掉只剩 `未熟 · 离熟 4s`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`）。同卡价签忽隐忽现不仅造成视觉跳动，更在多桌并行、玩家权衡“先抢高价五花肉 `¥48` 还是保 `¥26` 米线”及心算营业额缺口时切断了最关键的收益锚点；v2 订单卡须全状态保留菜价。
3. **【判断题 4 · 跨版本有效】顶栏没有本关目标额（只有第 1 关首屏提过一次），进第 2 关（`¥260`）后玩家怎么知道自己还差多少？结论：完全无法得知，整整 3 分钟被迫盲打！** 顶栏仅写 `第 1 关 营业额 ¥0 时间 2:56 评级` / `第 2 关 营业额 ¥0 时间 3:00 评级`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`），点击「进入第 2 关」直接跳过首屏开打，全场既无顶栏 `/¥260` 分母（`B-125`）也无进关目标横幅（`B-155`），玩家直到打烊失败才能事后得知门槛已涨到 `¥260`。
4. **【跨版本与既有项】焦糊重名与顶栏星级语义缺口**：`t=12.0s` 焦糊态仍输出 `1 烤菌子 ¥32 · 焦糊 焦糊`（v1 口径，沿用 `B-157`）；愤怒离店 2 位后顶栏仅维持 `data-stars="1"`（`.stars` `innerText` 为空纯 SVG）且无持久失客计数，玩家看不到距离 `angry ≥ 3` 锁星红线还差几位（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-06-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-06-angry.png`、`B-149`）。

### 让我不爽的（Friction）
1. **【判断题 3】夹生即 `waste +1` 而 3★ 要求 `w ≤ 1`：该改文档还是改代码？结论：v1 语境下应改文档对齐代码，而在已定调的 v2 下两者须同步按 v2 §1 重写！** 实测 `t=1.6s` 夹生撤回触发 `waste 0→1`、`money 0`、`angry 0`、飘字 `夹生丢弃 · 废料 +1`、顾客耐心 `71.85s` 仍在座（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`）。理由：① 在 v1 下，既已落地 `0.6s` 防误双击保护窗（`B-152`），超过 `0.6s` 仍主动撤回生串本就该计 `waste +1` 与 `§4` `w≤1` 形成闭环，若按旧 `§1` 写“退款不扣钱且零废料”反倒纵容零成本退单；故 v1 应改文档而非回退代码。② 但 10:06Z `311425f` 已将唯一有效循环改为 v2（`§1` 写明「早了=夹生（顾客不满，重新烤一次）；晚了=焦糊（扣钱 + 顾客耐心大降）」），v2 落地时必须在 `§1` 与 `§4` 同步写死夹生是否计入 `waste`、焦糊扣多少营业额与多少耐心，确保代码与文档同源不打架。
2. **【判断题 5 · 跨版本有效】结算无归因、无「回到第 1 关」出口，连续失败会否锁死在第 2 关？结论：会实质锁死！** 实测结算面板 `[data-star-reason]` 为 `null`（玩家丢星无从复盘），失败页仅给单个按钮 `再开一局`（`156×48`，未写明「重打第 N 关」）且全程无「回到第 1 关」入口（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`、`B-153`）；一旦过关写入第 2 关进度，新手在第 2 关（`¥260`）连败时只能原地死磕，无法退回第 1 关练手。
3. **横屏新手气泡叠压菌子料箱，首屏/结算 `.topbar` 常驻透出并微切横屏结算卡顶缘**：横屏引导气泡 `91×30.3 @(131,272)` 正好盖在 2 号菌子料箱与挂牌上方（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-03-grill-perfect.png`、`B-159`），同时上排 1/2/3 号桌顾客头顶被顶缘裁切（`B-135`）；另 `.topbar`（`264.3, 8, 315.4×36`，`z-index 6`、`opacity 1`）在 `menu/results` 模态态仍常驻透出在模糊背景上，虽竖屏与菜单卡/结算卡交叠均为 `0`、横屏结算标题 `打烊结算`（`344, 56.5, 156×30`）交叠 `0` 完好未遮挡，但横屏与结算卡片 `.bbq-panel .card`（`319, 41.5, 206×307`）顶缘产生 `515 px²` 交叠（切掉约 `2.5px` 高边框，`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`、`B-133`），观感略显粗糙。

### 让我想继续玩的（Hook）
- **已成立的钩子**：单手底部停靠区零遮挡 + 连点不再误撤（`B-152` 生效）+ 完美窗满小费（`+¥34/+¥42/+¥62`）与 5 单 `¥222/¥180` 拿 `3★` 的完整结算闭环已经顺畅跑通，证明这套温暖云南夜市美术与轻度单手卡片节奏的底层体验是立得住的（`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-04-served.png`）。
- **面向 v2 的下一段钩子**：v1 两步点击虽顺但缺乏“空间往返与窗口堵车”的经营张力——即将落地的 v2 **出菜窗口 3 槽堆满暂停备菜 + 手上只能端 1 份 + 每桌 8s 炭炉盛盘**正好补齐核心时间管理压力；若再配上顶栏目标额进度（`B-125`）、星级归因与选关（`B-153`）及 3D 烤串熟/焦烟效（`B-097`），复玩动力会跃升一个台阶。

### P0 阻塞（不修没法玩）
1) **线上构建 `de55a6c` 仍运行已被 `GAME-DESIGN.md §0/§1`（v2）废止的旧两步玩法，v2 核心循环尚未上线（对应 `B-160`、`B-161`）**
   - 现象：2026-11-22 `10:06:46Z` 仓库 main 新增提交 `311425f` 将 `docs/GAME-DESIGN.md §0/§1` 重写为唯一有效版本 **v2**（顾客自助点单 → 后台自动备菜 3s 环 → 出菜窗口最多堆 3 份/满槽暂停 → 取菜 1 击且手上有菜不能再取 → 桌边烤 1 击 / 8s 火候条 / 烤盘数=桌数 → 盛盘 1 击 → 自动结账与 2s 清桌）；但当前公网与本机线上包 `de55a6c-202611220933` 仍为旧 v1 两步点卡玩法（首屏仍写「点订单卡两步出餐：上炉 → 起锅上菜 / 3 个烤位排队」，局内无 3s 自动备菜环、无出菜窗口 3 槽堆叠及满槽暂停机制、无手持单份约束、无每桌独立 8s 烤盘，且开发侧 `lane/gameplay-v2` 与 `lane/lane-1002` 在拍摄时均未产生提交），导致线上产品与最高优先设计规范彻底错位。
   - 复现步骤：在竖屏 `390×844` 与横屏 `844×390` 访问 `https://openfolio.uk/bbq/` 与 `http://127.0.0.1:3035/bbq/`，读取首屏文案与 `window.__build`，开店生成顾客后检查是否存在自动备菜 3s 态、出菜窗口托盘队列与桌边烤盘交互。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`
   - **验收标准**：双端（`390×844` / `844×390`）冻结时钟下：(a) 首屏文案切换为 v2 三步口径（包含 `取菜`、`烤`、`盛盘`，不含 `两步出餐` / `3 个烤位排队`）；(b) 顾客落座自动进入 `3s` 备菜态并产出至出菜窗口，窗口托盘上限恒 `<= 3` 且满 `3` 份时 `[data-window-full="true"]` 触发并暂停后续备菜；(c) 完成「点窗口取菜（手持期间再点窗口被拦截）→ 点桌卡上桌烤（启动 `8s` 火候条且每桌独立烤盘）→ 火候到点盛盘 → 自动结账与 `2s` 清桌」固定 3 击闭环，`served === 1 && money > 0`；(d) 公网与本机同包、双端连跑 3 次 `0` JS error。

### P1 明显缺陷
1) **结算面板缺星级归因、无「回到第 1 关」出口致连败锁死第 2 关，且重玩按钮未指明当前关卡（沿用既有 `B-153`，跨 v1/v2 均有效，不新开编号）**
   - 现象：实测达标与未达标结算面板 `[data-star-reason]` 均为 `null`（玩家无法获知丢星原因与 3★ 门槛）；失败结算仅提供单一按钮「再开一局」（`156×48`），既未指明「重打第 N 关」，全场亦无「回到第 1 关」按钮，过关写入第 2 关进度后在第 2 关连败会被单向锁死。
   - 复现步骤：双端打完第 1 关达标（`¥222/¥180`）与未达标（`¥0/¥180`，`angry=1`）结算，查询 `[data-star-reason]` 与 `[data-back-lv1]`，再点击「进入第 2 关」并在第 2 关触发失败结算观察按钮清单。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`
   - **验收标准**：沿用 `B-153`——(a) 结算面板必显 `[data-star-reason]`（非空、`scrollWidth <= clientWidth`、字号 `>= 13px`），按 `stars.ts` 规则输出明确归因；(b) 重玩按钮文案明确为 `重打第 N 关` 且高度 `>= 44px`；(c) `level > 1` 时结算页展示可点击的 `[data-back-lv1]`（「回到第 1 关」），点击后同帧 `state().level === 1 && state().levelTarget === 180`；(d) 横屏 `844×390` 所有按钮 `rect.bottom <= 382`，双端连跑 3 次 `0` JS error。
2) **顶栏全程缺失本关目标额，切入第 2 关（`¥260`）后玩家整局 3 分钟盲打（沿用既有 `B-125` + `B-155`，跨 v1/v2 均有效，不新开编号）**
   - 现象：顶栏仅显示 `第 1 关 营业额 ¥0 时间 2:56 评级`（`315.4×36 @y8`），点击「进入第 2 关」跳过首屏后 `level=2, levelTarget=260`，顶栏与局内均无任何 `¥260` 目标提示。
   - 复现步骤：双端达标第 1 关后点击「进入第 2 关」，检查 `.topbar` 与全页可见文本是否包含 `260`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-08-next.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-08-next.png`
   - **验收标准**：沿用 `B-125`——双端局内顶栏常驻显示 `营业额 ¥{money}/¥{target}`（第 1 关含 `/¥180`，第 2 关含 `/¥260`），`scrollWidth <= clientWidth` 且不溢出视口宽，双端连跑 3 次 `0` JS error。
3) **`docs/GAME-DESIGN.md §2/§5/§6/§7` 与文首导语仍停留在 v1/旧五步口径，与 `§0/§1`（v2）严重自相矛盾（对应 `B-162`）**
   - 现象：提交 `311425f` 仅重写了 `§0/§1` 为 v2，但同一文档文首导语仍写「上炉 → 起锅上菜 两次点击」，`§2` 仍写「切配：需 3 次点按」「6.0s 熟 → 12.0s 焦」「桌子 4s 后可再坐」，`§5` 仍列「垃圾桶 / 料箱×3 / 切配台 / 炭火烤炉(3位) / 装盘台」，`§6` 仍写「点订单卡 `.card-btn` 两次——上炉、起锅上菜」，`§7` 仍写「切：台面上的串跳切 + 进度环」，直接与 `§1` 末尾“代码里出现即视为 bug”的已废弃条款冲突，极易误导 `lane/gameplay-v2` 实现与后续验收。
   - 复现步骤：通读 `docs/GAME-DESIGN.md` 第 1–111 行，对照 `§0/§1` 与文首导语、`§2/§5/§6/§7`。
   - 截图路径：规范文档冲突（实机体现为旧 v1 界面 `/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-02-orders.png`）
   - **验收标准**：见 `B-162`——`docs/GAME-DESIGN.md` 除「已废弃条款」保留声明段外，正文（文首导语 + `§2/§5/§6/§7`）不再出现「切配：需 3 次点按」「两次点击」「6.0s 熟」「桌子 4s 后可再坐」「切配台/装盘台/垃圾桶（非废弃声明）」等冲突项，且与 `§0/§1` 数值逐项一致（备菜 `3s` / 窗口 3 槽 / 桌边烤 `8s` / 清桌 `2s`）。
4) **订单卡 `raw` 态丢失菜价且状态/按钮双写「未熟」、`burnt` 态仍重复 `焦糊 焦糊`（v1 口径，v2 上线后作废；焦糊重名沿用 `B-157`，设计约束并入 `B-160`）**
   - 现象：冻结时钟下同一烤菌子卡在 `idle/perfect/over` 均展示 `¥32`，但在 `t=0.1/1.6/3.8s`（`raw`）完全丢失 `¥32`，且 `t=1.6/3.8s` 副行与按钮均写 `未熟` 易让玩家误判没点上炉；`t=12.0s`（`burnt`）仍输出 `1 烤菌子 ¥32 · 焦糊 焦糊`。
   - 复现步骤：竖屏 `390×844` 对烤菌子卡上炉并冻结时钟采样 `t=0.1s / 1.6s / 3.8s / 5.0s / 9.5s / 12.0s` 卡内文案与按钮文案。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-05-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-09-raw-pull.png`
   - **验收标准**：在 v2 桌边烤盘卡片（`B-160`）与 v1 既有 `B-157` 中均强制断言：(a) 订单卡全状态（含未熟烤制期）文本匹配 `/¥\d+/`，菜价不消失；(b) 卡面状态词与按钮词去空白后严格不等（禁 `未熟 … 未熟`、`焦糊 焦糊`），双端连跑 3 次 `0` JS error。

### P2 打磨项
1) **首屏/结算态 `.topbar` 常驻透出 + 横屏结算卡顶缘交叠 `515 px²`（沿用既有 `B-133`，从 P1 降级）**
   - 现象：`.topbar`（`264.3, 8, 315.4×36`，`z-index 6`、`opacity 1`、`display flex`）在 `menu/results` 态按 `hud.ts` 既定取舍保持常驻，在模糊背景上透出；竖屏与菜单卡（`48.8,299.4,292.4×245.3`）及结算卡（`86,254,218×336`）交叠均为 `0`，横屏未达标结算下 `.bbq-panel h1`（`打烊结算`，`344, 56.5, 156×30`）与 `.topbar` 交叠 `0` 且 `elementFromPoint(h1 中心)` 命中 `H1|打烊结算`（标题完好未被压切），仅与 `.bbq-panel .card`（`319, 41.5, 206×307`）顶缘产生 `515 px²` 交叠（切掉约 `2.5px` 高边框）。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T09-38Z-r34/land-07-results.png`
   - **验收标准**：沿用 `B-133`——模态态隐藏 `.topbar`（`display === 'none'`）或横屏下移结算卡使 `.topbar` 与 `.bbq-panel .card` 交叠面积 `=== 0` 且底按钮 `rect.bottom <= 382`，双端连跑 3 次 `0` JS error。
2) **既有可复用打磨项（均沿用旧编号，不新开）**：愤怒离店顶栏缺持久失客计数且 `.stars` `innerText` 为空（`B-149`，`port-06-angry.png`/`land-06-angry.png`）；横屏引导气泡 `91×30.3 @(131,272)` 压菌子料箱及 `ART-DIRECTION.md §5` 过期（`B-159`，`land-02-orders.png`/`land-03-grill-perfect.png`）；`用餐中` 卡未视觉降噪沉底（`B-151`，`port-04-served.png`/`land-04-served.png`）；状态机与 `__test.state()` 废弃五步死语义（`B-158`）；3D 炉上串体熟/焦变色与烟效缺失（`B-097`）；横屏上排顾客头部裁切（`B-135`）。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN.md §0 / §1`（v2 最高优先规则：顾客自助点单 → 后台自动备菜 3s 环 → 出菜窗口最多堆 3 份/堆满暂停 → ③ 取菜 1 击且手上有菜不能再取 → ④ 上桌烤 1 击/8s 火候条/烤盘数=桌数 → ⑤ 盛盘 1 击/夹生重烤/焦糊扣钱+耐心大降 → ⑥ 自动结账+清桌 2s）**：线上构建 `de55a6c` 仍停留在已被废止的 v1 两步点卡循环，与 v2 存在 **全链路差距**——
  - **步骤 ①②（自动备菜与出菜窗口）**：线上无「备菜中 3s 环」与「出菜窗口」UI/3D 实体，更无「最多堆 3 份、堆满暂停后台备菜」的核心压力机制（对应 `B-161`）。
  - **步骤 ③（取菜与手持唯一约束）**：线上直接点订单卡上炉，无「点出菜窗口托盘取菜」动作、无「手上有菜不能再取」的唯一排序约束，角色亦无自动走位抱菜表现（对应 `B-160`）。
  - **步骤 ④（上桌烤、8s 火候条与每桌独立烤盘）**：线上仍共享后厨 3 个烤位（首屏写「3 个烤位排队」），火候总长 `12s`（4/9/12s），未按 v2 改为「烤盘数 = 桌数（每桌自带炭炉）+ `8s` 桌边火候条」（对应 `B-160`）。
  - **步骤 ⑤⑥（盛盘判定与 2s 清桌）**：线上 `t=1.6s` 夹生直接计 `waste+1`（v2 要求夹生为顾客不满重烤），焦糊未实现「扣钱 + 耐心大降」的新惩罚口径，且清桌仍非 v2 规定的 `2s`（对应 `B-160`）。
  - **已废弃条款未彻底清理**：状态机与布景仍残留 `stations.ts` 旧语义与料箱/切配台/装盘台/垃圾桶（沿用 `B-158`，并入 `B-160` 清理）。
- **`GAME-DESIGN.md` 文首导语与 `§2 / §5 / §6 / §7`（文档内部自相矛盾）**：`311425f` 仅改了 `§0/§1`，导致文首导语（「上炉 → 起锅上菜 两次点击」）、`§2`（「切配：需 3 次点按」「6.0s 熟 → 12.0s 焦」「桌子 4s 后可再坐」）、`§5`（场地排布含垃圾桶/料箱×3/切配台/3 位烤炉/装盘台）、`§6`（「点订单卡 `.card-btn` 两次——上炉、起锅上菜」）、`§7`（「切：台面上的串跳切 + 进度环」）全部与 `§0/§1` 冲突，须通过 `B-162` 一次对齐。
- **`GAME-DESIGN.md §3 / §4`（关卡目标与星级展示）**：5 单达标局 `¥222/¥180, served 5, angry 0, waste 0` 准确评 `3★`，公式层面吻合 `§4`；但局内顶栏缺失目标额（`B-125`）、结算面板缺少 `[data-star-reason]` 归因与「回到第 1 关」（`B-153`）、愤怒离店缺少顶栏持久失客计数（`B-149`）。
- **`ART-DIRECTION.md §1 / §5`（镜头边界与 UI 皮肤）**：① `§1` 要求「可见地面永远落在 12×9m 世界里」，但竖屏绿檐上方仍露越界木板、横屏上排顾客头顶裁切（`B-135`）；② `§5` 订单卡规格仍停留在旧版「右上竖排、`top:150px`、横屏 `max-width 168px`」及 `§1` 摇杆尺寸，已严重过期且未覆盖即将到来的 v2 出菜窗口区（沿用 `B-159`）；③ 模态态 `.topbar` 仍以 `opacity 1` 常驻透出并在横屏与结算卡 `.bbq-panel .card` 顶缘交叠 `515 px²`（约 `2.5px` 边框，标题 `打烊结算` 交叠 `0` 完好未遮挡，属 P2 沿用 `B-133`）。
