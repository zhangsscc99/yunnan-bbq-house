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

- [done 27ac9b8 + 47ec0ad] **订单卡在顾客就座等待期间永不出现**（走查第 2 轮 P1-1，2026-11-20 17:20Z 部署）
  - 修：`flow.update()` 里 `ordersT` 累加 ≤0.25s 节流刷新 `onOrders`，并在 `walking-in→seated` 当帧立即触发一次（纯 dt 计时，无 setTimeout）。
  - 连带修（17:40Z 部署）：竖屏 ≤430px 订单列下移 46px（`#bbq-orders { top: calc(safe-area + 46px) }`），解决订单卡常驻后压住居中状态条右端星级的问题。
  - 验收：`e2e/orders.mjs` 四条断言（就座当帧卡片数=座位数、§耐心环 1.2s 内 dashoffset 变化、<25% `.angry`、竖屏 390×844 + 横屏 844×390 状态条与卡片矩形不相交且间隙 ≥8px、卡片右端 ≤ innerWidth-6），对公网产物连跑 3 次全 PASS，0 JS 错误；smoke 仍 OK（92 calls / 10808 tris）。

- [ ] **切配连点丢输入**：走查日志 `chop` 步骤连点 3 次后进度仍为「切配 1/3」（`cap3="切配 1/3"`）。`flow.act('chop')` 每次减 1 且无节流，怀疑是 E2E 点击过快/未命中按钮热区。需要一次真机 Playwright 慢速连点复现，确认是验收脚本问题还是输入丢失。
  - **复核（第 1 轮走查，14:37Z）：非产品缺陷，撤单（别派工）。** 连续点 5 次并**每次等两帧 rAF 后读数**，`chopLeft` 3→2→1→0→chopped 完整推进、第 5 次成功拿起熟串；症状来自“低帧率下按钮文案落后一帧”，在软件渲染（≈2–5fps）时读数过早。验收脚本一律用 `await rAF×2` 再断言 HUD 文案，数值断言直接读 `__game`。
- [done 838bc9e + 016fae3 + 1b7899f] **切配阶段零可见反馈**（走查第 6 轮 P1-1，2026-11-20 22:40Z 部署）→ **B-030**
  - 修：新增屏幕空间 HUD 层 `#bbq-chop`（照 `#bbq-grillbars` 的投影做法）：砧板上方 64×8 进度条 + 13px 状态字 `切配 0/3 → 1/3 → 2/3 → 已切好 ✓`，`pointer-events:none`、出屏/空板隐藏；砧板表面新增 3 道刀痕（`__game.cuts[i].visible` 随刀数出现，取走后清零）；删除旧 world-space `src/game/progressBar.ts`。
  - 验收 `e2e/chop.mjs`（竖屏 390×844 + 横屏 844×390，`E2E_RUNS=3` 连跑三次）：fill 33.3/66.7/100%、文案、刀痕 1/2/3、条 64×8、字 13px、框全在视口内且不与 `#bbq-act`/`#bbq-stick` 重叠、取走后 `display:none`、0 JS error，末行 `CHOP OK`；draw calls 81（改前 78，+3 ≤ 预算 4）。
  - 脚本坑：`locator.click('#bbq-act')` 在 swiftshader（≈1–5fps）下永远等不到"stable"→ 改 `page.touchscreen.tap(中心点)`；同 browser 开第 2/3 个 page 会崩（`SharedImageManager… non-existent mailbox`）→ 每页独立 browser + 仅对 `has been closed` 类环境崩溃重试 2 次（断言失败不重试）。
- [ ] **顾客耐心归零离店**的反馈只有 0.6s 红怒符号，缺少「-1 满意度」的 HUD 飘字，玩家不会意识到扣分。
- [done 2026-11-20 14:37Z 走查轮] **缺 docs/PRODUCT-REVIEW.md**：已建立，格式=每轮「四问打分 + 三体验维度 + P0/P1/P2（带验收标准）+ 与 SPEC 条款差距」，历史保留最近 5 轮。

## P2（打磨/工程）

- [ ] `.gitignore` 增加 `e2e/review/`、`e2e/shots/`、`dist/`、`server/dist*`、`data/`，否则每轮都留下未跟踪截图噪音。
- [ ] THREE 控制台警告：`THREE.Clock deprecated`（改 `THREE.Timer`）、`PCFSoftShadowMap has been removed`。
- [ ] 性能基线（390×844 竖屏）：calls 219 / tris 10824 / programs 15 — 尚可，继续克制。
- [ ] **烤位烟柱可见化**（B-001 遗留，18:16Z 实测）：`grill.update` 已把熟后烟放大到 0.24 并转暖金 `0xd9a743`，但 390×844 截图 vision 复核仍判「看不到烟，只有灯光光晕」。
  建议：烟改屏幕空间精灵（按 `1/projScale` 反向缩放，屏幕高 ≥24px）+ 提高 opacity 到 0.85 + 沿 Y 慢速上升 ≥1.2s；焦后转深灰。
  验收：竖屏 `t=6` 与 `t=12` 两帧，烟体屏幕高 ≥24px，且 cooked 帧烟色与背景 ΔE > 8；`vision` 复核能指出「有烟」。

---

## 走查追加需求（B 编号，第 1 轮 2026-11-20 14:37Z）

### B-001 竖屏烤制反馈可读化
优先级：P1 → **done 7f065bf（2026-11-20 18:16Z 提交 / 18:25Z 部署，bundle `index-DzBLNDVh.js`）**
修法：新增屏幕空间 HUD 层 `#bbq-grillbars`（`hud.updateGrill`，世界坐标投影 + 64×8px 恒定像素条 + 12px 状态字「烤制中 Ns / 已熟 ✓ / 焦了 ✗」，空位与出屏即隐藏）；
`grill.slots[i].hex` 只读暴露；熟串 GOLDEN 混合提到 0.88 + 金色自发光，烟放大到 0.24 并转暖金，焦后转 `0x4a4540`。
实测（`e2e/grill.mjs`，本地 3035 产物连跑 3 次全 PASS，0 flake）：竖屏条 **64×8px**、字 12px、徽标全在视口内、`pointer-events:none`；
`t=4.6`→「烤制中」、`t=9.3`→「已熟 ✓」且 hex `#e8907b→#cd8e3a` 通道差 **94**、`t=12.6`→「焦了 ✗」 hex `#241d18`、取走后 `display:none`；横屏同样 64×8；0 JS error；draw calls 75（改前 78，未上升）。
遗留：**金色烟雾在截图上仍不可辨**（vision 复核只看到灯光光晕）→ 转 P2「烟柱可见化」。
**[done 13d6158 / 2026-11-20 20:10Z 部署 bundle `index-Cp4XgwTC.js`] 熟度条语义修正 + 焦糊预警**（走查第 4 轮 P1-1）：
`gb-fill` 宽度改 `min(1, t/grillTime)`（熟即 100%，实测 100%）；`gb-mark` 移到条右端（实测 left 62/64 = 97%）当熟成目标线；
新增 `warn` 态 `t ∈ [10,12)`：文案「快焦了 Ns」+ `.warn` class + 1s 闪烁动画 + fill 转橙红 `rgb(255,122,26)`（done 金 `rgb(240,192,96)`、burnt 暗红 `rgb(142,42,28)` 三态可区分）；burnt 文案「焦了 ✗」、fill 100%、warn class 移除。
验收：`e2e/grill.mjs` 新增 A5–A7，公网产物完整 PASS 2 次（draw calls 75 未变）；另因宿主机 swap 打满（并发走查脚本 + swiftshader）出现多次 chromium 启动期崩溃（失败均在渲染首帧，非断言），3 连跑稳定性待负载回落后复测。
原来源：第 1 轮走查（390×844 下烤炉进度条投影仅 16×2px、串 19×1–4px，`vision` 两次判定“看不到进度条/看不清熟度”，玩家只能掐秒表）
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

### B-012 「下一关」假解锁：出真 Lv.2 或改文案 — [done ec7b59d，2026-11-20 23:16Z 部署]
> 实现方式（①真 Lv.2）：`config.LEVELS` 两关（Lv.1 ¥180/[12,20]s；Lv.2 ¥260/[9,15]s），flow 持 `level/cfg`，所有数值读 `this.cfg`；
> `nextLevel()` 只在 pass 且 level<2 时推进并写 `bbq.level`，`endLevel` 不再写 key；结算文案「目标达成，进入第 2 关」/ 最后一关「全部关卡通关！」且不渲染主按钮；HUD 顶部新增「第 N 关」；`__test.state()` 增 `level/levelTarget`。
> 实测（公网 index-CPTSS25a）：开局 level=1/target=180/HUD「第 1 关」→ pass 点主按钮 → playing/level=2/target=260/timeLeft=180/`bbq.level=2`；Lv.2 通关结算「全部关卡通关！」无主按钮、`nextLevel()` no-op；预置 `bbq.level=2` 新开页面 → level=2、HUD「第 2 关」、首屏「第 2 关 · 目标：3 分钟营业额 ¥260」，0 page error。
> 遗留：`e2e/levels.mjs` 第 4 段（同 context 新页重载）在本机软件渲染 + load≥11 时页会被浏览器进程带走（`Target page closed`），产品行为已用独立脚本证实；低负载时该段 PASS（23:57Z 第 3 次连跑通过 a–d）。
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

---

## 走查追加需求（B 编号，第 4 轮 2026-11-20 18:45Z）

> 线上 bundle 换成 `index-DMVhbfI8.js`。本轮确认三条老 P1 **真的修好了**（有 DOM 实测，不是"看着像修了"）：
> - **B-001 关闭（余一处语义问题转 B-021）**：烤炉有 `#bbq-grillbars`，`gb` 76×34 @(110,428)、`gb-bar` 64×8、`gb-txt` 12px，文案 `烤制中 6s`→倒计时→`已熟 ✓`；阈值实测 `4.9 chopped / 7.3 cooked / 12.1 waste`。
> - **B-011 关闭**：`walking-in` 当帧出卡；3 客时 3 张卡 `x=238 w=142`、`y=54/109/165`、`off:false`。
> - **B-012 关闭**：未达标 `下一关 disabled=true`；达标 enabled 且点击后 `phase=playing / timeLeft=179.9 / bbq.level=2`。
> 证据：`e2e/review/2026-11-20T18-45Z-r4/`（`bars-port.json`、`serve-port.json`、`d2-port.json`）。

### B-021 熟度条三态语义（已熟/快焦/焦了）
优先级：P1
来源：第 4 轮走查（`stage='cooked'` 时 `gb` 文案已是「已熟 ✓」，但 `gb-fill` 只填 46/64px=72%，`gb-mark` 刻度落在 50%；vision 判"提示与进度不一致"；`t` 从 10s 到 12s 之间没有任何警示，玩家第一次烤就把串烤成 `waste`）
需求：把"熟"与"焦"拆成两个可视状态：`t≥6` 进度条填满或点亮独立"熟"刻度并保持金色；`t∈[10,12)` 进入"快焦了"态（条转橙红 + ≥1Hz 闪烁 + 文案「快焦了」）；`t≥12` 文案「焦了」+ 串体/烟转暗。
验收：三段截图 `gb-fill` 宽度与颜色可区分（熟 ≥95% 金色 / 快焦 橙红闪烁 / 焦 暗灰）；`gb-txt` 三段文案互不相同；连跑 3 次无 flake。
参考：Overcooked 煎锅的火候条；GAME-DESIGN §7。

### B-022 订单卡价格含小费（或拆解小费）
优先级：P2
来源：第 4 轮走查（`DISHES.pork.price=48`、`tipRate=0.3`，上菜实测飘字 `+¥60`=48×1.25；卡片与飘字都不提小费，玩家无法预测收入，也学不到"上得快=多拿钱"）
需求：订单卡显示 `¥48 + 赏`，或飘字拆两段（`¥48` 白 + `赏 ¥12` 金）；结算"营业额"行附一句"含小费 ¥X"。
验收：390×844 下卡片 `¥48+赏` 不溢出（`scrollWidth ≤ clientWidth`）；上菜飘字 DOM 同时包含基础价与小费两个数字；结算面板出现"含小费"字样。
参考：GAME-DESIGN §2（售价表）+ `config.tipRate`。

### B-023 顶部「评级 ★★★」语义澄清
优先级：P2
来源：第 4 轮走查（营业额 ¥0、一单未出时顶部就常显三颗 ★，与结算星级并存；玩家分不清是"目标星级"还是"当前预计"）
需求：改成"目标 ★★★"或在星级前加 label；若做预计星级，则按当前 `money/目标 + angry/废料` 实时点亮空心星。
验收：开局 HUD 文本包含「目标」或星形为空心态；`money` 变化时星形可见变化（≥1 颗）；结算星级与 HUD 预计星级口径一致（同一函数）。
参考：GAME-DESIGN §4。

### B-024 顾客气泡与订单卡一一对应
优先级：P1
来源：第 4 轮走查（3 客在店：订单卡 3 张全带菜名，气泡只有 1 个菜名 + 2 个「…」；vision 判"气泡归属略不直观"，玩家无法把气泡和卡对上）
需求：`walking-in` 阶段气泡也显示菜名（或"?"→入场动画结束后立刻换菜名），并让气泡与对应订单卡共用同色描边/序号（1/2/3）。
验收：3 客场景下 `#bbq-bubbles` 菜名气泡数 === `#bbq-orders .card` 数；color/序号可一一映射；vision 能说出"3 个气泡分别属于哪张卡"；与 B-002/B-013（屏边裁切/离屏箭头）一起过。
参考：Overcooked 订单气泡与顶部订单条的同色编码。

---

## 走查追加需求（B 编号，第 5 轮 2026-11-20 19:07Z）

> 线上 bundle `index-DzBLNDVh.js`（仓库 `dist/` 为 `index-Cp4XgwTC.js`，**仍不一致**）。
> 本轮首次用 **CDP `Input.dispatchTouchEvent` 真手指** 走查（此前是 `page.mouse`），并做了「完美玩家」上限压力测试：
> bot 瞬移打满 180s = **11 单 / ¥575**（横屏 11 单 / ¥487），0 愤怒 0 废料 → 主循环无卡死点，¥180 目标可达且偏宽松。
> 回归确认：烤糊→垃圾桶 `waste 0→1`、耐心自然归零→`angry 1`→结算「愤怒离店 1 位」、未达标 `下一关 disabled=true`、真手指 tap 结算「再开一局」→ `phase=playing/timeLeft=178`。

### [done 691fffa + 82cffeb, 2026-11-21] B-025 相机必须夹紧到世界边界，横屏不得露出世界外虚空
优先级：P1
修法（`691fffa`，`src/config.ts` + `src/core/cameraRig.ts`）：`CAMERA` 新增 `worldHalfW=GRID.cols/2=6`、`worldHalfD=GRID.rows/2=4.5`、`portraitHalfH=9`；`resize()` 横屏 `halfH = min(worldHalfW/aspect, worldHalfD*sin(pitch))`、竖屏 `halfH = min(9, worldHalfW/aspect)`；`updateCam()` 对 lookAt 目标夹紧 `x ∈ ±max(0, worldHalfW-halfW)`、`z ∈ ±max(0, worldHalfD - halfH/sin(pitch))`（视野比世界大时锁定居中）；`ART-DIRECTION §1` 取景公式已同步重写。
实测（`82cffeb`，本地 4175 产物连跑 2 次全 OK）：竖屏 390×844 与横屏 844×390 各 5 帧（出生点 + `teleport(±5,±4.5)` 四角），**全部帧「左右暗区 0px / 最大连续暗列 0」**；横屏左 160 列亮度均值 **93–100**（改前 28.0）。验收脚本 `e2e/camera-clamp.mjs`，跑法：`E2E_BASE=http://127.0.0.1:4175/bbq/ xvfb-run -a node e2e/camera-clamp.mjs`。
来源：第 5 轮走查（844×390 开局左起 157 列纯黑；`__test.teleport(-5,5)` 后扩到 258 列 ≈31% 屏宽，硬直竖切；vision 判「像分辨率没适配、世界只渲染在右上角」）
需求：`ART-DIRECTION §1` 的 `halfH = clamp(max(4.8, 6.8/aspect), 4.8, 9)` 在 844×390 给出 ≈20.7×9.6m 视野，而世界只有 12×9m → 横屏天生多出 ~8.7m 空域。二选一：① 相机 lookAt 目标按 `worldBounds ± halfW/halfH` 夹紧（世界比视野小时锁定居中）；② 在世界外补可读背景（街道/围墙/树，非纯色）。两端口径一致，并同步修订 ART §1 的公式使其与 12×9m 自洽。
验收：双端 + 4 个角落位置（`teleport(±5,±4.5)`）截图，逐列亮度均值**不存在连续 ≥24px 且 <26 的近黑列**；`npx tsc --noEmit` 通过；draw calls 仍 ≤120。
参考：Overcooked 关卡外始终有可读场景边界。
> **时序更正（2026-11-21）**：第 11 轮报的「clamp 后横屏仍有 30.7% 纯背景空区」跑在**修复部署前的旧 bundle `index-BfQV-0D9.js`** 上（修复 `691fffa` 直到 02:59 才以 `index-ChCgL6cA.js` 部署公网），**不是** 691fffa 的回归。
> 02:59 部署后公网 `https://openfolio.uk/bbq/` 844×390 实测（`teleport` + `tick(0.05,44)`，CDP 截图逐像素统计）：出生点 bg (28,20,16) 占 **0.1%**、左 160 列均值 102.2 / 右 108.6、最大连续暗列 **0**；SE (5,4) bg **0.4%**、左 93.5 / 右 100.0、暗列 0；NW (-5,-4) bg **0.1%**、左 101.3 / 右 100.8、暗列 0；0 JS error。
> 验收口径以 `e2e/camera-clamp.mjs` 为准；后续若再报空区，先确认线上 bundle 是否为 `index-ChCgL6cA.js` 或更新。

### [done dd628f5 / 2026-11-20 21:15Z 部署 bundle `index-DKNOBCz4.js`] B-026 上错菜必须有出路指引（错菜 → 垃圾桶）
优先级：P1
修法：`stations.ts` 抽出 `matchingGuest()`，`nextTarget()` 的 `plated` 无匹配顾客时返回 `bin`（不再 null）；`nextHint()` 加 `hasGuest` 参数 → 「去垃圾桶丢掉」；错桌边按钮文案 `这桌要的是 烤菌子 · 去垃圾桶丢掉`（别桌有人点则「· 送去别桌」）；`flow.ts` 的 `discard` 对 `plated` 也 `waste+1`。
验收实物：`e2e/wrong-dish.mjs` 四条（A1 hint.id=bin / A2 按钮含「丢」/ A3 discard 后 waste 0→1 / A4 正确菜 hint=t2 且「上菜」）对公网产物连跑 2 次全 PASS、0 JS error；`smoke.mjs` 回归 OK（67 calls / 8674 tris）；tsc+build 通过。
来源：第 5 轮走查（端烤五花肉走到点菌子的客桌：按钮 `action='none'`/opacity .55/文案「这桌要的是 烤菌子」，走开则退回「送去客桌」，`state().hint === null`，全程无「丢」字样）
需求：`nextHint()` 在 `plated` 且当前无匹配 `seated` 顾客时返回「去垃圾桶丢弃」；`#bbq-act` 在错菜状态下给一次 2s toast（复用 `#bbq-guide`）说明"这盘没人要，去垃圾桶丢掉"；`discard` 接受 `plated` 并计 `waste`。
验收：e2e 断言——错菜状态下 `state().hint.id === 'bin'`；按钮或 toast 文本含「丢」；走到垃圾桶按一次后 `carrying=null && waste+1`；连跑 3 次无 flake。
参考：Overcooked 的"丢弃"通用交互；GAME-DESIGN §6 单键语义表。

### B-027 焦糊的画面级表现（变黑 + 灰烟 + 音效）
优先级：P1
来源：第 5 轮走查 `port-07`（`stage=waste`、`t=16.3`，画面有「焦了 ✕」但串体仍偏白、无黑痕、无灰烟；vision：「主要依赖文字提示」3/5）。与 `B-001` 关闭时声称的"焦后转 `0x4a4540`"不符
需求：`t≥burnTime` 时串材质整体压到近黑（相对生串取色 ΔE>20）、停止金色自发光、烟精灵转深灰并加浓（屏幕高 ≥24px）；配一声"糊了"提示音（若音频系统未就绪，先在 backlog 记挂起）。
验收：三段截图（生/熟/焦）串体取色 ΔE 可区分且焦段 ΔE>20；盲测 vision 只看图能说出"这串糊了"；`state().waste` 逻辑不变。
参考：GAME-DESIGN §7「烤焦：变黑 + 灰烟」；Overcooked 煎锅起火前的黑烟。

### B-028 难度与目标值：¥180 偏宽松，需要真人基准
优先级：P2
来源：第 5 轮走查 bot 上限（瞬移 + 零失误 = 11 单 ¥575，为目标的 3.2 倍；真人按 1/3 效率估 ≈¥190）
需求：先拿一次真人基准（不是 bot）：同一台手机、同一个 180s、记录出单数与营业额；若真人 ≥2.5 倍目标，则把目标提到 ¥240 或把时长压到 150s，并在首屏文案同步。**没有真人基准前不要改数值。**
验收：走查报告里记录至少 1 组真人（或非瞬移、按真实步行速度 3.2 m/s 的脚本）数据；改值后 e2e 断言结算面板目标文本与 `config.LEVEL` 一致。
参考：Overcooked 星级按"订单数 × 难度"给，不按固定营业额。

### B-029 e2e 约定：DOM 断言一律 rAF×2 + 以 `__game` 数值为准
优先级：P2
来源：第 5 轮走查（软件渲染 1–2fps 下 `#bbq-act` 文案比 `state().action` 滞后一次交互；`locator.click()` 因逐帧重排被 Playwright 稳定性检查卡死超时，而 `touchscreen.tap()` 一次命中）
需求：把这条写进 `docs/TECH-STACK.md §4` 的 e2e 约定并落成一个 helper（`readHudAfterFrames(sel, n=2)`）；禁止用 `locator.click()` 点游戏内 HUD，改用 `touchscreen.tap(rect.center)`。
验收：新增/修改的 e2e 脚本 0 处 `locator.click()` 点 HUD；连跑 3 次稳定；helper 有注释说明原因。
参考：本仓 `e2e/orders.mjs` 注释「低帧率下按钮文案落后一帧」。

> 第 6 轮（20:37Z）新增。剧本覆盖 ③ 取料/切配 ④ 烤炉 ⑤ 装盘上菜 ⑧ 竖屏 HUD（三单同屏几何）⑩ 控制台；双端 4 次独立运行 JS error 0，线上 bundle 与 `dist/` 一致。

### B-030 切配反馈可读化（刀痕 + 进度条 + 切菜音效）
优先级：P1
来源：第 6 轮走查（`chopLeft 3→2→1→0` 数值正确、按钮文案 `切配 0/3→1/3` 也正确，但砧板/串/刀像素**零变化**；`port-03`/`land-02` 两次 vision 均判「看不见进度条或刀痕」；`src/game/progressBar.ts` 的世界空间 sprite 在 390×844 下实际不可辨）
需求：每成功切一刀给出三重反馈——① 串体形态变化（分段/被切开的角度）② 砧板旁屏幕空间进度条（复用 `.gb` 规格 64×8 + 12px 文本，`hud.updateChop()`）③ 一声短促刀响（音频系统未就绪时先挂起，不阻塞 ①②）。同时把 `.cap` 字号提到 13px（并入 `B-008`）。
验收：e2e 断言——每按一次 `#bbq-act` 后 `#bbq-chopbar .fill` 宽度单调递增，且 `#bbq-chopbar` 在视野内 `display!=none`；三段截图（0/1/3 刀）串体取色或轮廓有可见差异；vision 盲测只看图能说出"切了 2 刀"；连跑 3 次无 flake。
参考：Overcooked 切菜的"每刀一次"手感（刀痕 + 小块飞出 + 音效）。

### B-031 上菜收钱必须有可见正反馈，并与卡片金额对齐
优先级：P1
来源：第 6 轮走查（装盘→到桌→按「送去客桌」：`money 0→59`、`served 0→1`、顾客 `eating`；但 400ms 采样 `#bbq-popups .popup` 数为 **0**，`port-10` vision「没有 +¥48、金币飞出、营业额跳动」；卡片 ¥48 vs 实收 ¥59 差额无解释。与 `B-022` 同源，本条补"飘字必须先出现"的机器断言）
需求：① `serve` 事件必须在 200ms 内于餐桌上方生成 `.popup.money`（文本 `+¥59`，字号 ≥17px，抬升动画后淡出，时长 ≥900ms）② 营业额数字同步做一次 1.15 倍放大回弹 ③ 订单卡金额文案改为「¥48 · 含小费」或 `¥48–¥62` 区间，与 `tipRate` 自洽。
验收：e2e 用 `MutationObserver` 抓 `#bbq-popups` 子节点，断言上菜后出现 `.popup.money`、文本正则 `/^\+¥\d+$/`、`left/top` 落在餐桌屏幕投影 ±60px 内；`#bbq-hud .money` 在上菜帧发生 class 变化；vision 只看图能读出"收到 59 元"。
参考：Overcooked 上菜的金币飞出 + 音效。

### B-032 横屏 HUD 不得压在世界外区域
优先级：P2
来源：第 6 轮走查（`land-08` vision 量测右侧 x≈730→844 纯黑 114px ≈13.5%；同帧 `#bbq-orders` x=692..834、`#bbq-act` x=742..818 全部落在黑区上，vision 判「按钮悬在虚空里，HUD 缺统一安全边距」）
需求：在 `B-025`（相机夹紧/补背景）之外，HUD 侧再做一层保险：横屏时若世界实际渲染宽度 < 视口宽，订单卡与动作键贴到**实际世界区域**的内缘（由 `__test` 暴露 worldRect），而不是贴视口边缘。
验收：`teleport(±5,±4.5)` 四角 × 双端共 8 帧，脚本断言 `#bbq-orders`/`#bbq-act` 矩形内采样 5 点均非纯色（亮度 >26）；vision 不再出现"按钮浮在黑底上"的描述。
参考：`B-025`；Overcooked 关卡外始终有可读边界。

### B-033 烤制阶段的参与感：翻面 / 撒料小游戏
优先级：P2
来源：第 6 轮走查（`grillTime 6s / burnTime 12s`，从放上到取下中间**零操作**，5 个炉位同时烤时玩家只能看进度条；`land-07`/`port-07` 无任何"该翻面"的提示）
需求：烤制 6s 内出现 1 次"翻面"窗口（连续 3s），期间按钮短暂切为「翻面」（不打断手上的其他动作：用第二指/或按钮长按 0.2s 触发）；不翻面则熟后直接进入 `waste` 的概率 +40%。同时给「快焦了」加一次短促提示音（已有 `B-021` 三态文案）。
验收：e2e 断言——不翻面时 `stage` 由 `cooked` 直落 `waste` 的概率在 20 次采样中 ≥7 次；翻面后 20 次采样 0 次直落；按钮在窗口期 `actionLabel` 含「翻面」；连跑 3 次稳定。
参考：Overcooked 2 煎锅/烤架的翻面手感；`B-012`（本项目自己的编号已用于「下一关假解锁」，本条为新编号）。

### B-034 `spawnNow` 与 `maxDiners=3` 的一致性复核
优先级：P2
来源：第 6 轮走查（三单同屏测量时连续 `spawnNow('pork'|'mushroom'|'mixian')`，每步 `tick(0.05,30)`，结果只坐进 **2** 位、`mixian` 未出现，`GAME-DESIGN §4` 声明 Lv.1 上限 3 位）
需求：先定位是 `spawnNow` 绕过了 `trySpawn` 的表冷却判断，还是 `freeTables()` 在三客时的边界问题；若为设计（上限 2），改 `GAME-DESIGN §4` 与 `LEVEL.maxDiners` 二选一。
验收：e2e 断言 `spawnNow` 返回 `true` 时 500ms 内 `customers.length` 递增 1，连续 3 次后 `customers.length===3` 且 `#bbq-orders .card` 数为 3；或文档与 `config.LEVEL.maxDiners` 一致。
参考：`GAME-DESIGN §4` 关卡表。

---

## 走查追加需求（B 编号，第 7 轮 2026-11-20 22:47Z）

> 线上 `server/dist` bundle `index-DKNOBCz4.js`（21:15Z 部署）；仓库 `dist/` 21:34Z 被并行 dev cron 重建成 `index-CB3xEvNT.js` 未部署（部署滞后，非回归）。
> 本轮专项：首屏/入口 ①、摇杆 ②、三档分辨率 HUD 安全区与热区 ⑧、结算与「下一关」⑦、控制台 ⑩。
> 环境：load 10–16、软渲染 1–2fps、冷启动 55–72s → **本轮不评首屏时延**，只评版式与信息传达；JS error 1 条（favicon 404）。

### B-035 时间积分不得因 `dt` 钳制而慢于现实（低帧率时间膨胀）
状态：**[done(主体) 345d802 + 5d0b201，2026-11-21 01:31Z 部署，bundle `index-BfQV-0D9.js`；残留见 B-052]**
优先级：P1
来源：第 7 轮走查（真手指拖摇杆 2.0s → 角色位移 **2.19m**；按 `GAME-DESIGN §6` 的 3.2 m/s 应为 6.4m，有效速度仅 **1.1 m/s / 34%**。根因 `src/main.ts` 的 `dt = Math.min(clock.getDelta(), 0.1)`：5fps 时每帧只推进 0.1s → 游戏时钟 0.5×，2fps 时 0.2×。结果：低端机上「180 秒关卡」真实耗时 6–15 分钟，而 HUD 仍显示 `3:00` 倒计时，玩家只会觉得"这关怎么这么长"）
需求：把防穿模钳制与时间积分分开——① 物理/碰撞用钳制后的 `dt`（≤0.1）逐步 substep；② 游戏时钟（`timeLeft`、耐心、烤制）走**未钳制**的真实 `dt`（上限放到 0.5 并累加器补帧），或至少 `timeLeft` 用墙钟校正；③ 当 60 帧平均帧时间 >100ms 时，HUD 给一次「设备较慢，进度按真实时间」的提示（复用 `#bbq-guide`）。
验收：e2e 在强制低帧（`--disable-gpu` 或 `__test.tick` 驱动的墙钟场景）下跑 60s 现实时间，断言 `timeLeft` 减少量 ≥54s（误差 ≤10%）；同一条件下摇杆 2s 位移 ≥5.5m；正常帧率下所有既有断言不变（无回归）。
参考：`GAME-DESIGN §6`（3.2 m/s）、`TECH-STACK §4`（一切走 `flow.update(dt)`）；Overcooked 的关卡计时与渲染解耦。
落地（345d802）：`src/main.ts` 循环体抽成 `step(rawDt)`，`rawDt = clock.getDelta()` 不再钳到 0.1；内部固定步长累加器 `STEP=1/60`、`acc += min(rawDt,1.5)`、每帧最多 90 子步、循环后 `acc` 截到 `STEP`（丢积压防死亡螺旋）；离散输入 `consumeAction()` 每帧只消费一次、只给第一个子步；视觉平滑另用 `visDt = min(rawDt,0.1)`。`__test.tick(dt,n)` 语义改为「n 帧 × rawDt=dt」。
验收实测（`e2e/timebase.mjs`，5d0b201 改成单次 `evaluate` 原子测量）：低帧 `tick(1.0,6)` → `timeLeft Δ=6.000s`（误差 0%）；低帧 `tick(1.0,2,1,0)` → 位移 `6.40m`（3.2 m/s×2s 理论值）；60fps `tick(1/60,60)` → `Δ=1.000s`。本地 dist `E2E_RUNS=3` 与**公网产物** `https://openfolio.uk/bbq/` `E2E_RUNS=2` 全绿、0 JS error；回归 `chop`/`grill`/`orders` 全 PASS。

### B-036 首屏必须展示游戏本体（去掉重度虚化，给出"3 秒想玩"）
优先级：P2
来源：第 7 轮走查（`port-01`/`land-01`：`.bbq-panel` 用 `backdrop-filter: blur(3px)` + `rgba(12,8,5,.45)`，vision 两轮分别判「很难辨认店面细节」「烤炉、桌子、角色均无法明确辨认」，并把"露一手画面"列为扣分项；已是第 4 轮复现的同一问题）
需求：① 遮罩降到 `blur(1px)` / `rgba(12,8,5,.28)`，让烤炉橙光与吊灯暖光透出来；② 首屏相机静态构图画在「烤炉 + 正在烤的串 + 一位顾客」上（不是空地）；③ 卡片里加一个 **2 秒循环的出餐动效预览**（哪怕只是串在炉上翻身的 sprite 序列）；④ 目标行下面补一句"最快 3 分钟出第一单"之类的钩子。
验收：vision 只看首屏截图能说出"看到烤炉/桌子/角色"三者中**至少两者**；首屏到可点击 ≤3s（在网络与帧率正常的环境下测，本轮环境不作数）；e2e 断言首屏存在非遮罩的 3D 画布可见区域（采样中心区域亮度方差 > 阈值）。
参考：`ART-DIRECTION §1/§3`；Overcooked 首屏直接给你看厨房在动。

### B-037 补 `favicon.ico`，控制台不得有 404
优先级：P2
来源：第 7 轮走查（本机直连 `http://127.0.0.1:3035/bbq/` 时控制台唯一一条 error 就是 `Failed to load resource: 404`；`curl /bbq/favicon.ico` → 404。公网因 portfolio-proxy 兜底不显形，属只有开发者会看见的脏）
需求：加一枚 32×32 + 180×180 apple-touch-icon（店招/炭火图标，与 `ART-DIRECTION §5` 皮肤一致），`index.html` 里加 `<link rel="icon">`；`server/index.js` 已支持 `.ico` 的 MIME。
验收：`curl -o /dev/null -w '%{http_code} %{content_type}' http://127.0.0.1:3035/bbq/favicon.ico` → `200 image/x-icon`；走查脚本记录 `errors.length === 0`。
参考：`TECH-STACK §4`（控制台零错误基线）。

### B-038 顶部状态条与订单卡补稳定 id / data 属性
优先级：P2
来源：第 7 轮走查（`#bbq-hud` 下只有 `#bbq-orders`/`#bbq-bubbles`/`#bbq-popups`/`#bbq-grillbars`/`#bbq-chop`/`#bbq-guide` 有 id；「营业额/时间/评级」那一行是匿名 div，本轮探针按 `#bbq-status` 取值全部 `null`，历史 review 也只能全文匹配 `innerText`）
需求：状态条容器 `id="bbq-status"`，内部三段加 `data-hud="money|time|stars"`；订单卡加 `data-slot="0|1|2"` 与 `data-dish`；顾客气泡加 `data-table`。
验收：e2e 可分别断言 `#bbq-status [data-hud="time"]` 文本、`#bbq-orders .card[data-slot]` 数量与 `__game.customers` 一一对应；走查脚本不再需要 `innerText` 全文匹配。
参考：上一轮 `B-029`（DOM 断言约定）。

> **B-012 补充（第 7 轮，第 4 次复现）**：`money=200 → timeLeft 0` → 结算「目标达成，解锁下一关！」→ 点主按钮后 `phase=playing / money=0 / timeLeft=179.6 / localStorage.bbq.level='2'`，`land-05` vision 判「没有任何第2关/新关卡标识或新目标文案，与开局无可见变化」。代码侧确认 `config.LEVEL` 只有一组常量、`SAVE_KEYS.level` 全仓无读取方。**同时撤回第 4 轮「达标后点进去真的进 Lv.2」的结论**——当时只验到 `timeLeft` 重置，未验关卡参数变化。

---

## 走查追加需求（B 编号，第 8 轮 2026-11-20 23:05Z）

> 线上 bundle `index-CB3xEvNT.js`（21:51Z 产物，`server/dist` == 仓库 `dist/`）。本轮专项：⑥ 耐心归零/愤怒离店 ⑦ 结算与「下一关」⑨ 连点去重 ⑩ 控制台。
> 环境：load 11.7 / 冷启动 12–18s / 22:48Z 单次 Cloudflare 502（已复测恢复）。JS error 0，warning 2。

### B-039 顾客愤怒离店的全链路可见反馈
优先级：P1
来源：第 8 轮走查（`setPatience(3)` → `t=3.05` 相位 `leaving-angry`、`angry 0→1`、`#bbq-popups` 出现「愤怒离店」、评级 ★★★→★★☆；但同一帧截图 `port-03-angry.png` / `land-03-angry-leave.png` 经两次独立 vision 复核，均判「画面里没有愤怒离店的顾客、没有红色怒符号、没有 -1 飘字」，玩家只能从掉星倒推。GAME-DESIGN §1 要求「愤怒离店（满意度 -1）」应为可感知事件）
需求：① 离店顾客本体在视口内保持可见 ≥1.2s，头顶/身上挂 **≥24px 红色怒符号**（内联 SVG，禁 emoji）；② 同步弹 `#bbq-popups` 「-1 满意度」（红色 warn 样式，停留 ≥1.2s）；③ 顶部评级在该帧闪红一次（0.4s）；④ 若顾客已走出视口，改在屏幕边缘画一个红色离场指示。
验收：e2e 断言——`angry` 递增当帧存在 `.customer.angry` 元素（或 popup 文本含「-1」）；该帧截图 vision 能说出「有顾客生气离开」；连跑 3 次稳定。
参考：Overcooked 的订单超时红叉 + 顾客摔门离场；GAME-DESIGN §1。

### B-040 结算面板未达标时的按钮语义
优先级：P1
来源：第 8 轮走查（`money=0` 打烊：面板「离目标还差 ¥180 / 1★ / 下一关(disabled) / 再开一局」；真手指连点「下一关」2 次，`phase` 仍 `results`，无 toast、无说明。玩家视角=「按钮坏了」，正是剧本 ⑨「点了没反应」）
需求：二选一——① 未达标时隐藏「下一关」，把「再开一局」提为主按钮（金色实心）；或 ② 保留置灰按钮，但在其下方加一行说明「营业额未达 ¥180，先再来一局」。
验收：e2e 断言未达标面板里存在说明文本（含「未达标/还差」）或主按钮为 replay；达标面板不变（「下一关」enabled 且金色）。
参考：GAME-DESIGN §3「M1 仅 1 关，结算面板预留」；第 8 轮 `port-07-results`。

