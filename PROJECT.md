# 修仙回合制游戏 — 项目交接文档

> **用途**：新会话/新协作者读完这一份即可无损接手开发，无需回溯历史对话。
> **最后更新**：2026-08-13（commit `5a293a5`）

---

## 1. 项目概览

| 项 | 内容 |
|---|---|
| 类型 | 纯前端回合制修仙网页游戏 |
| 最终目标 | 微信小程序（当前先做 H5 验证玩法） |
| 线上地址 | https://jamesth258.github.io/--game/ |
| 仓库 | https://github.com/Jamesth258/--game （分支 `master`，GitHub Pages 自动构建） |
| 技术栈 | 原生 HTML5 + Canvas + JS，**零框架零构建**，单文件为主 |
| 存档 | `localStorage`，key = `wuxia_save` |
| 联网 | 腾讯云 CloudBase（`assets/vendor/tcb.js` + `config.js`），**当前未启用**，渐进增强设计（离线可完整玩） |

**设计原则**：离线优先。所有联网功能（排行榜等）必须在未配置云环境时优雅降级，不阻塞主流程。

---

## 2. 文件结构

> **2026-08-13 更新：已完成模块拆分**（原 1275 行单文件 → 骨架 + css + 6 个 js 模块）。
> 拆分后各模块可安全并行开发，详见 §14。

```
/
├── index.html          ← 骨架（~145 行）：<link css> + 10 个 <script src>，不含任何逻辑
├── css/
│   └── style.css       ← 全部样式（原 index.html 7–249 行）
├── config.js           ← CloudBase 环境配置（当前为空占位）★根目录、先于 js/ 加载
├── cultivation.js      ← 境界体系（纯计算，无 DOM 依赖）★关键模块，根目录、先于 js/ 加载
├── online.js           ← 联网层（排行榜等，渐进增强）★根目录、最后加载
├── assets/
│   ├── vendor/tcb.js   ← CloudBase 前端 SDK 助手（index.html 第一个 <script>）
│   ├── select/         ← 6 角色立绘 + 头像 + 登录背景
│   │   ├── m1_warrior.png / m2_young.png / m3_daoist.png
│   │   ├── f1_loli.png / f2_hot.png / f3_mature.png
│   │   ├── avatar_head.png   ← 顶部栏头像（头部特写）
│   │   └── bg_login.jpg
│   └── char/
│       ├── char_m2.mp4       ← M2 角色动图（294KB，已压缩）
│       └── char_m2_orig.mp4  ← 原始 7.1MB 备份（勿上线用）
├── js/
│   ├── core.js         ← canvas 常量 / 素材加载 / openModal+closeModal / saveGame / window.onerror 红条兜底
│   ├── player.js       ← ATTR_KEYS/NAMES、player 对象、recalcStats、saveGame/loadGame
│   ├── battle.js       ← nodes 地图、回合制战斗状态机、Canvas 渲染
│   ├── hub.js          ← HUB_MENU_ITEMS、calcCombatPower、syncRealmDOM、refreshHub、showAttrModal
│   ├── create.js       ← CHARACTERS、角色创建流程、checkSavedCharacter
│   └── main.js         ← 启动入口（创建流程 + 存档恢复 + 首帧渲染）
├── design/             ← 设计文档
│   ├── 角色与选人设计.md
│   ├── 角色动图与主体库.md      ← 即梦主体库 + 9:16 视频提示词
│   └── 属性与加点系统设计.md    ← 属性框架 + 经验曲线定稿
└── .workbuddy/memory/  ← 开发日志（按日期）
```

**加载顺序铁律**（非 module 脚本，按 index.html 中 `<script>` 出现顺序执行）：
`tcb.js → config.js → cultivation.js → js/core.js → js/player.js → js/battle.js → js/hub.js → js/create.js → js/main.js → online.js`
- `cultivation.js` / `config.js` / `online.js` 在**根目录**，`js/*.js` 在子目录，顺序由 index.html 决定，与目录无关
- 顶层 `const`/`let` 是脚本级绑定，**不挂 `window`**；跨文件引用靠「同全局词法作用域 + 加载顺序」而非 `window.X`（见坑点 8）

