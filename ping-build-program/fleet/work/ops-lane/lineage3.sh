#!/bin/bash
curl -s http://127.0.0.1:6333/collections/knowledge/points/scroll -H 'Content-Type: application/json' -d '{"limit":500,"with_payload":true,"with_vector":false}' > /tmp/qpts.json
python3 -c "
import json
d = json.load(open('/tmp/qpts.json'))['result']['points']
sids = sorted(set((p.get('payload') or {}).get('source_event_id') for p in d))
sids = [s for s in sids if s]
open('/tmp/sids.txt','w').write('\n'.join(sids))
print('distinct source_event_ids:', len(sids))"
N=$(wc -l < /tmp/sids.txt)
HIT=0; MISS=""
while read -r s; do
  c=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_events WHERE event_id='$s';")
  if [ "$c" = "1" ]; then HIT=$((HIT+1)); else MISS="$MISS $s"; fi
done < /tmp/sids.txt
echo "checked=$N matched_in_ping_events=$HIT"
[ -n "$MISS" ] && echo "missed:$MISS"
echo "=== payload fidelity sample: qdrant text vs canonical event payload ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT event_type, left(payload::text,150) FROM ping_events WHERE event_id='046dbd4096756b9f19ffba7e703df6912793d1c927bb6ad364660803e9ebe4f9';"