> **B-031 补充（第 8 轮，第 2 次）**：上菜瞬间 `#bbq-popups` 确有 `+¥60`（1 节点），但 `.popup` 动画 0.85s 末段 opacity→0、`setTimeout(remove, 900)`，400–500ms 后采样已 0 节点；`port-04-served` vision 判「没有 +¥ 飘字、没有金币/放大/闪光」。同时订单卡写 `¥48 · 用餐中`、实收 ¥60（¥12 小费）无任何解释。**验收追加**：上菜后 1.2s 内任一时刻截图 vision 能读出「+¥金额」；飘字 ≥18px、停留 ≥1.2s；卡片/飘字/营业额三处金额可对账（卡片显示「¥48 + 小费 ¥12」或飘字分两段）。

> **B-025 补充（第 8 轮，第 4 次量到）**：`land-02-idle` 逐列亮度——左 0–157 列均值 22–41（世界区 85–89），**连续 158 列 <55 = 18.7% 屏宽**；右边缘 84–89，无暗列。即「单侧黑边 + 左右不对称」，比第 7 轮的 160/84 更不对称，说明相机仍未夹紧。

> **B-022 补充（第 8 轮）**：`preAct="去料箱取料"` 与 `state().action` 在 `tick()` 驱动下不同帧（HUD 只在渲染帧刷新），e2e 断言按钮文案前必须先 `rAF×2`（沿用 B-029）。

> **B-012 补充（第 8 轮，第 5 次复现）**：`money=200 → 结算「目标达成，解锁下一关！」→ 点主按钮 → phase=playing / money=0 / timeLeft=178.28 / bbq.level='2'`；`port-06-next-level` vision：「没有第 2 关字样、没有新目标/新难度，与普通开局没有明显区别，HUD 仍是 ¥0/3:00/★★★」。旁边已出现「再开一局」按钮 —— 若短期不做 Lv.2，建议直接删「下一关」并把文案改成「再来一局挑战高分」（二选一，别混用）。

> **文档口径（第 8 轮）**：`GAME-DESIGN §2` 写「切配需 3 次点按」，实测为「放上砧板 1 次 + 切 3 次 = 4 次」（`chopLeft 3→2→1→0`，第 1 次之前 `held=null`）。§4 的结算字段写「满意度」，面板实际展示的是「愤怒离店」。两处建议随下一轮实现一起对齐。

---

## 走查追加需求（B 编号，第 9 轮 2026-11-20 23:37Z）

> 线上 bundle `index-CPTSS25a.js`（23:16Z `wip(vps-sonnet): bbq-task-l2` 已部署）。本轮专项：① 首屏/入口 ② 摇杆与游戏时钟 ③ 切配链路与切配 HUD ⑧ 四档分辨率 HUD 几何；附带复核 B-012。
> 环境：load 12.2 / 4 核、软渲染 0.66–1.0 fps、冷启动 11.4s（**本轮不评时延、不评流畅度**）。JS error 0，warning 2（`THREE.Clock`、`PCFSoftShadowMap`）。

### B-041 切关卡瞬间 HUD 时间不得显示 `0:00`
优先级：P2
来源：第 9 轮走查（达标结算 → 点「进入第 2 关」→ 300ms 采样 HUD `第 2 关 营业额 ¥0 时间 0:00 评级`，而 `state.timeLeft=180`；1000ms 仍 `0:00`；3000ms 才变 `3:00`。低帧下（本轮 1fps）这段错值窗口更长，玩家刚点完"进入第 2 关"就以为这关已经结束）
需求：`restart()`/`nextLevel()` 重置后，HUD 时间文本必须在**同一帧**按新关时长重写（或在关卡切换时先隐藏 HUD 时间，等首帧渲染后再显示），不允许出现"state 180 / HUD 0:00"的不一致帧。
验收：e2e——点主按钮后 200ms 内断言 HUD 时间文本 === `format(duration)` 且与 `state().timeLeft` 差值 <2s；连跑 3 次稳定；Lv.1 开局同样断言。
参考：`TECH-STACK §4`（HUD 每帧从 `flow` 读值）；B-029（DOM 断言前 `rAF×2`）。

### B-042 中途刷新必须有存档或显式告知
优先级：P2（手机端切后台被杀是常态，实际观感接近 P1）
来源：第 9 轮走查（开局前 `localStorage` 为 `{}`；打到一半 `reload()` 后仍为 `{}`，首屏仍只有「开 店」，无「继续」、无"上一局未完成"提示，进度全丢且无任何说明）
需求：二选一——① 每 5s（或每次 `served/money/timeLeft` 变化）把 `{level, timeLeft, money, served, angry, waste}` 写入 `bbq.run`，首屏读到即把主按钮改为「继续（第 N 关 · 剩 MM:SS）」，点击恢复该局；② 至少首屏加一行「上次的局未保存，已重新开始」。
验收：e2e——打到 `money>0` 后 `reload()`，断言首屏出现「继续」且点击后 `state().money` 与刷新前一致（①）；或断言首屏存在未完成提示文本（②）；两条路径都不许静默丢档。
参考：Overcooked 关卡内不做存档，但手机端"恢复中断局"是行业惯例（本项目 3 分钟一局，恢复价值高）。

### B-043 顶部状态条宽度不得写死 315px（并补 `#bbq-status`）
优先级：P2
来源：第 9 轮走查（四档分辨率探针：状态条宽度恒为 **315px**——390 屏 `x=37..352`、360 屏 `x=22..337`、320 屏 `x=2..317`（**仅剩 2px 边距**）；`document.getElementById('bbq-status')` 仍 `null`，与 B-038 同源）
需求：容器宽度改 `min(315px, calc(100vw - 24px))`（或 `width:clamp(...)`），并在 ≤340px 时把字号从 16px 降到 14px、允许两行；同时按 B-038 补 `id="bbq-status"` 与 `data-hud="money|time|stars"`。
验收：e2e——320/360/390/430 四档下断言状态条 `left ≥ 12 && right ≥ 12`、`scrollWidth ≤ clientWidth`（无文字截断）；`#bbq-status [data-hud="time"]` 可读到时间文本；连跑 3 次。
参考：B-038；第 9 轮 `run-probe.json`。

### B-044 切配点按次数与文档对齐（放置 1 次是否计入）
优先级：P2
来源：第 9 轮走查（实测：手拿生串 → 第 1 次「放上砧板」`chopLeft 3`、HUD 立即显示 `切配 0/3` → 再按 3 次 `已切好`，**共 4 次**；`GAME-DESIGN §2` 写「需 3 次点按」；第 8 轮已记一次，仍未对齐）
需求：二选一——① 文档改成「放置 + 切 3 次（共 4 次点按）」；② 交互改成放置后切 2 次（总 3 次），`COOK.chopTaps` 与大/小 HUD 文案（`切配 x/3`）同步。**不许两套说法并存。**
验收：e2e——从空手到 `chopped` 的总 `press()` 次数与 `GAME-DESIGN §2` 的数字一致；HUD 末帧文本为 `已切好 ✓`。
参考：`GAME-DESIGN §2`；`e2e/chop.mjs`。

> **B-025 补充（第 9 轮，第 5 次量到，新增"黑边换边"证据）**：`land-02-playing`（开局不动）左 0–160 列均值 **28.0**、右 160 列 **93.1**，连续 **158 列 <55 = 18.7% 屏宽**；同一会话角色移动后 `land-07-hud` 暗列降为 **113** 且**最右列（x=843）亮度 22** —— 黑区跟着镜头换边，坐实是相机未夹紧在世界边界，而非美术留白。验收不变：双端 `teleport(±5,±4.5)` 八帧均无"连续 ≥24 列 <26"，左右暗区宽度差 ≤8px。

> **B-035 补充（第 9 轮，第 2 次量化，最坏样本）**：load 12.2、1fps 下静置 6.03s（6 帧）→ `timeLeft` 180→179.4，**Δ0.60s = 墙钟的 10%**；横屏 6.08s / 4 帧 → Δ0.40s（6.6%）。按住摇杆 29.5s 墙钟位移 **4.18m**（22 帧 × 0.1s 上限 = 2.2s 游戏时间，理论 7.04m；按墙钟应 94.6m），HUD 全程 `3:00`。即"3 分钟关卡"在这台机器上要 **30 分钟**。修法与验收见 B-035 原文（游戏时钟走未钳制 dt / 累加器补帧，低帧下 60s 墙钟 `timeLeft` 减少 ≥54s）。

> **B-036 补充（第 9 轮，第 6 次）**：`getComputedStyle(.bbq-panel)` 实测 `backdrop-filter: blur(3px)`、`background-color: rgba(12,8,5,.45)`——与第 7 轮记录**一字未改**；`port-01`/`land-01` 两次 vision 均判场景不可辨认（横屏"勉强辨认烤炉/餐桌轮廓，看不见厨师与食材"）。新增证据：**结算面板的 `blur(3px)` 把顶部状态条一起糊掉**（`port-14` 顶部 140px 放大后文字不可读）。建议顺带处理"遮罩只糊场景、不糊 HUD"——给 `#bbq-hud` 提到遮罩之上，或结算时隐藏状态条。

> **B-038 补充（第 9 轮，第 3 次）**：`#bbq-status` 探针依旧 `null`；本轮四条断言只能退化为"在 `#bbq-hud` 里找含『营业额』且 children ≤4 的元素"来取矩形，脆弱但可用。状态条文案现为 `第 1 关 营业额 ¥0 时间 2:58 评级`（`第 N 关` 前缀是 23:16Z 新增）。

> **B-012 关闭确认（第 9 轮独立复核，非自报）**：`lv1 = {level 1, target 180, timeLeft 180, HUD 第 1 关}` → `money=300 / timeLeft=0.02` → 结算面板「打烊结算 | ★★★ | 目标达成，进入第 2 关 | ¥240/¥180 | 0 位 | 0 位 | 0 份 | 进入第 2 关(金色主) | 再 开 一 局」→ 点主按钮 → `level=2 / levelTarget=260 / timeLeft=180 / HUD「第 2 关」/ localStorage {bbq.best:"300", bbq.level:"2"}`，与 `src/config.ts` 的 `LEVELS[1] = {180, 260, 3, [9,15]}` 一致。**"假解锁"问题不复存在，从需求池结案。** 唯一残留是 B-041（切关瞬间 HUD `0:00`）。

### B-045 烤制必须在食物本体上看得见（变色/冒烟/火光）
优先级：P1
来源：第 10 轮走查（串世界包围盒 `0.271×0.037×0.096m`，竖屏投影约 **27×4px**；生→熟把烤炉区域像素差只有均值 **4.08/255**、>25 的像素 **3.9%**；熟→焦 **3.2%**。竖屏与横屏两次独立 vision 都判「看不到串在烤」「没有明火、没有炭块、没有烟」。玩家判断火候唯一依据是烤炉上方 `76×34` 的小徽标）
需求：① 把熟度表现在食物本体上——`raw→cooked` 至少 **2 段可辨的色阶**（生粉 → 金黄 + 外缘高光/油光），`cooked→waste` 变黑炭 + 灰烟柱；② 烤炉加世界侧炭堆 `emissive #ff5a1e` + `flicker ±8%`（ART-DIRECTION §3 已有参数，做出来即可）；③ 串在竖屏的投影高度提到 ≥12px（几何放大或加"炙烤光晕/蒸汽粒子"补偿），保证 390×844 上能一眼看到"这串熟了"。
验收：e2e——`__test.tick` 推 6s 后，`(60,360)-(330,600)` 区域相对生串 **≥15% 像素**差 >25；`cooked→waste` 同样 ≥15%；竖屏串投影高度 ≥12px；串旁存在烟/火光粒子（`__perf.calls` 增幅 ≤6）；连跑 3 次稳定。
参考：胡闹厨房 2 煎锅（食物颜色 + 冒烟 + 叮声三通道同时给信号）；`GAME-DESIGN §7`、`ART-DIRECTION §3`。

### B-046 上错菜时动作键不得静默吞输入
优先级：P1
来源：第 10 轮走查（顾客要 `烤菌子`、手上 `plated pork` 站到桌前：`action=none`、按钮文案「这桌要的是 烤菌子 · 去垃圾桶丢掉」，**连按 7 次** `money 61→61`、`served 1→1`、`carrying` 仍 `plated`，`#bbq-popups` 与 `#bbq-guide` 全空）
需求：① 错菜按键时必须给 2s 可见反馈（`hud.showGuide('这桌要的是 烤菌子')`，或世界侧红叉 + 顾客摇头）；② 按钮语义拆开——桌前错菜时主按钮应是「换一盘 / 去取对的菜」，而不是把"去垃圾桶丢掉"写在餐桌情境里；③ 引导文案要在按下的**当帧**出现，不消耗输入。
验收：e2e——错菜状态 `press()` 后 1 帧内 `#bbq-guide.show` 存在且文本含「要的是」，`money/served/carrying` 不变；`press()` ×6 后 guide 文本仍非空（可重复提示）；连跑 3 次。
参考：`GAME-DESIGN §5`（离开站点圈点击弹 2s 引导、不消耗输入）。

### B-047 收款/离店飘字必须在低帧设备上也画得出来
优先级：P1
来源：第 10 轮走查（`+¥61` 盒子 **27×14px**、`font-size 17px`、插入瞬间 `opacity:0`、`scale(.7)`；`bbq-rise .85s` 动画 + `setTimeout 900ms` 移除；40ms 与 200ms 的 CDP 截帧里都没有它；1fps 下 0.85s 只覆盖 0~1 帧。`愤怒离店` 同规格 48×16px，`port-07`/`land-06` 两帧都读不到）
需求：① 去掉 0→1 的淡入，插入当帧即 `opacity:1`（位移仍可动画）；② 字号 ≥20px、`+¥61` 至少 46px 宽，允许 `text-shadow/stroke` 提对比；③ 生命周期改由**帧数**驱动（`>=3` 帧）或 `>=1.2s`，不用裸 `setTimeout(900)`；④ 离店同样处理，并加世界侧红怒符号（B-039 未关，本条只做"看得见"部分）。
验收：e2e——`press()` 后立即断言 `getComputedStyle(popup).opacity === "1"`、宽度 ≥ 字数×字号×0.55、高度 ≥ 字号×1.2；`__test.tick` 推 3 帧后 popup 仍在 DOM；1fps 环境连拍 3 帧至少 1 帧能读到 `+¥N`。
参考：`GAME-DESIGN §7`（飘字 0.8s）；B-031 / B-039。

> **已修（2026-11-21 04:20Z，代码 `6a20961`）**：`.popup` 去淡入（出生 `opacity:1`）、`24px/800` + 深色底框与描边、`translate(-50%,-100%)` 并上抬 `POPUP_LIFT=44px`、与 `.bubble`/其它飘字做矩形避让搜索、寿命改 `2.2s` 且需 `frames>=3`（移除前写 `dataset.life`）。
> 验收 `e2e/popup.mjs`（竖屏 390×844 + 横屏 844×390，`E2E_RUNS=3` 连跑三次）：出生 `opacity=1 / font 24px / 97×34 与 126×34 / 距锚点 74、44、56px / 不与气泡相交`，实测寿命 3.0–9.7s（帧卡时 rAF 延后，非产品问题），最终正常移除，0 JS error，draw calls 64–74 未增，末行 `POPUP OK`；`smoke.mjs` 仍 `SMOKE OK`。
> 注意：B-047 的「看得见」已关单；`B-039`（世界侧红怒符号）仍开。

### B-048 HUD 营业额要有滚动/强调
优先级：P2
来源：第 10 轮走查（`Hud.setMoney` 直接 `this.moneyV.textContent = '¥'+v`，无插值、无强调；`GAME-DESIGN §7` 写「HUD 营业额滚动」，实施缺失）
需求：收款时营业额从旧值 tween 到新值（≥2 段插值，总时长 300–450ms），数字短暂放大/变金色再回落，让"钱进来了"在 HUD 上也有一下。
验收：e2e——`press()` 后 100ms/250ms 采样 HUD 文本，至少出现一个**介于旧值与新值之间**的中间数字（或 `transform: scale>1` 的中间态），400ms 后稳定为新值。
参考：胡闹厨房 2 收款数字跳动；`GAME-DESIGN §7`。

### B-049 烤制/切配徽标不得压在被观察对象上
优先级：P2
来源：第 10 轮走查（竖屏 `gb 76×34 @(110,428)`、横屏 `@(343,195)` 正压在烤炉上方；`land-03` vision 判「提示框轻微遮挡烤炉/食材」，而玩家正是要盯着烤炉判断火候）
需求：徽标锚点从"站点中心正上方"改为"串的侧上方"（水平偏移 12–16px、垂直 +10px），或把条形改成环形进度 + 小图标（≤28px），保证不覆盖烤炉平台与串本体。
验收：e2e——徽标 `getBoundingClientRect()` 与烤炉平台投影矩形不相交，或重叠面积 ≤10%；竖/横屏各测一次；连跑 3 次。
参考：B-045（把熟度搬回食物本体后，徽标可以退化成辅助）。

### B-050 顾客愤怒离店当帧必须清掉等待气泡
优先级：P2
来源：第 10 轮走查（`run-land.json` 中 `angry=1` 的那一帧 `#bbq-bubbles` 仍是 `烤菌子`——`updateBubbles` 走主循环，`leaving-angry` 顾客的气泡要到下一帧才移除，1fps 下就是 1 秒的"他还想要菜"与"愤怒离店"同屏）
需求：`flow` 的 `onAngry` 回调里同步移除该顾客的 bubble（或 `updateBubbles` 在检测到 `leaving-*` 时立即删），并给该 bubble 一个 150ms 的红闪退场。
验收：e2e——`angry` 计数 +1 的那一帧，`#bbq-bubbles` 内不含该顾客的菜品名；连跑 3 次。
参考：`GAME-DESIGN §7`（愤怒离店 0.6s 红怒符号，路径回门）。

### B-051 `e2e/levels.mjs` 尾段多次 reload 会把浏览器搞崩（测试基建，非产品回归）
优先级：P2（挡验收：会把真修复误判成 FAIL）
来源：2026-11-21 01:05Z 开发轮跑 levels 回归，a)–d) 全 PASS，到 e) 的连续 reload（5 次换页）时报 `page.goto/waitForTimeout: Target page, context or browser has been closed`（chromium 进程消失，load 10–13、swiftshader）。用 `93be3d3` 源码单独建对照构建（`git worktree` + `vite preview:4179`）复跑，**同样在最后两次 reload 崩在 levels.mjs:139**，证明与 B-035 改动无关，是既有 flake。
需求：`reload()` 捕获浏览器级崩溃（`browser.isConnected() === false` 或 `/has been closed/`）时，**重建 browser + context，并把 `localStorage` 里被测的 `bbq.level`/`bbq.best` 读出来注入新 context**，而不是在同 context 上继续换页；e) 段的多个非法值循环改为每轮独立 context，避免内存累积。
验收：`E2E_BASE=http://127.0.0.1:3035/bbq/ E2E_RUNS=3 node e2e/levels.mjs` 在 load ≥10 的机器上连跑 3 次全 PASS（a–e 五段），且中途不出现未捕获的 `Target page ... closed`。
参考：`e2e/levels.mjs:37 reload()`、1d17e01（上一版 reload 加固）。

### B-052 B-035 残留：`MAX_FRAME=1.5s` 让 <0.67fps 仍在慢放；「设备较慢」提示未做
优先级：P1（本机常态 0.5–1fps，玩家真会撞上）
来源：2026-11-21 01:40Z 部署后真机墙钟实测（公网 `https://openfolio.uk/bbq/`、load 12、软渲染）：页内计时 8.02s 墙钟 → `timeLeft` 只掉 **4.5s（0.56×）**，期间 4 帧（≈0.5fps）。根因：`step()` 里 `acc += Math.min(rawDt, 1.5)` 的 1.5s 上限是防死亡螺旋用的，0.5fps 时每帧真实 2s 只补 1.5s → 每帧漏 0.5s。≥0.67fps（含 1fps、5fps）已完全跟上（`tick(1.0,6)` 实测 Δ=6.000s），所以第 9 轮那个 1fps 最坏样本已修好。
需求：① `MAX_FRAME` 提到 3s 且 `MAX_STEPS` 提到 180（每帧最多 3s 补帧，0.33fps 也能追上），并把"补帧期间不做渲染/HUD 更新"保持现状；② 补上 B-035 需求③：60 帧平均帧时间 >100ms 时用 `#bbq-guide` 提示一次「设备较慢，关卡按真实时间走」；③ 若补帧超过 3s（页面被判后台/休眠恢复），直接把 `acc` 截到 `STEP` 并在回来时重算 `timeLeft`（别把整段后台时间算进关卡）。
验收：`E2E_BASE=https://openfolio.uk/bbq/` 的真机墙钟脚本在 0.5fps 下 `dTime/wall ≥0.9`；`e2e/timebase.mjs` 连跑 3 次仍全绿；后台 10s 回来 `timeLeft` 不跳变 >3.5s（或按 ③ 处理）。
参考：`src/main.ts` `step()` 的 `MAX_FRAME`/`MAX_STEPS`；B-035 需求②③。

## 2026-11-21 02:35Z 第 11 轮走查：复现记录与证据修订（无新增条目）

> 本轮部署基线 **`691fffa`（02:00 加入 camera-clamp）/ `index-ChCgL6cA.js`**，竖屏 390×844 + 横屏 844×390，2 次独立运行、JS error 0。结论：**没有发现新 bug，但 B-025 的"已修"判断站不住**，B-023 / B-036 / B-039 / B-047 / B-050 / B-018 全部原样复现。证据目录 `e2e/review/2026-11-21T01-37Z-r11/`。

- **B-025（P1）第 7 次复现，clamp 后仍在**：横屏 `teleport(5,4)` + `tick(0.05,44)` 后，`x=585..843`（**259px = 30.7% 屏宽**）逐像素等于 `s.background = 0x1c1410 → (28,20,16)`；出生点两侧各 ~80px（合计 19%）；竖屏 `port-06` 全图 **21.6%** 像素为该色（顶部 ~100px + 底部 ~44px）。截图 `land2-02-SE.png` / `land2-03-spawn.png` / `port-06-lv2.png`。
  **验收修订（重要）**：旧口径"逐列亮度均值无连续 ≥24px 且 <26 的近黑列"会被暗部地板干扰、也无法区分"暗"与"空"。改为**按像素值判定**：任何一列不得出现连续 ≥24px 的 `pixel == (28,20,16)`（容差 ±2/通道），四个角落 + 出生点 × 双端共 10 帧，且竖屏顶/底各不得有连续 ≥24px 的同色行。同时请先定规格：`ART-DIRECTION §1` 写的 landscape 视野 20.7×9.6m 天生大于 12×9m 世界，**规格与实现必须一起改**。
- **B-023（P2）第 5 次复现**：Lv.2 开局 `money=0 / timeLeft=179.7` 时 `#bbq-hud .stars` 三个 `svg[fill]` 全是 `#f0c060`；同一局 0 分结算给 1★。`onTimeLeft` 的 `live` 只用 `angry/waste`，没有 `money/target` 项。
- **B-036（P2）第 8 次复现**：`port-01` vision 仍判「背景重度模糊，看不清厨师和食材」。
- **B-039（P1）第 3 次复现**：`angry 0→1` 当帧 `#bbq-popups` 只有一条 `愤怒离店`（`opacity:0`、47×16、17px），没有任何红色怒符号；离店顾客本体在 `port-03` 里只是一名直立红衣人物，vision 判「看不出不满」。
- **B-047（P1）第 3 次复现**：上菜 8 连点后 `#bbq-popups` 仅 1 条 `+¥61`，`opacity:0 / 17px / 47×16`，截图不可见。**金额本身正确**（卡 ¥48 + 小费 ¥13，`money 0→61` 只发生一次）。
- **B-050（P2）第 2 次复现**：`angry` 递增那一帧 `#bbq-bubbles` 仍是 `["烤五花肉拼盘"]`，`#bbq-orders` 已清空，下一帧才移除。
- **B-018（P2）第 2 次复现**：844×390 下结算卡 `213×373 @(315,8)`，上下仅 8–9px；`scrollHeight == clientHeight == 371`，主/次按钮分别在 `y=259` / `y=314`。375 高（iPhone SE 横放）必裁。
- **B-032（P2）第 3 次复现**：`#bbq-act` 在 `x=742..818`，而该帧右侧空区从 585 开始——按钮正好压在世界外区域上。
- **本轮通过项（供回归用）**：① 首屏 3 秒可懂（标题/副标题/五步流程/目标/单一主按钮，CTA `150×45 @(119,470)`）；⑦ 结算星数公式正确（`¥300/¥180 + 1 angry → 2★`，0 分 → 1★），「进入第 2 关」→ `level 2 / target 260 / 3:00 / bbq.level=2`，「再开一局」保留 Lv.2；⑧ 竖屏摇杆 `130×130 @(22,692)`、动作键 `76×76 @(288,738)`，横屏 `@(22,238)` / `@(742,284)`，HUD 无裁切无重叠（`port-06` 2× 放大复核）；⑨ 8 连点不复制、不吞输入、只结算一次。


## 2026-11-21 03:10Z 第 12 轮走查：新增需求 + 证据修订

> 基线：线上 `index-BfQV-0D9.js`（02:59Z 重建为 `index-ChCgL6cA.js`，`src/**` 无改动），3 个独立会话、JS error 0。证据目录 `e2e/review/2026-11-21T02-37Z-r12/`。

### B-053 烤炉"可取窗口"必须可预判（按钮倒计时 + 半熟可提前取）
优先级：P1
来源：第 12 轮走查（逐秒读 `state().actionLabel`：`上烤炉` → **`烤制中…`（按钮禁用 6s，无秒数、无进度）** → `取烤串`；`t≥12` 直接 `waste`。0.5–1fps 设备上 6–12s 的窗口只有 3–6 帧，本轮两次在测量中把串烤焦——玩家没有任何"还有几秒能取"的预告）
需求：① `t∈[0,6)` 期间按钮文案带剩余秒数（`烤制中 5s`），进度环按 `t/6` 填充，不再是一个静态省略号；② `t∈[4,6)` 文案转 `准备取串` 并由灰变金（给一次注意力提示）；③ 允许 `t≥4` 提前取出，标记 `under`（半熟）：不上菜，只能丢垃圾桶或回炉 2s，让"抢时机"成为可选策略而不是唯一正解。
验收：e2e——同一串在 `t=1 / 5 / 7` 三个采样点读 `#bbq-act` 文案，三者互不相同且 `t<6` 的两条含数字；`t=4.5` 时按钮含 `准备取串` 且 class 变化；`t=4.5` 按一次 → `carrying.stage === 'under'`，桌前按键 `money` 不变；连跑 3 次。
参考：胡闹厨房 2 煎锅的"叮"前提示；`GAME-DESIGN §2` 炭烤段。

### B-054 收银飘字不得与顾客气泡/餐盘同帧重叠
优先级：P2
来源：第 12 轮走查（上菜后 `port-500-after-serve.png`，vision：「黄色 ¥61 浮字、『用餐中』标签、顾客、餐盘集中在同一处，信息层级不清，存在相互遮挡」；`+¥61` 出生盒 **27×14**、`opacity 0`）
需求：飘字锚点从顾客头顶中心上移到**顾客上方 ≥40px**，且与 `#bbq-bubbles` 任一气泡矩形保持 ≥8px 间距；同一顾客同时只允许 1 条飘字（收款优先于"用餐中"标签的可见层级：气泡在飘字下方一层，飘字 z-index 更高）。在线性布局无法避让时，飘字改为在 HUD 下方独立"最近收益"槽位显示 1.2s。
验收：e2e——上菜当帧取 `popup.getBoundingClientRect()` 与所有 `#bbq-bubbles .bubble` 矩形，两两不相交（或垂直间距 ≥8px）；`getComputedStyle(popup).zIndex > 气泡`；390×844 与 844×390 各测一次；连跑 3 次。
参考：B-047（先让它看得见，再让它不糊）；`GAME-DESIGN §7`。

> **B-044 补充（第 12 轮，第 3 次，数字要再改）**：从**空手**到 `carrying {pork, chopped}` 实测是 **5 次** `press()`——`放上砧板`(1) + `切配 1/3`(2) + `2/3`(3) + `3/3`(4) + `取回切好的串`(5)；第 9 轮记的 4 次漏了"取回"。`GAME-DESIGN §2` 写的"3 次点按"与实现的差距比原记录更大，请在文档与 `COOK.chopTaps` 之间二选一对齐，并把"取回"这一步在文档里写明。

> **B-047 补充（第 12 轮，第 4 次，尺寸更小的新样本）**：`press()` 落地后同帧读 `#bbq-popups .popup` → `+¥61`、`opacity 0`、**27×14**（第 11 轮同一断言读到 47×16，说明盒子随动画从 `scale(.7)` 起，出生帧比上一轮记录还小）。`money 0→61`、`served 0→1`、顾客 `seated→eating` 三者均正确，问题纯在可见性。

> **B-045 补充（第 12 轮，第 3 次，首次给出完整 hex 时间轴）**：`t=1.08 #e79176 / 3.98 #e29560 / 5.45 #e09753 / 7.05 #dc983e / 9.78 #c98a39 / 10.83 #bb8135 / 11.83 #a87430 / 12.83 #241d18(waste)`。**熟→焦的通道差只有 ~60/255，焦段 `#241d18` 与场景背景 `#1c1410` 几乎同色**——这就是 vision 三次判"看不出熟度/看不出焦"的根因，不是拍摄问题。

> **B-049 补充（第 12 轮，第 3 次）**：竖屏 `gb` 锚点仍是 `transform: translate(148px, 462px) translate(-50%, -100%)`，`port-303` vision：「标签叠在烤炉/烤串上方，进度条遮住中央偏左的串」——"玩家要盯着看的地方被自己的提示挡住"。

> **B-025 补充（第 12 轮，第 8 次，新机位新形态）**：横屏站 `grill` 时右缘约 **15%** 屏宽为无几何纯背景色（`land-09` vision 独立指出"右侧纯黑竖条，只有取烤串按钮"）；竖屏新增一处——`port-500` 左上**出餐窗口/柜台内侧为整块纯黑**（vision：「疑似未渲染」）。同一份 12×9m 世界，横靠右缺、竖靠上缺。

> **本轮通过项（供回归用）**：② 摇杆真指针拖动 1.5s 位移 **4.164m**、WASD `d` 5s **4.16m**（21 帧）、`tick(0.05,400,mx=1)` 撞墙停在 `x=5.633` 无 NaN；③ 切配徽标 `#bbq-chop .cb` **80×35 @(136,433)**，`fill 0% → 33.3% → 66.7%`，文案 `切配 n/3`，vision 判"不压食材、HUD 无重叠"；④ 烤炉徽标 `#bbq-grillbars` 文案序列 `烤制中 Ns → 已熟 ✓ → 快焦了 Ns → 焦了 ✗` 与 `config.ts` 的 6s/12s 一致（**第 9–11 轮"没有可见进度"的结论作废**）；⑤ 完整闭环 `money 0→61 / served 1 / eating`；⑨ 60ms × 8 连点只扣完 `chopLeft`，无复制；⑩ 0 JS error。

## 2026-11-21 04:05Z 第 13 轮走查：新增需求 + 证据

> 基线：线上 **`index-ChCgL6cA.js`**（`server/dist/index.html` 02:59 构建）；仓库 `dist/` 已是 `index-CzoVCdZb.js`（04:09）但**未部署**。HEAD `4832afd`。4 个会话、JS error 0、warning 2。证据目录 `e2e/review/2026-11-21T03-39Z-r13/`。

### B-055 部署必须可验证：构建指纹 + 「线上 hash == HEAD 构建」断言
优先级：**P0 → 已降级（第 14 轮 05:15 起线上换包，主症状闭环；遗留 ③ `/bbq/api/build`）**
来源：第 13 轮走查。第 14 轮复核：**04:38–05:10 线上仍是 `index-ChCgL6cA.js`（第 3 轮陈旧），05:15 部署 `d8f77fd-202611210514 / index--1CscvBg.js` 后 `window.__build` 可读、`server/dist/index.html` 与 build 一致**，`+¥60`/`愤怒离店` 飘字实测 `opacity:1 / 24px`。`4832afd`（03:30）已把飘字改成 24px / `bbq-popup-hold` 2.2s / 深色底框，但线上 `index-ChCgL6cA.js` 里 `grep -c bbq-popup-hold` = **0**，实测 `.popup` 仍是 `17px / bbq-rise 0.85s`。也就是说第 11/12 轮记录的「飘字看不见」源码已修、线上未生效；`server/dist/index.html` 停在 02:59，仓库 `dist/index.html` 已是 04:09 的 `index-CzoVCdZb.js`。
**[部分 done d8f77fd，2026-11-21 05:16Z 部署 `index--1CscvBg.js`]** ①②已落地：`vite.config.ts` 注入 `__BUILD__`（短 sha + UTC 分钟）、`src/main.ts` 打印 `[bbq] build` 并挂 `window.__build`；`ci-deploy.sh` 在 build 后取 `ASSET`（缺失即失败）、拷贝后比对 `server/dist/index.html`、健康检查时再校验 3035 实际返回的 index.html 含同一 asset，不一致回滚 `server/dist.bak-*`（回滚选备份改为按目录名 epoch 排序）。新增 `e2e/build.mjs`（A1–A4）对公网连跑 3 次 `BUILD OK d8f77fd-202611210514 assets/index--1CscvBg.js`。
**遗留 → 需单开一轮**：③ `server/index.js` 的 `/bbq/api/build` 端点（返回同一 build 对象），以及走查脚本开跑前先 curl 该端点核对；本项待 ③ 完成后才可 `[done]`。
需求：① 构建时注入 `__BUILD__ = { hash, time, commit }`，页面 `console.info('[bbq] build', …)` 并挂 `window.__build`；② 部署脚本（`ci-deploy.sh` 或等价物）在拷贝后断言 `server/dist/index.html` 引用的 js hash 与刚 build 的 hash 一致，不一致则报错退出并回滚到 `dist.bak-*`；③ 服务器新增 `/bbq/api/build` 返回同一对象，走查脚本开跑前先核对。
验收：`curl -s https://openfolio.uk/bbq/ | grep -o 'assets/index-[^"]*js'` 与 `curl -s https://openfolio.uk/bbq/api/build` 的 hash 一致，且等于 `git rev-parse --short HEAD` 的构建产物；`grep -c 'bbq-popup-hold'` 线上 bundle ≥1；连续 2 次部署都成立。
参考：`server/index.js`、`dist.bak-*` 回滚机制；B-047 的四轮误判全部源于此。

### B-056 菜单态不得露出对局控件与 HUD 残影
优先级：P1
来源：第 13 轮走查（`phase==='menu'` 时探针读到 `#bbq-stick` `display:block / opacity .85 / rect 22,692,130,130`、`#bbq-act` `display:flex / opacity .55 / 76×76 @(288,738)`、`#bbq-hud .topbar` `315×36 @(37,8)` 全部可见）。
需求：`phase !== 'playing'` 时隐藏 `#bbq-stick`/`#bbq-act`（`display:none`），状态条降到 `opacity ≤ .15` 或直接隐藏；菜单层加 `backdrop-filter: blur + 压暗`，让弹窗是唯一的视觉焦点。参考 `port-01`/`land-01` vision：「底部露出两个摇杆区域」「顶部和底部残留模糊 HUD/按钮轮廓形成视觉噪声」。
验收：e2e——加载后（未点开店）断言三者的 `display`/`opacity` 不满足可见；点开店后 1 帧内恢复；双端各截 1 帧，vision 不得再读出摇杆或动作键。

### B-057 关卡进度存档 + 首屏「继续」入口
优先级：P1
来源：第 13 轮走查（首屏 `localStorage` 键为 `[]`；结算写 `bbq.level='2'` 后刷新回到 `第 1 关 / ¥0`；首屏只有「开 店」，剧本① 要求的「开始/继续」入口缺一半）。
需求：① 关卡结束时持久化 `bbq.level`（当前可玩关）与 `bbq.best`（历史最佳营业额/星级）；② 存在存档时首屏主按钮变「继续 · 第 N 关」+ 次按钮「重新开始」，并显示「最佳 ¥X ★Y」；③ 无存档时保持现状；④ `mode:'continue'` 与 `mode:'new'` 走同一条 `restart(level)` 通路，`__test.state().level` 可断言。
验收：e2e——(a) 空存档首屏只有「开 店」；(b) 打完一关刷新后首屏出现「继续 · 第 2 关」，点击后 `level===2 && money===0 && target===Level2.target`；(c) 点「重新开始」后 `level===1` 且 `bbq.level` 被重置；连跑 3 次。

### B-058 顾客点单气泡必须夹紧在视口内
优先级：P1
来源：第 13 轮走查。3 位顾客就座后 `#bbq-bubbles .bubble` 的 rect：`[367,250,120,34]`（right **487** > vw 390，**裁掉 97px**）、`[404,250,72,17]`（`x ≥ 390`，**整条在屏外**）。`port-03-orders3.png` vision 独立判「最右侧有一个被边缘裁掉一部分的圆形气泡」。最右两张桌的顾客点了什么，玩家看不到。
需求：`project()` 得到屏幕坐标后，按气泡宽度做 `x = clamp(x, 4 + w/2, vw - 4 - w/2)`；被夹紧时把指针小三角水平偏移，仍指向顾客头顶；气泡与 `#bbq-orders` 区域重叠时优先下移 8px。
验收：e2e——4 张桌子全坐满时，遍历 `.bubble` 断言 `left ≥ 4 && right ≤ innerWidth-4`，且气泡中心与顾客投影点的水平偏差 ≤ 气泡宽度的 60%；390×844 与 844×390 各 1 次；连跑 3 次。

