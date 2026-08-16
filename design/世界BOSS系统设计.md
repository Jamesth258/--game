# 世界 BOSS 系统设计文档

> 版本：v1.0 ｜ 日期：2026-08-16 ｜ 作者：WorkBuddy（GameDesigner）
> 关联代码：`js/worldboss.js`（核心模块）、`js/battle.js`（worldboss 战斗分支）、`js/hub.js`（菜单入口）、`js/player.js` / `js/core.js` / `js/main.js`（存档字段）

---

## 1. 需求来源与设计目标

用户要求把主页「江湖」按钮删除（其 12 节点主线战斗功能已被 100 章副本系统完整覆盖），并新增一个高频、强挑战的 **世界 BOSS** 玩法。

设计目标：
- **每天 5 个固定时段**，每个时段 1 只世界 BOSS，制造"限时蹲点"的日常节奏。
- **难度拉满**：BOSS 拥有游戏最高境界（宇宙国主）的属性基底，且血量 ×100。
- **可控的单场体验**：单场最多 10 回合，避免无限拖堂；同一时段允许多次挑战（≤6 次），用"累计伤害"做排名，鼓励多次投入。
- **公平收口**：时段结束前 15 分钟截止所有挑战，之后按该时段 **累计伤害** 排名发奖，前 3 名有宝箱大奖、其余参与者也有保底奖励。

---

## 2. 时段与 BOSS 设定

| 时段 | 名称 | 副标题 | 开放时间 | 截止（锁挑战） |
|------|------|--------|----------|----------------|
| ① | 幽冥魔尊 | 晨曦之噬 | 10:00 – 12:00 | 11:45 |
| ② | 焚天炎帝 | 正午燎原 | 13:00 – 15:00 | 14:45 |
| ③ | 九幽冥皇 | 午后阴潮 | 15:00 – 17:00 | 16:45 |
| ④ | 血河神祖 | 暮色血战 | 18:00 – 20:00 | 19:45 |
| ⑤ | 太虚帝尊 | 长夜降临 | 20:00 – 23:00 | 22:45 |

> 截止规则：以 `end - cut`（cut = 15 分钟）为分水岭。到达截止点后玩家 **不可再挑战**，但可领奖；时段彻底结束（now ≥ end）后同样只可领奖不可挑战。

四种时段状态（`wbSlotState`）：
- `upcoming` 未开启 → 仅展示开放时间
- `open` 进行中 → 可挑战（显示剩余次数）
- `locked` 已截止・可领奖 → 不可挑战，可领奖
- `ended` 已结束 → 同 locked，可领奖

---

## 3. 难度设计

### 3.1 属性基底（最高境界）
`bossBaseStats()` 取 `CULTIVATION.TOTAL_STAGES - 1`（即最高境界"宇宙国主"）的代表性属性作为模板，按 `con/str/sou/spd/com/des` 各 10 点推导 `maxHp / def / atk / maxMp / spiAtk / spiDef / init / eva`。

### 3.2 100 倍血量
`makeWorldBoss(slotIdx)` 中：
```
hp = round(B.maxHp * 100)   // 血量 ×100
```
其余属性：**攻击 / 精神攻击减半**（`* 0.5`），**防御 / 先攻 / 闪避 / 精神防御 / 速度维持满值**。

> 平衡考量：满血 ×100 使 BOSS 极肉，但攻/精攻减半保证玩家在 10 回合内有稳定输出空间、不会被瞬秒，同时「肉度拉满 + 输出被砍」让玩家无法速杀，必须靠多次挑战积累伤害。

### 3.3 回合与次数上限
- 单场最多 **10 回合**：`beginRound()` 在 `battle.mode === 'worldboss'` 时 `roundCount++`，超过 `WB_MAX_ROUNDS` 即强制结束本场（`endWorldBossBattle(false)`），不判负、不计经验，只记录已造成的伤害。
- 同一时段最多 **6 次**挑战：`startWorldBossBattle` 校验 `attempts < WB_MAX_ATTEMPTS`（=6），每次进入战斗前 `attempts++` 并存档。

---

## 4. 伤害累计与排名

- 唯一伤害出口 `damage()` 在结算后累加玩家造成的伤害：`battle.playerDmg += base`。穿透伤害走 `applySkill` 的 `pierce` 分支，同样累加。
- 单场结束（`endWorldBossBattle`）把 `battle.playerDmg` 累加到该时段的 `slotData.dmg`，并 `saveGame()`。
- 排名用 **累计伤害**（该时段跨最多 6 场之和），不是单场最高。

