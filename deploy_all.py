# -*- coding: utf-8 -*-
"""
《逍遥仙》一次性部署脚本 —— 读取 DEPLOY_MANIFEST.txt，按批推送，完整重现当前游戏设计。

设计要点：
  - deploy_api.py 的 push() 是「叠加式」：保留远端已有 blob，仅叠加/更新 changed 列表。
    因此把清单拆成多批顺序推送，最终远端 = 全部清单文件（无论目标仓库是空还是已有内容）。
  - GitHub tree API 一次塞太多文件会偶发 422，故每批上限 18 个（视频等大体量留余量）。
  - 每批失败自动重试 3 次。

用法：
  python deploy_all.py                 # 按 DEPLOY_MANIFEST.txt 全量推送
  python deploy_all.py --check         # 仅比对本地与远端差异，不推送
  python deploy_all.py --dry-run       # 打印将推送的文件分批，不实际部署

迁移到新仓库：
  1) 修改 deploy_api.py 顶部 REPO = "你的用户名/你的仓库"
  2) 新仓库需已开启 GitHub Pages（分支选 master，根目录）
  3) 运行  python deploy_all.py
  4) 等 1~2 分钟 Pages 生效，访问 https://你的用户名.github.io/你的仓库/
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "DEPLOY_MANIFEST.txt")
BATCH = 18
RETRIES = 3


def load_manifest():
    files = []
    with open(MANIFEST, encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            files.append(s)
    return files


def batched(files, n):
    for i in range(0, len(files), n):
        yield files[i:i + n]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode not in ("", "--check", "--dry-run"):
        print("用法: python deploy_all.py [--check|--dry-run]")
        sys.exit(2)

    files = load_manifest()
    print(f"清单文件数: {len(files)}，分 { (len(files)+BATCH-1)//BATCH } 批（每批≤{BATCH}）")

    if mode == "--dry-run":
        for i, b in enumerate(batched(files, BATCH), 1):
            print(f"  批{i}: {len(b)} 个 -> {b[0]} ... {b[-1]}")
        return

    # 动态导入 deploy_api（模块级无副作用，可安全 import）
    sys.path.insert(0, HERE)
    import deploy_api

    if mode == "--check":
        sys.argv = ["deploy_api.py", "--check"]
        deploy_api.main()
        return

    ok = 0
    for i, b in enumerate(batched(files, BATCH), 1):
        last_err = None
        for attempt in range(1, RETRIES + 1):
            try:
                print(f"\n=== 推送批 {i}/{ (len(files)+BATCH-1)//BATCH } (尝试{attempt}) ===")
                deploy_api.push(b, msg=f"deploy: 批量部署批 {i}（共 {len(files)} 文件）")
                ok += 1
                break
            except Exception as e:  # noqa
                last_err = e
                print(f"  批{i} 第{attempt}次失败: {e}")
                time.sleep(2 * attempt)
        else:
            print(f"✗ 批{i} 连续 {RETRIES} 次失败，中止。已成功 {ok} 批。")
            print("提示：先确认网络/GitHub token，或把此批文件单独 python deploy_api.py --push <文件...> 手动补推。")
            sys.exit(1)

    print(f"\n✅ 部署完成：{ok} 批 / 共 {len(files)} 文件已推送。")


if __name__ == "__main__":
    main()
