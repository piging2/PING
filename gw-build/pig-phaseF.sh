#!/usr/bin/env bash
# GW-BUILD Phase F: scratch-container auth proof against ping-gateway:repair-cert-20260924.
# Test-only keys via env file (shredded after). No production touch.
# Expected: 7 routes 401 unauth + 401 wrong-key; authed GET /events 200;
# namespace tenant::hpp 200, bogus rejected; forged WITNESS_CREATED (authed)
# -> 500 verdict_not_authorized; journal pollution 0.
set -u
IMG=ping-gateway:repair-cert-20260924
NET=gw-build-scratch
PG=gw-build-pg
GW=gw-build-gw
PORT=18098
B=/tmp/gw-build
ENVF=$B/scratch.env
FAIL=0

cleanup() {
  echo "=== cleanup: containers, network, secrets ==="
  docker rm -f "$GW" "$PG" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  if [ -f "$ENVF" ]; then shred -u "$ENVF" 2>/dev/null || rm -f "$ENVF"; fi
  unset K1 || true
  echo "cleanup done"
}
trap cleanup EXIT

echo "=== scratch network + postgres ==="
docker network create "$NET" >/dev/null
PGPW=$(openssl rand -hex 16)
K1=$(openssl rand -hex 32)
K2=$(openssl rand -hex 32)
umask 077
cat > "$ENVF" <<EOF
POSTGRES_USER=gwtest
POSTGRES_PASSWORD=$PGPW
POSTGRES_DB=gwtest
POSTGRES_HOST=$PG
POSTGRES_PORT=5432
MUSE_LEVEL_1_KEY=$K1
MUSE_LEVEL_2_KEY=$K2
NODE_ENV=test
EOF
chmod 600 "$ENVF"
unset PGPW K2
docker run -d --name "$PG" --network "$NET" --env-file "$ENVF" postgres:16-alpine >/dev/null
for i in $(seq 1 30); do
  docker exec "$PG" pg_isready -U gwtest -d gwtest >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$PG" pg_isready -U gwtest -d gwtest || { echo "PG NOT READY"; exit 1; }
echo "postgres ready"

echo "=== launch gateway ($IMG) ==="
docker run -d --name "$GW" --network "$NET" -p 127.0.0.1:$PORT:8080 --env-file "$ENVF" "$IMG" >/dev/null
echo "=== wait for boot: expect 401 on /events ==="
CODE=""
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/events" || true)
  [ "$CODE" = "401" ] && break
  sleep 2
done
echo "boot probe: GET /events -> $CODE"
[ "$CODE" = "401" ] || { echo "BOOT FAIL (no 401)"; docker logs --tail 30 "$GW"; exit 1; }

echo "=== F1. 7 routes: unauthenticated -> 401, wrong-key -> 401 ==="
for r in /events /canonical-events /ingest /orchestration /missions /ai /connectors; do
  c1=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT$r")
  c2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Authorization: Bearer wrong-key-probe" "http://127.0.0.1:$PORT$r")
  ok1="OK"; ok2="OK"
  [ "$c1" = "401" ] || { ok1="FAIL"; FAIL=1; }
  [ "$c2" = "401" ] || { ok2="FAIL"; FAIL=1; }
  echo "$ok1 unauth $r -> $c1 | $ok2 wrong-key $r -> $c2"
done

echo "=== F1b. committed auth-posture gate ==="
GW_BASE_URL="http://127.0.0.1:$PORT" bash "$B/gate-auth-posture.sh" || FAIL=1

echo "=== F2. authenticated GET /events -> 200 ==="
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Authorization: Bearer $K1" "http://127.0.0.1:$PORT/events?limit=1")
echo "authed GET /events -> $c"
[ "$c" = "200" ] || FAIL=1

echo "=== F3. namespace filter ==="
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Authorization: Bearer $K1" "http://127.0.0.1:$PORT/events?namespace=tenant::hpp")
echo "authed GET /events?namespace=tenant::hpp -> $c"
[ "$c" = "200" ] || FAIL=1
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Authorization: Bearer $K1" "http://127.0.0.1:$PORT/events?namespace=bogus")
echo "authed GET /events?namespace=bogus -> $c (must be rejected, non-200)"
[ "$c" != "200" ] || FAIL=1

echo "=== F4. journal baseline ==="
J0=$(docker exec "$PG" psql -U gwtest -d gwtest -tAc "SELECT COUNT(*) FROM ping_events;" 2>&1 || echo "TABLE_ABSENT")
W0=$(docker exec "$PG" psql -U gwtest -d gwtest -tAc "SELECT COUNT(*) FROM ping_events WHERE event_type='WITNESS_CREATED';" 2>&1 || echo "TABLE_ABSENT")
echo "ping_events=$J0 witness_created=$W0"

echo "=== F5. forged WITNESS_CREATED (authed) -> 500 verdict_not_authorized ==="
RESP=$(curl -s --max-time 15 -X POST "http://127.0.0.1:$PORT/events" \
  -H "Authorization: Bearer $K1" -H "Content-Type: application/json" \
  -d '{"event_type":"WITNESS_CREATED","aggregate_id":"probe","aggregate_type":"probe","event_data":{"witness":{"attestation":"forged","timestamp":"2026-09-24T00:00:00Z"}}}' \
  -w '\nHTTP:%{http_code}\n')
echo "$RESP" | tail -3
echo "$RESP" | grep -q "verdict_not_authorized" && echo "verdict_not_authorized PRESENT" || { echo "verdict_not_authorized MISSING"; FAIL=1; }
echo "$RESP" | grep -q "HTTP:500" || { echo "EXPECTED HTTP 500"; FAIL=1; }

echo "=== F6. journal pollution check ==="
sleep 2
J1=$(docker exec "$PG" psql -U gwtest -d gwtest -tAc "SELECT COUNT(*) FROM ping_events;" 2>&1 || echo "TABLE_ABSENT")
W1=$(docker exec "$PG" psql -U gwtest -d gwtest -tAc "SELECT COUNT(*) FROM ping_events WHERE event_type='WITNESS_CREATED';" 2>&1 || echo "TABLE_ABSENT")
echo "before: ping_events=$J0 witness_created=$W0 | after: ping_events=$J1 witness_created=$W1"
if [ "$J0" = "$J1" ] && [ "$W0" = "$W1" ]; then
  echo "POLLUTION 0: forged witness persisted nothing"
else
  echo "POLLUTION DETECTED"; FAIL=1
fi

echo "=== F7. /health (informational) ==="
curl -s -o /dev/null -w 'GET /health -> %{http_code}\n' --max-time 10 "http://127.0.0.1:$PORT/health"

if [ "$FAIL" = "0" ]; then echo "=== PHASE F COMPLETE: ALL PROOFS PASS ==="; else echo "=== PHASE F: FAILURES PRESENT ==="; fi
exit "$FAIL"