### B-059 多人同帧离店时飘字必须错行，不得叠在同一像素
优先级：P2
来源：第 13 轮走查（`setPatience(0.05)` 使 4 人同帧归零，3 条 popup 的 `getBoundingClientRect()` **完全相同** `48×16 @(65,295)`）。
需求：同一帧内的 popup 按创建顺序做垂直错位（每条 +22px，最多 4 条），或合并为一条汇总（「4 位顾客愤怒离店 · 满意度 -4」）；同一锚点已有 popup 时新 popup 上移一行。
验收：e2e——一次触发 ≥3 条 popup，两两 rect 不相交（`dy ≥ 18px`）；`popup.dataset.stack` 记录行号；连跑 3 次。

### B-060 底部安全区：去掉 22px 纯色带 + 支持 `safe-area-inset-bottom`
优先级：P2
来源：第 13 轮走查。竖屏逐行亮度 `y=822..843` 恒为 **21.94**、`y=0..7` 同色（与场景无关的纯色带）；摇杆下沿距屏底 22px、动作键 30px，而 `env(safe-area-inset-bottom)` 计算值 0（CSS 里只有 `#bbq-orders` 的 `top` 用了 `max(8px, env(safe-area-inset-top))`）；`/tmp/r13-bottom` 裁剪 vision：「底部近黑横条约 30px，按钮组与场景割裂」。
需求：① HUD 底部内边距改为 `max(12px, env(safe-area-inset-bottom))`，摇杆/动作键随之上移；② 干掉底部固定纯色带（若是 canvas letterbox，让相机按 `vh - HUD` 取景，避免场景与 UI 分层）；③ 视口加 `viewport-fit=cover` 以便真机取到 inset。
验收：iPhone（或 CDP 模拟 `safe-area-inset-bottom=34`）下摇杆/动作键距屏底 ≥34px 且不与 home indicator 重叠；逐行亮度检查 y ∈ [vh-24, vh) 不再是单一常量；双端各 1 帧。

### B-061 HUD 最小字号 ≥13px（B-008 / B-015 未闭环，附本轮实测）
优先级：P2
来源：第 13 轮走查。`minFont` 探针：HUD 内最小字号 **11px**（订单卡 `¥48 · 等待`），`#bbq-act .cap` **10px**；状态条标签 `.k` **12px**；`land` 侧订单卡 2× 放大后 vision 仍判「字号偏小」。
需求：订单卡价格/状态 ≥13px、状态条标签 ≥13px、动作键 caption ≥13px（可拆两行）；字号提升后若卡片超高，改为「菜名 1 行 + 价格/状态 1 行」的紧凑两行式，卡片宽度上限 160px。
验收：e2e 遍历 `#bbq-hud` 内所有含文本的叶子节点，断言 `parseFloat(fontSize) ≥ 13`；双端截图订单卡不被裁切、不与 topbar 重叠。

### B-062 `__test.spawnNow()` 非法 dish 抛未捕获 TypeError（测试基建）
优先级：P2
来源：第 13 轮走查。`__test.spawnNow('beef')` → `TypeError: Cannot read properties of undefined (reading 'patience')`（`DISHES['beef']` 为 `undefined`，`spawnCustomer` 里 `DISHES[d].patience` 无守卫）；异常冒泡到 `page.evaluate`，整个探针会话被杀，本轮第一份 land 数据因此丢失。
需求：`spawnNow(dish)` 在入口校验 `dish in DISHES`，非法入参返回 `false` 并 `console.warn`；`spawnCustomer` 内部也加兜底（缺失则 `pickDish()`）。
验收：`__test.spawnNow('beef') === false` 且不抛异常、不产生顾客；`__test.spawnNow('pork')` 仍 `true`。

> **B-025（P1）本轮可关单**：横屏 844 列逐列亮度 **0 列 <26**、无连续暗段（左缘 72 / 右缘 94）；竖屏 0 暗列；`land-02-started.png` vision 独立确认「左右黑区约 0%，由地板铺满」。相较第 12 轮「右侧 15% 纯黑」是真修复。残留改编为规格对齐（`ART-DIRECTION §1` 公式 vs `GAME-DESIGN §5` 12×9m 仍不一致，见走查报告 SPEC 差距段）。

> **B-039 / B-047（P1）第 2 / 5 次复现，且定位到交付链路**：`.popup` 计算样式 `17px / bbq-rise 0.85s / 无底框`，`0 / 150 / 400ms` 三次采样 `opacity` 恒为 **0**，`900ms` 节点消失；源码 `4832afd` 已是 `24px / bbq-popup-hold 2.2s / 带底框`，但**线上 bundle 没有这段**（`grep -c bbq-popup-hold` = 0）。**在这条部署链路修好（B-055）之前，不要再因为「飘字看不见」重复开单**；复测时请先核对 `window.__build`。

### B-063 点按不得在「零仿真步」的帧里被丢弃（P0 级输入丢失）
优先级：P0
来源：第 14 轮走查（线上实测）。`press(); tick(0.005,1)` → 动作**不生效**；随后正常一帧 `tick(0.05,1)` 也**不再补发**。根因在 `src/main.ts:110-118`：`const pressed = input.consumeAction();` 在 `while (acc >= STEP)` **之前**执行，而 `acc += min(rawDt, MAX_FRAME)` 后若 `acc < STEP` 这一帧一步都不跑，press 就被取出并销毁。手机上 120Hz（dt 8.3ms、STEP 16.7ms）⇒ 每 3 帧只有 1 帧跑仿真，**约 2/3 点按丢失**；90Hz ⇒ 1/3；60Hz 抖动时偶发。切配要连点 3 下，实际要点 6–9 下，这是历轮「点了没反应」的确定性解释。
需求：① 把「有没有按」与「这一帧跑不跑步」解耦——press 存为 `pendingAction`（可累加、上限 4），**只在真正进入 `flow.update` 时消费一次**；② `step()` 里消费点移到 `while` 循环体内（`n === 0` 那一步之前），零步帧不得消费；③ 顺手把 `MAX_FRAME 1.5` 的语义在注释里写清（掉帧时的追帧上限）。
验收：e2e（新增 `e2e/input-drop.mjs`）——(a) `press(); tick(0.005,1); tick(0.05,1)` 后 `carrying` 必须已有生串；(b) 用 CDP `Emulation.setVirtualTimePolicy` 或 `--force-frame-interval=8.33` 把 rAF 固定到 8.33ms，站料箱连点 5 次、每次之间只推进 1 帧，`state.carrying` 必须非空且只消耗 1 次；(c) 砧板上连点 3 下（每下 1 帧 8.33ms），`chopLeft` 必须 3→0；(d) 双端 + 60/120Hz 各跑 1 次，连跑 3 次稳定。
参考：`src/main.ts` 固定步长累加器；用户反复反馈的「点了没反应」。

### B-064 烤炉进度条 6s 后改为「焦糊倒计时」，串体变色要能看出来
优先级：P1
来源：第 14 轮走查。`updateGrill` 里 `b.fill.style.width = min(1, t/COOK.grillTime)*100%` ⇒ `t=6..12` 进度条恒 **100%**，整个「快焦了」阶段只有文字在变；`port-07-grill-done.png` vision 判「没有倒计时/进度条，串体生→熟→焦变色不明显」。
需求：① `t < 6`：金色进度 = `t/6`；② `t ≥ 6`：切换为**红色燃烧倒计时**，宽度 = `(t-6)/6`（0→100%），颜色 `#e05a3a`，`t ≥ 10` 叠加 `.warn` 脉冲；③ 串体材质在 `cooked` 后明显加深/出油光，`waste` 后明显发黑（同时给 `tintItem` 加一档过渡，避免一帧跳变）；④ `已熟 ✓` 在场时给一个 300ms 的缩放脉冲（与飘字无关，不依赖 B-047）。
验收：e2e 断言 `t=3` 时 `.gb-fill` 宽度 ∈ (40%,60%) 且背景金色；`t=9` 时宽度 ∈ (40%,60%) 且背景红色系、`.gb` 含 `warn`；`__game.grill.slots[0].hex` 在 `t=1 / 7 / 11` 三次采样**两两差值 ≥ 12**（亮度或色相）；双端截图 vision 必须读出「快焦了」。
参考：胡闹厨房 2 煎锅的「变红 + 抖动」双通道提示。

### B-065 订单卡价 ≠ 实收金额：小费必须写出来
优先级：P1
来源：第 14 轮走查。订单卡 `烤五花肉拼盘 ¥48 · 用餐中`，上菜后 `money 0→60`（48 + 小费 12，`COOK.tipRate=0.3 × 耐心比例`）。小费只存在于（不可见的）`+¥60` popup 里，`port-10-served.png` vision 主动判「订单 ¥48 与营业额 ¥60 不一致，可能算错」。
需求：① 订单卡价格行改为 `¥48 + 小费`（等待期）→ 上菜瞬间显示 `+¥60（含小费 ¥12）`；② 若耐心已低于 40%，等待期就把小费标成 `¥0` 并变灰，让玩家看见「拖久了没钱」；③ HUD 营业额旁加一个「最近收款 +¥N」槽（可与 B-054 合并）。
验收：e2e——上菜瞬间订单卡文本匹配 `/含小费 ¥\d+/`；`money` 增量 === 卡片解析出的总额；耐心 20% 时上菜，卡片小费显示 `¥0`；双端各 1 帧 vision 不得再判「数值不一致」。
参考：胡闹厨房 2 的订单小票（价格 + 小费分离显示）。

### B-066 声音通道整条缺失：烤熟「叮」/ 焦糊「嗤」/ 收款「叮当」
优先级：P1
来源：第 14 轮走查。`grep -rn "AudioContext\|new Audio" src/` → **0 命中**；`package.json` 运行时依赖只有 `three`；仓库内无 `.mp3/.ogg/.wav`。而 `docs/GAME-DESIGN.md §7 手感与反馈` 明确要求「烤熟：串变金黄 + **"叮"** + 站点上方飘烟变金；烤焦：变黑 + 灰烟」。轮内实测：盯着 `烤制中 3s→2s→1s` 全程无声，第一根串因此烧焦。
需求：① WebAudio 程序化合成，不引入资源包：熟成 = 短促正弦「叮」(≈1.6kHz，80ms，指数衰减)；焦糊 = 低通噪声「嗤」；收款 = 双音「叮当」；切配每一下 = 短木质 click；愤怒离店 = 下行三音。② 首次用户手势（开 店 / 首次触摸）解锁 AudioContext，失败静默降级，**不得抛错也不得阻塞主循环**。③ 主音量默认 ≤0.6，`localStorage bbq.mute` 持久化，HUD 提供静音按钮。④ 同帧多次触发需合并（4 人同帧离店只响 1 次，与 B-059 错行一致）。
验收：e2e（`e2e/audio.mjs`）——(a) `take-grill` 成功后 `__perf.audio.plays === prev+1` 且 `lastSound === 'ding'`；(b) 焦糊后 `lastSound === 'hiss'`；(c) 上菜后 `lastSound === 'coin'`；(d) `bbq.mute=1` 后 `plays` 不增；(e) 无手势时不得出现未捕获 `NotAllowedError`（pageerror 计数 0）；连跑 3 次。
参考：胡闹厨房 2 的「叮」是唯一让玩家不必盯锅的通道；GAME-DESIGN §7 已把它写成规格。

### B-067 文档与实现的反馈时长口径不一致（0.8s vs 2.2s）
优先级：P2
来源：第 14 轮走查。`docs/GAME-DESIGN.md §7` 写「收款：桌面飘 `+¥xx` 上浮文字 **0.8s**」，实现是 `bbq-popup-hold 2.2s`（第 13 轮改的）。两份文档各说一个数，验收时无法判定对错。
需求：① 以可读性为准把 §7 改成「上浮 0.35s + 停留 1.4s + 淡出 0.45s，合计 2.2s」并同步 `config.ts` 里的常量注释；② 后续任何反馈时长只允许在 `config.ts` 定义、文档引用同一数字。
验收：`grep -n "0.8s\|2.2s" docs/GAME-DESIGN.md` 只剩一处且与 `config.ts` 常量一致；e2e 断言 `.popup` 生命周期 ∈ [1.9s, 2.5s]（游戏时间）。

> **B-063（P0）本轮关单**：`2290acb-202611210547` 上 `src/main.ts:116-122` 已把 `pendingAction = min(peekAction(),4)` 提到 `while` 之前、把 `consumeAction()` 移进循环体内 `n===0` 分支。`e2e/review/2026-11-21T06-15Z-r15/r15d.mjs` 4 组断言全绿：`press(); tick(0.005,1); tick(0.05,1)` → 生串到手；120Hz `tick(0.0083,*)` → 到手；砧板 3 次点按（每下两帧 8.33ms）`chopLeft 3→0`；连按 5 次只消费 1 次。保留该脚本做回归，不再复开。

### B-068 订单必须绑定桌位：卡片加桌号 + 世界内桌/顾客高亮，去掉重复表达
优先级：P1
来源：第 15 轮走查（`port-07-order-card.jpg` / `land-03-orders.jpg`）。订单卡 `142×47 @(238,54)` 只写「烤五花肉拼盘 ¥48 · 等待」，无桌号无指向；世界空间同时飘一张同菜名气泡，vision 两次独立判「容易被误认为两单」「只能猜这单是哪桌的」。
需求：① `#bbq-orders .card` 增加桌号徽章（`t1..t4` → 显示「1」…「4」，或「左上/中上/右上/中下」），并写入 `data-table`；② 对应桌面上出现同色地面光圈/描边（复用 `Highlighter` 的 emissive 脉冲），顾客头顶只保留小气泡（菜名 + 耐心环），**不再画整张卡**；③ 多单时卡片按桌号固定排序（不要随顾客入座顺序跳位）；④ 上菜后卡片变「用餐中」并保留到顾客离店。
验收：e2e——`spawnNow` 到 `t2` 后断言 `card.dataset.table === 't2'`、该桌存在 `[data-order-ring]`；同时只允许 1 个 `[data-order-card]` 类节点（世界内整卡数 0）；双端截图 vision 能指出「这单是第几桌」；连跑 3 次。
参考：胡闹厨房 2 的桌位数字徽章 + 顾客头顶小票。

### B-069 低耐心要「看得见人」，离店要「看得见走」
优先级：P1
来源：第 15 轮走查。`setPatience(13)` 后卡片 `class="card angry"`、`stroke=#e05a3a`（环逻辑对），但顾客本人无任何变化（vision：「没有表情、汗滴、跺脚、催促气泡」）；`setPatience(0.4)` 后 `path` 采样在 0.8s 内 `seated → leaving-angry → gone`，飘字还在、人已经没了（`port-08-angry-popup.jpg`）。
需求：① 耐心 <25%：顾客头顶常驻汗滴/感叹号徽章 + 角色 0.6s 周期轻微抖动（幅度 ≤2cm，不破坏读图）；② 订单卡显示剩余秒数（`12s`），≤10s 时秒数与环同时闪烁（1Hz，仅改 opacity/描边，不做全屏闪烁）；③ 离店动画：从座位走到门口 ≥1.5s，飘字锚点每帧跟随顾客头顶（现在锚在座位）；④ 离店后 0.3s 桌子出现「可入座」呼吸高亮，提示可接新客。
验收：e2e——`setPatience(12)` 后 `#bbq-popups`/气泡内出现 `[data-urge]` 且 `card` 文本匹配 `/\d+s/`；`leaving-angry` 阶段持续 ≥1.2s 且 `customers[0].z` 单调递减 ≥1.0m；飘字 rect 与顾客屏幕投影距离 ≤80px；双端各 1 帧 vision 能读出「着急/正在走」；连跑 3 次。

### B-070 首屏遮罩必须隐藏并禁用触控层
优先级：P2
来源：第 15 轮走查。`port-01-title.jpg` / `land-01-title.jpg` 里遮罩后仍能看到摇杆与动作键轮廓；vision：「会造成视觉干扰，也让人不确定背景控件是否可操作」。
需求：`showStart()`/`showResults()` 时给 `#bbq-ctl` 加 `.hidden`（`opacity 0; pointer-events none; transition .2s`），`start()`/`nextLevel()` 时移除；面板存在期间 `#bbq-stick`、`#bbq-act` 不响应任何指针事件。
验收：e2e——开局面板存在时 `#bbq-stick` 的 `pointerEvents === 'none'` 且 `opacity === '0'`；点击摇杆中心 200ms 后 `state.player` 位移 = 0；`start()` 后两者恢复；双端各 1 帧。

### B-071 按钮文案去全角空格、结算按钮加高到 44px
优先级：P2
来源：第 15 轮走查。`开 店` / `再 开 一 局` / `进入第 2 关` 用全角空格撑字距，vision 判「非常不专业」；结算次按钮 `150×40`（主按钮 45px），低于 44px 触控下限；`land-01` 卡片在 844×390 里只占 33% 宽、两侧大片留白。
需求：① 文案去掉 `\u3000`，字距改 `letter-spacing: .12em`；② 所有面板按钮 `min-height: 44px`，主次按钮间距 ≥12px；③ 横屏（`aspect > 1.6`）卡片 `max-width: 420px`、副标题与流程行并排，避免窄高。
验收：e2e——遍历 `.bbq-panel button`：`textContent` 不含 `\u3000`、`rect.height ≥ 44`；双端截图 vision 不得再判「字距怪异/按钮偏小」；连跑 3 次。

### [done 63e536d] B-072 横屏必须完整看到工作台（crate-*/grill/plate 不被 HUD 与屏幕下缘切掉）
优先级：P1
- 修复（`63e536d`）：`src/config.ts` + `src/core/cameraRig.ts` 在 `aspect ≥ 1.5` 时由 `halfH` 反算朝 `+z` 的 `lookAheadZ = max(0.4, benchZ - (halfH - band + benchTopY·cos p)/sin p - benchFromZ)`（844×390 → `halfH=2.773 / halfW=6.000 / lookAheadZ=0.595`，仍经 `limZ=0.88` 世界夹紧）；`src/ui/controls.ts` 横屏摇杆缩至 112px、底距 `max(16px, env(safe-area-inset-bottom))`、左 16px，动作键同步贴底距 `max(16px, env(safe-area-inset-bottom))`；`src/main.ts` 补只读 `__test.worldToScreen` / `stationGeom` / `camera`；`docs/ART-DIRECTION.md §1` 同步。
- 验收：`npx tsc --noEmit` + `npm run build` OK；`e2e/landscape.mjs` `E2E_RUNS=3` 连跑 3/3 全绿（`LANDSCAPE OK`）——844×390 下五站点 `crate-pork/mush/mix`、`grill`、`plate` 在出生点 `top≤292 ≤ 294 / box≤347`、各站点使用格 `top≤277 / box≤331`，竖屏 390×844 `top≤508 ≤ 748 / box≤544`；`#bbq-stick`、`#bbq-orders .card`、`#bbq-act` 两两不交叠、不出视口；回归 `e2e/camera-clamp.mjs`（10 帧 maxRun=0，`CAMERA CLAMP OK`）、`e2e/orders.mjs`（`ORDERS OK`）、`e2e/smoke.mjs`（63 calls / 8442 tris，`SMOKE OK`）全绿；`__perf.calls` 改前横屏 `{spawn:88,grill:76,t2:88}` / 竖屏 `{78,70,77}` → 改后横屏 `{76,72,87}` / 竖屏 `{78,70,77}`（均未增加）。
来源：第 15 轮走查。`land-02-started.jpg` / `land-03-orders.jpg` vision 两次判「底部烤炉、料箱、备料台被屏幕下缘截断，工作区不完整」；`#bbq-stick` 底边 368（390−22），与台面屏幕投影重叠。
需求：① `aspect ≥ 1.5` 时把相机 `lookAt` 的 −z 偏移从 1.2m 降到 0.4m（或按 `halfH` 反算），保证 z=2 那一排站点屏幕 y ≤ `vh−96`；② 横屏摇杆底距 ≥ `max(16px, safe-area)` 且尺寸从 128 降到 112，减少对左侧料架的遮挡；③ 若仍不足，允许横屏 `halfH` 略放宽到 `worldHalfD·sinP`（当前已是上限，需改世界取景比例，见 ART §1 待定项）。
验收：e2e——横屏下对 `crate-pork/mush/mix`、`grill`、`plate` 的 `worldToScreen` 断言 `y ≤ vh−96` 且 `x ∈ [0,vw]`；`#bbq-stick` 与 `#bbq-orders`、台面 rect 交叠 = 0；双端截图 vision 不再出现「台面被截断」；连跑 3 次。

### B-073 玩家与顾客外观必须一眼可分
优先级：P2
来源：第 15 轮走查。`port-08` / `port-07` vision 两次把玩家小厨师判成顾客（「更像玩家/厨师角色」「白衣白帽红裙的顾客」）。
需求：① 玩家固定白厨师帽（高 0.16m）+ 朱红围裙 + 脚下常驻浅色光圈（半径 0.45m，opacity .25）；② 顾客禁用白帽，统一低饱和便服 + 手提袋/菜单，入座后朝向桌子；③ 颜色通道上加一层轮廓光（rim light），玩家偏暖白、顾客偏环境色。
验收：给 3 名 vision 独立单帧判定，必须都指出「戴白帽的是玩家、其余是顾客」；e2e 断言玩家 mesh 含 `userData.role='player'` 且存在 `playerRing` 节点；双端各 1 帧。

### B-074 文档漂移：关卡数量与结算字段
优先级：P2
来源：第 15 轮走查。`GAME-DESIGN §3` 写「M1 仅 1 关」，实际 `config.ts: LEVELS` 已 2 关（180s/¥180、180s/¥260）且实测可进；`§4` 写结算展示「满意度」，实际展示「愤怒离店 N 位」。
需求：① §3 表格补第 2 关（时长 180s / 目标 ¥260 / 上限 3 / 间隔 9–15s），删掉「M1 仅 1 关」；② §4 把「满意度」改为「愤怒离店数（满意度 -1/位）」，与面板字段一致；③ 顺带修 §7 的飘字时长（与 B-067 合并为「只在 `config.ts` 定义一次」）。
验收：`grep -n "仅 1 关" docs/GAME-DESIGN.md` 无命中；`grep -n "满意度\|愤怒离店" docs/GAME-DESIGN.md` 与 `panels.ts` 字段一一对应；`LEVELS` 每关在文档表格里出现一次。

### B-075 `setPointerCapture` 必须包 try/catch（否则一次异常打死整个摇杆）
优先级：P2
来源：第 15 轮走查（探针副作用暴露的健壮性缺口）。`src/ui/controls.ts:157` 的 `this.stick.setPointerCapture?.(e.pointerId)` 在「没有活动指针」时抛 `NotFoundError`（本轮 4 次 `pageerror`），而它排在 `window.addEventListener('pointermove', onMove)` **之前** —— 抛错即中断 `pointerdown` 处理器，摇杆从那一刻起完全失效（`nub` 不跟、`input.stick` 恒 0）。
需求：把捕捉与事件绑定顺序对调（先 `addEventListener` 再 `setPointerCapture`），并 `try { this.stick.setPointerCapture(id) } catch {}`；`onUp` 里同样 `try { releasePointerCapture } catch {}`。
验收：e2e——`page.evaluate` 派发无活动指针的 `pointerdown` 后，再派发 `pointermove` 能移动玩家；`pageerror` 计数 0；真机触摸拖动仍正常（位移 >1.5m/s）；连跑 3 次。

### B-068 状态：DONE（2026-11-21 13:57Z 上线，`assets/index-4y2uGTtZ.js`）
- 提交：`6fb4f79` + `fbc8d14`（功能与 e2e）、`55a5c00` + `1a670de`（视觉强化与 e2e 补充），均已 push 到 main。
- 实现：`.card[data-table=tX]` + `.tb-badge`（24px、14px 字）；卡片按 `TABLES` 桌序升序固定、最多 3 张；`#bbq-rings` 每桌一个椭圆地面环（128×58、3px 描边、opacity .55–.9 呼吸、`color-mix` 16% 填充）+ `.order-num` 桌号圆牌（28px、16px 字），四桌固定色 t1 金 / t2 绿 / t3 蓝 / t4 橙；气泡菜名降到 10px，`#bbq-bubbles` 内不再有 `.card`。
- 验收：`tsc --noEmit` + `npm run build` OK；`e2e/orders.mjs` **连跑 3/3 全绿**（8 组断言：桌号绑定、升序且 +2s 稳定、环数=卡数、离店即移除、气泡无整卡、徽章 14px 无交叠、双端视口内且不被 HUD 遮挡）；双端截图 vision 独立判定「1/2/3 号卡 ↔ 同色同号桌一一对应」，横屏三卡不压状态条、不被裁切。
- 新发现（下轮候选）：
  - [done 63e536d] **B-076（P2）横屏订单卡缩字到 12px/10px**（`@media (max-height:450px) and (min-width:600px)`），与 ART §5「HUD 字号 ≥13px」冲突，且横屏本应更清楚；建议改为加宽卡片/两行布局而不是缩字。
    - 修复（`63e536d`）：删掉横屏 `.nm 12px / .pr 10px` 缩字规则，统一 `.nm/.pr` 13px、`.tb-badge` 14px；横屏改为 `max-width: 168px`、`top: 150px`、`gap: 4px` 两行布局（菜名 / 价格·状态），`docs/ART-DIRECTION.md §5` 记横屏字号不降级。
    - 验收：`e2e/landscape.mjs` `E2E_RUNS=3`（844×390 + 390×844）全绿（`LANDSCAPE OK`）：三卡 `x[676..834] y[150..284]` 不压状态条、不越右缘、不与摇杆/动作键交叠，文字零截断，`nm=13 / pr=13 / badge=14`；`e2e/orders.mjs` 回归全绿（`ORDERS OK`）。
  - [done 63e536d] **B-072 未动**：横屏底部工作台裁切仍在，本轮只调整了订单卡位置，未验证 `crate-*/grill/plate` 是否完整可见。（已于 `63e536d` 闭环，详见上方 B-072 条目。）

---

## 第 16 轮走查追加（2026-11-21 16:38Z）

### B-077 部署后必须校验「公网构建 == 本机 dist」，不一致就挡住验收
优先级：P0（交付，不是玩法）
来源：第 16 轮走查。`https://openfolio.uk/bbq/` 仍返回 `index-BklOlgyL.js`（`__build=2290acb-202611210547`），而同机直连 `http://198.44.34.68/bbq/` 已是 `index-4y2uGTtZ.js`（`__build=1a670de-202611211358`）；公网请求 `/bbq/assets/index-4y2uGTtZ.js` → **404**。结果：B-068 的桌号徽章（`.tb-badge`）与桌底光圈（`#bbq-rings` 2 个节点）**只存在于直连入口**，走 openfolio.uk 的用户看到的还是旧界面，而 backlog 已记「13:57Z 上线」。
需求：① 查清 openfolio.uk 的源站指向（是否另一台机器/另一份 dist）与 Cloudflare 缓存规则；② `scripts/ci-deploy.sh` 末尾加一道公网验收：拉取公网 index.html 提取 `index-*.js`，与本机 `dist/assets/` 文件名比对，不一致则部署失败并打印两侧 `__build`；③ 任何「已上线」的 DONE 记录必须附公网 `__build`，禁止只贴本机 bundle 名。
验收：`curl -s https://openfolio.uk/bbq/ | grep -o 'index-[A-Za-z0-9_-]*\.js'` 与本机 `ls dist/assets/*.js` 完全一致；Playwright 打开公网 URL 读 `window.__build` 等于最新 commit 的 build 串；订单卡 `innerText` 含桌号（`1 | 烤五花肉拼盘`）。

### B-078 摇杆不得压住料箱/操作台（双端）
优先级：P1
来源：第 16 轮走查，`land-01`/`land-03`/`port-01` 三张图 vision 独立判「摇杆覆盖/压住左侧料箱工作区」。实测横屏 `#bbq-stick = 130×130 @(22,238)`，竖屏 `130×130 @(22,692)`，都贴在左侧料架正上方。
需求：① 摇杆区让出可交互台面：要么把料箱向左下角让位，要么摇杆缩到 ≤110px 并整体下移/右移；② 摇杆 `pointer-events` 之外的视觉半透明不变，但不得遮住台面高亮/桌号这类世界内信息。
验收：双端各 3 个机位，`#bbq-stick` 矩形与任一 `crate-*` 台面屏幕投影矩形重叠面积 ≤5%；或摇杆中心到最近可交互台面 ≥70px；截图 vision 不再提"摇杆挡住料箱"。

### B-079 横屏飘字不得被钳到顶边缘
优先级：P2
来源：第 16 轮走查。横屏上菜 `+¥62` 的盒子实测 `84×34 @(148,6)`，顶边只剩 6px，与顶栏同一视觉带（vision：「左上角信息偏挤」）；竖屏同一次为 `@(85,238)` 正常。
需求：`hud.popup()` 的竖向钳制加上"顶栏安全区"：横屏 `top ≥ 44`（顶栏高度 + 8），放不下就改到锚点下方；同一时刻多个飘字仍按 `B-059` 错行。
验收：双端上菜帧 `popup.getBoundingClientRect().top ≥ 44`（横屏）且与 `#bbq-hud .topbar` 矩形不相交；连跑 3 次读数稳定。

### B-080 上菜后必须"看得见顾客在吃"
优先级：P2
来源：第 16 轮走查。`phase=eating` 数据正确（`served 1 / money 62`），但 `port-03-served.png` vision 只能说「顾客具体正在吃…不够清楚，可能被桌子遮挡」，横屏 `land-03` 更是连订单卡都没有。
需求：① eating 阶段给顾客 ≥2 个可辨姿态变化（抬串/咀嚼/点头）+ 桌面上出现空盘或骨碟；② 订单卡在 eating 期间保留为「用餐中」并显示本单实收（与 `B-065` 合并：`+¥62（含小费 ¥14）`），顾客离开再移除。
验收：eating 阶段连续 2 帧截图有可测差异（顾客关键点位移 ≥2px 或空盘出现）；vision 盲测能指出"这位顾客在吃"；订单卡在 eating 全期存在且文案含实收金额。

### B-081 公网 `/bbq/` 被 CF 边缘缓存卡在旧构建（P0 交付链路，2026-11-21 18:00Z 实测）
事实：源站三条路径（`127.0.0.1:3035/`、`127.0.0.1/bbq/`、`198.44.34.68:80/bbq/` 带 Host）全部返回当轮新包 `assets/index-CiROsFNE.js`；
`https://openfolio.uk/bbq/` 与 `/bbq/index.html` 仍返回 **`index-BklOlgyL.js`（第 15 轮 `2290acb`）**，连换 query 也命中同一份；旧 asset 响应头 `cf-cache-status: HIT / age: 1179 / cache-control: public, max-age=14400`。
影响：走查脚本与 vision 复核一直在测 3 小时前的包（第 15/16 轮「公网仍跑旧构建」就是这条），新旧结论会互相打架。
需求：① 有 CF 凭据时在 `ci-deploy.sh` 末尾 purge `https://openfolio.uk/bbq/*`（无凭据则文档写明手动步骤）；② 或让 HTML 走独立不带长缓存的路径（`/bbq/index-<build>.html` + 302 跳转），彻底绕开边缘缓存。
验收：一次 deploy 后 60s 内 `curl -s https://openfolio.uk/bbq/ | grep -o 'assets/index-[^"]*js'` 等于当轮 `dist/`；连续两次部署都成立。

## 第 17 轮走查追加（2026-11-21 17:38Z）

## 第 17 轮走查追加（2026-11-21 17:38Z）

### B-082 评级控件必须可被机器读取（aria-label + 可断言星数）
优先级：P2
来源：第 17 轮走查（HUD 星级是纯 CSS/SVG 图形，DOM 只有 `评级` 二字；两次 vision 对同一控件分别读成 ★★★ / ★☆☆，无法定论，e2e 也无法断言）
需求：为顶栏评级容器（`#bbq-hud .stars`）添加 `role="img"` 与 `aria-label="评级 N/3"`（可同步维护 `data-stars="N"`），星级变化时同帧同步更新 `aria-label`；结算面板大星级容器（`.bbq-panel .stars-big`）采用同样处理，使星数可被 e2e 与无障碍读屏稳定读取。
验收：e2e 分别在开局、触发愤怒离店后、进入结算面板三态断言顶栏评级容器 `role === 'img'` 且 `aria-label` 为准确的 `评级 N/3`，且结算态 `.bbq-panel .stars-big` 的 `aria-label` 与结算星数一致；双端各连跑 3 次稳定通过。
参考：ART-DIRECTION §5（HUD 文本规格）

### B-083 结算未达标增加失分归因提示，并对齐「下一关」入口口径
优先级：P2
来源：第 17 轮走查（`port-05-results.png`、`land-05-results.png`：未达标面板仅红字写 `离目标还差 ¥119`，未说明 3 位离店/2 份废料与差额的因果，且未按 `GAME-DESIGN §3` 体现「下一关」预留入口）
需求：① 结算未达标（`money < target`）时，在 `离目标还差 ¥X` 下方增加 1 条数据驱动的简短归因提示（节点带 `data-result-tip`，如 `angry >= 2` 提示「N 位顾客等不及离店，优先盯紧快见底的耐心环」；`waste >= 2` 提示「烤焦/丢弃 N 份，留意 6s 熟 12s 焦」；其余提示「再多出约 M 道菜即可达标」）；② 对齐 `GAME-DESIGN §3` 与结算面板按钮口径，明确二选一——方案 A：未达标时隐藏「下一关」按钮，并同步修订 `GAME-DESIGN §3`；方案 B：未达标时保留置灰态「下一关」按钮并附解锁条件说明（如「营业额达 ¥180 解锁下一关」），禁止文档与实现口径并存冲突。
验收：e2e 构造 `money=61, served=1, angry=3, waste=2` 结算态，断言 `[data-result-tip]` 可见且文本非空（匹配 `/离店|耐心/`）；构造 `angry=0, waste=2` 时匹配 `/焦|废料/`；按所选方案断言未达标面板中「下一关」按钮不存在（方案 A）或 `disabled === true` 且含解锁说明（方案 B）；在 844×390 下结算面板 `replay` 按钮完整落于视口内（`rect.bottom <= 390`）；双端各连跑 3 次通过。
参考：`GAME-DESIGN §3/§4`；`B-040`、`B-074`。

### B-084 e2e 测试钩子 spawnNow 必须遵守 maxDiners
优先级：P2
来源：第 17 轮走查踩坑（脚本用 `__test.spawnNow()` 造出"3 seated + 1 walking-in = 4 人"的规格外状态，一度被误判为玩法缺陷；`flow.ts` 正常刷客其实有 `seatedCount() < maxDiners` 守卫）
需求：`__test.spawnNow()` 内部同样校验 `seatedCount() < cfg.maxDiners`，达到上限时直接返回 `false` 且不新增顾客；同时约定走查与回归脚本不得依赖超出 `maxDiners` 的规格外局面，避免污染测试结论。
验收：e2e 在 Lv.1 已有 3 名在店顾客（`walking-in`/`seated`/`eating` 合计 3 人）时调用 `__test.spawnNow('pork')`，断言返回 `false` 且 `state().customers.length` 保持不变；正常刷客模式下推进 120s 游戏时间，每 1s 采样在店人数恒 ≤3；连跑 3 次稳定通过。
参考：`src/game/flow.ts:202-221`、`src/config.ts:86`、`GAME-DESIGN §3`（Lv.1 `maxDiners: 3`）

### B-085 离店飘字双轴视口安全钳制，防止横屏出屏与竖屏贴边
优先级：P1
来源：第 17 轮走查（`land-03-patience-low.png` 3 名顾客 `leaving-angry` 向后门移动时上半身被顶边裁切且视口内看不到任何 `愤怒离店` 飘字；`port-03-patience-low.png` 3 条 `愤怒离店` 挤在左上，中条紧贴左缘、右条紧挨 `…` 气泡）
需求：`hud.popup()` 投影计算时强制执行视口四边安全区钳制——水平方向 `left >= 8 && right <= innerWidth - 8`，垂直方向 `top >= 48`（顶栏之下）且 `bottom <= innerHeight - 8`；当锚点顾客已走近或移出视口上沿时，将离店飘字钳至对应 X 坐标的顶栏下方并与其他飘字/气泡做避让，确保横屏也能清晰读到离店事件。
验收：Playwright 在竖屏 390×844 与横屏 844×390 下令 3 名就座顾客同时耐心归零，在 `angry` 递增后的 0.5s 内断言 `#bbq-popups .popup` 数量 ≥1，且所有可见 `.popup` 满足 `rect.left >= 8 && rect.right <= innerWidth - 8 && rect.top >= 48 && rect.bottom <= innerHeight - 8`，与顶栏及 `#bbq-bubbles .bubble` 交叠面积为 0；双端截图均可见完整 `愤怒离店` 文本；连跑 3 次稳定。
参考：`B-059`（多人同帧错行）、`B-079`（横屏顶栏安全距）。

## 第 18 轮开发（2026-11-21 18:05–18:41Z）

