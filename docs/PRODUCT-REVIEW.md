# 产品走查报告 — 柳真真云南烤肉

> 只写文档，不改代码。每轮 3–4 个剧本步骤深挖，轮转覆盖 ①–⑩。
> 截图目录：`e2e/review/<UTC>-live/`（竖屏 `port-*` 390×844、横屏 `land-*` 844×390，含 `run-*.json` 原始测量）。

## 2026-11-22 05:20Z 第 29 轮

本轮走查时间 `2026-11-22 05:20Z`（上一轮 `03:08Z` 第 28 轮，综合 `3.0/5`）。**被测对象与版本现状**：
- 本机 `http://127.0.0.1:3035/` 当前运行 `window.__build = "05afe9b-202611220449"`（入口 `assets/index-uMHCucrV.js`）。**该构建编译自含未提交改动的 dirty working tree**：git 源码 HEAD `05afe9b` 中并不存在 `.card-btn`，而线上 bundle 已包含 `56×56` 的 `上炉/起锅` 订单卡主按钮——即本机实际跑的是未入库的「订单卡一键循环」半成品，`__build` 所标注的 commit 号不可信，无法追溯代码快照。
- 公网 `https://openfolio.uk/bbq/` 仍停留在旧包 `assets/index-BklOlgyL.js`（内嵌 `__build="2290acb-202611210547"`，2026-11-21 05:47），持续落后本机（沿用 `B-081` 未修）；**本轮收尾复测（05:35Z）公网 `/bbq/` 已从 200 掉为 `502`（连测 3 次均 502），同域 `/` 与 `/health` 仍 200、`/transport/` 同样 502，本机 `127.0.0.1:3035` 200**——即公网反代到本机 3035/3028 的上游通路已断，公网当前完全打不开游戏。
- `docs/GAME-DESIGN.md §0/§1` 已由用户定调为最高优先方向：**一条订单卡 = 两次点击（上炉 / 起锅）**，切配台/装盘台/料箱走动一律删除；画面学胡闹厨房，玩法不学。以下全部实测数据、19 张截图判读与结论**仅适用于本机脏树半成品 `05afe9b-202611220449`**。

综合评分：2.8/5（比上轮 3.0 -0.2）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视/格子感/高饱和食材/Q 版角色） | 3.1 | 正交俯视木地板拼缝、一字型 1m 模块厨房台面、五花肉/菌子/米线实物料箱与箱前斗方挂牌、白帽朱红围裙 Q 版厨师及竹凳餐桌辨识度稳定（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-02-started.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-02-started.png`）；`B-134` 落地后进店顾客改为极简金色小圆点，不再出现硕大 `…` 气泡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-30-cards.png`）。扣分项：竖屏绿檐上方仍露出越界木地板与穿檐扎染布幔（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-02-started.png`）；横屏上排三张餐桌与 1 号桌顾客头部被视口顶缘裁切（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-09-angry-left.png`）；烤炉上的串体仅数像素，静帧仍读不出熟色金黄、焦黑与金/灰烟效（`B-045`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-05-grill.png`）；竖屏 4 张大卡片向下堆叠，直接盖住 2 号桌及顾客主体（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`）。 |
| ② 灯光有没有 Saltline 味道（暖光池/炭火点光/雾/明暗层次） | 3.2 | 竖屏两盏可见暖铜吊灯的半透明光锥、餐桌暖光池与炭火烤炉向台前木地板投射的橙暖湿反层次清晰，夜间小摊明暗对比成立（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-02-started.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-08-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-34-burnt.png`）。扣分项：横屏吊灯本体全部出画，仅余桌面浅光斑，烤网前沿高光偏白压弱烤串轮廓（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-02-started.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-05-grill.png`）；静帧难察觉 `FogExp2` 远景雾层次；竖屏底部纯暗控制带生硬截断烤炉下方的地板暖光（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-02-started.png`）。 |
| ③ HUD 是否整齐（对齐/字号/不重叠/不挡操作） | 2.6 | 正向项：首屏 `menu` 态 `#bbq-stick / #bbq-act / #bbq-orders` 均 `display:none`，开店后双端摇杆（竖 `130×130 @(22,692)`、横 `112×112 @(16,262)`）、动作键（`84×84`，竖 `@(280,730)`、横 `@(734,290)`）、顶栏（`315×36`，竖 `@(37,8)`、横 `@(264,8)`）三者两两重叠面积为 `0`，单张订单卡（竖 `243×68 @(137,60)`、横 `221×64 @(613,150)`）内无横向溢出且右侧 `56×56` 主按钮清晰（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`）。扣分项：① 竖屏 4 张订单卡出现 `217` 与 `243` 两种宽度，左边缘参差不齐，且首卡与顶栏仅剩 `16px` 余量、底卡压住 2 号桌（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-30-cards.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`）；② 红色飘字 `夹生 · 重烤` 直接压在 3 号卡文案与 `上炉` 按钮上，烤炉徽章 `已熟 ✓` / `烤制中 6s` 直接遮挡 `豆泥米线` 世界气泡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`）；③ 横屏摇杆 `112×112 @(16,262)` 持续盖住垃圾桶与五花肉料箱（`B-093`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-02-started.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-07-served.png`）；④ 首屏与结算态 `.topbar` 仍在模糊背景后透出（`B-133`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`）；⑤ 结算唯一按钮 `再 开 一 局` 仅 `150×40`（低于 `44px` 触控底线，`B-140`）。 |
| ④ 有没有明显缺陷（穿模/悬空/贴图错误/文字溢出/错位） | 2.4 | 双端 `pageerror + console.error = 0`，料箱 12 次快速连点手上仍仅 1 件、无物品复制，新一键链路完整跑通（`money 0→62`、`served=1`、提早起锅回 `idle`、13s 焦糊 `waste=1 angry=1`）。严重扣分：① 两项 P0 级工程与发布事故——本机构建来自未提交脏树导致 `__build` commit 号不可信，公网 `openfolio.uk/bbq/` 仍为 2026-11-21 旧包（`B-081`）；② 新旧双链路并存且状态脱节：卡片倒计时写 `生串 4s` 时烤炉世界徽章同时写 `烤制中 6s`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`），手动切配烤熟时订单卡仍卡在 `¥48 · 等待 / 上炉`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-05-chop-done.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-05-grill.png`）；③ `夹生 · 重烤` 飘字盖卡、`.gb` 压 `豆泥米线` 气泡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`）；④ 横屏愤怒离店后顶栏「评级」处文本节点为空（仅读到“评级”二字、无 `★` 字符）；⑤ 控制台固定 2 条 Three.js 弃用告警（`THREE.Clock`、`PCFSoftShadowMap`）。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 2.3 | 订单卡新按钮 `上炉 → 生串 4s / 完美 3s（起锅）→ 已上` 本身直觉性强（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`），但整套引导互相打架：① 首屏副标题仍在教已废弃的「取料 → 切配 → 炭烤 → 装盘 → 上菜」（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-01-title.png`）；② 开局后地面大黄箭头指向料箱、右下角动作键喊着 `去料箱取料` / `去烤炉`，右上角卡片同时喊着 `上炉`，新玩家无从判断该跑图还是点卡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`）；③ 卡片 `生串 4s` 与烤炉 `烤制中 6s` 两个倒计时自相矛盾（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`）；④ 顶栏仍缺目标额（`B-125`）、结算 `★☆☆` 缺星级归因（`B-136`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`）。 |
| 操作手感 | 3.2 | 新订单卡一键循环大幅压缩操作负担：原本一道菜需 **10 次点按 + 4 段走位**（取料 1 + 切配 5 + 烤制取串 2 + 装盘 1 + 上菜 1），现改为右上角 `56×56` 圆形按钮 **2 次点击**（上炉→起锅）即可收款 `+¥62`，单手拇指友好且料箱 12 连点无复制 bug（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`）。扣分在于：未删除的摇杆与动作键仍白白占据竖屏底部大片操控区（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`），`夹生 · 重烤` 飘字压住 3 号卡按钮干扰连续操作（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`），结算唯一按钮 `再 开 一 局` 仅 `150×40` 低于 `44px` 触控底线（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`）。 |
| 正反馈（爽感） | 2.7 | 相比第 28 轮略有进步：`完美 3s` 阶段订单卡按钮外圈亮起连续推进的金色环形进度条（55.83%），起锅瞬间结算 `money 0→62`（¥48 + ¥14 小费）、弹 `+¥62` 飘字且卡按钮转绿勾 `已上`；早起锅弹 `夹生 · 重烤`、超时 13s 弹醒目红底 `焦糊了`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-08-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-34-burnt.png`）。扣分项：全作仍无任何音频反馈（`B-066`）、烤串熟/焦缺乏可见 3D 外观与烟效变化（`B-045`）、`+¥14` 小费未拆解（`B-136`）、愤怒离店（`angry 0→1`）后顶栏星级无可见反馈且文本为空（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-09-angry-left.png`）。 |

### 我能做的（Capability）
- **订单卡一键循环主体已可真实跑通**：在竖屏真实鼠标点击订单卡右侧 `56×56` 主按钮 `上炉`（ARIA `上炉`），1 次点击即占烤位 1、进入 `cookWindow=raw`（文案 `生串 4s` / 按钮 `起锅` / 环形进度 `1.67%`）；`t=3.2s` 更新至 `生串 1s`；`t=6.7s` 进入 `perfect`（文案 `完美 3s`、金色进度环 `55.83%`、烤位 `cooked`）；再点 1 次即完成上菜收款（`money 0→62`、`served=1`、按钮切绿勾 `已上` 并 `disabled`）。`t=1.7s` 提早起锅弹出 `夹生 · 重烤`、钱不变、卡退回 `idle`（夹生不罚）；放任 `13s` 触发 `焦糊了`、`waste=1 angry=1`、卡片移除（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-34-burnt.png`）。
- **双端基础 HUD 无重叠且运行时零报错**：首屏 `menu` 态 `#bbq-stick / #bbq-act / #bbq-orders` 均 `display:none`；开店后竖屏摇杆 `130×130 @(22,692)`、动作键 `84×84 @(280,730)`、顶栏 `315×36 @(37,8)` 两两重叠 `0` 且无 `<44px` 局内可点元素；横屏摇杆 `112×112 @(16,262)`、动作键 `84×84 @(734,290)`、顶栏 `315×36 @(264,8)`、订单卡 `221×64 @(613,150)` 重叠均为 `0` 且无横向溢出；料箱处 12 次快速连点不复制物品、不增 `waste`；双端全程 `pageerror + console.error = 0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`）。
- **老链路及打烊结算完整闭合**：旧流程取料 1 → 切配 5 → 烤制 2 → 装盘 1 → 上菜 1（共 10 次点按 + 4 段走位）仍可正常产出 `money 0→62`、飘字 `+¥62` 与顾客转 `eating`；未达标打烊结算正确展示 `离目标还差 ¥118 / 营业额 ¥62 / ¥180 / 服务顾客 1 位 / 愤怒离店 1 位（竖屏局为 0 位） / 废料 0 份`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-05-chop-done.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-08-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-07-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`）。

### 我看不懂的（Clarity）
1. **首屏写着「取料 → 切配 → 炭烤 → 装盘 → 上菜」，进店后到底该走去料箱，还是直接点右上角「上炉」？** 首屏还在教 5 步走位流程，开店后地面黄箭头指向五花肉料箱、右下角按钮喊 `去料箱取料`，但右上角卡片直接给了 `上炉` 一键按钮，且两套操作互不联动——手动切完放炉烤熟了，订单卡仍写着 `等待 / 上炉`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-05-chop-done.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-05-grill.png`）。
2. **同一根串刚点「上炉」，为什么卡片写「生串 4s」，下面烤炉条却写「烤制中 6s」？** 新卡片按 `§1` 4s 进完美窗口倒计时，旧烤炉徽章 `.gb` 仍按老 `6s` 熟度倒计时，屏幕上同时出现两个互不相干的秒表，玩家完全不知道该看哪一个（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`）。
3. **顾客已经愤怒离店（`angry 0→1`），为什么顶栏「评级」在 DOM 里读不出任何星星字符、画面上也看不出评级变化？** 横屏耐心归零后顾客转 `leaving-angry`、`angry 0→1`，实测顶栏「评级」处文本节点为空（仅读到“评级”二字，无 `★` 字符），且视觉上 `land-09-angry-left.png` 与上菜后 `land-07-served.png` 均为 1 亮 2 暗图标星，没有扣分/警示联动，与 `port-10-angry-left.png` 一样缺乏清晰评级反馈；结算面板同样缺少 `★☆☆` 的成因说明（`B-136`）。
4. **线上运行的到底对应哪一版代码？** 本机 `window.__build` 报 `05afe9b-202611220449`，但 git `05afe9b` 里根本没有 `.card-btn`，意味着任何线上问题和回归验证都无法按 commit 复现。

### 让我不爽的（Friction）
- **半成品双系统并存造成的视觉轰炸与操作干扰**：竖屏 4 张大卡加上未删的底栏摇杆/动作键把中间场景挤得很局促——4 张卡宽窄不一（`217` vs `243`）左缘参差，直接盖住 2 号桌与顾客；提早起锅弹出的 `夹生 · 重烤` 大字正压在 3 号卡的 `上炉` 按钮与价格上；烤炉 `.gb` 徽章 `已熟 ✓` / `烤制中 6s` 又压住 `豆泥米线` 世界气泡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`）。
- **老链路与公网拖后腿**：走老链路一道菜仍要 10 次点按 + 4 段走位；横屏摇杆继续死死压住垃圾桶与五花肉料箱（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-02-started.png`）；公网玩家至今连本机过去一周的修复和改动都看不到，仍然停在 2026-11-21 的旧包（`B-081`）。
- **结算按钮偏矮且模态透出顶栏**：未达标结算唯一按钮 `再 开 一 局` 仅 `150×40`，高度低于移动端 `44px` 触控底线且保留人工空格；首屏与结算态模糊背景后仍隐约透出 `.topbar`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`）。

