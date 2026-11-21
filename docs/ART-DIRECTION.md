# 美术方向 — 胡闹厨房构图 × Saltline 灯光

参考：`docs/reference/oc1..4.jpg`(官方 OC 截图，仅参考不入库)。
可执行参数均落在 `src/config.ts`，本文件是权威规则。

## 1. 镜头 (Overcooked 规则)

- `OrthographicCamera`，俯角固定 **50°**(绕 x 轴 -50°)，不随玩家旋转。
- 取景夹紧到世界（B-025 后实现，`src/core/cameraRig.ts`）：
  正交相机 `pitchDeg` 俯视，屏幕竖直半高 `halfH` 对应的**地面进深** =
  `2*halfH/sin(pitch)`（屏幕竖直方向以 sin(pitch) 投影到地面 z 轴）；
  可见半宽恒为 `halfW = halfH*aspect`。
  `worldHalfW = GRID.cols/2 = 6`、`worldHalfD = GRID.rows/2 = 4.5`。
  - 横屏（aspect ≥ 1）：`halfH = min(worldHalfW/aspect, worldHalfD*sin(pitch))`，
    `halfW = halfH*aspect`（宽、深两个方向都不超过世界）；
  - 竖屏（aspect < 1）：`halfH = min(portraitHalfH=9, worldHalfW/aspect)`
    （保持旧变焦，但绝不宽出世界）。
- lookAt 目标夹紧：`x ∈ ±max(0, worldHalfW-halfW)`、
  `z ∈ ±max(0, worldHalfD - halfH/sin(pitch))`。
  **可见地面永远落在 12×9m 世界里，看不到虚空；视野比世界大时锁定居中。**
- ~~`halfH = clamp(max(4.8, 6.8/aspect), 4.8, 9)`~~ 已废：844×390 下给出
  ≈20.7m 视野 > 12×9m 世界，是 B-025 横屏黑边的根因。
- 相机跟随：目标 = 玩家位置，lerp 系数 0.12/帧(60fps 基准,dt 归一)，无震动；
  跟随目标经上面的 lookAt 夹紧后才落相机。
- 玩家在画面中偏下：lookAt 目标向 -z 偏移 1.2m（偏移后同样参与夹紧）——**仅竖屏及 aspect < 1.5**。
- **横屏 lens（aspect ≥ 1.5，B-072）**：`halfH/halfW` 仍按上面的横屏公式（844×390 → `halfH≈2.773`、
  `halfW=6`、可见地面进深 ≈7.24m），但 look-ahead 改为按 `halfH` 反算、朝 **+z（台面排）**：
  点 `(y, z)` 在屏幕中心上方 `y·cos(p) − (z − lookZ)·sin(p)`；要求玩家位于 `z ≥ benchFromZ=0`
  （出生行起）时台面中线 `(benchTopY=0.72, benchZ=3.0)` 高出屏幕下缘 `hudBottomPx(96)+hudMarginPx(2)`：
  `lookAheadZ = max(0.4, benchZ − (halfH − band + benchTopY·cos p)/sin p − benchFromZ)`，
  `band = (96+2)/vh · 2·halfH`（844×390 → `lookAheadZ≈0.595`）。结果**照样经过上面的 lookAt 夹紧**
  （844×390 `limZ≈0.88`），视野永不越出 12×9m 世界，且走到餐区（`t1..t3` 使用格 z=-1.2）时
  `lookZ≈-0.60` 仍能完整框出三桌光圈与气泡。参数见 `config.ts CAMERA.landscape*/bench*/hud*`。
- **工作站必须完整可见（横屏硬规则）**：`crate-pork/mush/mix`、`grill`、`plate` 的台面中线与台上物
  （y=0.72…1.0m）`worldToScreen` 必须 `y ≤ vh−96`、`x ∈ [0,vw]`，整个台身（前沿底角/后沿顶角）在视口内；
  横屏在出生点及各站点使用格都成立，竖屏在各站点使用格成立。走到餐区（z<0）时镜头随玩家转向餐桌，
  这是 7.24m 进深下的取舍。回归：`e2e/landscape.mjs`。
- 横屏摇杆 112px（竖屏 128px），底距 `max(16px, env(safe-area-inset-bottom))`，左 16px；动作键同步贴底距 `max(16px, env(safe-area-inset-bottom))`。