### B-084 + B-079 状态：DONE（`f3661c3`，部署包 `assets/index-nc0uBx0_.js`）
实现：`hud.popup()` 改为四边安全钳制——水平 `[8, vw-8]`，垂直 `[topbarBottom+8, vh-8]`，顶栏安全线由 live `#bbq-hud .topbar` 实测（不是写死 48px）；锚点在视口外（含屏外）时钳到同侧安全带，绝不消失；候选位搜索对顶栏、所有 `.bubble`、其它 `.popup` 做零交叠避让（B-059 错行沿用）。
验收（真跑）：`e2e/popup.mjs` `E2E_RUNS=3` 双端 **POPUP OK**
- 横屏 844×390 三人同帧离店：三条 `愤怒离店` `[190,53..316,87] [428,53..554,87] [686,53..812,87]`，全部 `top≥52`、互不重叠、与顶栏/气泡交叠 0；
- 竖屏 390×844：`[26,213..152,247] [195,213..321,247] [255,174..381,208]`，同样零越界零重叠；
- 屏外锚点（ay=-861 横屏 / ay=-261 竖屏，含 ax=-844、ax=1688）→ 全部钳回安全带且文本完整无省略号；
- 上菜帧横屏 `+¥163` `top=53.0`（改前 6px），竖屏 `top=238`；寿命 2.2s 内 `opacity` 中段实测 1；0 JS error；draw calls 64。
部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200，两者 index 均为 `index-nc0uBx0_.js`。
vision 复核：竖屏 `popup-port-clamp.png`、横屏 `popup-land-clamp.png` 均独立读出 3 条完整「愤怒离店」，确认不再被顶栏压住/出屏。
遗留（下一轮）：① 横屏摇杆仍压住左侧料箱右下角（B-078 未做，vision 再次点名）；② 横屏工作台最底边仍被下缘裁 1–2px；③ 低负载下飘字实际寿命会被拉到 5.2s（帧驱动 kill），需改成时间驱动（新记 B-086）。

### B-081 更新：公网旧构建的根因已定位（交付链路，需权限）
事实：`openfolio.uk/bbq/` 的源站**不是**美国机，而是香港机 `103.146.124.206`（hostname `4691hlpmk`）。香港机有自己的一份 `/www/yunnan-bbq-house`（root 属主）+ 自己的 `127.0.0.1:3035`，dist 停在 `index-BklOlgyL.js`（第 15 轮）。美国机 `ci-deploy.sh` 只更新美国机自己的 pm2，所以「源站已经是新包」的判断只对美国机成立；CF 侧是 `cf-cache-status: DYNAMIC`（未缓存），不存在 purge 能解决的缓存问题。
现状：`tunnel` 账号对香港 `/www/yunnan-bbq-house` **无写权限**、**无 sudo/无 root**，无法从本轮修。
需要（二选一，必须由人提供其一）：
1. 香港机 root：把 `/bbq/` 反代目标改成经反向隧道到美国机 3035（美国机 `autossh -R 13039:localhost:3035 tunnel@103.146.124.206`，香港侧 `BBQ_URL=http://127.0.0.1:13039` 后重启 gateway）；
2. 或者给 Cloudflare API token，把 `/bbq/*` 改指向美国机（并 purge）。
在此之前：**所有「已上线」结论只对美国机直连 URL 成立**，公网 URL 一律视为旧构建，不得再作为走查对象。

## 第 18 轮走查追加（2026-11-21 18:33Z）

> 编号说明：上一条飘字压顶栏的问题已由 `B-079`/`B-084`（`f3661c3`）修复，不再重复开单；本轮新单从 `B-090` 起编，避开 18:41Z 开发轮在遗留项里提到的 `B-086`。

### B-090 竖屏站烤炉时料箱/垃圾桶出画：工位全可见或给离屏指引
优先级：P1
来源：第 18 轮走查（vision 二次复核确认屏内看不到实体垃圾桶）。竖屏站在烤炉使用格时，画面左缘只露出料箱一角（约 x=0–18），`crate-pork`、`crate-mush` 和垃圾桶都在画外（`port-03-grill-cooked.png`、`port-05-grill-burn.png`）。连点后手持焦串（`carrying = {pork, waste}`），按钮显示 `去垃圾桶`，但屏幕上既没有垃圾桶也没有指向箭头（`port-06-spam.png`）。`B-072` 的验收只断言了竖屏 y 轴（`top ≤ 508`），没断言 x 轴。
需求：① 竖屏在任一工位使用格时，`ART-DIRECTION §1`「工作站必须完整可见」同时约束 x 轴；② 如果受竖屏视宽限制无法全可见，那么动作键处于「去 X」引导态且目标在视口外时，必须显示贴边的离屏指引（箭头加目标图标），目标入画后自动消失；③ 横屏同样适用：指引不得被 `#bbq-stick` 盖住（与 `B-078` 联动）。
验收：竖屏 390×844 分别站在 `crate-pork`、`grill`、`plate` 使用格，对垃圾桶、`crate-pork/mush/mix`、`grill`、`plate`（站点 id 以实现为准）调用 `__test.worldToScreen`，满足以下二选一：(a) 台面中线投影全部 `x ∈ [0, 390]`；(b) 每个在视口外且是当前引导目标的站点，都存在可见的 `[data-offscreen-hint]`，其 rect 距对应屏幕边 ≤ 12px，`dataset.dir` 与目标投影 x 的符号一致，目标入画后 300ms 内 `display === 'none'`。横屏下 `[data-offscreen-hint]` 及世界内引导箭头的屏幕 rect 与 `#bbq-stick`、`#bbq-act` 的交叠面积为 0。双端各连跑 3 次。
参考：`ART-DIRECTION §1`；`GAME-DESIGN §5`（按钮引导语）；`B-013`、`B-072`、`B-078`。

### B-091 废料计数口径：烤焦即计还是丢弃才计，必须写清且不可规避
优先级：P2
来源：第 18 轮走查。烤焦并拿到手后 `carrying = {pork, waste}`，`waste` 计数仍为 0，要走到垃圾桶才计。`GAME-DESIGN §4` 的 3★ 条件依赖「废料数 w ≤ 1」，`§1` 写「12s 焦(废料)」，但没规定计数时机。焦串如果能放到备用台（`§5` x=11）长期不扔，存在规避 w 的可能。备用台能否放焦串本轮未验证，待复核。
需求：① 二选一并写进 `GAME-DESIGN §1/§4`：方案 A，`stage` 变成 `waste` 的当帧计入 `waste`，丢弃不重复计；方案 B，维持丢弃才计，但焦串禁止放到任何台面（只能进垃圾桶），局终仍在手上或台上的焦串在结算时补计；② 手持焦串时串体要明显发黑，或头顶出现废料标记，玩家不用看按钮文案也能知道自己拿着废料。
验收：e2e 上炉推进 13s 使 `stage = waste`，按所选方案断言：A 方案在当帧 `state.waste === prev + 1`，随后丢进垃圾桶后 `waste` 不再增加；B 方案对备用台和装盘台调用 `#bbq-act`，`carrying.stage` 仍是 `waste`（放置被拒），局终结算面板的废料数包含未丢弃的焦串。两种方案都要求「烤焦 1 根后直接打烊」时结算废料数 ≥ 1；双端各连跑 3 次。
参考：`GAME-DESIGN §1/§4/§5`；`B-019`、`B-083`。

### B-092 烤炉 3 个烤位要看得见，多串同烤时进度气泡不得互叠
优先级：P2
来源：第 18 轮走查。`port-03-grill-cooked.png`（烤炉约 128–262px）和 `land-03-grill-cooked.png`（约 428–627px）里的烤炉是一整条均匀的橙色横纹，看不出 `GAME-DESIGN §1`「炭火烤炉(3 烤位)」的分格。本轮每局只用了 1 个烤位，多串同烤时的气泡布局没被覆盖（待复核）。
需求：① 烤炉上 3 个烤位要有可见分隔（炭格、铁签架或地面描边），空位显示浅色占位标记，已占用的烤位标记隐藏；② 每个烤位的进度气泡锚定在各自烤位上方，3 根同烤时气泡水平排开、互不重叠，不压住厨师本体（与 `B-049` 联动）；③ 放串的落位规则固定为「最近空位」或「从左到右」，二选一并写进文档。
验收：e2e 双端连续放 3 根生串，断言 `__game.grill.slots` 3 个都非空；三个烤位中心经 `__test.worldToScreen` 投影后，相邻 x 间距 ≥ 28px（竖屏）/ ≥ 40px（横屏）；对应的 3 个进度气泡 rect 两两交叠面积为 0，且与玩家屏幕投影矩形交叠 ≤ 10%；只放 1 根时其余 2 个烤位的占位标记 `visible === true`；双端各连跑 3 次。
参考：`GAME-DESIGN §1`、`ART-DIRECTION §2`（1m 模块台面）；`B-049`、`B-064`。

## 第 19 轮走查追加（2026-11-21 19:20Z）

> 编号说明：现有最大号为 `B-092`（`B-086` 只在 18:41Z 开发轮遗留项里被提到，没有正式条目，`B-087`–`B-089` 未使用）。本轮新单从 `B-093` 连续编号。横屏摇杆压料箱沿用 `B-078`，愤怒离店表现沿用 `B-039` / `B-069` / `B-085`，不重复开单。

### B-093 横屏 HUD 与世界内容零交叠：顶栏不压中桌顾客，订单卡不压装盘台
优先级：P1
来源：第 19 轮走查（`land-03-patience-low.png`：横屏 3 位顾客就座后，t1/t3 只在顶边露出头顶（y≈0–10），t2 顾客和桌位被顶栏（像素实测下沿 y=42，约 x 265–578）整个盖住；「烤五花肉拼盘」气泡红描边上沿 y≈34，与顶栏交叠约 9px；第 3 张订单卡（约 x 680–833，y 243–283）下沿压在装盘台台面上（台面从 y≈268 开始）约 15px）
需求：① 横屏（`aspect ≥ 1.5`）顶栏改为左上角紧凑布局（宽 ≤ 260px，left 16px），或拆成左右两段（左：关卡/营业额，右：时间/评级），让出中桌 t2 正上方；② `#bbq-bubbles .bubble` 与 `.order-num` 桌号牌复用 `B-085` 的 live 顶栏安全线，做零交叠避让，放不下时下移；③ 横屏 `#bbq-orders` 的纵向范围以 `crate-*` / `grill` / `plate` 台面投影上沿为下界，卡片放不下就改成 2 列或缩成单行「桌号 + 菜名」，禁止缩字（`ART-DIRECTION §5` 横屏不降级）；④ 横屏厨房机位下，就座顾客头部不在视口内时，订单卡增加顾客头像加情绪态（平静 / 着急 / 愤怒三档，内联 SVG，写 `data-mood`），作为「看得见人」的替代通道。
验收：844×390，`__test.spawnNow` 让 t1/t2/t3 就座（不超过 `maxDiners`），玩家在出生点：(a) 所有 `.bubble`、`.order-num` 与 `#bbq-hud .topbar` 矩形交叠面积 === 0；(b) 所有 `#bbq-orders .card` 与 `crate-pork/mush/mix`、`grill`、`plate` 台面屏幕投影矩形交叠面积 === 0；(c) 对每位 `seated` 顾客，要么 `__test.worldToScreen` 头顶点（y=1.1m）落在 `[topbarBottom+4, vh]` 内，要么对应 `.card[data-table]` 内存在 `[data-mood]`，且 `__test.setPatience(10)` 后 1 帧内 `dataset.mood === 'urgent'`；(d) 390×844 竖屏回归，上述三项同样成立；双端各连跑 3 次。
参考：胡闹厨房 2 顶部订单小票靠左排开、不压关卡内容；沙威玛传奇顾客头像加情绪条（耐心低时表情变化）。

### B-094 三个料箱必须一眼分出五花肉 / 菌子 / 米线
优先级：P1
来源：第 19 轮走查（`land-02-entered.png`、`port-02-entered.png`：台面上 `crate-pork/mush/mix` 是三块同款竹编方块，像素均色 `#947549 / #cba364 / #cca567`，mush 与 mix 几乎同色，箱上没有食材；左墙装饰架（`land-02` x 5–62 / y 105–265）反而摆着肉、菌子、米线状物体，最显眼的「食材」不能交互；开局金箭头指向 `crate-pork`，但三个箱子外观相同；动作键图标是虚线圆圈占位）
需求：① 每个料箱顶面摆对应食材模型（3 根生串 / 一簇菌子 / 一团米线，占箱面 ≥60%），颜色取 `ART-DIRECTION §2` 色板 `#e8907c+#f5d0b8` / `#a97b4f` / `#e8c96a`，箱前沿贴内联 SVG 食材牌；② 左墙装饰架降饱和，或改成空竹筐 / 土陶罐，避免与料箱混淆；③ 动作键在料箱使用格显示具体食材（「取 五花肉」「取 菌子」「取 米线」），图标换成对应食材的内联 SVG，替换虚线圆圈；④ 订单卡与气泡的菜名前加同一食材图标，形成卡片到料箱的颜色对应。
验收：e2e 双端在出生点截帧，三个 `crate-*` 顶面中心 24×24 像素均色两两 RGB 欧氏距离 ≥ 40；`__test.stationGeom('crate-pork')` 等返回的节点树中存在 `userData.food === 'pork' | 'mushroom' | 'mixian'` 的子节点；玩家站 `crate-mush` 使用格时 `#bbq-act` 的 `innerText` 含「菌子」，且图标节点不是占位 class；装饰架采样饱和度 ≤ 料箱食材采样饱和度 − 0.15；vision 盲测只看开局截图，能说出三个箱各装什么；双端连跑 3 次。
参考：胡闹厨房 2 食材箱盖印食材图标（`docs/reference/oc1.jpg` 左列的玉米 / 洋葱 / 黄瓜 / 番茄箱）；沙威玛传奇备料槽直接展示食材实物。

### B-095 局内失分要能数：顶栏补「愤怒离店 N」，星级口径与结算统一
优先级：P2
来源：第 19 轮走查（`port-04-after-zero.png` 愤怒 2 位、`land-04-after-zero.png` 愤怒 3 位，顶栏都是 1 实 2 空，第 3 位离店在 HUD 上没有任何持久痕迹；开局 `¥0` 时顶栏显示 3 颗实心星（`port-02`、`land-02`），而 `GAME-DESIGN §4` 公式下 r=0 应为 1 星，顶栏星的口径不明；HUD 文本只有 `第 1 关 / 营业额 / ¥0 / 时间 / 2:13 / 评级`，没有愤怒数）
需求：① 顶栏增加愤怒计数槽：内联 SVG 怒脸加数字，`angry > 0` 才显示，警示色 `#e05a3a`，节点带 `data-angry-count`；`angry` 递增当帧数字放大脉冲 0.3s，评级同帧闪红 0.4s（与 `B-039` ③ 合并）；② 顶栏星级二选一并写进 `GAME-DESIGN §4`：方案 A 与结算共用同一函数，显示「预计星级」；方案 B 明确改名「满意度」，按 `3 − angry` 显示，允许降到 0 颗实心星，不再在 1 颗处饱和；③ 顶栏星级容器按 `B-082` 输出 `aria-label` / `data-stars`。
验收：任一端开店，用 `__test.spawnNow` 加 `__test.setPatience` 让 3 位顾客依次归零，每次 `angry` 递增后 1 帧内 `[data-angry-count].textContent === String(angry)`；`angry = 2` 与 `angry = 3` 两个时刻顶栏的 `data-angry-count` 不同，且按所选方案断言 `data-stars` 符合公式（方案 A：与 `__test` 计算的结算星数相等；方案 B：`=== max(0, 3 − angry)`）；进入结算后面板「愤怒离店 N 位」的 N 与顶栏计数一致；双端连跑 3 次。
参考：胡闹厨房 2 顶栏的失败订单计数与小费倍率；沙威玛传奇的差评计数；`B-023`、`B-082`。

### B-096 结算面板关卡出口：重打本关 / 回到第 1 关 / 回首页，文案与按钮一一对应
优先级：P2
来源：第 19 轮走查（第 2 关 0 营业额打烊，面板只有 `再 开 一 局`（重打第 2 关），不能回第 1 关，也不能回首页；达标面板副标题「目标达成，进入第 2 关」在点击前就出现，`level` 实际仍为 1（`port-10-results-win.png`）；未达标时唯一按钮 `再 开 一 局` 是描边次级样式（`port-06-results.png` 约 120–270 × 519–559，`land-06-results.png` 约 347–497 × 292–332），与 `B-040` ① 不符；「废料」分隔线与主按钮上沿只隔约 4px）
需求：① 按钮文案写明对象：「重打第 N 关」「进入第 N+1 关」，去掉全角空格（`B-071`）；② 所有结算面板增加次级文字按钮「回到首页」，回首屏后首屏按 `B-057` 提供「继续 · 第 N 关 / 重新开始」；`level ≥ 2` 时额外提供「回到第 1 关」；③ 未达标时唯一的主行动按钮用金色实心样式；④ 达标副标题改为「目标达成！可进入第 2 关」，点击后才切关；⑤ 按钮 `min-height: 44px`，表格末行到首个按钮间距 ≥ 12px。
验收：e2e 构造 `level=2, money=0` 打烊，面板按钮 `textContent` 集合匹配 `/重打第 2 关/` 和 `/回到第 1 关/` 和 `/回到首页/`；点「回到第 1 关」后 `__test.state()` 满足 `level === 1 && levelTarget === 180 && money === 0 && phase === 'playing'`；点「回到首页」后首屏面板可见且 `phase === 'menu'`；未达标面板第一个按钮的 computed `background-color` 不是 `transparent` / `rgba(0,0,0,0)`；达标面板副标题不含「进入第」三个字连写的已完成语气（匹配 `/可进入第 \d 关/`）；所有 `.bbq-panel button` 满足 `rect.height ≥ 44` 且不含 `\u3000`；面板最后一行分隔线到首个按钮 `top` 的距离 ≥ 12px；844×390 下所有按钮 `rect.bottom ≤ 390`；双端连跑 3 次。
参考：胡闹厨房 2 关卡结算的「重试 / 继续 / 返回地图」三按钮；`B-040`、`B-057`、`B-071`、`B-083`。

## 第 19 轮开发（2026-11-21 19:02–19:34Z，agy claude-opus-5-5-high）

### B-090 状态：DONE（`5f0e889`，部署包 `assets/index-Shggdsxc.js`）
实现：新增 HUD 层 `[data-offscreen-hint]`（深底 + 金描边 + 15px 金黄粗体，44px 高视觉块，`pointer-events:none`）；`stations.ts` 的「去 X」分支补 `goto:true`（此前烤炉前手持焦串时按钮写 `去垃圾桶` 但不带 `guide` 标记，所以漏判）；`main.ts` 每帧把 `flow.hint` 投影后喂给 `hud.updateOffscreen()`，并新增只读 `__test.guideTarget()`；`NextMarker`、`PLAYER_SPAWN`、摇杆/动作键几何、音频全部未动。
验收（真跑 `e2e/offscreen.mjs`，`E2E_RUNS=3` 双端）：**42 PASS / 0 FAIL，末行 `OFFScreen OK`**
- 竖屏 390×844 烤炉前手持焦串：bin 投影 (−133,508) → 指引 `dir=left`、文本 `垃圾桶`、盒 `[8,451..104,495]` 96×44、15px，与 `#bbq-stick`/`#bbq-act` 交叠 0/0；
- 竖屏 持盘在 x=4：`1号桌` 投影 (−46,316) → `dir=left` `[8,314..97,358]`；走到 x=0.5 入画后 `display:none`（0ms/345ms 两点采样），退回恢复；
- 横屏 844×390：烤炉前 bin 恒在画内（(35,277)）→ 正确地不显示指引；持盘在 x=4 时 `1号桌` 投影 y=−11 → `dir=up` `[158,52..247,96]`，与摇杆/按钮交叠 0/0；
- 首屏面板在场时节点 `display:none`；双端 `0 pageerror / 0 console.error`。
部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200，两边 index 均为 `assets/index-Shggdsxc.js`。
vision 复核：竖屏 `e2e/shots/b090-port-grill-bin.png` 放大后独立读出「← 垃圾桶，金底黑底高对比、一眼可读」；横屏 `e2e/shots/b090-land-table-up.png` 读出「↑ 1号桌，未压顶栏（第1关/营业额/时间/评级完整）」。
与任务书的偏差（下轮复核）：① `dir=up` 时指引放在顶栏下 8px（视口顶 52px），与「距边 ≤12px」冲突时选择「夹在 topbar 之下」；② 横屏相机能看到整条 12m 台面，垃圾桶在横屏永不出画，故横屏改用手持盘/桌上客的场景验证 `dir=up`；③ 300ms 消失判定用 `tick` 推进（软渲 1–3fps 下按墙钟测没有意义）。
下一轮建议：`B-093`（横屏顶栏压中桌顾客 / 订单卡压装盘台）优先级高于 `B-064` 串体变色——后者已被 18/19 两轮走查反复点名，属核心反馈缺失。
也可能需要顺手做：横屏 x=4 时 `↑ 1号桌` 与左上订单气泡、世界内金色向下箭头在视觉上拥挤（vision 点名「两个相反箭头」），建议给离屏指引固定到屏幕水平中心或与气泡错开 ≥16px（新记 **B-097**）。

## 第 20 轮走查追加（2026-11-21 19:38Z）

> 编号说明：现有最大号 `B-096`，本轮新单从 `B-097` 连续编号。公网和本机 pm2 的旧构建并入 `B-081`；横屏摇杆压料箱沿用 `B-078`；横屏 HUD 压世界沿用 `B-093`；料箱外观沿用 `B-094`；飘字压气泡按 `B-079` / `B-085` 回归处理，均不重复开单。

### B-097 烤炉上的串放大到看得清，生/熟/焦三态各配一种烟（落实 GD §7）
优先级：P1
来源：第 20 轮走查（`port-05-grill-burnt.png` 在 `waste` 态下，烤炉条带 128–262 × 495–520 内 lum<45 的像素只有 **1** 个；`land-05-grill-burnt.png` 只有 **18** 个，集中在 31×18px 里；`port-06-offhint.png` 手持 `{pork,waste}` 时，厨师手里看不出黑串；全程无烟）
需求：① 炉上串体的屏幕尺寸，竖屏不小于 24×8px，横屏不小于 32×10px（单根）；可以加粗签子和肉块，也可以加一个只在炉位生效的视觉缩放（≤1.6×，不改碰撞）。② 三态烟：`chopped` 生串冒白色细烟，`cooked` 冒金色烟（§7「飘烟变金」），`waste` 冒灰黑粗烟，粒子 ≤12 个/炉位，走 InstancedMesh，不超 ART §4 预算。③ `waste` 串体色值落到 `#241d18`（色值过渡沿用 B-064 ③），手持焦串时串体同样发黑，并在头顶加一个小号灰烟。④ 烟的节点挂 `userData.fx='smoke'` 和 `userData.stage`，供 e2e 读取。
验收：双端各跑一次，上炉后推进到 `stage==='waste'`。(a) 烤位投影矩形内 lum<45 的像素，竖屏 ≥120、横屏 ≥200。(b) 场景中存在 `userData.fx==='smoke' && userData.stage==='waste'` 的节点，其材质颜色亮度比 `cooked` 态低 ≥40。(c) 取下后，玩家投影矩形内 lum<45 的像素 ≥60。(d) `__perf.calls` 比改前增加 ≤6。连跑 3 次。
参考：胡闹厨房 2 锅里食物焦了会冒黑烟并闪红色警示圈，人在屏幕另一头也能看见；Saltline 风格的炭火烟在暖光里留出灰色剪影。

### B-098 世界内标签不得盖住玩家本体：进度签、桌号牌、飘字都要避让厨师
优先级：P1
来源：第 20 轮走查（`port-04-chop-done.png`「已切好 ✓」137–215 × 462–497 把厨师盖得只剩帽尖；`land-04` 同样；`port-07-served.png` 桌号牌「1」≈113–140 × 355–383 压在厨师身上，(125,350) 一带检测不到围裙色块；`land-06-served.png` 桌号牌 176–204 × 117–145 压在厨师脸上；`port-09-bin-discard.png` 丢弃帧画面上找不到玩家）
需求：① 所有世界锚定 DOM（进度签 `.gb`、`.order-num`、`.popup`、`.bubble`）在布局时把玩家屏幕包围盒（脚底到帽顶 y=0…1.1m，左右各 0.3m）当作障碍物，优先放到玩家上方，放不下再放侧边。② 玩家站在某桌使用格时，该桌 `.order-num` 移到桌子远离玩家的一侧，或缩成 16px 角标。③ 玩家被不透明的世界几何遮挡时（如 `port-09` 的左墙架），给玩家描一圈 1.5px 的暖白轮廓，可与 B-073 的 rim light 合并。
验收：竖屏 390×844 和横屏 844×390 各测三个机位（砧板切满 3 下 / t1 上菜当帧 / bin 丢弃当帧），对上述四类节点求与玩家包围盒的交叠面积，每个节点 ≤ 包围盒面积的 10%；丢弃帧 `document.elementFromPoint(玩家头顶投影)` 不是不透明 HUD 节点；双端连跑 3 次。
参考：胡闹厨房 2 的切菜进度环固定在砧板上方，厨师永远露全身；沙威玛传奇顾客头顶的气泡永远让开人物脸部。

### B-099 小费规则对齐 GD §2：耐心 ≥0.8 给满小费（或改文档），并给出可断言的公式
优先级：P2
来源：第 20 轮走查（竖屏上菜 `money 0→60`，小费 12；横屏 `money=61`，小费 13；按 §2 `tip = round(48×0.3×比例)`，比例 ≥0.8 时满额 = 14。两次实收都低于满额，按实收反推比例都 ≥0.8，「≥0.8 给满」这一条看起来没有实现）
需求：① 二选一：方案 A 实现 `ratio ≥ 0.8 → ratio = 1`；方案 B 删掉 §2 的「≥0.8 给满小费」，改为纯线性。② 公式只在 `config.ts` 定义一次，`GAME-DESIGN §2` 引用同一常量名。③ 上菜事件 payload 带 `{price, tip, ratio}`，供 B-065 的订单卡显示。
验收：e2e 在 Lv.1 对 pork 单，分别 `setPatience` 到 95% / 85% / 50% / 10% 后上菜，断言 `money` 增量：方案 A 依次为 62 / 62 / 55 / 49（50% → round(7.2)=7，10% → round(1.44)=1）；方案 B 按线性公式逐项相等。payload 中 `tip` 与增量 −48 一致。双端连跑 3 次。
参考：胡闹厨房 2 的小费按上菜速度分档，最高档给满。

### B-100 顶栏补废料计数，丢弃时有落点
优先级：P2
来源：第 20 轮走查（`port-09-bin-discard.png` 丢弃后 `waste 0→1`，顶栏只有「第 1 关 营业额 ¥0 时间 2:44 评级 ★★★」，唯一的反馈是 10–87 × 431–463 的红字「丢弃」，2.2s 后消失；GD §4 的 3★ 条件 `w ≤ 1` 对玩家不可见）
需求：① 顶栏在 `waste > 0` 时显示废料槽：内联 SVG 焦串图标加数字，节点 `[data-waste-count]`；`w ≥ 2`（3★ 已丢失）时数字变警示色 `#e05a3a`。② 丢弃当帧，「丢弃」飘字改成从垃圾桶飞向顶栏废料槽（0.5s），到达时数字放大脉冲 0.3s。③ 与 B-095 的愤怒计数并排布局，横屏同样不缩字（ART §5）。计数时机按 B-091 定的口径。
验收：双端各跑一次，丢弃 1 根后 1 帧内 `[data-waste-count].textContent === '1'` 且可见；丢弃第 2 根后数字颜色为 `rgb(224,90,58)`；`.topbar` 与 `.order-num`、`.bubble` 交叠仍为 0；`waste === 0` 时槽 `display === 'none'`；连跑 3 次。
参考：胡闹厨房 2 关卡内顶栏常驻「失败订单」计数；沙威玛传奇浪费的食材会飞进垃圾桶并在角落累计。

### B-101 竖屏桌位气泡与桌号光圈做视口钳制，不许截字
优先级：P2
来源：第 20 轮走查（`port-04-chop-done.png` 第 3 桌气泡被右缘截成只剩「豆」(x≈347–390)，蓝圈「3」被截一半，第 1 桌气泡贴在 x≈0；`port-05-grill-burnt.png` 1 号桌订单卡已变红，但该桌气泡和人都不在画内，画面上只剩光圈左缘一段弧 (0–33 × 310–360)）
需求：① `.bubble` 在投影后做水平钳制 `[4, vw−4]`，锚点在画外时贴边显示，并加一个指向桌位的小三角。② 气泡文字不截断；放不下时改成「桌号徽章 + 菜名首字」的紧凑态，节点带 `data-compact`。③ 订单卡变红（耐心 <25%）且该桌在画外时，复用 B-090 的 `[data-offscreen-hint]` 显示「← 1 号桌」。
验收：竖屏 390×844 让 t1/t2/t3 就座，玩家分别站在砧板和烤炉使用格。所有可见 `.bubble` 满足 `rect.left ≥ 4 && rect.right ≤ 386`，`scrollWidth ≤ clientWidth`（无截字）；`setPatience(t1, 10)` 且 t1 投影在画外时，存在 `[data-offscreen-hint][data-target=t1]`，方向与投影 x 的符号一致。横屏 844×390 回归同一组断言。连跑 3 次。
参考：胡闹厨房 2 画外订单在屏幕边缘显示带箭头的小票。

### B-102 离屏指引补目标图标；动作键引导态满亮度；横屏「可见态」可测
优先级：P2
来源：第 20 轮走查（`port-06-offhint.png` 指引 96×44 只有箭头加「垃圾桶」，缺 B-090 ② 要求的目标图标；同帧动作键「去垃圾桶」文字峰值亮度 120、外环 84，而 `port-02-joystick.png` 同样是引导态的「去料箱取料」为 202 / 135；横屏 844×390 视野覆盖整个后厨，本轮没能触发一次可见的离屏提示，B-090 横屏「与摇杆/动作键交叠为 0」的条款无法验证）
需求：① `[data-offscreen-hint]` 在箭头和文字之间插入目标的内联 SVG 图标（垃圾桶 / 对应料箱食材 / 装盘台），节点 `[data-hint-icon]`；出现时做 1 次 0.3s 缩放脉冲，之后静止，不常驻闪烁。② 动作键「站在站点圈内但无有效动作」的状态也按 GD §5 保持满亮度（`opacity 1`，文字 `#f5e8d8`），改用图标区分（如显示指向目标方向的箭头），并把这一态写进 GD §5。③ 提供 `__test.forceView({x,z})` 或直接给出可复现机位（如横屏站 t3 使用格时台面排出下缘，`dir=down`），让横屏可见态进入 e2e。
验收：(a) 竖屏手持焦串站烤炉，`[data-offscreen-hint] [data-hint-icon]` 存在且 rect ≥ 20×20。(b) 同帧 `#bbq-act` 的计算 `opacity === '1'`，文字颜色亮度 ≥ 200。(c) 横屏构造出可见态，断言 `display:flex`、贴边 ≤12px、`dataset.dir` 与投影方向一致，与 `#bbq-stick`、`#bbq-act`、`.card` 交叠为 0。双端连跑 3 次。
参考：胡闹厨房 2 画外的同伴或目标用「图标 + 箭头」贴边显示；B-090 验收 (b)。

### B-103 竖屏摇杆/动作键尺寸与底距统一成一个数，两键底边对齐
优先级：P2
来源：第 20 轮走查（竖屏 `#bbq-stick` 130×130 @(22,692)，底距 22px；`#bbq-act` 76×76 @(288,738)，底距 30px；中心 y 757 vs 776。GD §6 写摇杆 r=56（即 112px）、动作键 ⌀72；ART §1 写竖屏摇杆 128px。三处数值互不相同。B-072 只管横屏，B-060 只约束 safe-area 底距，两键对齐这件事目前没有条目负责）
需求：① 在 `config.ts` 定义竖屏 `stickPx / actPx / ctlBottomPx` 唯一常量，GD §6 与 ART §1 都改为引用该常量。② 两键底边对齐，底距 = `max(16px, env(safe-area-inset-bottom))`（与 B-060 合并实现，B-060 继续负责去掉死色带）。③ 动作键直径 ≥72px，保持 44px 触控下限以上。
验收：竖屏 390×844 断言 `#bbq-stick.rect.bottom === #bbq-act.rect.bottom`（±1px），`stick.width === CONFIG.stickPx`、`act.width === CONFIG.actPx`；`grep` GD §6 与 ART §1 中的摇杆尺寸，数值与常量一致；CDP 模拟 `safe-area-inset-bottom=34` 时两键底距都 ≥34px。连跑 3 次。
参考：胡闹厨房 2 移动端两键同一基线；ART §1 横屏已有的「动作键同步贴底距」写法。

### B-104 摇杆偏转→速度映射用固定步长 e2e 锁死（死区、线性段、满速上限）
优先级：P2
来源：第 20 轮走查（摇杆右拖 0.42R 后 0.8s 内位移 4.16m，约 5.2 m/s，高于 WASD 满速实测 3.27 m/s，也高于 GD §6 的 3.2 m/s；1fps 下指针真实按住时长可能远大于 0.8s，读数不可信，但现有 e2e 没有任何确定性断言能排除「部分偏转超速」）
需求：① 明确映射曲线并写进 GD §6：死区 8px 内速度为 0，之后按 `(d−8)/(R−8)` 线性（或给出曲线），满偏 = 3.2 m/s，任何偏转都不超过满速。② `__test` 提供 `stickAt(fx, fy)`（不依赖真实指针时序），配合 `tick(dt, n)` 做确定性推进。
验收：双端用 `stickAt(0.42,0)` 加 `tick(1/60, 60)`，位移 ∈ [0.40×3.2×0.9, 0.42×3.2×1.1]m（按所选曲线计算）；`stickAt(1,0)` 推进 1s，位移 ∈ [3.04, 3.36]m；`stickAt(0.05,0)`（死区内）位移 = 0；`stickAt(0.707,0.707)` 推进 1s，位移 ≤ 3.36m。连跑 3 次。
参考：胡闹厨房 2 的模拟摇杆按推杆幅度线性变速、满速封顶。

### B-105 玩家穿过圆凳/桌角时不得出现视觉穿模
优先级：P2
来源：第 20 轮走查（`port-02-joystick.png` 厨师 175–210 × 365–425 与 t4 左圆凳 ≈165–190 × 388–415 叠画；`land-02-joystick.png` 厨师 520–560 × 105–175 与 t4 桌左前角重叠。GD §5 规定「桌前顾客椅子不挡路」，玩家允许穿过椅子，但画面上看起来是人嵌进了凳子）
需求：① 二选一：方案 A 给圆凳加半径 0.22m 的软碰撞，只把玩家推开、不卡死，桌面仍不可穿越；方案 B 维持可穿越，但玩家与空凳的水平距离 <0.3m 时，凳子平滑下沉 4cm 并淡出到 opacity 0.35，离开后恢复。② 桌面本体（非椅子）与玩家胶囊体必须零重叠，补一条碰撞回归。
验收：双端让玩家从 t4 左侧沿直线穿过左圆凳位置，逐帧采样：方案 A 玩家中心到凳中心距离恒 ≥0.40m；方案 B 距离 <0.3m 的帧里凳子材质 `opacity ≤ 0.4`。两方案都要求玩家胶囊体与任一桌面 AABB 的交叠深度为 0。连跑 3 次。
参考：胡闹厨房 2 的厨师与可穿越装饰物之间有轻推开或遮挡淡出处理，从不叠画。

---

本轮新单 9 条（`B-097`–`B-105`，其中 P1 两条），另有 5 条沿用既有编号（`B-078` / `B-079` / `B-093` / `B-094` / `B-081`）。

需要人工确认的有两条：
- **B-099 小费**：是我按实收反推出来的。竖屏 ¥60、横屏 ¥61，按 §2「耐心 ≥0.8 给满」本应都是 ¥62（小费 ¥14）。上菜那一刻的耐心比例本轮没有直接读到，请开发先看实现里有没有这一条。
- **门边斜放的木块**（`port-07` / `port-09` / `land-06`）：我认不出是什么，只在报告里记了疑问，没有开单，请开发确认它是什么。

---

## 第 21 轮新增（2026-11-21 20:38Z）

### B-106 局内与结算星级共用单一计算函数，修正「0 服务/多愤怒仍给 2★」
优先级：P1
来源：第 21 轮走查（同一局 `angry=2` 时局内 `#bbq-hud .stars` 为 **1★**（`port-07-angry-hud.png`）；随即以 `money=190/180, served=0, angry=2, waste=0` 结束关卡，结算 `.stars-big` 却是 **2★**（`port-08-results-angry.png`）；`served=0, angry=5/6` 仍给 2★ 并显示「目标达成，进入第 2 关」，见 `port-05-results.png`、`land-05-results.png`）
需求：① 抽单一纯函数 `calcStars({money,target,served,angry,waste})`，局内顶栏与结算面板同源调用；局内若需展示「当前最高可得」，必须换文案（如「满意度」）而不是同样叫「评级」。② 修订 `GAME-DESIGN §4` 与实现：`served === 0` 或 `angry >= 3` 时星级上限锁 1★，禁止「一个人没服务、气走 5–6 人」拿 2★。③ 两处星级容器挂 `data-stars="N"` 与 `aria-label="评级 N/3"`（衔接 `B-082`）。
验收：e2e 双端构造 4 组状态（`{money:190,served:0,angry:2}`、`{money:190,served:0,angry:5}`、`{money:190,served:4,angry:0,waste:0}`、`{money:130,served:3,angry:1,waste:0}`），断言打烊前 1 帧 `#bbq-hud .stars[data-stars]` 与结算首帧 `.stars-big[data-stars]` 严格相等；前两组 `=== 1`，第三组 `=== 3`；各连跑 3 次、0 JS error。
参考：胡闹厨房 2 局内星级进度与结算星级共用同一阈值表；沙威玛传奇把差评直接折抵当日评级，不会出现局内扣星、结算反升。