### 让我想继续玩的（Hook）
- **「上炉 → 盯环 → 起锅」两步循环的方向已验证好玩**：从 10 次繁琐跑图点按压成 2 次时机决策后，节奏立刻从“搬砖”变成“控火排队”；`生串 4s → 完美 3s` 配合 56×56 圆形按钮外圈的金色进度环，一眼能读出起锅时机，单手竖屏连点收款 `+¥62` 的爽感明显高于旧玩法（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`）。只要把未提交代码规范入库、彻底删掉旧工位干扰、补齐偏老预警和音效，这款游戏的竖屏单手体验就能跨上一个台阶。

### P0 阻塞（不修没法玩）
1) **本机线上构建来自未提交 dirty working tree，`__build` commit 号与实际产物不符（构建溯源失效）**
   - 现象：本机 `http://127.0.0.1:3035/` 运行 `assets/index-uMHCucrV.js`，`window.__build` 声明为 `"05afe9b-202611220449"`，但源码 HEAD `05afe9b` 中并不存在 `.card-btn`，而运行中的 bundle 已包含 `56×56` `上炉/起锅` 订单卡按钮。线上跑的是未提交半成品，commit 号不可信，导致走查、回滚与线上排障全部失锚。
   - 复现步骤：在仓库执行对 `05afe9b` 的源码检查（无 `.card-btn`），同时打开 `http://127.0.0.1:3035/` 读取 `window.__build` 与入口 JS，在顾客就座后查询 `.card-btn`（命中 `56×56` 按钮）。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`（均展示 HEAD `05afe9b` 中不存在的 `.card-btn`）。
   - **验收标准**：构建与部署脚本强制校验 `git status --porcelain` 为空（dirty tree 直接以非 0 退出码拒绝部署，禁止生成无对应 commit 的线上包）；部署后 `GET http://127.0.0.1:3035/api/health` 返回 JSON 含 `commit`（40 位或短 hash，与 `git rev-parse HEAD` 一致）、`clean: true`、`entry`（如 `assets/index-xxxx.js`）及 `bundleSha256`（与磁盘 `dist/<entry>` 实算 SHA-256 100% 相等）；浏览器 `window.__build` 前缀等于 `/api/health` 的 `commit`；基于该 commit 在干净克隆中重新 `npm run build` 产出的核心功能与 DOM 结构（含 `.card-btn`）与线上完全一致。
2) **公网 `https://openfolio.uk/bbq/` 仍停留在 2026-11-21 旧包（沿用 `B-081`）**
   - 现象：公网入口仍返回 `assets/index-BklOlgyL.js`（内嵌 `__build="2290acb-202611210547"`，2026-11-21 05:47），大幅落后本机 `http://127.0.0.1:3035/`，近期修复（含 `B-121`、`B-126`、`B-134` 及新玩法改动）均未触达公网玩家。
   - 复现步骤：请求 `https://openfolio.uk/bbq/` 提取入口 `<script>` 文件名并拉取 JS 内容读取内嵌 `__build`，与本机 `http://127.0.0.1:3035/` 比对。
   - 截图路径：本轮 19 张截图均采自本机 `05afe9b-202611220449`（如 `/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`），公网仍为旧包无法复现。
   - **验收标准**：合法 clean-tree 提交并部署完成后 60s 内，`https://openfolio.uk/bbq/` 返回的入口 JS 文件名、内嵌 `window.__build` 与本机 `127.0.0.1:3035` 及 `/api/health` 的 `commit` / `bundleSha256` 100% 一致；对公网 URL 跑竖屏 `390×844` 与横屏 `844×390` 冒烟，连跑 3 次 `0` JS error。另需恢复公网可用性：`GET https://openfolio.uk/bbq/` 必须返回 200（当前 502），且同域 `/transport/` 一并恢复，说明上游通路（反代→本机 3035/3028）由哪个进程承载、并纳入探活告警。

### P1 明显缺陷
1) **首屏副标题仍为废弃五步流程文案，与 `GAME-DESIGN §0` 玩法定调直接冲突**
   - 现象：竖屏与横屏首屏面板副标题均仍显示「取料 → 切配 → 炭烤 → 装盘 → 上菜」，而 `GAME-DESIGN §0/§1` 已定调为「一条订单卡 = 两次点击（上炉 / 起锅）」并删除切配/装盘/料箱走动，新玩家开店第一眼学到的就是错误流程。
   - 复现步骤：在 `390×844` 与 `844×390` 打开首屏（`phase === 'menu'`），读取首屏卡片正文文本并截屏。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-01-title.png`
   - **验收标准**：双端首屏面板 `textContent` 不再包含 `取料`、`切配`、`装盘` 任一废弃词，改为清晰传达新核心循环（如「点订单卡上炉 → 盯准金色完美窗起锅上菜」或「上炉 → 控火 → 起锅收款」），且整张卡片在 `390×844` 与 `844×390` 无横向溢出（`scrollWidth <= clientWidth`）、上下均留在视口内；双端 0 JS error。
2) **新旧两套玩法并存且状态与倒计时互相冲突，违背 `GAME-DESIGN §0`「删除多步骤工位」要求**
   - 现象：订单卡一键循环（`上炉`/`起锅`）已上线，但旧 10 次点按 + 4 段走位链路仍完整保留——左下摇杆、右下动作键仍喊「去料箱取料 / 去烤炉」、地面黄箭头仍指向料箱与烤炉、烤炉仍弹出旧世界徽章 `.gb`。更严重的是两套系统互不同步：点卡上炉后卡片写 `生串 4s`，烤炉徽章同时写 `烤制中 6s`（双秒表冲突）；走旧链路手动切好上炉烤熟（`已熟 ✓`）时，右上角订单卡仍停在 `¥48 · 等待 / 上炉`。
   - 复现步骤：① 竖屏点 1 号订单卡 `上炉`，对比卡片文案与烤炉 `.gb` 文案；② 竖屏/横屏按旧链路取料→切配→放烤炉至 `已熟 ✓`，同时查看右上角订单卡状态与右下角动作键文案。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-05-chop-done.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-31-card-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-03-customer.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-05-grill.png`
   - **验收标准**：按 `GAME-DESIGN §0/§1` 彻底移除旧交互链路——局内不再渲染或启用虚拟摇杆 `#bbq-stick`、右下动作键 `#bbq-act`、旧料箱/切配/装盘引导箭头及独立 `6s` 倒计时的旧 `.gb` 徽章（全部以订单卡单源计时为准，或若保留烤炉位视觉指示，必须与订单卡 `cookWindow` 及剩余秒数误差 `<= 0.1s` 且不出现 `4s` vs `6s` 冲突）；一道菜完整闭环仅需 2 次点击订单卡主按钮；连跑 3 次双端 0 JS error。
3) **竖屏飘字与世界烤炉徽章直接压住订单卡按钮和顾客气泡，4 张订单卡遮挡餐区**
   - 现象：提早起锅（`t=1.7s`）弹出的红色飘字 `夹生 · 重烤` 直接覆盖 3 号订单卡（`豆泥米线`）的价格/状态与 `上炉` 按钮；烤炉世界徽章 `已熟 ✓` / `烤制中 6s` 直接压住 `豆泥米线` 世界气泡；同时存在 4 张订单卡时，卡片列向下延伸覆盖 2 号餐桌与顾客身体。
   - 复现步骤：竖屏 `390×844` 坐满 4 位顾客，将 1 号卡烤至 `完美 3s`、2 号卡上炉后于 `t=1.7s` 提早起锅，检查 `#bbq-popups .popup`、`#bbq-grillbars .gb` 与 `#bbq-orders .card`、`#bbq-bubbles .bubble` 的包围盒交叠。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`
   - **验收标准**：竖屏 4 客同屏及提早起锅/焦糊触发帧，断言 `#bbq-popups .popup` 与所有 `#bbq-orders .card` 交叠面积 `=== 0`；任何可见烤位标注与所有 `#bbq-bubbles .bubble` 交叠面积 `=== 0`；`#bbq-orders` 在竖屏下采用不遮挡核心餐区的紧凑排布（或按 `ART-DIRECTION §5` 严格控高/分栏，同时 `B-138` 开启 4 客时也能完整操作 4 张卡不互相遮挡）；双端 0 JS error。
4) **顶栏「评级」在顾客愤怒离店后文本为空，且未达标结算唯一按钮 `150×40` 低于 44px 触控底线（衔接 `B-140`）**
   - 现象：横屏耐心归零后顾客转 `leaving-angry`、`angry 0→1`，顶栏「评级」处 DOM 文本为空（仅读到“评级”二字、无 `★` 字符），且 `land-09-angry-left.png` 与 `land-07-served.png` 视觉星级无变化、缺乏愤怒扣评反馈；未达标结算面板唯一按钮 `再 开 一 局` 尺寸仅 `150×40`（低于移动端 `44px` 触控底线，沿用 `B-140` 未修）。
   - 复现步骤：横屏 `844×390` 上完 1 单后令 1 位顾客耐心归零触发 `leaving-angry`，读取顶栏评级区域文本与 `data-stars`；再推进至打烊结算，读取 `再 开 一 局` 按钮 `getBoundingClientRect()`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-09-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/land-10-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`
   - **验收标准**：顶栏评级节点在任意局内状态（含 `angry >= 1`）均显式输出可读文本或等价无障碍标注（如 `★☆☆` / `aria-label="当前评级 1 星"` 且 `data-stars` 与 `calcStars()` 100% 一致），愤怒离店时触发可见扣评/警示动效；结算面板所有可见按钮 `rect.height >= 44` 且去除汉字间人工空格；双端 0 JS error。

### P2 打磨项
1. **四张订单卡宽度不统一（`217px` vs `243px`）且首卡与顶栏仅留 16px 余量**：因卡片未设固定宽度、随菜名字数（`烤菌子` 3 字 vs `烤五花肉拼盘` 6 字）自适应伸缩，竖屏多卡右对齐时左边缘参差不齐，且首卡 `top=60` 距顶栏底边 `44` 仅 `16px`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-30-cards.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-32-card-perfect.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-33-slots-full.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-34-burnt.png`）。
2. **既有未闭环体验项同框复现（沿用原编号追踪）**：首屏与结算态 `.topbar` 仍在模糊背景后透出（`B-133`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T04-39Z-r29/port-12-results.png`、`land-01-title.png`、`land-10-results.png`）；局内顶栏仍缺本关目标额（`B-125`）；结算缺星级归因与小费拆解（`B-136`）；第 2 关仍无玩法差异化（`B-138`）；横屏摇杆遮盖垃圾桶与五花肉料箱（`B-093`，下线摇杆后可自然消解）；全作静音（`B-066`）；烤串熟/焦 3D 可辨度与烟效不足（`B-045`）；竖屏绿檐上方仍露越界木地板与穿檐扎染布幔（`port-02-started.png`）。
3. **控制台 2 条 Three.js 弃用告警持续存在（沿用 `B-006`）**：双端每局固定输出 `THREE.Clock` deprecated 与 `PCFSoftShadowMap` 已移除改用 `PCFShadowMap` 两条 warning，建议迁移至 `THREE.Timer` 与 `PCFShadowMap`。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN §0（玩法方向：一条订单卡 = 两次点击、竖屏单手可玩、禁止多步骤工位）`**：线上脏树半成品虽已做出订单卡 `56×56` `上炉/起锅` 按钮，但并未删除摇杆、动作键与切配/装盘/料箱走位，且首屏副标题仍在宣传已废弃的 5 步流程；必须彻底做减法，让玩家只面对订单卡与烤位决策。
- **`GAME-DESIGN §1（核心循环：0–4s 夹生退款 / 4–9s 完美 / 9–12s 偏老 / >12s 焦糊扣钱 + 废料）`**：实测 `t=1.7s` 提早起锅回 `idle` 不扣钱、`t=6.7s` 进 `perfect` 起锅收 `¥62`，与条款基本吻合；但实测 `13s` 焦糊表现为 `waste=1 angry=1` + 移卡、未扣钱，且烤炉世界徽章仍在用旧 `6s` 计时与卡片 `4s` 计时打架，同时 `9–12s 偏老（小费 50%）` 窗口尚未在走查态与卡片视觉中独立闭环（衔接 `B-137`）。此外 `GAME-DESIGN §5/§6` 仍残留旧摇杆与单键条款，文档内部存在漂移需同步清理。
- **`GAME-DESIGN §4（评分：局内顶栏评级与结算面板共用同一计算函数并保持一致）`**：横屏顾客愤怒离店（`angry 0→1`）后顶栏「评级」DOM 文本为空（仅“评级”二字、无 `★`），视觉上也未反映负面反馈，未达成局内与结算一致的可读评级体验。
- **`ART-DIRECTION §1（地面永落 12×9m 世界、横屏工作站完整可见）`**：竖屏绿檐外持续露出越界木地板与穿檐布幔（`port-02-started.png`）；横屏摇杆仍压住垃圾桶与五花肉箱（`land-02-started.png`，移除摇杆后可解决），上排餐桌顶缘仍被裁切（`land-03-customer.png`）。
- **`ART-DIRECTION §5（UI 皮肤：订单卡右上竖排 ≤3 张、横屏 max-width 168px、HUD ≥13px）`**：新订单卡因内嵌 `56×56` 按钮，实测竖屏宽 `217/243×68`、横屏宽 `221×64`，且竖屏 4 客同屏叠出 4 张卡下压 2 号桌，超出原 `≤3 张` 与横屏 `168px` 规格；需随新玩法修订 `ART-DIRECTION §5` 卡片宽度/排布定稿，并统一固定等宽与按钮最小 `44px` 高度。