---

## 3. index.html 分区地图（行号）

> **⚠️ 已过时**：下表是拆分前「1275 行单文件」的行号地图，拆分后 index.html 仅剩骨架（~145 行）。
> 拆分后的代码位置见 §2 文件结构 + §14，各模块内部行号以对应 `js/*.js` 文件为准。

（历史参考 — 拆分前单文件行号）
| 行号 | 内容 |
|---|---|
| 7–250 | `<style>` 全部 CSS（弹窗 / 创建界面 / 主页 / 进度条）→ 现 `css/style.css` |
| 276–330 | 角色创建界面 HTML（3 步：名字 → 性别 → 形象）→ 现 `index.html` 34–86 行 + `js/create.js` |
| 331–369 | 游戏主页 HTML（顶部栏 + 中央人物区 + 底部）→ 现 `index.html` 88–126 行 + `js/hub.js` |
| 371–374 | 全局弹窗容器 `#modal` → 现 `index.html` 128–131 行 |
| 379+ | 主 `<script>` |
| 402–406 | `esc()` / `openModal()` / `closeModal()` 全局工具 |
| 422 | `saveGame()` |
| 437–453 | 属性/功法/挂机常量 |
| 456–470 | `gainXp()` / `applyOfflineXp()` |
| 472–505 | `player` 对象 + `recalcStats()` ★核心数据模型 |
| 507–518 | 地图节点 + 战斗状态 |
| ~947 | `syncRealmDOM()` ★境界/进度条唯一数据源 |
| ~960 | `refreshHub()` 主页刷新 |
| ~985 | 挂机 tick（`setInterval` 每秒） |
| ~1000 | `showAttrModal()` 属性弹窗（含加点） |
| ~1053 | `showSkillsModal()` 功法弹窗 |
| ~1217 | `checkSavedCharacter()` 存档恢复 |

---

## 4. 核心数据模型

### player 对象
```js
{
  name, sect, avatarId,          // 身份
  xp,                            // 修为（唯一等级来源，境界由 xp 推导）
  score,                         // 积分
  con, str, sou, spd, com, des,  // 6 项基础属性，初始各 10
  spent,                         // 已分配点数
  learned: ['xuanfeng','xuanyin'], activeSkill,
  lastSeen,                      // 离线结算用时间戳
  // 以下为 recalcStats() 派生，勿手动改
  maxHp, def, atk, maxMp, spiAtk, spiDef, init, eva, luck, xpBonus,
  hp, mp
}
```

### 6 属性含义
| key | 名称 | 主要影响 |
|---|---|---|
| `con` | 体质 | 生命上限、物理防御 |
| `str` | 力量 | 物理攻击 |
| `sou` | 灵魂 | 精神攻击、精神防御 |
| `spd` | 速度 | 先攻值、闪避率、**多段先攻次数** |
| `com` | 悟性 | 灵力上限、挂机加成 |
| `des` | 天命 | 闪避率、幸运值、挂机加成 |

### 派生公式（`recalcStats()`，idx = 境界小阶序号）
```
maxHp  = 100 + con*20 + idx*100
def    = 10  + con*2  + idx*2.5
atk    = 20  + str*2  + idx*8
maxMp  = 100 + com*20 + idx*100
spiAtk = 20  + sou*2  + idx*10
spiDef = 10  + sou*1  + idx*2
init   = 10  + spd*2  + idx*2
eva    = 10% + idx*0.1% + spd*0.1% + des*0.1%
luck   = des
xpBonus= (com + des) * 0.002        // 悟性/天命各 0.2%/点 挂机加成
```

### 加点规则
- 开局基础 `BASE_FREE_POINTS = 10` 点
- 每突破一小阶 `POINTS_PER_STAGE = 10` 点
- 可分配 = `BASE_FREE_POINTS + 境界小阶序号 * 10 - spent`
- 属性下限 10（不可减到 10 以下）

---

## 5. 境界体系（cultivation.js）

