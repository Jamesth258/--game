# 《逍遥仙》迁移与设计归档总索引（ARCHIVE_INDEX）

> **用途**：换机器 / 换仓库 / 换托管平台时，只看本文件即可完整重建游戏，无需从头摸索。
> 最后更新：2026-09-29 ｜ 维护者：WorkBuddy ｜ 配套：`MIGRATION.md`（步骤）、`DEPLOY_MANIFEST.txt`（文件清单）

---

## 0. 当前线上快照（基线）

| 项 | 值 |
|---|---|
| 线上地址 | https://jamesth258.github.io/--game/ |
| 仓库 | `Jamesth258/--game`（master 分支，GitHub Pages 根目录） |
| 最新 commit | `9f1e3a50800c`（2026-09-28 09:38，宝箱批量开启） |
| 上一个 commit | `d7f016fe087d`（竞技场名次跨天持久化） |
| 线上文件总数 | 226（含历史冗余） |
| **运行时清单** | **152 项**（`DEPLOY_MANIFEST.txt`，由 `build_manifest.py` 自动生成） |
| 回归测试 | 12 套件 **329 PASS / 0 FAIL** |
| 存档 key | localStorage `wuxia_save`（备份 key `wuxia_save_prev`） |

---

## 1. 一键迁移 SOP（3 步，约 5 分钟）

### 路径 A：迁到新的 GitHub Pages 仓库（推荐，与当前机制完全一致）

```bash
# 1) 改仓库地址：编辑 deploy_api.py 第 33 行
#   REPO = "新用户名/新仓库"

# 2) 新仓库开启 Pages：Settings -> Pages -> Source = master / root

# 3) 全量推送（自动分批、失败重试 3 次）
python deploy_all.py
```

推送完成后等 1~2 分钟，访问 `https://新用户名.github.io/新仓库/`，
首次访问加 `?v=99` 或 Ctrl+Shift+R 强刷。

> **token**：`deploy_api.py` 自动从项目根 `.deploy_token` 读取（已 gitignore，永不进仓库）。
> 换机器时把这个文件一起带走即可；若丢失，把 GitHub fine-grained PAT 贴进对话让我重建成。

### 路径 B：迁到任意静态托管（Netlify / Vercel / 对象存储 / 自建 Nginx）

本项目**无构建步骤**、纯静态、相对路径，直接整体上传即可：

```bash
zip -@ -r game.zip < DEPLOY_MANIFEST.txt    # 按清单打包（152 个运行时文件）
# 把 game.zip 解压到站点根目录，保持目录结构
```

注意：静态托管没有 GitHub 的 CDN 语义，改文件后无需 bump `?v=N`，但**仍建议保留**（无害）。

### 迁移后自检（必做 5 项）

| # | 检查项 | 方法 |
|---|---|---|
| 1 | 清单完整 | `python build_manifest.py --verify` 应输出 `[OK] 校验通过` |
| 2 | 无 404 | 浏览器 F12 -> Network，刷新后不应有 `assets/**` 或 `js/**` 的 404 |
| 3 | 竞技场可用 | 主页 -> 神魔竞技场，能进且名次不是 1001（验证 `js/arena.js` 已上） |
| 4 | 宝箱图标正常 | 背包里有宝箱时显示写实宝箱图（验证 `assets/items/item_chest_*.png` 已上） |
| 5 | 面板样式正常 | 打开背包/属性，是黑金磨砂面板（验证 `css/scroll-panel.css` 已上） |

---

## 2. 设计文档地图（全部设计资产，迁移时一并带走）

### 2.1 顶层交接文档

| 文件 | 内容 | 备注 |
|---|---|---|
| `PROJECT.md` | 项目交接总文档：数据模型、境界体系、战斗机制、已知坑点 8.x、工作流 | **新人第一份必读** |
| `ARCHIVE_INDEX.md` | 本文件：迁移 SOP + 全部索引 | 迁移时第一份必读 |
| `MIGRATION.md` | 一次性部署指南（含排除噪音清单） | |
| `DEPLOY_MANIFEST.txt` | 运行时文件清单（152 项，自动生成） | 勿手改 |
| `人物立绘提示词.md` | 6 主角（m1-m3 / f1-f3）形象一致性锚点，重画前必读 | 美术 |

### 2.2 系统设计文档（`design/`，14 份）

