#!/bin/bash
# Pass 94 (ig-20260921-2101) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; Tier 1 first, Tier 2 next). Full breadth
# (16 queries); light mode exited, genuine-empty streak reset by pass 93 (2 landed).
# Skip list: broadened rebuild (202 handles: engaged + no-posts hard-keep).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-2101"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass94-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-2100.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["grand junction electrician", "fruita hvac", "palisade roofer",
                  "delta electrician", "montrose plumber", "rifle electrician"],
    "hashtag":   ["#970electrician", "#gjroofing", "#montroseplumbing",
                  "#deltaelectrician", "#rifleplumber"],
    "bizlocal":  ["fruita coffee", "grand junction auto repair", "palisade salon",
                  "montrose boutique", "delta restaurant"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig94-discover-{name}-20260921-2101.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig94-discover-$s-20260921-2101.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
