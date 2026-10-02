#!/usr/bin/env python3
"""Threads keyword discovery sweep (read-only) for the threads-engagement pass.
Replicates the passes 77-87 sweep: 26 keyword queries via threads-cli search,
authenticated as @nolanpigi. Output matches th-discovery-raw-<ts>.json format.
"""
import json, subprocess, sys, os

ACCOUNT_ID = "17841463278521458"
QUERIES = [
    'AI SaaS','AI agent','AI automation agency','AI builder','AI coding assistant',
    'AI product launch','AI research','AI researcher','AI startup','LLM startup',
    'ML engineer','Y Combinator founder','developer tools','founder building AI',
    'indie hacker','open source','product builder','software engineer',
    'software startup','startup building','startup engineer','startup founder',
    'tech educator','tech entrepreneur','tech founder','vibe coding',
]

def run_query(q):
    try:
        r = subprocess.run(
            ["threads-cli","search","--query",q,"--first","20",
             "--account-id",ACCOUNT_ID],
            capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            return None, f"rc={r.returncode} stderr={r.stderr[:200]}"
        return json.loads(r.stdout), None
    except Exception as e:
        return None, f"exc={type(e).__name__}:{e}"

def main(ts):
    outdir = os.path.expanduser("~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes")
    os.makedirs(outdir, exist_ok=True)
    posts = []
    errors = []
    seen_pk = set()
    for q in QUERIES:
        data, err = run_query(q)
        if err:
            errors.append({"query": q, "error": err})
            continue
        try:
            edges = data["data"]["searchResults"]["edges"]
        except Exception as e:
            errors.append({"query": q, "error": f"parse:{e}"})
            continue
        for e in edges:
            try:
                item = e["node"]["thread"]["thread_items"][0]["post"]
            except Exception:
                continue
            pk = str(item.get("pk") or "")
            if not pk or pk in seen_pk:
                continue
            seen_pk.add(pk)
            user = item.get("user") or {}
            cap = item.get("caption") or {}
            posts.append({
                "query": q,
                "code": item.get("code"),
                "pk": pk,
                "username": user.get("username"),
                "full_name": user.get("full_name"),
                "is_verified": bool(user.get("is_verified")),
                "text": cap.get("text"),
                "has_liked": bool(item.get("has_liked")),
                "like_count": item.get("like_count"),
                "taken_at": item.get("taken_at"),
            })
    users = set(p["username"] for p in posts if p["username"])
    verified = sum(1 for p in posts if p["is_verified"])
    out = {
        "queries_run": len(QUERIES),
        "errors": errors,
        "distinct_posts": len(posts),
        "distinct_users": len(users),
        "verified_count": verified,
        "posts": posts,
    }
    path = os.path.join(outdir, f"th-discovery-raw-{ts}.json")
    with open(path, "w") as f:
        json.dump(out, f, ensure_ascii=False)
    print(json.dumps({"raw_file": path, "distinct_posts": len(posts),
                      "distinct_users": len(users), "verified": verified,
                      "errors": len(errors)}))

if __name__ == "__main__":
    main(sys.argv[1])