## 2026-11-22 03:08Z 第 28 轮

本轮走查时间 `2026-11-22 03:08Z–04:05Z`，覆盖剧本 ② 移动（摇杆真实拖动/键盘/碰撞）、③ 切配、④ 烤炉熟度与焦糊、⑦ 通关结算→下一关、⑩ 控制台。被测构建为本机 `http://127.0.0.1:3035/` 冻结快照 `window.__build = "7116bbf-202611220228"`（入口 `assets/index-CDf6asvG.js`），视口为竖屏 `390×844` / 横屏 `844×390`、`deviceScaleFactor=1`、SwiftShader 软渲染、`hasTouch=true`，通过 `window.__test`（真实指针拖摇杆 + 真实键盘 + 确定性 `tick()` 推进 + 冻结 `performance.now` 后截帧）采样，8 次脚本运行（竖屏×4、横屏×4）`pageerror + console.error = 0`（另有 2 条 Three.js 弃用 warning）。公网 `https://openfolio.uk/bbq/` 实测入口仍为 `assets/index-BklOlgyL.js`（内嵌 `__build="2290acb-202611210547"`，2026-11-21 05:47 旧包，唯一 P0 `B-081`），**本轮全部结论与 20 张截图只适用于本机 `7116bbf-202611220228`**。

> **设计变更说明（本轮测后发生）**：走查用的是 `7116bbf-202611220228`（旧玩法：取料→切配→炭烤→装盘→上菜）。本轮结束后仓库新增 `bf34db5 docs(design): 玩法简化`，`GAME-DESIGN §0/§1` 已改为「一条订单卡 = 两次点击（上炉 / 起锅）」的移动端一键循环，并明确删除切配台、装盘台、料箱走动（旧条款保留为「已废弃」）。因此本轮 ③ 切配、② 料箱走位相关的观察只作为旧构建的证据存档，**不再作为需求排期**；④ 烤炉判定窗口与 ⑦ 关卡内容两类结论在新设计下反而更关键，按新 `§1` 口径（0–4s 夹生 / 4–9s 完美 / 9–12s 偏老 / >12s 焦糊）重述。

综合评分：3.0/5（比上轮 3.0 ±0.0）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视/格子感/高饱和食材/Q 版角色） | 3.1 | 正交俯视木地板拼缝、一字型 1m 模块厨房台面、五花肉/菌子/米线三只高饱和实物料箱与斗方挂牌、白帽红围裙 Q 版厨师辨识度稳固（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`）；扣分在烤炉上的串仅数像素且被烤网反光吞没、静帧读不出 `t=6.5s` 金黄熟色与 `t=12.5s` 焦黑及烟效（`B-045`，`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/land-37-grill-t12.png`），切配台仅有 1→3 道静态刀痕而菜刀与生串无跳切变化（`B-129`，`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`），竖屏绿檐外仍露越界木地板与穿檐扎染布幔，且第 2 关场景与第 1 关视觉完全同质（`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`）。 |
| ② 灯光有没有 Saltline 味道（暖光池/炭火点光/雾/明暗层次） | 3.2 | 竖屏 3 盏暖铜吊灯体积光锥、桌面暖光池与炭火炉向台前木地板投射的橙暖湿反层次分明，焦糊态炉前与胸口浮标叠出暗红警示光强化氛围（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`）；扣分在横屏吊灯本体出画仅剩桌面浅光斑、烤网前沿高光过白进一步遮没烤串轮廓（`e2e/review/2026-11-22T03-08Z-r28/land-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/land-41-grill-t108-warn.png`），静态帧读不出 `FogExp2` 远景雾效，且竖屏底部纯暗控制带生硬截断下方木地板暖光（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`）。 |
| ③ HUD 是否整齐（对齐/字号/不重叠/不挡操作） | 2.8 | 烤炉世界徽章 `.gb` `76×34`（竖屏 `@(110,456)`、横屏 `@(419,216)`）与顶栏/订单卡交叠为 `0`，熟/警告/焦三态与 `B-121` 红色 `取焦串` 动作键区分醒目，`B-126` 模态态干净隐藏触控层与订单卡（`e2e/review/2026-11-22T03-08Z-r28/port-01-title.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`）；扣分在竖屏切配徽章 `.cb` `80×35 @(136,462)` 正压厨师头部仅露帽尖（`B-112`，`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`），横屏摇杆 `112×112 @(16,262)` 全程压住垃圾桶与五花肉料箱（`B-093`，`e2e/review/2026-11-22T03-08Z-r28/land-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-32-chop-1of3.png`），首屏与结算态 `.topbar` 仍在模糊背景后透出（`B-133`，`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-01-title.png`），结算主按钮 `150×45` 与次按钮 `150×40` 高度差 `5px` 且次按钮低于 44px 触控底线，竖屏离屏指引胶囊 `← 料箱` 直接悬在台面左端、只有方向没有距离（`e2e/review/2026-11-22T03-08Z-r28/port-30-counter-press.png`）。 |
| ④ 有没有明显缺陷（穿模/悬空/贴图错误/文字溢出/错位） | 2.9 | 双端 8 轮运行 `pageerror + console.error = 0`，移动速度精确 `3.2 m/s`、8px 摇杆死区与台面碰撞/沿边滑行无穿模无卡死、结算切第 2 关链路闭环（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/port-30-counter-press.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`）；扣分在公网停旧包（`B-081` P0）、烤炉 `t=3.0s` 显示 `烤制中 4s`（`Math.ceil` 浮点边界 off-by-one）、`t=6s→10s` 满条「已熟 ✓」静默隐藏焦糊倒计时且 `t=10.9s` 警告条仍满 100%（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`）、`.gb` 下缘仍并存世界空间进度指示（既有 `B-111`）（`e2e/review/2026-11-22T03-08Z-r28/land-35-grill-t6.png`）、竖屏 `.cb` 盖头（`B-112`）、横屏摇杆遮箱（`B-093`）及 2 条 Three.js 弃用 warning。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 2.8 | 切配 `0/3→1/3→2/3→已切好 ✓` 与烤炉 `烤制中→已熟 ✓→快焦了 2s→焦了 ✗` 状态文案清晰，焦糊态动作键切红环 `取焦串`、取下切 `去垃圾桶丢掉` 指向明确（`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`）；但 `t=6.5s` 至 `t=8.5s` 满条「已熟 ✓」零剩余安全时间提示、直到最后 2 秒才突然报警（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`），结算 `¥240 / ¥180` 却仅 `1★` 无归因说明（`B-136`，`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`），局内顶栏仍缺目标额（`B-125`，`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`）。 |
| 操作手感 | 3.1 | 键盘与摇杆真实拖动均稳跑 `3.2 m/s`，3px 微推 0 位移（8px 死区有效），贴台面推至 `z=2.1533` 阻挡可靠且侧向沿台滑行 `x: 0→4.8` 顺滑不卡死（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-30-counter-press.png`）；扣分在切配一串需「1 放 + 3 切 + 1 取」共 5 次点按且无跳切动效（`B-129`）、贴台被挡零撞击反馈（`B-119`）、横屏摇杆覆盖垃圾桶/五花肉箱干扰落指（`B-093`）、结算次按钮 `150×40` 低于 44px 触控底线（`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`）。 |
| 正反馈（爽感） | 2.5 | `已切好 ✓` 绿边、烤焦红环 `取焦串` 三重警示与达标结算直进第 2 关链路顺畅（`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`）；但全作静音无烤熟「叮」与切配刀声（`B-066`）、烤串熟/焦无明显色变与金/灰烟效（`B-045`）、切配无进度环与跳切反馈（`B-129`）、且第 2 关除了目标 +¥80 外零新菜/新机制，全部通关后仅剩 `再 开 一 局` 缺乏成就延续感。 |

### 我能做的（Capability）
- **② 双端移动、摇杆死区与台面碰撞滑行稳定精确**：键盘 `D`/`W` 按住 500ms 实测 `x: -2.5 → -0.90`（`3.2 m/s`，严格对齐 `GAME-DESIGN §6`）；竖屏摇杆 `130×130 @(22,692)`（nub `56px`，拖动 `transform: translate(-39.598px,-39.598px)`）与横屏摇杆 `112×112 @(16,262)` 均可真实拖动并被世界边界稳定夹紧在 `(-5.67,-4.17)`；3px 微推位移为 `0`（8px 死区有效）；从 `(0,0.5)` 向 `+z` 推 1.5s 止步于 `z=2.1533`（未穿台），随即侧向推 1.5s 顺滑沿台移至 `x=4.8`、后退回 `z=-2.6467` 无卡死（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/port-30-counter-press.png`、`e2e/review/2026-11-22T03-08Z-r28/land-30-counter-press.png`）。
- **③ 切配状态推进与刀痕计数准确闭环**：料箱取 `raw` → 首按放上砧板（`切配 0/3`）→ 连续 3 次点按 `.cb-fill` 线性推进 `0% → 33.33%（21.33px）→ 66.67%（42.66px）→ 100%（64px）`，文案准确切换 `0/3 → 1/3 → 2/3 → 已切好 ✓` 并切换 `.cb.done` 绿边、台面刀痕递增至 3 道；第 5 次点按取回 `pork/chopped`，动作键同步切为「去烤炉」（`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`、`e2e/review/2026-11-22T03-08Z-r28/land-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/land-33-chop-done.png`）。
- **④ 烤炉熟/警告/焦三态状态机与焦串动作键联动完整**：上炉后动作键锁定「烤制中…」，世界徽章 `.gb` `76×34`（竖屏 `@(110,456)`、横屏 `@(419,216)`）与顶栏/订单卡交叠 `0`；冻结时钟验证 `t=6.5s` 进 `gb done` 金色 `#f0c060`「已熟 ✓」、`t=10.9s` 进 `gb warn` 橙色 `#ff7a1a`「快焦了 2s」+ 1s 脉冲、`t=11.9s`「快焦了 1s」、`t=12.5s` 进 `gb burnt`「焦了 ✗」且动作键切红环警示「取焦串」，取下后正确指引「去垃圾桶丢掉」（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/land-37-grill-t12.png`）。
- **⑦ 达标结算→第 2 关切换闭环无死路且 8 轮 0 报错**：达标结算（`¥240 / ¥180`）面板 `212×328` 展示清晰，点击 `进入第 2 关` 后即时切回 `phase=playing`、`level=2`、`levelTarget=260`、`money=0`、`timeLeft=180`，顶栏刷新为 `第 2 关 | ¥0 | 3:00` 且可正常取料 `pork/raw`；双端 6 次脚本全程 `pageerror + console.error = 0`（`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`）。

### 我看不懂的（Clarity）
1. **烤串进度条都满格写着「已熟 ✓」了，怎么知道它还能在炉上放几秒才会焦？** 实测 `t=6.5s` 到 `t=8.5s`（离焦糊只剩 3.5s）全程保持金色满条 `已熟 ✓`、零焦糊倒计时，直到 `t=10.9s` 仅剩最后 2 秒才突然闪橙色「快焦了 2s」，且警告态进度条依然是满格，玩家根本无法提前规划取串顺序（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/land-35-grill-t6.png`）。
2. **刚烤了 3.0 秒，总时间不是 6 秒吗，为什么倒计时还显示「烤制中 4s」？** 冻结时钟在 `t=3.0s` 时内部浮点累积为 `2.9999`，经 `Math.ceil` 取整后跳成 `4s`，倒计时体感比实际慢了一拍。
3. **营业额 `¥240 / ¥180` 达标、零愤怒、零废料，为什么结算只给我 1 颗星？** 本局因 `served=0` 触发上限锁 `1★`，但结算面板只亮绿字「目标达成，进入第 2 关」与 `★☆☆`、零归因文案（沿用 `B-136`，`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`）。
4. **进到「第 2 关」后，除了左上角数字变成 2，菜单、厨房、顾客和第 1 关到底有什么区别？** 第 2 关场地、三道菜品、顾客模型与 180s 时长完全不变，仅后台目标额 `+¥80` 到 `¥260`（且顶栏还没显示目标额，沿用 `B-125`），进新关毫无新鲜感（`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`）。
5. **把串切完 3 刀显示「已切好 ✓」了，为什么还要再点第 5 下才能拿走？** 放上砧板（1）+ 切三刀（3）+ 取回（1）共 5 次点按，且完成与取回拆分，新手容易以为切完已经拿到手直接走开（`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`、`e2e/review/2026-11-22T03-08Z-r28/land-33-chop-done.png`）。

