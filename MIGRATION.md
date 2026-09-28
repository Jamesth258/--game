# 《逍遥仙》迁移 / 一次性部署指南

> 目标：把**当前全部游戏设计**原样重现到任意静态托管（默认 GitHub Pages）。
> 当前线上状态已校验为 0 差异，本包即线上快照。

## 一、交付物（本目录新增）

| 文件 | 作用 |
|------|------|
| `DEPLOY_MANIFEST.txt` | 权威文件清单（**152 个**运行时文件，构成完整游戏）。**唯一事实源**。<br>**由 `build_manifest.py` 自动生成，请勿手工编辑。** |
| `deploy_all.py` | 一键部署脚本，读清单、按批（≤18/批）推送、失败重试 3 次。 |
| `deploy_api.py` | 底层 GitHub API 部署器（token 自动恢复，无需手动设置）。 |
| `build_manifest.py` | 清单自动生成器：从 `index.html` 引用 + `js/` + 运行时资产目录派生清单，生成前自检。<br>**新增/删除资源后必须重跑**：`python build_manifest.py` |
| `ARCHIVE_INDEX.md` | **迁移与设计归档总索引**：线上快照、一键迁移 SOP、设计文档地图、代码模块地图、铁律速查、体检结果。迁移时**第一份必读**。 |
| `design/BUG审计与迁移归档.md` | BUG 审计 + 分类归档（含严重度/模块/状态）。 |

## 二、迁移到新仓库（GitHub Pages）

1. 打开 `deploy_api.py`，改第 33 行：
   ```python
   REPO = "你的用户名/你的仓库"
   ```
2. 在 GitHub 新建仓库，开启 **Settings → Pages → Source = master / root**。
3. 运行：
   ```bash
   python deploy_all.py            # 全量推送（约 7 批，自动重试）
   ```
4. 等 1~2 分钟 Pages 生效，访问 `https://你的用户名.github.io/你的仓库/`。
5. 验证（5 项自检见 `ARCHIVE_INDEX.md` 第 1 节）：
   - `python build_manifest.py --verify` 输出 `[OK]`
   - 浏览器 F12 Network 无 `js/`、`assets/` 的 404
   - 神魔竞技场可进（验证 `js/arena.js` 已上）
   - 背包宝箱显示写实图标（验证 `assets/items/item_chest_*.png` 已上）
   - 背包/属性为黑金磨砂面板（验证 `css/scroll-panel.css` 已上）

> 迁移到**非 GitHub Pages** 的静态托管（如 Netlify / Vercel / 对象存储）：
> 直接把 `DEPLOY_MANIFEST.txt` 列出的 152 个文件原样上传到站点根目录即可（保持相对路径）。
> 可选一步到位：`zip -@ -r game.zip < DEPLOY_MANIFEST.txt` 打成 zip 后整体上传。

## 三、日常增量部署

只改了个别文件时，仍可用原命令（更快）：
```bash
python deploy_api.py --push index.html js/hub.js
python deploy_api.py --check     # 比对本地/远端差异
```

## 四、已自动排除的噪音（不进迁移包）

以下存在但**不属于运行时设计**，迁移包有意不含，避免污染新仓库：

- `assets/_wm_backup/`（~60 张去水印备份，历史产物）
- `assets/icons/_old_v8/`（旧图标）、`assets/icons/*_raw.png`（抠图中间态）
- `assets/battle/_original_backup/`（战斗立绘原始备份）
- `assets/cover_v11~v16*.png`、`assets/Chinese_fantasy_*.png`、`assets/Realistic_*.png`（旧封面/生成参考图）
- `test/`（回归测试，非运行时；如需保留可单独复制）
- `generated-images/`、`generated-videos/`、`frames_*/`、`*_cutout_*.py`、`wm_video*.py`、`gen_*.py`、`gen_*.js`、`backfill_out.txt`、`daily_out.txt`、`story_out.txt`（开发/生成脚本与中间产物）
- `game_standalone.html`（旧快照，数值与 js/ 冲突，建议废弃）
- `gallery.html` / `gallery_realistic.html`（本地审阅页，非游戏）

## 五、铁律提醒（迁移后勿忘）

1. **改 JS/CSS 内容必须同步 bump `index.html` 里的 `?v=N`**（本项目无构建步骤，靠 `?v` 破 CDN 缓存）。
2. **`saveGame()` 序列化必须同步新字段**；新增 `player.xxx` 须写入，否则读档丢失。
3. **AI 生成的头像/视频资产，用户拍板后必须去水印再交付**（见 BUG 报告 m4）。
4. 线上验证用 `?v=N` 或 Ctrl+Shift+R，Pages 约 1~2 分钟生效。
