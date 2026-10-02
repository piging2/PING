#!/usr/bin/env bash
# check: restore-drill-stale — WARN if the last PROVEN isolated restore is > 30 days old.
# Initial proven date set 2026-09-24 from OPS-004/OPS-005 evidence. Local-only check.
set -u
. "$(dirname "$0")/lib.sh"

read -r LAST DAYS < <(python3 - "$STATE_FILE" <<'PY'
import json, sys, datetime
s = json.load(open(sys.argv[1]))
last = s["restore_drill"]["last_proven"]
d = (datetime.date.today() - datetime.date.fromisoformat(last)).days
print(last, d)
PY
)
DETAIL="last_proven_restore=${LAST} days_ago=${DAYS}"
if [ "$DAYS" -gt 30 ]; then
  emit restore-drill-stale WARN "isolated restore proof is stale (>30d). Schedule a fresh drill. $DETAIL"; exit 1
fi
emit restore-drill-stale OK "restore proof current (within 30d). $DETAIL"; exit 0
