#!/usr/bin/env bash
# check: unexpected-listener — WARN if any NEW listening TCP port vs baselines/listeners.json.
# Baseline captured 2026-09-24T12:06:36Z. New listeners may indicate unauthorized exposure.
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
ss -tln | awk 'NR>1{print $4}' | sort -u
EOF
)
RAW="$(run_remote "$REMOTE")"
fail_unknown_unless_sentinel unexpected-listener "probe transport failed; listener set UNKNOWN, not proven changed or clean" "$RAW"
CUR="$(strip_sentinel "$RAW" | grep -v -e '^$')"
NEW="$(echo "$CUR" | python3 "$WATCH_DIR/compare-listeners.py" "$BASELINES/listeners.json")"
if [ "$NEW" != "NONE" ]; then
  emit unexpected-listener WARN "new listening TCP port(s) vs baseline: ${NEW}"; exit 1
fi
emit unexpected-listener OK "no new listening ports; $(echo "$CUR" | wc -l) ports match baseline"; exit 0
