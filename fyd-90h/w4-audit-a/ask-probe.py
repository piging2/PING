#!/usr/bin/env python3
# W4 Audit A - Ask FYD probe against served :3100 (read-only HTTP)
import json, urllib.request, urllib.error

BASE = "http://127.0.0.1:3100"
QUESTIONS = [
    "What is FYD?",
    "How is FYD different from a normal website builder?",
    "What can PING objects do?",
    "How do you know?",
    "What changed?",
]

def post(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"_raw": "unparseable"}
    except Exception as e:
        return -1, {"_error": str(e)}

def get(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=30) as r:
            return r.status, len(r.read())
    except urllib.error.HTTPError as e:
        return e.code, 0
    except Exception as e:
        return -1, str(e)

print("=== route reachability ===")
for p in ["/api/fyd/ask/ping-fyd", "/build/ping-fyd", "/api/ping/ask"]:
    print(p, "->", get(p) if p != "/api/fyd/ask/ping-fyd" else "(POST only, see below)")

print()
print("=== Ask FYD probes (siteId=ping-fyd) ===")
for q in QUESTIONS:
    status, resp = post("/api/fyd/ask/ping-fyd", {"question": q})
    ans = resp.get("answer", "") if isinstance(resp, dict) else ""
    print(f"--- Q: {q}")
    print(f"    status={status} answerClass={resp.get('answerClass') if isinstance(resp, dict) else '?'} "
          f"answerState={resp.get('answerState') if isinstance(resp, dict) else '?'} "
          f"claims={len(resp.get('claims', [])) if isinstance(resp, dict) else '?'} "
          f"citations={len(resp.get('citations', [])) if isinstance(resp, dict) else '?'}")
    print(f"    answer[0:280]: {str(ans)[:280]}")
    if isinstance(resp, dict) and resp.get("unknowns"):
        print(f"    unknowns: {resp['unknowns'][:3]}")
print("DONE")
