import json, urllib.request
BASE = "http://172.21.65.209:3105"
def ask(site, q):
    req = urllib.request.Request(BASE + "/api/fyd/ask/" + site,
        data=json.dumps({"question": q}).encode(),
        headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)
for site, q in [
    ("happy-place", "What services does this business offer, and how do you know?"),
    ("coppersmith-plumbing", "What are your business hours?"),
]:
    d = ask(site, q)
    print("SITE:", site, "| class:", d.get("answerClass"), "| state:", d.get("answerState"))
    for cl in d.get("claims") or []:
        print("  |", cl.get("claimClass"), " | ", (cl.get("claim") or "")[:140],
              " | refs:", json.dumps(cl.get("evidenceRefIds")))