### 让我不爽的（Friction）
- **烤熟到烤焦之间 6 秒盲烤 + 全作静音**：熟（6s）→ 焦（12s）中间 4 秒完全静默无进度消耗，最后 2 秒才报警，再叠加全作无任何音效（`B-066`）和烤串 3D 尺寸过小看不出金黄/焦黑与烟效（`B-045`），玩家稍微转身拿个料或端个盘就容易直接烧焦（`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`）。
- **竖屏切配徽章糊在厨师脸上、横屏摇杆直接压死料箱**：竖屏 `.cb` `80×35 @(136,462)` 直接遮住厨师头部（`B-112`），且切配只有 64×8 直线条、无进度环无刀切跳动（`B-129`）；横屏摇杆 `112×112 @(16,262)` 始终盖在垃圾桶和五花肉料箱上，挡住最常用的左端工位（`B-093`）（`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/land-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-32-chop-1of3.png`）。
- **撞台面毫无触感反馈，结算按钮还不齐整**：正面顶住厨房台面被挡住时角色静止、零弹跳零音效（`B-119`，`e2e/review/2026-11-22T03-08Z-r28/port-30-counter-press.png`、`e2e/review/2026-11-22T03-08Z-r28/land-30-counter-press.png`）；结算面板次按钮 `再 开 一 局` 仅 `150×40`（比主按钮 `150×45` 矮 5px 且不足 44px 触控底线），全通关后更是只剩 `再 开 一 局`，既不能回第 1 关也没法选关（`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`）。

### 让我想继续玩的（Hook）
- **移动操控与碰撞滑行手感扎实，核心状态机零报错**：摇杆死区、边界夹紧与沿台面侧向滑行（`z=2.1533`、`x: 0→4.8`）顺手不卡死，双端 8 轮测试 0 JS error，说明底层交互骨架可靠（`e2e/review/2026-11-22T03-08Z-r28/port-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-30-counter-press.png`）。
- **焦糊警示与切关流程已跑通，补齐节奏反馈后潜力足**：`B-121` 焦糊红环 + 警示三角 `取焦串` + `焦` 胸标三重提示辨识度高，达标结算可流畅推进至第 2 关并清退模态底层 HUD（`B-126`）；一旦补齐烤熟安全窗倒计时、音效与第 2 关差异化内容，3 分钟短局经营循环的紧张感与复玩动力会显著拉升（`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`）。

### P0 阻塞（不修没法玩）
1) **公网 `https://openfolio.uk/bbq/` 仍停留在旧包，与仓库最新构建不一致（沿用 `B-081`）**
   - 现象：公网入口返回 `assets/index-BklOlgyL.js`，内嵌 `window.__build = "2290acb-202611210547"`（2026-11-21 05:47 旧包），落后本机 `http://127.0.0.1:3035/` 的 `assets/index-CDf6asvG.js`（`window.__build = "7116bbf-202611220228"`）；近期已在本机落地的 `B-121`（焦糊警示按钮）与 `B-126`（模态隐藏 HUD）均未触达公网玩家，本轮所有走查结论只适用于本机 `7116bbf-202611220228`。
   - 复现步骤：请求 `https://openfolio.uk/bbq/` 提取入口 `<script>` 文件名，并拉取该 JS 读取内嵌 `__build` 字符串，与本机 `http://127.0.0.1:3035/` 的入口文件名及 `window.__build` 比对。
   - 截图路径：本轮 20 张截图均采自本机 `7116bbf-202611220228`（如 `e2e/review/2026-11-22T03-08Z-r28/port-01-title.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`，公网仍不可复现其中新特性）。
   - **验收标准**：部署完成后 60s 内，请求 `https://openfolio.uk/bbq/` 返回的入口 JS 文件名及浏览器 `window.__build` 与仓库最新 `dist` 100% 一致；对公网 URL 跑竖屏 `390×844` 与横屏 `844×390` 首屏 HUD 断言（`menu` 态 `#bbq-stick`/`#bbq-act`/`#bbq-orders` 隐藏，开店后 `#bbq-act` 为 `84×84`），连跑 3 次 `0` JS error。

### P1 明显缺陷
（注：第 3 条为旧玩法存档，不作需求；现行 P1 共 3 条，含 1 条公网旧包之外的烤炉窗口与关卡内容。）

1) **烤炉熟→焦存在 6 秒静默窗口，`.gb` 满条「已熟 ✓」隐藏剩余焦糊时间（沿用 `B-064` + 新开 `B-137`）**
   - 现象：烤串在 `t=6.5s` 变为金色满条（64px，100%）`已熟 ✓`，到 `t=8.5s`（距焦糊仅剩 3.5s）仍维持金色满条 `已熟 ✓`、零剩余安全时间提示；直到 `t=10.9s`（仅余最后 2s）才切为橙色 `快焦了 2s`，且 `.gb-fill` 仍停在 100% 满条不随焦糊进度变化，玩家在多工位切换时极易错过起串时机直接烧焦。
   - 复现步骤：双端将切好五花肉放上烤炉，冻结时钟并用 `__test.tick()` 分别推进至 `t=6.5s`、`t=8.5s`、`t=10.9s`、`t=12.5s`，读取 `.gb` 文案、class、`.gb-fill` 计算宽度与背景色并截帧。
   - 截图路径：`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/port-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/port-37-grill-t12.png`、`e2e/review/2026-11-22T03-08Z-r28/land-35-grill-t6.png`、`e2e/review/2026-11-22T03-08Z-r28/land-41-grill-t108-warn.png`、`e2e/review/2026-11-22T03-08Z-r28/land-37-grill-t12.png`
   - **验收标准**：`t ∈ [6.0, 12.0)` 期间 `.gb-fill` 切换为动态焦糊/安全窗倒计时条（如从 100% 递减至 0% 或红条由 0% 推进至 100%），`t=8.5s` 时 `.gb-fill` 宽度占条宽 ∈ `[35%, 65%]` 且 `.gb-txt` 显式展示剩余安全秒数（如 `已熟 · 剩 4s`）；`t=9.0s`（剩余 3s）起提前进入 `warn` 预警态；双端连跑 3 次 `0` JS error。
2) **第 2 关内容与第 1 关完全同质，且全部通关后无选关/重玩第 1 关入口（新开 `B-138`）**
   - 现象：第 1 关达标（`¥240 / ¥180`）点击 `进入第 2 关` 后，仅目标额由 `¥180` 提至 `¥260`（+¥80）、时长仍为 `180s`，场地布局、3 道菜品、4 张餐桌与顾客交互与第 1 关 100% 相同；第 2 关达标（`¥400 / ¥260`）后结算仅显示「全部关卡通关！」与单一 `再 开 一 局` 按钮，无返回第 1 关或选关入口。
   - 复现步骤：双端将第 1 关推进至 `money=240` 打烊，点击 `进入第 2 关` 检查场景、菜单、目标额与开局状态；再于第 2 关推进至 `money=400` 打烊检查结算面板按钮集合。
   - 截图路径：`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/port-10-level2.png`、`e2e/review/2026-11-22T03-08Z-r28/land-09-results-pass.png`、`e2e/review/2026-11-22T03-08Z-r28/land-10-level2.png`
   - **验收标准**：第 2 关开局具备可感知且可断言的差异化规则（如新增第 2 关专属高峰波次/缩短下单间隔与耐心系数，或在开局/顶栏展示本关新挑战提示并体现在 `state()` 参数中，不仅限于目标额变化）；第 2 关通关结算面板同时提供「重玩第 2 关」与「回到第 1 关」（或关卡切换按钮），点击回到第 1 关后 `state().level === 1 && levelTarget === 180`；双端连跑 3 次 `0` JS error。
3) **（存档，不作需求）切配台缺少 SVG 进度环与跳切动效，单串需 5 次点按（原 `B-129`）**：`bf34db5` 新设计已废弃切配工位，本条仅记录旧构建实测（`64×8` 线性条、`hasRing=false`、5 次点按），不再排期；替代需求见 `B-137` 的判定窗口可视化。
   - 现象：切配进度为 `64×8` 直线条 `.cb-fill`（`hasRing=false`），违背 `GAME-DESIGN §7`「台面上的串跳切 + 进度环」；从放下到取回需 5 次点击（1 放 + 3 切 + 1 取），切配全程台面菜刀与生串均静止无跳切反馈。
   - 复现步骤：双端持 `pork/raw` 至切配台连续触发 5 次动作键，在 `1/3`、`2/3`、`已切好 ✓` 帧检查 `#bbq-chop` DOM 是否含 SVG 进度环及台面菜刀/食材变换增量。
   - 截图路径：`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`、`e2e/review/2026-11-22T03-08Z-r28/land-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/land-33-chop-done.png`
   - **验收标准**：按 `B-129` 验收——`#bbq-chop svg circle[data-role="chop-ring"]` 存在且 `stroke-dashoffset` 随 `1/3 → 2/3 → 3/3` 严格递减至 0；每次点按后 60ms 内砧板菜刀或生串产生位移/旋转增量 `> 0.03`；双端连跑 3 次 `0` JS error。
4) **竖屏切配徽章 `.cb` 正压厨师头部，横屏摇杆覆盖垃圾桶与五花肉料箱（沿用 `B-112` / `B-093`，不重开新号）**
   - 现象：竖屏切配时 `.cb` `80×35 @(136,462)` 整块压在厨师头部仅露白帽尖（`B-112`）；横屏摇杆 `112×112 @(16,262)` 在移动、碰撞、切配、烤制全流程持续压住左下垃圾桶与五花肉料箱（`B-093`）。
   - 复现步骤：竖屏站切配台推进至 `1/3` 与 `已切好 ✓`，读取 `.cb` 矩形与厨师头部投影坐标；横屏在出生点与各工位读取 `#bbq-stick` 与垃圾桶/五花肉料箱投影矩形。
   - 截图路径：`e2e/review/2026-11-22T03-08Z-r28/port-32-chop-1of3.png`、`e2e/review/2026-11-22T03-08Z-r28/port-33-chop-done.png`、`e2e/review/2026-11-22T03-08Z-r28/land-02-joystick.png`、`e2e/review/2026-11-22T03-08Z-r28/land-32-chop-1of3.png`
   - **验收标准**：竖屏切配全阶段 `.cb` 矩形与厨师头部投影包围盒交叠面积 `=== 0`；横屏 `#bbq-stick` 与垃圾桶、五花肉料箱台面投影交叠面积 `=== 0`；双端连跑 3 次 `0` JS error。

### P2 打磨项
1. **烤制倒计时 `t=3.0s` 显示 `烤制中 4s`（`Math.ceil` 浮点边界 off-by-one，新开 `B-139`）**：冻结时钟 `t=3.0s` 时内部浮点 `2.9999` 导致剩余时间向上取整为 `4s`（应为 `3s`），需引入浮点容差修正倒计时显示。
2. **达标结算主按钮 `150×45` 与次按钮 `150×40` 高度不统一且次按钮低于 44px 触控底线（新开 `B-140`）**：`e2e/review/2026-11-22T03-08Z-r28/port-09-results-pass.png` 与 `land-09-results-pass.png` 中次按钮 `再 开 一 局` 高度仅 `40px`（差主按钮 `5px`）且文案含人工空格，建议统一 `min-height: 44px` 并改用 CSS `letter-spacing`。
3. **全作静音无音频反馈（沿用 `B-066`）**：切配、烤熟「叮」、焦糊警示、按钮点击与通关结算全程无声，强化了烤熟→焦糊静默期的盲烤焦虑。
4. **烤串熟/焦 3D 外观与烟效不可辨，且 `.gb` 下缘露多余 3D 短进度条（沿用 `B-045`）**：`e2e/review/2026-11-22T03-08Z-r28/port-35-grill-t6.png`、`port-37-grill-t12.png`、`land-35-grill-t6.png`、`land-37-grill-t12.png` 中串体过小被烤网高光淹没、静帧无金烟/灰烟，且 DOM `.gb` 底部可见一截冗余 3D 短条。
5. **贴台面被挡零撞击反馈（沿用 `B-119`）与场景/控制台残余打磨**：推至厨房台面 `z=2.1533` 静止时无微弹/轻碰反馈（`e2e/review/2026-11-22T03-08Z-r28/port-30-counter-press.png`、`land-30-counter-press.png`）；竖屏后墙绿檐上方仍露越界木地板与穿檐扎染布幔；控制台每局固定输出 2 条 Three.js 弃用告警（`THREE.Clock`、`PCFSoftShadowMap`）。
6. **沿用同框复现的既有 HUD 项**：首屏与结算态 `.topbar` 在模糊背景后透出（`B-133`）、达标 `served=0` 锁 `1★` 零归因（`B-136`）、顶栏缺本关目标额（`B-125`）、竖屏摇杆/动作键底距差 `8px`（`B-103`）及动作键 6 字文案 `取回切好的串` 贴边。

### 与本轮 SPEC 的差距（引用 GAME-DESIGN / ART-DIRECTION 的具体条款）
- **`GAME-DESIGN §2（菜单与数值：烤制 6s 熟 / 12s 焦、切配 3×0.22s 动画）`**：逻辑阈值 `6s` 熟 / `12s` 焦与 3 刀推进数值已落实，但 `t=3.0s` 倒计时 `Math.ceil` 出现 `4s` 边界误差，熟→焦 `[6s, 12s)` 区间缺剩余安全时间进度条，且切配 3 次点按缺少每次 `0.22s` 的台面跳切动画。
- **`GAME-DESIGN §3（关卡与 localStorage `bbq.level`）`**：已实现第 1→2 关切换及 `levelTarget` `180→260` 递增，但第 2 关在玩法机制、菜单与视觉上与第 1 关零差异，且全部通关后无选关/重玩第 1 关出口；文档 §3 自身仍写「M1 仅 1 关」与实现存在漂移。
- **`GAME-DESIGN §1/§7（新一键循环与判定窗口）`**：新设计把出餐压成「上炉 / 起锅」两次点击，并规定 0–4s 夹生、4–9s 完美、9–12s 偏老、>12s 焦糊；但旧构建 `7116bbf` 实测熟(6s)→焦(12s) 之间 6 秒静默、只有最后 2s 才出「快焦了 Ns」、满条「已熟 ✓」不显示剩余安全时间，一旦按新设计落地，这 8 秒的判定窗口必须逐段可见（否则玩家无从判断「点早了夹生 / 点晚了焦」）；同时 `§7` 要求的烤熟「叮」+ 金烟、烤焦变黑 + 灰烟与全作音效（`B-066`/`B-045`）仍缺。
- **`ART-DIRECTION §1（横屏摇杆 112px 与底距、工作站完整可见、地面夹紧 12×9m）`**：横屏摇杆 `112×112 @(16,262)` 尺寸与底距 `16px` 符合条款，但实测位置直接压住垃圾桶与五花肉料箱（`B-093`）；竖屏后墙绿檐外持续露出越界木地板，未完全满足「可见地面永远落在 12×9m 世界里」。

