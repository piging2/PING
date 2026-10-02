#!/usr/bin/env python3
"""Show ops of the two unexpected coppersmith JSONL events."""
import json

P = "/home/nolan/projects/ping/data/fyd-journal/events.jsonl"
want = ("fyd-ovl-mufhf8y2", "fyd-ovl-mufhfclg")
for line in open(P):
    e = json.loads(line)
    eid = e["event_id"]
    if eid.startswith(want):
        ed = e["event_data"]
        for o in ed["ops"]:
            print(eid, e["timestamp"], o.get("op"), o.get("intentId"),
                  json.dumps(o.get("siteIntent") or {})[:150])