**26 个大境界 / 168 个小阶**，从「炼气境 第一重天」到「宇宙国主 圆满」。

```
炼气→筑基→真武→化海→金丹→元婴→出窍→破虚（各9重天）
渡劫→超脱（各前中后期+圆满）
人仙→地仙→天仙→真仙→金仙→玄仙→仙君→仙帝（各4阶）
圣境(圣君/圣主/圣尊)→虚神→真神(各9重天)→神王境(3阶)
混沌境(9阶)→主宰(初/中/高/巅峰)→宇宙神(9重天)→宇宙国主(4阶)
```

### 经验曲线
```js
req(i) = 200 + 20*i + 24*i²     // i = 小阶序号，0 起
```
- 第 1 阶 200（≈2 分钟在线）
- 满级总修为 ≈ **3724 万**
- 挂机速率：在线 2/秒，离线 1/秒（封顶 12h/天）
- **设计目标：至少玩一年才满级**（肝帝 8h/天 ≈ 1.01 年，休闲 1h/天 ≈ 2.02 年）

### 关键 API
```js
const r = CULTIVATION.realmFromXp(player.xp);
r.label        // "筑基境 第四重天"
r.progress     // 0~1 当前小阶进度
r.xpIntoStage  // 当前小阶已攒
r.xpForStage   // 当前小阶所需
r.globalIndex  // 小阶全局序号（0 起）★加点和派生属性都用它
r.isMax
```

---

## 6. 战斗机制

- **回合制**，先攻值决定行动顺序
- **多段先攻**：速度比敌方高 N 倍时获得多次行动
  `n = floor(ratio / 2) + 1` → 2× 得 2 次，4× 得 3 次，10× 得 6 次
  另有 `extraActions` 装备 hook 预留
- **伤害类型**：
  - 普攻 → 恒为物理（`phys`），受 `def` 减免
  - 功法 → 分 `phys` / `spirit` 两类，`spirit` 受 `spiDef` 减免
  - **两类伤害都扣同一条血**（单血轴设计，非双血条）
- **闪避**：`eva` 概率完全免伤
- **灵力**：每个功法自带 `cost`，不足则无法释放

### 当前功法表
| id | 名称 | 类型 | 倍率 | 灵力 |
|---|---|---|---|---|
| `xuanfeng` | 旋风剑法 | phys | ×1.8 | 12 |
| `xuanyin` | 玄阴指 | spirit | ×1.6 | 15 |

---

## 7. 挂机系统

- **在线**：停留在主页/地图/战斗任一界面即累加（`state` 判断），每秒 `2 * (1 + xpBonus)`
- **离线**：`applyOfflineXp()` 按 `Date.now() - lastSeen` 结算，`1/秒`，封顶 12 小时
- 落盘：每 5 秒 `saveGame()` 一次
- 离线收益 > 0 时弹「离线挂机结算」弹窗

---

## 8. ★已知坑点（务必先读，避免重蹈）

### 8.1 `const` 声明不挂 window（花了 4 次修复才找到）
`cultivation.js` 用 `const CULTIVATION = (function(){...})()` 声明。
**ES6 `const`/`let` 是脚本级绑定，不会成为 `window` 的属性**（只有 `var` / 函数声明才会）。

❌ 错误：`if (!window.CULTIVATION) return;` → 恒为 undefined，静默早退
✅ 正确：`if (typeof CULTIVATION === 'undefined') return;`

**推论**：跨 `<script>` 文件共享变量时，要么显式 `window.X = ...`，要么用 `typeof` 守卫。

### 8.2 静默失败的守卫子句最难查
症状「没报错、没异常、功能就是不动」时，**第一动作是在守卫处加 `console.warn` 打印**，让用户截控制台。不要反复重构调用时机——前 3 次修复（缓存 → z-index → 刷新时机 → 重复代码）全部猜错，只有加日志才一击命中。

### 8.3 CSS 特异性覆盖
`.modal-box button { width:100% }`（特异性 0-2-0）会覆盖 `.alloc-btn { width:22px }`（0-1-0），把小方钮撑成长条。
→ 全宽规则已隔离成 `.btn-full` class，只作用于关闭按钮。

