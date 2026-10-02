#!/usr/bin/env bash
# check: qdrant-snapshot-fresh — newest snapshot < 26h old, sha256 sidecar present, timer enabled.
# Baseline OPS-005 (2026-09-24): daily 04:00 UTC, 7-day retention, 144/144 points byte-identical.
MAXAGE=93600  # 26h
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
newest=$(ls -1t /opt/ping/backups/qdrant/knowledge-*.snapshot 2>/dev/null | head -1)
if [ -n "$newest" ]; then
  age=$(( $(date +%s) - $(stat -c %Y "$newest") ))
  size=$(stat -c %s "$newest")
  [ -f "$newest.sha256" ] && sidecar=yes || sidecar=no
  base=$(basename "$newest")
else
  age=-1; size=0; sidecar=no; base=NONE
fi
timer=$(systemctl is-enabled qdrant-snapshot.timer 2>/dev/null || echo unknown)
echo "age=$age size=$size sidecar=$sidecar timer=$timer base=$base"
EOF
)
OUT="$(run_remote "$REMOTE")"
fail_unknown_unless_sentinel qdrant-snapshot-fresh "probe transport failed; snapshot freshness UNKNOWN, not proven fresh or missing" "$OUT"
eval "$(strip_sentinel "$OUT")"
DETAIL="newest=${base} age_s=${age} sidecar=${sidecar} timer=${timer}"
if [ "$age" = "-1" ]; then
  emit qdrant-snapshot-fresh CRIT "no qdrant snapshot found. $DETAIL"; exit 2
fi
if [ "$timer" != "enabled" ]; then
  emit qdrant-snapshot-fresh CRIT "qdrant-snapshot.timer not enabled (${timer}). $DETAIL"; exit 2
fi
if [ "$age" -gt "$MAXAGE" ]; then
  emit qdrant-snapshot-fresh WARN "newest snapshot older than 26h. $DETAIL"; exit 1
fi
if [ "$sidecar" != "yes" ]; then
  emit qdrant-snapshot-fresh WARN "newest snapshot lacks sha256 sidecar. $DETAIL"; exit 1
fi
emit qdrant-snapshot-fresh OK "snapshot fresh with sidecar, timer enabled. $DETAIL"; exit 0
