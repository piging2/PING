#!/usr/bin/env python3
"""Convert x-probe-discover.sh raw output into the guard candidates file format.

Usage: x-probe-to-candidates.py <probe-raw.json> <candidates-out.json>

Probe raw format: {"results":[{"account","url","posted_at"}, ...]}
Candidates format: [{"account":"@handle","url":"https://x.com/<handle>/status/<id>", ...}]
Prefers the most recent non-ad post per handle, capped at 5 per handle.
"""
import json, re, sys

AD_PATTERNS = [r"\bpromoted\b", r"\bad\b", r"\bsponsored\b"]

def main():
    raw_path, out_path = sys.argv[1], sys.argv[2]
    data = json.load(open(raw_path))
    results = data.get("results", data) if isinstance(data, dict) else data
    seen_urls = set()
    candidates = []
    for r in results:
        url = r.get("url", "")
        account = r.get("account", "").lstrip("@")
        if not url or not account:
            continue
        if not re.search(r"https?://x\.com/[^/]+/status/\d+", url):
            continue
        text = (r.get("text") or "").lower()
        if any(re.search(p, text) for p in AD_PATTERNS):
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)
        candidates.append({
            "account": "@" + account,
            "url": url,
            "posted_at": r.get("posted_at", ""),
            "text": (r.get("text") or "")[:280],
        })
    json.dump(candidates, open(out_path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(candidates)} candidates -> {out_path}")

if __name__ == "__main__":
    main()