### 8.4 z-index 层级
```
错误红条  9999
弹窗 .modal  200   ← 必须高于主页
创建页       100
主页 #hub-screen  90
```
曾因弹窗 z-index=50 低于主页 90，导致「点击没反应也没报错」（弹窗开在主页背后）。

### 8.5 视频体积
主页角色视频必须压缩到 300KB 以内，7.1MB 原片会导致明显卡顿。
压缩命令（imageio-ffmpeg，H.264 / 720p / 去音轨）：
```bash
ffmpeg -i in.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -an out.mp4
```

### 8.6 GitHub Pages 缓存
HTML 的 `Cache-Control` 无法用 `<meta>` 覆盖。破缓存只能靠：
- `Ctrl+Shift+R` 硬刷
- URL 加 query：`?v=5`

### 8.7 主页 render 性能
`render()` 在主页状态必须暂停，否则 60fps 空转导致卡顿。

### 8.8 git push 网络不稳
本环境 `git push` 常报 `Recv failure: Connection was reset`，**重试 2–3 次即可成功**（有时需 `sleep 5`）。

---

## 9. 数据同步铁律

主页境界/进度条的**唯一数据源**是 `syncRealmDOM()`，它读 `CULTIVATION.realmFromXp(player.xp)` 并写入 4 个 DOM：
```
#hub-realm     境界全名（"筑基境 第四重天"）
#hub-xp-fill   进度条填充宽度（%）
#hub-xp-realm  进度条上的境界名（只取"筑基境"）
#hub-xp-nums   "已获/所需"
```

**4 个调用入口**（新增功能若改动 xp，必须调用它）：
1. `refreshHub()` — 进入主页
2. 挂机 tick — 每秒
3. `showAttrModal()` — 打开属性弹窗前
4. `showSkillsModal()` — 打开功法弹窗前

> 禁止在别处内联复制境界刷新代码，必须调 `syncRealmDOM()`。

---

## 10. 开发工作流

### 改完代码必做
```bash
# 1. 验证内联 JS 语法（单文件游戏没有构建步骤，语法错会白屏）
node -e "
const fs=require('fs'),html=fs.readFileSync('index.html','utf8');
const s=html.indexOf('<script>\nconst canvas'),e=html.indexOf('</script>',s+9);
try{new Function(html.substring(s+8,e));console.log('JS syntax OK')}catch(err){console.log('SYNTAX ERROR:',err.message);process.exit(1)}
"

# 2. 提交推送（网络不稳，失败重试 2-3 次）
git add -A && git commit -m "描述" && git push origin master
```

### 验证
硬刷 `Ctrl+Shift+R` 或访问 `https://jamesth258.github.io/--game/?v=N`

---

## 11. 已完成功能

- ✅ 3 步角色创建（名字 / 性别 / 6 形象选择）
- ✅ 游戏主页（头像 + 名字 + 战力 + 境界 + 经验进度条 + 菜单栏 + 角色动图）
- ✅ 6 属性自由加点系统（含派生属性实时计算）
- ✅ 168 小阶境界体系 + 一年期经验曲线
- ✅ 回合制战斗（多段先攻 / 物理+精神双类型伤害 / 闪避 / 灵力消耗）
- ✅ 功法系统（**已落地**：130 种 `js/skills-data.js` + GDD `design/功法系统GDD.md`；装备上限 6 + 每回合点选；10 类 ×10 渠道；buff/debuff/shield/stun/heal 状态机已接战斗）
- ✅ 挂机修炼（在线 + 离线结算）
- ✅ localStorage 存档
- ✅ 暗色主题弹窗系统（属性 / 功法 / 排行榜 / 离线结算）
- ✅ 地图节点推进（线性解锁）
- ✅ 装备系统（4 部位 / 5 品质 / 背包 / 灵石锻造 / 战斗 extraActions 连动 hook）
- ✅ 背包弹窗（装备/出售/▲更优对比）+ 商店弹窗（灵石购买随机品质装备），均接 `window` 回调

