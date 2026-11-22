# yunnan-bbq-house
柳真真云南烤肉 · 模拟经营游戏（Overcooked 式画面 + Saltline 式灯光），移动端优先

## 核心玩法
点订单卡完成两步循环：**上炉 → 起锅上菜**（0–4s 夹生重烤 / 4–9s 完美满小费 / 9–12s 偏老半小费 / >12s 自动焦糊，3 个烤位排队）。

## E2E 脚本清理记录（第 32 轮）
已移除彻底废弃的旧五步操控 UI 断言脚本（对应 `#bbq-stick`、`#bbq-act`、`#bbq-chop`、`#bbq-grillbars`/`.gb`、`#bbq-offhint`、`#bbq-guide` 与旧 6s「烤制中」文案）：
- 删除：`e2e/act-ui.mjs`、`e2e/chop.mjs`、`e2e/grill.mjs`、`e2e/grill-warn.mjs`、`e2e/offscreen.mjs`、`e2e/plated-hint.mjs`、`e2e/wrong-dish.mjs`、`e2e/spawn.mjs`、`e2e/review-capture.mjs`
- 更新：`e2e/crates.mjs`、`e2e/modal-hud.mjs`、`e2e/landscape.mjs`、`e2e/input-drop.mjs`（改为断言旧操控节点不存在、无旧文案，并适配底部停靠订单卡）
- 新增：`e2e/r32-clean-loop.mjs`（竖屏 390×844 & 横屏 844×390 全项验收：首屏两步文案、旧节点清零、首单引导气泡、底部停靠与 4 客等宽零交叠、两次点击收款）
