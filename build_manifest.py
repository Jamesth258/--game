# -*- coding: utf-8 -*-
"""
《逍遥仙》部署清单自动生成器 —— 从真实引用关系派生 DEPLOY_MANIFEST.txt。

存在理由：手工维护清单会漂移（2026-09-29 实测漏了 45 个运行时文件：js/arena.js、
css/scroll-panel.css、assets/vendor/tcb.js、assets/icons/icon_arena.png 及 assets/items/
下 41 个装备/宝箱/丹药图标）。按当时清单迁移会导致竞技场消失、面板样式丢失、图标全裂。
故改为代码派生，杜绝遗忘。

用法:  python build_manifest.py            # 重新生成清单并自检
       python build_manifest.py --verify   # 只校验现有清单，不重写
"""

import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(BASE, "DEPLOY_MANIFEST.txt")

# 运行时资产目录白名单（子目录内的 _ 开头文件视为中间产物，自动排除）
ASSET_DIRS = ["avatars", "battle", "bg", "select", "icons", "items"]
EXTRA_ASSETS = ["assets/vendor/tcb.js", "assets/cover.png"]
ASSET_EXT = (".png", ".jpg", ".jpeg", ".mp4", ".webp", ".gif")


def rd(p):
    with open(p, encoding="utf-8", errors="ignore") as f:
        return f.read()


def build():
    files = []
    seen = set()

    def add(p):
        p = p.replace(os.sep, "/").lstrip("./")
        if p in seen:
            return
        seen.add(p)
        files.append(p)

    # 1) 入口页
    add("index.html")

    # 2) index.html 直接引用的 js / css（剥离 ?v=N 版本号）
    ih = rd(os.path.join(BASE, "index.html"))
    for m in re.findall("<script[^>]*src=\"([^\"]+)\"", ih):
        add(m.split("?")[0])
    for m in re.findall("<link[^>]*href=\"([^\"]+)\"", ih):
        add(m.split("?")[0])

    # 3) js 全量（防止新增模块忘记挂进 index.html 之外的地方）
    jsd = os.path.join(BASE, "js")
    for f in sorted(os.listdir(jsd)):
        if f.endswith(".js") and not f.startswith("_"):
            add("js/" + f)

    # 4) 运行时资产
    for d in ASSET_DIRS:
        full = os.path.join(BASE, "assets", d)
        if not os.path.isdir(full):
            continue
        for f in sorted(os.listdir(full)):
            if f.startswith("_") or f.startswith("."):
                continue
            if not f.lower().endswith(ASSET_EXT):
                continue
            if f.endswith("_raw.png"):   # 抠图中间态
                continue
            if not os.path.isfile(os.path.join(full, f)):
                continue
            add("assets/%s/%s" % (d, f))

    for a in EXTRA_ASSETS:
        add(a)

    return files


def verify(files):
    ok = True
    miss = [f for f in files if not os.path.isfile(os.path.join(BASE, f))]
    if miss:
        ok = False
        print("[X] 清单中磁盘不存在的文件:")
        for m in miss:
            print("     ", m)

    ih = rd(os.path.join(BASE, "index.html"))
    refs = set()
    for m in re.findall("<script[^>]*src=\"([^\"]+)\"", ih):
        refs.add(m.split("?")[0])
    for m in re.findall("<link[^>]*href=\"([^\"]+)\"", ih):
        refs.add(m.split("?")[0])
    gaps = sorted(r for r in refs if r not in set(files))
    if gaps:
        ok = False
        print("[X] index.html 引用但清单缺失（迁移后会 404）:")
        for g in gaps:
            print("     ", g)

    if ok:
        print("[OK] 校验通过：清单 %d 项，全部存在且覆盖 index.html 全部引用" % len(files))
    return ok


HEADER = [
    "# 《逍遥仙》一次性部署权威清单（运行时文件，构成当前全部游戏设计）",
    "# !! 本文件由 build_manifest.py 自动生成，请勿手工编辑（手工维护会漏文件）",
    "# !! 重新生成：python build_manifest.py",
    "# 由 deploy_all.py 读取并按批推送；迁移到新仓库后运行即可完整重现",
]


def main():
    files = build()
    if "--verify" in sys.argv:
        sys.exit(0 if verify(files) else 1)
    if not verify(files):
        print("[X] 校验未通过，已中止写入")
        sys.exit(1)
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(HEADER) + "\n")
        for p in files:
            f.write(p + "\n")
    print("[OK] 已生成 %s：%d 项" % (MANIFEST, len(files)))


if __name__ == "__main__":
    main()