## 12. 待办路线图（建议优先级）

**P0 — 玩法闭环**
- [x] 装备系统（4 部位：武器/护甲/法宝/战靴；5 品质：凡/灵/宝/仙/神；背包 + 灵石锻造 + 极品追加 extraActions 连动；store/load/战斗已集成）
- [x] 背包弹窗（装备/出售/同部位更优对比）+ 商店弹窗（灵石购买随机品质装备），接 `window` 回调
- [x] 功法系统接入战斗（**已完成**）：`equippedSkills`(≤6) 替代单 `activeSkill`；战斗中每回合从指令栏点选已装备功法；`applySkill` 处理 dmg/shield/heal_hp/heal_mp/buff/debuff/stun/absorb/critup/lifesteal/pierce 全部 effect；`damage` 接入 buff/debuff/shield/crit 乘区；`beginRound` 接入 stun 跳过 + 状态衰减；`endBattle` 加功法掉落（BOSS 60%/普通 20%）；`hub.js` 功法弹窗改为 6 槽装备 + 功法库点选 + 功法秘库（灵石兑换）；`index.html` 在 player.js 后引 `js/skills-data.js`；存档兼容旧 `activeSkill` 字段
- [x] 获取渠道落地情况：`shop`(秘库灵石兑换) / `boss`(战斗掉落) / `levelup`(境界突破领悟，待接) / `signin` / `sect` / `arena` / `event` / `achievement` 渠道标签已设；`dungeon`(14) 与 `exchange`(13) 渠道的功法已标 `lockedUntil`，待剧情副本系统上线后开放获取，目前不可习得（不崩）

**P1 — 内容量**
- [x] 更多地图 / 关卡 / BOSS（nodes 由 4 → 12 节点，BOSS 由 1 → 5：魔教教主/幽冥谷主/血河神君/剑魔独孤/逍遥天主；数值 hp 280→1300 平滑成长；BOSS 节点红色描边；通关提示读取真实敌名）
- [ ] 剩余 5 角色的动图（M2 已完成，见 `design/角色动图与主体库.md`）
- [ ] 突破仪式动画/反馈

**P2 — 系统深化**
- [ ] 宗门系统（`player.sect` 字段已预留但未使用）
- [ ] 联网排行榜（`online.js` + CloudBase，需配 `config.js`）
- [ ] 成就 / 任务系统

**P3 — 平台迁移**
- [ ] 微信小程序适配（Canvas API 差异 / localStorage → wx.storage / 9:16 竖屏已按此设计）

---

## 13. 多任务并行协作方式（WorkBuddy 工作空间）

依据官方文档《任务管理》，左侧栏「**空间**」板块 = 工作空间，是官方支持的多 Agent 协作载体。

**能力**（官方原文）：
- 可开启**多个 Agent 同时协作**
- 在任务列表中持久保存
- 随时用 IDE 打开查看

**操作方式**：
1. 在任务卡片右键 → 「**保存到工作空间**」，把本项目固化为工作空间
2. 之后在该工作空间上右键 → 「**新建任务**」，开启新任务
3. 同一工作空间下的多个任务：**共享同一份代码/工作目录，但各自独立上下文**

**优势**：
- 上下文不再累积膨胀（每个任务从零开始，读 PROJECT.md 即可接手）
- 可同时开多个任务并行开发不同模块
- 任务持久保存，可随时回看历史

**注意**：并行任务若同时修改**同一文件**仍会互相覆盖 → 但已完成模块拆分（§14），只要把并行任务按「一个 Agent 改一个模块文件」分工（如 A 改 `js/battle.js`、B 改 `js/hub.js`），即可安全并行，不会互相踩。

---

## 14. 模块拆分已完成（并行开发前置条件已满足）

**2026-08-13 已落地**：原 `index.html` 1275 行单文件 → `index.html` 骨架(~145 行) + `css/style.css` + 6 个 `js/*.js` 模块。

