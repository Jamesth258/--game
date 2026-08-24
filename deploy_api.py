# -*- coding: utf-8 -*-
"""
《逍遥仙》GitHub Pages 部署工具（绕过沙箱 git 传输层限制）

工作机理：
  - 沙箱内 git clone/fetch/push 的大传输会被传输层重置（Connection reset / curl 55），
    但 GitHub REST API（api.github.com）的小响应稳定可用。
  - 本脚本只上传"改动文件"的 blob，其余文件复用远端已有 blob sha，
    新建 commit（parent=当前 master），fast-forward 更新 master ref，完整保留 git 历史。

用法：
  set GH_PAT=github_pat_xxx
  python deploy_api.py --check        # 只比对本地与远端差异，不推送
  python deploy_api.py --push         # 推送默认 7 个改动文件
  python deploy_api.py --push js/x.js # 推送指定文件

注意：GH_PAT 为 fine-grained token，不要硬编码进脚本，从环境变量读取。
"""

import json
import os
import sys
import base64
import hashlib
import urllib.request
import urllib.error

REPO = "Jamesth258/--game"
API = "https://api.github.com"
DEFAULT_CHANGED = [
    "js/equip_db.js",
    "js/player.js",
    "js/battle.js",
    "js/codex.js",
    "js/hub.js",
    "js/skills-data.js",
    "gen_skills.py",
]
COMMIT_MSG = (
    "fix: 修复被动心法暴击率/暴伤未进入战斗判定的BUG\n\n"
    "- 根因：属性面板 player.critRate 计入被动心法 pasCrit，但战斗判定 damage() 的 aMods.critRate\n"
    "  仅来自 computeEquipMods（装备+套装），漏算被动心法，导致面板满暴击实战不出暴击\n"
    "- 修复：computeEquipMods() 累加 player.learned 被动 pasCrit/pasCritDmg，使面板与实战同源\n"
    "- 暴伤 pasCritDmg 同样修正\n"
    "- 新增 test/crit_panel.test.js G) 回归断言（bu018 被动暴击 / bu006 被动暴伤进战斗）"
)


def api(method, url, body=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", "Bearer " + os.environ["GH_PAT"])
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "wb-deploy")
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=data, timeout=60) as r:
        raw = r.read()
        return r.status, (json.loads(raw) if raw else {})


def get_master_sha():
    st, res = api("GET", f"{API}/repos/{REPO}/git/refs/heads/master")
    if st != 200:
        raise RuntimeError(f"get ref failed: {st} {res}")
    return res["object"]["sha"]


def get_tree(sha):
    st, res = api("GET", f"{API}/repos/{REPO}/git/trees/{sha}?recursive=1")
    if st != 200:
        raise RuntimeError(f"get tree failed: {st} {res}")
    return {it["path"]: it["sha"] for it in res["tree"] if it["type"] == "blob"}


def upload_blob(path):
    with open(path, "rb") as f:
        content = f.read()
    st, res = api("POST", f"{API}/repos/{REPO}/git/blobs",
                  {"content": base64.b64encode(content).decode("ascii"), "encoding": "base64"})
    if st != 201:
        raise RuntimeError(f"blob {path} failed: {st} {res}")
    return res["sha"], len(content)


def check(changed):
    parent = get_master_sha()
    remote_blobs = get_tree(parent)
    print(f"remote master = {parent[:12]}, blobs = {len(remote_blobs)}")
    diff = 0
    for p in changed:
        rsha = remote_blobs.get(p)
        if rsha is None:
            print(f"  NEW  {p}  (不在远端)")
            diff += 1
            continue
        with open(p, "rb") as f:
            content = f.read()
        # git blob sha = sha1("blob <len>\0" + content)
        lsha = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\x00" + content).hexdigest()
        mark = "SAME " if rsha == lsha else "DIFF "
        if rsha != lsha:
            diff += 1
        print(f"  {mark} {p}")
    print(f"差异文件数: {diff}")
    return diff


def push(changed):
    parent = get_master_sha()
    remote_blobs = get_tree(parent)
    print(f"remote master = {parent[:12]}, 复用 blob = {len(remote_blobs)}")

    entries = []
    for p in changed:
        sha, size = upload_blob(p)
        entries.append({"path": p, "mode": "100644", "type": "blob", "sha": sha})
        print(f"  blob ok {p} ({size}B)")

    for p, sha in remote_blobs.items():
        if p not in changed:
            entries.append({"path": p, "mode": "100644", "type": "blob", "sha": sha})

    st, res = api("POST", f"{API}/repos/{REPO}/git/trees", {"tree": entries})
    if st != 201:
        raise RuntimeError(f"tree failed: {st} {res}")
    tree_sha = res["sha"]
    print(f"  tree ok {tree_sha[:12]}")

    st, res = api("POST", f"{API}/repos/{REPO}/git/commits", {
        "message": COMMIT_MSG,
        "tree": tree_sha,
        "parents": [parent],
        "author": {"name": "Jamesth258", "email": "jamesth258@users.noreply.github.com"},
        "committer": {"name": "Jamesth258", "email": "jamesth258@users.noreply.github.com"},
    })
    if st != 201:
        raise RuntimeError(f"commit failed: {st} {res}")
    commit_sha = res["sha"]
    print(f"  commit ok {commit_sha[:12]}")

    st, res = api("PATCH", f"{API}/repos/{REPO}/git/refs/heads/master",
                  {"sha": commit_sha, "force": False})
    if st != 200:
        raise RuntimeError(f"ref failed: {st} {res}")
    print(f"  ref -> {res['object']['sha'][:12]}  DONE")


def main():
    if "GH_PAT" not in os.environ:
        print("ERROR: 请先设置环境变量 GH_PAT")
        return 2
    mode = "--push"
    files = list(DEFAULT_CHANGED)
    args = sys.argv[1:]
    if args and args[0] in ("--check", "--push"):
        mode = args[0]
        rest = args[1:]
    else:
        rest = args
    if rest:
        files = rest
    if mode == "--check":
        return 0 if check(files) == 0 else 1
    else:
        push(files)
        return 0


if __name__ == "__main__":
    sys.exit(main())
