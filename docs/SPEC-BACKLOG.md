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

- [ ] **出生点与设计不符**：`flow.ts startLevel()` 里 `spawn = {x:0.5, z:1.2}`（贴餐区左上死角），`docs/GAME-DESIGN.md §5` 写的是 (6,5.5)。要么改代码回 (6,5.5)，要么改文档；当前开局要横穿全店才能到料箱，新手第一秒不知道干什么。
  - **复核（第 1 轮走查，14:37Z）**：回到 (6,5.5) **不能解决问题**——烤炉 `usePos`=(7,6)，与 (6,5.5) 距离 1.12m < 判定 1.15m，按文档实现照样开局命中烤炉。正解见 B-003：出生点与所有 `usePos` 保持 >1.15m（建议 (6, 5.0) 或把判定收到 1.0m），改完用 `__game.current.action==='none'` + 按钮标题为引导语验收。

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
验收：Playwright 在 390×844 取 `grillT=0.1/4.6/9.3/13` 四帧，断言进度条屏幕宽 ≥60px、`item.stage` 依次 chopped→chopped→cooked→waste，且 cooked 帧的串材质 hex 与 raw 帧色相差 ≥10；截图人工复核一遍。
参考：胡闹厨房 2 煎锅（进度环 + 冒烟转黑），GAME-DESIGN §7。

### B-002 顾客气泡屏幕边界钳制
优先级：P1
来源：第 1 轮走查（竖屏 3 位顾客时左缘气泡 `x=-63, w=84`，只露出 21px「菌子」残字，像渲染错误）
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
验收：`pm2 delete yunnan-bbq && bash scripts/ci-deploy.sh` 在干净环境一把过（DEPLOY OK），随后 `curl /bbq/` 与 `/bbq/api/health` 均 200；人为占用 3035 时脚本必须失败并回滚，不许静默。
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