**实际落地的文件布局**：
```
index.html        骨架 + <link css> + 10 个 <script src>（不含任何逻辑）
css/style.css     全部样式
config.js         根目录，CloudBase 环境配置
cultivation.js    根目录，境界体系（★关键模块）
online.js         根目录，联网层
assets/vendor/tcb.js   CloudBase 前端 SDK 助手
js/core.js        canvas 常量 / 素材加载 / 弹窗 / saveGame / onerror 兜底
js/player.js      player 对象 + recalcStats + 存档读写
js/battle.js      地图 nodes + 回合制战斗状态机 + Canvas 渲染
js/hub.js         主页 UI + syncRealmDOM + refreshHub + 属性/技能弹窗
js/create.js      角色创建流程
js/main.js        启动入口
```

**拆分验证**（已通过，可放心并行）：
- 代码内容逐字符一致（拆分前后归一化后 35378 字符完全相同）
- 整体拼接 `new Function()` 语法校验无重复声明
- CSS 一致性、资源引用存在性、DOM id 存在性、HTML 标签配平（div 43=43、script 10=10）全部通过
- 10 个 `<script src>` 指向的文件全部存在
- 每个模块 `node --check` 语法通过

**并行开发约定**：
- 不同 Agent 认领不同模块文件（见 §2 加载顺序，互不重叠即可并行）
- 跨文件共享变量**不要**用 `window.X`，靠「同全局词法作用域 + 加载顺序」即可（见坑点 8）
- 新增全局常量/函数名避免与已有模块顶层 `const` 重名
- 改 `index.html` 骨架或新增 `<script>` 顺序时务必同步更新 §2 加载顺序铁律

---

## 15. 候选素材库（即梦生成，待分配）

> 2026-08-13 由用户从 `G:\即梦\仙侠世界\` 规整进来，**仅归档、未接入游戏逻辑**。接入时按角色分配 `video`/`img` 字段（见 §2 `CHARACTERS` 表）。

**角色动图候选**（`assets/char/`，原画质；接入前建议用 ffmpeg 压到 ~300KB 保证国内 Pages 加载快，做法参见开发日志 8-13「M2 视频压缩」）：

| 文件名 | 原始描述 | 体积 | 疑似对应角色 |
|---|---|---|---|
| `cand_vid_5352_curly_hair_smile.mp4` | 镜头固定·微微侧头·撩开额前微卷黑发·温润一笑 | 6.8MB | 少年侠客(m2) 吻合度最高 |
| `cand_vid_3219_lazy_tuck_smile.mp4` | 镜头固定·慵懒挽微卷长发到耳后·抬下巴·温润浅笑 | 6.4MB | 温婉御姐(f3)/少年侠客(m2) 待定 |
| `cand_vid_3934_fist_clench.mp4` | 镜头固定·正面站立·双拳握紧·小臂肌肉微绷·深吸气 | 8.3MB | 铁骨武者(m1) 吻合度最高 |

**立绘候选**（`assets/select/`，UUID 命名，需预览确认角色归属）：

- `23eba4ba-….png`(987KB)、`2683c3ff-….png`(1055KB)、`2ce15b71-….png`(1034KB)、`71cb0f1b-….png`(1022KB)、`874ad666-….png`(975KB)
- `97c97de4-….png`(372KB)、`b1c9308d-….png`(174KB)、`bd119d8c-….png`(358KB)、`d3a335ed-….png`(243KB)、`fa85f5f5-….png`(1034KB)
- 以上 10 张为即梦角色立绘，文件名无描述，接入前需逐张预览匹配 m1~m3 / f1~f3
- `jimeng-2026-08-11-9419-…仙山峰顶….png`(3.9MB) → 仙侠场景空镜（云雾仙山峰顶），可作登录背景 `bg_login.jpg` 候选或地图节点背景
- `微信图片_2026-08-11_144336_705.png`(1.5MB) → 疑似微信截图，是否游戏素材待确认

**接入方式**：分配时改 `js/create.js` 的 `CHARACTERS` 表对应角色的 `img`/`video` 字段（视频先压缩再接）。具体哪个候选对应哪个角色，等用户统一指定。
