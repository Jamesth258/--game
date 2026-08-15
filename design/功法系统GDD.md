# 《逍遥仙》功法系统 GDD（游戏设计文档）

> 配套数据：`js/skills-data.js`（`SKILLS_DB`，共 **130** 种功法，可游戏直接加载）
> 设计者视角：系统设计师。本文档给接手实现的开发者看——30 分钟能上手为标准。

---

## 0. 背景与动机

现状（截至本 GDD 前）：`js/player.js` 的 `SKILLS` 仅 2 种（`xuanfeng` 旋风剑法 / `xuanyin` 玄阴指），战斗中 `player.activeSkill` 只能挂 **1 个**功法，按钮只有「普攻 / 功法 / 防御 / 丹药」。玩家反馈：**单功法 + 单选太单薄，不像修仙游戏**。

目标：把功法做成**可收集、可搭配、每回合决策**的核心系统。参考来源《一剑霸天》（永夜星河 / 番茄小说）的武学词根（北苍剑术三卷、神灭、星月流光等），**全部改名改编**以规避抄袭（每条 `source` 字段留痕）。

---

## 1. Fun Hypothesis（好玩的核心）

> **「每场战斗都是一次功法配装博弈：用有限的灵力，在 6 个已装备功法里，挑出这一回合最该出的那一张。」**

如果这句话说不清，系统就不成立。它要求三件事同时成立：
1. 灵力是**稀缺资源**（不能无脑甩大招）→ 见 §4 灵力经济
2. 功法有**明确分工**（有的打、有的扛、有的奶、有的提速）→ 见 §3 类型学
3. 每回合有**真实决策**（出伤害？还是这回合先奶一口翻盘？）→ 见 §6 战斗机制

---

## 2. Design Pillars（不可妥协的体验标准）

| # | 信条 | 落地校验 |
|---|---|---|
| P1 | **灵力永远不够用** | 一场战斗 8~15 回合，满灵力约够放 4~6 个中阶功法；高阶功法是「终极手段」 |
| P2 | **没有万能功法** | 130 种里没有任何一种同时「高伤+自愈+免伤+省蓝」，搭配才有意义 |
| P3 | **每一类都有上场理由** | 恢复/增益/减益/Boss 攻坚各有不可替代场景，不是攻击法的下位替代 |
| P4 | **获取即成长感** | 10 种渠道覆盖「白嫖→氪→肝→社交」，让不同玩家都有进度 |
| P5 | **名称有武侠魂，但不抄** | 改编自《一剑霸天》词根 + 通用词根，每条 `source` 留痕 |

---

## 3. 功法类型学（10 类，数据 `school` 字段）

| school | 中文 | 战斗里做什么 | 灵力消耗倾向 |
|---|---|---|---|
| `attack_phys` | 攻击·物理 | `damage(atk*mult - def*0.5)` | 基准 |
| `attack_spirit` | 攻击·精神 | `damage(spiAtk*mult - spiDef*0.5)` | 略高（+2） |
| `defense` | 防御·护体 | 本回合起 `dur` 回合内受伤 ×(1-pct) | 略高（+2） |
| `recover_hp` | 恢复·气血 | 回 `maxHp*pct + flat` | 略低（-2） |
| `recover_mp` | 恢复·灵力 | 回 `maxMp*pct + flat` | 最低（-3） |
| `buff_atk` | 增益·攻击 | `atk ×(1+amt)` 持续 `dur` 回合 | 略低（-1） |
| `buff_spd` | 增益·速度 | `init ×(1+amt)` 持续 `dur` 回合（影响先手/连动） | 略低（-1） |
| `buff_def` | 增益·防御 | `def ×(1+amt)` 持续 `dur` 回合 | 略低（-1） |
| `debuff` | 减益·敌方 | 敌方 `atk ×(1-amt)` 持续 `dur` 回合 | 基准 |
| `special` | 特殊·复合 | 吸血 / 穿透 / 真实伤害 / 眩晕 / 护盾吸收 / 暴击提升（按 `effect.kind` 细分） | 最高（+4） |

> 分布：**每类 13 种，共 130 种**（数据文件实际条数）。

---

## 4. 数值框架（带 rationale，拒绝 magic number）

### 4.1 战斗模型假设（务必先对齐）
- **单场战斗回合数**：假设 **8~15 回合**（Boss 偏长）。若实际测出是 25+ 回合，整条灵力曲线要重画——见 §8 验证路径。
- **玩家灵力池**：`maxMp` 随境界增长（现有 `recalcStats` 已含）。取中段玩家 `maxMp ≈ 120~200` 作为调参锚点。
- **暴击**：沿用现有 `damage()` —— 15% 概率 ×1.5。

