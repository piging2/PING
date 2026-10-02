#!/usr/bin/env python3
"""Regenerate provisional-vs-curated drops for FB passes 129-139 (rerunnable)."""
import json, os, sys, importlib.util

OUT = os.path.expanduser("~/workspace/outreach")
spec = importlib.util.spec_from_file_location("bfj", os.path.join(OUT, "build-fb-job.py"))
sys.argv = ["build-fb-job.py", "139"]
bfj = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bfj)

PASSES = [129, 130, 132, 133, 134, 135, 136, 137, 138]
all_drops = []
for n in PASSES:
    cands = json.load(open(os.path.join(OUT, f"fb{n}-candidates.json")))
    likes, _ = bfj.build_picks(cands, 75)
    prov_urls = [a["url"] for a in likes]
    curated = json.load(open(os.path.join(OUT, f"fb{n}-curated-job.json")))
    curated_urls = set(a["url"] for a in curated.get("actions", []))
    by_url = {c["url"]: c for c in cands}
    for u in prov_urls:
        if u not in curated_urls and u in by_url:
            c = by_url[u]
            all_drops.append({"pass": n, "url": c.get("url"), "source": c.get("source"),
                              "group": c.get("group"), "author": c.get("author"),
                              "text": c.get("text")})
json.dump(all_drops, open(os.path.expanduser("~/workspace/outreach/fb-drops-129-138.json"), "w"), indent=1)
print("drops:", len(all_drops))