### B-107 愤怒离店补 `#bbq-popups` 扣分飘字与头顶红怒符号，双端不裁切
优先级：P1
来源：第 21 轮走查（3 位顾客耐心归零 `angry 0→3`、`customers 3→1` 后 `#bbq-popups` 实测为空字符串，无任何扣分飘字；`port-03-angry.png` 顾客头顶无 `GAME-DESIGN §7` 的红怒符号；横屏 `land-03-angry.png` 上方两枚「愤怒离店」胶囊被视口上沿裁掉上半截）
需求：① 离店事件必须派发可见飘字（`愤怒离店 −1★` 或 `满意度 −1`，寿命 ≥1.2s，由 `flow.update(dt)` 驱动）。② 顾客进 `leaving-angry` 时头顶显示 ≥24px 内联 SVG 红怒符号 ≥0.6s，再沿回门路径离场（落实 §7）。③ 飘字与世界锚定离店标签统一四边钳制（水平 `[8, vw-8]`、垂直 `[topbar.bottom+4, vh-8]`），多人同帧离店自动错行。
验收：双端令 3 位就座顾客同时耐心归零，`MutationObserver` 断言 `angry` 递增后 0.5s 内 `#bbq-popups .popup` ≥1 条且匹配 `/愤怒|满意度/`；所有 `.popup` 与离店标签满足 `top ≥ topbar.bottom+4 && bottom ≤ vh-8 && left ≥ 8 && right ≤ vw-8`，与 `.topbar` 交叠 `0`；头顶红怒节点 `≥20×20`；各连跑 3 次。
参考：胡闹厨房 2 订单超时顶部闪红并弹出明确扣分飘字；沙威玛传奇顾客耐心耗尽头顶出怒脸并伴随离店动画。

### B-108 HUD 全量字号 ≥13px 硬门禁，补齐 `.tb-badge` / `.order-num` 桌单编号
优先级：P1
来源：第 21 轮走查（第 5 次复发：公网实测 `#bbq-act .cap` **10px**、`.card .pr` **11px**、`.topbar .k` **12px**、`.gb-txt` **12px**，全部低于 `ART-DIRECTION §5` 的 13px；`.tb-badge` 与 `.order-num` 在公网构建里均为 `null`，订单卡与餐桌无编号对应，`port-02-joystick.png`、`land-02-joystick.png`）
需求：① 全部 HUD 文本（`.topbar .k/.v`、`#bbq-act .cap`、`.card .nm/.pr`、`.gb-txt`、`.cb-txt`）双端一律 `font-size ≥13px`，禁止矮屏 media query 缩字；动作键说明可加宽或两行排布防省略。② 补齐并确认线上生效 `.tb-badge`（≥14px，卡内桌号徽章）与 `.order-num`（餐桌世界锚定桌号牌），与订单卡编号/色标一一映射。③ 字号下限与桌号存在性写进发布后回归脚本，防止旧包或样式回归再跌破 13px。
验收：双端就座 2–3 位顾客并触发烤制/切配态，断言上述 6 类文本 `parseFloat(fontSize) ≥ 13` 且 `scrollWidth ≤ clientWidth`；`.tb-badge` 与 `.order-num` 数量 `=== seatedCount`、`.tb-badge` `fontSize ≥ 14`、编号集合一致；针对线上公网 URL 验证，各连跑 3 次。
参考：胡闹厨房 2 掌机/移动端保证订单图标与数字高对比可读；沙威玛传奇用高对比大号数字建立桌位—订单瞬时对应。

### B-109 首屏内联加载骨架 + 首包体积拆分与监控
优先级：P2
来源：第 21 轮走查（公网 TTFB `680ms`、JS bundle `614KB`，SwiftShader + 宿主 load 13.6/8 核下 `DOMContentLoaded` 实测 `8947ms` / `29358ms`、`开 店` 可见 `8969ms` / `10674ms`，全程无骨架或进度；高负载与软件渲染放大了绝对值，但「无骨架」本身是产品缺口）
需求：① `index.html` 内联暖色骨架层 `#bbq-boot-splash`（店名 + 纯 CSS 炭火呼吸点 +「正在生火准备…」），不依赖主 bundle，开店面板首帧渲染后平滑淡出。② 构建拆出 Three.js vendor chunk 与业务 chunk，开 gzip/brotli 传输校验并对单包体积设告警阈值。③ 走查脚本把真机/低负载冷启动基线与高负载软渲数据分列记录。
验收：公网限速（Fast 3G）或常规冷启动下，`responseEnd` 后 300ms 内 `#bbq-boot-splash` 可见且文本非空；`phase==='menu'` 且「开 店」可见后 500ms 内骨架已移除或 `display:none`；`dist/assets/` 有独立 vendor chunk 且业务入口 chunk 未压缩 ≤180KB；各连跑 3 次。
参考：胡闹厨房 2 进关前的动态火焰加载幕布；沙威玛传奇首屏 1 秒内出品牌底图 + 进度条。

本轮新单 4 条（`B-106`–`B-109`，其中 P1 三条：`B-106` 星级口径、`B-107` 离店反馈、`B-108` 字号与桌号），另有 4 条沿用既有编号（`B-081` 公网旧包、`B-078` 横屏摇杆压料箱、`B-093` 世界标签裁切、`B-060`/`B-103` 竖屏两键对齐）。

需要人工确认的：
- **`B-081` 是唯一阻断项**：公网 `index-BklOlgyL.js` / 本机 `:3035` `index-Shggdsxc.js` / `dist/assets/` `index-DBAY4hMS.js` 三者不一致，线上用户看不到 B-072/B-079/B-090 等已修项。请先确认 openfolio.uk 的源站与缓存指向，再谈任何线上验收。
- **`B-106` 的星级语义**需要产品口径决定：`served=0` 但营业额达标到底该给几星？本轮按 `GAME-DESIGN §4` 推导为「≤1★」，若产品不同意请改 §4 条款而不是只改代码。

## 第 20 轮开发（2026-11-21 20:22–21:15Z，agy gemini-4-neon-xhigh）

> 模型说明：`claude-opus-5-5-high` 首轮即 `RESOURCE_EXHAUSTED`（Individual quota reached，报错称 3h9m 后重置）→ 回落 `gemini-4-neon-xhigh` 完整跑完实现。`agy-dev.sh` 退出码 3 是**误判**：脚本 `tail -30` 的额度正则命中了首模型 429 那行，实际是 2400s 的 `timeout` 把 fallback 的 e2e 阶段掐断（日志 `error: interrupted` / `EXIT=124`），两种模型并未同时耗尽。

### B-094 状态：DONE（`8e272c0`，部署包 `assets/index-cruZx0Wg.js`）
实现：`buildCrate()` 按 `dish` 出三种实物 —— 五花肉＝3 根斜插肉串（瘦肉 `#e8907c` + 肥边 `#f5d0b8`）、菌子＝7 个圆帽菌盖簇（`#a97b4f` + 米白柄）、米线＝盘绕线团（`#e8c96a`），食材节点带 `userData.food`；箱前沿加内联 canvas 生成的斗方食材挂牌（`textures.ts` 的 `crateSign` 图集，无外部图片）；左墙装饰架改为 3 只空竹筐 + 陶罐并用降饱和材质（`decorBamboo/decorClay/decorDark`）；`controls.ts` 新增 `FOOD_ICONS`（`pork/mushroom/mixian` 内联 SVG，带 `data-food`），料箱使用格动作键换成对应食材图标；`hud.ts` 订单卡 `.nm` 与 `.bubble` 前置同一图标；新增只读遥测 `__test.foodNodes()` / `__test.decorSat()`。
验收（`e2e/crates.mjs`，本机 `:4176` 预览 `E2E_RUNS=2` 双端 + 部署后 `:3035` 双端各 1 次，全绿）：**每端 10 PASS，末行 `CRATES OK`**
- 主色 `pork rgb(232,144,124) / mushroom rgb(169,123,79) / mixian rgb(232,201,106)`，两两 RGB 距离 **80.2 / 59.8 / 103.8**（门限 ≥40）；覆盖率 **0.86 / 0.94 / 0.76**（门限 ≥0.6）；`decorSat 0.176 ≤ 0.316`（食材最低饱和度 0.47 − 0.15）。
- 三个料箱使用格的 `#bbq-act` 文案与 `data-food` 图标全部匹配（`取 五花肉/菌子/米线`），不再是虚线占位。
- 订单卡 `.card .nm [data-food]` = 3 张且与菜名一一对应；`.bubble [data-food]` = 3。
- 双端 `0 pageerror / 0 console.error`；回归 `smoke / landscape / orders / chop / grill` 全 `OK`（`grill` 首次因 load≈10 时 renderer 被杀 `Target closed`，重跑即过，非产品缺陷）。
部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200，两边均引用 `assets/index-cruZx0Wg.js`；`saltline-ref` 未动。
vision 复核：竖屏放大后独立读出「三个筐＝红肉串 / 褐圆帽菌子 / 金黄盘绕米线，颜色形状差异明显」，动作钮「蘑菇图标 + 取菌子」；横屏放大同样能分出三种（vision 原文「足够区分，即使不看挂牌也能辨认」）。
与任务书的偏差（下轮复核）：① 横屏为塞进 16px 食材图标，订单卡内距 6→4px、`.ring` 26→22px、`.tb-badge` 24→21px（字号未降，仍 13px）；② 筐面挂牌在横屏下只有约 20px 高，图标勉强可辨、文字不可读；③ `props.ts` 里空筐内壁 / 陶罐罐口两个面片误加到 `group` 而非 `decorGroup`，视觉无差但归属不洁。
下一轮建议：`B-108`（HUD 字号 ≥13px 硬门禁 + `.tb-badge`/`.order-num` 补齐）优先于 `B-093`——本轮 vision 再次点名 `#bbq-act .cap` 10px 偏小，且这是第 5 次复发；`B-078` 横屏摇杆压 `crate-pork` 依旧存在（截图左下摇杆盖住最左料箱一角），属第 3 轮沿用。

---

## 第 22 轮新增（2026-11-21 21:08Z）

### B-110 成品菜（stage=plated）禁止引导去垃圾桶丢掉
优先级：P1
来源：第 22 轮走查（`port-serve-serve-plated.png`、`land-serve-serve-plated.png`：装盘台刚装出成品菜，在无匹配顾客时右下动作键显示 `去垃圾桶丢掉`，横屏金色引导箭头指向左侧货架底层，文案与箭头互相矛盾）
需求：修正动作键与世界空间引导箭头的状态机优先级：玩家手持完好成品菜（`carrying.stage === 'plated'`）时，若场上存在点该菜的等待顾客则指向对应餐桌，若暂无匹配顾客则动作键显示「等顾客下单 / 端菜待上菜」并隐藏或指向餐区，严禁文案出现「去垃圾桶丢掉」或把引导箭头指向 `trash`；仅当 `carrying.stage === 'waste'`（焦糊废料）时才主动引导前往垃圾桶。
验收：e2e 在无顾客状态下执行取料→切配→烤熟→装盘，断言 `carrying.stage === 'plated'` 时 `#bbq-act` 文本不匹配 `/垃圾桶|丢掉/`、世界引导目标 `hint !== 'trash'`；再测烤焦取下 `carrying.stage === 'waste'` 时 `hint === 'trash'` 且按钮文案含「丢」；横竖屏各连跑 3 次 100% 通过。
参考：胡闹厨房 2 / 沙威玛传奇（做好的成品餐点默认处于待出餐或暂存态，绝不主动提示丢弃，仅烧焦废品触发丢弃引导）。

### B-111 烤炉烤串熟/焦视觉放大、三烤位物理分格与移除双层进度条叠压
优先级：P1
来源：第 22 轮走查（`port-grill-grill-raw.png`~`burnt.png`、`land-grill-grill-raw.png`~`burnt.png`：烤炉上的串仅几像素粗细被烤网强高光淹没，`t=6.72` 熟与 `t=13.72` 焦几乎看不出 3D 颜色差异；三烤位的分隔线极弱，两张判读一次读成 3 个槽位、一次读成连续横纹；DOM `.gb` 进度条下方可见一小截更短的暗色短条，与 `src/game/grill.ts` 里那套 3D sprite 进度条吻合）
需求：① 放大烤炉上烤串模型尺寸并降低烤网前沿高光反射强度，使食材轮廓与阶段变化清晰可读：生串→`t=6s` 切至 `#d98a3d` 金黄并生成金色热气粒子→`t=12s` 切至 `#241d18` 焦黑并生成明显浓灰烟；② 在烤炉台面增加 3 个独立槽位分隔栏/炭床框线，一眼辨识 3 烤位；③ 移除与 DOM `.gb` 重复的 3D 世界进度条，烤位只保留唯一一套屏幕空间进度条。
验收：e2e 冻结时钟推进至 `t=0.12 / 6.72 / 13.72`，断言烤串材质色值在 `cooked` 阶段接近 `#d98a3d`、`burnt` 阶段亮度较 `cooked` 降低 ≥50%；断言场景中烤炉不再渲染重复的 3D 进度条对象（DOM `.gb` 外无重叠进度条）；横竖屏截取三烤位满载与单烤位熟/焦图目视核验分格与色变清晰，连跑 3 次 0 JS error。
参考：胡闹厨房 2（炉灶/烤架分格清晰、单套高对比进度条、熟与烧焦具备强烈颜色与烟雾警示差异）。

### B-112 收款飘字 `+¥xx` 防碰撞安全区定位与小费明细展示
优先级：P1
来源：第 22 轮走查（`land-serve-serve-paid.png` 中 `+¥62` 直接压住顶栏 `.topbar` 左侧「第 1 关」的「第」字；`port-serve-serve-paid.png` 中 `+¥62` 压住顾客头顶「用餐中」气泡文字；且仅显示总价未拆出小费）
需求：将 `#bbq-popups` 收款飘字做视口安全区夹紧（强制 `top >= topbar.bottom + 8px`，左右不越界）并与同桌顾客气泡做避让偏移（如在餐桌右侧或气泡上方留出 ≥8px 间距）；飘字展示总额及小费构成（如 `+¥62` 旁/下行附 `+¥14 小费`），并在收款后 0.5s 内驱动顶栏营业额数字做可读的递增滚动与微缩弹跳高亮。
验收：e2e 在横屏 844×390 与竖屏 390×844 对最靠近顶栏的 `t1` 桌完成上菜，收款瞬间读取 `#bbq-popups`、`.topbar` 与顾客气泡的 `getBoundingClientRect()`，断言飘字与 `.topbar` 重叠面积 `= 0`、与顾客气泡重叠面积 `= 0`、飘字文本含总金额及小费数值、1.5s 后自动清除；采样收款后 3 帧顶栏营业额可见过渡或高亮 class；双视口各连跑 3 次通过。
参考：沙威玛传奇（收款时基础收入与绿色小费标签分明弹出在顾客侧上方，绝不遮挡顶部状态栏）。

### B-113 切配进度条避让角色头身与简化「放+切」首按交互
优先级：P1
来源：第 22 轮走查（`port-chop-chop-1of3.png`、`port-chop-chop-done.png`、`land-chop-chop-1of3.png`、`land-chop-chop-done.png`：`#bbq-chop .cb` 悬于砧板上方正好挡住角色整张脸与身体；且拿生串到砧板需按 5 次「放上台+切×3+取回」才能拿走，动作键仍显示斜串图标）
需求：① 调整 `#bbq-chop .cb` 锚点至砧板台面前沿外侧下方（或错开角色站立侧），确保既不压菜板食材也不压角色头身，且横屏不进入左下摇杆/右下动作键矩形；② 简化切配交互：手持生串在砧板第 1 次按下动作键时自动「放上砧板并执行第 1 刀（1/3）」，累计 3 次点按完成切配，且切配中动作键切换为菜刀 SVG 图标以区别于取串。
验收：e2e 在横竖屏切配 1/3 与 3/3 时断言 `#bbq-chop .cb` 的 `getBoundingClientRect()` 与角色屏幕包围盒、摇杆、动作键重叠面积均为 `0`；手持生串站砧板连续按下 3 次即可达到 `已切好 ✓`（不再需要额外空按 1 次放台）；同帧连点 12 次不复制物品、0 JS error，横竖屏各连跑 3 次通过。
参考：胡闹厨房 2（放下即开切、进度条紧贴案板外缘不挡厨师动作与菜品视觉）。

### B-114 竖屏后墙外越界木地板与右上黑板被右缘裁切修复
优先级：P1
来源：第 22 轮走查（`port-chop-chop-1of3.png`、`port-grill-grill-raw.png`、`port-serve-serve-paid.png`：竖屏 390×844 下后墙绿色檐口上方露出大块越界木地板，越过 `ART-DIRECTION §1`「可见地面永远落在 12×9m 世界里」；右上菜单黑板被画面右缘裁掉一部分，标题不可读）
需求：检查竖屏正交相机俯角 50° 下的世界边界与墙顶遮罩：裁去或用暗色背景遮挡后墙以外（`z < 0`）的越界地板几何；调整菜单黑板挂位/宽度使其完整落在视口内（或收窄至右缘留 ≥8px 余量）。
验收：e2e 在 390×844 竖屏分别站砧板、烤炉、餐桌截取 3 张图，断言后墙顶沿上方像素无木地板重复纹理（均匀暗底）；菜单黑板包围盒 `left ≥ 0 && right ≤ vw-8`（或按设计固定在墙内完整可见），连跑 3 次回归通过。
参考：胡闹厨房 2（固定俯视场景严格收口墙顶黑边边界，墙面装饰物严格贴墙不穿透屋檐）。

### B-115 持物状态切换时立即清除残留的引导提示 Toast
优先级：P2
来源：第 22 轮走查（`land-serve-serve-spam.png`：玩家已手持生串且右下动作键红圈提示 `手上有东西`，但屏幕正中仍残留前序空手触发的 `去料箱取料` 胶囊，与当前状态矛盾）
需求：在 `carrying` 状态发生变更（从空手变为持物、或持物阶段切换）及进入有效交互站点圈时，立即清除或刷新屏幕上尚未到期的旧引导提示 Toast，避免展示过期的反向指令。
验收：e2e 模拟空手非站点点击触发 `去料箱取料` 提示后，立即走到料箱取料使 `carrying !== null`，断言取料后下一帧内屏幕上不存在文案为 `去料箱取料` 的可见提示元素，横竖屏各跑 3 次 100% 通过。
参考：胡闹厨房 2（操作反馈提示随角色持物状态变化即时覆盖或消隐，绝不与当前手部状态冲突）。

本轮新单 6 条（`B-110`–`B-115`，其中 P1 五条：`B-110` 成品菜误导向垃圾桶、`B-111` 烤炉熟/焦可读性、`B-112` 收款飘字碰撞、`B-113` 切配进度条挡脸、`B-114` 竖屏越界地板/黑板裁切；P2 一条：`B-115` 残留引导 Toast）。
沿用既有编号 3 条：`B-081`（公网旧包三方不一致，仍是唯一 P0）、`B-072`（横屏摇杆 112px 未上线）、`B-108`（HUD 字号/桌号）。

需要人工确认的：
- **`B-081` 仍是唯一阻断项**：公网 `index-BklOlgyL.js` / 本机 `:3035` `index-Shggdsxc.js` / 仓库 `dist/assets/` `index-Juy7ZBi9.js` 三方不一致，本轮 24 张截图全部来自公网旧包，B-072 / B-094 / 桌号徽章等已落地项无法在线上验证。
- **`B-111` 里「烤炉 3 烤位是否有分格」两次判读矛盾**（一次读到 3 个槽位、一次读到连续横纹），开单前请开发直接看 `stall`/`grill` 几何确认，再做视觉强化；`B-110` 的「引导箭头指向左侧货架」也建议复核是否只是 hint 状态机没跟上 carrying。


## 第 22 轮开发（2026-11-21 21:40–22:05Z，agy 回落 gemini-4-neon-xhigh）

> 模型：`claude-opus-5-5-high` 首轮即 `RESOURCE_EXHAUSTED`（重置 1h50m）→ 自动回落 `gemini-4-neon-xhigh`，一次跑完，退出码 0（非误判 3）。

### B-106 状态：DONE（`1de884e`，部署包 `assets/index-DDOXf5Qv.js`）
实现：新增 `src/game/stars.ts` 纯函数 `calcStars({money,target,served,angry,waste})`（基础表沿用 §4，新增 `served===0` 与 `angry>=3` 上限锁 1★）；`Flow.starsNow()` 统一供 `endLevel()` 与 `main.ts onTimeLeft` 调用，删除旧 live 公式；`#bbq-hud .stars` 与 `.stars-big` 均挂 `data-stars="N"` + `aria-label="评级 N/3"`；`docs/GAME-DESIGN §4` 补上限条款。新增 `e2e/stars.mjs`（4 组状态 × 双端 × 连跑 3 次）。
验收（自跑）：`npx tsc --noEmit` 0 错误、`npm run build` OK、`ci-deploy.sh` DEPLOY OK、`127.0.0.1:3035/` 与 `127.0.0.1/bbq/` 均 200。
- `stars.mjs` 在**部署后**的 `:3035` 双端各 2 次全绿：A/B `served=0` → 1★、C → 3★、D → 2★，打烊前 1 帧与结算首帧 `data-stars` 严格相等，0 JS error，末行 `STARS OK`。
- 截图复核（竖屏 390×844）：局内 `angry=3` 时顶栏 **1 颗实心**（`评级 1/3`）；结算面板 `¥190/¥180、服务 0 位、愤怒 2 位` → **1 颗实心**，与局内一致，旧「局内 1★ / 结算 2★」矛盾消除。
- 回归：agy 侧 `e2e/levels.mjs`（5 PASS）、`e2e/orders.mjs`（全 PASS）在提交后复跑为 OK；调度方本地重跑 `levels.mjs` 时宿主 load 18（他人 cron 并发）导致 renderer 被杀，属环境，不计产品缺陷。
遗留（下轮处理）：
1. **开局首帧即 1★**：`served=0` 上限让开局顶栏就是 1 颗实心星，与结算口径一致但缺正反馈 → 建议把局内三颗星改文案为「满意度」并允许开局 "待评"（空心三星），或达标前不显示星数。
2. **结算文案**：`0 位服务 + 2 位愤怒` 与绿字「目标达成，进入第 2 关」并列仍读着别扭，建议改「营业额达标，进入第 2 关」并让星级说明一行提示原因（如「未服务任何顾客，最高 1★」）。

## 第 23 轮新增（2026-11-21 22:08Z）

### B-116 结算面板补齐星级归因说明、达标低星文案解耦与小费拆解
优先级：P1
来源：第 23 轮走查（新包 `1de884e` `port-03-results-angry3.png` 营业额 ¥300/¥180、服务 0 位、愤怒离店 3 位时，绿字「目标达成，进入第 2 关」与 `★☆☆` 赤裸并列且零解释；`port-01-results-badrun.png`、`land-01-results-badrun.png` 差局仅写「离目标还差 ¥140」；`port-07-results.png`、`land-07-results.png` 营业额 ¥200/¥180 拿 2★ 既未说明因 1 位离店失掉第 3 星，也未拆解小费构成）
需求：① 在 `.stars-big` 下方新增数据驱动的 1 行星级归因槽 `[data-star-reason]`，严格对应 `GAME-DESIGN §4` 规则输出原因（如 `served===0` 显示「未服务任何顾客，评分锁定 1★」；`angry>=3` 显示「愤怒离店 3 位，评分锁定 1★」；`r>=1 && angry>0` 显示「营业额达标，因 1 位顾客愤怒离店错失 3★」；3★ 显示「零愤怒达标，完美营业！」）；② 当 `money >= target` 但星级被上限条款锁 1★ 时，副标题由「目标达成，进入第 2 关」改为中性文案「营业额达标（评分偏低），可进入第 2 关」；③ 结算「营业额」行附小费明细 `[data-revenue-breakdown]`（如 `¥200（含小费 ¥32）/ ¥180`），让玩家直观看到小费与愤怒/废料对评分的影响。
验收：e2e 双端构造 4 组结算状态——(a) `money=300, served=0, angry=3`：断言 `[data-star-reason]` 可见且匹配 `/未服务|愤怒离店.*1★/`、副标题匹配 `/营业额达标/` 且不含无修饰「目标达成」；(b) `money=200, served=3, angry=1, waste=0`：`[data-star-reason]` 匹配 `/愤怒离店.*1.*3★/`；(c) `money=40, served=0, angry=2`：`[data-star-reason]` 非空可见；(d) 含小费局 `[data-revenue-breakdown]` 匹配 `/含小费 ¥\d+/` 且数值与 `flow` 累计小费相等；844×390 下所有按钮 `rect.bottom <= 390`；双视口各连跑 3 次、0 JS error。
参考：胡闹厨房 2 结算页逐行拆分「订单基础分 + 小费 − 超时扣分」并标示 1/2/3 星分数门槛；沙威玛传奇打烊账单明列营收、小费与差评扣项。

### B-117 HUD 动作键与摇杆补齐按钮/ARIA 语义、舒适热区与文案同帧同步校验
优先级：P1
来源：第 23 轮走查（`run-port.json`、`run-land.json` 中交互热区清单 `hitTargets` 均为 `[]`——`#bbq-act` 与 `#bbq-stick` 为裸 `div` 无 `role`/`aria-label`/`tabindex`，无障碍与自动化均取不到控件；动作键 `76×76` 离移动端 `84–88px` 舒适热区偏紧；公网旧包横屏拿到生串后 `carrying={pork,raw}`、`actionLabel='手上有东西'`，但 `#bbq-act` DOM 仍滞留「去料箱取料」，存在时序回归风险；见 `port-02-orders-live.png`、`land-02-move-drag.png`）
需求：① `#bbq-act` 改为原生 `<button type="button">`（或加 `role="button" tabindex="0"`），实时同步 `aria-label` 与当前动作文案、`aria-disabled` 与可执行态一致，并将触控热区扩大至 `≥84×84px`（外圈/透明点击区扩展，不遮挡场景主体）；② `#bbq-stick` 增加 `role="application"`、`aria-label="移动摇杆"`、`aria-roledescription="虚拟摇杆"`；③ `controls` 在 `carrying` 或 `actionLabel` 变更当帧同步写入 `#bbq-act` 文本与 `aria-label`，阻断跨帧滞留。
验收：e2e 在 390×844 与 844×390 下查询 `button, [role="button"]` 必须命中 `#bbq-act`，断言 `aria-label === __test.state().actionLabel` 且非空、`rect.width >= 84 && rect.height >= 84`；`#bbq-stick` 满足 `[role="application"][aria-label]`；双端取生串后等待 2 帧 rAF 断言 `#bbq-act` 文本与 `aria-label` 均不再含「去料箱取料」且与 `state().actionLabel` 一致；双视口各连跑 3 次、0 JS error。
参考：WAI-ARIA Button / Application 规范与移动触控人因（主操按键 84–88px 舒适命中区）。

### B-118 模态遮罩层级收口：进入菜单/结算态隐藏世界标注，禁止桌号圆牌穿透遮罩
优先级：P1
来源：第 23 轮走查（新包 `1de884e` `port-03-results-angry3.png`：打烊结算弹窗展开并开启背景压暗模糊时，画面右缘中段出现一枚清晰未模糊且被右缘裁切的红色 4 号桌牌 `(4)`，说明 `#bbq-rings`/`.order-num` 的 `z-index` 高于模态遮罩层且未在非游玩态隐藏）
需求：① 统一层级规范：世界标注层（`#bbq-rings`、`#bbq-bubbles`、`#bbq-popups`、`#bbq-chop`、`#bbq-grillbars`、`#bbq-offscreen`）`z-index ≤ 20`，主 HUD 层 `30`，模态遮罩及 `.bbq-panel` `≥ 50`；② `phase === 'menu' || phase === 'results'` 时立即隐藏 `#bbq-rings`、`#bbq-bubbles`、`#bbq-offscreen` 等局内标注节点，防止任何桌号或光圈浮在弹窗遮罩之上。
验收：e2e 双端在 `t4`（及 `t1–t3`）均有就座顾客时直接触发打烊进入 `phase === 'results'`，断言 `#bbq-rings` 及 `.order-num` 全部满足 `display === 'none'` 或 `opacity === '0'`，且模态遮罩 `parseInt(getComputedStyle.zIndex) > parseInt(getComputedStyle(rings).zIndex)`；`port-03` 同场景复拍不再出现穿透遮罩的桌号圆牌；双视口各连跑 3 次、0 JS error。
参考：胡闹厨房 2 / 沙威玛传奇进入结算弹窗时立刻清退全部世界空间标注并置顶模态遮罩。

### B-119 角色碰撞台面/料箱边角时补齐轻量受阻反馈与倒角滑行
优先级：P2
来源：第 23 轮走查（WASD/方向键在空旷区位移正常：横屏 A 2.83m / D 2.45m、竖屏 W 3.04m，但贴近或进入台面/料箱碰撞盒时对应方向位移归 0 且零反馈——无撞击音、无角色微弹、无提示，只看到「人不动」）
需求：① 玩家存在移动输入（`|input| > 0.1`）但被静态碰撞体阻挡致实际位移 `< 0.01m` 时，触发轻量受阻反馈：角色沿撞击法线做 0.08s 轻微弹性回弹/原地踏步，并通过 `flow` 派发带 0.4s 冷却防抖的 `onBump` 事件（供轻木碰音效接入）；② 对台面/料箱碰撞盒四角做 ≤0.18m 的自动倒角滑行（corner slide），玩家斜向擦过边角时顺滑沿切线滑出而不被直角死卡。
验收：e2e 双端让玩家面朝料箱台面持续推进 0.5s，断言 `bump` 反馈计数递增 ≥1 且 0.5s 内 ≤2（防抖有效）；从台面边角偏移 0.12m 沿贴边斜向推进 1s，断言玩家沿切线成功滑过且位移 ≥1.0m；双视口各连跑 3 次、0 JS error。
参考：胡闹厨房 2 厨师贴台面移动会自动沿边角顺滑滑行，正面顶墙伴随轻弹与脚步动态反馈。

### B-120 首屏开店卡片增加云南炭火烤串视觉徽标与品类首行提示
优先级：P2
来源：第 23 轮走查（`port-01-first-screen.png`、`land-01-first-screen.png`：首屏卡片全为纯文字排版，背景是重度模糊的静态场景，没有任何「烤肉店经营」的画面元素；首行「柳真真云南烤肉」仅为店名，第二行「炭火生香，小店开张。」才出现品类语境）
需求：① 在首屏卡片标题上方/左侧增加 1 枚内联 SVG 云南炭火烤串徽标（≥48×48px，暖金与炭火橘配色，符合 `ART-DIRECTION §2/§5` 禁 emoji 约束），带轻微炭火呼吸动效；② 在标题旁或首行眉标直接交代品类定位（如「云南炭火烤肉 · 单人经营模拟」），3 秒内建立首眼品类认知。
验收：e2e 双端在 `phase === 'menu'` 截帧，断言 `.bbq-panel svg[data-brand-emblem]` 可见且 `rect.width >= 48 && rect.height >= 48`、卡片可见文案含「经营」或「烧烤/烤肉」定位词、面板完整落于视口内（`rect.top >= 8 && rect.bottom <= vh - 8`）；双视口各连跑 3 次、0 JS error。
参考：沙威玛传奇 / 胡闹厨房 2 开屏主卡均带标志性食物或火焰视觉徽章，首眼即传达核心玩法品类。

本轮新单 5 条（`B-116`–`B-120`，其中 P1 三条：`B-116` 结算星级归因与小费拆解、`B-117` HUD 动作键/摇杆 ARIA 与热区、`B-118` 结算遮罩让桌号牌穿透；P2 两条：`B-119` 撞台面零反馈、`B-120` 首屏缺品类视觉锚点）。

沿用既有编号 7 条：`B-081`（公网旧包，仍是唯一 P0）、`B-072`/`B-076`/`B-078`/`B-093`（横屏摇杆与订单卡布局，待 `B-081` 上线后验收）、`B-107`（愤怒离店无飘字/音效）、`B-057`（首屏无"继续上次进度"）、`B-109`（首屏无加载骨架）、`B-070`/`B-103`（菜单态未隐藏触控层、两键底距不齐）、`B-018`/`B-071`/`B-096`（横屏结算面板贴边与次按钮样式）。

需要人工确认的：
- **`B-081` 仍是唯一阻断项**：公网 `2290acb-202611210547` / `index-BklOlgyL.js`（连 `__test.stationGeom` 都不存在），本机 `:3035` 与仓库 `dist` 已同为 `1de884e-202611212205` / `index-DDOXf5Qv.js`。本轮 18 张主截图里 15 张来自公网旧包，`B-072`/`B-076`/`B-094`/`B-106` 的线上效果无法验收。请先确认 openfolio.uk 的源站目录/缓存指向，否则每轮走查都只能验旧包。
- **`B-116` 与第 22 轮开发自留的两条遗留完全重合**（开局首帧 1★、`0 位服务 + 2 位愤怒` 与"目标达成"并列），建议下一轮开发直接把 §4 的星级归因文案做进结算面板，避免第 4 次复发。
- **`B-118` 建议开发先自查而非直接改样式**：`port-03-results-angry3.png` 里那枚清晰未模糊的红色「4」桌号牌是判定层级事故的直接证据，但也可能是本轮测试用 `__test` 强制打烊导致的中间态，请先确认正常倒计时归零是否同样穿透。

## 第 24 轮开发（2026-11-21 22:41–23:10Z，agy 回落 gemini-4-neon-xhigh）

> 模型：`claude-opus-5-5-medium` 首轮即 `RESOURCE_EXHAUSTED`（429，重置 50m）→ 自动回落 `gemini-4-neon-xhigh`，一次跑完，退出码 0。

### B-110 状态：DONE（`5f7d148`，部署包 `assets/index-DXyUgwlT.js`）
实现（`src/game/stations.ts` 三处状态机）：
1. `nextHint()`：`plated` 且无匹配顾客 → `端菜等客下单`（原 `去垃圾桶丢掉`）；`waste` → `去垃圾桶丢掉`。
2. `nextTarget()`：`plated` 且无匹配顾客 → 返回 `null`（隐藏世界引导箭头），不再 `at('station','bin')`。
3. `resolveInteraction()`：`goto` 改为 `hasGuest`（无匹配顾客时不显示「去 X」离屏指引）；站错桌文案 `这桌要的是 X · 端走等单`。
新增 `e2e/plated-hint.mjs`（取料→切→烤→装盘真链路造 plated，12.6s 造 waste），断言 #bbq-act 文本不含 `/垃圾桶|丢掉|扔/`、`flow.hint === null`、`#bbq-offhint display:none`；waste 侧要求含「丢」且 `flow.hint.id === 'bin'`。
验收（agy 自跑）：`E2E_RUNS=3` 双端 6/6 PASS（`PLATED-HINT OK`）；`orders.mjs` 1/1 PASS；`offscreen.mjs` 双端 PASS。
验收（调度方复核，部署后打 `127.0.0.1:3035`）：`npx tsc --noEmit` 0 错、`npm run build` OK、`ci-deploy.sh` DEPLOY OK、`:3035` 与 `/bbq/` 均 200；`E2E_RUNS=1` 双端 10 条断言全 PASS、0 JS error。
截图复核（竖屏 390×844）：`port-plated-no-guest.png` 手持成品菜时动作键 `端菜等客下单`、无金色箭头、离屏指引 `display:none`；`port-waste-bin.png` 焦串时动作键 `去垃圾桶丢掉` + 左侧金色「垃圾桶」箭头，正反向均正确。
遗留（新发现，下轮处理）：
1. **动作键文案在 76px 圆内只有约 9px 字号、灰字低对比**：6 字中文（`端菜等客下单` / `去垃圾桶丢掉`）挤在一行，实机 390px 下需凑近才读得出。建议文案压到 ≤4 字（如 `端菜等客` / `去丢垃圾桶`→`丢弃`）并把动作键文案字号提到 ≥12px、对比度提到 WCAG AA；与 `B-117`（热区 84px + ARIA）合并做更划算。
2. `B-110` 只治了文案/箭头指向；玩家手持成品菜长时间无处可放（无暂存台）时仍只能一直端着等客，缺少「放回装盘台暂存」的兜底，属玩法层缺口，待 `B-111`/`B-112` 之后再评估。

## 2026-11-21 23:08Z 第 24 轮新增（B-121–B-124）

本轮只覆盖核心出餐链路 ③④⑤⑨⑩（料箱→切配→烤炉→装盘→上菜→收钱 + 连点鲁棒性），被测构建本机 `5f7d148-202611212302`（公网仍旧包，`B-081` 仍是唯一 P0）。

### B-121 烤炉焦糊态动作键区分警示文案与样式（替代金色「取烤串」）
优先级：P1
来源：第 24 轮走查（`port-02-grill-cooked.png`/`land-02-grill-cooked.png` 熟态 `已熟 ✓` 与 `port-03-grill-burnt.png`/`land-03-grill-burnt.png` 焦糊态 `焦了 ✗` 对比：炉上串在 14.1s 变为 `stage='waste'` 且卡片转红 `焦了 ✗`，但右下 `#bbq-act` 依然保持金色圆环手掌图标与 `取烤串` 文案、角色胸口浮标仍为金色 `取`，与正常熟串零区分）
需求：① `resolveInteraction()` 在烤炉待取槽位优先选择 `stage === 'cooked'` 的熟串（保持金色 `取烤串`）；当炉上仅剩焦糊废料（`stage === 'waste'`）可取时，动作键文案切换为 `取焦串`（或 `清理焦串`）并挂载警示态属性 `data-act-warn="true"`（警示红描边 `#e05a3a` + 警示红图标/文字），角色胸口浮标同步切换为红底或警示字样（如 `焦`/`清`），让玩家一眼识别正在清理废料而非收获好菜。② 不改变 `take-grill` 交互链与连点幂等性。
验收：e2e 在双视口（390×844、844×390）将切好的五花肉放上烤炉，推进至 +6.1s（`stage === 'cooked'`）断言 `#bbq-act` 文本等于 `取烤串` 且 `dataset.actWarn !== 'true'`；继续推进至 +14.1s（`stage === 'waste'`）断言 `#bbq-act` 文本匹配 `/焦|清/`、`dataset.actWarn === 'true'` 且计算样式边框色为警示红（R>200, G<110）；再测两烤位同时存在 1 熟 1 焦时 `#bbq-act` 优先显示 `取烤串` 且先取下 `cooked`；双视口各连跑 3 次、0 JS error。
参考：胡闹厨房 2（烧焦锅具/食材的交互提示与正常盛盘在颜色与文案上强区分，避免玩家误把焦物端上桌）。