| 文档 | 对应系统 | 对应代码 |
|---|---|---|
| `游戏设计框架总览.md` | 13 个核心系统全景 + 经济系统 + 铁律 | 全模块（**单一可信存档**） |
| `角色与选人设计.md` | 6 角色设定、选人界面 | `js/avatars.js`、`js/create.js` |
| `角色动图与主体库.md` | 角色动效/立绘资产规范 | `assets/select/`、`assets/battle/` |
| `属性与加点系统设计.md` | 6 属性、加点、派生公式 | `js/player.js`（`recalcStats`） |
| `功法系统GDD.md` | 功法分阶、心法被动、装备限制 | `js/skills-data.js`、`js/battle.js` |
| `装备系统重制设计.md` | 凡/灵/宝/仙/神五阶、25% 卖出价 | `js/equip_db.js`、`js/hub.js` |
| `世界BOSS系统设计.md` | BOSS 竞速、伤害排名、结算 | `js/worldboss.js` |
| `神魔竞技场_系统设计.md` | 虚拟对手、名次爬升、每日结算 | `js/arena.js` |
| `每日奖励系统设计.md` | 签到、每日任务 | `js/daily.js` |
| `百章剧情与副本奖励设计.md` | 100 章剧情、副本奖励曲线 | `js/story-data.js`、`js/story.js` |
| `美术风格规范.md` | 写实古风仙侠厚涂、黑金磨砂底纹、图标 motif 表 | 全部美术资产 |
| `战斗指令按钮_黑金玄铁令符.md` | 战斗按钮视觉规范 | `css/style.css`、`js/battle.js` |
| `游戏设计审查与优化清单.md` | 设计合理性评审、待优化项 | 参考 |
| `BUG审计与迁移归档.md` | 历史 BUG 全审计（严重/中等/轻微）+ 复查 | 归档 |

### 2.3 预览稿（HTML，本地双击可看，不属运行时）

`design/` 下 `attr-panel-designs.html`、`attr-panel-preview.html`、`attr-v1-revamp.html`、
`modal-blackgold-preview.html`、`道具图标设计稿.html`、`图标调整预览v3~v8.html`、`图标风格预览*.html`
—— 均为**设计评审稿**，不在运行时清单内，仅供回看风格演化。

---

## 3. 代码模块地图（15 个 JS + 3 个顶层脚本）

| 文件 | 职责 | 体量 |
|---|---|---|
| `js/main.js` | 启动引导、读档 `checkSavedCharacter()`、状态机、离线挂机结算 | 24 KB |
| `js/hub.js` | 主页、背包、商店、属性面板、图鉴入口（最大模块） | 66 KB |
| `js/battle.js` | 战斗系统（回合、技能结算、立绘、指令按钮） | 61 KB |
| `js/story-data.js` | 百章剧情数据 | 64 KB |
| `js/skills-data.js` | 功法数据库 | 52 KB |
| `js/worldboss.js` | 世界BOSS + 宝箱开启（含批量开启 `openAllChestItems`） | 36 KB |
| `js/arena.js` | 神魔竞技场 | 23 KB |
| `js/equip_db.js` | 装备数据库与随机生成 | 21 KB |
| `js/daily.js` | 每日任务与签到 | 18 KB |
| `js/player.js` | 属性、境界、暴击公式、`gainXp` | 18 KB |
| `js/story.js` | 剧情副本流程 | 16 KB |
| `js/codex.js` | 图鉴收集与里程碑奖励 | 13 KB |
| `js/avatars.js` | 角色与立绘映射 | 8 KB |
| `js/create.js` | 创建角色 | 6 KB |
| `js/core.js` | 存档 `saveGame()`、弹窗、美术素材接口 `art` | 6 KB |
| `cultivation.js` | 境界体系（经验曲线、`realmFromXp`） | 4 KB |
| `online.js` | 在线层（CloudBase 渐进增强，未配 ENV 则完全离线） | 5 KB |
| `config.js` | `window.CLOUDBASE_ENV`（空 = 单机模式） | 0.2 KB |

---

## 4. 开发铁律速查（违反必出线上事故）

| # | 铁律 | 违反后果 |
|---|---|---|
| 1 | **改 JS/CSS 内容必须同步 bump `index.html` 的 `?v=N`** | 用户浏览器缓存旧文件，修复看不到 |
| 2 | **`saveGame()` 新增字段，必须同步在 `checkSavedCharacter()` 还原** | 该字段次日重载丢失（竞技场名次踩过） |
| 3 | **清单勿手改**：改 `build_manifest.py` 后重跑生成 | 迁移漏文件（本次实测漏 45 个） |
| 4 | HTML `onclick` 的函数必须在 window 上（普通 script 顶层 function 自动挂载；ES6 `const/let` 不会） | 点击无反应且无报错 |
| 5 | `?v=N` 只破浏览器缓存，**不参与 GitHub Pages CDN 缓存键**；线上核对请用 contents API，别用域名直接抓 | 误判「没生效」 |
| 6 | 美术：写实古风仙侠 + 黑金磨砂，禁止 flat icon / cartoon 类提示词 | 风格跑偏（曾翻车） |
| 7 | AI 生成素材**用户拍板后必须去水印**再交付 | 带 AI 水印上线 |
| 8 | 改完先 `node --check`，再跑 `test/*.test.js` 全套 | 语法错直接白屏 |

