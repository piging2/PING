#!/usr/bin/env python3
"""Q2 independent fork classification (read-only)."""
import json, os, hashlib

paths = {
 "J1": "/home/nolan/projects/ping/data/fyd-journal/events.jsonl",
 "J2": "/home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl",
 "J3": "/home/nolan/workspace/fyd-journal-gateway/events.jsonl",
}
data = {}
for name, p in paths.items():
    ids, types, bad, first, last, lines = {}, {}, 0, None, None, 0
    with open(p) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            lines += 1
            try:
                e = json.loads(line)
                eid = e["event_id"]
                ids[eid] = e
                types[e["event_type"]] = types.get(e["event_type"], 0) + 1
                ts = e.get("timestamp")
                if ts:
                    if first is None or ts < first: first = ts
                    if last is None or ts > last: last = ts
            except Exception:
                bad += 1
    data[name] = dict(ids=ids, types=types, bad=bad, first=first,
                      last=last, size=os.path.getsize(p), lines=lines)

for name in data:
    d = data[name]
    print("%s: lines=%d parse_errors=%d unique_ids=%d dup_ids=%d first=%s last=%s size=%d" % (
        name, d["lines"], d["bad"], len(d["ids"]),
        d["lines"] - len(d["ids"]) - d["bad"], d["first"], d["last"], d["size"]))
    print("  types:", d["types"])

j1, j2, j3 = (set(data[n]["ids"]) for n in ("J1", "J2", "J3"))
u2 = sorted(j2 - j1)
u3 = sorted(j3 - j1 - j2)
u1 = sorted(j1 - j2 - j3)
print("J2 unique vs J1: %d" % len(u2), u2)
print("J3 unique vs J1|J2: %d" % len(u3))
print("J1 unique vs J2|J3: %d" % len(u1), u1[:5])

# content-stability: same ID, different content across journals?
mismatch = 0
for a, b in (("J1", "J2"), ("J1", "J3"), ("J2", "J3")):
    for eid in set(data[a]["ids"]) & set(data[b]["ids"]):
        if json.dumps(data[a]["ids"][eid], sort_keys=True) != json.dumps(data[b]["ids"][eid], sort_keys=True):
            mismatch += 1
            print("MISMATCH", a, b, eid)
print("content mismatches:", mismatch)

# classify J2 uniques
print("--- J2 unique event detail ---")
for eid in u2:
    e = data["J2"]["ids"][eid]
    ed = e.get("event_data", {})
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
