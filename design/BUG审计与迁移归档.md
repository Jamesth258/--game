# 《逍遥仙》BUG 审计与迁移归档报告

> 审计日期：2026-09-04 ｜ 审计范围：全量前端（index.html + js/ + css/ + assets/）
> 线上校验：`deploy_api.py --check` 差异文件数 = **0**（本地即线上快照）
> 测试：story.test.js **43/43 通过**；其余 8 个测试文件因**测试桩缺 DOM mock** 无法加载（见 M3，非游戏逻辑 bug）

---

## 一、结论速览

| 严重度 | 数量 | 状态 |
|--------|------|------|
| 🔴 严重 | 0 项未决（3 项历史问题已全部修复/加固） | 已闭环 |
| 🟡 中等 | 2 项未决 + 1 已修复(M3) | 1 设计性未实现(M1) + M2 已确认正常 + M3 测试套件已补全 |
| 🟢 轻微 | 3 项未决 + 1 已处理(m4) | 均不影响运行，m4 水印已去除 |

**核心判断**：游戏可正常运行、可玩、存读档安全。近期连续两次"进不去游戏"事故（initAvatar / refreshHub 未定义）已修复并加防丢档三重保护。剩余问题均为**非阻断性**或可快速处理项。

---

## 二、🔴 严重（历史问题，已全部修复）

### S1 · 读档守卫过严导致旧档误判丢失
- **现象**：旧存档缺 `avatarImg` 字段时，`checkSavedCharacter()` 返回 false → 跳创建界面，玩家以为"人物没了"。
- **根因**：`js/main.js` 守卫 `saved.name && saved.avatarImg` 不向后兼容旧档。
- **修复**（v33）：改为只判 `saved.name`；旧档缺头像时用角色 id 反查立绘兜底（三级兜底链）。
- **验证**：用户控制台诊断确认 `李迪遥` 战力 2,722,918 存档完整存活。

### S2 · 跨文件函数未定义导致头像系统崩溃
- **现象**：点头像弹窗报 `ReferenceError: initAvatar is not defined` / `refreshHub is not defined`。
- **根因**：`hub.js` 调用 `initAvatar()`（应为 `initAvatarSystem`）、`avatars.js` 调用 `refreshHub()`（应为 `refreshHubAvatar`）；两函数均定义在 IIFE 内未挂 `window`。
- **修复**（v34 / v35）：统一改为已挂 `window` 的正确函数名。
- **教训**：跨 `<script>` 调用必须挂 `window` 或用 `typeof X === 'function'` 守卫（见下方"铁律"）。

### S3 · 创建角色无条件覆盖 localStorage 旧档
- **现象**：在创建界面点"确认"直接 `saveGame()` 覆盖，旧档不可逆。
- **根因**：`create.js` 无备份/无确认。
- **修复**（v33）：① `core.js` 存档前自动备份到 `wuxia_save_prev`；② `create.js` 检测到高进度旧档弹二次确认；③ `main.js` 启动后若"当前空角色+备份有进度"弹一键恢复。

---

## 三、🟡 中等（3 项）

### M1 · 排行榜为占位（设计性未实现）
- **位置**：`js/hub.js:100`（`go_rank` 弹窗："联网功能尚未开启，完成腾讯云配置后即可查看全服排行榜"）。
- **性质**：**非 bug**，是已知未接入后端（CloudBase）的占位功能。世界 BOSS 内的"本场排名"是本地模拟，不连全服。
- **建议**：接 CloudBase 后替换该弹窗为真实排行榜；迁移时此功能保持占位即可。

### M2 · 战斗敌方 HP 伤害数字显示（✅ 已确认正常）
- **代码路径**：`js/battle.js:357-361` 推 `floats`，`render()` 在 `:1043-1055` 绘制（`ctx.fillText(f.text, f.x, f.y - ...)`），敌坐标 `_x=430,_y=244`（`:123`）。
- **状态**：用户 2026-09-04 实机打副本确认**敌方伤害飘字正常显示**，原"疑似回归点"不成立，无需修改。
- **结论**：闭环。

