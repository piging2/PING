#!/usr/bin/env python3
"""Push a local directory tree to piging2/PING as a new branch, via the
GitHub git-database API, using the connected custom.github credential.

Usage:
  push-via-api.py <tree-dir> <branch> <commit-message>

Creates blobs for every file (parallel), one tree, one commit parented on
the current main tip, and a new branch ref. Prints the commit SHA.
Never prints or persists credential values.
"""
import sys
import os
import json
import base64
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

API_BASE = "https://api.github.com"
REPO = "piging2/PING"
WORKERS = 8
RETRIES = 3


def api(method, path, body=None):
    url = API_BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    last_err = None
    for attempt in range(RETRIES):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        if data:
            req.add_header("Content-Type", "application/json")
        add_surrogate_to_request(req, "custom.github", allowed_hosts=["api.github.com"])
        try:
            resp = urllib.request.urlopen(req, timeout=60)
            return read_json_response(resp)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")[:500]
            if e.code == 429:
                print("HTTP 429 rate limited: hard stop.", file=sys.stderr)
                sys.exit(3)
            last_err = f"HTTP {e.code}: {err_body}"
            if e.code >= 500 and attempt < RETRIES - 1:
                time.sleep(2 ** attempt)
                continue
            print(last_err, file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            if attempt < RETRIES - 1:
                time.sleep(2 ** attempt)
                continue
            print(last_err, file=sys.stderr)
            sys.exit(1)
    print(last_err, file=sys.stderr)
    sys.exit(1)


def collect_files(tree_dir):
    entries = []
    for root, dirs, files in os.walk(tree_dir):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        if ".git" in root.split(os.sep):
            continue
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, tree_dir)
            st = os.stat(full)
            mode = "100755" if (st.st_mode & 0o111) else "100644"
            if os.path.islink(full):
                print(f"SKIP symlink: {rel}", file=sys.stderr)
                continue
            entries.append((rel, full, mode, st.st_size))
    return entries


def create_blob(args):
    rel, full, mode, size = args
    with open(full, "rb") as fh:
        content = base64.b64encode(fh.read()).decode("ascii")
    result = api("POST", f"/repos/{REPO}/git/blobs",
                 {"content": content, "encoding": "base64"})
    return {"path": rel, "mode": mode, "type": "blob", "sha": result["sha"]}


def main():
    tree_dir, branch, message = sys.argv[1], sys.argv[2], sys.argv[3]
    files = collect_files(tree_dir)
    total_bytes = sum(s for _, _, _, s in files)
    print(f"files={len(files)} bytes={total_bytes}", flush=True)

    # Parent: current main tip.
    ref = api("GET", f"/repos/{REPO}/git/ref/heads/main")
    parent_sha = ref["object"]["sha"]
    print(f"parent(main)={parent_sha}", flush=True)

    # Blobs, in parallel.
    tree_entries = []
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(create_blob, a): a[0] for a in files}
        for fut in as_completed(futures):
            tree_entries.append(fut.result())
            done += 1
            if done % 100 == 0:
                print(f"blobs {done}/{len(files)}", flush=True)
    print(f"blobs {done}/{len(files)} complete", flush=True)

    tree_entries.sort(key=lambda e: e["path"])
    tree = api("POST", f"/repos/{REPO}/git/trees", {"tree": tree_entries})
    print(f"tree={tree['sha']}", flush=True)

    commit = api("POST", f"/repos/{REPO}/git/commits",
                 {"message": message, "tree": tree["sha"], "parents": [parent_sha]})
    commit_sha = commit["sha"]
    print(f"commit={commit_sha}", flush=True)

    new_ref = api("POST", f"/repos/{REPO}/git/refs",
                  {"ref": f"refs/heads/{branch}", "sha": commit_sha})
    print(f"branch={new_ref['ref']} url={new_ref['object'].get('url', '')}", flush=True)
    print(f"DEPLOY_SHA={commit_sha}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main()
