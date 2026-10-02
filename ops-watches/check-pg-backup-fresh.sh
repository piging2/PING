#!/usr/bin/env bash
# check: pg-backup-fresh — newest pg dump < 26h old, sha256 sidecar present, timer enabled.
# Baseline OPS-004 (2026-09-24): daily 03:30 UTC, custom format, atomic move, 7-day retention.
MAXAGE=93600  # 26h
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
newest=$(ls -1t /opt/ping/backups/ping-postgres-*.dump 2>/dev/null | head -1)
if [ -n "$newest" ]; then
  age=$(( $(date +%s) - $(stat -c %Y "$newest") ))
  size=$(stat -c %s "$newest")
  [ -f "$newest.sha256" ] && sidecar=yes || sidecar=no
  base=$(basename "$newest")
else
  age=-1; size=0; sidecar=no; base=NONE
fi
timer=$(systemctl is-enabled pg-backup.timer 2>/dev/null || echo unknown)
echo "age=$age size=$size sidecar=$sidecar timer=$timer base=$base"
EOF
)
OUT="$(run_remote "$REMOTE")"
fail_unknown_unless_sentinel pg-backup-fresh "probe transport failed; backup freshness UNKNOWN, not proven fresh or missing" "$OUT"
eval "$(strip_sentinel "$OUT")"
DETAIL="newest=${base} age_s=${age} sidecar=${sidecar} timer=${timer}"
if [ "$age" = "-1" ]; then
  emit pg-backup-fresh CRIT "no postgres backup found in /opt/ping/backups. $DETAIL"; exit 2
fi
if [ "$timer" != "enabled" ]; then
  emit pg-backup-fresh CRIT "pg-backup.timer not enabled (${timer}). $DETAIL"; exit 2
fi
if [ "$age" -gt "$MAXAGE" ]; then
  emit pg-backup-fresh WARN "newest backup older than 26h. $DETAIL"; exit 1
fi
if [ "$sidecar" != "yes" ]; then
  emit pg-backup-fresh WARN "newest backup lacks sha256 sidecar. $DETAIL"; exit 1
fi
emit pg-backup-fresh OK "backup fresh with sidecar, timer enabled. $DETAIL"; exit 0
