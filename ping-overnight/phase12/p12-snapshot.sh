#!/bin/bash
# p12-snapshot.sh — captures pre/post restart persistence evidence.
# Usage: p12-snapshot.sh <label>   (label = pre or post)
# Writes /tmp/phase12/snapshot-<label>.json
# Revision guard lives in knowledge_nodes (node_id 194a2b85bde957ed), not a
# playbook_revisions table; orphan node 4917265ee67e678c likewise.
LBL="$1"
OUT="/tmp/phase12/snapshot-$LBL.json"
PSQL="docker exec -i ping-postgres psql -U ping -d crx_runtime -t -A"
CID() { docker inspect "$1" --format '{{.Id}}' 2>/dev/null; }
CSTAT() { docker inspect "$1" --format '{{.State.Status}}' 2>/dev/null; }
CSTART() { docker inspect "$1" --format '{{.State.StartedAt}}' 2>/dev/null; }

REVSQL="/tmp/phase12/guard-rev.sql"
cat > "$REVSQL" <<'SQLEOF'
SELECT status || '|' || (data->>'version') || '|' || (data->>'decision') || '|' || COALESCE(data->>'decided_by','NULL') FROM knowledge_nodes WHERE node_id = '194a2b85bde957ed';
SQLEOF
ORPHSQL="/tmp/phase12/guard-orph.sql"
cat > "$ORPHSQL" <<'SQLEOF'
SELECT status FROM knowledge_nodes WHERE node_id = '4917265ee67e678c';
SQLEOF
KNODESQL="/tmp/phase12/guard-knode.sql"
cat > "$KNODESQL" <<'SQLEOF'
SELECT status FROM knowledge_nodes WHERE node_id = 'phase12-promote-node-001';
SQLEOF

{
echo "{"
echo "  \"label\": \"$LBL\","
echo "  \"taken_utc\": \"$(date -u +%FT%TZ)\","
echo "  \"containers\": {"
echo "    \"gateway\":   {\"id\": \"$(CID ping-gateway)\", \"status\": \"$(CSTAT ping-gateway)\", \"started\": \"$(CSTART ping-gateway)\"},"
echo "    \"postgres\":  {\"id\": \"$(CID ping-postgres)\", \"status\": \"$(CSTAT ping-postgres)\", \"started\": \"$(CSTART ping-postgres)\"},"
echo "    \"qdrant\":    {\"id\": \"$(CID ping-qdrant)\", \"status\": \"$(CSTAT ping-qdrant)\", \"started\": \"$(CSTART ping-qdrant)\"}"
echo "  },"
echo "  \"counts\": {"
echo "    \"events\": $($PSQL -c 'SELECT count(*) FROM ping_events;'),"
echo "    \"missions\": $($PSQL -c 'SELECT count(*) FROM ping_missions;'),"
echo "    \"knowledge_nodes\": $($PSQL -c 'SELECT count(*) FROM knowledge_nodes;')"
echo "  },"
echo "  \"phase12_events_present\": {"
for k in l1_muse_owner l1_ml2_owner l2_identity l15_probe l6_projection l9_proposal l9_approval l10_replay_event l10_replay_completed l11_replay_event l11_replay_completed l12_witness l13_lineage; do
  ID=$(python3 -c "import json; print(json.load(open('/tmp/phase12/chain.json'))['$k'])")
  EVSQL="/tmp/phase12/ev-$k.sql"
  echo "SELECT count(*) FROM ping_events WHERE event_id = '$ID';" > "$EVSQL"
  N=$($PSQL < "$EVSQL")
  echo "    \"$k\": $N,"
done
echo "    \"_end\": 0"
echo "  },"
echo "  \"phase12_missions\": {"
for k in l6_mission l9_mission l10_mission l11_mission; do
  ID=$(python3 -c "import json; print(json.load(open('/tmp/phase12/chain.json'))['$k'])")
  MSQL="/tmp/phase12/m-$k.sql"
  echo "SELECT status FROM ping_missions WHERE mission_id = '$ID';" > "$MSQL"
  S=$($PSQL < "$MSQL")
  echo "    \"$k\": \"$S\","
done
echo "    \"_end\": \"x\""
echo "  },"
echo "  \"knowledge_node\": \"$($PSQL < "$KNODESQL")\","
echo "  \"revision_guard\": \"$($PSQL < "$REVSQL")\","
echo "  \"orphan_guard\": \"$($PSQL < "$ORPHSQL")\","
echo "  \"gateway_health\": \"$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health)\""
echo "}"
} > "$OUT"
echo "snapshot $LBL written"
cat "$OUT"
