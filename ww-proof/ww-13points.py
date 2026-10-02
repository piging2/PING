import json, urllib.request, urllib.parse

BASE = "http://127.0.0.1:3101"
SITE = "wicked-wrench"

def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return r.status, r.read().decode()

def post(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.load(r)

print("=== 13 PROOF POINTS: WICKED WRENCH DIESEL ===\n")

# 1. Real acquisition
s, html = get(f"/sites/{SITE}")
print(f"(1) ACQUISITION: home page HTTP {s}, {len(html)} bytes")

# 2. Object graph (via ask evidence)
a = post("/api/ask", {"site": SITE, "question": "What services does this business offer?"})
print(f"(2) OBJECT GRAPH: {len(a['evidence'])-1} services cited, answer qualified: {'website' in a['answer'].lower()}")

# 5. Rendering
print(f"(5) RENDERING: viewport meta: {'viewport' in html}, address renders: {'825 East' in html}")

# 6. Interactive objects
print(f"(6) INTERACTIVE: why-this links: {html.count('why-this')}, ask links: {html.count('/api/ask')}")

# 7. Ask FYD
for q, expect in [("Where is this business located?", "825 East"),
                  ("What are the business hours?", "Mon-Fri"),
                  ("What is the phone number?", "does not establish")]:
    r = post("/api/ask", {"site": SITE, "question": q})
    ok = expect in r["answer"]
    print(f"(7) ASK '{q[:30]}...': {'PASS' if ok else 'FAIL'} (evidence: {len(r['evidence'])})")

# 8. Why This
_, w = get(f"/api/why-this?site={SITE}&objectId=website-business-567c66769fafed6d")
wd = json.loads(w)
print(f"(8) WHY THIS: found={wd['found']}, chain hops={len(wd.get('chain', []))}")

# 9-11. Owner loop
interp = post("/api/owner/interpret", {"site": SITE, "demoOwner": True, "text": "Put Transmissions first"})
print(f"(9-10) INTERPRET: ok={interp.get('ok')}, kind={interp.get('proposal', {}).get('kind')}")
if interp.get("proposal"):
    applied = post("/api/owner/apply", {"site": SITE, "demoOwner": True,
        "proposal": interp["proposal"], "decisionType": "approve",
        "decisionTarget": interp["proposal"]["proposalDigest"]})
    print(f"(11) APPLY: ok={applied.get('ok')}")

print("\n=== METRICS ===")
print(f"Home page size: {len(html)} bytes")
print(f"Services on page: {html.count('Diesel repair')}")
