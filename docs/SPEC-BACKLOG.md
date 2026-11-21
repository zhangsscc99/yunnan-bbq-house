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

### B-072 横屏必须完整看到工作台（crate-*/grill/plate 不被 HUD 与屏幕下缘切掉）
优先级：P1
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
  - **B-076（P2）横屏订单卡缩字到 12px/10px**（`@media (max-height:450px) and (min-width:600px)`），与 ART §5「HUD 字号 ≥13px」冲突，且横屏本应更清楚；建议改为加宽卡片/两行布局而不是缩字。
  - **B-072 未动**：横屏底部工作台裁切仍在，本轮只调整了订单卡位置，未验证 `crate-*/grill/plate` 是否完整可见。

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
