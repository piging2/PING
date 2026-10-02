#!/bin/bash
# p12-appendonly.sh — Phase 12 leg 3: append-only invariant matrix.
# All statements run as role ping (the runtime authority) via docker exec.
# No TRUNCATE is ever issued against live ping_events.
# Token-free; uses only the container-local postgres role.
PASS=0; FAIL=0
ck() { # ck <name> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "[PASS] $1 ($3)"; else FAIL=$((FAIL+1)); echo "[FAIL] $1 expected=[$2] got=[$3]"; fi
}
PSQL="docker exec -i ping-postgres psql -U ping -d crx_runtime -v ON_ERROR_STOP=0 -t -A"
TARGET="c1cb4dbb47939159b195939311502e8bdb811182b9d721097024e1ee5e1056c1"

echo "--- live baseline ---"
C0=$($PSQL -c "SELECT count(*) FROM ping_events;")
T0=$($PSQL -c "SELECT count(*) FROM ping_events WHERE event_id = '$TARGET';")
echo "ping_events=$C0 target_present=$T0"

echo "--- UPDATE denied (live) ---"
U_OUT=$($PSQL -c "UPDATE ping_events SET event_id = event_id WHERE event_id = '$TARGET';" 2>&1)
echo "$U_OUT" | grep -q "append-only: UPDATE not permitted" && UR=denied || UR="unexpected: $U_OUT"
ck "L3 UPDATE denied" "denied" "$UR"

echo "--- DELETE denied (live) ---"
D_OUT=$($PSQL -c "DELETE FROM ping_events WHERE event_id = '$TARGET';" 2>&1)
echo "$D_OUT" | grep -q "append-only: DELETE not permitted" && DR=denied || DR="unexpected: $D_OUT"
ck "L3 DELETE denied" "denied" "$DR"

C1=$($PSQL -c "SELECT count(*) FROM ping_events;")
T1=$($PSQL -c "SELECT count(*) FROM ping_events WHERE event_id = '$TARGET';")
ck "L3 row count unchanged" "$C0" "$C1"
ck "L3 target row intact" "$T0" "$T1"

echo "--- zero-row predicates (documented PG semantics) ---"
Z1=$($PSQL -c "UPDATE ping_events SET event_id = event_id WHERE 1=0;" 2>&1 | tr -d '[:space:]')
Z2=$($PSQL -c "DELETE FROM ping_events WHERE 1=0;" 2>&1 | tr -d '[:space:]')
ck "L3 zero-row UPDATE no-op" "UPDATE0" "$Z1"
ck "L3 zero-row DELETE no-op" "DELETE0" "$Z2"

echo "--- disposable probe table (production config reproduced) ---"
$PSQL -c "DROP TABLE IF EXISTS phase12_probe_events;" > /dev/null 2>&1
$PSQL -c "CREATE TABLE phase12_probe_events (LIKE ping_events INCLUDING ALL);" > /dev/null 2>&1
$PSQL -c "CREATE TRIGGER trg_phase12_append_only BEFORE UPDATE OR DELETE ON phase12_probe_events FOR EACH ROW EXECUTE FUNCTION ping_events_no_mutation();" > /dev/null 2>&1
$PSQL -c "CREATE TRIGGER trg_phase12_append_only_truncate BEFORE TRUNCATE ON phase12_probe_events FOR EACH STATEMENT EXECUTE FUNCTION ping_events_no_mutation();" > /dev/null 2>&1
OWN=$($PSQL -c "SELECT tableowner FROM pg_tables WHERE tablename = 'phase12_probe_events';")
ck "L3 probe owner=ping" "ping" "$OWN"
$PSQL -c "INSERT INTO phase12_probe_events SELECT * FROM ping_events WHERE event_id = '$TARGET' LIMIT 1;" > /dev/null 2>&1
P1=$($PSQL -c "SELECT count(*) FROM phase12_probe_events;")
ck "L3 INSERT works" "1" "$P1"
$PSQL -c "INSERT INTO phase12_probe_events SELECT * FROM ping_events WHERE event_id = '$TARGET' LIMIT 1 ON CONFLICT (event_id) DO NOTHING;" > /dev/null 2>&1
P2=$($PSQL -c "SELECT count(*) FROM phase12_probe_events;")
ck "L3 ON CONFLICT idempotent" "1" "$P2"
PU_OUT=$($PSQL -c "UPDATE phase12_probe_events SET event_id = event_id WHERE event_id = '$TARGET';" 2>&1)
echo "$PU_OUT" | grep -q "append-only: UPDATE not permitted" && PUR=denied || PUR="unexpected"
ck "L3 probe UPDATE denied" "denied" "$PUR"
PD_OUT=$($PSQL -c "DELETE FROM phase12_probe_events WHERE event_id = '$TARGET';" 2>&1)
echo "$PD_OUT" | grep -q "append-only: DELETE not permitted" && PDR=denied || PDR="unexpected"
ck "L3 probe DELETE denied" "denied" "$PDR"
PT_OUT=$($PSQL -c "BEGIN; TRUNCATE phase12_probe_events; ROLLBACK;" 2>&1)
echo "$PT_OUT" | grep -q "append-only: TRUNCATE not permitted" && PTR=denied || PTR="unexpected: $(echo "$PT_OUT" | head -2)"
ck "L3 probe TRUNCATE denied" "denied" "$PTR"
P3=$($PSQL -c "SELECT count(*) FROM phase12_probe_events;")
ck "L3 probe row intact after rollback" "1" "$P3"
$PSQL -c "DROP TABLE phase12_probe_events;" > /dev/null 2>&1
PZ=$($PSQL -c "SELECT count(*) FROM pg_tables WHERE tablename = 'phase12_probe_events';")
ck "L3 probe table dropped" "0" "$PZ"

echo "APPENDONLY DONE pass=$PASS fail=$FAIL"
[ "$FAIL" = "0" ]
