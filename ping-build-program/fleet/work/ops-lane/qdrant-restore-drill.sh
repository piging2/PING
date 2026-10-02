#!/bin/bash
set -u
SNAP=$(ls -1t /opt/ping/backups/qdrant/knowledge-*.snapshot | head -1)
echo "drill snapshot: $(basename "$SNAP") size=$(stat -c%s "$SNAP")"
echo "=== live baseline: full point-set digest ==="
LIVE_DIGEST=$(curl -s http://127.0.0.1:6333/collections/knowledge/points/scroll -H 'Content-Type: application/json' -d '{"limit":500,"with_payload":true,"with_vector":true}' | python3 -c "
import json,sys,hashlib
d=json.load(sys.stdin)['result']['points']
canon=json.dumps(sorted([(p['id'],p.get('payload'),p.get('vector')) for p in d]), sort_keys=True)
print(hashlib.md5(canon.encode()).hexdigest() + ' n=' + str(len(d)))")
echo "live: $LIVE_DIGEST"
echo "=== start isolated drill container ==="
T_START=$(date +%s)
docker rm -f qdrant-restore-drill 2>/dev/null; docker volume rm qdrantdrill 2>/dev/null
docker run -d --name qdrant-restore-drill -p 127.0.0.1:6339:6333 -v qdrantdrill:/qdrant/storage qdrant/qdrant:v1.7.0 > /dev/null
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:6339/ && break; sleep 2; done
T_READY=$(date +%s); echo "drill ready in $((T_READY-T_START))s"
echo "=== upload snapshot to drill instance ==="
UP=$(curl -s -X POST http://127.0.0.1:6339/collections/knowledge/snapshots/upload -F "snapshot=@$SNAP")
echo "$UP" | head -c 300; echo
echo "=== recover ==="
T_R0=$(date +%s)
NAME=$(basename "$SNAP")
RC=$(curl -s -X POST http://127.0.0.1:6339/collections/knowledge/snapshots/recover -H 'Content-Type: application/json' -d "{\"location\":\"$NAME\"}")
echo "$RC" | head -c 300; echo
# fallback: file placement + file:// location
if echo "$RC" | grep -q '"status":"ok"'; then echo "recover accepted"; else
  echo "trying file-placement fallback"
  docker cp "$SNAP" qdrant-restore-drill:/qdrant/storage/snapshots/knowledge_drill.snapshot
  RC=$(curl -s -X POST http://127.0.0.1:6339/collections/knowledge/snapshots/recover -H 'Content-Type: application/json' -d '{"location":"file:///qdrant/storage/snapshots/knowledge_drill.snapshot"}')
  echo "$RC" | head -c 300; echo
fi
T_R1=$(date +%s); echo "recover took $((T_R1-T_R0))s"
echo "=== verify ==="
sleep 3
DRILL_N=$(curl -s http://127.0.0.1:6339/collections/knowledge | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['points_count'])" 2>/dev/null || echo "no-collection")
echo "drill points_count=$DRILL_N"
if [ "$DRILL_N" = "144" ]; then
  DRILL_DIGEST=$(curl -s http://127.0.0.1:6339/collections/knowledge/points/scroll -H 'Content-Type: application/json' -d '{"limit":500,"with_payload":true,"with_vector":true}' | python3 -c "
import json,sys,hashlib
d=json.load(sys.stdin)['result']['points']
canon=json.dumps(sorted([(p['id'],p.get('payload'),p.get('vector')) for p in d]), sort_keys=True)
print(hashlib.md5(canon.encode()).hexdigest() + ' n=' + str(len(d)))")
  echo "drill: $DRILL_DIGEST"
  [ "${LIVE_DIGEST%% *}" = "${DRILL_DIGEST%% *}" ] && echo "DRILL RESULT: RESTORE VERIFIED - point set identical" || echo "DRILL RESULT: DIGEST MISMATCH"
else
  echo "DRILL RESULT: FAILED (points=$DRILL_N)"
fi
T_VERIFY=$(date +%s)
echo "T_START=$T_START T_READY=$T_READY T_R0=$T_R0 T_R1=$T_R1 T_VERIFY=$T_VERIFY"
echo "=== destroy drill ==="
docker rm -f qdrant-restore-drill > /dev/null 2>&1; docker volume rm qdrantdrill > /dev/null 2>&1
docker ps -a | grep -e qdrant-restore-drill || echo "drill container gone"
docker volume ls | grep -e qdrantdrill || echo "drill volume gone"
