#!/usr/bin/env python3
"""Dump one coppersmith service object to find its display name field."""
import json

P = "/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json"
d = json.load(open(P))
for o in d["graph"]["objects"]:
    if o.get("id", "").endswith("-service-139408827c27"):
        print(json.dumps(o, indent=1)[:1200])
        break
