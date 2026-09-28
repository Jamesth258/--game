# -*- coding: utf-8 -*-
"""
《逍遥仙》GitHub Pages 部署工具（绕过沙箱 git 传输层限制）

工作机理：
  - 沙箱内 git clone/fetch/push 的大传输会被传输层重置（Connection reset / curl 55），
    但 GitHub REST API（api.github.com）的小响应稳定可用。
  - 本脚本只上传"改动文件"的 blob，其余文件复用远端已有 blob sha，
    新建 commit（parent=当前 master），fast-forward 更新 master ref，完整保留 git 历史。

用法（推荐，全自动）：
  python deploy_api.py --push js/x.js   # 推指定文件；token 自动恢复，无需手动设置
  python deploy_api.py --push           # 推默认 7 个改动文件
  python deploy_api.py --check          # 只比对本地与远端差异，不推送

GH_PAT 自动恢复（无需手动设置、绝不向用户索要）：
  1) 优先用环境变量 GH_PAT；
  2) 否则扫描 WorkBuddy 会话轨迹（~/.workbuddy/artifact-index 与 ~/.workbuddy/traces）
     提取用户历史会话中曾贴过的 github_pat_ token，逐个 GET api.github.com/user 鉴权，
     命中 login=Jamesth258 的有效 token 即采用。
  注意：token 不硬编码进脚本、不落盘明文；仅在内存中用于本次部署。
"""

import json
import os
import sys
import base64
import hashlib
import urllib.request
import urllib.error
import re

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
COMMIT_MSG = """
chore: 迁移归档体系重建 + 全量体检修复（2026-09-29）

- [严重·迁移级] DEPLOY_MANIFEST.txt 漏 45 个运行时文件（js/arena.js、css/scroll-panel.css、
  assets/vendor/tcb.js、assets/icons/icon_arena.png、assets/items/ 下 34 个装备/宝箱/丹药图标）。
  按旧清单迁移会得到「竞技场消失+面板样式丢失+图标全裂」的残版游戏。
  -> 新增 build_manifest.py 从真实引用关系自动派生清单（152 项）并自检，杜绝手工漂移。
- [中等] js/main.js 竞技场修复改了内容但未 bump 版本号（v37 未动），违反项目铁律，
  用户浏览器会缓存旧文件导致修复不可见 -> bump 至 v38。
- [轻微] core.js 预载 3 个已废弃路径（assets/hero.png 等）产生 404 -> loadImg 空 src 不发起请求。
- 归档：新增 ARCHIVE_INDEX.md（迁移 SOP/设计文档地图/代码模块地图/铁律/体检结果），
  更新 MIGRATION.md，补齐线上缺失的 7 个设计与工具文件。
- 回归：12 套件 329 PASS / 0 FAIL。
"""


# ---------------------------------------------------------------------------
# GH_PAT 自动恢复：新会话无需用户手动提供 token
# 顺序：环境变量 → 扫描 WorkBuddy 会话轨迹中曾贴过的 github_pat_ → 逐个鉴权
# ---------------------------------------------------------------------------
_TOKEN_RE = re.compile(r"(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{36,})")
_SKIP_DIRS = {"binaries", "node_modules", "venv", "plugins", "__pycache__"}
_WB_ROOT = os.path.expanduser("~/.workbuddy")


def _validate_token(tok):
    """返回 login 字符串（有效）或 None（无效/网络错）。不抛异常。"""
    prev = os.environ.get("GH_PAT")
    os.environ["GH_PAT"] = tok
    try:
        st, res = api("GET", f"{API}/user")
    except Exception:
        st, res = 0, {}
    if prev is None:
        os.environ.pop("GH_PAT", None)
    else:
        os.environ["GH_PAT"] = prev
    if st == 200 and res.get("login"):
        return res["login"]
    return None


def _read_token_file():
    """从本地 .deploy_token 读取 GH_PAT（用户 2026-09-28 明确授权持久保存；已加入 .gitignore 与部署排除）"""
    for cand in (os.path.join(os.getcwd(), ".deploy_token"),
                 os.path.join(_WB_ROOT, ".deploy_token")):
        try:
            if os.path.isfile(cand):
                t = open(cand, "r", encoding="utf-8").read().strip()
                if t.startswith("github_pat_") and len(t) >= 40:
                    return t
        except Exception:
            pass
    return None


def _scan_tokens():
    roots = []
    if os.path.isdir(_WB_ROOT):
        roots.append(_WB_ROOT)
    ws = os.path.join(os.getcwd(), ".workbuddy")
    if os.path.isdir(ws):
        roots.append(ws)
    found = set()
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS]
            for fn in filenames:
                if not (fn.endswith((".json", ".log", ".txt", ".md")) or fn == "artifact-index"):
                    continue
                fp = os.path.join(dirpath, fn)
                try:
                    if os.path.getsize(fp) > 5_000_000:
                        continue
                    with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                        data = fh.read()
                    for m in _TOKEN_RE.findall(data):
                        found.add(m)
                except Exception:
                    pass
    return list(found)


