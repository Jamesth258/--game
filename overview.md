# 宝箱概率系统（A+B+C 全做）

## 改动清单
- **js/player.js**：默认对象新增 `skillPity: 0`（功法保底计数）。
- **js/worldboss.js**：
  - 新增 `SKILL_TIER_WEIGHTS`（黄38/玄26/地16/天10/王5/皇3/帝2，合计100）、`SKILL_PITY_LIMIT = 120`。
  - 重写 `openSkillChest(biasTier=0)`：在未拥有功法里按 7 阶加权抽取（已集齐的阶权重归零）；累计开启满 120 次强制帝阶，抽到皇/帝阶重置计数。
  - 重写 `openEquipChest(bias=0)`：品质 = `rollRarity()+1+bias` 封顶神品。
  - 新增 `equipChestQualityDist(bias)`：解析当前境界下各品质理论概率。
  - 新增 `openChestInfo()`：概率详情弹窗（装备品质表 + 功法各阶表 + 世界BOSS加成 + 120 保底说明），`window` 暴露。
  - 世界BOSS 发放按名次传 bias：第1名 功法+2/装备+2，第2名 装备+1，第3名 功法+1。
- **js/hub.js**：主页菜单新增「抽奖概率」入口（`modal_chestinfo` → `openChestInfo()`）。
- **js/main.js**：旧档恢复补 `skillPity`。
- **test/chest.test.js**：16 项真实跑过（加权分布、120 保底、装备 bias 分布、概率页渲染）。

## 关键设计口径
- **A 功法加权**：黄阶约 39%、帝阶约 2%（实测抽样）；保底每 120 次必出帝阶。
- **C 装备差异化**（境界等级1 基准）：装备宝箱 bias0 = 灵57%/宝29%/仙14%（无凡无神）；世界BOSS第1名 bias+2 → 仙57%/神43%。名次越高品质基线越高。
- **B 概率页**：展示当前境界的装备品质表与功法各阶表，并标注世界BOSS加成与 120 保底。概率随境界动态变化（rollRarity 曲线），页面实时按当前境界计算。

## 验证
- chest 16/16、equip 18、daily 41、story 40、return_to_hub 全过、crit_panel 9、codex 18 全绿。
- 已提交并 push 到 GitHub（`git push origin master`），GitHub Pages 约 1–2 分钟重建生效。

## 待办
- 可选：在商店钻石专区也加「查看概率」按钮（当前入口在主页菜单）。