### 4.1 单机离线排名方案（NPC 对手）
游戏联网层未配置 CloudBase 环境，真实跨玩家榜不可得。本版本用 **种子化 NPC 对手** 构成可争竞速排行榜：
- 种子 = `FNV-1a(wbTodayStr() + '#' + slot.idx)`，保证 **每天每时段对手固定**（同服玩家看到同一批对手，公平）。
- 对手强度 = 玩家潜在总伤害（`atk × 3.0 × 14 × 6 次`）的 `0.45 ~ 1.95` 倍浮动 → 一场"打不打得过"真实可争，不是送。
- 配好 `window.CLOUDBASE_ENV` 后，可把 `wbRivals` / `wbBoard` 替换为真实跨服数据，界面与发奖逻辑无需改动。

### 4.2 发奖规则（截止后领奖）
`openWorldBossClaim(slotIdx)` 在时段 `locked/ended` 且 `dmg > 0` 且未领取时，按最终排名发奖：

| 名次 | 奖励 |
|------|------|
| 第 1 名 | 1 × 功法宝箱（随机习得未拥有功法）+ 1 × 装备宝箱（随机部位、品质略高于常规锻造） |
| 第 2 名 | 1 × 装备宝箱 |
| 第 3 名 | 1 × 功法宝箱 |
| 其余参与玩家 | 5 × 灵石宝箱（各 +200~800 灵石）+ 5 × 经验宝箱（各 +2000~10000 修为） |

领奖后标记 `claimed = true`、`rank` 写入存档，`saveGame()` 持久化。

---

## 5. 数据存储与每日重置

存档字段（新增于 `player.worldBoss`，经 `core.js` saveGame / `main.js` 读档同步）：
```js
player.worldBoss = {
  date: 'YYYY-MM-DD',
  slots: {
    1: { attempts: 0, dmg: 0, claimed: false, rank: null },
    2: { attempts: 0, dmg: 0, claimed: false, rank: null },
    3: { attempts: 0, dmg: 0, claimed: false, rank: null },
    4: { attempts: 0, dmg: 0, claimed: false, rank: null },
    5: { attempts: 0, dmg: 0, claimed: false, rank: null },
  }
}
```

`ensureWorldBossDaily()` 以 `wbTodayStr()` 为 key：跨天自动重建 5 时段进度（次数、伤害清零，可重新挑战领奖）。

---

## 6. 接入改动清单

| 文件 | 改动 |
|------|------|
| `js/worldboss.js` | **新建**。`WB_SLOTS` / 常量、`wbSlotState` / `bossBaseStats` / `makeWorldBoss` / `wbRivals` / `wbBoard`、4 类宝箱、`openWorldBossScreen` / `startWorldBossBattle` / `openWorldBossResult` / `openWorldBossClaim`，并挂 `window`。 |
| `js/battle.js` | `startBattle` 增加 `mode === 'worldboss'` 分支；`damage()` 与 `applySkill` pierce 累加 `playerDmg`；`beginRound()` 加 10 回合上限；`checkEnd()` 路由到 `endWorldBossBattle`；新增 `endWorldBossBattle`。 |
| `js/hub.js` | `HUB_MENU_ITEMS` 删除「江湖」整行，在「副本」后新增「世界BOSS」入口（`action: 'go_worldboss'`）；`initHub` switch 加 `case 'go_worldboss'`。 |
| `js/player.js` | `player` 新增 `worldBoss: null`。 |
| `js/core.js` | `saveGame()` JSON 新增 `worldBoss`。 |
| `js/main.js` | `checkSavedCharacter()` 读档恢复 `player.worldBoss`。 |
| `index.html` | 在 `story.js` 与 `main.js` 之间插入 `<script src="js/worldboss.js">`。 |

---

## 7. 测试与部署

- **语法校验**：全部 12 个 JS 文件 + `config.js` / `cultivation.js` 经 `node --check` 通过。
- **无头冒烟测试**（单作用域 vm + DOM/canvas/localStorage 桩）**10 项断言全过**：创建进 hub、菜单含世界BOSS且江湖已删、BOSS=最高境界×100血、伤害累计、击杀记伤害、10 回合上限触发、每时段 6 次上限、第 1 名功法+装备、末名 5 灵石+5 经验、每日重置。
- **部署**：本地 commit `82b85e3`，`git push origin master` 成功（Pages 从 master 自动重建，约 1–2 分钟后线上版主页出现「世界BOSS」按钮）。试玩地址：`https://jamesth258.github.io/--game/`。

---

## 8. 已知限制与后续

- **离线排名**：当前 NPC 对手为单机模拟，非真实跨玩家榜。配 CloudBase 后替换 `wbRivals`/`wbBoard` 即可上线真实竞速。
- **测试钩子**：`window.__WB_TEST_MINUTES` / `window.__WB_TEST_DATE` 供自动化注入时间做回归测试，不影响正常玩家。
- **奖励内容**：功法/装备宝箱复用现有 `SKILLS_DB` / `genEquip` / `rollRarity`，未单独设计世界 BOSS 专属掉落（如需专属外观/属性可后续扩展）。
