#!/bin/bash
# FIXTURE-SECOND probe: discover fixture schema from existing fixtures (read-only)
cd /home/nolan/projects/ping || exit 1
python3 << 'EOF'
import json, collections

def summarize(path):
    d = json.load(open(path))
    print("=" * 70)
    print("FILE:", path)
    print("TOP KEYS:", list(d.keys()))
    meta = d.get("meta", {})
    print("META:", json.dumps(meta, indent=1)[:600])
    g = d.get("graph", d)
    objs = g.get("objects", [])
    print("OBJECT COUNT:", len(objs))
    by_schema = collections.Counter(o.get("schema") for o in objs)
    print("SCHEMAS:", dict(by_schema))
    print("OBJECT KEYS (union):", sorted(set().union(*(o.keys() for o in objs))))
    field_keys = collections.Counter()
    for o in objs:
        for k in (o.get("fields") or {}).keys():
            field_keys[(o.get("schema"), k)] += 1
    print("FIELDS by (schema, field):")
    for (s, k), c in sorted(field_keys.items()):
        print(f"   {s} :: {k} x{c}")
    print("SAMPLE OBJECT (first, full):")
    print(json.dumps(objs[0], indent=1)[:1500])
    print("PROVENANCE shapes:")
    for o in objs[:6]:
        p = o.get("provenance")
        if p:
            print("  ", o["id"], "->", json.dumps(p)[:200])
            break
    rels = g.get("relationships", [])
    print("REL COUNT:", len(rels))
    print("PREDICATES:", collections.Counter(r.get("predicate") for r in rels))
    print("REL KEYS:", sorted(set().union(*(r.keys() for r in rels))) if rels else [])
    if rels: print("SAMPLE REL:", json.dumps(rels[0], indent=1)[:400])
    # extra top-level sections beyond meta/graph
    for k in d.keys():
        if k not in ("meta", "graph"):
            v = d[k]
            print(f"EXTRA '{k}':", (json.dumps(v)[:400] if not isinstance(v, (str,int)) else v))

for f in ["/home/nolan/ping/var/fyd-projections/happy-place.json",
          "/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json"]:
    summarize(f)
EOF