### B-122 横屏桌位气泡与桌号圆牌 `(1)` 及离屏指引 `#bbq-offhint` 零重叠防截字
优先级：P1
来源：第 24 轮走查（`land-01-chop-progress.png`–`land-03-grill-burnt.png` 横屏 844×390 下，1 号桌气泡「烤五花肉拼盘」末尾「盘」字被 `.order-num` 圆牌 `(1)` 完全遮住变成「烤五花肉拼」；`land-04-plated-guide.png` 装盘手持 `plated` 时，`platedGuide={label:'1号桌'}` 弹出 `#bbq-offhint`「↑ 1号桌」直接压在 `(1)` 与气泡上，与上方 3D 金箭头形成四层叠压）
需求：① 调整 `.bubble` 与同桌 `.order-num` 的屏幕投影避让规则：当桌位位于视口上沿导致 `.bubble` 被下钳时，自动将 `.bubble` 水平错开 `.order-num`（或置于桌号牌侧边/下方留 ≥6px 间距），禁止 `.order-num` 覆盖气泡内菜名文字；② `#bbq-offhint` 布局计算将所有可见 `.bubble` 与 `.order-num` 纳入障碍物列表 `obs` 做避让，且当目标餐桌的 `.order-ring` 或 `.order-num` 已完整可见于视口内时不再把 `#bbq-offhint` 压在同桌标注上。
验收：e2e 在横屏 844×390（站切配台、烤炉、装盘台三机位）与竖屏 390×844 下让 `t1` 点「烤五花肉拼盘」并手持 `stage === 'plated'`，读取所有可见 `.bubble`、`.order-num`、`.topbar` 与 `#bbq-offhint` 的 `getBoundingClientRect()`，断言任意 `.bubble` 与 `.order-num` 重叠面积 `=== 0`、`.bubble` 文本无截断（`scrollWidth <= clientWidth` 且 `left >= 4 && right <= vw - 4`）、`#bbq-offhint`（若可见）与 `.bubble`/`.order-num`/`.topbar` 重叠面积均为 `0`；双视口各连跑 3 次、0 JS error。
参考：胡闹厨房 2 屏幕标注层（桌位订单、桌号与边缘箭头分区排布，绝不互压遮字）。

### B-123 `#bbq-popups` 飘字驻留 2.2s 长于 §7 的 0.8s，且切换到新操作阶段时不主动清场
优先级：P2
来源：第 24 轮走查 + 源码与真实时钟探针（`src/ui/hud.ts`：`.popup { animation: bbq-popup-hold 2.2s linear forwards }`，keyframes `0%,64% opacity:1 → 100% opacity:0`，约 2.2–2.4s 由 JS 移除节点；探针创建后 t=0 / 0.9s / 2.1s opacity 均为 1，t=3.4s DOM 中已无该节点。`GAME-DESIGN.md §7` 要求飘字上浮 0.8s，实现为 2.2s，约 2.75 倍；快节奏操作链切换时旧飘字会与新引导并存最多 2.2s。`port-04-plated-guide.png`、`land-04-plated-guide.png` 中红字 `丢弃` 与 `1号桌` 引导同屏，系截图恰好落在丢弃后 2.2s 窗口内）
需求：① 将操作类飘字（如 `.popup.warn` 的 `丢弃`）时长向 `GAME-DESIGN.md §7` 的 0.8s 对齐（不超过 1.0s），并带轻微上浮淡出；② 当玩家持物状态切换到新操作阶段（如 `plate` 装盘产出 `stage === 'plated'` 或 `serve` 上菜成功）时，立即清除或淡出 `#bbq-popups` 中仍在驻留窗口内的 `.popup.warn` 节点。
验收：e2e 在双视口连续执行「烤焦→丢弃焦串（触发 `丢弃` 飘字）→装盘产出 `stage === 'plated'`」，断言装盘完成下一帧内 `#bbq-popups .popup.warn` 可见数量 `=== 0`；单独触发一次 `丢弃` 飘字后等待 1.5s 断言该 DOM 节点已从 `#bbq-popups` 移除；双视口各连跑 3 次、0 JS error。
参考：`GAME-DESIGN.md §7`（飘字上浮 0.8s 节奏）与沙威玛传奇（新工序完成即时清场前序警示反馈）。

### B-124 「用餐中」订单卡与桌位气泡切换绿色完成态，与等待新客明确区分
优先级：P2
来源：第 24 轮走查（`port-05-serve-paid.png`、`land-05-serve-paid.png`：1 号桌上菜收款 ¥57 后顾客转 `phase='eating'`，右上订单卡 `烤五花肉拼盘 / ¥48·用餐中` 与桌位气泡 `用餐中` 的圆环为满环；`src/ui/hud.ts` 中 `const frac = c.phase === 'eating' ? 1 : patience / patienceMax`，即用餐中圆环固定满环，而刚坐下且耐心满的顾客同样是满环，两者不可区分，玩家快节奏扫视右上订单区时极易误当未出菜订单重复制作。依据为源码与 DOM，不是截图颜色读数）
需求：落实 `ART-DIRECTION.md §5` 规定的 `ok #9ecb6a` 语义色：当顾客 `phase === 'eating'` 时，① 订单卡（`.card[data-phase="eating"]`）与桌面气泡圆环切换为绿色 `#9ecb6a`（或绿色勾选 `✓` 图标），卡片描边/亮度略微收敛以在视觉层级上退居 `等待` 急单之后；② 保留 `用餐中` 文本直至顾客吃完离桌（与 `B-080` 兼容）。
验收：e2e 在双视口对 `t1` 上菜进入 `phase === 'eating'` 后，断言对应订单卡具备 `data-phase="eating"`、其圆环 SVG stroke 或完成态标记色为 `#9ecb6a`（`rgb(158, 203, 106)`）且与 `phase === 'seated'` 订单卡的金色圆环可程序区分，同时桌面气泡同步切换完成态颜色；双视口各连跑 3 次、0 JS error。
参考：`ART-DIRECTION.md §5`（主色 `#f0c060` 警示 `#e05a3a` ok `#9ecb6a` 三态语义分明）与胡闹厨房/沙威玛传奇（已交付订单即时转绿降噪，视线聚焦待做急单）。

本轮新单 4 条：P1 两条（`B-121` 焦糊态动作键仍金色「取烤串」、`B-122` 横屏桌位气泡被 `(1)` 圆牌与离屏指引叠压截字），P2 两条（`B-123` 飘字驻留 2.2s 长于 §7 的 0.8s、`B-124` 用餐中满环与等待新客不可区分）。沿用未修项：`B-081`、`B-078`/`B-114`（横屏摇杆压料箱 / 竖屏后墙越界）、`B-098`/`B-113`（世界浮标压角色）、`B-111`/`B-092`/`B-097`（烤串过小、无烟）、`B-065`/`B-112`（小费不拆解）、`B-100`（顶栏缺废料）、`B-066`（无音效）、`B-117`（动作键 76×76）。

### B-117 状态：DONE（`bc14d0d`，部署包 `assets/index-YjesMXwn.js`，2026-11-21 23:5xZ）
实现：`#bbq-act` 由裸 `div` 改为原生 `<button type="button">`（CSS 重置，`84×84`，保留 `pointerdown → input.pressAction()` 与 `.on/.deny`）；`.cap` 字号 `10px→12px`、`font-weight:700`、`rgba(245,232,216,.95)`，去掉 ellipsis，6 字文案完整显示；`aria-label` 实时等于 `state().actionLabel`（空态「当前无可执行动作」）、`aria-disabled` 与 `enabled` 一致（不用真 `disabled` 以免吞 pointerdown）；`#bbq-stick` 补 `role="application" aria-label="移动摇杆" aria-roledescription="虚拟摇杆"`；`src/main.ts` 新增 `syncAction()/refreshAction()`，在 `restart/nextLevel/onAction/每步仿真末尾/__test.tick()` 同帧刷新 DOM，消除跨帧滞留。
验收（本轮亲跑，非 agy 自述）：
- `npx tsc --noEmit` 0 错误；`npm run build` OK；
- 新增 `e2e/act-ui.mjs`（`E2E_RUNS=3` 双端 6/6 PASS，末行 `ACT-UI OK`，0 JS error）：`<button>` 命中且实测 `84×84`；`.cap` 12px / w700 / 对比度 `14.09:1`（最坏白底合成 `5.86:1`）/ `scrollWidth=clientWidth=72`（6 字「去垃圾桶丢掉」不截断）；`aria-label === state().actionLabel`，`aria-disabled` 出生点 true、料箱旁 false；`#bbq-stick` 具备 application+aria-label；取串后 2×rAF 文案与 aria 均同步为 `手上有东西→去切配台`；双端与 stick / order 卡交叠 0、全在视口内。
- 回归亲跑：`e2e/plated-hint.mjs` `PLATED-HINT OK`、`e2e/landscape.mjs` `LANDSCAPE OK`。
- 部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200 与 `127.0.0.1/bbq/` 200，index 均引用 `assets/index-YjesMXwn.js`。
- vision 复核（独立）：`e2e/shots/b117-port-crate.png` 读出「取 五花肉」、`b117-port-picked.png` 读出「手上有东西」，均完整清晰无省略号；但两次都判「动作键相对常见手游主操作键偏小、文案在圆内偏挤」，建议下轮把直径提到 88–92px 并给按压态加缩放/高光。
注意：本轮 `agy-dev.sh` 兜底的 `chore(agy): auto-checkpoint`（`fbb8aec`）把并发走查轮未提交的 `docs/PRODUCT-REVIEW.md`/`SPEC-BACKLOG.md` 一起提交了（内容完好，第 24 轮章节在），下次写任务书要显式禁止 `git add -A`。

## 2026-11-22 00:30Z 第 25 轮新增（B-125–B-128）

### B-125 局内顶栏补齐本关目标额与达成进度展示
优先级：P1
来源：第 25 轮走查（`port-15-hud-3seated.png`、`land-15-hud-3seated.png`、`port-10-level2.png`、`land-10-level2.png`：实测局内顶栏只有 `第 1 关 | 营业额 ¥0 | 时间 2:05 | 评级`，过关目标 `¥180`（第 2 关 `¥260`）仅在首屏卡片与结算面板出现，局中无法知道还差多少达标）
需求：在局内顶栏营业额槽位新增 `[data-level-target]` 展示当前营业额与本关目标额（格式 `¥{money} / ¥{target}`，如 `¥0 / ¥180`，第 2 关自动切换为 `¥0 / ¥260`）；通过 `flow` 的 `onMoney` / 切关回调当帧同步更新，达标（`money >= target`）时高亮提示（如 `ART-DIRECTION §5` ok 色 `#9ecb6a`），确保双端顶栏不换行、不超出视口安全边距。
验收：e2e 在竖屏 390×844 与横屏 844×390 下开局断言 `.topbar [data-level-target]` 可见且文本含 `¥0 / ¥180`；触发营业额变化（`onMoney`）后当帧断言文本同步为 `¥{money} / ¥180` 且与打烊结算面板目标数字完全一致；进入第 2 关后断言目标切为 `/ ¥260`；双端 3 连跑 0 JS error。
参考：胡闹厨房 2（局内左下/顶部常驻分数与 1/2/3 星目标刻度）；沙威玛传奇（营业中顶部实时对比当日收入与目标额）。

### B-126 结算/菜单模态态隐藏局内 HUD（摇杆、动作键、订单卡）
优先级：P1
来源：第 25 轮走查（`port-01-title.png`、`land-01-title.png`、`land-09-results.png`：首屏态 `#bbq-stick` opacity `0.85`、`#bbq-act` opacity `0.55` 且 `visible`；结算态 DOM 实测 `#bbq-stick` opacity `0.85`、`#bbq-act` opacity `1`、`#bbq-orders` opacity `1` 仍为 `visible`，横屏 `land-09-results.png` 面板外可辨出模糊的摇杆、动作键与订单卡，延续 `B-070`）
需求：在 `ui/hud.ts` / `ui/controls.ts` 绑定 `phase` 生命周期：每当进入 `phase === 'menu' || phase === 'results'` 时，立即将 `#bbq-stick`、`#bbq-act`、`#bbq-orders` 切为 `display: none` 或 `opacity: 0`（并禁用交互）；当点击「开 店」/「进入第 2 关」/「再 开 一 局」切回 `phase === 'playing'` 时，于 1 帧内恢复显示与可交互状态。
验收：e2e 在竖屏 390×844 与横屏 844×390 分别于 `phase === 'menu'` 与 `phase === 'results'` 采样 `#bbq-stick`、`#bbq-act`、`#bbq-orders` 的计算样式，断言三者全部满足 `opacity === '0' || display === 'none'`；点击进入对局后等待 1 帧 rAF 断言三者恢复可见（`display !== 'none' && parseFloat(opacity) > 0`）；双端 3 连跑 0 JS error。
参考：胡闹厨房 2 / 沙威玛传奇（标题弹窗与打烊结算期间彻底清退全部局内触控与订单 HUD，保持模态聚焦）。

### B-127 竖屏第三位顾客订单标注出画修复与离屏桌位指示（升级 `B-101`）
优先级：P1
来源：第 25 轮走查（`port-15-hud-3seated.png`、`port-06-patience-low.png`：竖屏 390×844 3 位顾客就座时，t1 气泡 `x=28…150`、t2 `210…303.8`，但 t3 气泡 `x=375.6…477.6` 右缘出画 `87.6px` 仅 `14.4px` 可见，桌号圆牌 `(3)` `x=450.2…478.2` 完全在 `390px` 视口外，第 3 位顾客的订单标注实质不可见）
需求：改造 `hud.updateBubbles()` 与离屏指示层：在竖屏下对屏幕内桌位气泡收窄/分行或水平钳制保证 `left >= 4 && right <= vw - 4`；当对应餐桌或桌号牌投影越出当前视口时，隐藏被截残缺气泡并改为在视口对应侧缘（如右缘）渲染贴边离屏指示（`#bbq-offscreen` 类，包含菜品内联 SVG 图标、桌号徽章与耐心状态色，低耐心同步转红 `#e05a3a`），玩家走到该桌进入视野后切回原桌气泡。
验收：e2e 在竖屏 390×844 与横屏 844×390 下令 3 位顾客就座（含 t3 位于竖屏右侧视锥外），断言所有可见 `.bubble` 均满足 `rect.left >= 4 && rect.right <= vw - 4`，且屏幕外桌位存在可见的离屏指示节点（具备 `#bbq-offscreen` 或 `.offscreen` 类且包含桌号与菜品图标、完整落在视口内）；双端 3 连跑 0 JS error。
参考：胡闹厨房 2 移动端边缘订单提示与离屏方向徽章（屏外目标转贴边图标+编号，绝不留半截文字悬在屏边）。

### B-128 同时到店顾客在门口完全重叠（入场错帧或横向散开）
优先级：P2
来源：第 25 轮走查（两名顾客同帧入场时 `#bbq-bubbles .bubble` 出现两条 rect 完全相同 `159.8×32 @(159.8,191.3)` 的 `…` 气泡，顾客 3D 模型也在门口完全叠在一起）
需求：在顾客生成/入场调度层增加防重叠机制：二选一或组合实现——① 同帧或短间隔多次触发刷客时，后续顾客入场队列自动错帧间隔 `≥ 0.35s`；② 门口生成点按序号横向偏移 `≥ 0.6m`（且在可行走门道内），避免模型与进店 `…` 气泡完全重合。
验收：e2e 在双端同帧调用 `spawnNow` 连续生成 2 名顾客，于入场阶段采样所有可见 `#bbq-bubbles .bubble` 的 `getBoundingClientRect()`，断言任意两个 `.bubble` 的交叠面积均 `< 各自面积的 10%`；双端 3 连跑 0 JS error。
参考：胡闹厨房 2 / 沙威玛传奇（多客到店按排队间距依次进门，模型与头顶气泡互不重叠）。

---

本轮新开 4 条（P1 三条：`B-125` 顶栏缺目标额、`B-126` 模态态未隐藏局内 HUD、`B-127` 竖屏 t3 订单标注整块出画；P2 一条：`B-128` 同时到店顾客在门口重叠）。
本轮已确认仍存在、沿用既有编号（不重复开单）：`B-081`（公网旧包 `2290acb`，唯一 P0）、`B-116`（结算星级归因与小费拆解）、`B-070`（菜单态未隐藏触控层，与 `B-126` 联动）、`B-103`（竖屏摇杆/动作键底距差 8px）、`B-101`（竖屏气泡出画，已由 `B-127` 升级）、`B-093`（横屏气泡压顶栏 `92×10px`）、`B-122`（横屏气泡 1 被 `(1)` 压 `18.7×13.3px`）、`B-119`（撞台面零反馈）、`B-107`（愤怒离店无飘字/音效）、`B-120`（首屏缺品类视觉徽标）、`B-065`（小费不展示）。另实测确认 `B-117` 竖屏/横屏动作键 `84×84` 已达标，不再开单。

### B-121 状态：DONE（`b4a7c46`，部署包 `assets/index-C9ue2hwv.js`，2026-11-22 01:0x Z，第 25 轮开发）
实现：
1. `src/game/grill.ts readySlot()` 改为**熟串优先**：先在 `cooked`（或 `grillT < burnTime` 的未焦）里挑最熟的，没有熟串才回落到焦糊（`waste`）；`readySlot` 判定加入 `stage === 'cooked' | 'waste'` 显式分支。
2. `src/game/stations.ts resolveInteraction()` 的 `case 'grill'`：仅剩焦糊串可取时返回 `取焦串` + `icon:'warn'` + `glyph:'焦'` + `warn:true`；`Interaction` 新增 `warn?: boolean`。世界引导光圈 `glowTexture(warn)` 与浮标 `glyphSprite(char, warn)` 同步切警示红 `#e05a3a` / `焦`。
3. `src/ui/controls.ts`：`#bbq-act[data-act-warn="true"]` 边框 `#e05a3a`（优先级压过 `.on` 的金色）、警示三角内联 SVG（非 emoji）；`src/main.ts` 在刷新动作键时同帧写/清 `data-act-warn`。
验收（本轮调度方亲跑，非 agy 自述）：
- `npx tsc --noEmit` 0 错；`npm run build` OK（`assets/index-C9ue2hwv.js`）。
- 新增 `e2e/grill-warn.mjs`（双端 390×844 / 844×390 各连跑 3 次 = 6/6 PASS，0 JS error，末行 `GRILL-WARN OK`）：cooked `取烤串` / `warn=null` / border `rgba(232,180,90,.7)`；burnt `取焦串` / `warn=true` / border `rgb(224,90,58)`（`.on` 也被红色压住）/ svg=warn / 世界浮标 `焦`（warn=true）；一熟一焦时优先取到 cooked、焦串留槽；取走焦串后 2×rAF `data-act-warn` 已清、`cap=去垃圾桶丢掉`、`waste` 仍为 0→丢弃才 +1；动作键 84×84、cap 12px 不截断、与摇杆/订单卡交叠 0。
- 回归亲跑：`e2e/grill.mjs` `GRILL OK`（A1–A7 全 PASS，draw calls 78）；`e2e/act-ui.mjs` 双端 `ACT-UI OK`。
- 部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200 与 `127.0.0.1/bbq/` 200，index 引用 `assets/index-C9ue2hwv.js`。
- vision 复核（独立，部署后 `:3035` 截图）：`e2e/shots/b121-port-cooked.png` 金环 + 手掌图标 + `取烤串`；`e2e/shots/b121-port-burnt.png` 红环 + 警示三角 + `取焦串`，模型判「颜色 + 图标形状 + 文案三重编码，一眼可区分，色觉障碍也能靠形状/文字区分」；`e2e/shots/b121-land-burnt.png` 横屏同样红环警示。遗留观感：12px 三字在缩略图上偶被读成「取焦中」，实机可读但与「取烤串」字距偏密，可并入 B-117 后续的按钮字号微调。
注意：本轮 `agy-dev.sh` 首模型 `claude-opus-5-5-medium` 429（`Individual quota reached`，重置 ~157h）→ 回落 `gemini-4-neon-xhigh`，一次跑完退出码 0；提交只含本轮 6 个文件（未卷走并发走查轮 round 25 的 docs）。
下一轮建议：先修 `B-126`（结算/菜单模态未隐藏局内 HUD，弹窗外仍透触控层 → 会点穿到游戏造成误操作），再 `B-127`（竖屏第三位顾客气泡与 `(3)` 整块出画）。

### B-129 切配台改用 SVG 进度环并补齐单刀跳切视觉反馈（落实 GD §7）
优先级：P2
来源：第 26 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`：`.cb-bar` 为 `64×8` 直线条，`chopLeft=2` 时仅推至 `21.3px`，且 5 次点按全程台面菜刀静止、生串无跳切变化）
需求：① 将 `#bbq-chop .cb` 内的线性 `.cb-bar` 替换为带 `stroke-dashoffset` 推进的 SVG 圆形进度环（3 等分刻度清晰，切完切 `#9ecb6a` 绿色勾环），直接对齐 `GAME-DESIGN.md §7`「进度环」条款；② 每次切配点按触发 `0.22s` 砧板联动动效：台面菜刀绕刀柄小幅下劈回弹、生串弹跳缩放并在 3 刀完成后明显呈现切块/穿签形态差异，消除切菜「空点无反馈」的手感断层。
验收：e2e 双端进入切配 `1/3`、`2/3`、`3/3`，断言 `#bbq-chop svg circle[data-role="chop-ring"]` 存在且 `stroke-dashoffset` 随次数严格递减（`3/3` 达 0 且带完成态 class）；采样点按后 `60ms` 内砧板菜刀或食材网格的 `rotation`/`position.y` 相对静止态偏移量 `> 0.03`；双端 3 连跑 0 JS error。
参考：胡闹厨房 2（切菜瞬间菜刀劈落 + 食材弹跳 + 环形/分段进度推进，节奏反馈明确）。

### B-130 动作键 `.cap` 字号规范（12px→13px）与 6 字长文案防触边排版
优先级：P2
来源：第 26 轮走查及二次 DOM 探针（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`：按钮 `#bbq-act` 恒 `84×84`，实测 `.cap` 字号 `12px`，低于 `ART-DIRECTION §5` 规定的 `≥13px`；`取 五花肉` `capW=51.3px` 左右各 `16.3px`、`去料箱取料` `60px` 左右各 `12px`，最长的 `取回切好的串` `72px` 左右各仅 `6px`，`scrollWidth === clientWidth === 72` 无溢出但触边风险高）
需求：① 将 `#bbq-act .cap` 字号提升至 `13px` 以满足 `ART-DIRECTION §5` 的 `≥13px` 规范；② 给 `.cap` 设 `max-width`（如 `max-width: 66px; white-space: normal; word-break: keep-all; text-align: center; line-height: 1.15`）或将超长引导文案精简到 ≤4 字（如 `取回切好的串` → `取切好串`、`去垃圾桶丢掉` → `去丢废料`），保证提字号后全状态仍有充足左右安全边距。
验收：e2e 遍历动作键全部状态（含 `取 五花肉`、`去料箱取料`、`取回切好的串`/`取切好串`、`烤制中…`、`取烤串`、`取焦串`、`去垃圾桶丢掉`/`去丢废料`、`上菜 烤五花肉拼盘`），在竖屏 `390×844` 与横屏 `844×390` 断言 `.cap` 字号 `≥ 13px`、`.cap.getBoundingClientRect()` 左右边缘距 `#bbq-act` 左右边缘均 `≥ 8px`、且 `scrollWidth <= clientWidth`；0 JS error。
参考：沙威玛传奇 / 原神移动端动作轮盘（圆形主按键文案严控 2–4 字，超长自动两行居中，字号达标且留足内边距）。

### B-131 烤炉 3 烤位增加位序编号（1/2/3）与「下一按目标槽」高亮预览
优先级：P2
来源：第 26 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`：烤炉 3 个槽位无位序标识，玩家站在炉前无法直观判断下一按 `上烤炉` 会落入哪一槽，也无法在多串同烤时预判 `取烤串`/`取焦串` 将先取走哪一根）
需求：① 在烤炉台面前沿为 3 个烤位绘制清晰编号刻度（`1 / 2 / 3`），并让每个 `.gb` 进度徽章携带对应槽位小标（如 `1 · 烤制中 3s`）以建立槽位与徽章的一一映射；② 当玩家处于烤炉可交互圈内时，将 `resolveInteraction` 即将写入（空槽）或取出（优先熟串/次选焦串）的那 1 个目标烤位亮起脉冲描边（熟态金色 / 焦态 `#e05a3a` 警示红），让玩家按键前即可确认目标槽。
验收：e2e 双端在烤炉放置 2 根串（槽 0 熟、槽 1 焦），玩家走近烤炉时断言 `grill.targetSlotIndex === 0`（熟串优先），对应目标槽高亮节点 `visible === true` 且非目标槽 `visible === false`；每个可见 `.gb` 的 `data-slot` 与其对应槽位编号文本一致；取走熟串后目标槽自动切换至 `1` 且高亮切警示红；0 JS error。
参考：胡闹厨房 2（多锅位/多煎位交互前精确高亮即将操作的那一口锅，避免忙乱中拿错）。

### B-132 装盘台支持成品暂存位（≥2 份暂存 + 菜品图标），解除忙时手满阻塞
优先级：P2
来源：第 26 轮走查与源码核对（`src/game/flow.ts` 的 `case 'plate'` 只有 `if (p.carrying) setItemStage(p.carrying, 'plated')`，装盘台没有任何台面槽位/暂存数组，一次只能改手持物状态；结合烤炉 `grillTime=6s / burnTime=12s` 的 6 秒焦糊窗口，手满时无法先放成品再抢救快焦的串）
需求：① 为装盘台开放 `2` 个台面成品暂存位（复用 `x=9,10` 已有台面空间）：手持 `cooked` 靠近装盘台按下 `装盘` 时，若需腾手可再按放下至空暂存位（或空手按一次取走台面最先暂存的成品菜）；② 台面每份暂存成品在 3D 展示完整带盘菜品，并在台前沿显示轻量菜品 SVG 小徽标（五花肉/菌子/米线），便于多客同屏时快速辨识先取哪盘上菜；③ 严禁对台面暂存成品触发「去垃圾桶丢掉」引导（遵守 `B-110`）。
验收：e2e 双端依次完成两份熟串装盘并暂存于装盘台，断言 `__game.plate.slots` 两个槽位均非空且可独立读取菜品类型、无物品覆盖或丢失；空手靠近装盘台按下动作键取出首份成品（`carrying.stage === 'plated'`）后剩余 1 份保留在台面；连点 8 次不复制成品；双端 0 JS error。
参考：胡闹厨房 2 / 沙威玛传奇（出餐台允许暂存多份已装盘成品，支持「抢救烤炉 → 回头端盘上菜」的并行节奏）。

---

本轮（第 26 轮）新开 4 条，均为 P2：`B-129` 切配进度环+跳切动效、`B-130` 动作键 `.cap` 12px→13px 与 6 字防触边、`B-131` 烤位序号与目标槽高亮、`B-132` 装盘台成品暂存。本轮已确认仍存在、沿用既有编号（不重复开单）：`B-081`（公网旧包 `2290acb`，唯一 P0）、`B-045`（烤串本体 3px 看不见熟/焦）、`B-064`（`t>6s` 后 `.gb-fill` 恒满，无焦糊倒计时）、`B-066`（声音通道整条缺失，`AudioContext` 命中 0）、`B-065`/`B-116`（小费与星级归因）、`B-125`（顶栏缺目标额）、`B-103`（竖屏摇杆/动作键底距差 8px）、`B-093`（横屏摇杆压料箱）、`B-107`（愤怒离店无飘字）、`B-111`（烤炉世界空间与屏幕空间两套进度指示重复）。本轮实测确认已修复、无需再开单：`B-121`（焦糊态 `取焦串` + `data-act-warn="true"`，双端一致）、`B-117`（动作键 `84×84`）。

### B-126 状态：DONE（`7116bbf`，部署包 `assets/index-CDf6asvG.js`，2026-11-22 02:2xZ，第 26 轮开发）
实现：
1. `src/ui/hud.ts` 新增 `setPlayHudVisible(v)` 作为局内 HUD 的唯一显隐入口：`v=false` 时 `#bbq-orders` 置 `display:none/opacity:0` 并清空 `innerHTML`，清空 `#bbq-bubbles`（含 `bubbleMap` 与桌位光圈 `ringMap` 节点）、`#bbq-popups`、`#bbq-grillbars`/`#bbq-chop`、guide toast 与 `#bbq-offscreen`；`v=true` 时全部恢复原 display 与可交互（顶栏 `#bbq-hud .topbar` 全程保留）。`updateOffscreen()` 增加 `playHudVisible` 守卫，`showGuide()` 在非局内直接 return。
2. `src/ui/controls.ts` `setVisible()` 收敛为唯一开关：记录 `visible`，`pointerdown` 守卫（隐藏态不响应摇杆/动作键），新增 `resetStickFn` 在隐藏时回中，构造期默认隐藏。
3. `src/main.ts` 新增 `syncPhase(phase)`（`controls.setVisible` + `hud.setPlayHudVisible` + `panels.hide`），`Flow` 的 `onPhase` 与启动时各调一次；`step()`/`__test.tick()` 只在 `phase==='playing'` 时刷新动作键/气泡/烤位/砧板/离屏指示（不再在结算态投影），消除弹窗后面的幽灵 UI。
验收（本轮调度方亲跑，非 agy 自述）：
- `npx tsc --noEmit` 0 错；`npm run build` OK（`assets/index-CDf6asvG.js`）。
- 新增 `e2e/modal-hud.mjs`（`E2E_RUNS=3` × 竖屏 390×844 / 横屏 844×390 = 6/6 PASS，末行 `MODAL-HUD OK`）：menu 态 stick/act/orders 三者 `display:none`、`opacity:0`，顶栏 `313/313` 不截断；点「开 店」后 2×rAF 恢复（stick `block`、act `84×84` + `去料箱取料` + cap 12px、orders `flex` opacity 1）；`results` 态三者同样隐、`.bbq-panel` 内按钮 `elementFromPoint` 命中（pass→`进入第 2 关`、fail→`再 开 一 局` 均可点）；点按钮后恢复（`lv=2`）；0 JS error（横屏 run2 一次 swiftshader `Target closed`，按环境崩溃重试 1 次后 PASS，非断言失败）。
- 回归亲跑：`e2e/act-ui.mjs` 双端 2 轮 `ACT-UI OK`（84×84、cap 12px、交叠 0）；`e2e/orders.mjs` `ORDERS OK`（a–f 全 PASS，竖屏间隙 16px、横屏 106px）。
- 部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200，index 引用 `assets/index-CDf6asvG.js`。
- vision 复核（独立，部署后 `:3035` 截图 `e2e/shots/b126-port-01-menu.png`）：菜单卡片四周「看不到摇杆圈或动作按键圈」，开店按钮金底可读；`b126-port-03-results.png`：「四周完全看不到摇杆、动作按键或订单卡残影」；`b126-port-02-playing.png` 开局恢复后顶栏/订单卡/摇杆/动作键「全部正常显示且清晰、无互相遮挡或截字」。
遗留：vision 两轮都提到「竖屏底部一条纯黑带」（沿用手感问题 `B-060`/`B-103`，非本轮引入）；结算 fail 态只有 `再 开 一 局` 一个按钮，模型误读为「缺按钮」，实际是 `r.money >= target` 才出 `进入第 2 关`，属既有设计。
下一轮建议：修 `B-127`（竖屏 t3 气泡与 `(3)` 整块出画，是移动端第一可玩性问题；本轮隐藏改动已让离屏指示层成为唯一兜底，越早补越省事）。

## 2026-11-22 02:08Z 第 27 轮新增（B-133–B-136）

### B-133 模态态补齐顶栏隐藏，首屏增加烤肉品类主视觉与「继续上次进度」入口
优先级：P1
来源：第 27 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`：`B-126` 已隐藏 `#bbq-stick / #bbq-act / #bbq-orders`，但 `.topbar` 仍在首屏与结算态模糊背景后透出；首屏卡片 `283.4×241` 为纯文字无品类主视觉，背景重度虚化，且无「继续上次进度」入口）
需求：① 将 `.topbar` 纳入模态隐藏生命周期，在 `phase === 'menu' || phase === 'results'` 时切为 `display: none`，切回 `playing` 当帧恢复；② 在首屏卡片顶部加入内联 SVG 云南炭火烤串品牌主视觉徽标（`[data-brand-emblem]`，尺寸 `≥48×48px`，暖金与炭火橘配色，禁 emoji），适度收轻背景模糊以透出店内炭火经营场景；③ 读取本地持久化关卡进度，当玩家已有第 2 关及以上进度时，在首屏展示主按钮 `[data-continue-btn]`（「继续第 N 关」）与次按钮「从第 1 关开始」，无存档时维持单按钮「开 店」。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下，(a) 于 `menu` 与 `results` 态断言 `.topbar` 计算样式 `display === 'none'`（与 `#bbq-stick / #bbq-act / #bbq-orders` 一致）；(b) 于 `menu` 态断言 `[data-brand-emblem]` 可见且 `rect.width >= 48 && rect.height >= 48`，整张卡片 `rect.top >= 8 && rect.bottom <= vh - 8`；(c) 预置 `localStorage` 第 2 关进度刷新后断言 `[data-continue-btn]` 可见且点击后 `state().level === 2`；双端连跑 3 次 `0` JS error。
参考：胡闹厨房 2 / 沙威玛传奇（标题页与打烊结算隐藏全部局内 HUD 含顶栏，首屏卡片置顶标志性烹饪主视觉，有存档时优先呈现「继续营业」）。

### B-134 世界标注层与订单卡/已就座气泡双向避让（解进店 `…` 压第 3 张订单卡与横屏邻桌气泡）
优先级：P1
来源：第 27 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png` 及 `verify-port.json` → `afterServe` 中新进店顾客的 `…` 气泡 `53×32 @(203.6,191.3)` 与第 3 张订单卡 `187×47.8 @(193,171.7)` 交叠 `1494px²`，压住卡片左下区域（含桌号徽标下缘）；`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png` 中进店 `…` 气泡压住 2 号桌 `烤菌子` 气泡耐心环）
需求：① 顾客处于 `walking-in` 尚未落座阶段时，不再渲染 `53×32` 大尺寸 `…` 占位气泡（改为 ≤12×12px 极简入店点或落座后再出 `.bubble`）；② 在 `hud.updateBubbles()` 中把 `#bbq-orders` 容器矩形及已就座 `.bubble` 纳入避让障碍，禁止任何气泡与右上订单卡或已就座顾客的耐心环重叠；③ 作为预防性一致性约束，`#bbq-popups .popup` 定位时同步检测同桌可见 `.bubble` 包围盒并保留安全间隙，确保后续版式变动也不引发飘字遮挡气泡。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下，(a) 3 客就座且有新客处于 `walking-in` 时，断言任意可见 `.bubble` 与 `#bbq-orders .card` 的交叠面积 `=== 0`（由当前 `1494px²` 归零），且 `walking-in` 气泡与 `seated` 气泡交叠面积 `=== 0`；(b) 作为预防性一致性约束，上菜收款当帧读取 `#bbq-popups .popup` 与所有可见 `.bubble` 的 `getBoundingClientRect()`，断言任意两矩形交叠面积保持 `=== 0`；双端连跑 3 次 `0` JS error。
参考：胡闹厨房 2 / 沙威玛传奇（进店途中顾客不抢占正式订单气泡空间，世界气泡严格避开订单列与已落座顾客）。

### B-135 横屏上排餐桌取景安全区下移，解顶栏压迫气泡与顶部机位下 `t2` 光圈/桌号 `(2)`
优先级：P1
来源：第 27 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`：横屏 `844×390` 下，顶栏 `315.4×36 @(264.3,8)` 与 `…` 气泡 `53×32 @(339.2,34)`（`verify-land.json` → `seated3` 复现）及 `t2/t3` 气泡交叠 `530px²`（沿用 `B-078`）；且在 `@(379.1,3.7)` 机位下，顶栏压住 `t2` 桌光圈 `128×58 @(379.1,3.7)` 与桌号 `(2) @(429.1,52.7)`（换机位后 `(2)` 落到 `@(429.1,117.3)` 与顶栏交叠 `0`），上排三桌顶缘也被裁切）
需求：① 调整横屏（`aspect > 1.2`）相机 `lookAt.z` 偏移与纵深边距，在屏幕上方为 `.topbar` 预留 `≥52px` 视口安全带，使上排 `t1/t2/t3` 餐桌、顾客头顶与桌面光圈在任意走位机位下整体下移，不再被视口顶缘切半；② 统一桌位标注锚点与防撞策略：所有 `.order-ring`、`.order-num`、`.bubble` 屏幕投影顶边钳制在 `topbar.bottom + 6px`（≥50px）以下，杜绝气泡及顶部机位下的光圈/桌号侵入顶栏区（协同解决 `B-078`）。
验收：e2e 在横屏 `844×390` 下令 `t1/t2/t3` 同时就座（覆盖 `t2` 靠顶机位及常规机位），读取 `.topbar` 与所有 `.order-ring`、`.order-num`、`.bubble` 的 `getBoundingClientRect()`，断言：① 任意 `.bubble`、`.order-ring`、`.order-num` 与 `.topbar` 交叠面积均 `=== 0`（`…` 气泡与顶栏交叠由 `530px²` 归零）；② `t2` 的 `.order-ring.top >= topbar.bottom`；③ `.bubble` 内菜名 `scrollWidth <= clientWidth`；连跑 3 次 `0` JS error。
参考：胡闹厨房 2 横屏镜头布局（顶部 HUD 下方留足场景安全边距，无论镜头跟随处于何机位，桌号牌与订单气泡均不侵入顶栏区域）。

### B-136 上菜后顾客进食动态反馈、小费拆解飘字与结算星级归因说明
优先级：P1
来源：第 27 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`：订单卡标价 `¥48` 而飘字直接给 `+¥62`/`+¥60`，未解释 `+¥14`/`+¥12` 快速小费来源；顾客进入 `eating` 后仅静坐无进食动画与满意表现；未达标结算面板 `离目标还差 ¥118`、`愤怒离店 2 位` 却显示 `1★` 且无星级归因与升星条件）
需求：① 收款飘字在 `tip > 0` 时展示拆解明细（主字 `+¥62`，副行金色 `菜价 ¥48 + 小费 ¥14`），并在局内累计小费于结算面板营业额行附注 `[data-revenue-breakdown]`（`含小费 ¥X`）；② 顾客进入 `phase === 'eating'` 后播放可见进食与满意反馈：持续 `0.8s` 的满意 SVG 微标（笑脸/赞，禁 emoji）、桌菜上升轻热气粒子及顾客头部周期性轻点/咀嚼动画；③ 结算面板 `.stars-big` 下方新增数据驱动的 1 行归因文本 `[data-star-reason]`，按 `calcStars` 规则直白说明当前星级成因及 2★/3★ 达成条件（如「未达目标 ¥180 且愤怒离店 2 位，当前 1★；达标且愤怒 < 3 位可升 2★、零愤怒拿 3★」）。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下，(a) 对 1 号桌（`price=48`）快速上菜，断言 `#bbq-popups .popup` 文本同时含总金额与 `/小费\s*\+?¥\d+/`，且进入 `eating` 后 `0.5s` 内顾客头部/身体动画位移或旋转 delta `> 0.02` 或 `[data-emote="happy"]` 可见；(b) 进入未达标结算态（如 `¥62 / ¥180`、`angry=2`）断言 `[data-star-reason]` 可见且含目标额或愤怒离店归因，且 `[data-revenue-breakdown]` 匹配 `/含小费 ¥\d+/` 且数值等于本局累计小费；双端连跑 3 次 `0` JS error。
参考：胡闹厨房 2（上菜即刻拆出基础分+小费奖励，结算页明示 1/2/3 星达标与超时扣分线）；沙威玛传奇（顾客接餐立刻点头进食并冒出满意徽标，打烊账单逐项拆解小费与差评）。

