 .pg-desi ed = e.get("event_data", {})
    print(eid, e["event_type"], e.get("timestamp"), str(ed)[:160].replace("\n", " "))

# classify J3 uniques: synthetic/test markers?
print("--- J3 unique type counts (done above); test-marker scan ---")
testy = 0
for eid in u3:
    e = data["J3"]["ids"][eid]
    blob = json.dumps(e)
    if any(k in blob for k in ("test", "probe", "synthetic", "dry_run", "example", "demo", "staging")):
        testy += 1
print("J3 uniques with test/synthetic-ish markers:", testy, "of", len(u3))

# implementation worker's claimed probe
probe = "mc-d-e4d688f01c91"
for n in ("J1", "J2", "J3"):
    print("probe %s in %s: %s" % (probe, n, probe in data[n]["ids"]))
gn-hero-mark .pg-symbol-base { stroke-width: 3.3; }
