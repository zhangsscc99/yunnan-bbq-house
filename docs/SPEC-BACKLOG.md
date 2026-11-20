# SPEC / BACKLOG — 柳真真云南烤肉

规则：一条一个小交付；做掉的写 `[done <hash>]`，不要删行。
来源优先级：P0 阻塞 → 走查 review 的 P1 → 本表 P1 → P2 打磨。

## P0（阻塞/死路）

- [done 1511938] **公网 /bbq 502：端口错配**（2026-11-20 14:00 发现）
  - 修复：全仓 3031→3035；`server/index.js` 在 `/` 直接回 index.html（portfolio-proxy 会把 `/bbq/` 重写成 `/`，否则 302 死循环）。公网 `/bbq/` 连跑两次 200、asset 200、`/bbq/api/health` 200。
  - 遗留：`portfolio-proxy` 的 `isFrontendNavigation` 判据缺 `!isBbq`，属代理侧脏代码，本轮按只读约束未动，建议单独一轮修 proxy（改完可撤掉后端 `/` 兜底）。
  - 事实：portfolio-proxy 的 `BBQ_URL` = `127.0.0.1:3035`；但 `server/index.js` 默认 `PORT=3031`、`ecosystem.config.cjs` `PORT='3031'`、`ci-deploy.sh` 健康检查打 3031。
  - 3031 已被 Saltline（pm2 saltline-ref）占用，yunnan-bbq 从未成功起进程，`https://openfolio.uk/bbq/` 返回 502。
  - 修法：全部改 3035，`pm2 start ecosystem.config.cjs` + `pm2 save`，双次 curl 200。

- [done 7908be2] **出生点与设计不符**（2026-11-20 15:19Z 部署，第 2 轮走查实测验证）
  - `PLAYER_SPAWN` → cell (3,4) 世界 (-2.5,0)，距最近 usePos 1.44m；闲置按钮常亮 + 按下弹 2s `#bbq-guide` toast（不消耗输入）。`git show 7908be2` 含 e2e/spawn.mjs 断言，旧 spawn 上验证过会挂。
  - 第 2 轮走查（15:49Z）在公网 `index-DqBNZH4C` 复测：spawn (-2.5,0)、min dist 1.442、开局按钮 opacity 1、guide toast 文本写入 ✓。**撤销第 1 轮的「单个大按钮语义不可见」P0 记录**——闲置语义现在是可点引导。

- [done 2401f14] **世界内「下一步去哪」指引标记**（2026-11-20 14:41 本轮）
  - `nextTarget()`（stations.ts）返回目标 `{kind,id,pos}`；`state().hint` 可断言；金色脉冲环 +1 draw call。
  - 验证：`npx tsc --noEmit` + `npm run build` 通过；`node e2e/smoke.mjs` 对公网部署产物连跑两次 SMOKE OK（hint 序列 料箱→切配台→烤炉→装盘台→桌→料箱）；calls 81/tris 8798。
  - 遗留 → 见 P0 新条目「竖屏看不到指引标记」。

- [ ] **竖屏看不到指引标记（本轮新发现）**：`e2e/shots/hint-spawn-portrait.png`（390×844，开局）里没有任何标记——料箱在相机视锥外，
  标记跟着目标一起出画。手机竖屏是主设备，等于指引对新手无效。
  建议：① 目标出屏时改在屏幕边缘画一个方向箭头（DOM/HUD 层，随相机角度旋转）；② 或竖屏相机改为更俯视/更大 FOV，让料箱区一开局就在框内。断言：竖屏开局截图里标记（或其边缘箭头）可见 + `state().hint.onScreen === true|false`。

- [ ] **单个大按钮语义不可见**：`resolveInteraction()` 在没靠近站点时返回 `mk('none','')`，玩家得不到「该去哪」的指引；走查日志里出现「站在店里 label 空 / 站烤炉旁却显示『烤制中…』」两种状态混叠，容易误判为「点了没反应」。（14:00 复核：烤炉分支逻辑本身正确，需真机再验证是否是输入节流问题）

