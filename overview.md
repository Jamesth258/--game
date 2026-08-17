# 图鉴系统（功法 / 装备收集统计 + 里程碑奖励）

## 功能概述
主页新增「图鉴」按钮，点进去查看**全部功法（130 种）与全部装备（94 种）**的收集情况：
- 已收集：亮显真实名称 + 阶位/类型/特效（或套装归属）。
- 未收集：灰显「❓ ???」（保留探索感，激励持续刷取）。
- 顶部进度条 + 计数（功法 X/130、装备 Y/94），并提示「再收集 N 个功法/装备得 1000 钻」。

## 里程碑奖励（核心诉求）
- **每收集满 10 个功法 → 奖励 1000 钻石**；**每收集满 10 个装备 → 奖励 1000 钻石**。
- 功法与装备**独立计数**，互不串档。
- 支持连发多档：一次从 0 收集到 20 个，连发 2 档（共 2000 钻）。
- 去重：同一装备 id 重复获得不重复计入、不重复发奖。
- 初始 8 个赠送功法不触发「满 10 发奖」（避免新角色白送钻）；旧存档已收集部分通过 `codexReward` 档位预置，**不补发历史钻石**，仅后续增量才发。

## 收集口径
- 功法收集 = `player.learned`（已习得功法 id 数组，原机制直接复用）。
- 装备收集 = `player.equipCollected`（新增去重集合，按 `EQUIP_DB` 的 `entryId`；出售/更换装备不移除，符合"收集过即计入"）。
- 装备 item 由 `makeItemFromDb` 生成时携带 `entryId: entry.id`（新增清晰字段，原 `setId` 语义易混淆，保留兼容）。

## 接入的获得入口（获取即写入图鉴 + 触发奖励判定）
- 世界BOSS：`openSkillChest`（功法）、`openEquipChest`（装备）
- 副本通关三选一：`storyClaimReward`
- 战斗掉落（普通/BOSS 战）：`battle.js` 装备/功法掉落
- 功法秘库购买：`buySkill`
- 所有入口统一调用 `recordEquipCollected(item)` / `checkCodexReward()`（`codex.js`）。

## 旧档兼容（main.js）
恢复时补 `player.equipCollected` / `player.codexReward` 默认值；并在 `recalcStats` 后把已发档位对齐为 `floor(已收集数/10)`，避免旧档误补发钻石。

## 文件改动
- 新增 `js/codex.js`：`recordEquipCollected` / `checkCodexReward` / `grantCodexDiamond` / `openCodex`（内联样式，无外部 CSS 依赖）。
- `js/player.js`：`equipCollected:[]` + `codexReward:{skill:0,equip:0}` 默认字段。
- `js/equip_db.js`：`makeItemFromDb` 加 `entryId`。
- `js/hub.js`：菜单加图鉴按钮 + `modal_codex` 分发 + `buySkill` 触发。
- `js/worldboss.js` / `js/story.js` / `js/battle.js`：各获得入口写入收集。
- `js/main.js`：旧档恢复 + 档位对齐。
- `index.html`：加载 `js/codex.js`。

## 测试（真实跑过，非凭记忆）
- 新增 `test/codex.test.js`：**18/18 通过**——图鉴渲染（标题/计数/未收集???/真名/里程碑提示）、功法满10发钻、装备满10发钻、去重、连发多档、初始不误发、功法装备独立计数。
- 全量回归：**equip 18 / daily 41 / story 40 / return_to_hub 全过 / crit_panel 9** 全部无回归（测试桩补加载 codex.js 以匹配部署）。

## 部署
`git commit` + `git push origin master` 上线（GitHub Pages 约 1–2 分钟重建）。