---

## 5. 2026-09-29 全量体检结果

### 5.1 本次发现并修复的问题

| # | 严重度 | 问题 | 根因 | 修复 |
|---|---|---|---|---|
| A1 | 严重（迁移级） | `DEPLOY_MANIFEST.txt` 漏 **45 个**运行时文件：`js/arena.js`、`css/scroll-panel.css`、`assets/vendor/tcb.js`、`assets/icons/icon_arena.png`、`assets/items/` 下 **34 个**装备/宝箱/丹药图标 | 清单手工维护、随功能迭代漂移 | 新增 `build_manifest.py` 从真实引用关系**自动派生**，重生成 152 项并自检 |
| A2 | 中等 | `js/main.js` 竞技场修复（commit `d7f016fe`）改了内容，但 `index.html` 只 bump 了 `hub.js`，`js/main.js?v=37` 未动 | 违反铁律 1 | bump 至 `?v=38` |
| A3 | 轻微 | `core.js` 预载 3 个已废弃路径（`assets/hero.png` / `enemy.png` / `bg_battle.png`），每次启动产生 3 个 404 | 历史 fallback 残留 | `loadImg(空串)` 不发起请求；`art.*` 仍由读档/建号赋值，`ready()` 兜底不变 |

**迁移影响说明**：A1 若未修复，按旧清单迁移会得到「竞技场入口消失 + 面板样式全丢 + 宝箱/装备/丹药图标全裂」的残版游戏——这是本次体检最有价值的发现。

### 5.2 已核验无问题的项（结论留档）

| 检查项 | 结论 |
|---|---|
| 回归测试 | 12 套件 **329 PASS / 0 FAIL** |
| 存档字段一致性 | `saveGame()` 26 字段 与 `checkSavedCharacter()` **全部还原**（含 `bag`/`equipment`/`items`/`learned`/`arena`/`unlockedAvatars`） |
| 线上文件完整性 | 线上 226 文件 覆盖 清单 152 项，**线上不缺文件**（旧清单只是记录滞后） |
| `onclick` 挂载 | 35 个引用全部可达（普通 script 顶层 function 自动挂 window） |
| TODO/占位死代码 | 扫描 10 处命中均为合法用法（placeholder 输入框、`drawPlaceholder` 兜底绘制） |
| 资源 404 | 除 A3 的 3 个废弃路径外无缺失 |

### 5.3 已知非 BUG（设计如此，非缺陷）

| 项 | 说明 |
|---|---|
| 排行榜占位 | `hub.js` 显示「联网功能尚未开启」——`config.js` 的 `CLOUDBASE_ENV` 为空即单机模式；填入环境 ID 后 `online.js` 自动启用云存档/排行榜 |
| `online.js` 渐进增强 | ENV 为空或 SDK 未加载时直接 return，游戏保持纯单机，无任何副作用 |
| `game_standalone.html` | 早期单文件快照，数值与 `js/` 冲突，**已废弃**，不进清单 |
| `assets/vendor/tcb.js` | CloudBase SDK（319 KB），离线模式下不被调用，但 `index.html` 会引用，必须保留 |
| 线上冗余 | 线上比清单多 74 个文件（旧封面、`icon_*_raw.png` 抠图中间态等），不影响运行 |

---

## 6. 变更履历（近期）

| 日期 | commit | 内容 |
|---|---|---|
| 2026-09-28 | `93e4e207` | 主页 6 图标写实古风重设计；`battle.js` null-deref 致命修复（进不去战斗） |
| 2026-09-28 | `d7f016fe` | **竞技场名次跨天持久化**（读档漏还原 `player.arena`）+ 5 个历史遗留测试失败修复 |
| 2026-09-28 | `9f1e3a50` | **宝箱批量开启**（`openAllChestItems`，背包「全部×N」按钮） |
| 2026-09-29 | 本次 | 迁移清单自动生成器 + 版本号 bump 修复 + 404 清理 + 本归档索引 |

---

## 7. 换机器时的最小携带清单

只要带齐这些，就能在任意环境完整重建：

1. **游戏本体**：`DEPLOY_MANIFEST.txt` 列出的 152 个运行时文件（或直接 clone 仓库）
2. **设计文档**：`PROJECT.md`、`ARCHIVE_INDEX.md`、`MIGRATION.md`、`design/*.md`、`人物立绘提示词.md`
3. **部署工具**：`deploy_api.py`、`deploy_all.py`、`build_manifest.py`
4. **回归测试**：`test/*.test.js`（12 套件，非运行时但建议带）
5. **凭据**：`.deploy_token`（gitignore 排除，需手动拷贝，勿提交）

> 第 1~4 项都在仓库里，换机器 git clone 即可；只有第 5 项需单独带。