## P1（体验）

- [ ] **切配连点丢输入**：走查日志 `chop` 步骤连点 3 次后进度仍为「切配 1/3」（`cap3="切配 1/3"`）。`flow.act('chop')` 每次减 1 且无节流，怀疑是 E2E 点击过快/未命中按钮热区。需要一次真机 Playwright 慢速连点复现，确认是验收脚本问题还是输入丢失。
  - **复核（第 1 轮走查，14:37Z）：非产品缺陷，撤单（别派工）。** 连续点 5 次并**每次等两帧 rAF 后读数**，`chopLeft` 3→2→1→0→chopped 完整推进、第 5 次成功拿起熟串；症状来自“低帧率下按钮文案落后一帧”，在软件渲染（≈2–5fps）时读数过早。验收脚本一律用 `await rAF×2` 再断言 HUD 文案，数值断言直接读 `__game`。
- [ ] **顾客耐心归零离店**的反馈只有 0.6s 红怒符号，缺少「-1 满意度」的 HUD 飘字，玩家不会意识到扣分。
- [done 2026-11-20 14:37Z 走查轮] **缺 docs/PRODUCT-REVIEW.md**：已建立，格式=每轮「四问打分 + 三体验维度 + P0/P1/P2（带验收标准）+ 与 SPEC 条款差距」，历史保留最近 5 轮。

## P2（打磨/工程）

- [ ] `.gitignore` 增加 `e2e/review/`、`e2e/shots/`、`dist/`、`server/dist*`、`data/`，否则每轮都留下未跟踪截图噪音。
- [ ] THREE 控制台警告：`THREE.Clock deprecated`（改 `THREE.Timer`）、`PCFSoftShadowMap has been removed`。
- [ ] 性能基线（390×844 竖屏）：calls 219 / tris 10824 / programs 15 — 尚可，继续克制。

---

## 走查追加需求（B 编号，第 1 轮 2026-11-20 14:37Z）

### B-001 竖屏烤制反馈可读化
优先级：P1
来源：第 1 轮走查（390×844 下烤炉进度条投影仅 16×2px、串 19×1–4px，`vision` 两次判定“看不到进度条/看不清熟度”，玩家只能掐秒表）
需求：烤位进度条改为屏幕空间恒定尺寸（或按 `1/projScale` 反向缩放 ≥60×6px）；`grillT≥6` 串材质转金 + 站点上方飘金色烟 + 一声“叮”；`grillT≥12` 转黑 + 深灰烟 + `stage=waste`。
【第 2/3 轮复测未修】第 3 轮（17:40Z，bundle `index-DqBNZH4C.js`）在 `stage='cooked', t≈9.6` 截帧，双端 vision 均判「看不到金黄/烟/进度条，像刚放上去的生肉」；同一产物第 3 次复现。
验收：Playwright 在 390×844 取 `grillT=0.1/4.6/9.3/13` 四帧，断言进度条屏幕宽 ≥60px、`item.stage` 依次 chopped→chopped→cooked→waste，且 cooked 帧的串材质 hex 与 raw 帧色相差 ≥10；截图人工复核一遍。
参考：胡闹厨房 2 煎锅（进度环 + 冒烟转黑），GAME-DESIGN §7。

### B-002 顾客气泡屏幕边界钳制
优先级：P1
来源：第 1 轮走查（竖屏 3 位顾客时左缘气泡 `x=-63, w=84`，只露出 21px「菌子」残字，像渲染错误）；**第 2 轮复现并加重**：t3 客气泡整块出画（x=425 > 视口 390），vision 只数出 2 个气泡（port-22），见 B-013
需求：`hud.updateBubbles` 里对投影点做钳制 `x∈[8, W-8]`（气泡按自身宽度再收一次边），或顾客不在视野内时整块隐藏；「正在进店」的顾客不要显示完整订单气泡，只显示一个“→”指示。
验收：断言所有 `.bubble` 的 `rect.left ≥ 0 && rect.right ≤ innerWidth`，竖屏/横屏各 3 单同屏跑一遍；E2E 连跑 3 次无 flake。
参考：Overcooked 的离屏指示箭头。