## 2026-11-22 02:08Z 第 27 轮

本轮走查时间 `2026-11-22 02:08Z～02:25Z`，覆盖剧本 ① 首屏、⑤ 上菜→顾客反应→收钱→营业额、⑥ 顾客耐心归零离店与评级联动、⑧ 竖/横屏 HUD 遮挡与模态态收口（③④⑨⑩ 及切配/烤炉连点已在第 26 轮覆盖，本轮不重复）。被测对象为本机冻结快照 `window.__build = 7116bbf-202611220206`（入口 `assets/index-B3BxDN2B.js`，仓库 HEAD `7116bbf`，含 `B-126 模态态隐藏局内 HUD`），视口为竖屏 `390×844` / 横屏 `844×390`、`deviceScaleFactor=1`、SwiftShader 软渲染，开店后冻结 `performance.now` 并通过 `__test.tick()` 推进。公网 `https://openfolio.uk/bbq/` 仍指向香港旧源站旧包（`B-081`，唯一 P0），**本轮全部结论与 14 张截图仅适用于本机 `7116bbf`**。

综合评分：3.0/5（比上轮 2.9 +0.1）

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视/格子感/高饱和食材/Q 版角色） | 3.2 | 正交俯视木地板拼缝、一字型模块化厨房台面、五花肉/菌子/米线三只高饱和实物料箱与箱前斗方挂牌、左墙陶罐与白帽红围裙 Q 版厨师辨识度稳定（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`）；扣分在首屏仅重度虚化店内底图、全卡片纯文字无品类主视觉（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`），竖屏后墙绿檐上方仍露越界木地板、扎染布幔穿檐、`t1` 左后方斜插竹编方块（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`），横屏上排餐桌与顾客头身被顶缘截切（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`），两名同到店顾客模型重影叠合（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`），以及顾客上菜后仅在桌前静坐无进食动画（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`）。 |
| ② 灯光有没有 Saltline 味道（暖光池/炭火点光/雾/明暗层次） | 3.2 | 竖屏餐区暖铜吊灯体积光锥、桌面暖光池与炭火烤炉向台前地板漫射的橙暖反光层次清晰，夜间街边小摊氛围立得住（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`）；扣分在横屏吊灯全部出画仅余桌面浅光斑、烤网前沿高光过亮（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`），静态帧读不出 `FogExp2` 雾效纵深，且竖屏底部纯暗控制带生硬截断下方木地板暖光（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`）。 |
| ③ HUD 是否整齐（对齐/字号/不重叠/不挡操作） | 2.7 | 正向进展显著：**`B-126` 本轮验证生效**，首屏与结算态 `#bbq-stick`、`#bbq-act`、`#bbq-orders` 全部 `display: none`、`0×0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）；**`B-107` 已验证修复**，愤怒离店红字飘字醒目且二次探针 `probe-stale.json` 证实无残留订单卡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-05-angry-left.png`）；横屏摇杆与动作键底边均齐平 `374`、动作键恒 `84×84`。但叠压与越界仍多：① 竖屏新客 `…` 气泡（`53×32 @(203.6,191.3)`）与第 3 张订单卡（`187×47.8 @(193,171.7)`）交叠 `1494px²`，压住卡片左下区域（含桌号徽标下缘）；`t4` 气泡右缘截字成「烤五花肉拼」（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`）；② 竖屏 `t3` 桌光圈 `128×58 @(400.2,306.2)` 与桌号 `(3) @(450.2,355.2)` 右缘 `478.2 > 390` 出画，双客进店气泡 `53×32` 在 `@(206.1,191.3)` 与 `@(201.1,191.3)` 重叠（`B-128`），`.cb` `80×35 @(136,462)` 覆盖厨师头部投影 `(195,463.7)`（`B-112`），摇杆底 `822` 与动作键底 `814` 差 `8px`（`B-103`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`）；③ 横屏 `…` 气泡 `53×32 @(339.2,34)`（`verify-land.json` → `seated3` 复现）及 `t2/t3` 气泡 `53×32 @(358.6,34)`、`@(425.5,34)` 与顶栏 `315.4×36 @(264.3,8)` 交叠 `530px²`（`B-078`）；在 `@(379.1,3.7)` 机位下，`t2` 桌光圈 `128×58 @(379.1,3.7)` 与桌号 `(2) @(429.1,52.7)` 被顶栏压住（换机位后 `(2)` 落到 `@(429.1,117.3)` 与顶栏交叠 `0`）；摇杆 `112×112 @(16,262)` 压垃圾桶/五花肉箱（`B-093`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`）；④ 模态态 `.topbar` 仍在模糊背景后透出，`.cap` 字号 `12px` 低于 `≥13px` 规范。 |
| ④ 有没有明显缺陷（穿模/悬空/贴图错误/文字溢出/错位） | 3.0 | 双端 `pageerror + console.error = 0`，`B-126` 与 `B-107` 已验证修复，上菜收款（`served 0→1`、竖屏 `+¥62`/横屏 `+¥60`）与离店清卡链路准确无残留；扣分在公网仍旧包（`B-081` P0）、竖屏 `t3` 桌号光圈出画及 `t4` 气泡截字、横屏顶栏与 `…` 气泡交叠 `530px²`（`B-078`）并在 `@(379.1,3.7)` 机位下压住 `t2` 光圈/桌号、竖屏 `…` 气泡与第 3 张订单卡交叠 `1494px²`（压住卡片左下区域含桌号徽标下缘）、`B-112` `.cb` 覆盖厨师头、`B-093` 横屏摇杆遮料箱、`B-128` 双客重影、`B-066` 全作无音频及 2 条 Three.js 弃用 warning。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 2.9 | 首屏卡片 `283.4×241` 清晰列出店名、五步流程与 `第 1 关 · 目标：3 分钟营业额 ¥180`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`）；动作键文案 `去料箱取料` / `切配 0/3` / `上菜 烤五花肉拼盘` 准确无截断；耐心 `2.2s` 时卡片与气泡同步转红、归零弹出红色「愤怒离店」后果直白（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`）；但首屏无品类主视觉与继续进度入口、局内顶栏缺本关目标额（`B-125`）、订单卡 `¥48` 与收款 `+¥62`/`+¥60` 缺小费拆解、结算面板未达标且愤怒 `2 位` 仍显示 `1★` 却无星级归因（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）。 |
| 操作手感 | 3.1 | 动作键双端恒 `84×84` 热区舒适，`去料箱取料` 宽 `60px`（`scrollWidth===clientWidth===60`），模态态清退 `#bbq-stick / #bbq-act / #bbq-orders` 杜绝点穿误触（`B-126`），横屏左右键底边均 `374` 对齐（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`）；扣分在横屏摇杆 `112×112 @(16,262)` 直接遮挡垃圾桶与五花肉料箱（`B-093`）、竖屏摇杆底 `822` 与动作键底 `814` 差 `8px`（`B-103`）、切配时 `.cb` 压住厨师头部遮挡身位判断（`B-112`，`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`）。 |
| 正反馈（爽感） | 2.6 | 上菜即刻弹出 `+¥62`（竖屏）/ `+¥60`（横屏）飘字、顶栏营业额同步更新、订单卡转 `用餐中`，且 **`B-107` 修复后**顾客愤怒离店以醒目红色「愤怒离店」飘字明确反馈奖惩（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-05-angry-left.png`）；但全作无音效（`B-066`）、顾客上菜后静坐无进食动作与满意表情、小费 `+¥14`/`+¥12` 未明示、首单入账与愤怒 2 人离店后顶栏均保持 `data-stars="1"`（`B-106` 口径）且结算缺星级门槛说明，情绪起伏仍偏平。 |

### 我能做的（Capability）
- **① 首屏基础信息与开店流程完整可读，模态 HUD 清退生效（`B-126` 已验证）**：双端首屏卡片 `283.4×241`（竖屏 `@(53.3,301.5)`、横屏 `@(280.3,74.5)`）完整呈现 `柳真真云南烤肉 / 炭火生香，小店开张。 / 取料 → 切配 → 炭烤 → 装盘 → 上菜 / 第 1 关 · 目标：3 分钟营业额 ¥180` 与 `150×45` `开 店` 按钮（竖屏 `@(120,470.5)`、横屏 `@(347,243.5)`）；首屏与结算态下 `#bbq-stick`、`#bbq-act`、`#bbq-orders` 全部为 `display: none`、`0×0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）。
- **⑤ 上菜收款与营业额实时联动**：动作键 `上菜 烤五花肉拼盘`（恒 `84×84`）触发后准确推进 `served 0→1`，竖屏飘字 `+¥62`（`84.1×34 @(84.6,214.2)`，底 `248.2`，与 `t1` 气泡 `122×32 @(28,252.5)` 交叠 `0`）、订单卡 `187×47.8 @(193,60)` 显示 `1 烤五花肉拼盘 ¥48 · 用餐中`、顶栏 `营业额 ¥62`；横屏同帧 `+¥60`（小费随耐心浮动）、订单卡 `159×41.8 @(675,150)`、双端 `data-stars="1"`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`）。
- **⑥ 耐心低谷警示、愤怒离店飘字（`B-107` 已验证修复）与离店清卡无残留**：`setPatience(2.2)` 时订单卡切 `class="card angry"`、气泡切 `class="bubble angry"`（3 枚气泡 `92×32`/`122×32`/`92×32`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png`）；耐心归零后顾客进入 `leaving-angry`、`angry 0→2`（竖屏）/ 1 位（横屏），`#bbq-popups` 稳定弹出红色「愤怒离店」飘字（竖屏 2 条、横屏 1 条），二次探针 `probe-stale.json` 证实离店后 1s 内订单卡仅保留未离店顾客、无残留等待卡（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-05-angry-left.png`）。
- **打烊结算未达标分支与零运行时报错**：打烊结算面板 `212×328`（竖屏 `@(89,258)`、横屏 `@(316,31)`）准确汇总 `离目标还差 ¥118 / 营业额 ¥62 / ¥180 / 服务顾客 1 位 / 愤怒离店 2 位 / 废料 0 份 / 再 开 一 局`（横屏 `¥60 / 差 ¥120 / 愤怒 1 位`），双端全流程 `pageerror + console.error = 0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）。

### 我看不懂的（Clarity）
1. **第一眼只见黑底纯文字卡片，怎么 3 秒看出是烤肉经营游戏？上次打到哪还能继续吗？** 首屏背景被重度虚化成一团暗褐块，卡片内部全为文字排版、零烤肉/炭火视觉主锚点，且只有单一 `开 店` 按钮、无「继续上次进度」入口（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`）。
2. **订单写着 `¥48`，为什么竖屏收了 `+¥62`、横屏收了 `+¥60`？还差多少钱过关？** 飘字直接给总价却不拆解 `+¥14`/`+¥12` 快速小费，玩家看不出「上菜越快赚越多」的机制；局内顶栏只有 `第 1 关 | 营业额 ¥62 | 时间 | 评级`，缺少本关 `¥180` 目标额（`B-125`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`）。
3. **未达标还气走 2 位顾客，结算为什么依然给 1★？怎样才能拿 2★/3★？** 局内 `angry 0→2` 与打烊结算 `¥62 / ¥180`、`愤怒离店 2 位` 均维持 `data-stars="1"`（系 `B-106` 既有口径，非新缺陷），但结算面板只写 `离目标还差 ¥118`，零星级归因与 2★/3★ 条件说明，玩家感知不到愤怒离店对评级的实质影响（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）。
4. **竖屏右上挂着 3 号、4 号两张订单卡，3 号桌在哪？第 3 张订单卡左下为何被 `…` 气泡压住？** 竖屏 `t3` 桌光圈 `128×58 @(400.2,306.2)` 与桌号 `(3) @(450.2,355.2)` 右缘 `478.2 > 390` 整块出画，只剩右缘一点残弧；`t4` 气泡右缘被截成「烤五花肉拼」，且进店新客 `…` 气泡（`53×32 @(203.6,191.3)`）与第 3 张订单卡（`187×47.8 @(193,171.7)`）交叠 `1494px²`，压住卡片左下区域（含桌号徽标下缘）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`）。
5. **1 号桌「用餐中」的卡片为什么和「等待」长得几乎一样？** `port-03-served.png` 与 `land-03-served.png` 中 1 号桌已上菜并收款，但订单卡仍维持金色满环，与刚落座满耐心的等待订单缺乏绿色完成态区分。

