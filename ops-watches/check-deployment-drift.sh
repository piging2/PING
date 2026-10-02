#!/usr/bin/env bash
# check: deployment-drift — WARN if the retired Oracle plane drifts from its
# intended read-only running state (2026-09-30, Nolan's binding decision as
# corrected ~13:25 MDT: running, observable, read-only, zero write authority).
#
# Expected state:
#   - container `ping-gateway` exists, image digest sealed, restart=unless-stopped,
#     status=running
#   - role ping on crx_runtime has default_transaction_read_only=on (write
#     authority removed at the DB boundary)
# Any drift here means the retirement was tampered with (write re-enabled,
# unexpected image, container down).
set -u
. "$(dirname "$0")/lib.sh"

SEALED_IMAGE="sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
echo "gimage=$(docker inspect -f '{{.Image}}' ping-gateway 2>/dev/null || echo GW_MISSING)"
echo "grestart=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' ping-gateway 2>/dev/null || echo GW_MISSING)"
echo "gstatus=$(docker inspect -f '{{.State.Status}}' ping-gateway 2>/dev/null || echo GW_MISSING)"
echo "ronly=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc 'SHOW default_transaction_read_only;' 2>/dev/null || echo QFAIL)"
EOF
)
FIELDS="$(mktemp)"
run_remote "$REMOTE" > "$FIELDS"
# Sentinel first: no sentinel means the remote script never executed, so a
# diff computed over empty transport output would be a false drift claim.
if ! grep -q '^SENTINEL=ORACLE_OK$' "$FIELDS"; then
  rm -f "$FIELDS"
  emit deployment-drift UNKNOWN "probe transport failed; read-only state UNKNOWN, not proven drifted or clean"; exit 1
fi
GIMAGE="$(sed -n 's/^gimage=//p' "$FIELDS" | head -n 1)"
GRESTART="$(sed -n 's/^grestart=//p' "$FIELDS" | head -n 1)"
GSTATUS="$(sed -n 's/^gstatus=//p' "$FIELDS" | head -n 1)"
RONLY="$(sed -n 's/^ronly=//p' "$FIELDS" | head -n 1 | tr -d ' ')"
rm -f "$FIELDS"

DIFFS=""
[ "$GIMAGE" = "GW_MISSING" ] && DIFFS="${DIFFS} ping-gateway container missing;"
[ "$GIMAGE" != "GW_MISSING" ] && [ "$GIMAGE" != "$SEALED_IMAGE" ] && DIFFS="${DIFFS} image=${GIMAGE};"
[ "$GRESTART" != "unless-stopped" ] && [ "$GRESTART" != "GW_MISSING" ] && DIFFS="${DIFFS} restart=${GRESTART};"
[ "$GSTATUS" != "running" ] && [ "$GSTATUS" != "GW_MISSING" ] && DIFFS="${DIFFS} status=${GSTATUS};"
[ "$RONLY" != "on" ] && DIFFS="${DIFFS} default_transaction_read_only=${RONLY};"
if [ -n "$DIFFS" ]; then
  emit deployment-drift WARN "read-only plane config drift vs 2026-09-30 seal:${DIFFS}"; exit 1
fi
emit deployment-drift OK "read-only plane matches 2026-09-30 seal (image digest sealed, restart=unless-stopped, running, writes blocked at DB)"; exit 0