### B-003 出生点与开局引导
优先级：P1
来源：第 1 轮走查（出生点 (0.5,1.2) 距烤炉 usePos (1,1.5) 仅 0.58m，落在 1.15m 判定圈内，开局按钮是灰的「去料箱取料」，点它零反馈）
需求：出生点与所有站点 `usePos` 保持 >1.15m（建议 (6, 5.0)），并同步修改 GAME-DESIGN §5 的数字使其与 §6 判定半径不冲突；开局 3 秒在料箱上方打一个世界空间脉冲标记 + 按钮显示「去料箱取料」且**可点**（点击后给一次“这里要先走过去”的提示，而不是静默）。
验收：`__test.state().action === 'none'` 且开局按钮 `opacity === '1'`；距每个 `usePos` 的欧氏距离 >1.15；点击开局按钮后 300ms 内出现引导提示（截图 + DOM 断言）。
参考：Overcooked 教学关的第一步高亮。

### B-004 竖屏镜头：食材尺寸下限
优先级：P1
来源：第 1 轮走查（ART §1 portrait 8.3×18m 忠实执行 → 1m 格 47px，单串 19px，角色 ~60px；ART §2 的“食材可读”只在亮度上满足、尺寸上不满足）
需求：竖屏改为“近景 + 纵向跟随”（可视高 ≤12m），或对食材/串做最小像素尺寸保障（屏幕空间缩放下限）；ART §1 的 portrait 参数同步修订，避免文档与手感互斥。
验收：390×844 下角色屏幕高 ≥90px、单串 ≥34px、仍能一屏看到 ≥2 张餐桌；`__perf.calls` 不因缩放上升 >10%。
参考：Overcooked 移动版竖屏裁切（近景 + 边缘箭头）。

### B-005 部署单一事实来源（端口/实例）
优先级：P0（已止血，防复发）
来源：第 1 轮走查（13:37Z–14:28Z 公网 502 约 50 分钟：仓库默认 3031 被 Saltline 的 pm2 serve 占用，proxy 指 3035；`pm2 list` 里没有 yunnan-bbq）
需求：端口只在 `ecosystem.config.cjs` 定义一次，`server/index.js`/`ci-deploy.sh`/文档全部读它（或读同一 `.env`）；`ci-deploy.sh` 健康检查打 proxy 实际使用的端口；`pm2 save` 后校验只有一个 yunnan-bbq 实例。
验收：`pm2 delete yunnan-bbq && bash scripts/ci-deploy.sh` 在干净环境一把过（DEPLOY OK），随后 `curl /bbq/` 与 `curl 127.0.0.1:3035/api/health` 均 200；人为占用 3035 时脚本必须失败并回滚，不许静默。**注意**：公网 `/bbq/api/health` 目前被 proxy 的 SPA 兜底吃掉（返回 index.html，200 假阳性），健康检查只能打本机端口，或先修 proxy 把 `/bbq/api/*` 直通。
参考：本轮 502 事故时间线（PRODUCT-REVIEW P0-1）。

### B-006 阴影接口与 THREE 警告清零
优先级：P2
来源：第 1 轮走查（控制台 6 条 warning：`THREE.Clock deprecated`、`PCFSoftShadowMap has been removed`、swiftshader GL stall）
需求：`THREE.Clock` → `THREE.Timer`；阴影类型按 r187 可用枚举（`PCFShadowMap` + `shadow.radius`/`blurSamples`）实现 ART §3 期望的柔边；保留 swiftshader 那条（环境噪音，白名单过滤）。
验收：控制台 THREE 相关 warning = 0；阴影边缘软化 ≥2px（截图对比）。

