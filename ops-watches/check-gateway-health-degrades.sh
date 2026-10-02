#!/usr/bin/env bash
# check: gateway-health-degrades — consecutive-failure counter; WARN after 2 non-healthy obs.
# State: consecutive_non_healthy in state.json. Healthy obs resets to 0 (no noise).
#
# Typed-class aware (Nolan 2026-09-27): an UNKNOWN probe (transport/host
# failure) HOLDS the counter — it is not a health observation, so it neither
# advances nor resets the trend. Only observed SERVICE_UNHEALTHY /
# SERVICE_UNREACHABLE increment; only observed SERVICE_HEALTHY resets.
set -u
DIR="$(dirname "$0")"
. "$DIR/lib.sh"
. "$DIR/gateway-classify.sh"

OUT_F="/tmp/ghd.$$.out"; ERR_F="/tmp/ghd.$$.err"
trap 'rm -f "$OUT_F" "$ERR_F"' EXIT

run_remote2 "$GW_REMOTE_INSPECT_ONLY" "$ERR_F" >"$OUT_F"

GW_SENTINEL=""
[ "$(grep -c '^SENTINEL=ORACLE_OK$' "$OUT_F" 2>/dev/null)" -ge 1 ] && GW_SENTINEL="ORACLE_OK"
GW_INSPECT="$(sed -n 's/^inspect=//p' "$OUT_F" 2>/dev/null | head -n 1)"
GW_INSPECT_ERR="$(sed -n 's/^inspect_err=//p' "$OUT_F" 2>/dev/null | head -n 1)"
# Degrades cares about the container health word only; /health body detail is
# the sibling check's job. Feed the classifier neutral curl/body so a
# container-level verdict is not distorted.
GW_CURL="200"; GW_BODY="healthy"

if [ -z "$GW_SENTINEL" ]; then
  type_transport_from_stderr "$ERR_F"
fi

gateway_classify
# Map the full taxonomy onto the counter's three moves: HEALTHY -> RESET,
# UNKNOWN classes -> HOLD, UNHEALTHY/UNREACHABLE -> FAIL. gateway_classify
# already guarantees GW_CLASS is one of the typed values.
RESULT="$(python3 "$DIR/degrades-counter.py" "$STATE_FILE" "$GW_CLASS")"
set -- $RESULT
ACTION="$1"; N="$2"; CLASS="${3:-unknown}"
case "$ACTION" in
  RESET)
    emit gateway-health-degrades OK "gateway healthy; consecutive-failure counter reset. class=${CLASS}"; exit 0 ;;
  HOLD)
    emit gateway-health-degrades OK "probe UNKNOWN (${CLASS}); no health observation made, consecutive-failure counter held at ${N}"; exit 0 ;;
  FAIL)
    if [ "$N" -ge 2 ]; then
      emit gateway-health-degrades WARN "gateway non-healthy for ${N} consecutive observations. class=${CLASS}"; exit 1
    fi
    emit gateway-health-degrades OK "first non-healthy observation recorded (counter=1, need 2 for WARN). class=${CLASS}"; exit 0 ;;
  *)
    emit gateway-health-degrades WARN "degrades counter error: ${RESULT}"; exit 1 ;;
esac
