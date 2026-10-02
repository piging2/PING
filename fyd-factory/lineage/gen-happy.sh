#!/bin/bash
cd /home/nolan/projects/ping || exit 1
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/run-tracer.ts \
  --site happy-place \
  --claim "A fence should stay straight, the gate should close without dragging, and it should still look good after a few Oregon winters." \
  --question "What does Happy Place say about fencing?" \
  > /home/nolan/lane-lin-out/chain-happy-place.json 2>/home/nolan/lane-lin-out/happy.err
echo "bytes: $(wc -c < /home/nolan/lane-lin-out/chain-happy-place.json)"
echo "complete: $(python3 -c "import json;print(json.load(open('/home/nolan/lane-lin-out/chain-happy-place.json'))['complete'])")"
echo "stages: $(python3 -c "import json;d=json.load(open('/home/nolan/lane-lin-out/chain-happy-place.json'));print([(l['stage'],l['status']) for l in d['links']])")"
