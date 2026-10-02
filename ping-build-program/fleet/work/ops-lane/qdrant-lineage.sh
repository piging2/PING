#!/bin/bash
curl -s http://127.0.0.1:6333/collections/knowledge/points/scroll -H 'Content-Type: application/json' -d '{"limit":500,"with_payload":true,"with_vector":false}' > /tmp/qpts.json
python3 - << 'PYEOF'
import json, re
d = json.load(open('/tmp/qpts.json'))['result']['points']
print("points:", len(d))
missing_sid = [p['id'] for p in d if not (p.get('payload') or {}).get('source_event_id')]
print("points missing source_event_id:", len(missing_sid))
sids = [(p.get('payload') or {}).get('source_event_id') for p in d]
# derive event uuid: first 32 hex chars of source_event_id, dash-format
uuids = []
for s in sids:
    if not s: continue
    h = re.sub(r'[^0-9a-f]', '', s.lower())[:32]
    uuids.append(f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}")
open('/tmp/lineage_uuids.txt','w').write("\n".join(sorted(set(uuids))))
print("distinct event uuids:", len(set(uuids)))
# embedding field values
from collections import Counter
print("embedding field:", Counter((p.get('payload') or {}).get('embedding') for p in d))
print("model field:", Counter((p.get('payload') or {}).get('model') for p in d))
PYEOF
echo "=== cross-check against ping_events ==="
N=$(wc -l < /tmp/lineage_uuids.txt)
HIT=0
while read -r u; do
  c=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_events WHERE event_id='$u';")
  [ "$c" = "1" ] && HIT=$((HIT+1))
done < /tmp/lineage_uuids.txt
echo "uuids checked=$N matched_in_ping_events=$HIT"
echo "=== sample: does payload text match canonical event payload? ==="
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT left(payload::text,120) FROM ping_events WHERE event_id='046dbd40-9675-6b9f-19ff-ba7e703df691';"
