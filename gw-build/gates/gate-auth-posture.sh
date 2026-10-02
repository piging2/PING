#!/usr/bin/env bash
# GW-BUILD permanent regression gate: exterior auth posture on the 7 gated routes.
# Provenance: the 2026-09-24 runbook shipped a gateway commit whose HTTP auth
# posture was never a regression gate, so the 401 boundary silently dropped.
# This gate fails closed: every gated route must return 401 without a
# credential and 401 with a wrong credential.
#
# Usage: GW_BASE_URL=http://127.0.0.1:18098 ./gate-auth-posture.sh
# Requires: a running gateway built from the repaired tree (scratch or otherwise).
set -u
BASE="${GW_BASE_URL:-http://127.0.0.1:8080}"
ROUTES=(/events /canonical-events /ingest /orchestration /missions /ai /connectors)
fail=0
echo "auth-posture gate against $BASE"
for r in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$r")
  if [ "$code" = "401" ]; then
    echo "PASS  $r unauthenticated -> 401"
  else
    echo "FAIL  $r unauthenticated -> $code (expected 401)"
    fail=1
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Authorization: Bearer wrong-key-probe" "$BASE$r")
  if [ "$code" = "401" ]; then
    echo "PASS  $r wrong-key -> 401"
  else
    echo "FAIL  $r wrong-key -> $code (expected 401)"
    fail=1
  fi
done
if [ "$fail" = "0" ]; then
  echo "GATE PASS: 7/7 routes deny unauthenticated and wrong-key requests."
else
  echo "GATE FAIL: auth posture broken."
fi
exit "$fail"
