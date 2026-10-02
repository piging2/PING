#!/usr/bin/env python3
"""Threads Phase A discovery: 26 keyword queries via threads-cli (read-only).
Saves raw sweep to th-discovery-raw-<TS>.json in the engagement passes dir."""
import json, subprocess, sys, time

ACCOUNT_ID = "17841463278521458"
TS = sys.argv[1]
PASSES_DIR = "/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes"

QUERIES = [
    "AI builder", "indie hacker", "startup founder", "AI researcher",
    "tech educator", "AI startup", "vibe coding", "software startup",
    "product builder", "AI automation agency", "Y Combinator founder",
    "AI SaaS", "tech entrepreneur", "founder building AI", "open source",
    "AI product launch", "startup building", "AI agent", "developer tools",
    "ML engineer", "AI research", "tech founder", "software engineer",
    "LLM startup", "AI coding assistant", "startup engineer",
]

raw = {"queries_run": 0, "errors": [], "distinct_posts": 0, "posts": []}
for q in QUERIES:
    try:
        p = subprocess.run(
            ["threads-cli", "search", "--account-id", ACCOUNT_ID,
             "--query", q, "--recent", "1", "--first", "10"],
            capture_output=True, text=True, timeout=90)
        raw["queries_run"] += 1
        if p.returncode != 0:
            raw["errors"].append({"query": q, "err": p.stderr[:300]})
            continue
        data = json.loads(p.stdout)
        edges = (((data.get("data") or {}).get("searchResults") or {}).get("edges") or [])
        for edge in edges:
            node = edge.get("node") or {}
            thread = node.get("thread") or {}
            for ti in thread.get("thread_items") or []:
                post = ti.get("post")
                if post:
                    u = post.get("user") or {}
                    raw["posts"].append({
                        "query": q,
                        "code": post.get("code"),
                        "pk": post.get("pk"),
                        "username": u.get("username"),
                        "full_name": u.get("full_name"),
                        "is_verified": u.get("is_verified"),
                        "text": (post.get("caption") or {}).get("text", "")[:500],
                        "has_liked": post.get("has_liked"),
                        "like_count": post.get("like_count"),
                        "taken_at": post.get("taken_at"),
                    })
    except Exception as e:
        raw["errors"].append({"query": q, "err": str(e)[:300]})

# dedupe by post id / code
seen = set()
uniq = []
for entry in raw["posts"]:
    key = entry.get("pk") or entry.get("code")
    if not key or key in seen:
        continue
    seen.add(key)
    uniq.append(entry)
raw["distinct_posts"] = len(uniq)
raw["posts"] = uniq

out = f"{PASSES_DIR}/th-discovery-raw-{TS}.json"
with open(out, "w") as f:
    json.dump(raw, f)
print(f"queries={raw['queries_run']} errors={len(raw['errors'])} distinct={raw['distinct_posts']} -> {out}")
for e in raw["errors"][:5]:
    print("ERR:", e)