### B-007 切配长按连切
优先级：P2
来源：第 1 轮走查（切一串要 5 次点按：放上砧板 1 + 切 3 + 取回 1，节奏比 OC 的“按住切”重）
需求：砧板上按住动作键 ≥0.25s 后按 0.22s/次自动推进（保留单点=切 1 刀的老路径）；完成后按钮自动变为「取回切好的串」。
验收：`pointerdown` 保持 1s 后 `chopLeft` 归 0 且 `stage=chopped`；单点仍只减 1；连跑 3 次无重复触发。

### B-008 HUD 字号基线
优先级：P2
来源：第 1 轮走查（`#bbq-act .cap` 10px、订单卡 `.pr` 11px、顶部 `.k` 12px，均低于 ART §5「HUD ≥13px」）
需求：caption 12px + 图标 28px，订单卡次级文字 12px，顶部 `.k` 13px；窄屏（<360px）才降到 11px。
验收：`getComputedStyle` 断言在 390×844 下 ≥12px（正文 13px），且顶部栏不换行、不超出 96vw。
参考：ART-DIRECTION §5。

### B-009 首屏加载骨架
优先级：P2
来源：第 1 轮走查（软件渲染下首帧 6–17s 纯黑；真机基线未知）
需求：`index.html` 内置骨架（店招 + 炭火闪烁点 + “正在生火…”），首帧 `__game` 就绪后淡出；真机上量一次冷启动 TTI 记入 docs。
验收：`domcontentloaded` 后 200ms 内可见骨架；`__game.phase==='menu'` 时骨架已移除；真机 TTI ≤3s。
参考：TECH-STACK §3 移动端 30fps 旁注。

### B-010 菜单黑板与遮阳篷细节
优先级：P2
来源：第 1 轮走查（菜单黑板字与底几乎同明度＝装饰；左上遮阳篷/布幔边缘锯齿破碎）
需求：黑板字提亮到 ≥4.5:1 对比；扎染/篷布边缘加 1px 描边或改用整块几何，去掉破碎锯齿。
验收：截图取色对比度 ≥4.5:1；`vision` 判定“看得到三行菜名”；边缘无破洞。
参考：ART-DIRECTION §2 云南元素清单。

---

## 走查追加需求（B 编号，第 2 轮 2026-11-20 15:49Z）

### B-011 订单卡就座触发 + 耐心环持续刷新
优先级：P1
来源：第 2 轮走查（顾客就座等待 5s 内连续 5 次同步读 `#bbq-orders .card` 全为空；卡片只在上菜/愤怒事件后才出现——`setOrders` 仅在 spawn/serve/angry 时被调，`walking-in→seated` 迁移不发 `onOrders`，等待期也无周期刷新；port-25-natural-orders.png 有客就座右上无卡，port-23 上菜后才出现）
需求：顾客进入 `seated` 时触发 `ev.onOrders`；等待期耐心环按帧（或 ≥1s 一次）刷新 dashoffset；`patience<25%` 时卡变红。
【第 3 轮复测未修】17:40Z 双端各跑一遍：竖屏 10 次采样（每 0.4s）全部 `cards=0`，横屏 1 次采样 0，容器 rect 宽高 0。注意仓库存在一份未提交、未部署的 `flow.ts`（`ordersT` 周期刷新）正对应本条，部署后必须重跑本条再标 done。
验收：e2e 断言——顾客就座 0.5s 内 `#bbq-orders .card` 数量 === 就座人数；同一张卡 2s 内 dashoffset 至少变化一次；`setPatience(10)` 后卡带 `.angry`；连跑 3 次无 flake。
参考：GAME-DESIGN §1「订单(1 道菜 + 耐心条)」、§5 ART 订单卡规格。

