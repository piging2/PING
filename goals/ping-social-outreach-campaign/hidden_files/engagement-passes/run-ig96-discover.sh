#!/bin/bash
# Pass 96 (ig-20260922-0102) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first,
# then Tier 2). Full breadth (16 queries, all fresh vs passes 93/94/95).
# Skip list: 234 handles (engaged + no-posts hard-keep + CLI-verified rejects).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-0102"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass96-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-2301.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["palisade hvac", "fruita plumber", "grand junction tree service",
                  "delta roofer", "montrose electrician", "rifle plumber"],
    "hashtag":   ["#gjplumber", "#970roofing", "#deltaplumbing",
                  "#montrosehvac", "#grandjunctionbarber"],
    "bizlocal":  ["rangely cafe", "parachute restaurant", "silt coffee",
                  "eagle salon", "new castle coffee"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig96-discover-{name}-20260922-0102.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig96-discover-$s-20260922-0102.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