## 2. 构图与配色

- 厨房 = 1m 模块台面，沿墙 L 形，中间留动线；餐区在屏幕上半(远)。
- 低饱和暖灰底：地板 `#3a3430`(木纹)、墙面 `#4a4238`、台身 `#332b24`；
  **高饱和暖色只给**：食材/炭火/围裙/辣椒串/扎染。
- 食材色板：五花肉 `#e8907c`+`#f5d0b8` 纹理、菌子 `#a97b4f`、米线 `#e8c96a`、
  烤熟统一偏 `#d98a3d` 金边、焦 `#241d18`。
- 云南元素：竹编托盘/筐(编织纹)、土陶罐、干辣椒串(红)、青瓦檐口线、
  扎染布幔(靛蓝白花)、木炭炉、干菌子筐。
- 角色 Q 版：头:身 = 1:1.6(头径 ≈0.42m，全身 ≈1.1m)，圆柱无手指手臂，
  围裙色区分：玩家 `#d94f30` 朱红 + 白厨师帽；顾客随机低饱和便服。

## 3. 灯光 (Saltline 规则 — 差异化锚点)

| 项 | 参数 |
|---|---|
| Tonemap | `ACESFilmicToneMapping`, exposure **1.05** |
| 环境 | `PMREMGenerator` 程序化场景(暖天光顶 + 四周暖墙反射) → `scene.environment`, `environmentIntensity ≈ 0.55` |
| 炭火关键光 | 每个烤炉 `PointLight`, 1800K≈`#ff8a3c`, intensity 6, distance 4, decay 2；炭堆 `MeshStandardMaterial` emissive `#ff5a1e` emissiveIntensity 2.2；flicker ±8%(sin+噪声,每炉随机相位) |
| 吊灯 | 3 盏(餐区上)：2700K≈`#ffb46b` PointLight intensity 2.2 distance 5 + 体积光锥 `ConeGeometry`, additive, opacity 0.06, 顶半径 0.18→底 0.85, 高 2.4m |
| 雾 | `FogExp2(0x2a2118, 0.03)` 远景衰减 |
| 阴影 | 1 盏 DirectionalLight(暖白 `#ffe6c4`, intensity 1.6) 1024 shadowMap, `normalBias 0.02`, ortho shadow 相机包全场；点光不投影 |
| 台面 | `roughness 0.35 metalness 0.1` + envMap → 反炭火暖光(湿反) |
| 补光 | HemisphereLight(顶 `#6b5a48` / 地 `#2a2118`, 0.5) 保底食材可读 |

**不要** OC 式无阴影平光；要 Saltline 式暖光池 + 明暗层次，但食材明度必须
可读(暗部 luminance ≥ 场景 p10 不被雾吃死)。

## 4. 材质/贴图预算

- 全部程序化 canvas 生成(≤8 张 512–1024)：木地板、墙面、台面木、竹编、
  扎染、辣椒串装饰、菜单黑板、炭块bump。
- 几何：共享 unit geo + `InstancedMesh`(台面身/地砖缝/烤位/椅子/辣椒粒)。
- 预算：draw calls ≤120，三角面 ≤150k，`renderer.info` 挂 `window.__perf` 供回归。

## 5. UI 皮肤

- 面板：`border-radius 12px; background rgba(24,16,12,.72);
  backdrop-filter blur(10px); border 1.5px solid rgba(232,180,90,.55)`。
- 字色：主 `#f5e8d8`、数字 `#f0c060`(600+)、警示 `#e05a3a`、ok `#9ecb6a`。
- 字号：HUD ≥13px；按钮图标用内联 SVG(禁 emoji 占位)。**横屏不降级**（B-076）：矮屏
  `@media (max-height:450px) and (min-width:600px)` 只许改位置/宽度/间距，禁止缩字；
  订单卡 `.nm/.pr` 两端都 13px、`.tb-badge` 14px。
- 订单卡：右上竖排 ≤3 张，含 SVG 倒计时环(金→红)。横屏改为加宽卡片（`max-width 168px`）+
  两行文字列（菜名 / 价格·状态），`top:150px` 竖排，夹在桌位光圈与动作键之间，不压状态条、不越右缘。