### B-012 「下一关」假解锁：出真 Lv.2 或改文案
优先级：P1
来源：第 2 轮走查（¥183 通关 → “目标达成，解锁下一关！”+「下一关」可点 → 点击后 timeLeft=180/目标 ¥180 与第 1 关完全相同；`localStorage.bbq.level` 被写为 2 但全仓无读取方——承诺不存在的内容，port-27/28 截图）
需求：二选一——①真出 Lv.2（读取 `bbq.level`，目标/客流/耐心中的一项提升，config 里加 LEVELS 表）；②M1 保持单关，则结算文案改「目标达成，再来一局挑战高分！」，「下一关」按钮删除，且不写 `bbq.level=2`。
【第 3 轮复测未修】17:40Z：pass 后点「下一关」→ `phase=playing`、`timeLeft=180`、`localStorage.bbq.level='2'`，关卡参数与第 1 关完全相同（`panels.ts` 的 `next` 与 `replay` 绑同一个 `onReplay`）。
验收：e2e 断言——pass 后点主按钮进入的关卡参数与上一关不同（①），或 pass 文案不再含“解锁下一关”且 `localStorage.getItem('bbq.level')` 为 null（②）；不得出现“文案承诺 X、行为是 Y”的组合。
参考：GAME-DESIGN §3（M1 仅 1 关、面板预留按钮）。

### B-013 离屏顾客/订单指示箭头
优先级：P1
来源：第 2 轮走查（竖屏 3 客同时：t3 客气泡 rect x=425 > 390 视口，整块不可见，vision 只数出 2 个气泡；顾客本体 x=9.4 也在视锥外——玩家完全感知不到第 3 单）
需求：顾客（或其气泡）投影出画时，在 HUD 层沿屏幕边缘画一个方向箭头 + 菜名缩写；箭头随相机角度旋转。与 B-002（气泡钳制）配套：气泡钳到屏内仍看不见时用箭头。
验收：竖屏 3 客场景截图，`vision` 判定能看到 3 个“单据指示”（气泡或箭头）；e2e 断言每个 `seated/walking-in` 顾客要么气泡 rect 在视口内、要么存在对应边缘箭头元素。
参考：Overcooked 移动版离屏指示；B-002、B-004。

### B-014 HUD 计时改 flow 驱动（去 setTimeout）
优先级：P2
来源：第 2 轮走查（hud.ts popup 900ms、guide 2000ms 用 `setTimeout`，违反 TECH-STACK §4「一切走 flow.update(dt)，setTimeout 禁止」；e2e 同步 tick 断言时 window 未走帧，时序不可控）
需求：`Hud` 增加由 main 循环调用的 `update(dt)`，内部计时器数组管理 popup 生命与 guide 显隐。
验收：`grep -n "setTimeout" src/ui/*.ts` 为 0；popup 0.9s 消失、guide 2s 消失行为不变（用 `__test.tick` 同步断言可见性，不再依赖真实时间）。

### B-015 动作键 caption 完整显示菜名
优先级：P2
来源：第 2 轮走查（`#bbq-act .cap` font-size 10px + max-width 66px，“上菜 烤五花肉拼盘” scrollWidth 83 > clientWidth 66 → 省略号“上菜 烤五花肉…”，玩家看不全端的是哪道菜）
需求：caption 允许两行（或按文本加宽至 ≤120px），字号 12px 起（与 B-008 合并做）；上菜语义下优先显示菜名，“上菜”二字可省略（图标已表达）。
验收：390×844 下 `cap.scrollWidth ≤ cap.clientWidth` 对全部 6 种动作文案成立；`getComputedStyle.fontSize ≥ 12px`；按钮不遮挡场景主体（rect 高度 ≤ 88px）。

---

## 走查追加需求（B 编号，第 3 轮 2026-11-20 17:40Z）

> 第 3 轮线上产物与第 2 轮是同一 bundle（`index-DqBNZH4C.js`），B-001/B-011/B-012 均第 2 次复测未修，证据见 PRODUCT-REVIEW 第 3 轮。以下为新增条目。

