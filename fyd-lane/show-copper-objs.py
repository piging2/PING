#!/usr/bin/env python3
"""Show coppersmith business phone + service titles from the projection."""
import json

P = "/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json"
d = json.load(open(P))
for o in d["graph"]["objects"]:
    oid = o.get("id", "")
    f = o.get("fields", {})
    if oid.startswith("website-business"):
        print("BIZ:", oid, "phone=", f.get("phone"))
    if "service" in oid and "business" not in oid:
        print("SVC:", oid, repr(f.get("title"))[:60])
