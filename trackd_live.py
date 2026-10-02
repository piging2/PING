import json, urllib.request

BASE = "http://172.21.65.209:3105"

def ask(site, question):
    req = urllib.request.Request(
        BASE + "/api/fyd/ask/" + site,
        data=json.dumps({"question": question}).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

CASES = [
    ("happy-place", "What services does this business offer, and how do you know?"),
    ("happy-place", "Do you offer septic tank pumping?"),
    ("coppersmith-plumbing", "What services does this business offer, and how do you know?"),
    ("coppersmith-plumbing", "Do you offer roof replacement?"),
    ("coppersmith-plumbing", "What are your business hours?"),
]

for site, q in CASES:
    print("=" * 78)
    print("SITE:", site, "| Q:", q)
    try:
        d = ask(site, q)
    except Exception as e:
        print("REQUEST FAILED:", e)
        continue
    print("answerClass:", d.get("answerClass"))
    print("answerState:", d.get("answerState"))
    print("refusal:", d.get("refusal"))
    print("has top-level claims:", "claims" in d, "| n claims:", len(d.get("claims") or []))
    print("answer:", (d.get("answer") or "")[:400])
    cits = d.get("citations") or []
    print("n citations:", len(cits))
    for c in cits[:3]:
        print("  citation:", json.dumps(c)[:200])
    for cl in (d.get("claims") or [])[:4]:
        print("  claim:", cl.get("claimClass"), "|", (cl.get("text") or "")[:120],
              "| refs:", [r.get("evidenceRef") for r in (cl.get("evidenceRefs") or [])])
    print("n unknowns:", len(d.get("unknowns") or []))
    print("proposal:", json.dumps(d.get("proposal"))[:160])
print("=" * 78)
print("DONE")
