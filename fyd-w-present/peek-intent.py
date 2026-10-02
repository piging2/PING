import json, sys

for name in ("happy-place", "coppersmith-plumbing"):
    path = "/home/nolan/ping/var/fyd-projections/%s.json" % name
    d = json.load(open(path))
    m = d.get("meta", {})
    pi = d.get("presentationIntent")
    n = len(pi["directives"]) if pi and isinstance(pi.get("directives"), list) else 0
    print("==", name)
    print("  siteId:", m.get("siteId"))
    print("  presentationIntentDigest present:", "presentationIntentDigest" in m)
    print("  directives:", n)
    if pi:
        for dd in pi["directives"][:5]:
            si = dd.get("siteIntent", {})
            print("   -", dd.get("intentId"), si.get("kind"), si.get("sectionId"), "toIndex=", si.get("toIndex"))
        print("  provenance:", pi.get("provenance"))
