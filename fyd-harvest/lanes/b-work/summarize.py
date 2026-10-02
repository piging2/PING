import json
R = json.load(open("/home/nolan/fyd-b-work/reports/pipeline-results.json"))
for s in R:
    print("=" * 24, s["slug"], s.get("error", ""))
    if "error" in s:
        continue
    rep = s["report"]
    print("  htmlBytes=%d facts=%d bySource=%s objs=%d rels=%d droppedRels=%s privWithheld=%d graphNodes=%d" % (
        s["htmlBytes"], rep["factsDiscovered"], rep["factsBySource"],
        rep["objectsGenerated"], rep["relationshipsGenerated"],
        rep.get("droppedRelationships"), rep["privateWithheld"], rep["graphNodesVisited"]))
    uns = {}
    for u in rep["unsupported"]:
        k = u.get("kind", "?")
        uns[k] = uns.get(k, 0) + 1
    print("  unsupported:", uns)
    for o in s["objects"]:
        fkeys = sorted(o["fields"].keys())
        print("  OBJ %-28s title=%-40.40s fields=%s" % (o["schema"], o["title"], fkeys))
    for r in s["relationships"][:10]:
        print("  REL %s --%s--> %s" % (r["subject"], r["predicate"], r["object"]))
    # facts not projected into objects: names by source
    from collections import Counter
    c = Counter((f["name"], f["sourceType"]) for f in s["fields"])
    print("  top facts:", c.most_common(12))
