#!/bin/bash
# Pass 95 (ig-20260921-2301) BROADENED discovery runner.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first,
# then Tier 2). Full breadth (16 queries, all fresh vs passes 93/94).
# Skip list: 222 handles (engaged + no-posts hard-keep + CLI-verified rejects).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260921-2301"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass95-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260921-2300.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["carbondale hvac", "clifton electrician", "loma plumber",
                  "de beque handyman", "collbran plumber", "montrose roofer"],
    "hashtag":   ["#970salon", "#gjbarbershop", "#montrosebarber",
                  "#deltabakery", "#riflesalon"],
    "bizlocal":  ["paonia coffee", "hotchkiss restaurant", "cedaredge salon",
                  "olathe auto repair", "new castle boutique"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig95-discover-{name}-20260921-2301.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig95-discover-$s-20260921-2301.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
