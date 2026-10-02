#!/usr/bin/env python3
"""Convert a raw x-probe-discover.sh output file into the x-candidates file format.

Usage: x-probe-to-candidates.py <probe-raw.json> <x-candidates-<ts>.json>
Reads {"results":[{"account","url","posted_at"}]}, dedups by canonical post URL,
normalizes to https://x.com/<handle-no-at>/status/<id>, keeps only results with
a posted_at (the probe already scopes to owner posts within the window).
Output: {"candidates":[{"account":"@handle","url":"..."}]}
"""
import json, re, sys

def main():
    raw_path, out_path = sys.argv[1], sys.argv[2]
    raw = json.load(open(raw_path))
    results = raw.get("results", []) if isinstance(raw, dict) else []
    seen = set()
    candidates = []
    for r in results:
        url = (r.get("url") or "").strip()
        m = re.match(r"^https://x\.com/([^/]+)/status/(\d+)$", url)
        if not m:
            continue
        handle, sid = m.group(1).lstrip("@"), m.group(2)
        canon = f"https://x.com/{handle}/status/{sid}"
        if canon in seen:
            continue
        seen.add(canon)
        candidates.append({"account": f"@{handle}", "url": canon})
    json.dump({"candidates": candidates}, open(out_path, "w"), indent=1)
    print(f"converted {len(results)} probe results -> {len(candidates)} candidates -> {out_path}")

if __name__ == "__main__":
    main()
