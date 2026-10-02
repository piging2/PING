import json, subprocess, sys, time
QUERIES = ["AI builder","indie hacker","startup founder","AI researcher","tech educator",
"AI startup","vibe coding","software startup","product builder","AI automation agency",
"Y Combinator founder","AI SaaS","tech entrepreneur","founder building AI","open source",
"AI product launch","startup building","AI agent","developer tools","ML engineer",
"AI research","tech founder","software engineer","LLM startup","AI coding assistant",
"startup engineer"]
OUT = "/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/th-discovery-raw-20260922-0501.json"
results = {"ts": "20260922-0501", "queries": {}, "errors": {}}
for q in QUERIES:
    try:
        r = subprocess.run(["threads-cli","search","--query",q,"--first","20","--account-id","17841463278521458"],
                           capture_output=True, text=True, timeout=90)
        data = json.loads(r.stdout)
        # threads-cli wraps output; find the list of media
        posts = []
        def walk(o):
            if isinstance(o, dict):
                if "code" in o and "user" in o:
                    posts.append(o)
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(data)
        results["queries"][q] = posts
        print(f"OK {q}: {len(posts)} posts", flush=True)
    except Exception as e:
        results["errors"][q] = str(e)[:120]
        print(f"ERR {q}: {e}", flush=True)
    time.sleep(2)
json.dump(results, open(OUT,"w"))
print("wrote", OUT, "queries:", len(results["queries"]), "errors:", len(results["errors"]))