### 让我不爽的（Friction）
- **横屏顶部多层叠压，左下摇杆还压死料箱**：横屏 `844×390` 下，顶栏 `315.4×36 @(264.3,8)` 与 `…` 气泡 `53×32 @(339.2,34)`（`verify-land.json` → `seated3` 复现）及 `t2/t3` 顾客气泡 `53×32 @(358.6,34)`、`@(425.5,34)` 交叠 `530px²`（`B-078`），且在 `@(379.1,3.7)` 机位下压住 `t2` 桌光圈 `128×58 @(379.1,3.7)` 与桌号 `(2) @(429.1,52.7)`（换机位后 `(2)` 落到 `@(429.1,117.3)` 与顶栏交叠 `0`）；新客 `…` 气泡与 2 号桌 `烤菌子` 气泡互相叠压盖住耐心环；左下摇杆 `112×112 @(16,262)` 全程压在垃圾桶和五花肉料箱上（`B-093`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`）。
- **竖屏切配徽章 `.cb` 直接糊在厨师脸上，双客进店叠成重影**：竖屏切配 `0/3` 时，`.cb` `80×35 @(136,462)` 将厨师头部投影 `(195,463.7)` 整块盖没（仅露白帽尖，`B-112`）；两名同时进店顾客的模型重叠且气泡 `53×32` 在 `@(206.1,191.3)` 与 `@(201.1,191.3)` 几乎完全重合（`B-128`）；底部摇杆底 `822` 与动作键底 `814` 仍差 `8px`（`B-103`）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`）。
- **模态态只藏了底部和订单卡，顶栏还糊在上面透出来**：虽然 `B-126` 已干净藏掉 `#bbq-stick / #bbq-act / #bbq-orders`，但首屏与结算弹窗的模糊背景正上方依然清晰透出一条糊掉的 `.topbar`（结算页甚至能辨出红色 `0:00`），弹窗仪式感差最后一口气（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`）。
- **整局静音且上菜后顾客「木头人」静坐**：全作仍无任何音频反馈（`B-066`），上菜收款后桌面只出现一只静置白盘，顾客一动不动、无咀嚼/点头/热气/满意表情，出餐瞬间不够解气（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`）。

### 让我想继续玩的（Hook）
- **`B-126` 模态收口 + `B-107` 愤怒离店飘字让界面质感明显上了一阶**：首屏和结算态终于清掉杂乱的触控层与订单卡，视觉聚焦度显著提升（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`）；顾客耐心归零弹出醒目红字「愤怒离店」且 1s 内干净清卡，忙乱救火时的得失反馈开始有张力（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-05-angry-left.png`）。
- **暖调云南烧烤氛围与核心状态机稳健**：铜吊灯暖光池、三料箱实物辨识度与零报错状态机（`pageerror + console.error = 0`）底子扎实，一旦把横竖屏标注避让、小费/星级透明化和音效补齐，3 分钟一局的经营节奏会很抓人（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`）。

### P0 阻塞（不修没法玩）
1) **公网 `https://openfolio.uk/bbq/` 仍停留在香港旧源站旧包（沿用 `B-081`）**
   - 现象：公网 `https://openfolio.uk/bbq/` 仍返回香港旧源站旧构建，落后本机 `7116bbf-202611220206`（`assets/index-B3BxDN2B.js`），本轮已验证的 `B-126`（模态隐藏 HUD）与 `B-107`（愤怒离店飘字）及近期全部修复均未到达公网玩家。
   - 复现步骤：请求 `https://openfolio.uk/bbq/` 读取入口 `<script>` 文件名及 `window.__build`，与本机快照 `7116bbf-202611220206`（`assets/index-B3BxDN2B.js`）比对。
   - 截图路径：本轮全部 14 张截图均采自本机 `7116bbf`（如 `/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png` 所示修复仅在本机生效）。
   - **验收标准**：部署后 60s 内，`https://openfolio.uk/bbq/` 返回的入口 JS 文件名与 `window.__build` 与仓库最新 `dist/index.html` 100% 一致，公网双端在首屏态断言 `#bbq-stick / #bbq-act / #bbq-orders` 均为 `display: none`，连跑 3 次 `0` JS error。

### P1 明显缺陷
1) **横屏顶栏与气泡交叠 `530px²`、顶部机位下压住 `t2` 光圈/桌号，且摇杆压垃圾桶/料箱（沿用 `B-078` / `B-093` + 新开 `B-135`）**
   - 现象：横屏 `844×390` 下，顶栏 `315.4×36 @(264.3,8)` 与 `…` 气泡 `53×32 @(339.2,34)`（`verify-land.json` → `seated3` 复现）及 `t2/t3` 顾客气泡 `53×32 @(358.6,34)`、`@(425.5,34)` 交叠 **`530px²`**（`B-078`）；在 `@(379.1,3.7)` 机位下，`t2` 桌光圈 `128×58 @(379.1,3.7)` 与桌号 `(2) @(429.1,52.7)` 亦被顶栏压住（换机位后 `(2)` 落到 `@(429.1,117.3)` 与顶栏交叠 `0`）；左下摇杆 `112×112 @(16,262)` 遮挡垃圾桶与五花肉料箱（`B-093`）。
   - 复现步骤：在横屏 `844×390` 开店并使 `t1/t2/t3` 就座（含将镜头推至 `t2` 靠顶 `@(379.1,3.7)` 机位）及切配，读取 `.topbar`、`.bubble`、`.order-ring`、`.order-num` 与 `#bbq-stick` 的 `getBoundingClientRect()`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-06-chop-hud.png`
   - **验收标准**：横屏 `844×390` 下 3 客同屏且任意机位（含 `t2` 靠顶机位）时，任意 `.bubble`、`.order-ring`、`.order-num` 与 `.topbar` 交叠面积均为 `0`（由当前 `530px²` 归零）；`#bbq-stick` 与垃圾桶/五花肉料箱屏幕投影交叠面积为 `0`；双端 3 连跑 `0` JS error。
2) **进店 `…` 气泡与第 3 张订单卡交叠 `1494px²` 并压住横屏已就座气泡（新开 `B-134`）**
   - 现象：竖屏 `390×844` 多客期，进店顾客 `…` 气泡 `53×32 @(203.6,191.3)` 与第 3 张订单卡 `187×47.8 @(193,171.7)` 交叠 `1494px²`，压住卡片左下区域（含桌号徽标下缘）；横屏进店 `…` 气泡同样覆盖 2 号桌 `烤菌子` 气泡耐心环。
   - 复现步骤：双端 3 客就座且有新客进店时，读取 `.bubble` 与 `#bbq-orders .card` 及已就座 `.bubble` 的 `getBoundingClientRect()`。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-04-patience-low.png`
   - **验收标准**：双端任意可见 `.bubble` 与 `#bbq-orders .card` 交叠面积 `=== 0`（由当前 `1494px²` 归零）；`walking-in` 阶段气泡与已就座顾客 `.bubble` 交叠面积 `=== 0`；作为预防性一致性约束，上菜当帧 `#bbq-popups .popup` 与任意可见 `.bubble` 交叠面积保持 `=== 0`；3 连跑 `0` JS error。
3) **竖屏 `t3` 桌光圈/桌号整块出画、`t4` 气泡右缘截字、切配 `.cb` 覆盖厨师头部（沿用 `B-112` / `B-128`）**
   - 现象：竖屏 `390×844` 下，`t3` 桌光圈 `128×58 @(400.2,306.2)`、桌号 `(3) @(450.2,355.2)` 右缘 `478.2 > 390` 完全出画，`t4` 气泡右缘被截成「烤五花肉拼」；切配 `0/3` 时 `.cb` `80×35 @(136,462)` 覆盖厨师头部 `worldToScreen` 投影 `(195,463.7)`（`B-112`）；两名同时进店顾客气泡 `53×32` 位于 `@(206.1,191.3)` 与 `@(201.1,191.3)` 几乎完全重合（`B-128`）。
   - 复现步骤：竖屏 `390×844` 使 3 位顾客就座（含 `t3`/`t4`）并切配至 `0/3`，读取 `t3`/`t4` 标注矩形、`.cb` 矩形与厨师头部投影坐标及双客进店气泡矩形。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-04-patience-low.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`
   - **验收标准**：竖屏全部可见 `.bubble` 满足 `left >= 4 && right <= 386`，屏外桌位切换为完整在视口内的边缘指示；厨师头部投影点落在 `.cb` 包围盒外（重叠面积 `=== 0`）；同帧进店两客 `.bubble` 交叠面积 `< 各自面积 10%`；3 连跑 `0` JS error。
4) **上菜缺进食动画与小费拆解、顶栏缺目标额、结算缺星级归因（沿用 `B-125` + 新开 `B-136`）**
   - 现象：订单卡标价 `¥48` 而飘字 `+¥62`（竖屏）/ `+¥60`（横屏）未拆解小费来源，上菜后顾客仅静坐无进食动画与满意反应；局内顶栏无本关 `¥180` 目标额（`B-125`）；未达标结算面板 `离目标还差 ¥118`、`愤怒离店 2 位` 却显示 `1★` 且零星级归因说明。
   - 复现步骤：双端完成 1 单上菜至 `phase=eating` 截帧，并推进至打烊进入未达标结算面板，检查飘字、顾客姿态、顶栏与结算 DOM 文本。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`
   - **验收标准**：上菜当帧飘字同时包含总金额与小费数额（匹配 `/小费.*\d+/`），进入 `eating` 后 `0.5s` 内顾客产生可断言动画增量（位移/旋转 delta `> 0.02` 或满意徽标可见）；顶栏存在可见 `[data-level-target]` 含 `/ ¥180`；结算面板 `[data-star-reason]` 非空可见且营业额行含 `含小费 ¥\d+`；3 连跑 `0` JS error。
5) **模态态顶栏 `.topbar` 仍透出、首屏无品类主视觉且缺「继续上次进度」入口（新开 `B-133`）**
   - 现象：首屏卡片 `283.4×241` 为纯文字无烤肉主视觉（背景重度虚化），仅设 `开 店` 按钮、无「继续上次进度」入口；且虽 `B-126` 隐藏了底部触控与订单卡，但首屏与结算态 `.topbar` 仍在模糊背景后透出。
   - 复现步骤：双端打开页面停于首屏及进入打烊结算态，检查 `.topbar` 的 `display`、主视觉 SVG 节点与有存档时的继续入口。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-01-title.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-07-results.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/land-07-results.png`
   - **验收标准**：`menu` 与 `results` 态 `.topbar` 满足 `display === 'none'`；首屏 `[data-brand-emblem]` 可见且 `width >= 48 && height >= 48`；存在第 2 关存档时首屏渲染可见 `[data-continue-btn]` 且点击直进 `level === 2`；双端 3 连跑 `0` JS error。
6) **全作声音通道缺失（沿用 `B-066`）**
   - 现象：上菜收款、低耐心警报与愤怒离店均无任何音效反馈，强依赖玩家肉眼扫屏。
   - 复现步骤：开启音频跑完开店→上菜→耐心归零离店→结算闭环，检测 WebAudio 事件触发。
   - 截图路径：全套 14 张流程均无音频反馈通道（如 `/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-03-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`）。
   - **验收标准**：接入程序化 WebAudio（首次用户手势解锁），切配、烤熟「叮」、收款、愤怒离店均触发可断言的音效事件计数 `>= 1`（含静音切换），双端 `0` console error。

### P2 打磨项
1. **竖屏摇杆底 `822` 与动作键底 `814` 不齐平（沿用 `B-103`）**：两者底边差 `8px`，建议统一底边距为 `22px` 对齐（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`）。
2. **动作键 `.cap` 字号 `12px` 低于 `ART-DIRECTION §5` 的 `≥13px` 规范**：本轮实测 `去料箱取料` 宽 `60px`（`scrollWidth===clientWidth===60`），字号仍为 `12px`，需按既定规划提到 `13px` 并控制长文案边距（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-06-chop-hud.png`）。
3. **「用餐中」订单卡仍用金色满环，未切 `ok #9ecb6a` 完成态**：`port-03-served.png`、`land-03-served.png` 中 1 号桌已上菜但卡片视觉权重与等待单雷同，易误判重复制作。
4. **竖屏场景顶缘越界木地板、扎染穿檐与 `t1` 左后方斜插竹块**：后墙绿檐外持续可见木地板延展与穿檐布幔（`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-02-start.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T02-08Z-r27/port-05-angry-left.png`）。
5. **控制台稳定输出 2 条 Three.js 弃用告警**：双端每局固定出现 `THREE.Clock ... deprecated` 与 `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`，需迁移至 `THREE.Timer` 与 `PCFShadowMap` 达成零 warning。
6. **沿用其他上轮非本轮主测项**：烤串 3D 本体过小（`B-045`）、烤熟后缺焦糊倒计时条（`B-064`）本轮未重复测烤炉帧，仍挂待修。

### 与本轮 SPEC 的差距
- **`GAME-DESIGN.md §1 / §4（目标与评级反馈）`**：要求营业额目标清晰可见且星级与营收/愤怒离店强挂钩。实测 `B-107` 愤怒离店飘字已补齐、无残留卡，但局内顶栏无 `¥180` 目标额（`B-125`），`+¥62`/`+¥60` 收款未拆解小费，未达标结算缺星级归因与门槛提示。
- **`GAME-DESIGN.md §7（手感与反馈）`**：要求上菜收款及核心动作具视听双重正反馈。实测零音频通道（`B-066`），顾客进入 `eating` 后零进食动画与满意表现。
- **`ART-DIRECTION.md §1 / §3（构图与 Saltline 灯光）`**：横屏 `844×390` 上排餐桌被顶缘截切、吊灯全部出画、且在 `@(379.1,3.7)` 机位下 `t2` 桌光圈 `128×58 @(379.1,3.7)` 落入顶栏区；竖屏后墙绿檐外仍露越界木地板。
- **`ART-DIRECTION.md §5（UI 皮肤与布局规范）`**：`B-126` 已在模态态隐藏触控与订单卡，但 `.topbar` 仍在模糊遮罩后透出；动作键 `.cap` 字号 `12px` 低于 `≥13px` 规范；横屏气泡与顶栏交叠 `530px²`（`B-078`）、竖屏 `t3` 桌号右缘 `478.2 > 390` 出画、`.cb` 压厨师头（`B-112`）、`…` 气泡与第 3 张订单卡交叠 `1494px²`（压住卡片左下区域含桌号徽标下缘），距离「零重叠、全可读」仍有明显差距。

