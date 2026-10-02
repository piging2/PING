import json, urllib.request

BASE = "http://127.0.0.1:3101"

def post(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)

# 1. Interpret: plain English -> structured proposal
interp = post("/api/owner/interpret", {
    "site": "wicked-wrench",
    "demoOwner": True,
    "text": "Feature Diesel repair",
})
print("interpret ok:", interp.get("ok"))
proposal = interp.get("proposal")
print("proposal kind:", proposal.get("kind") if proposal else None)
print("proposalDigest:", (proposal.get("proposalDigest") or "")[:16] if proposal else None)

# 2. Apply: approval -> SiteSpec change
if proposal:
    applied = post("/api/owner/apply", {
        "site": "wicked-wrench",
        "demoOwner": True,
        "proposal": proposal,
        "decisionType": "approve",
        "decisionTarget": proposal.get("proposalDigest", ""),
    })
    print("apply ok:", applied.get("ok"))
    if not applied.get("ok"):
        print("apply error:", applied.get("error"))
