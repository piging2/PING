#!/bin/bash
# catch the final source_event_id (previous loop missed last line: no trailing newline)
LAST=$(python3 -c "
import json
d = json.load(open('/tmp/qpts.json'))['result']['points']
sids = sorted(set((p.get('payload') or {}).get('source_event_id') for p in d))
sids=[s for s in sids if s]
print(sids[-1])")
echo "last sid: ${LAST:0:20}..."
docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT count(*) FROM ping_events WHERE event_id='$LAST';"
echo "=== mem sampler final ==="
wc -l /home/ubuntu/ops-lane-memstats.tsv
tail -3 /home/ubuntu/ops-lane-memstats.tsv
