#!/bin/bash
# Invariant test: ping-qdrant Docker healthcheck must not false-negative.
# Run on the Pig via: ~/workspace/pig/pigwsl-run.sh "$(cat ~/workspace/connectors/qdrant-healthcheck-invariant.sh)"
# Exit 0 = invariant holds; non-zero = violation (prints which assertion failed).
set -u
C=ping-qdrant
fail() { echo "INVARIANT_VIOLATION: $1"; exit 1; }

echo "== A1: healthcheck test must not reference curl =="
HC_JSON=$(docker inspect $C --format '{{json .Config.Healthcheck.Test}}')
echo "healthcheck test: $HC_JSON"
echo "$HC_JSON" | grep -qi curl && fail "healthcheck still invokes curl: $HC_JSON"
echo OK

echo "== A2: configured probe logic succeeds against live qdrant =="
docker exec $C bash -c 'timeout 5 bash -c '"'"'exec 3<>/dev/tcp/localhost/6333 && printf "GET /healthz HTTP/1.0\r\nHost: x\r\n\r\n" >&3 && head -1 <&3 | grep -q "200 OK"'"'"'' \
  || fail "probe logic failed against live container"
echo OK

echo "== A3: container health status is healthy =="
STATUS=$(docker inspect $C --format '{{.State.Health.Status}}')
echo "status: $STATUS"
[ "$STATUS" = "healthy" ] || fail "status=$STATUS (expected healthy)"
echo OK

echo "== A4: health log shows no exec-not-found streak =="
LOG=$(docker inspect $C --format '{{range .State.Health.Log}}{{.Output}}{{end}}')
echo "$LOG" | grep -q "executable file not found" && fail "health log still shows missing-binary streak"
echo OK

echo "INVARIANT_HOLDS: ping-qdrant healthcheck no longer false-negatives"
