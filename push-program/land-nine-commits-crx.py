#!/usr/bin/env python3
"""Land the 9 constitutional-trunk commits to ngesk2/crx-runtime via API.

Preconditions (verified by caller):
- local origin/constitutional-trunk == remote branch tip (ffc2b4d...)
- the 9 commits form a linear chain on top of it
- piging2 credential has push access to ngesk2/crx-runtime

Only uploads objects that differ from the (remotely present) parent state:
changed blobs, changed trees along changed paths, and the 9 commits.
Every created object SHA is verified against the local object.
"""
import base64
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError  # noqa: E402

OWNER, REPO = "ngesk2", "crx-runtime"
BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"
HOSTS = ["api.github.com"]
REPO_DIR = "/tmp/cr-full"
BRANCH = "constitutional-trunk"
TIP = "74fbb74000000000000000000000000000000000"  # placeholder, replaced below
TIP = None

done = set()


def git(*args, raw=False):
    r = subprocess.run(["git", *args], cwd=REPO_DIR, capture_output=True,
                       text=not raw)
    if r.returncode != 0:
        err = r.stderr[:300] if not raw else r.stderr[:300].decode()
        raise RuntimeError(f"git {' '.join(args)} failed: {err}")
    return r.stdout


def api(method, path, body=None, retries=6):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if data else None
    for attempt in range(retries):
        try:
            return api_call(method, BASE + path, credential="custom.github",
                            allowed_hosts=HOSTS, extra_headers=headers,
                            data=data, timeout=60)
        except ApiRequestError as e:
            if e.status in (403, 429) and attempt < retries - 1:
                time.sleep(10 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def ls_tree(sha):
    entries = []
    for line in git("ls-tree", sha).splitlines():
        meta, name = line.split("\t", 1)
        mode, typ, esha = meta.split(" ")
        entries.append({"path": name, "mode": mode, "type": typ, "sha": esha})
    return entries


def ensure_blob(sha):
    if sha in done:
        return
    raw = git("cat-file", "blob", sha, raw=True)
    _, res = api("POST", "/git/blobs",
                 {"content": base64.b64encode(raw).decode(), "encoding": "base64"})
    assert res["sha"] == sha, f"blob SHA mismatch {sha}"
    done.add(sha)


def sync_tree(new_sha, old_sha):
    """Create new_sha (and changed descendants). old_sha exists on remote."""
    if new_sha in done or new_sha == old_sha:
        done.add(new_sha)
        return
    new_entries = {e["path"]: e for e in ls_tree(new_sha)}
    old_entries = {e["path"]: e for e in (ls_tree(old_sha) if old_sha else [])}
    delta = []
    for path, e in new_entries.items():
        old = old_entries.get(path)
        if old and old["sha"] == e["sha"] and old["mode"] == e["mode"]:
            continue
        if e["type"] == "blob":
            ensure_blob(e["sha"])
        elif e["type"] == "tree":
            sync_tree(e["sha"], old["sha"] if old else None)
        # type == "commit" (gitlink): nothing to upload
        delta.append({"path": path, "mode": e["mode"], "type": e["type"],
                      "sha": e["sha"]})
    for path in old_entries:
        if path not in new_entries:
            delta.append({"path": path, "mode": "100644", "type": "blob",
                          "sha": None})
    _, res = api("POST", "/git/trees",
                 {"base_tree": old_sha, "tree": delta} if old_sha
                 else {"tree": delta})
    assert res["sha"] == new_sha, f"tree SHA mismatch {new_sha}"
    done.add(new_sha)


def parse_ident(s):
    name_email, ts, tz = s.rsplit(" ", 2)
    name = name_email[:name_email.rindex("<")].strip()
    email = name_email[name_email.rindex("<") + 1:name_email.rindex(">")]
    sign = 1 if tz[0] == "+" else -1
    off = sign * (int(tz[1:3]) * 60 + int(tz[3:5]))
    dt = datetime.fromtimestamp(int(ts), tz=timezone(timedelta(minutes=off)))
    return {"name": name, "email": email, "date": dt.isoformat()}


def ensure_commit(sha):
    if sha in done:
        return
    raw = git("cat-file", "commit", sha)
    header, _, message = raw.partition("\n\n")
    tree, parents, author, committer = None, [], None, None
    for line in header.splitlines():
        if line.startswith("tree "):
            tree = line[5:].strip()
        elif line.startswith("parent "):
            parents.append(line[7:].strip())
        elif line.startswith("author "):
            author = parse_ident(line[7:])
        elif line.startswith("committer "):
            committer = parse_ident(line[10:])
    assert len(parents) == 1, f"non-linear history at {sha}"
    parent = parents[0]
    if parent not in done:
        # parent is either on the remote already or an earlier commit in our chain
        try:
            _, res = api("GET", f"/git/commits/{parent}")
            assert res["sha"] == parent
            done.add(parent)
        except ApiRequestError as e:
            if e.status in (404, 422):
                ensure_commit(parent)
            else:
                raise
    parent_tree = git("cat-file", "commit", parent).splitlines()[0].split()[1]
    sync_tree(tree, parent_tree)
    _, res = api("POST", "/git/commits", {
        "message": message, "tree": tree, "parents": parents,
        "author": author, "committer": committer})
    assert res["sha"] == sha, f"commit SHA mismatch {sha} != {res['sha']}"
    done.add(sha)
    print(f"  commit {sha[:8]} replicated", flush=True)


def main():
    tip = sys.argv[1]
    base = sys.argv[2]  # remote branch tip SHA (must exist on remote)
    # verify base exists on remote
    _, res = api("GET", f"/git/commits/{base}")
    assert res["sha"] == base, "base commit not on remote"
    done.add(base)
    print(f"base {base[:8]} confirmed on remote", flush=True)

    commits = git("rev-list", "--topo-order", "--reverse",
                  f"{base}..{tip}").split()
    print(f"commits to land: {len(commits)}", flush=True)
    for c in commits:
        ensure_commit(c)

    # fast-forward the branch ref
    _, res = api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": tip})
    print(f"ref updated: {res['ref']} -> {res['object']['sha']}", flush=True)
    assert res["object"]["sha"] == tip
    print("OK: constitutional-trunk landed at", tip, flush=True)


if __name__ == "__main__":
    main()
