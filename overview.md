# 宝箱开启动画

## 改了什么
点击背包里的「开启」按钮后，宝箱不再瞬间出结果，而是先播放一段纯 CSS 开启动画（约 1.3 秒），动画结束再弹出开奖结果。

### 1. `css/style.css` — 新增动画类
- `.chest-anim-overlay` 全屏遮罩（z-index 9997，半透明黑底）
- `.chest-anim-icon` 宝箱图标（按类型：功法📜 / 装备🛡️ / 经验✨ / 灵石💰）
- 关键帧：
  - `chestShake`：盒体左右抖动（开箱前的"酝酿"）
  - `chestOpen`：上移 + 放大 + 金色辉光增强（开盖迸发）
  - `chestGlow`：金色光环扩散消失
  - `chestBurst`：8 颗金色粒子向四周飞散（随机方向）
  - `chestFade` / `chestPop`：底部"开启中…"文字与结果弹窗奖励文字上浮淡入

### 2. `js/worldboss.js` — `openChestItem` 改造
- 开奖逻辑（移除宝箱 + 计算奖励 + 写入 player）**保持同步**，数据正确性不受动画影响；
- 抽 `playChestOpenAnim(box, res)`：注入 body 动画层 → `setTimeout(1300ms)` 后移除层并 `showChestResult` 弹结果；
- 抽 `showChestResult(box, res)`：结果弹窗（标题 + 奖励文字带 `chest-result-pop` 上浮动画 + 返回背包/主页）；
- 降级：环境缺 `document.body` / `setTimeout` 时同步直接弹结果（无头测试与极旧环境不会白屏）。

## 验证（真实跑过）
- `test/chest_item.test.js` 新增动画路径用例：**23/23 通过**——含"同步 setTimeout 时动画结束弹出含结果的结果 modal、含 chest-result-pop 类、返回背包/主页按钮"。
- 全量无回归：codex 25 / equip 18 / daily 41 / story 40 / return_to_hub / crit 9 / chest 全绿。

## 体验
背包点「开启」→ 全屏宝箱抖动→开盖金光迸发→约 1.3s 后出"习得《XXX》/获得 XXX"结果弹窗。世界BOSS/每日/战斗掉落/钻石商城开出的宝箱走同一套动画。