> 本轮既有编号状态备注（只引用、不重开）：`B-107`（愤怒离店无飘字）**已验证修复**；`B-126`（模态态隐藏 `#bbq-stick / #bbq-act / #bbq-orders`）**已验证生效**；`B-081`（公网旧包，唯一 P0）、`B-045`、`B-064`、`B-066`、`B-078`、`B-093`、`B-103`、`B-112`、`B-125`、`B-128` 仍存在并继续沿用原编号追踪。

---

本轮（第 27 轮）新开 4 条，均为 P1：`B-133` 模态态补隐藏顶栏 + 首屏品类主视觉与「继续上次进度」、`B-134` 世界标注层与订单卡/已就座气泡双向避让、`B-135` 横屏上排餐桌取景安全区下移、`B-136` 上菜进食反馈 + 小费拆解 + 结算星级归因。本轮实测确认已修复、不再开单：`B-107`（愤怒离店红字飘字，竖屏 2 条 / 横屏 1 条）与 `B-126`（`menu`/`results` 态 `#bbq-stick/#bbq-act/#bbq-orders` 全 `display:none`、`0×0`）。仍存在并沿用原编号：`B-081`（公网旧包，唯一 P0）、`B-045`、`B-064`、`B-066`、`B-078`（横屏 `…` 气泡与顶栏交叠 `530px²`）、`B-093`、`B-103`、`B-112`、`B-125`、`B-128`（竖屏双客气泡 `@(206.1,191.3)`/`@(201.1,191.3)` 重合）。

### B-134 状态：DONE（`738d08c`，部署包 `assets/index-DtJaLCl2.js`，`__build=738d08c-202611220409`，第 28 轮开发）
实现（`src/ui/hud.ts` + `src/main.ts`，agy 回落后由调度方验收与提交）：
1. `walking-in` 顾客不再渲染 `53×32` 的 `…` 气泡，改为 `.bubble.entering` 的 `10×10` 金色入店点（`.bubble.entering > * { display:none }`），落座后才换成正式菜名气泡。
2. `updateBubbles()` 改为「先算再写」：每帧一次性量好 `#bbq-hud .topbar`、`#bbq-orders`（含每张 `.card`）、`.popup`、`.order-ring`/`.order-num` 与气泡自身尺寸，再由新私有方法 `placeBubble()` 顺序求解位置——优先上移，其次同排左右平移，再向下让位，最后全屏安全区兜底；每个已放置气泡会作为下一个气泡的硬障碍，因此同帧气泡互不重叠；视口约束 `left>=4 / right<=vw-4 / top>=topbar.bottom+6`。
3. `updateRings()` 给 `.order-ring` / `.order-num` 加顶栏安全带（`top >= topbar.bottom+6`），横屏顶部机位不再把 `t2` 光圈/桌号压到顶栏里（B-135 的垂直部分）。
4. `main.ts` 把 `step()` 与 `resize` 的调用顺序改为 `updateRings()` → `updateBubbles()`，让气泡当帧即能避让光圈。
5. 新增 `e2e/labels.mjs`（双端 × `E2E_RUNS`，场景 1：3 客就座 + 1 客进店跨 4 个机位/走位；场景 2：2 客就座 + 2 客同时进店近重合），断言气泡与 `#bbq-orders`/`.card`/顶栏/光圈交叠全为 `0`、气泡两两不重叠且不出安全区、`walking-in` 气泡 `<=12×12` 且非 `…`。
验收（调度方亲跑，非 agy 自述）：
- `npx tsc --noEmit` 0 错；`npm run build` OK（`assets/index-DtJaLCl2.js`）。
- `E2E_RUNS=3 node e2e/labels.mjs` 双端 **6/6 PASS `LABELS OK`**：竖屏 `s1` 交叠 `0`、`minRingTop=306.2`，横屏 `s1` 交叠 `0`、`minRingTop=50.5 >= 50`（原 `3.7`），`s2` 双进店点 `[10×10,10×10]` 两两交叠 `0`，双端 0 JS error。
- 回归：`e2e/modal-hud.mjs`（`E2E_RUNS=2`）双端 **PASS**（menu/results 态 `stick/act/orders` 仍 `display:none`，B-126 语义未破）；`e2e/orders.mjs` **`ORDERS OK`**（a–f 全 PASS，卡片升序/光圈/数字牌一致）。
- 部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200，index 引用 `assets/index-DtJaLCl2.js`。
- vision 复核（4 张）：竖屏 `b134-port-01-card3-clear.png` 三张订单卡「完整可读、没有被其它元素明显压住」，卡片下方只有一枚小金色点不构成遮挡；`b134-port-02-dual-entering.png`「三张订单卡完整可读、未被遮挡」，三个菜名气泡「均无互相覆盖」；横屏 `b134-land-01-t2-cards-clear.png`「顶栏与订单卡完全分开，光圈/桌号/气泡均位于顶栏下方，无可读性问题」。
遗留：竖屏 `t3` 桌光圈 `128×58 @(400,306)` 与桌号 `@(450,355)` 仍整块横向出画（既有 `B-128`/`B-125` 系列的横向越界，本轮只做了竖直钳制，未处理水平方向）。
下一轮建议：`docs/GAME-DESIGN.md` 已在 `bf34db5` 定调「一键循环（上炉/起锅各一次点击）、废弃切配/装盘/料箱」，`B-129`（切配进度环）、`B-131`（烤位序号）、`B-132`（装盘暂存）按新方向已作废——下一轮应直接做玩法重构第一刀：订单卡内嵌圆形主按钮 + 3 烤位排队 + 4–9s 完美窗口判定，而不是继续打磨旧工位。

## 2026-11-22 03:08Z 第 28 轮新增（B-137–B-140）

> 备注：`bf34db5` 新设计（`GAME-DESIGN §0/§1` 一键循环）已废弃切配/装盘/料箱走动，`B-129`/`B-131`/`B-132` 等相关条目保留编号但不再排期；本轮新开条目按新设计口径书写。

### B-137 订单卡判定窗口逐段可视化（夹生/完美/偏老/焦糊）
优先级：P1
来源：第 28 轮走查 + `GAME-DESIGN §1`（冻结时钟实测旧构建 `t=6.5s` 为金色满条 64px `已熟 ✓`，`t=8.5s` 距焦糊仅剩 3.5s 仍维持金色满条 `已熟 ✓` 零提示，`t=10.9s` 仅余 2s 才闪橙色 `快焦了 2s` 且进度条依旧 100% 满格；见 `e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/land-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/land-41-grill-t108-warn.png`；衔接 `B-064` 补齐 6s 静默期安全窗与预警门槛）
需求：① 新 §1 一键循环下，每条订单卡的主进度必须按判定窗口分段着色并连续推进：`0–4s` 夹生（灰白，文案「夹生」）、`4–9s` 完美（金色）、`9–12s` 偏老（橙色 `.warn` + 脉冲）、`>12s` 焦糊（红色，自动扣钱 + 废料）；进度环/进度条在 `[0, 12s)` 全程连续推进，**禁止出现旧构建这种「6s 起满格不动」的静默段**。
验收：e2e 冻结时钟于竖屏 `390×844` 与横屏 `844×390` 下沿 `t=0.5s / 4.0s / 6.5s / 9.0s / 11.0s / 12.5s` 推进，断言：(a) 订单卡 `[data-cook-window]` 依次为 `raw / perfect / perfect / over / over / burnt`；(b) `t=6.5s` 与 `t=4.0s` 的环 `stroke-dashoffset`（或条宽）不相等（连续推进，不得两次同为满值）；(c) `t∈[9,12)` 卡片带 `.warn` 且文案匹配 `/偏老\s*\d+s/`；(d) `t<4s` 点击返回「夹生」退款、`t>12s` 自动焦糊扣钱且废料 +1，营业额变化与 `GAME-DESIGN §1` 阈值一致；(e) 双端连跑 3 次 `0` JS error。
参考：胡闹厨房 2 煎锅/烤架（熟后立即出现独立的过火预警并分段加速闪烁，绝不留数秒静默空窗）；`GAME-DESIGN §0/§1`（4–9s 完美 / 9–12s 偏老）、`B-064`、`B-045`。

### B-138 第 2 关玩法内容差异化与通关选关
优先级：P1
来源：第 28 轮走查（第 1 关 `¥240 / ¥180` 达标点击 `进入第 2 关` 后，`level=2 / levelTarget=260 / timeLeft=180`，但场地、3 道菜品、4 张餐桌与交互规则与第 1 关 100% 相同；第 2 关 `¥400 / ¥260` 达标后仅显示「全部关卡通关！」与单一 `再 开 一 局` 按钮，无回第 1 关或选关入口；见 `e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`）
需求：① 在 `config.ts` 的 `LEVELS[1]`（第 2 关「夜市高峰」）为第 2 关配置可感知的玩法差异，至少落地两项：同步提升同时在店顾客上限至 `4`（启用全部 4 张餐桌）并开启中段「宵夜高峰」短波次（如剩余 `90s–60s` 下单间隔缩至 `6–10s`、小费倍率 `×1.2`，局内顶栏或 toast 提示「宵夜高峰来临！」），同时在开局卡片副标题简明交代第 2 关新规则；② 第 2 关通关结算面板（「全部关卡通关！」）除「重玩第 2 关」外，增设次级按钮 `[data-level-select="1"]`（「回到第 1 关」），同步更新 `GAME-DESIGN §3` 关卡表消除「M1 仅 1 关」文档漂移。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下：(a) 切入第 2 关后断言 `state().level === 2 && state().levelTarget === 260`，且配置差异可断言（如 `maxDiners === 4` 可连续 `spawnNow` 坐满 4 桌，或高峰波次窗口触发 `[data-rush-banner]` 可见）；(b) 第 2 关达标结算面板同时存在可点击的「重玩第 2 关」与 `[data-level-select="1"]` 按钮，点击后者后 2×rAF 断言 `state().level === 1 && state().levelTarget === 180 && state().phase === 'playing'`；双端连跑 3 次 0 JS error。
参考：胡闹厨房 2 / 沙威玛传奇（每关引入新客流节奏或桌位压力，通关后保留选关与重打第 1 关入口支撑复玩）；`GAME-DESIGN §3`。

### B-139 烤制倒计时浮点取整误差修正
优先级：P2
来源：第 28 轮走查（冻结时钟确定性推进至 `t=3.0s` 时，内部累积浮点 `t=2.9999`，经 `Math.ceil(6 - t)` 计算后 `.gb-txt` 显示 `烤制中 4s` 而非 `3s`，存在明显 off-by-one 跳字；`t=10.9s` / `11.9s` 亦共用同一取整路径）
需求：① 统一抽离烤炉倒计时格式化函数 `formatCookRemain(remainSec)`：对剩余秒数加入浮点误差容差 `EPS = 1e-3` 后再向上取整（`Math.max(1, Math.ceil(remainSec - 1e-3))`），同时覆盖「烤制中 Ns」（`grillTime - t`）与「快焦了 Ns」（`burnTime - t`）两段倒计时；② 确保 `t=0.0s → 6s`、`t=3.0s → 3s`、`t=5.0s → 1s`、`t=10.0s → 2s`、`t=11.0s → 1s` 在整秒边界不发生 `+1s` 抖动。
验收：e2e 冻结时钟于双端放串上炉，通过固定步长 `__test.tick()` 分别精确推进至 `t=1.0s / 3.0s / 5.0s / 10.0s / 11.0s`，断言 `.gb-txt` 依次匹配 `/5s/`、`/3s/`、`/1s/`、`/2s/`、`/1s/`（`t=3.0s` 严禁出现 `4s`）；双端连跑 3 次 0 JS error。
参考：移动端计时 UI 通用浮点边界防抖规范；`GAME-DESIGN §2`。

### B-140 结算主次按钮高度规范与去空格排版
优先级：P2
来源：第 28 轮走查（达标结算面板 `212×328` 中主按钮「进入第 2 关」实测 `150×45`，次按钮「再 开 一 局」实测 `150×40`，主次高度差 `5px` 且次按钮低于移动端 44px 触控底线；首屏「开 店」与结算「再 开 一 局」文案仍含手打空格撑字距；见 `e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/port-01-title.png`、`e2e/review/2026-11-22T03-08Z-r28/land-01-title.png`）
需求：① 统一 `.bbq-panel button`（含首屏与结算主/次按钮）高度规范为 `min-height: 44px; height: 44px`（主次按钮高度差 `= 0px`），主次层级通过金色实心底 vs 描边透明底、字重与 `gap: 12px` 区分，不再靠压低次按钮高度制造层级；② 清除按钮文本中的人工空格（`开 店` → `开店`、`再 开 一 局` → `再开一局`），改由 CSS `letter-spacing: 0.14em` 控制字距。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 进入首屏与达标结算面板，遍历所有可见 `.bbq-panel button` 断言：(a) `rect.height >= 44`，且达标结算面板内主/次按钮高度差 `Math.abs(h1 - h2) <= 1`；(b) 两按钮垂直间距 `btn2.top - btn1.bottom >= 10` 且全部 `rect.bottom <= innerHeight - 8`；(c) 按钮 `textContent.trim()` 不含中文字符间手打空格（不匹配 `/[\u4e00-\u9fa5][\s\u3000]+[\u4e00-\u9fa5]/`）；双端连跑 3 次 0 JS error。
参考：Apple HIG / Material 移动触控 44px 最小热区规范、`ART-DIRECTION §5`。

### B-141 构建与部署溯源门禁（Clean-Tree 校验 + 健康检查返回 commit 与 bundle SHA-256）
优先级：P0
来源：第 29 轮走查（本机 `127.0.0.1:3035` 运行 `window.__build="05afe9b-202611220449"` 入口 `assets/index-uMHCucrV.js` 已含 `56×56` `.card-btn`，但 git HEAD `05afe9b` 源码并无 `.card-btn`，线上包编译自未提交脏树导致 commit 号不可信）
需求：① 在构建/部署脚本（`scripts/ci-deploy.sh` 等）前置 `git status --porcelain` 强校验，工作区存在未提交改动时直接以非 0 退出码中止部署，杜绝半成品脏树上生产或测试服；② 构建产物同时生成构建清单（含完整 `commit`、`clean: true`、`builtAt`、`entry` 文件名及入口 JS 的 `bundleSha256`），由服务端 `GET /api/health` 直接返回，并与前端注入的 `window.__build` 共用同一 commit 来源；③ 部署完成后自动校验 `/api/health` 返回的 `bundleSha256` 与实际访问 `/` 引用的入口 JS 实算 SHA-256 一致（公网同步纳入该校验以根治 `B-081`）。
验收：脚本与 e2e 断言——(a) 在人为制造 1 个未提交改动时执行部署脚本返回非 0 退出码且不覆盖线上 `dist`；(b) 干净提交并部署后，`GET http://127.0.0.1:3035/api/health` 返回 HTTP 200 且 JSON 满足 `clean === true`、`commit === $(git rev-parse --short HEAD)`、`bundleSha256 === sha256sum(dist/<entry>)`；(c) 浏览器访问页面读取 `window.__build` 以 `health.commit + "-"` 开头，且页面 `<script src>` 指向的文件名等于 `health.entry`；(d) 同一次部署门禁同时探活公网 `GET https://openfolio.uk/bbq/` 与 `/transport/`，任一非 200（第 29 轮收尾实测两者均 `502`）即视为部署失败并告警，避免「本机 200、公网 502」长期无人察觉；0 JS error。
参考：成熟 Web 游戏 / CI-CD 不可变制品实践（Git SHA + 制品 SHA-256 双锚定，禁止 dirty working tree 发布）。

### B-142 首屏玩法说明与「上炉 / 起锅」两步循环对齐
优先级：P1 → **done 61f17e1（2026-11-22 第 32 轮开发）**
修法：首屏副标题改为「点订单卡两步出餐：**上炉 → 起锅上菜** / 金色完美窗起锅拿满小费 · 3 个烤位排队」，`/取料|切配|装盘/` 归零。
来源：第 29 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-01-title.png`：双端首屏副标题仍显示废弃五步流程「取料 → 切配 → 炭烤 → 装盘 → 上菜」，与 `GAME-DESIGN §0` 最高优先方向直接矛盾）
需求：① 替换首屏卡片内的废弃五步流程文案，改为简明的两步一键循环引导（例如主副行展示「点订单卡上炉 → 盯准金色完美窗起锅收款」及「3 个烤位 · 排队控火」提示），让新玩家 3 秒内学会正确玩法；② 同步清理首屏及局内 guide toast 中残留的「去料箱取料」「切配」「装盘」等旧流程话术。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 进入 `menu` 态，断言首屏面板 `textContent` 同时包含 `上炉` 与 `起锅`（且正则 `/取料|切配|装盘/` 命中为 `false`），首屏面板及内部文本全部 `scrollWidth <= clientWidth`、`rect.top >= 8 && rect.bottom <= innerHeight - 8`；双端连跑 3 次 `0` JS error。
参考：《沙威玛传奇》/《胡闹厨房 2》开局卡片（首屏用一句话精准锚定核心交互，杜绝文案与实机机制脱节）。

### B-143 下线旧五步操控链路并统一单源计时与飘字防压卡避让
优先级：P1 → **done 61f17e1（2026-11-22 第 32 轮开发；③ 飘字避让另见 B-154 未修）**
修法：局内删除/隐藏 `#bbq-stick`、`#bbq-act`、`#bbq-chop`、`← 料箱` 胶囊与 `.gb` 旧 6s 徽章（`src/ui/controls.ts` 大幅收窄），烤制倒计时只保留订单卡单源文案；键盘 WASD 保留作调试。
来源：第 29 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`、`land-05-grill.png`：新旧双链路并存，点卡上炉时卡片写 `生串 4s` 而烤炉 `.gb` 写 `烤制中 6s` 互相冲突，`夹生 · 重烤` 飘字压住 3 号卡按钮，`.gb` 压住 `豆泥米线` 气泡，摇杆与动作键仍在喊 `去料箱取料`）
需求：① 按 `GAME-DESIGN §0/§1` 彻底移除局内旧操控组件（隐藏并停用虚拟摇杆 `#bbq-stick`、右下动作键 `#bbq-act`、旧料箱/切配/烤炉地面引导箭头及手动切配/装盘触发），释放竖屏底部操控黑带与横屏左下料箱区（顺带消解 `B-093`）；② 烤制倒计时收敛为订单卡单一事实来源，移除使用旧 `6s` 逻辑的 `.gb` 烤炉徽章（避免 `4s` vs `6s` 冲突及遮挡 `豆泥米线` 气泡），改为烤位纯 3D 串体/火候光效与订单卡联动；③ `#bbq-popups .popup`（含 `夹生 · 重烤`、`焦糊了`、`+¥xx`）生成与布局时检测 `#bbq-orders` 容器包围盒并强制避让，禁止任何飘字覆盖订单卡或 `.card-btn`。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 开店进入 `playing` 态断言：(a) `#bbq-stick` 与 `#bbq-act` 不存在或 `display === 'none'`；(b) 点击订单卡 `上炉` 后屏幕上不存在文本含 `烤制中 6s` 的冲突倒计时节点，且 `.gb` 与 `.bubble` 交叠面积 `=== 0`；(c) 4 客同屏下对第 2 张卡在 `t=1.7s` 触发 `夹生 · 重烤` 及 `13s` 触发 `焦糊了` 当帧，断言所有可见 `.popup` 与所有 `#bbq-orders .card` 交叠面积 `=== 0`；(d) 仅通过 2 次点击 `.card-btn` 即可完成出餐 `money > 0 && served === 1`；双端连跑 3 次 `0` JS error。
参考：《烹饪发烧友》/《沙威玛传奇》移动端单手触控布局（彻底移除虚拟摇杆与重复倒计时，所有状态飘字避开高频点击区）。
> 测试清理同步（B-143）：已删除纯旧五步 UI 脚本 `e2e/act-ui.mjs`、`e2e/chop.mjs`、`e2e/grill.mjs`、`e2e/grill-warn.mjs`、`e2e/wrong-dish.mjs`、`e2e/review-capture.mjs`；`e2e/modal-hud.mjs`、`e2e/crates.mjs`、`e2e/plated-hint.mjs`、`e2e/spawn.mjs`、`e2e/input-drop.mjs`、`e2e/landscape.mjs`、`e2e/offscreen.mjs` 已迁移适配键盘/`__test` 钩子与新隐藏口径；新增 `e2e/simplify.mjs` 验收。

### B-144 订单卡固定等宽排版与顶栏「评级」星级文本及状态同步
优先级：P1
来源：第 29 轮走查（竖屏 4 张订单卡出现 `217px` 与 `243px` 两种宽度导致左边缘参差不齐且首卡距顶栏仅 `16px`，见 `port-30-cards.png`、`port-32-card-perfect.png`；横屏顾客愤怒离店 `angry 0→1` 后顶栏「评级」处文本为空仅读到“评级”二字、无 `★`，见 `land-09-angry-left.png`）
需求：① 为 `#bbq-orders .card` 设定按端点统一的固定宽度（例如竖屏恒定 `244px`、横屏恒定 `224px`，菜名列 `flex: 1; min-width: 0`），消除不同字数菜品导致的卡片宽窄不一与左缘参差，并在竖屏调整订单卡与顶栏垂直间距至 `>= 18px` 且控制 4 卡总高度不压住核心餐桌；② 修复顶栏「评级」星级渲染与语义暴露：使用文本 `★`/`☆` 或带显式 `aria-label` 与文本节点同步的星级容器（保证 DOM 文本读取始终含 `★`/`☆` 而非空串），并严格绑定 `calcStars()`——当 `angry` 递增触发评级下降或惩罚时同步触发 0.4s 警示闪红动效，确保局内顶栏与结算面板星级 100% 同源一致。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 断言：(a) 同时存在 4 张不同菜品（含 `烤五花肉拼盘`、`烤菌子`、`豆泥米线`）订单卡时，所有 `.card` 宽度极差 `max(w) - min(w) <= 1px`、左边缘坐标极差 `max(left) - min(left) <= 1px`、`card[0].top - topbar.bottom >= 18`，且卡内 `scrollWidth <= clientWidth`；(b) 开局、上菜后及横屏 `angry 0→1` 离店后，读取顶栏评级容器 `textContent` 均匹配 `/[★☆]{3}/`（绝不为空），且实心 `★` 数量严格等于 `Number(ratingEl.dataset.stars)` 与结算面板星级；双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》顶部定宽订单栏（所有订单卡严格等宽对齐、一眼扫视队列）与移动端 HUD 可访问状态规范。

本轮小结（第 29 轮）：新开 4 条（`B-141` P0、`B-142`/`B-143`/`B-144` P1）；P0 2 条（`B-141` 构建溯源 + 沿用 `B-081` 公网旧包）、P1 5 条（`B-142`/`B-143`/`B-144` 新开 + 沿用 `B-125`/`B-136`），P2 2 条；综合评分 **2.8/5（比上轮 3.0 −0.2，仅适用于本机脏树构建 `05afe9b-202611220449`）**。

## 2026-11-22 05:50Z 第 29 轮开发：玩法重构第一刀（订单卡一键循环）

状态：DONE（`ebc762a`，部署包 `assets/index-CncmyXxh.js`；执行器 opus-5-5-high 额度耗尽 → `gemini-4-neon-xhigh`，2400s 超时截断，产物完整，验收与提交由调度方亲跑）

实现（`src/config.ts` / `src/game/flow.ts` / `src/game/grill.ts` / `src/game/types.ts` / `src/main.ts` / `src/ui/hud.ts` + 新增 `e2e/oneclick.mjs`）：
1. `.card-btn` 圆形主按钮 `56×56`（内联 SVG，无 emoji），点 1 次自动占用空闲烤位（3 位）并上生串，点第 2 次按窗口结算：`0–4s` 夹生（不收款、卡回 idle、飘字 `夹生 · 重烤`）、`4–9s` 完美（满小费）、`9–12s` 偏老（小费 ×0.5）、`≥12s` 自动焦糊（`waste+1`、`angry+1`、顾客离店、卡浮动 1s 后移除）。
2. 卡内环形进度 `0→12s` 连续推进（`progressPct = grillT/12`），`data-cook-window` 分段 `idle/raw/perfect/over/burnt/eating`，分段配色与剩余秒数文案（`生串 Ns` / `完美 Ns` / `偏老 Ns` / `焦糊`），`over` 态按钮文案切 `快起`。
3. 3 烤位满时无串卡片按钮 `disabled` + 文案「烤位满了」，烤位释放后同帧恢复。
4. 旧链路（料箱→切配→装盘→上菜）保留可用，与订单卡共用 `settleServe()`，避免重复计钱；小费口径同时对齐 `GAME-DESIGN §2`「耐心 ≥0.8 给满小费」（此前实现为线性，旧链路上菜金额随之变化，`e2e/popup.mjs`/`plated-hint.mjs` 类断言未受影响）。
5. `__test.cardState(tableId)` / `__test.grillSlots()` 供 e2e 断言。

验收（调度方亲跑，非 agy 自述）：
- `npx tsc --noEmit` 0；`npm run build` OK（`assets/index-CncmyXxh.js`）。
- `e2e/oneclick.mjs` `E2E_RUNS=3` 双端 **6/6 PASS `ONECLICK OK`**：竖屏 `cardW=243px btn=56×56`、横屏 `cardW=221px btn=56×56`；窗口采样 `0.5:raw(4.2%) / 4:perfect(33.3%) / 6.5:perfect(54.2%) / 9:over(75.0%) / 11:over(91.7%) / 12.5:burnt(100.0%)`（连续推进，无静默段）；`perfect=+¥62`、`over=+¥37`、`夹生=¥0` 且卡回 idle；3 卡上炉后第 4 张 `烤位满了→释放后可用`；`t>12` 自动焦糊 `waste=1 angry=1` 且卡移除；双端 0 JS error。
- 部署后对 `http://127.0.0.1:3035/bbq/` 复跑 `E2E_RUNS=1` 双端 PASS（线上同一制品）。
- 回归：`e2e/orders.mjs` `ORDERS OK`（a–f）、`e2e/modal-hud.mjs` 4/4 PASS、`e2e/grill.mjs` `GRILL OK`（A6/A7 熟度与焦糊文案未变）。
- 部署：`ci-deploy.sh` DEPLOY OK；`127.0.0.1:3035/` 200、`127.0.0.1/bbq/` 200。
- vision 复核（3 张）：竖屏三卡「完整可读、未被顶栏遮挡、无文字溢出、未压厨师/烤炉」，`偏老 1s` 橙色可区分；横屏三卡「完整可读、与顶栏/角色/气泡无重叠、无溢出」。

遗留 / 下一轮建议：
- 本轮为「加法第一刀」，新旧双链路并存 → `B-143` 的三处问题是真实现象且已被第 29 轮走查拍到：卡片 `生串 4s` 与旧烤炉徽章 `.gb` `烤制中 6s` 冲突、`夹生 · 重烤` 飘字压第 3 张卡按钮、摇杆/动作键仍喊 `去料箱取料`。下一轮最该做 **B-143**（下线摇杆/动作键与 `.gb` 旧倒计时，飘字避让订单卡）。
- 首屏文案仍是废弃五步（`B-142`）、订单卡宽度不统一（`217/243px`，`B-144`）、公网 `502`（`B-141`/`B-081`）三条 P0/P1 仍未动。
- 本轮 `B-141` 报告的「线上包来自未提交脏树」即为本轮 agy 未提交成果被部署所致，`ebc762a` 已把它落地为干净提交；部署溯源门禁本身仍需按 `B-141` 实现。
- 文案打磨（P2）：`完美 3s` 语义偏含糊，建议下一轮与 `B-137` 一起收敛成「完美剩 3s / 偏老剩 2s」并统一紧急态用词（`快起` vs `起锅`）。

## 2026-11-22 06:25Z 第 30 轮新增（B-145–B-148）

### B-145 彻底清除死引导与废弃五步操控残骸，补齐订单卡「上炉→起锅」首步引导
优先级：P0 → **done 61f17e1（2026-11-22 第 32 轮开发，第 32 轮走查复测「死引导已消除」）**
修法：首屏文案换成两步循环；局内旧操控 DOM 全删、旧 `.gb` 与 `#bbq-chop` 移除；新增 `[data-onboard-tip]`（首位顾客就座时「点一下上炉」→ 点后「金环亮起就起锅」→ 首单收款后消失）；`e2e/r32-clean-loop.mjs` 双端连跑 3 次全 PASS、0 JS error。
来源：第 30 轮走查（旧五步链路已彻底失效——`teleportToStation('crate_pork')` 后 `press()` 及连按 6 次均为 `carrying === null / chop.chopLeft === 0 / action === "none"`、烤炉三槽全空、`money 0→0 / served 0`；但首屏仍教「取料→切配→炭烤→装盘→上菜」，局内地面黄箭头、`← 料箱` 胶囊、左下摇杆、右下 `去料箱取料` 动作键及桌边 `去料箱取料` toast 全部健在，且残留 `390×844` 全屏空层 `#bbq-chop`；唯一可用的订单卡 `上炉/起锅` 却零引导，点完上炉还会弹出与卡片相差 2 秒的旧 `烤制中 3s/5s` 徽章；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T05-45Z-r30/port-01-title.png`、`port-04-chopbar.png`、`port-06-grill-raw.png`、`port-09-served.png`、`port-13-loop-idle.png`、`port-14-loop-raw.png`、`port-16-loop-served.png`、`land-06-grill-raw.png`）
需求：① 彻底移除所有已死旧操控与误导性 UI：从局内渲染与 DOM 中删除虚拟摇杆 `#bbq-stick`、右下动作键 `#bbq-act`、地面料箱黄箭头、`← 料箱` 离屏指引胶囊、旧 `#bbq-chop` 全屏空层、旧 `6s` 逻辑的 `.gb` 烤炉徽章，以及所有含「去料箱取料 / 取料 / 切配 / 装盘」的 guide toast 文案（协同完成 `B-142` 首屏文案替换与 `B-143` 单源计时收敛）；② 为唯一有效的新玩法补齐首步新手引导：开局首位顾客就座时，在首张订单卡 `.card-btn` 旁显示轻量脉冲指引气泡 `[data-onboard-tip]`（「点这里上炉」），首次点击上炉后文案切为「等亮金环点起锅收款」，完成首单收款（`served >= 1`）后自动销毁且本局不再弹出；③ 同步清理 `docs/GAME-DESIGN.md §5/§6` 中与 `§0/§1` 冲突的旧摇杆与站点交互条款。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 开店进入 `playing` 态断言：(a) `#bbq-stick`、`#bbq-act`、`#bbq-chop`、`.gb` 均不存在或 `display === 'none'`，全页可见文本不匹配 `/去料箱|取料|切配|装盘|烤制中/`；(b) 首位顾客就座当帧 `[data-onboard-tip]` 可见且文本含 `上炉`，真实点击首张 `.card-btn` 后文案切含 `起锅`，进入完美窗再次真实点击起锅后 `served === 1 && money > 0` 且 `[data-onboard-tip]` 隐藏；(c) 双端连跑 3 次 `0` JS error。
参考：《烹饪发烧友》/《沙威玛传奇》移动端开局首步高亮引导；`GAME-DESIGN §0/§1`（一条订单卡 = 两次点击，废弃多步骤工位）。

### B-146 横屏订单卡防遮挡重构与桌号牌 `(4)` 防压「上炉」按钮避让
优先级：P1 → **done 61f17e1（2026-11-22 第 32 轮开发）**
修法：竖屏订单卡落底部拇指区（4 卡等宽 184px、底边余 24px），横屏改底部单排（4 卡等宽 203.8px）；实测与 `.order-num`/`.tb-badge`/`.topbar`/餐桌/烤位交叠面积 `0`、卡宽极差 `0.00px`、按钮 56px 中心全部命中。
来源：第 30 轮走查（横屏 `844×390` 4 客同屏时，订单容器 `484×132 @(350,150)` 按 2×2 排布 4 张 `221×64` 卡片，直接盖死 3/4 号桌下半区、整排烤炉、装盘台与炉前厨师，且 4 号桌红色世界桌号牌 `(4)` 直接叠压在 1 号订单卡 `上炉` 按钮正中遮挡火焰图标；竖屏 4 张 `243×68` 卡片虽等宽左对齐 `x=137`，但纵向占屏 `41%`（`y=60..350`）盖住 2/3 号餐桌；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T05-45Z-r30/land-06-grill-raw.png`、`land-07-grill-cooked.png`、`land-08-grill-burnt.png`、`land-13-hud.png`、`port-06-grill-raw.png`、`port-09-served.png`）
需求：① 结合 `B-145` 移除摇杆与旧动作键所释放的底部操控空间，重构双端 `#bbq-orders` 停靠区：竖屏将订单卡下移至拇指易触的底部停靠区（或采用紧凑卡片将 4 卡总高压至 `<= 30%` 视口高）释放中上部餐区；横屏将订单卡改为底部单排 4 槽（或左右贴边紧凑纵栏，避开屏幕中右侧餐桌与烤炉），确保 1–4 号桌与 3 个烤位主体完整可见；② 在世界标注投影层把 `#bbq-orders` 及每张 `.card-btn` 设为硬碰撞禁区，禁止 `.order-num`（如 `(4)`）与 `.bubble` 落入订单卡矩形内或覆盖主按钮层级；③ 同步修订 `ART-DIRECTION §5` 中的订单卡宽/高与停靠位置定稿。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 坐满 4 位顾客，读取 `#bbq-orders`、所有 `.card`、`.card-btn` 与所有可见 `.order-num`、`.bubble`、`.topbar` 的 `getBoundingClientRect()`，断言：(a) 任意 `.order-num` / `.bubble` 与任意 `.card` / `.card-btn` 的矩形交叠面积 `=== 0`（横屏 `(4)` 严禁再压 1 号卡 `上炉` 按钮）；(b) 4 张 `.card` 宽度极差 `<= 1px`、按钮均 `>= 48×48px` 且 `elementFromPoint` 命中 `.card-btn` 本身；(c) 竖屏 `#bbq-orders` 不遮挡 1–4 号桌中心且占比 `<= 30%` 屏高（或位于底部停靠区），横屏烤炉三槽屏幕投影与 `#bbq-orders` 交叠面积 `=== 0`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《烹饪日记》移动端底部拇指停靠订单条；`ART-DIRECTION §5`、`GAME-DESIGN §0`（竖屏单手可玩）。

### B-147 一键循环「完美窗起锅收款」确定性闭环验收与重玩首帧面板同步隐藏
优先级：P1
来源：第 30 轮走查（① 软渲染下每次截屏耗时数秒、模拟时钟持续走帧，导致点击 `上炉` 后烤串在截屏间隙即越过 12s 焦糊，`port-15-loop-perfect.png` 弹 `焦糊了`、`port-16-loop-served.png` 营业额仍 `¥0`，本轮未获「4–9s 完美窗起锅 → 收款」成功证据；② 点击结算按钮「再 开 一 局」后状态机实测已切回 `phase=playing / money=0 / served=0 / level=1 / timeLeft=180`，但紧接截取的 `port-11-after-replay.png` 与 `land-11-after-replay.png` 画面仍停留在 `打烊结算` 且模糊顶栏仍示 `0:00`；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T05-45Z-r30/port-11-after-replay.png`、`land-11-after-replay.png`、`port-14-loop-raw.png`、`port-15-loop-perfect.png`、`port-16-loop-served.png`）
需求：① 点击结算「再开一局」触发重玩时，同步在同一调用栈立即隐藏 `.bbq-panel`（`display:none`）并同步刷新顶栏时间 `3:00` 与营业额 `¥0`，不等待下一帧被动 polling 才清屏，消除低帧率设备上的重玩视觉滞后；② 新增/补齐确定性冻结时钟的 e2e 回归用例（`e2e/oneclick-e2e.mjs` 或并入 `e2e/oneclick.mjs`）：在不依赖截屏耗时竞争的冻结时钟下，对真实 `.card-btn` 完成「第 1 次点击上炉 → 推进至 `t=5.5s`（`perfect`）→ 第 2 次真实点击起锅收款 → 推进至结算 → 真实点击重玩」全闭环验证。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟下断言：(a) 第 1 次点击 `.card-btn` 后 `cookWindow === 'raw'` 且烤位占用 `+1`；(b) `tick` 推进至 `t=5.5s` 时 `cookWindow === 'perfect'`，第 2 次点击 `.card-btn` 后同帧 `served === 1 && money > 0`（五花肉 `>= 48`）、`#bbq-popups .popup` 可见且文本匹配 `/^\+¥\d+$/`；(c) 进入 `results` 后真实点击重玩按钮，等待 `2×rAF` 断言 `.bbq-panel` 隐藏（`display === 'none'` 或不可见）、`state().phase === 'playing'`、`state().timeLeft >= 179` 且顶栏倒计时文本为 `3:00` 或 `2:59`；(d) 双端连跑 3 次 `0` JS error。
参考：`GAME-DESIGN §1`（4–9s 完美窗口收款）、`TECH-STACK §4`（状态驱动与确定性时间步长）。

