#!/usr/bin/env bash
# check: memory-containment — gateway/postgres/qdrant must each hold a 1GiB ceiling.
# Baseline OPS-003 (2026-09-24): 1073741824 on all three; steady state ~118/36/53 MiB.
# Post-retirement correction (2026-09-30): the Oracle gateway runs again in
# read-only observability mode, so the ceiling check covers all three running
# containers.
set -u
. "$(dirname "$0")/lib.sh"
EXPECTED=1073741824

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
for n in ping-gateway ping-postgres ping-qdrant; do
  m=$(docker inspect -f '{{.HostConfig.Memory}}' "$n" 2>/dev/null || echo MISSING)
  echo "LIMIT $n $m"
done
docker stats --no-stream --format 'USAGE {{.Name}} {{.MemPerc}}' 2>/dev/null
EOF
)
OUT="$(run_remote "$REMOTE")"
# Sentinel first: no sentinel means the remote script never executed, so an
# empty/garbled parse is a transport UNKNOWN, never a memory observation.
if ! grep -q '^SENTINEL=ORACLE_OK$' <<<"$OUT"; then
  emit memory-containment UNKNOWN "probe transport failed; memory ceilings UNKNOWN, not proven intact or drifted"; exit 1
fi
BAD=""; INFO=""
while read -r tag name val; do
  case "$tag" in
    LIMIT)
      if [ "$val" = "$EXPECTED" ]; then INFO="$INFO $name=1GiB"; else BAD="$BAD $name=$val"; fi;;
    USAGE)
      INFO="$INFO $name@$val";;
  esac
done <<<"$OUT"
if [ -n "$BAD" ]; then
  emit memory-containment CRIT "memory ceiling drifted:${BAD} (expected ${EXPECTED} on all three running containers)"; exit 2
fi
emit memory-containment OK "1GiB ceilings intact on all three running containers.${INFO}"; exit 0
