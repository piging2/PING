#!/bin/bash
set -u
DUMP=$(ls -1t /opt/ping/backups/ping-postgres-*.dump | head -1)
DFILE=$(basename "$DUMP")
echo "drill dump: $DFILE size=$(stat -c%s "$DUMP")"
echo "=== live digests (baseline) ==="
LIVE_EV=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT md5(string_agg(t::text, '' ORDER BY event_id)) FROM ping_events t;")
LIVE_MI=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_missions;")
LIVE_KN=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM knowledge_nodes;")
echo "live ping_events md5=$LIVE_EV missions=$LIVE_MI knowledge_nodes=$LIVE_KN"
echo "=== start isolated drill container ==="
T_START=$(date +%s)
docker rm -f pg-restore-drill 2>/dev/null; docker volume rm pgdrilldata 2>/dev/null
docker run -d --name pg-restore-drill \
  -e POSTGRES_USER=ping -e POSTGRES_DB=crx_runtime -e POSTGRES_HOST_AUTH_METHOD=trust \
  -v pgdrilldata:/var/lib/postgresql/data -v /opt/ping/backups:/backups:ro \
  postgres:17-alpine > /dev/null
for i in $(seq 1 30); do
  docker exec pg-restore-drill pg_isready -U ping > /dev/null 2>&1 && break
  sleep 2
done
T_READY=$(date +%s)
echo "drill container ready in $((T_READY-T_START))s"
echo "=== restore (timed) ==="
T_R0=$(date +%s)
docker exec pg-restore-drill pg_restore -U ping -d crx_runtime -j 2 "/backups/$DFILE" 2>&1 | tail -3
echo "restore_exit=$?"
T_R1=$(date +%s)
echo "restore took $((T_R1-T_R0))s"
echo "=== verify ==="
DRILL_EV=$(docker exec pg-restore-drill psql -U ping -d crx_runtime -tAc "SELECT md5(string_agg(t::text, '' ORDER BY event_id)) FROM ping_events t;")
DRILL_MI=$(docker exec pg-restore-drill psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_missions;")
DRILL_KN=$(docker exec pg-restore-drill psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM knowledge_nodes;")
echo "drill ping_events md5=$DRILL_EV missions=$DRILL_MI knowledge_nodes=$DRILL_KN"
MISMATCH=0
[ "$LIVE_EV" = "$DRILL_EV" ] || { echo "MISMATCH ping_events content"; MISMATCH=1; }
[ "$LIVE_MI" = "$DRILL_MI" ] || { echo "MISMATCH ping_missions count"; MISMATCH=1; }
[ "$LIVE_KN" = "$DRILL_KN" ] || { echo "MISMATCH knowledge_nodes count"; MISMATCH=1; }
# full per-table count comparison
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;" | while read -r t; do
  a=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM \"$t\";")
  b=$(docker exec pg-restore-drill psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM \"$t\";")
  [ "$a" = "$b" ] || { echo "COUNT MISMATCH $t live=$a drill=$b"; }
done
echo "table-count sweep done"
T_VERIFY=$(date +%s)
echo "RTO components: container_ready=${T_READY}s restore=${T_R1}s verify=${T_VERIFY}s (epoch deltas below)"
echo "T_START=$T_START T_READY=$T_READY T_R0=$T_R0 T_R1=$T_R1 T_VERIFY=$T_VERIFY"
[ "$MISMATCH" = "0" ] && echo "DRILL RESULT: RESTORE VERIFIED - content identical" || echo "DRILL RESULT: FAILED"
echo "=== destroy drill ==="
docker rm -f pg-restore-drill > /dev/null 2>&1; docker volume rm pgdrilldata > /dev/null 2>&1
docker ps -a | grep -e pg-restore-drill || echo "drill container gone"
docker volume ls | grep -e pgdrilldata || echo "drill volume gone"