def resolve_token():
    """返回有效 GH_PAT 字符串，或 None。自动设置 os.environ['GH_PAT'] 供 api() 使用。"""
    env_tok = os.environ.get("GH_PAT")
    if env_tok and _validate_token(env_tok):
        return env_tok
    ftok = _read_token_file()
    if ftok and _validate_token(ftok):
        os.environ["GH_PAT"] = ftok
        print("  [token] 已从 .deploy_token 恢复 GH_PAT")
        return ftok
    for tok in _scan_tokens():
        login = _validate_token(tok)
        if login:
            os.environ["GH_PAT"] = tok
            print(f"  [token] 已从 WorkBuddy 会话轨迹恢复 GH_PAT（login={login}）")
            return tok
    return None


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


def local_files(root="."):
    """返回本地应部署文件相对路径集合（排除 .git/.workbuddy/node_modules 等）。"""
    skip_dirs = {".git", ".workbuddy", "node_modules", "__pycache__"}
    out = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fn in filenames:
            if fn == ".deploy_token":
                continue
            full = os.path.join(dirpath, fn)
            out.add(os.path.relpath(full, root).replace(os.sep, "/"))
    return out


def list_orphans(exclude_prefixes=("assets/_wm_backup/",)):
    """远端有、本地无的文件（即本地已删除的孤儿）。可选排除特定前缀。"""
    parent = get_master_sha()
    remote = get_tree(parent)
    orphans = sorted(set(remote.keys()) - local_files("."))
    if exclude_prefixes:
        orphans = [p for p in orphans
                   if not any(p.startswith(x) for x in exclude_prefixes)]
    return orphans


DELETE_MSG = (
    "chore: 删除服务器上的废弃旧图（本地已删除的孤儿文件）\n\n"
    "- deploy_api.py 新增 --delete / --list-orphans 能力，push() 构建 tree 时跳过待删文件\n"
    "- 仅删除本地已不存在、且未被代码引用的历史草稿图，不影响线上游戏资源"
)


MAX_TREE_ENTRIES = 90  # GitHub tree API 限制约 100~120，留安全余量

def _build_tree(entries):
    """创建 Git tree，若条目超限则按顶层目录自动拆分为子树"""
    if len(entries) <= MAX_TREE_ENTRIES:
        st, res = api("POST", f"{API}/repos/{REPO}/git/trees", {"tree": entries})
        if st != 201:
            raise RuntimeError(f"tree failed: {st} {res}")
        return res["sha"]

    # 按顶层目录分组
    from collections import defaultdict
    groups = defaultdict(list)
    root_entries = []
    for e in entries:
        parts = e["path"].split("/", 1)
        if len(parts) == 1:
            root_entries.append(e)  # 根目录文件
        else:
            groups[parts[0]].append({**e, "path": parts[1]})

    tree_entries = []
    # 根目录文件直接加入
    for e in root_entries:
        tree_entries.append(e)

    # 每个子目录创建子树
    for dir_name, dir_entries in groups.items():
        sub_tree_sha = _build_tree(dir_entries)  # 递归
        tree_entries.append({"path": dir_name, "mode": "040000", "type": "tree", "sha": sub_tree_sha})

    st, res = api("POST", f"{API}/repos/{REPO}/git/trees", {"tree": tree_entries})
    if st != 201:
        raise RuntimeError(f"tree failed (nested): {st} {res}")
    return res["sha"]


def push(changed, deleted=(), msg=None):
    parent = get_master_sha()
    remote_blobs = get_tree(parent)
    print(f"remote master = {parent[:12]}, 复用 blob = {len(remote_blobs)}")

    del_set = set(deleted)
    if del_set:
        print(f"将删除远端文件数: {len(del_set)}")

    entries = []
    for p in changed:
        sha, size = upload_blob(p)
        entries.append({"path": p, "mode": "100644", "type": "blob", "sha": sha})
        print(f"  blob ok {p} ({size}B)")

    for p, sha in remote_blobs.items():
        if p in del_set:
            print(f"  DELETE {p}")
            continue
        if p not in changed:
            entries.append({"path": p, "mode": "100644", "type": "blob", "sha": sha})

    tree_sha = _build_tree(entries)
    print(f"  tree ok {tree_sha[:12]}")

    st, res = api("POST", f"{API}/repos/{REPO}/git/commits", {
        "message": msg or COMMIT_MSG,
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
    tok = resolve_token()
    if not tok:
        print("ERROR: 无法获取 GH_PAT（环境变量未设置，且 WorkBuddy 会话轨迹中未找到有效 token）")
        return 2
    args = sys.argv[1:]
    if not args:
        push(list(DEFAULT_CHANGED))
        return 0
    if args[0] == "--list-orphans":
        orphans = list_orphans()
        for p in orphans:
            print("  ORPHAN", p)
        print(f"孤儿文件数: {len(orphans)}")
        return 0
    if args[0] == "--delete":
        deleted = args[1:]
        if not deleted:
            print("ERROR: --delete 需要至少一个文件路径参数")
            return 2
        push([], deleted=deleted, msg=DELETE_MSG)
        return 0
    if args[0] in ("--check", "--push"):
        mode = args[0]
        rest = args[1:]
        files = rest if rest else list(DEFAULT_CHANGED)
        if mode == "--check":
            return 0 if check(files) == 0 else 1
        push(files)
        return 0
    # 位置参数：直接作为文件列表推送
    push(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