### B-148 精简世界餐桌气泡，消除多客同屏时气泡飘移堆叠与订单卡信息冗余
优先级：P2
来源：第 30 轮走查（竖屏 4 客同屏时，长条 `烤五花肉拼盘` 世界气泡因避让订单卡被挤到左上 1 号桌上方垂直叠放两枚、或直接落到烤炉台面与厨师头侧，彻底脱离所属餐桌且与右上订单卡重复展示菜名与耐心环；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T05-45Z-r30/port-04-chopbar.png`、`port-06-grill-raw.png`、`port-09-served.png`、`port-14-loop-raw.png`、`land-06-grill-raw.png`）
需求：① 在一键订单卡已成为唯一主操作入口的前提下，精简世界空间餐桌 `.bubble`：就座顾客头顶不再渲染宽条「耐心环 + 完整菜名」气泡，改为紧贴顾客/餐桌的轻量微标（仅「桌号圆标 + 菜品 SVG 小图标」，宽 `<= 52px`），完整菜名/售价/倒计时由订单卡统一承载；② 为世界微标增加距锚点最大偏移上限（`<= 48px`），禁止任何餐桌气泡被推挤漂移至厨房台面或烤炉区域（`y > counterTopY`）。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 坐满 4 客时断言：(a) 所有可见世界餐桌微标宽度 `<= 56px` 且两两交叠面积 `=== 0`；(b) 每枚微标中心距其对应餐桌屏幕投影中心距离 `<= 64px`，且底边全部高于厨房台面上沿（绝不压烤炉/料箱）；(c) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《沙威玛传奇》极简桌位头顶图标 + 主队列卡分工；`ART-DIRECTION §5`。

本轮小结（第 30 轮）：新开 4 条（`B-145` P0、`B-146`/`B-147` P1、`B-148` P2），沿用既有未修条目 `B-081`/`B-141`（公网 502 与 `/api/health` 构建溯源 P0）、`B-142`/`B-143`/`B-144`/`B-133`/`B-135`/`B-136`/`B-140`/`B-006`；综合评分 **2.3/5（比上轮 2.8 -0.5）**，当务之急是立刻修通公网 502 并落地 `B-145` 清除死引导与旧链路残骸、打通新手第一单闭环。

## 2026-11-22 06:38Z 第 31 轮新增（B-149–B-151）

### B-149 愤怒离店持久可见惩罚与失客红线提示（顶栏失客计数 + 锁星警示）
优先级：P1
来源：第 31 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/port-05-after-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-05-after-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-06-hud.png`：双端 `setPatience(0.4)` 推进 1s 后，顾客转 `leaving-angry`、`angry` 竖屏 `0→1` / 横屏 3 位同帧 `0→3`，但顶栏 `#bbq-hud .stars` 全程维持 `data-stars="1"`（`['#f0c060','none','none']`）且 `money` 无扣款，除短暂的 2.2s `愤怒离店` 飘字外，顶栏无任何持久失客反馈，玩家感知不到失败与 `angry ≥ 3` 锁 `1★` 红线）
需求：① 在顶栏 `.topbar`（或紧贴顶栏的紧凑状态徽标）新增持久可见的失客计数器 `[data-angry-count]`（文案格式 `失客 0/3`，字号 `≥ 13px`）：`angry === 0` 时低饱和常态，`angry >= 1` 转警示红 `#e05a3a`，每次发生 `leaving-angry` 时同步给计数器与顶栏评级区附加持续 `0.6s` 的 `.angry-hit` 警示闪红/轻抖状态（即使当前评级已处于 `1★` 下限也必须可见反馈）；② 当 `angry >= 3` 触及 `GAME-DESIGN.md §4` 的 `1★` 上限锁定条款时，节点附加 `data-star-capped="true"` 并切换明确警示文案（如 `失客 3/3 · 锁1★`），让规则透明可见；③ 在愤怒离店飘字（`.popup`）中显式写出 `愤怒离店 · 满意度 -1`，与顶栏持久失客计数形成即时与持久的双重对齐反馈。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟下执行：(a) 开局断言 `[data-angry-count]` 可见、文本含 `0/3`、`scrollWidth <= clientWidth` 且顶栏整体不溢出视口宽；(b) 先完成 1 单（保持 `data-stars="1"`），再令 1 位顾客 `setPatience(0.4)` 后 `tick` 推进 `1.0s`，断言 `[data-angry-count]` 文本更新为 `1/3`、计算字色为 `#e05a3a`（`rgb(224, 90, 58)`）、触发 `.angry-hit` 类名，且同帧 DOM `#bbq-popups .popup` 文本含 `愤怒离店` 与 `-1`；(c) 累计令 3 位顾客愤怒离店后断言 `[data-angry-count]` 具备 `data-star-capped="true"` 且文本含 `3/3`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》订单超时扣分红闪 + 顶部失误反馈条；《沙威玛传奇》顾客生气离店即时显示差评计数；`GAME-DESIGN.md §1`（愤怒离店满意度 -1）、`§4`（`angry ≥ 3` 星级上限锁 `1★`）。

### B-150 订单卡火候窗口倒计时文案语义清晰化与临近过火紧迫反馈
优先级：P2
来源：第 31 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/port-03-perfect-window.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-03-perfect-window.png`：`t=5.5s` 时卡片状态显示 `完美 4s`，缺少「还剩 x 秒」的方向语义，新手易误读为“已烤 4 秒”或“需再等 4 秒”；生串态 `生串 4s` 同样未点明“距可起锅还剩 Ns”）
需求：① 统一订单卡各火候阶段的倒计时文案为明确剩余语义：`raw`（`0–4s`）显示 `离熟 Ns`（按钮 `未熟` 或 `起锅` 弱化态），`perfect`（`4–9s`）显示 `完美剩 Ns`（按钮高亮 `起锅`），`over`（`9–12s`）显示 `快焦剩 Ns`（按钮转橙红 `快起`），`burnt`（`>12s`）显示 `已焦糊`；② 当 `perfect` 剩余时间 `<= 2.0s`（即 `t ∈ [7, 9)`）时为卡片主按钮附加 `.urgent` 呼吸脉冲样式，在切入 `over` 偏老扣小费前提前给出节奏预警；③ 双端卡片文案保持单行不截断，字号满足 `ART-DIRECTION.md §5` 规范（`>= 13px`）。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟下对订单卡点击上炉，依次 `tick` 至 `t=0.4s / 5.5s / 7.5s / 10.0s`，断言：(a) 卡片状态文案依次匹配 `/离熟\s*\d+s/`、`/完美剩\s*\d+s/`、`/完美剩\s*[12]s/`、`/快焦剩\s*\d+s/`；(b) `t=7.5s` 时 `.card-btn` 带有 `.urgent` 类名，而 `t=5.5s` 时不带；(c) 四个采样点下卡片状态文本均满足 `scrollWidth <= clientWidth` 且计算字号 `>= 13px`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《烹饪发烧友》临界起锅前 2 秒的脉冲催促提示；`GAME-DESIGN.md §1`（4–9s 完美 / 9–12s 偏老窗口）、`ART-DIRECTION.md §5`。

### B-151 订单卡「用餐中」完成态视觉降噪与活跃订单优先排序
优先级：P2
来源：第 31 轮走查（`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/port-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/port-05-after-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/port-06-hud.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-04-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-05-after-angry.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T06-41Z-r31/land-06-hud.png`：完美窗起锅收款后，订单卡切 `cookWindow=eating` 仅文案变为 `用餐中`、小按钮切 `✓ 已上`，但整张卡保持原大尺寸、满不透明度与相同暖金边框，且继续停留在队列顶部位置（如 `port-05-after-angry.png` 中 2 号 `用餐中` 压在 3 号 `等待` 之上），忙时难以一眼区分“已完成”与“待操作”订单）
需求：① 为 `.card[data-cook-window="eating"]` 建立清晰可辨的完成态视觉降噪样式：边框与左强调条切换为 `ART-DIRECTION.md §5` 定义的 ok 绿 `#9ecb6a`（半透明描边），整卡不透明度降至 `0.62–0.72`（与活跃卡 `1.0` 形成明显层次），副行将原标价替换为实收金额回执（如 `已收 ¥34 · 用餐中` / `已收 ¥58 · 用餐中`），同时顺带回显含小费后的最终成交额；② 在 `#bbq-orders` 队列渲染排序中，将 `cookWindow === 'eating'` 的已完成订单自动沉底排在所有可操作订单（`over` / `perfect` / `raw` / `idle`）之后，保证玩家视线与单手拇指最先触达需要处理的订单。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 令至少 2 位顾客就座，对首位订单完成完美窗起锅收款进入 `eating`、另一张保持 `idle` 时断言：(a) `eating` 卡片的计算样式 `parseFloat(opacity) <= 0.75` 且 `< idle` 卡片的 `opacity`（`>= 0.95`），且其边框色含绿色通道主导（`borderColor` 与 `idle` 卡片不同）；(b) `eating` 卡片文本匹配 `/已收\s*¥\d+/` 且数字等于本次实际入账增量（竖屏米线 `34` / 横屏五花肉 `58`）；(c) 在 `#bbq-orders .card` DOM 顺序与屏幕位置上，所有活跃卡（`idle/raw/perfect/over`）均排在 `eating` 卡之前（竖屏 `activeCard.top < eatingCard.top`）；(d) 双端连跑 3 次 `0` JS error。
参考：《沙威玛传奇》/《烹饪日记》已完成订单立即弱化沉底、活跃待处理订单置顶防误触；`ART-DIRECTION.md §5`（ok 色 `#9ecb6a`）。

本轮小结（第 31 轮）：新开 3 条（`B-149` P1、`B-150`/`B-151` P2），沿用 `B-145`/`B-143`/`B-142`（P0 死引导与旧操控残骸）、`B-146`/`B-144`（横屏订单卡覆盖右半屏 `x 388–834` 与卡宽不齐 `221/184.3`）、`B-141`（`/api/health` 无溯源）、`B-148`/`B-133`/`B-136`/`B-140`/`B-006`/`B-009`/`B-014`/`B-066`；综合评分 **2.6/5（比上轮 2.3 +0.3）**。另：`B-147` 的「完美窗起锅收款」闭环已被本轮确定性冻结时钟测试在双端证实成立（竖屏 `+¥34`、横屏 `+¥58`，`served=1`），仅余「重玩首帧面板同步隐藏」半项待第 32 轮覆盖 ⑦ 时复核。

## 2026-11-22 08:16Z 第 32 轮新增（B-152–B-155）

### B-152 生串期防误双击保护窗与「夹生丢弃」废料口径统一
优先级：P1
来源：第 32 轮走查（独立探针以 `40ms` 间隔对同一待上炉订单卡连点 10 次，`10/10` 真实送达，状态逐次切为 `raw → idle → raw → idle → raw → idle → raw → idle → raw → idle`，手机习惯性双击会把刚上炉的生串静默撤回丢弃并弹 `夹生 · 重烤`，且该路径 `waste` 始终为 `0`、仅 `burnt` 才 `waste += 1`，与结算面板「废料」扣星项口径割裂；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-04-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-04-rapid.png`）
需求：① 为订单卡上炉后的生串期增设 `0.6s` 防误触保护窗（由 `flow.update(dt)` 模拟时钟计量，禁止 `setTimeout`）：当 `cookWindow === 'raw' && grillT < 0.6` 时，同卡 `.card-btn` 忽略重复点击并附加 `data-lock-raw="true"`（视觉保持稳态上炉反馈），防止手机双击把刚放上的串静默撤回；② `0.6s <= grillT < 4.0s` 期间，订单卡按钮文案明确显示「未熟」（弱化态）提示玩家尚未可起锅；若玩家仍主动点击提前撤回，明确按废料代价结算——`waste += 1`、释放烤位、卡片回 `idle`、营业额不变，飘字文案改为 `夹生丢弃 · 废料 +1`，与 `GAME-DESIGN.md §4` 结算面板的废料统计统一口径；③ 保持对已 `eating`（`disabled`）卡片连点完全忽略的现有正确行为，确保烤位释放零泄漏、物品零复制。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟/确定性 `tick` 下断言：(a) 对待上炉订单卡以 `40ms` 间隔真实鼠标连点 10 次（模拟时钟推进 `< 0.5s`），断言每次点击后 `cardState.cookWindow === 'raw'`、占用烤位数恒为 `1`、`state().waste === 0`（严禁出现 `raw → idle` 乒乓）；(b) 推进至 `t = 1.2s`（`raw` 期且超出 `0.6s` 保护窗）断言 `.card-btn` 文本含 `未熟`，再真实点击 1 次后同帧断言 `cardState.cookWindow === 'idle'`、3 个烤位全部 `occupied === false`、`state().waste === 1` 且飘字含 `夹生` 与 `废料`；(c) 正常推进至 `t = 5.1s`（`perfect`）起锅仍 `served === 1 && money === 58`，随后对已 `eating` 按钮连点 12 次 `money`/`served`/`waste` 均不变；(d) 双端连跑 3 次 `0` JS error。
参考：《烹饪发烧友》/《沙威玛传奇》（食材刚下锅设短锁定窗防误双击撤回，主动倒掉未熟食材明确计入损耗）；`GAME-DESIGN.md §1`、`§4`。

### B-153 结算星级归因文案、重玩按钮指明关卡与开放「回到第 1 关」解除进度锁死
优先级：P1
来源：第 32 轮走查（第 1 关以 `money=210 / target=180 (117%), served=4, angry=1, waste=2` 达标结算得 `2★`，但面板无任何解释说明为何未满 `3★`；过关写入 `localStorage.bbq.level="2"` 后，第 2 关失败结算仅显示 `离目标还差 ¥255` 与单个 `再 开 一 局` 按钮，点击后实际重打第 2 关、文案与语义模糊，且全界面没有任何回到第 1 关的入口，玩家被单向锁死在第 2 关；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-06-results-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-08-results-fail.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-09-replay.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-06-results-pass.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-08-results-fail.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-09-replay.png`）
需求：① 在结算面板星级 `.stars-big` 下方新增数据驱动的单行归因 `[data-star-reason]`（字号 `>= 13px`，自动换行不溢出），严格复用 `src/game/stars.ts` 判定口径：若达标获 `2★` 则列明具体扣星项（例如 `angry=1, waste=2` 时显示 `营业额已达标；因愤怒离店 1 位、废料 2 份未满 3★（需 0 愤怒且废料 ≤1）`）；若获 `3★` 显示 `完美营业！达成 3★ 满星`；若未达标获 `1★` 显示 `离目标还差 ¥X，达标即可升 2★`（若触及 `angry >= 3` 或 `served === 0` 上限锁星同步点明）；② 将结算重玩按钮的含糊文案「再 开 一 局」改为明确指向当前关的 `重打第 N 关`（如第 1 关 `重打第 1 关`、第 2 关 `重打第 2 关`），同步去除中文间手打空格并统一主次按钮高度 `>= 44px`（联动收口 `B-140`）；③ 解除 `localStorage.bbq.level` 单向锁死：当 `level > 1` 时，结算面板（无论第 2 关失败或通关）以及有存档的首屏卡片均提供可见可点的次级按钮 `[data-back-lv1]`（「回到第 1 关」），点击后将当前关卡重置为 `level = 1`、`target = 180`（并允许随时再切或重闯第 2 关），同帧隐藏结算面板进入第 1 关。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下断言：(a) 第 1 关以 `money=210, served=4, angry=1, waste=2` 结算，断言 `[data-star-reason]` 可见且文本同时包含 `愤怒`、`废料` 与 `3★`，且重玩按钮文本为 `重打第 1 关`（不匹配中文间手打空格正则 `/[\u4e00-\u9fa5][\s\u3000]+[\u4e00-\u9fa5]/`）、高度 `>= 44px`；(b) 进入第 2 关并故意失败（`money=5`），断言结算面板无下一关按钮、主重玩按钮文本为 `重打第 2 关`、`[data-star-reason]` 含 `¥255`、且 `[data-back-lv1]` 可见可点；(c) 点击 `重打第 2 关` 后同帧面板隐藏且 `state().level === 2 && state().levelTarget === 260`；再次触发第 2 关失败后点击 `[data-back-lv1]`，同帧面板隐藏且 `state().level === 1 && state().levelTarget === 180 && state().money === 0`；(d) 结算面板在 `844×390` 矮屏下所有按钮完整位于视口内（`rect.bottom <= innerHeight - 8`），双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《沙威玛传奇》（结算页明示丢星原因与 3★ 门槛，高关卡失败时区分「重玩本关」与「返回第 1 关/选关」绝不锁死存档）；`GAME-DESIGN.md §3`、`§4`、`B-136`、`B-138`、`B-140`。

### B-154 飘字队列并发上限、同类合并与禁压订单卡硬避让
优先级：P1
来源：第 32 轮走查（竖屏连点后屏幕中上部瞬间堆出 8 条巨型红框 `夹生 · 重烤` 飘字，将 2/3 号订单卡、餐桌与厨师头顶彻底糊死（DOM 实测：16 次 `120ms` 间隔连点后 `#bbq-popups .popup` 并发 **8 个**，与订单卡最大交叠面积 `4998px²`）；另完美起锅时金色 `+¥58` 飘字直接盖住竖屏 3 号订单卡左侧 `[3]` 徽标与 `¥48`；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-04-rapid.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-04-rapid.png`）
需求：① 在 `#bbq-popups` 飘字管理器中落地并发节流与合并策略：全屏同时存在的 `.popup` 节点总数硬上限为 `3` 条（超限即淘汰最早节点）；`0.8s` 内同类型提示（如连续触发 `夹生 · 重烤` / `夹生丢弃`）不再创建新 DOM，而是原地刷新已有同类型节点并附带合并次数（如 `夹生丢弃 · 废料 +1 ×2`）与轻幅缩放抖动；② 收紧单条 `.popup` 视觉体量（字号 `14–16px`、`padding: 4px 10px`、`max-width: min(220px, 60vw)`），并缩短操作警示飘字驻留至 `<= 1.0s`（对齐 `GAME-DESIGN.md §7` 与 `B-123`）；③ 飘字定位前实时读取 `#bbq-orders` 及其下每张 `.card` 的包围盒作为硬禁区，计算落点使所有 `.popup`（含收款 `+¥xx` 与警示类红框飘字）自动避开订单卡列，优先落于餐区中左空隙或订单卡下方安全带且完整留在视口内（`left >= 6 && right <= vw - 6 && top >= topbar.bottom + 6`）。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下断言：(a) 坐满 3 位顾客后对第 1 单完美窗起锅收款（触发 `+¥58`），当帧读取所有可见 `.popup` 与所有 `#bbq-orders .card` 的 `getBoundingClientRect()`，断言两两矩形交叠面积 `=== 0`；(b) 在 `0.5s` 内通过测试或连续操作触发 8 次同类警示飘字，断言 `#bbq-popups .popup` 可见节点总数始终 `<= 3`、同类合并节点文本含 `×` 计数，且与所有 `#bbq-orders .card` 交叠面积 `=== 0`、全部在视口安全区内；(c) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《烹饪发烧友》（高频提示采用单条合并计数 + 严格避开操作热区，严禁弹窗堆叠糊屏）；`GAME-DESIGN.md §7`、`ART-DIRECTION.md §5`、`B-123`、`B-143`。

### B-155 切关与重玩开场目标横幅（消除第 2 关盲打无目标提示）
优先级：P2
来源：第 32 轮走查（点「进入第 2 关」或失败后「再 开 一 局」跳过首屏直接进入局内，顶栏只展示 `第 2 关 营业额 ¥0 时间 2:58 评级 ★☆☆`，全场无任何元素告知玩家本关目标额已从 `¥180` 提高到 `¥260`，直至 3 分钟打烊失败才看到 `营业额 ¥5 / ¥260`；见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-07-next-level.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-07-next-level.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/port-09-replay.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T07-55Z-r32/land-09-replay.png`）
需求：① 每次进入对局（首屏点开店、结算点「进入第 2 关」、结算点重打或回第 1 关）时，在屏幕中上部非阻断层（`pointer-events: none`）展示持续 `1.8s` 的开场关卡横幅 `[data-level-banner]`，显示「第 N 关 · 3 分钟目标营业额 ¥{target}」（如第 2 关展示 `第 2 关 · 目标营业额 ¥260`），由 `flow.update(dt)` 驱动淡出并销毁（禁止 `setTimeout`）；② 横幅采用 `ART-DIRECTION.md §5` 暖黑金边皮肤、字号 `>= 15px`、不阻挡订单卡点击，并与顶栏常驻目标额（`B-125`）读取同一 `config.LEVELS` 数据源。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 下完成第 1 关达标并点击「进入第 2 关」，断言：(a) 切入第 2 关后 `t = 0.2s` 时 `[data-level-banner]` 可见、文本同时包含 `第 2 关` 与 `¥260`、`getComputedStyle(el).pointerEvents === 'none'` 且不溢出视口；(b) `tick` 推进 `2.2s` 后 `[data-level-banner]` 自动隐藏或移除；(c) 失败重打第 2 关时同样触发含 `¥260` 的横幅；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《沙威玛传奇》（每关开场 1.5–2s 轻量横幅播报关卡号与过关目标额，随后淡出不打断首手操作）；`GAME-DESIGN.md §3`、`TECH-STACK.md §2`（禁 `setTimeout`）、`B-125`。

本轮小结（第 32 轮）：新开 4 条（`B-152` 生串防双击与夹生计废料 P1、`B-153` 结算星级归因+明确重打关卡+回第 1 关入口 P1、`B-154` 飘字限流合并与禁压订单卡 P1、`B-155` 切关/重玩开场目标横幅 P2），沿用 `B-145`（P0 首屏旧五步文案与局内旧摇杆/料箱死引导，本轮再次复测确认未变，不重复新开）、`B-146`/`B-144`（横屏订单卡占位与对齐）、`B-141`（`/api/health` 构建溯源）、`B-149`（愤怒离店顶栏反馈）、`B-125`/`B-133`/`B-140`/`B-150`/`B-151`/`B-006`/`B-009`；综合评分 **2.6/5（比上轮 2.6 ±0.0）**。另：本轮实测证实 `B-147` 遗留的“重玩/下一关首帧面板同步隐藏”已成立（`panel=null` 同帧清屏），可关闭该疑虑。当务之急是立刻落地 `B-145` 清除首屏旧五步文案与局内废弃操控残骸，并顺手修掉本轮 ⑨/⑦ 暴露的 `B-152`（防双击误撤回+废料口径）、`B-154`（根治 8 条飘字糊屏）与 `B-153`（星级归因+回第 1 关解锁）。

## 2026-11-22 08:20Z 第 32 轮开发：铲除旧五步残骸 + 订单卡落拇指区（`61f17e1`）

- 本轮只做一件事：**让屏幕上只剩订单卡两击循环**。首屏文案换成「点订单卡两步出餐：上炉 → 起锅上菜」；局内删除 `#bbq-stick`（虚拟摇杆）、`#bbq-act`（去料箱取料）、`#bbq-chop` 全屏层、`← 料箱` 胶囊与 `.gb` 旧 6s 烤炉徽章（`src/ui/controls.ts` −268 行、`src/ui/hud.ts` 重排、`src/main.ts` −69 行）。
- 单一计时真相：烤制倒计时只在订单卡上出现，B-143 的「卡片 4s vs 徽章 6s 差 3 秒」冲突消失。
- 订单卡下移竖屏底部拇指区（4 卡等宽 184px、底边余 24px），横屏改底部单排（等宽 203.8px），B-146 的遮挡 / 卡宽不齐 / `(4)` 压按钮三项一并解决。
- 新手引导：首位顾客就座出 `[data-onboard-tip]`「点一下上炉」→ 点后「金环亮起就起锅」→ 首单收款后消失。
- 验收：`e2e/r32-clean-loop.mjs` 在本机 3035 实跑 双端 × 3 轮全 PASS、0 JS error（竖屏 390×844 / 横屏 844×390；卡宽极差 0.00px、交叠面积 0、按钮 56px 中心命中）；`npx tsc --noEmit` + `npm run build` + `ci-deploy.sh` DEPLOY OK，`/` 与 `/bbq/` 均 200。
- 执行过程：agy `gemini-4-neon-xhigh` 跑满 60 分钟超时（rc=124，尾段卡在并发 e2e），按兜底流程提交并合入 main，随后由我本人补跑 tsc/build/部署/验收。
- 下一轮建议：`B-152`（生串双击静默撤串 + 夹生不计废料，玩家会以为点了没反应）优先于任何新内容；其次 `B-154`（8 条飘字糊屏）。
- 遗留：`B-141`（`/api/health` 构建溯源）、`B-149`（愤怒离店无顶栏反馈）仍未做。

## 2026-11-22 08:40Z 第 33 轮新增（B-156–B-159）

### B-156 焦糊惩罚解耦（不一次双扣愤怒与废料）与焦糊留痕重烤机制
优先级：P1
来源：第 33 轮走查（冻结时钟推进至 `t=12.1s` 触发 `cookWindow="burnt"` 同帧 `angry 0→1` 且 `waste 0→1`，一次焦糊直接打破 `GAME-DESIGN.md §4` 的 `a=0` 条件令 `w≤1` 容错形同虚设，且焦糊卡 `1.0s` 后移除、顾客离店、桌面无残留提示，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/port-08-burnt-linger.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/port-05-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/land-05-grill-burnt.png`）
需求：① 解耦烤焦惩罚，令 `t > 12s` 自动焦糊仅计 `waste += 1`、释放烤位并保持 `money` 不增（按 `GAME-DESIGN.md §1` 仅作废料结算），**不再同帧强制触发 `angry += 1` 赶走顾客**——顾客维持在座并继续消耗剩余耐心，仅当耐心真正归零时才 `angry += 1` 愤怒离店；② 焦糊发生后，该订单卡先以焦糊警示态驻留 `1.2s`（由 `flow.update(dt)` 驱动，禁 `setTimeout`），随后自动切回可重新上炉的 `idle` 态并附加 `[data-burnt-retry="true"]` 标记与「焦糊 · 重烤」轻提示角标直至玩家再次点击上炉；③ 焦糊飘字文案更新为 `焦糊了 · 废料 +1`，明确传达本次损耗口径，同步在 `GAME-DESIGN.md §1/§4` 写清焦糊仅计废料、不直接扣满意度的单一规则。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟下执行：(a) 点 1 号卡上炉并 `__test.tick()` 推进至 `t=12.1s`，断言同帧 `state().waste === 1`、`state().angry === 0`、`state().money === 0`，且 `#bbq-popups .popup` 文本同时包含 `焦糊` 与 `废料`；(b) `t=12.5s` 时该订单卡仍存在于 `#bbq-orders` 且 `dataset.cookWindow === 'burnt'`，继续推进 `1.5s` 后断言卡片切回 `dataset.cookWindow === 'idle'`、具备 `[data-burnt-retry="true"]` 且对应顾客仍为 `seated`；(c) 再次点击该卡上炉并于 `t=5.5s` 完美窗起锅收款，断言 `served === 1 && money > 0`，随后在 `money >= target, angry === 0, waste === 1` 条件下结算断言星级 `=== 3`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《沙威玛传奇》（烤焦仅损毁该份食材并要求重做，顾客耐心未归零前不会立刻离店，保留容错与翻盘空间）；`GAME-DESIGN.md §1`、`§4`、`TECH-STACK.md §2`。

### B-157 偏老/焦糊订单卡分级边框着色与消除「焦糊 焦糊」文案重复
优先级：P1
来源：第 33 轮走查（`t=10.1s` `cookWindow="over"` 时订单卡边框 computed 为 `rgba(232, 180, 90, 0.48)` 与 `idle` 卡完全同色、按钮底色 `rgba(32,20,13,0.92)`，新手引导仍停在「金环亮起就起锅」；`t=12.1s` `cookWindow="burnt"` 时卡内出现 `焦糊 焦糊` 文案重复，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/port-07-over-10s.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/port-08-burnt-linger.png`）
需求：① 为 `#bbq-orders .card` 按 `[data-cook-window]` 落实明确色阶区分：`idle` 保持 `rgba(232, 180, 90, 0.48)`，`perfect` 切亮金 `#f0c060`，`over` 切 `ART-DIRECTION.md §5` 警示橙红 `#e05a3a`（`2px solid rgb(224, 90, 58)`）并同步把 `.card-btn` 背景改为可见暖橙警示填充（如 `rgba(224, 90, 58, 0.28)`）配轻呼吸动效，`burnt` 切深红 `#c93b2b`；② 消除 `burnt` 态「焦糊 焦糊」重名：副行状态文案改为 `已焦糊`，按钮文案改为 `已废`（且 `disabled`，衔接 `B-156` 在 `1.2s` 驻留结束后恢复可点 `上炉` / `重烤`），禁止卡片状态词与按钮词同名；③ 若 `[data-onboard-tip]` 仍可见且目标卡进入 `over` 态，提示文案同帧切换为 `快焦了，立刻起锅！`。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 冻结时钟下保持 2 号卡 `idle`、点 1 号卡上炉：(a) 推进至 `t=10.1s`（`over`）读取 `getComputedStyle(card1).borderColor` 与 `getComputedStyle(card2).borderColor`，断言两者严格不等且 `card1` 为 `rgb(224, 90, 58)`，`card1` `.card-btn` 的 `backgroundColor` 严格不等同于 `card2` `.card-btn`；若 `[data-onboard-tip]` 可见则文本匹配 `/快焦|立刻/`；(b) 推进至 `t=12.1s`（`burnt`），断言 `card1` 状态文本与 `.card-btn` 文本去空白后严格不等，且 `card1.innerText` 不匹配 `/焦糊\s+焦糊/`；(c) 全部卡片内文本满足 `scrollWidth <= clientWidth` 且计算字号 `>= 13px`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《烹饪发烧友》（过火预警整卡切警示红框与按钮底色，焦糊结果态与操作词严格区分）；`ART-DIRECTION.md §5`、`GAME-DESIGN.md §1`。

### B-158 清理状态机与 `__test.state()` 废弃五步死语义（`crate-pork` / `去料箱取料` / `bin/chop/plate`）
优先级：P2
来源：第 33 轮走查（UI 层已在 `61f17e1` 清除旧五步控件，但 `__test.state()` 仍导出 `hint:{kind:"station", id:"crate-pork"}`、`actionLabel:"去料箱取料"`、`stations` 仍包含 `bin / chop / plate`，导致状态语义与 `GAME-DESIGN.md §1` 割裂并污染 E2E 与调试日志，参考 `/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/port-02-orders.png`）
需求：① 清理 `src/game/flow.ts` 与 `src/game/stations.ts` 中已废弃五步流程的运行时状态导出：`state().hint` 改为反映当前订单卡两步循环的真实建议（如 `{kind:"order", tableId, action:"grill"|"serve"}` 或 `null`），删除 `actionLabel: "去料箱取料"` 等旧站点引导文案；② 将 `bin / chop / plate / crate-*` 从玩法可交互站点表移除（保留 `src/world/kitchen.ts` 的 3D 静态布景网格不变，严格落实 `GAME-DESIGN.md §1`），`state().stations` 仅保留有效玩法实体；③ 同步更新引用上述旧字段的测试断言，保持 E2E 全套通过。
验收：e2e 在竖屏 `390×844` 与横屏 `844×390` 进入 `playing` 态并就座 3 位顾客后读取 `window.__test.state()`：(a) `JSON.stringify(state)` 不匹配 `/去料箱|取料|切配|装盘|crate-pork/`；(b) 若 `state.stations` 存在，其 id 集合不包含 `bin`、`chop`、`plate`；(c) `node scripts/measure-look.mjs` 与 `e2e/r32-clean-loop.mjs` 回归全绿，厨房台面静态布景正常渲染；(d) 双端连跑 3 次 `0` JS error。
参考：`GAME-DESIGN.md §0`、`§1`（料箱/切配/装盘/垃圾桶全部从玩法里移除，美术资产可保留作布景）；`TECH-STACK.md §2`。

### B-159 修订 `ART-DIRECTION.md §5` 过期订单卡规格与横屏引导气泡防压料箱
优先级：P2
来源：第 33 轮走查（`docs/ART-DIRECTION.md §5` 仍写着「订单卡：右上竖排 ≤3 张、`top:150px`、横屏 `max-width 168px`、夹在桌位光圈与动作键之间」，§1 仍保留摇杆与动作键尺寸，与 `61f17e1` 实测的底部停靠区规格严重过期；同时横屏 `[data-onboard-tip]` 引导气泡直接叠压 2 号菌子料箱与挂牌，见 `/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/land-02-orders.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/land-03-grill-raw.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T08-40Z-r33/land-04-grill-perfect.png`）
需求：① 修订 `docs/ART-DIRECTION.md §5` 订单卡皮肤与布局定稿为底部单手停靠区规范（竖屏底部 2×2 停靠、占屏高 `<=25%`、距底 `>=max(16px, env(safe-area-inset-bottom))`、按钮 `>=48×48px`；横屏底部单排、占屏高 `<=20%`、距底 `>=10px`），并将 `§1` 中废弃的摇杆/动作键条款标明已移除，消除文档债；② 调整横屏（`aspect >= 1.5`）下 `[data-onboard-tip]` 锚点位置：将气泡上移至厨房台面上沿之上的中区走道，或改为贴紧 1 号卡上缘偏右且避开 `crate-pork/mush/mix` 台面投影区，避免遮挡料箱实物与斗方挂牌。
验收：(a) 检查 `docs/ART-DIRECTION.md §5` 不再包含 `top:150px`、`右上竖排`、`动作键` 等过期表述，新增底部停靠区占比与底距参数与实测（竖屏 `23.2% / 24px`、横屏 `17.4% / 10px`）一致；(b) e2e 在横屏 `844×390` 就座与上炉态下读取 `[data-onboard-tip]` 与三个料箱屏幕投影矩形，断言交叠面积 `=== 0` 且气泡不越出视口；(c) 竖屏 `390×844` 下 `[data-onboard-tip]` 仍紧贴 1 号卡上方、与 `.topbar` 及 `#bbq-orders .card` 交叠 `=== 0`；(d) 双端连跑 3 次 `0` JS error。
参考：《胡闹厨房 2》/《烹饪日记》移动端底部停靠规范与不压关键布景的引导锚点；`ART-DIRECTION.md §1`、`§5`、`GAME-DESIGN.md §0`。

## 2026-11-22 09:5xZ 第 33 轮开发：B-152 生串防误双击 + 夹生计废料（DONE `5ca06ad`，merge `de55a6c`）

- **本轮只做一件事**：让「点了一下没反应 / 手滑双击把刚上的串撤掉」这种死路消失。
- 实现（`src/game/flow.ts` / `src/ui/hud.ts`）：
  1. 新增 `RAW_LOCK_SEC = 0.6`，`isRawLocked()` 用 `grillT`（模拟时钟）判定；0.6s 内 `handleOrderCardAction` 直接 `return true` 不改任何状态（不撤串、不弹字、不计数）。
  2. `OrderCardState.rawLocked` + `.card[data-lock-raw]`；锁定态按钮文案 `上炉中`（稳态、不 disabled）；`0.6–4.0s` 按钮文案 `未熟`（`#9aa0a6` 弱化），label 改为 `未熟 · 离熟 Ns`（回应 `B-150` 的方向语义）。
  3. 该窗口内主动提前撤回 → `waste += 1`、释放烤位、营业额不变、飘字 `夹生丢弃 · 废料 +1`（口径与 §4 结算「废料」统一）。
  4. `eating/disabled` 连点继续完全忽略（原有正确行为未动）。
- 新增 `e2e/rawlock.mjs`（双视口 ×3 连跑，含 10×40ms 连点、锁窗、提前撤回、eating 连点、热区/字号/溢出）；`e2e/oneclick.mjs` 断言同步新文案。
- 验收（部署后由调度方亲跑 `E2E_BASE=http://127.0.0.1/bbq/`）：`rawlock.mjs` 竖屏+横屏 `RAWLOCK OK`（rc=0）；`oneclick.mjs` 双端 `ONECLICK OK`（rc=0）；`tsc --noEmit` PASS、`npm run build` PASS、`ci-deploy.sh` DEPLOY OK、`127.0.0.1:3035` 与 `/bbq/` 均 200。
- 实测：连点 10 次（累计 0.45s）烤位恒 1、`waste=0`、按钮 `上炉中`；`t=1.2s` 按钮 `未熟`、状态 `未熟 · 离熟 3s`；提前撤回 `waste=1` 飘字 `夹生丢弃 · 废料 +1`；完美窗起锅 `served=1 / +¥62`（48 + 满耐心小费 14）。
- 一单点击数：2 次不变（本轮减少的是**误触代价**：双击不再静默丢串）。
- 下一条建议：`B-156`（焦糊后烤位释放/驻留死路）与 `B-157`（over/burnt 整卡色阶 + 消除「焦糊 焦糊」），二者都是「玩家以为自己点了没用」的同类死路。
