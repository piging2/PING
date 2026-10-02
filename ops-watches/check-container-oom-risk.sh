#!/usr/bin/env bash
# check: container-oom-risk — WARN if any Oracle container exceeds 80% of its 1GiB ceiling.
# Steady state (OPS-003): postgres ~4%, qdrant ~5%. 80% = 819MiB.
# Post-retirement correction (2026-09-30): the gateway runs again in read-only
# observability mode; all three running containers are watched.
WARN_AT=80
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
docker stats --no-stream --format '{{.Name}} {{.MemPerc}}' ping-gateway ping-postgres ping-qdrant 2>/dev/null
EOF
)
OUT="$(run_remote "$REMOTE")"
fail_unknown_unless_sentinel container-oom-risk "probe transport failed; container memory UNKNOWN, not proven healthy or pressured" "$OUT"
WORST=""; STATUS=0; DETAIL=""
while read -r name perc; do
  [ -z "$name" ] && continue
  [ "$name" = "SENTINEL=ORACLE_OK" ] && continue
  p="${perc%\%}"; p="${p%.*}"
  [ -z "$p" ] && continue
  DETAIL="$DETAIL $name=$perc"
  if [ "$p" -ge 95 ]; then STATUS=2; WORST="$WORST $name=$perc"; fi
  if [ "$p" -ge "$WARN_AT" ] && [ "$STATUS" -lt 2 ]; then STATUS=1; WORST="$WORST $name=$perc"; fi
done <<<"$OUT"
case "$STATUS" in
  2) emit container-oom-risk CRIT "memory pressure critical:${WORST}.${DETAIL}"; exit 2;;
  1) emit container-oom-risk WARN "memory above 80% of 1GiB ceiling:${WORST}.${DETAIL}"; exit 1;;
esac
emit container-oom-risk OK "all containers well under 1GiB ceiling.${DETAIL}"; exit 0
