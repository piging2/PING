#!/usr/bin/env python3
"""Replicate a local branch to piging2/PING via the GitHub Git Database API.

Used when git-over-HTTPS push is unavailable (the connected credential is
scoped to api.github.com only). Recreates blobs -> trees -> commits
oldest-first, verifying every returned SHA matches the local object.
Idempotent: the Git Database API returns existing objects for identical
content, so re-runs are safe.

Usage: replicate-branch-via-api.py <branch> <tip-sha>
"""
import base64
import concurrent.futures as cf
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError  # noqa: E402

OWNER, REPO = "piging2", "PING"
BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"
HOSTS = ["api.github.com"]
REPO_DIR = "/home/hatch/workspace"

done = set()


def git(*args, raw=False):
    r = subprocess.run(["git", *args], cwd=REPO_DIR, capture_output=True,
                       text=not raw)
    if r.returncode != 0:
        err = r.stderr[:300] if not raw else r.stderr[:300].decode()
        raise RuntimeError(f"git {' '.join(args)} failed: {err}")
    return r.stdout


def api(method, path, body=None, retries=8):
    import http.client
    import urllib.error
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
        except (http.client.RemoteDisconnected, http.client.HTTPException,
                urllib.error.URLError, ConnectionError, TimeoutError) as e:
            if attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def ensure_blob(sha):
    if sha in done:
        return
    raw = git("cat-file", "blob", sha, raw=True)
    _, res = api("POST", "/git/blobs",
                 {"content": base64.b64encode(raw).decode(), "encoding": "base64"})
    assert res["sha"] == sha, f"blob SHA mismatch {sha} != {res['sha']}"
    done.add(sha)


def ensure_tree(sha):
    if sha in done:
        return
    entries = []
    for line in git("ls-tree", sha).splitlines():
        meta, name = line.split("\t", 1)
        mode, typ, esha = meta.split(" ")
        if typ == "blob":
            ensure_blob(esha)
        elif typ == "tree":
            ensure_tree(esha)
        # typ == "commit" (gitlink): nothing to upload
        entries.append({"path": name, "mode": mode, "type": typ, "sha": esha})
    _, res = api("POST", "/git/trees", {"tree": entries})
    assert res["sha"] == sha, f"tree SHA mismatch {sha} != {res['sha']}"
    done.add(sha)


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
    for p in parents:
        ensure_commit(p)
    ensure_tree(tree)
    _, res = api("POST", "/git/commits", {
        "message": message, "tree": tree, "parents": parents,
        "author": author, "committer": committer})
    assert res["sha"] == sha, f"commit SHA mismatch {sha} != {res['sha']}"
    done.add(sha)


def main():
    branch, tip = sys.argv[1], sys.argv[2]

    # Fast path: tip already replicated (e.g. re-run after ref failure).
    try:
        status, res = api("GET", f"/git/commits/{tip}")
        if res["sha"] == tip:
            print("tip commit already on remote; skipping object upload", flush=True)
            commits = []
        else:
            commits = None
    except ApiRequestError as e:
        if e.status in (404, 422):  # commit object not on remote; proceed to upload
            commits = None
        else:
            raise
    if commits is None:
        commits = git("rev-list", "--topo-order", "--reverse", branch).split()
    print(f"commits to replicate: {len(commits)}", flush=True)

    # Phase 1: all blobs, in parallel (single batch type-query first).
    if commits:
        objs = git("rev-list", "--objects", branch).splitlines()
        p = subprocess.run(["git", "cat-file", "--batch-check=%(objectname) %(objecttype)"],
                           cwd=REPO_DIR, input="\n".join(o.split(" ", 1)[0] for o in objs),
                           capture_output=True, text=True)
        blob_shas = [ln.split(" ")[0] for ln in p.stdout.splitlines()
                     if ln.endswith(" blob")]
        print(f"blobs: {len(blob_shas)}", flush=True)
        with cf.ThreadPoolExecutor(max_workers=10) as ex:
            futs = [ex.submit(ensure_blob, s) for s in blob_shas]
            for i, f in enumerate(cf.as_completed(futs)):
                f.result()
                if (i + 1) % 200 == 0:
                    print(f"  blobs {i + 1}/{len(blob_shas)}", flush=True)
        print(f"blobs done: {sum(1 for _ in blob_shas)}", flush=True)

        # Phase 2: commits oldest-first (trees ensured recursively).
        # Fast-forward: skip commits already on the remote (re-run safe).
        for i, c in enumerate(commits):
            if c not in done:
                try:
                    _, res = api("GET", f"/git/commits/{c}")
                    if res["sha"] == c:
                        done.add(c)
                        continue
                except ApiRequestError as e:
                    if e.status not in (404, 422):
                        raise
            ensure_commit(c)
            if (i + 1) % 10 == 0:
                print(f"  commits {i + 1}/{len(commits)}", flush=True)
        print("object replication complete", flush=True)

    # Phase 3: create the branch ref.
    _, res = api("POST", "/git/refs",
                 {"ref": f"refs/heads/{branch}", "sha": tip})
    print(f"ref created: {res['ref']} -> {res['object']['sha']}", flush=True)
    assert res["object"]["sha"] == tip, "ref SHA mismatch"
    print("OK: remote branch at expected SHA", flush=True)


if __name__ == "__main__":
    main()