### M3 · 测试套件补全 ✅ 已修复（2026-09-04）
- **现象**：8 个测试文件（`chest/equip/codex/daily/backfill/crit_panel/return_to_hub/chest_item`）报 `document.querySelector is not a function` 无法加载。
- **根因**：`_boot_sim.js` 与 `story.test.js` 的 `document` mock 含 `querySelector`，但这 8 个文件从模板生成时 `document` 对象漏了 `querySelector`；`initHub()` 调 `document.querySelector('.hub-avatar-wrap')`（hub.js:63）即崩。
- **修复**：给 8 个文件的 `document` mock 补 `querySelector: () => null`（与 story.test.js 对齐；已确认 initHub 对 null 有 `if (avatarWrap)` 守卫，返回 null 安全）。
- **验证**：10 个测试文件全部可跑且通过 —— story 43 + chest 16 + equip 18 + codex 36 + daily 53 + backfill 18 + crit_panel 13 + return_to_hub + chest_item 23 + `_boot_sim`(4 场景) ≈ 220+ 项断言全过。
- **结论**：闭环。回归套件恢复对装备/商店/图鉴/每日/宝箱/暴击面板/世界BOSS 等模块的守护。

---

## 四、🟢 轻微（4 项，均不影响运行）

### m1 · 死引用：`core.js` 引用 3 个不存在的 fallback 图
- **位置**：`js/core.js:20-22,28` 引用 `assets/hero.png` / `assets/enemy.png` / `assets/bg_battle.png`。
- **现状**：三文件**本地缺失**（资产清单无）。实战中 `art.hero` 被创建/读档覆盖、`art.enemy/bg` 走战斗精灵/渐变兜底，故**不崩**，但浏览器控制台会有 3 条 404。
- **建议**：删掉这三行 fallback 引用，或补占位图。低优先级。

### m2 · 资产目录噪音（已自动排除出迁移包）
- `assets/_wm_backup/`（~60 张）、`assets/icons/_old_v8/`、`assets/icons/*_raw.png`、`assets/battle/_original_backup/`、`assets/cover_v11~v16*.png`、`assets/Chinese_fantasy_*.png`、`assets/Realistic_*.png` 均为历史/中间产物。
- **处理**：`DEPLOY_MANIFEST.txt` 已按运行时引用精确收录，**不含上述噪音**。

### m3 · 地图模式死代码（已确认移除）
- `js/hub.js:707` 注释 `nodes 已随地图模式移除`，全仓 grep `mapMode/地图模式` 无残留逻辑。无死代码风险。

### m4 · 头像水印 ✅ 已去除（2026-09-04）
- 21 张头像（`assets/avatars/avatar_*.png`）由 ImageGen 生成，原带"AI生成"水印。
- **处理**：Otsu 自适应阈值精确定位白色文字 → 最小面积 mask（5×5 椭圆膨胀2次）→ **Biharmonic 双调和方程语义修复**（scikit-image）。
- **试点**：先处理 avatar_m1.png 确认修复区自然无痕后批量全部 21 张。
- **部署**：分 4 批推送（7+7+7+2），commit `831e8bfdb7ec`；同步 bump `avatars.js ?v=1→?v=2` + `index.html avatars.js?v=34→v=35` 强制缓存刷新。
- **铁律**：用户已拍板授权 → 按流程已完成交付。

---

## 五、全量资产引用核对（确保迁移无遗漏）

