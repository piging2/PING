#!/bin/bash
C=ping-gateway
echo "=== verdict types in DEPLOYED registry (array scan) ==="
docker exec $C sh -c 'node -e "const r=require(\"/app/gateway/generated/event_registry.json\");const t=new Set(r.events.map(e=>e.event_type));console.log(\"total:\",t.size);[\"REPLAY_COMPLETED\",\"WITNESS_CREATED\",\"WITNESS_REJECTED\",\"LINEAGE_CREATED\",\"JEV_DECISION_EVALUATED\"].forEach(x=>console.log(x, t.has(x)?\"REGISTERED\":\"ABSENT\"))"'
echo "=== deployed bridge map ==="
docker exec $C sh -c 'grep -n "REPLAY_COMPLETED\|WITNESS_CREATE\|WITNESS_CREATED\|LINEAGE_CREATE\|LINEAGE_CREATED" /app/ping-runtime/events/event_to_mission_bridge.js | head -12'
echo "=== deployed replay worker: how does it set verified/fingerprint ==="
docker exec $C sh -c 'grep -n "verified\|fingerprint" /app/ping-runtime/workers/canonical_workers.js | sed -n "1,12p"'
echo "=== rc gateway DB: table counts (separate spine check) ==="
docker exec -u postgres ping-rc-postgres psql -d rc_staging -tAc "SELECT count(*) FROM ping_events;" 2>&1
