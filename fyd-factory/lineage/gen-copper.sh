#!/bin/bash
cd /home/nolan/projects/ping || exit 1
mkdir -p /home/nolan/lane-lin-out
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/run-tracer.ts \
  --site coppersmith-plumbing \
  --claim "Are you working on new construction for residential homes or commercial buildings?" \
  --question "Tell me about this service." \
  > /home/nolan/lane-lin-out/chain-coppersmith.json 2>/home/nolan/lane-lin-out/copper.err
echo "bytes: $(wc -c < /home/nolan/lane-lin-out/chain-coppersmith.json)"
echo "complete: $(python3 -c "import json;print(json.load(open('/home/nolan/lane-lin-out/chain-coppersmith.json'))['complete'])")"
echo "stages: $(python3 -c "import json;d=json.load(open('/home/nolan/lane-lin-out/chain-coppersmith.json'));print([(l['stage'],l['status']) for l in d['links']])")"
