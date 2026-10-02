#!/usr/bin/env bash
# check: gateway-health — docker health status must be healthy AND /health must return 200.
# Baseline OPS-002/003 (2026-09-24): healthy within 10s of start, restart recovery 21s.
#
# Semantics (Nolan 2026-09-27): UNKNOWN is a legitimate state. The remote
# script prints SENTINEL=ORACLE_OK as its first line; a missing sentinel
# means the script never executed on the Oracle host, so the failure is a
# transport/host UNKNOWN (typed reason), NEVER "container missing". Container
# claims are made only when the probe reached the host authority and
# observed docker directly.
set -u
. "$(dirname "$0")/lib.sh"
. "$(dirname "$0")/gateway-classify.sh"

OUT_F="/tmp/gw-health.$$.out"; ERR_F="/tmp/gw-health.$$.err"
trap 'rm -f "$OUT_F" "$ERR_F"' EXIT

run_remote2 "$GW_REMOTE_FULL" "$ERR_F" >"$OUT_F"
# rc deliberately not fail-closed on: a nonzero ssh rc with a valid sentinel
# still carries observations (e.g. curl failed but inspect ran).

GW_SENTINEL=""
[ "$(grep -c '^SENTINEL=ORACLE_OK$' "$OUT_F" 2>/dev/null)" -ge 1 ] && GW_SENTINEL="ORACLE_OK"
GW_INSPECT="$(sed -n 's/^inspect=//p' "$OUT_F" 2>/dev/null | head -n 1)"
GW_INSPECT_ERR="$(sed -n 's/^inspect_err=//p' "$OUT_F" 2>/dev/null | head -n 1)"
GW_CURL="$(sed -n 's/^curl=//p' "$OUT_F" 2>/dev/null | head -n 1)"
GW_BODY="$(sed -n 's/^body=//p' "$OUT_F" 2>/dev/null | head -n 1)"

if [ -z "$GW_SENTINEL" ]; then
  # Transport/host failure typing from the single probe's stderr only; no
  # additional probes (Nolan 2026-09-27).
  type_transport_from_stderr "$ERR_F"
fi

gateway_classify
emit gateway-health "$GW_STATUS" "class=${GW_CLASS} ${GW_DETAIL}"
exit "$GW_EXIT"
