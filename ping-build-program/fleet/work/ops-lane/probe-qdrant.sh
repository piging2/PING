#!/bin/bash
echo "=== collections ==="
curl -s http://127.0.0.1:6333/collections | head -c 800; echo
echo "=== collection detail ==="
for c in $(curl -s http://127.0.0.1:6333/collections | python3 -c "import json,sys; d=json.load(sys.stdin); print(' '.join(x['name'] for x in d['result']['collections']))" 2>/dev/null); do
  echo "--- $c ---"
  curl -s "http://127.0.0.1:6333/collections/$c" | head -c 500; echo
done
echo "=== sample point payloads (lineage check) ==="
C=$(curl -s http://127.0.0.1:6333/collections | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['collections'][0]['name'])" 2>/dev/null)
curl -s "http://127.0.0.1:6333/collections/$C/points/scroll" -H 'Content-Type: application/json' -d '{"limit":2,"with_payload":true,"with_vector":false}' | head -c 1500; echo
echo "=== mem sampler progress ==="
wc -l /home/ubuntu/ops-lane-memstats.tsv
