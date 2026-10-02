#!/usr/bin/env python3
"""Threads engagement pass Phase A: keyword sweep via threads-cli (read-only)."""
import json, subprocess, sys, datetime

TS = "20260922-0905"
OUTDIR = "/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes"
ACCOUNT = "17841463278521458"

QUERIES = [
    "AI builder", "indie hacker", "startup founder", "AI researcher",
    "tech educator", "AI startup", "vibe coding", "software startup",
    "product builder", "AI automation agency", "Y Combinator founder",
    "AI SaaS", "tech entrepreneur", "founder building AI", "open source",
    "AI product launch", "startup building", "AI agent", "developer tools",
    "ML engineer", "AI research", "tech founder", "software engineer",
    "LLM startup", "AI coding assistant", "startup engineer",
]

def run_search(q):
    r = subprocess.run(
        ["threads-cli", "search", "--query", q, "--account-id", ACCOUNT, "--first", "20"],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        return None, r.stderr.strip()[:200]
    try:
        return json.loads(r.stdout), None
    except Exception as e:
        return None, f"json-parse: {e}"

def extract_posts(data):
    out = []
    try:
        edges = data["data"]["searchResults"]["edges"]
    except (KeyError, TypeError):
        return out
    for e in edges:
        try:
            items = e["node"]["thread"]["thread_items"]
        except (KeyError, TypeError):
            continue
        for it in items:
            p = it.get("post") or {}
            u = p.get("user") or {}
            cap = (p.get("caption") or {}).get("text", "")
            out.append({
                "username": u.get("username"),
                "full_name": u.get("full_name"),
                "is_verified": bool(u.get("is_verified")),
                "code": p.get("code"),
                "has_liked": bool(p.get("has_liked")),
                "like_count": p.get("like_count"),
                "taken_at": p.get("taken_at"),
                "text": cap[:280],
            })
    return out

seen = {}
errors = []
for q in QUERIES:
    data, err = run_search(q)
    if err:
        errors.append({"query": q, "error": err})
        continue
    for p in extract_posts(data):
        if not p["username"] or not p["code"]:
            continue
        key = (p["username"], p["code"])
        if key not in seen:
            p["query"] = q
            seen[key] = p

posts = list(seen.values())
ts = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
raw_path = f"{OUTDIR}/th-discovery-raw-{TS}.json"
with open(raw_path, "w") as f:
    json.dump({
        "pass_id": f"th-{TS}", "ts": ts,
        "queries": QUERIES, "query_errors": errors,
        "post_count": len(posts),
        "user_count": len({p["username"] for p in posts}),
        "verified_count": sum(1 for p in posts if p["is_verified"]),
        "posts": posts,
    }, f, indent=1)

print(json.dumps({
    "raw": raw_path, "queries_ok": len(QUERIES) - len(errors),
    "errors": errors, "posts": len(posts),
    "users": len({p["username"] for p in posts}),
    "verified": sum(1 for p in posts if p["is_verified"]),
}))
