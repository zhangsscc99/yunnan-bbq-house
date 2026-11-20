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

### B-025 相机必须夹紧到世界边界，横屏不得露出世界外虚空
优先级：P1
来源：第 5 轮走查（844×390 开局左起 157 列纯黑；`__test.teleport(-5,5)` 后扩到 258 列 ≈31% 屏宽，硬直竖切；vision 判「像分辨率没适配、世界只渲染在右上角」）
需求：`ART-DIRECTION §1` 的 `halfH = clamp(max(4.8, 6.8/aspect), 4.8, 9)` 在 844×390 给出 ≈20.7×9.6m 视野，而世界只有 12×9m → 横屏天生多出 ~8.7m 空域。二选一：① 相机 lookAt 目标按 `worldBounds ± halfW/halfH` 夹紧（世界比视野小时锁定居中）；② 在世界外补可读背景（街道/围墙/树，非纯色）。两端口径一致，并同步修订 ART §1 的公式使其与 12×9m 自洽。
验收：双端 + 4 个角落位置（`teleport(±5,±4.5)`）截图，逐列亮度均值**不存在连续 ≥24px 且 <26 的近黑列**；`npx tsc --noEmit` 通过；draw calls 仍 ≤120。
参考：Overcooked 关卡外始终有可读场景边界。

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
优先级：P1
来源：第 7 轮走查（真手指拖摇杆 2.0s → 角色位移 **2.19m**；按 `GAME-DESIGN §6` 的 3.2 m/s 应为 6.4m，有效速度仅 **1.1 m/s / 34%**。根因 `src/main.ts` 的 `dt = Math.min(clock.getDelta(), 0.1)`：5fps 时每帧只推进 0.1s → 游戏时钟 0.5×，2fps 时 0.2×。结果：低端机上「180 秒关卡」真实耗时 6–15 分钟，而 HUD 仍显示 `3:00` 倒计时，玩家只会觉得"这关怎么这么长"）
需求：把防穿模钳制与时间积分分开——① 物理/碰撞用钳制后的 `dt`（≤0.1）逐步 substep；② 游戏时钟（`timeLeft`、耐心、烤制）走**未钳制**的真实 `dt`（上限放到 0.5 并累加器补帧），或至少 `timeLeft` 用墙钟校正；③ 当 60 帧平均帧时间 >100ms 时，HUD 给一次「设备较慢，进度按真实时间」的提示（复用 `#bbq-guide`）。
验收：e2e 在强制低帧（`--disable-gpu` 或 `__test.tick` 驱动的墙钟场景）下跑 60s 现实时间，断言 `timeLeft` 减少量 ≥54s（误差 ≤10%）；同一条件下摇杆 2s 位移 ≥5.5m；正常帧率下所有既有断言不变（无回归）。
参考：`GAME-DESIGN §6`（3.2 m/s）、`TECH-STACK §4`（一切走 `flow.update(dt)`）；Overcooked 的关卡计时与渲染解耦。

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
