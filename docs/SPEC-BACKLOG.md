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

- [ ] **单个大按钮语义不可见**：`resolveInteraction()` 在没靠近站点时返回 `mk('none','')`，玩家得不到「该去哪」的指引；走查日志里出现「站在店里 label 空 / 站烤炉旁却显示『烤制中…』」两种状态混叠，容易误判为「点了没反应」。（14:00 复核：烤炉分支逻辑本身正确，需真机再验证是否是输入节流问题）

## P1（体验）

- [ ] **切配连点丢输入**：走查日志 `chop` 步骤连点 3 次后进度仍为「切配 1/3」（`cap3="切配 1/3"`）。`flow.act('chop')` 每次减 1 且无节流，怀疑是 E2E 点击过快/未命中按钮热区。需要一次真机 Playwright 慢速连点复现，确认是验收脚本问题还是输入丢失。
- [ ] **顾客耐心归零离店**的反馈只有 0.6s 红怒符号，缺少「-1 满意度」的 HUD 飘字，玩家不会意识到扣分。
- [ ] **缺 docs/PRODUCT-REVIEW.md**：bbq-walkthrough 走查任务每小时 :41 应产出该文档，目前只有 `e2e/review/<ts>/` 截图和 run json，没有文字结论。实现轮拿不到 review 输入。

## P2（打磨/工程）

- [ ] `.gitignore` 增加 `e2e/review/`、`e2e/shots/`、`dist/`、`server/dist*`、`data/`，否则每轮都留下未跟踪截图噪音。
- [ ] THREE 控制台警告：`THREE.Clock deprecated`（改 `THREE.Timer`）、`PCFSoftShadowMap has been removed`。
- [ ] 性能基线（390×844 竖屏）：calls 219 / tris 10824 / programs 15 — 尚可，继续克制。