### 4.2 阶位 → 灵力消耗（核心约束：越厉害越贵）

`cost = COST_BASE[tier] + SCHOOL_COST_OFF[school]`，下限 5。

| 阶 | 名称 | COST_BASE | 攻击 mult | 护盾 pct | 治疗 pct | 增益 amt |
|---|---|---|---|---|---|---|
| 1 | 黄阶 | 8 | 1.3 | 15% | 10% | +15% |
| 2 | 玄阶 | 16 | 1.7 | 22% | 16% | +22% |
| 3 | 地阶 | 24 | 2.1 | 30% | 22% | +30% |
| 4 | 天阶 | 34 | 2.6 | 40% | 30% | +40% |
| 5 | 王阶 | 50 | 3.2 | 50% | 40% | +55% |
| 6 | 皇阶 | 72 | 3.9 | 60% | 52% | +75% |
| 7 | 帝阶 | 100 | 4.6 | 70% | 65% | +100% |

**rationale**：
- 黄阶 8 蓝 ≈ 中段玩家 1/15 灵力 → 可当常规技；帝阶 100 蓝 ≈ 半管以上 → 只能关键时刻放，P1 成立。
- 攻击 mult 从 1.3→4.6：帝阶一击约顶 3.5 个黄阶，但蓝耗 12.5 倍 → 单发性价比低，逼玩家**按节奏出招**而非囤大招。
- 增益 amt 封顶 +100%（帝阶）：速度翻倍 = 稳定先手 + 触发 `extraActions` 连动，构成「速攻流」build，但仅 3 回合且贵 → 不是常驻。

### 4.3 伤害公式（沿用 `battle.damage`，不重造）
```
物理： base = atk * mult - def * 0.5
精神： base = spiAtk * mult - spiDef * 0.5
暴击(15%)： ×1.5 ；防御姿态(defending)： ×0.5 ；下限 1
```
- `special.pierce`：忽略 `def*0.5` 项（破甲）
- `special.truedmg`：直接扣 `flat`，不走上式（克高防 Boss）
- `special.lifesteal`：本次伤害 ×30% 回自身 hp

### 4.4 治疗 / 增益公式
```
heal_hp  = round(maxHp * pct) + flat
heal_mp  = round(maxMp * pct) + flat
buff     = 属性 * (1 + amt)，持续 dur 回合（dur：低阶2 / 高阶3）
debuff   = 敌方 atk * (1 - amt)，持续 2 回合
```
> flat 项为「保底量」，避免低血线时百分比治疗聊胜于无（如地阶回血 `maxHp*22% + 60`）。

---

## 5. 获取渠道（10 种，越多越好）

| acquire | 渠道 | 设计意图 | 偏向阶位 |
|---|---|---|---|
| `dungeon` | 剧情副本通关 | 主线推进的硬通货 | 中 |
| `boss` | BOSS 掉落 | 攻坚正反馈，高阶主来源 | 高（4~7） |
| `shop` | 灵石商城 | 白嫖/微氪可稳定补齐低阶 | 低（1~2） |
| `event` | 限时活动 | 拉回流、冲活跃 | 高（5~7） |
| `levelup` | 境界突破领悟 | 「变强即送功法」的爽点 | 低（1~2） |
| `sect` | 宗门贡献兑换 | 社交/长线养成 | 中 |
| `signin` | 签到累积 | 日活保底（低阶碎片） | 最低（1） |
| `achievement` | 成就奖励 | 目标驱动 | 高（5~7） |
| `exchange` | 功法残卷合成 | 集卡感，消化冗余掉落 | 中高 |
| `arena` | 论剑台排名 | PVP 荣誉变现 | 中高 |

> 数据分布（实际）：boss 21 / event 16 / dungeon 14 / sect 14 / arena 14 / achievement 14 / exchange 13 / shop 10 / levelup 9 / signin 5。渠道覆盖齐全，符合 P4。

---

## 6. 战斗机制重设计：装备 6 槽 + 每回合点选

### 6.1 旧模型（要废）
- `player.activeSkill`：单一出战功法；战斗按钮 `skill` 永远放那一个。

