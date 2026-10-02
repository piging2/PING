#!/usr/bin/env python3
"""threads-discovery-sweep.py -- READ-ONLY Threads keyword discovery sweep.
Runs the standing 26-query set via threads-cli search, dedupes posts by code,
writes the raw sweep JSON in the same shape as passes 77-88.
Usage: threads-discovery-sweep.py <timestamp> <outdir>
Writes: th-discovery-raw-<timestamp>.json in <outdir>.
"""
import json, subprocess, sys, time

QUERIES = [
    "AI builder", "indie hacker", "startup founder", "AI researcher",
    "tech educator", "AI startup", "vibe coding", "software startup",
    "product builder", "AI automation agency", "Y Combinator founder",
    "AI SaaS", "tech entrepreneur", "founder building AI", "open source",
    "AI product launch", "startup building", "AI agent", "developer tools",
    "ML engineer", "AI research", "tech founder", "software engineer",
    "LLM startup", "AI coding assistant", "startup engineer",
]

def run_search(query):
    cmd = ["threads-cli", "search", "--query", query, "--first", "20",
           "--retries", "1", "--account-id", "17841463278521458"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            return None, f"exit={r.returncode} stderr={r.stderr[:200]}"
        return json.loads(r.stdout), None
    except Exception as e:
        return None, f"exception: {e}"

def extract_posts(data, query):
    posts = []
    if not isinstance(data, dict):
        return posts
    edges = (((data.get("data") or {}).get("searchResults") or {}).get("edges")) or []
    for edge in edges:
        node = (edge or {}).get("node") or {}
        thread = node.get("thread") or {}
        for item in thread.get("thread_items") or []:
            post = (item or {}).get("post") or {}
            user = post.get("user") or {}
            caption = post.get("caption") or {}
            posts.append({
                "query": query,
                "code": post.get("code"),
                "pk": post.get("pk"),
                "username": user.get("username"),
                "full_name": user.get("full_name"),
                "is_verified": bool(user.get("is_verified")),
                "text": caption.get("text") if isinstance(caption, dict) else None,
                "has_liked": bool(post.get("has_liked")),
                "like_count": post.get("like_count"),
                "taken_at": post.get("taken_at"),
            })
    return posts

def main():
    ts, outdir = sys.argv[1], sys.argv[2]
    errors = []
    seen = {}
    for q in QUERIES:
        data, err = run_search(q)
        if err:
            errors.append({"query": q, "error": err})
            continue
        for p in extract_posts(data, q):
            key = p.get("code") or p.get("pk")
            if key and key not in seen:
                seen[key] = p
        time.sleep(2)
    posts = list(seen.values())
    users = {p["username"] for p in posts if p.get("username")}
    verified = {p["username"] for p in posts if p.get("is_verified") and p.get("username")}
    out = {
        "queries_run": len(QUERIES),
        "errors": errors,
        "distinct_posts": len(posts),
        "distinct_users": len(users),
        "verified_count": len(verified),
        "posts": posts,
    }
    path = f"{outdir}/th-discovery-raw-{ts}.json"
    with open(path, "w") as f:
        json.dump(out, f)
    print(json.dumps({"ok": True, "path": path, "queries_run": len(QUERIES),
                      "errors": len(errors), "distinct_posts": len(posts),
                      "distinct_users": len(users), "verified_count": len(verified)}))

if __name__ == "__main__":
    main()
