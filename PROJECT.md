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

```
/
├── index.html          ← 主文件（1275 行）：CSS + HTML + 主逻辑，含创建/主页/地图/战斗/弹窗
├── cultivation.js      ← 境界体系（纯计算，无 DOM 依赖）★关键模块
├── config.js           ← CloudBase 环境配置（当前为空占位）
├── online.js           ← 联网层（排行榜等，渐进增强）
├── assets/
│   ├── select/         ← 6 角色立绘 + 头像 + 登录背景
│   │   ├── m1_warrior.png / m2_young.png / m3_daoist.png
│   │   ├── f1_loli.png / f2_hot.png / f3_mature.png
│   │   ├── avatar_head.png   ← 顶部栏头像（头部特写）
│   │   └── bg_login.jpg
│   ├── char/
│   │   ├── char_m2.mp4       ← M2 角色动图（294KB，已压缩）
│   │   └── char_m2_orig.mp4  ← 原始 7.1MB 备份（勿上线用）
│   └── vendor/tcb.js
├── design/             ← 设计文档
│   ├── 角色与选人设计.md
│   ├── 角色动图与主体库.md      ← 即梦主体库 + 9:16 视频提示词
│   └── 属性与加点系统设计.md    ← 属性框架 + 经验曲线定稿
└── .workbuddy/memory/  ← 开发日志（按日期）
```

---

## 3. index.html 分区地图（行号）

| 行号 | 内容 |
|---|---|
| 7–250 | `<style>` 全部 CSS（弹窗 / 创建界面 / 主页 / 进度条） |
| 276–330 | 角色创建界面 HTML（3 步：名字 → 性别 → 形象） |
| 331–369 | 游戏主页 HTML（顶部栏 + 中央人物区 + 底部） |
| 371–374 | 全局弹窗容器 `#modal` |
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
- ✅ 功法系统（出战切换）
- ✅ 挂机修炼（在线 + 离线结算）
- ✅ localStorage 存档
- ✅ 暗色主题弹窗系统（属性 / 功法 / 排行榜 / 离线结算）
- ✅ 地图节点推进（线性解锁）

## 12. 待办路线图（建议优先级）

**P0 — 玩法闭环**
- [ ] 装备系统（含 `extraActions` 先攻次数加成 hook，已预留）
- [ ] 背包 / 道具
- [ ] 更多功法 + 功法习得途径

**P1 — 内容量**
- [ ] 更多地图 / 关卡 / BOSS
- [ ] 剩余 5 角色的动图（M2 已完成，见 `design/角色动图与主体库.md`）
- [ ] 突破仪式动画/反馈

**P2 — 系统深化**
- [ ] 宗门系统（`player.sect` 字段已预留但未使用）
- [ ] 联网排行榜（`online.js` + CloudBase，需配 `config.js`）
- [ ] 成就 / 任务系统

**P3 — 平台迁移**
- [ ] 微信小程序适配（Canvas API 差异 / localStorage → wx.storage / 9:16 竖屏已按此设计）

---

## 13. 模块拆分建议（并行开发前置条件）

当前 `index.html` 1275 行单文件，**多人/多 Agent 并行会互相覆盖**。建议拆成：

```
index.html        骨架 + <script src> 引入（~100 行）
css/style.css     全部样式
js/data.js        CHARACTERS / SKILLS / nodes 等常量
js/player.js      player 对象 + recalcStats + saveGame/loadGame
js/cultivation.js （已独立，移入）
js/modal.js       弹窗系统
js/hub.js         主页 UI + syncRealmDOM + refreshHub
js/battle.js      战斗逻辑
js/create.js      角色创建流程
js/main.js        启动入口
```

拆分后不同模块可安全并行开发。
**注意**：拆分时若跨文件共享变量，务必显式 `window.X = ...`（见坑点 8.1）。