### 6.2 新模型
- `player.learned`：`string[]`，已习得功法 id（来自各渠道）。
- `player.equippedSkills`：`string[]`，**最多 6 个**已装备功法 id（主页/功法界面编辑，战斗内只读）。
- 战斗中「功法」按钮 → 弹出 **已装备功法列表**（≤6），每项显示名称/类型图标/灵力消耗；灵力不足的置灰；点击即对本回合施展该功法。
- 每回合独立决策：这回合可以出伤害、可以奶、可以给自己上 buff、可以给 Boss 上 debuff——**决策权交还玩家**。

### 6.3 生效逻辑（接 `applyAction`）
| school | 在 `applyAction(actor,'skill')` 里 |
|---|---|
| attack_* | `damage(actor,target,eff.mult,eff.type)`；若有 lifesteal/pierce 特殊处理 |
| defense | `actor.shieldPct = max(actor.shieldPct, eff.pct); actor.shieldDur = eff.dur` |
| recover_hp | `actor.hp = min(maxHp, hp + heal)` |
| recover_mp | `actor.mp = min(maxMp, mp + heal)` |
| buff_* | `actor.buffs.push({stat,amt,dur})`，`recalcStats` 战时重算或战斗结算乘算 |
| debuff | `target.debuffs.push({stat,amt,dur})` |
| special | 按 `effect.kind` 分发（stun 设 `target.stunDur`；absorb 设 `target.shieldFlat`；truedmg 直接扣；critup 改 `actor.critBonus`） |

### 6.4 与现有代码衔接点（实现清单）
1. **player.js**：`player` 对象 `activeSkill` → 改为 `equippedSkills:[]`（默认 6 个初始功法）；`learned` 保留。新增 `learnSkill(id)` / `equipSkill(id)` / `unequipSkill(id)`（装备满 6 拦截）。
2. **battle.js**：`applyAction` 的 `case 'skill'` 改为接收「具体 skill id」（按钮 `data-skill`），从 `SKILLS_DB` 查表（替代 `SKILLS[activeSkill]`）；`setButtons` 的 skill 按钮点击改为打开功法子面板；`damage()` 增加 pierce/truedmg/lifesteal 分支；新增 `buff`/`debuff`/`shield`/`stun` 状态在 `nextTurn` 里 `dur--` 衰减。
3. **hub.js / create.js**：新增「功法」主菜单（`showSkillsModal`）——左右两栏（已习得 / 已装备），点击装备/卸下，满 6 拦截；新手初始给 6 个黄阶功法（各类型 1 个）写入 `equippedSkills`。
4. **index.html**：在 `<script>` 顺序里 `js/skills-data.js` 必须 **先于** `js/battle.js` / `js/hub.js` 引入（提供全局 `SKILLS_DB`）。
5. **存档**：`saveGame` 已存整个 `player`，`equippedSkills`/`learned` 自动持久化；旧档无此字段时 `loadGame` 给默认值（兼容）。

---

## 7. 防抄袭说明（合规）
- 每条功法 `source` 字段标注名称改编溯源，例如：
  - `玄霜剑诀` → 改编自《一剑霸天》北苍剑术（三卷：速度/威能/防御）
  - `寂灭护体神功` → 改编自《一剑霸天》禁术·神灭
  - `星陨回春诀` → 改编自《一剑霸天》秘技·星月流光
- 字眼均做替换（北苍→玄霜、飞血→残血、神灭→寂灭、焱东河→炎东河、星辰磨盘→星潢…），**不照搬原文名词与设定**，仅借武侠语感。
- 通用词根（太虚/青莲/两仪…）为武侠公共语料，无原著对应，标「原创」。

---

## 8. 验证路径（未playtest 数值一律 [PLACEHOLDER] 心态）
- [ ] 单场战斗实测回合数是否 8~15（不符则 §4.1 假设重画）
- [ ] 帝阶功法在「满灵力放一个」后是否仍有 1~2 回合空窗（验证 P1）
- [ ] 速攻流（buff_spd 帝阶 + extraActions）是否过强 → 若 Boss 被 3 回合带走，降 `buff_spd` amt 或 `extraActions` 触发率
- [ ] 治疗量在残血 Boss 阶段是否「刚好能翻盘但不无脑」→ 调 `HEAL` 表
- 所有 `MULT/COST_BASE/SHIELD/HEAL/BUFF` 均为**待 playtest 调参**，非最终值；改 `gen_skills.py` 重跑即可刷新数据。

---

## 9. 下一步（实现建议）
按 §6.4 清单改造三文件即可落地。建议先实现「装备 6 槽 + 攻击/恢复类」（覆盖 80% 体验），`buff/debuff/special` 状态机作为第二阶段。生成器 `gen_skills.py` 可随时调参重跑。