| 资产类别 | 路径 | 用途 | 纳入清单 |
|----------|------|------|----------|
| 主页/加载 | `assets/cover.png` | 加载页背景 | ✅ |
| 创建立绘 | `assets/select/m{1,2,3}_warrior.png` `f{1,2,3}_*.png` | 选人界面 | ✅ |
| 登录背景 | `assets/select/bg_login.jpg` | 登录页 | ✅ |
| 打坐视频 | `assets/select/{m1..f3}_med_h.mp4` + `.png` 海报 | 主页悬浮视频（动态拼接路径） | ✅ |
| Hub 图标 | `assets/icons/icon_*.png`（11 个，非 _raw/_old_v8） | 主页 11 图标 | ✅ |
| 头像系统 | `assets/avatars/avatar_*.png`（21 个） | 头像图鉴 | ✅ |
| 战斗立绘 | `assets/battle/hero_*/enemy_v*/boss_*.png`（21 个） | 战斗+图鉴 | ✅ |
| 战斗背景 | `assets/bg/bg_story_01-10.png` `bg_boss_01-05.png`（15 个） | 副本/BOSS 背景 | ✅ |

> 注：`assets/select/m*_med.png`（非 _h 竖版）为可选备用，未强制引用但体积小，已一并纳入以防样式回退。

---

## 六、迁移归档交付物

- `DEPLOY_MANIFEST.txt` — 114 文件权威清单（唯一事实源）
- `deploy_all.py` — 一键分批部署（≤18/批，重试 3 次）
- `MIGRATION.md` — 迁移到新仓库/其他静态托管的步骤
- 本文件 — BUG 审计与分类

**一次性部署重现命令**：
```bash
# 改 deploy_api.py 的 REPO 后：
python deploy_all.py
```

---

## 七、铁律（防止同类事故复发）

1. **跨 script 调用必须挂 `window`**，或守卫 `typeof X === 'function'`。禁止裸调用未导出函数（S2 教训）。
2. **改 JS/CSS 必 bump `index.html` 的 `?v=N`**。无构建步骤，靠 `?v` 破缓存（S1/S2 均因缓存 + 守卫叠加放大）。
3. **`saveGame()` 序列化必须与 `player` 字段同步**；新增字段须写入，否则读档丢。
4. **读档守卫向后兼容**：旧档只要有 `name` 即认，不要求新字段存在。
5. **AI 资产用户拍板后必去水印**（m4）。


---

## 八、2026-09-12 独立复查（用户二次要求"再查一遍 BUG/漏洞"）

> 复查方式：直接读源码逐条核验所有**资源获取/奖励领取/存档**路径，以及全量 `node --check` 语法检查。
> 结论：**当前代码中不存在可复现的"钻石/资源刷取漏洞"**；历史审计的 3 项严重问题确已闭环。新发现 1 个中危数值 bug + 2 个轻微项。

### A. 资源/经济路径全核验（用户最关心的"刷取漏洞"）→ 全部安全
| 来源 | 防重复机制 | 结论 |
|---|---|---|
| 每日签到（1000/2000 钻） | `daily.monthClaimed[count]` + 跨天重置 | ✅ |
| 在线时长（10/20/30 钻） | `daily.onlineClaimed[min]` | ✅ |
| 日常任务（50/100 钻） | `daily.taskClaimed[key]` | ✅ |
| 图鉴里程碑（每 10 个 +1000 钻） | `codexReward.skill/equip` 单调递增档位计数（`learned`/`equipCollected` 只增不减） | ✅ |
| 离线挂机 | 12h 封顶 + `applyOfflineXp` 回写 `lastSeen` 并落盘 | ✅ |
| 世界BOSS | `slots[idx].claimed` 标记 + `attempts` ≤ 6 | ✅ |
| 副本章节奖励 | `storyRewardClaimed[ch]` 标记 | ✅ |
| 副本首通掉落/经验 | `storyLevelFirstClear[levelKey]`（isFirstClear 守卫） | ✅ |
| 商店购买 | `buyShopItem` 扣费后从 `shopStock` 移除 + `isEquipOwned` 记已拥有；钻石宝箱 `buyDiamondChest` 先扣钻 | ✅ |
| 主流程读档 | `main.js checkSavedCharacter` 完整恢复 gold/diamond/bag/equipment；`applyStarterEquip` 仅创建角色时调用，**无"每帧重置资源" bug** | ✅ |

