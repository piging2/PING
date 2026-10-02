#!/usr/bin/env python3
"""Phase A Threads discovery via threads-cli keyword search (read-only).
Mirrors passes 77-83 query set. Writes th-discovery-raw-<ts>.json."""
import json, subprocess, sys, datetime

TS = sys.argv[1]
ACCT = "17841463278521458"
OUT = f"/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/th-discovery-raw-{TS}.json"

QUERIES = ["AI builder","indie hacker","startup founder","AI researcher","tech educator",
"AI startup","vibe coding","software startup","product builder","AI automation agency",
"Y Combinator founder","AI SaaS","tech entrepreneur","founder building AI","open source",
"AI product launch","startup building","AI agent","developer tools","ML engineer",
"AI research","tech founder","software engineer","LLM startup","AI coding assistant","startup engineer"]

posts = {}
errors = []
queries_run = 0

def run_search(q):
    cmd = ["threads-cli","--account-id",ACCT,"search","--query",q,"--first","20"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    except Exception as e:
        errors.append({"query": q, "error": f"timeout/exception: {e}"})
        return
    if r.returncode != 0:
        errors.append({"query": q, "error": r.stderr[:200]})
        return
    try:
        data = json.loads(r.stdout)
    except Exception as e:
        errors.append({"query": q, "error": f"json parse: {e}"})
        return
    items = data.get("data", {}).get("searchResults", {}).get("edges", [])
    for edge in items:
        thread = (edge.get("node") or {}).get("thread") or {}
        for ti in thread.get("thread_items") or []:
            it = ti.get("post") or {}
            try:
                user = it.get("user") or {}
                code = it.get("code") or ""
                uname = user.get("username") or ""
                if not code or not uname:
                    continue
                key = (uname, code)
                if key in posts:
                    continue
                caption = it.get("caption") or {}
                text = caption.get("text") if isinstance(caption, dict) else str(caption)
                mca = it.get("media_captured_at") or {}
                posts[key] = {
                    "account": f"@{uname}",
                    "username": uname,
                    "full_name": user.get("full_name") or "",
                    "is_verified": bool(user.get("is_verified")),
                    "code": code,
                    "url": f"https://www.threads.com/@{uname}/post/{code}/",
                    "has_liked": bool(it.get("has_liked")),
                    "like_count": it.get("like_count") or 0,
                    "taken_at_utc": mca.get("utc") or str(it.get("taken_at") or ""),
                    "caption_preview": (text or "")[:400],
                    "query": q,
                }
            except Exception:
                continue

for q in QUERIES:
    queries_run += 1
    run_search(q)
    print(f"done {queries_run}/{len(QUERIES)}: {q} -> {len(posts)} total", flush=True)

raw = {"queries_run": queries_run, "errors": errors,
       "distinct_posts": len(posts), "posts": list(posts.values())}
with open(OUT, "w") as f:
    json.dump(raw, f, indent=1)
print(f"WROTE {OUT}: {len(posts)} distinct posts, {len(errors)} errors")
