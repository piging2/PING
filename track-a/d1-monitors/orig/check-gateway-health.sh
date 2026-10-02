#!/usr/bin/env bash
# check: gateway-health — docker health status must be healthy AND /health must return 200.
# Baseline OPS-002/003 (2026-09-24): healthy within 10s of start, restart recovery 21s.
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
h=$(docker inspect -f '{{.State.Health.Status}} {{.State.Status}} {{.State.StartedAt}}' ping-gateway 2>/dev/null || echo MISSING)
resp=$(curl -s -w '\n%{http_code}' --max-time 10 http://127.0.0.1:8080/health 2>/dev/null || printf '\n000')
c=$(echo "$resp" | tail -n 1)
s=$(echo "$resp" | grep -o '"status":"[a-z]*"' | head -1 | cut -d'"' -f4)
echo "$h"
echo "curl=$c body_status=$s"
EOF
)
OUT="$(run_remote "$REMOTE")"
HEALTH="$(echo "$OUT" | sed -n '1p')"
CURL="$(echo "$OUT" | sed -n '2p' | sed 's/^curl=//;s/ body_status=.*//')"
BODY_STATUS="$(echo "$OUT" | sed -n '2p' | sed 's/.* body_status=//')"
DETAIL="health=${HEALTH} http=${CURL} body=${BODY_STATUS}"
if [ "$HEALTH" = "MISSING" ] || [ -z "$HEALTH" ]; then
  emit gateway-health CRIT "ping-gateway container missing/uninspectable. $DETAIL"; exit 2
fi
case "$HEALTH" in
  healthy*)
    if [ "$CURL" = "200" ] && [ "$BODY_STATUS" = "healthy" ]; then
      emit gateway-health OK "gateway healthy, /health=200 body=healthy. $DETAIL"; exit 0
    else
      emit gateway-health CRIT "docker says healthy but /health body/status degraded (http=${CURL} body=${BODY_STATUS}). $DETAIL"; exit 2
    fi
    ;;
  *)
    emit gateway-health CRIT "gateway not healthy. $DETAIL"; exit 2
    ;;
esac