> 说明：用户记忆里提到的"钻石刷取漏洞"在 09-04 审计文档（S1–S3）中**并不作为一条独立缺陷存在**，且本轮全量扫描未复现任何可重复领取的钻石路径。判断该隐患应已在 09-04 那轮修复闭环，或当时属未落地的担忧，无需再处理。

### B. 新发现 🟡 中危：内部 `level` 字段从未定义/持久化 → 暴击率漏算"等级"贡献
- **位置**：`js/player.js:275` `cr = 0.15 + (p.level || 0) * 0.002 + ...`、`js/battle.js:350` `if (attacker.level) baseCrit += attacker.level * 0.002;`
- **根因**：全仓 grep `player.level` / `.level =` / `level:` 仅命中上述**两处读取**，从未有任何赋值或 `saveGame` 持久化。`p.level` 恒为 `undefined` → `(p.level || 0)` = 0。
- **影响**：设计意图是"暴击率基础 = 15% + **等级**×0.2% + 天命×0.2%"。实际"等级"项恒为 0，高端战力下每点境界少 0.2% 暴击，累计可达 ~10%（视总境界数）。属**真实数值偏差**（非崩溃），但不影响运行。
- **注**：界面显示的"等级"（daily.js:269 `realmLevel()`）走的是 `CULTIVATION.realmFromXp().globalIndex+1`，与这个坏掉的 `p.level` 无关，所以玩家看到的等级是对的，只有内部暴击计算漏了这档。
- **建议修法（二选一，需用户拍板再动数值）**：① `recalcStats` 内把 `(p.level || 0)` 改成 `CULTIVATION.realmFromXp(p.xp).globalIndex + 1`；② 或在 `player` 对象加 `level` 字段并在 `recalcStats`/`checkSavedCharacter` 同步。battle.js:350 同改。

**【已于 2026-09-14 修复 · commit 196816cb3662】** 采用方案①（不动存档结构）：
- `js/player.js:275`：`(p.level || 0)` → `((typeof CULTIVATION !== 'undefined') ? CULTIVATION.realmFromXp(p.xp).globalIndex + 1 : 1)`，与界面 `realmLevel()` 同一口径。
- `js/battle.js:350`：原 `if (attacker.level) baseCrit += attacker.level * 0.002;` 改为用 `attacker.isEnemy` 区分——玩家攻击者取 `player.xp` 境界等级、敌人维持原行为（无等级暴击）。
- 部署 `index.html`（player.js ?v=19→20 / battle.js ?v=23→24）；`node --check` 通过；线上核验修复代码已生效。
- 影响量化：此前每点境界漏算 0.2% 暴击；以境界 globalIndex=20（即 realmLevel 21）为例，常驻暴击率恢复 +4.2%（15% → 19.2%，不含装备/天命/增益）。

### C. 轻微项
- **m5 · 商店库存跨刷新不持久 + 刷新页可无限 reroll**（设计小瑕疵，非致命）：`shopStock` 是模块级变量、不入存档；玩家刷新页面即获得全新随机库存，绕过了每日 20 次刷新上限的约束。不会刷资源（购买仍扣费 + 记已拥有），等同"免费无限看货"。若要严格限制，可把 `shopStock` 存入 `player.daily` 或独立 seed。
- **m1（重申）· core.js:20-22 死引用** `assets/hero.png`/`enemy.png`/`bg_battle.png` 三文件本地缺失 → 控制台 3 条 404（实战被 `art.hero.src`/战斗精灵/渐变兜底覆盖，不崩）。低优先级。

### D. 语法/加载
- 14 个 JS 文件 `node --check` **全部通过**，无解析级错误。
- `resolvedEquipEffects`（`equip_db.js:264`）有定义，player.js:232/281 调用安全，不崩。
- `equipEffectText`（`equip_db.js:279`）、`invIconSVG`（`hub.js:374`）均有定义。
- 战斗伤害飘字（M2 历史关注项）渲染正常：floats 在 battle.js:375 入队、:1058-1067 `fillText` 绘制，敌方坐标 430/244。无回归。
