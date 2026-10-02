#!/bin/bash
# Pass 100 (ig-20260922-1101) BROADENED discovery runner, 11:01 MDT scheduled run.
# The 0901 attempt of pass 100 was aborted mid-discovery (tradecity ran: 0
# candidates; hashtag failed with an empty log; bizlocal never ran). This run
# executes a FULL pass with fresh queries; the 0901 near-misses are folded
# into the new skip list, not re-run.
# Nolan's 2026-09-21 directive (any local business owner with a business account
# eligible, trades stay priority; tiers broaden SLOWLY outward: Tier 1 first).
# Full breadth: genuine-empty streak = 0 (pass 99 SUCCESS_ACTION). 16 fresh
# queries vs passes 96/98/99 and the aborted 0901 partial pass.
# Skip list: 280 handles (ig-skip-list-20260922-0701.json, post pass 99).
# ig-discover.js (fixed 2026-09-21): vetting haystack = handle + header + full
# body-text fallback. Standing Phase-A2: CLI-verify gate-passed handles
# (instagram-cli user-profile country gate, then posts --username for post URL).
set -u
PIGFB="$HOME/workspace/pig-fb"
SRC="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"
TS="20260922-1101"

source "$PIGFB/browser-lock.sh"
browser_lock_acquire ig "ig-pass100-discovery" || { echo "LOCK_FAILED"; exit 2; }
echo "LOCK_HELD"

python3 - "$SRC/ig-skip-list-20260922-0701.json" <<'EOF'
import json, sys
src = sys.argv[1]
skip = json.load(open(src))
strategies = {
    "tradecity": ["rifle electrician", "delta landscaper",
                  "montrose painter", "carbondale roofer",
                  "clifton hvac", "palisade tree service"],
    "hashtag":   ["#970handyman", "#gjroofing", "#montroseplumber",
                  "#deltahvac", "#970painters"],
    "bizlocal":  ["grand junction barber", "delta salon", "montrose coffee",
                  "fruita restaurant", "palisade auto repair"],
}
base = src.rsplit("/", 1)[0]
for name, queries in strategies.items():
    path = f"{base}/ig100-discover-{name}-20260922-1101.json"
    json.dump({"queries": queries, "skip": skip, "maxProfiles": 16}, open(path, "w"))
    print("WROTE", path, len(queries), "queries")
EOF

for s in tradecity hashtag bizlocal; do
  JOB="$SRC/ig100-discover-$s-20260922-1101.json"
  echo "=== START $s ==="
  "$PIGFB/run_ig_discover.sh" "$JOB" > "$JOB.stdout.log" 2>&1
  echo "exit=$? strategy=$s"
  tail -c 400 "$JOB.stdout.log"; echo
done
echo "ALL_STRATEGIES_DONE"