## 2026-11-22 01:08Z 第 26 轮

本轮覆盖剧本 ③ 切配、④ 烤炉、⑤ 装盘+上菜+收款、⑨ 连点（防复制/卡死）、⑩ 控制台错误（①②⑥⑦⑧ 已在第 25 轮覆盖，本轮不重复），被测对象为本机快照 `window.__build = b4a7c46-202611220119`（入口 `assets/index-C9ue2hwv.js`，仓库 HEAD `b4a7c46`，竖屏 `390×844` / 横屏 `844×390`、`deviceScaleFactor=1`、SwiftShader 软渲染，开店后冻结 `performance.now` 并用 `__test.tick()` 推进 ±0.02s）；公网 `https://openfolio.uk/bbq/` 实测仍停留在香港旧源站 `__build = 2290acb-202611210547`（`assets/index-BklOlgyL.js`，`B-081` 仍是唯一 P0），故本轮全部结论与 12 张截图仅适用于 `b4a7c46`。

| 维度 | 分数 | 证据 |
|---|---|---|
| ① 画面像不像胡闹厨房（正交俯视/格子感/高饱和食材/Q 版角色） | 3.2 | 正交俯视木地板拼缝、1m 模块厨房台面、三只料箱顶面高饱和五花肉/菌子/米线实物及箱前斗方挂牌、白帽红围裙 Q 版厨师清晰可读（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）；扣分在肉块 `0.055m`（约 `3px`）、整串 `0.34m` 落在砧板与烤网上几乎不可辨，金黄/焦黑变色与烟粒子完全读不出（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-05-grill-cooked.png`），竖屏后墙绿檐外仍露越界木地板、扎染穿檐且 `t1` 左后方斜插竹块（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`），顾客上菜后仅静坐无进食动画（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）。 |
| ② 灯光有没有 Saltline 味道（暖光池/炭火点光/雾/明暗层次） | 3.2 | 竖屏餐区 3 盏暖铜吊灯体积光锥、桌面暖光池与炭火烤炉向台前地板漫射的橙暖湿反层次分明，`B-121` 焦糊态在烤炉周边叠出警示红光强化危机氛围（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`）；扣分在横屏吊灯全部出画仅余桌面浅光斑、烤网前沿高光过白进一步吞没 3px 烤串、静态帧读不出 `FogExp2` 远景雾与烤制烟效，且竖屏底部纯暗控制带生硬截断木地板暖光（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-07-grill-burnt.png`）。 |
| ③ HUD 是否整齐（对齐/字号/不重叠/不挡操作） | 2.5 | `B-121` 焦糊警示动作键（红环 + 警示三角 SVG + `取焦串`、`data-act-warn="true"`）与熟态（金环 + 手掌 SVG + `取烤串`）双端恒 `84×84` 清晰对齐；本轮 DOM 探针新测证实，上菜收款当帧 `#bbq-popups .popup` 竖屏 `84.1×34 @(84.6,238.2)` / 横屏 `84.1×34 @(147.9,53)`，同一时刻 `#bbq-bubbles` 内 `.bubble` 数量为 `0`（顾客 `phase=eating` 后气泡已被移除），订单卡为 `187×47.8 @(193,60)`（竖屏）/ `159×41.8 @(675,150)`（横屏），飘字与订单卡及气泡交叠面积均为 `0`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）；但仍存在多处叠压与规范缺口：① 竖屏切配进度徽章 `.cb`（`80×35 @(136,462)`）直接覆盖厨师头部——本轮新测厨师头部世界坐标 `(-1,1.0,2)` 经 `worldToScreen` 投影至 `(195,463.7)`，落在 `.cb` 的 x 区间 `136…216`、y 区间 `462…497` 内（横屏 `.cb` `@(284,224)` 与头部投影 `(351.7,210.1)` 仅轻微擦边），烤炉中槽 `.gb` 及桌号 `(1)` 亦遮挡厨师身位（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`）；② 横屏摇杆 `112×112 @(16,262)` 直接覆盖垃圾桶与五花肉料箱（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）；③ 烤炉存在两套进度指示——`src/game/grill.ts` 世界空间 `barBg` / `barFill` Sprite（`barBg.scale.x = 0.34`、`barFill.scale.x = 0.34 * frac`）在 `.gb` 下缘露出，与屏幕空间 `.gb` 重复（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-05-grill-cooked.png`）；④ 动作键 `.cap` 本轮实测字号 `12px`，低于 `ART-DIRECTION §5` 规定的 `≥13px`，最长的 `取回切好的串` 宽 `72px`（`scrollWidth === clientWidth === 72`，无溢出不裁切，但左右安全边距仅 `6px`）；⑤ 竖屏摇杆底 `822` 与动作键底 `814` 差 `8px`。 |
| ④ 有没有明显缺陷（穿模/悬空/贴图错误/文字溢出/错位） | 2.8 | 双端 `pageerror + console.error = 0`，出餐闭环（`money 0→62`、`served 0→1`）与连点 8 次防复制逻辑稳定，`B-121` 焦糊警示双端一致；扣分在公网仍停旧包 `2290acb`（`B-081` P0）、`t>6s` 后 `.gb-fill` 恒满 100% 缺焦糊倒计时（`B-064`）、整条声音通道缺失（`AudioContext` 命中 0，`B-066`）、竖屏 `.cb` 覆盖厨师头部与横屏摇杆遮挡站点、烤炉重复世界空间进度条、动作键 `.cap` `12px` 低于规范且 6 字仅余 `6px` 边距、后墙越界地板及 2 条 Three.js 弃用 warning。 |

| 体验维度 | 分数 | 证据 |
|---|---|---|
| 上手清晰度 | 2.9 | 动作键沿流程精准切换（`放上砧板`→`切配 0/3`→`取回切好的串`→`上烤炉`→`烤制中…`→`取烤串`/`取焦串`→`装盘`→`上菜 烤五花肉拼盘`），焦糊态红环+警示三角+世界浮标 `焦` 三重编码与竖屏 `← 垃圾桶` 离屏提示直白易懂（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`）；但 6s→12s 间 `.gb-fill` 恒满导致「快焦了」紧迫感弱、顶栏无本关目标额导致首单 `¥62` 仍 `1★` 难理解、订单卡 `¥48` 与 `+¥62` 未解释 `+¥14` 小费来源（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`）。 |
| 操作手感 | 2.7 | ⑨ 连点测试中空手在料箱 8 连按仅得 1 件 `raw`、持 `chopped` 在烤炉 8 连按仅占 1 烤位（`slots=[chopped, null, null]`），烤制中锁定 `烤制中…` 防误取生串，无卡死无数值异常（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`）；但切配需「1 放 + 3 切 + 1 取」共 5 次点按偏碎且无刀切节奏反馈（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`），装盘台无台面暂存位（`src/game/flow.ts` 的 `case 'plate'` 只有 `if (p.carrying) setItemStage(p.carrying, 'plated')`，没有任何台面槽位/暂存数组，一次只能改手持物状态），横屏摇杆直接压在垃圾桶与五花肉料箱上干扰落指（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）。 |
| 正反馈（爽感） | 2.2 | 上菜收款触发 `+¥62` 飘字、顶栏 `营业额 ¥62` 更新与订单卡转 `用餐中`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）；但全作零音频（`AudioContext|new Audio` 命中 0，`B-066`）、3px 肉块完全看不出烤熟金黄与金烟（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`）、顾客上菜后零进食动画与满意反应、首单入账 `¥62` 评级仍锁 `1★` 且不展示 `+¥14` 小费奖励，出餐链路缺视听双重爽点。 |

综合评分：2.9/5（比上轮 2.9 ±0.0）

### 我能做的（Capability）
- **完整切配流程**：在砧板依次完成 `放上砧板` → `切配 0/3`（`chopLeft=2` 时 `.cb` 为 `80×35`，竖屏 `@(136,462)` / 横屏 `@(284,224)`，`.cb-bar` `64×8`、`.cb-fill` 推至 `21.3px` 即 1/3，显示 `切配 1/3`）→ 切完转 `.cb.done` 显示 `已切好 ✓` → `取回切好的串`，全程 5 次按下状态机准确（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）。
- **炭烤全生命周期与焦糊预警（`B-121` 落地）**：屏幕空间 `.gb`（`76×34`，竖屏 `@(110,456)` / 横屏 `@(419,216)`，`gb-fill` 高 `8px`）按 `t=3.55s` `烤制中 3s`（fill `37.9px`，动作键禁用 `烤制中…`）→ `t=6.35s` `已熟 ✓`（fill `64px`，`.gb.done`，动作键 `取烤串`）→ `t=10.75s` `快焦了 2s` → `t=12.45s` `焦了 ✗` 准确推进，焦糊时双端动作键同步切红环+警示三角+`取焦串`（`data-act-warn="true"`）且厨师胸前浮标切红 `焦`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-07-grill-burnt.png`）。
- **装盘上菜与即时结算**：熟串经 `装盘` 变 `plated`，到 1 号桌（`pork`）按 `上菜 烤五花肉拼盘` 后准确结算 `money 0→62`（菜价 `48` + 小费 `14`）、`served 0→1`、顾客 `phase=seated→eating`（此时 `#bbq-bubbles` 内 `.bubble` 数量已归 `0`），触发 `#bbq-popups .popup` `+¥62`（竖屏 `84.1×34 @(84.6,238.2)` / 横屏 `84.1×34 @(147.9,53)`）与顶栏 `营业额 ¥62`、订单卡 `烤五花肉拼盘 ¥48 · 用餐中`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）。
- **高频连点容错与零运行时报错**：空手在料箱 8 次快速按下仅得 1 件 `raw`，手持 `chopped` 在烤炉 8 次快速按下仅占 1 个烤位、其余操作静默 no-op（注：本轮第二次测试时烤炉第 0 烤位还压着一根焦串，连按第一下按 `取焦串` 优先级把焦串取到手里，即 `readySlot()` 熟/焦优先于空手放串，终态为手持 `waste`、1 号烤位留 `chopped`——这是既定的取串优先级逻辑，不是缺陷也不是复制），全程无复制、无卡死，双端 `pageerror + console.error = 0`。

### 我看不懂的（Clarity）
1. **烤炉上到底有没有串、熟了和焦了长什么样？** 肉块仅 `0.055m`（屏幕约 `3px`）、整串 `0.34m`，被烤网亮白高光淹没，不靠 `76×34` 的 `.gb` 文字标签根本分不清炉上是空的、金黄熟串还是黑炭焦串（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-07-grill-burnt.png`）。
2. **「快焦了 2s」为什么进度条还死死满格不动？** `src/ui/hud.ts updateGrill()` 按 `fill = min(1, t/6)` 计算，`t>6s` 后条形恒为 `64px`（100%），从 `t=6.35s` 的 `已熟 ✓` 到 `t=10.75s` 的 `快焦了 2s` 再到 `t=12.45s` 的 `焦了 ✗` 全靠小字变化，余光根本扫不出距离烧焦还剩几秒（`B-064`）。
3. **明明标价 ¥48 的菜为什么飘出 +¥62，而且赚了钱怎么还是 1 颗星？** 订单卡写 `¥48 · 用餐中`，飘字写 `+¥62` 却不拆解 `+¥14 小费`，顶栏也不显示第 1 关 `¥180` 目标额，玩家无从得知为什么 `data-stars="1"` 纹丝不动（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）。
4. **3 个烤位分界在哪，下一按会放进/取出哪一位？** 烤炉呈一条连续发光铁条，无槽位分隔线与 1/2/3 序号提示，同时 `src/game/grill.ts` 的世界空间 `barBg` / `barFill` 两个 Sprite（`barBg.scale.x = 0.34`、`barFill.scale.x = 0.34 * frac`）在 `.gb` 下缘露出一小截暗色短条，两套进度指示并存容易误以为是串体或渲染脏点（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-04-grill-cooking.png`）。
5. **1 号桌都上完菜了，订单卡怎么还和等菜时几乎一模一样？** 上菜进入 `phase=eating` 后，桌面气泡已被移除（`.bubble` 数量为 `0`），但右上订单卡 `.card` 上菜前后 `className` 均为 `card`（无 `done`/`served` 等状态类），进度环仍是同位置的 `22×22`，仅文本从 `¥48 · 等待` 变为 `¥48 · 用餐中`，扫视时极易误判为待出餐订单（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）。