### B-016 扎染布幔/辣椒串的挂点与收边（装饰被读成渲染错误）
优先级：P1
来源：第 3 轮走查（竖屏 `port-03`/`port-06` 左上区域，3 次独立 vision 含 260×220 放大复核，分别判为「渲染错误或穿模」「两端硬斜切、悬空像被裁掉的贴图」「红色虚线完全悬空像粒子残影」；与第 1 轮 B-010 的遮阳篷锯齿同源，但这次是**被误读为 bug**）
需求：布幔改为从墙面/横梁向下垂的形式（上沿有可见连接、两端不外露硬斜切、加 1px 描边）；辣椒串增加可见挂绳接到上方结构；低角度看过去不得悬空。
验收：竖屏放大截图里布幔上沿与结构有可见接触、无硬斜切断口；辣椒串有挂绳；vision 复核不再出现「悬空/渲染错误/贴图残留」判定；ART §2 云南元素清单不变。
参考：ART-DIRECTION §2 云南元素清单。

### B-017 世界空间交互图标要"看起来不像按钮"
优先级：P2
来源：第 3 轮走查（`land-07` 玩家脚边绿色下箭头、`port-03` 角色上方金边圆钮，vision 都读成 UI 按钮/悬浮控件——玩家会去点它，点不到）
需求：把"最近可交互站点"的提示改为地面高亮环 / 台面描边，或在图标与台面之间加一根细杆/连接线；禁止使用带圆角描边的"按钮"造型。
验收：双端截图 vision 复核，不再把场景内提示描述为"按钮"；交互提示 DOM 元素数 = 0（提示为世界空间几何）。
参考：Overcooked 的目标高亮（地面圈 + 台面描边）。

### B-018 结算面板响应式（矮屏/安全区）
优先级：P2
来源：第 3 轮走查（`land-08` 844×390 下结算面板纵向几乎顶满视口，vision 判"上下余量极小"；带浏览器工具栏或刘海安全区会裁掉按钮）
需求：面板 `max-height: calc(100dvh - 24px - env(safe-area-inset-bottom))`，内容超出时面板内部滚动，两按钮固定可见。
验收：844×320 与 390×700 两个视口下，`下一关`/`再开一局` 的 rect 均完整落在视口内且可点；面板无横向溢出。
参考：移动端结算面板安全区实践。

### B-019 星级公式对异常数据的防御
优先级：P2
来源：第 3 轮走查（脚本注入 `money=200` 后结算显示「3★ / 服务顾客 0 位 / 营业额 ¥200」，公式 `r≥1 且 a=0 且 w≤1` 不看 `served`，数据异常时会输出自相矛盾的结算）
需求：`served===0` 时不得给 3★（最高 2★），并在控制台打一条 `console.warn`；若将来接入存档/调试入口，避免"零服务满星"外溢。
验收：`money=200, served=0` 的结算星级 ≤2★；正常路径星级不变（回归第 2 轮的 3 单案例仍 2★/3★ 正确）。
参考：GAME-DESIGN §4。

### B-020 真机复核：HUD 动作文案与动作状态同帧一致
优先级：P2（真机若复现则升 P1）
来源：第 3 轮走查（软件渲染 ~2fps 下，带生串站在砧板静置 0.7s，读到 `action='none' / label='手上有东西'`，但同位置点按可正常放上砧板；怀疑是 HUD 每帧更新 + 采样过早）
需求：先用真机/60fps 环境各测 10 次（传送到砧板后 0.3/0.5/1.0s 各读一次），确认是否真存在"文案落后于可执行动作"；若存在，把 `currentAction` 改为动作求解时即时写入 DOM，而不是每帧 polling。
验收：真机 10 次采样中 `label` 与实际执行结果一致率 100%；连续 3 次跑批无 flake。
参考：TECH-STACK §4（反馈走 flow 事件）。