### 让我不爽的（Friction）
- **切一根串要按 5 下还没节奏感**：生串站砧板必须按 `放上砧板` → 切 3 下 → `取回切好的串` 共 5 次，比 `GAME-DESIGN.md §1` 写的 3 次多出 2 次无效操作；且砧板菜刀一动不动、动作键图标仍是斜串而非菜刀，竖屏 `.cb`（`80×35 @(136,462)`）更直接覆盖厨师头部投影 `(195,463.7)`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）。
- **整局像在静音录屏里干活**：源码内 `AudioContext|new Audio` 命中 0（`B-066`），切菜无笃笃声、烤炉无炭火滋滋声、烤熟没有「叮」提示、上菜收款没有硬币叮当声，玩家必须死盯 `76×34` 小徽章防烧焦。
- **横屏左手摇杆压死垃圾桶与五花肉料箱**：`112×112 @(16,262)` 的摇杆半透明大圆盘全程压在垃圾桶下半部和五花肉料箱左侧与挂牌上，拿五花肉或丢焦串时视线被手指与摇杆双重挡住（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`~`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`）。
- **装盘台不能暂存成品且动作键字号偏小、6 字边距偏窄**：`src/game/flow.ts` 的 `case 'plate'` 只有 `if (p.carrying) setItemStage(p.carrying, 'plated')`，装盘台没有任何台面槽位/暂存数组，一次只能改手持物状态，手里拿着刚装好的盘子时若炉上另一串快焦根本腾不出手；同时动作键 `.cap` 实测字号 `12px`（低于 `ART-DIRECTION §5` 规定的 `≥13px`），6 字状态 `取回切好的串` 宽 `72px`（`#bbq-act` 恒 `84×84`，无溢出但左右边距仅 `6px`，触边风险高）（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`）。

### 让我想继续玩的（Hook）
- **`B-121` 焦糊三重警示打磨到位**：烤焦时动作键（红环 + 警示三角 SVG + `取焦串`）、炉周红光与厨师胸前红色 `焦` 浮标三处联动，双端一致，一眼就能区分「赶紧拿去装盘」和「焦了拿去丢掉」，救火紧迫感有了雏形（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-07-grill-burnt.png`）。
- **云南烧烤摊辨识度与核心链路已立住**：五花肉/菌子/米线三只实物料箱 + 斗方挂牌、铜吊灯暖光池 + 炭火暖反射光搭配无报错、防连点复制的稳定出餐闭环，只要把「看得见肉熟、听得见滋滋声、清掉 HUD 遮挡角色/站点」补齐，单局 3 分钟循环就会有很强的重玩动力（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`）。

### P0 阻塞（不修没法玩）
1) **公网 `https://openfolio.uk/bbq/` 仍停留在香港旧源站旧构建（沿用 `B-081`）**
   - 现象：公网实测仍为 `__build = 2290acb-202611210547`、入口 `assets/index-BklOlgyL.js`，落后本机快照 `b4a7c46-202611220119`（`assets/index-C9ue2hwv.js`）多个版本，含 `B-094`/`B-106`/`B-110`/`B-117`/`B-121` 在内的近期全部修复均未到达公网玩家。
   - 复现步骤：直接请求 `https://openfolio.uk/bbq/` 并读取 `window.__build` 及 `<script>` 入口文件名，与本机 `dist/index.html` 对比。
   - 截图路径：公网沿用前轮基线（本轮 12 张截图全部采自本机 `b4a7c46`，如 `/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png` 所示 `B-121` 仅在本机生效）。
   - **验收标准**：`curl -s https://openfolio.uk/bbq/` 返回的入口 JS 哈希与仓库当前 `dist/index.html` 完全一致，浏览器打开 `https://openfolio.uk/bbq/` 读取 `window.__build` 与本机构建一致且 `B-121` 焦糊警示在公网双端生效。

### P1 明显缺陷
1) **烤串 3D 本体过小（肉块 ≈3px）且无金烟/灰烟，熟态与焦态不可靠画面判读（沿用 `B-045` / `B-097` / `B-111`）**
   - 现象：`src/game/items.ts` 肉块 `0.055m`、整串 `0.34m`（1 世界单位 ≈ `47px` → 肉块约 `3px`），叠加烤网前沿过亮反光，无论烤制中、已熟还是烤焦，串体在烤网上只剩几个像素亮点/黑点，既看不出 `#d98a3d` 金黄与 `#241d18` 焦黑，也看不出 `grill.ts` 的 `smokeT` 烟粒子。
   - 复现步骤：切配五花肉上烤炉，冻结时钟推进至 `t=3.55s`、`t=6.35s`、`t=12.45s` 分别在竖屏 `390×844` 与横屏 `844×390` 观察烤炉表面。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-07-grill-burnt.png`
   - **验收标准**：双端烤炉上单根烤串屏幕投影尺寸 ≥ `24×8px`（竖屏）/ `32×10px`（横屏）；`t=6.35s`（`cooked`）串体可见金黄与金色烟粒子节点，`t=12.45s`（`waste`）串体亮度较熟态下降 ≥50% 且可见明显灰黑烟粒子。
2) **烤熟后（6s→12s）`.gb-fill` 恒满 100%，缺焦糊倒计时条（沿用 `B-064`）**
   - 现象：`src/ui/hud.ts updateGrill()` 采用 `fill = min(1, t/6)`，导致 `t>6s` 后从 `t=6.35s`（`已熟 ✓`）至 `t=10.75s`（`快焦了 2s`）再到 `t=12.45s`（`焦了 ✗`）`.gb-fill` 宽度恒死锁 `64px`（100%），玩家无法通过条形剩余长度预判烧焦。
   - 复现步骤：上烤炉后推进至 `t=3.55s`、`t=6.35s`、`t=10.75s`、`t=12.45s`，检查 `.gb-fill` 宽度变化。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-07-grill-burnt.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-05-grill-cooked.png`
   - **验收标准**：`t ∈ (6, 12)` 阶段 `.gb-fill` 宽度随 `(12 - t) / 6` 线性递减（`t=10.75s` 时宽度处于总宽的 `15%–28%` 并切警示色），`t≥12s` 切焦糊态样式。
3) **多处 HUD/摇杆与角色及站点叠压（沿用 `B-112` / `B-098` / `B-113` / `B-078`）**
   - 现象：① 竖屏切配进度徽章 `.cb`（`80×35 @(136,462)`）直接覆盖厨师头部——实测厨师头部世界坐标 `(-1,1.0,2)` 经 `worldToScreen` 投影到屏幕 `(195,463.7)`，落在 `.cb` 的 x 区间 `136…216`、y 区间 `462…497` 内（横屏 `.cb` `@(284,224)` 与头部投影 `(351.7,210.1)` 仅轻微擦边）；② 烤炉中槽 `.gb` 与桌号圆牌 `(1)` 均压住厨师身位；③ 横屏摇杆 `112×112 @(16,262)` 遮挡垃圾桶与五花肉料箱及斗方挂牌（注：二次 DOM 探针已确认上菜飘字 `#bbq-popups .popup` 与订单卡交叠面积为 `0` 且此时 `.bubble` 数量为 `0`，不列为叠压项）。
   - 复现步骤：双端依次执行切配 1/3、烤炉中槽烤制并站立于站点前，读取 `.cb`、`.gb`、`#bbq-stick` 与角色头部/站点屏幕包围盒投影。
   - 截图路径：`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`
   - **验收标准**：双端切配时厨师头部投影点不在 `.cb` 包围盒内，`.cb`、`.gb`、桌号牌与厨师屏幕投影重叠面积 ≤ `10%`；横屏 `#bbq-stick` 与垃圾桶及五花肉料箱投影矩形交叠面积为 `0`。
4) **全链路声音通道缺失（沿用 `B-066`）**
   - 现象：`src/` 中 `AudioContext|new Audio` 命中 `0`，切配、炭烤滋滋、烤熟「叮」、焦糊警报与上菜收款均无任何音效反馈，直接违背 `GAME-DESIGN.md §7`「烤熟：串变金黄 + "叮"」且大幅削弱操作爽感与离线预警能力。
   - 复现步骤：检索 `src/` 内音频实现，或开启声音后跑完取料→切配→烤熟→烤焦→上菜闭环。
   - 截图路径：静态源码及全套 12 张流程实测均无音频触发通道（如 `/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-05-grill-cooked.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`）。
   - **验收标准**：接入程序化 WebAudio 音效模块（用户首次手势解锁 `AudioContext`），切配、烤熟「叮」、烤焦警示、收款均触发可断言的音频事件记录（含静音开关），双端 0 console error。

### P2 打磨项
1. **动作键 `.cap` 字号 `12px` 低于规范且 6 字文案边距仅 `6px`（新开 `B-130`）**：按钮 `#bbq-act` 恒 `84×84`，实测 `.cap` 为 `12px`（低于 `ART-DIRECTION §5` 规定的 `≥13px`）；`取 五花肉` 宽 `51.3px`（左右各 `16.3px`）、`去料箱取料` `60px`（左右各 `12px`）、最长的 `取回切好的串` `72px`（左右各 `6px`，`scrollWidth === clientWidth === 72`，无溢出不裁切但触边风险高），建议字号提到 `13px` 并给 `.cap` 设 `max-width` 或将长文案精简到 ≤4 字（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-08-spam-after.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-08-spam-after.png`）。
2. **烤炉存在世界空间与屏幕空间两套重复进度指示（关联 `B-111`）**：`src/game/grill.ts` 确有世界空间 `barBg` / `barFill` 两个 Sprite（`barBg.scale.x = 0.34`、`barFill.scale.x = 0.34 * frac`），与屏幕空间 `.gb` 同时存在并在 `.gb` 下缘露出暗色短条，两套进度指示重复，建议移除世界空间 Sprite、只保留屏幕空间 `.gb`（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-05-grill-cooked.png`）。
3. **切配进度为直条而非 §7 进度环，且 5 次点按偏碎无刀切动效（关联 `B-113` / 新开 `B-129`）**：当前 `.cb-bar` 为 `64×8` 横条、需 1 放+3 切+1 取共 5 次按下，砧板菜刀静止且动作键仍用斜串图标（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-03-chop-progress.png`）。
4. **烤炉 3 烤位无位序/落位指向（新开 `B-131`）**：烤炉缺乏 1/2/3 槽位编号与下一按目标槽高亮，多串齐烤时玩家无法预判放置与取出次序（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-04-grill-cooking.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-04-grill-cooking.png`）。
5. **装盘台无台面暂存槽位（关联 `B-092` / 新开 `B-132`）**：`src/game/flow.ts` 的 `case 'plate'` 只有 `if (p.carrying) setItemStage(p.carrying, 'plated')`，装盘台没有任何台面槽位/暂存数组，一次只能改手持物状态，多串齐烤时易手满阻塞。
6. **上菜后顾客无进食反馈、订单卡完成态无样式类区分、小费与目标额缺失（沿用 `B-080` / `B-124` / `B-065` / `B-125`）**：1 号桌上菜后顾客仅静坐；订单卡 `.card` 上菜前后 `className` 均为 `card`（无 `done`/`served` 等状态类），仅文本从 `¥48 · 等待` 变为 `¥48 · 用餐中`，进度环仍是 `22×22` 同位置；且未拆出 `+¥14` 小费、顶栏无 `¥180` 目标额导致 `¥62` 仍显示 `1★` 缺乏正反馈（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/land-06-served.png`）。
7. **竖屏底距差 `8px` 与场景边界穿插（沿用 `B-103` / `B-114`）**：竖屏摇杆底 `822` 与动作键底 `814` 不齐平；后墙绿檐上方仍露越界木地板、扎染布幔穿檐、`t1` 桌左后方斜插竹编方块（`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-03-chop-progress.png`、`/www/yunnan-bbq-house/e2e/review/2026-11-22T01-08Z-r26/port-06-served.png`）。
8. **控制台 2 条 Three.js 弃用告警待清理**：双端每局稳定输出 `THREE.Clock ... deprecated` 与 `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`，需迁移为 `THREE.Timer` 与 `PCFShadowMap` 以保持控制台零告警。

### 与本轮 SPEC 的差距
- **`GAME-DESIGN.md §1（核心循环）`**：规定「切配台 → 点按 3 次 → 切好的串」「炭火烤炉(3 烤位) → 放串 → 6s 熟(金黄) / 12s 焦(废料)」。实测切配需 5 次按下（放+切×3+取）；烤炉看不到 3 烤位分格与槽位序号，且 3px 肉块无法靠肉眼区分金黄与焦黑。
- **`GAME-DESIGN.md §7（手感与反馈）`**：规定「切：台面上的串跳切 + 进度环」「烤熟：串变金黄 + "叮"+ 站点上方飘烟变金；烤焦：变黑 + 灰烟」「收款：桌面飘 `+¥xx` 上浮文字 0.8s，HUD 营业额滚动」。实测切配使用 `64×8` 直条而非进度环且无跳切反馈；烤熟无 "叮"（`AudioContext` 为 0）、肉块过小看不出变金/变黑与金烟/灰烟；`.popup` 动画时长 `2.2s` 长于 `0.8s`（实测上菜当帧 `#bbq-popups .popup` 竖屏 `84.1×34 @(84.6,238.2)` / 横屏 `84.1×34 @(147.9,53)`，与订单卡交叠面积 `0` 且 `.bubble` 数量已为 `0`）。
- **`ART-DIRECTION.md §3（灯光 — Saltline 规则）`**：要求暖光池、炭火点光、台面湿反与 `FogExp2` 远景衰减同时保证食材明度可读。实测竖屏暖光池层次较好，但烤网前沿高光过强反吞没 3px 烤串可读性，横屏吊灯全部出画导致餐区暖光池退化，静态帧读不出雾效层次。
- **`ART-DIRECTION.md §5（UI 皮肤）`**：规定「HUD ≥13px」「ok `#9ecb6a`」与订单卡/面板清晰不互相压。实测动作键 `.cap` 字号仅 `12px`（低于 `≥13px`），6 字文案 `取回切好的串` `capW=72px` 左右边距仅 `6px`（无溢出但触边风险高）；订单卡 `.card` 上菜前后 `className` 都是 `card`（无 `done`/`served` 等状态类与 `#9ecb6a` 完成态区分，进度环仍是 `22×22` 同位置）；竖屏 `.cb` 覆盖厨师头部、横屏摇杆覆盖垃圾桶与五花肉箱。

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
