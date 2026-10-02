#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== killtest manifest fixture_path sample ==="
head -1 "$H/queue-killtest/manifest.jsonl" | python3 -c "import json,sys; print(json.load(sys.stdin)['fixture_path'])"
echo "=== killtest result sample outcome ==="
python3 -c "
import json, glob
f = sorted(glob.glob('$H/results-killtest/*.json'))[0]
r = json.load(open(f))
print(r['outcome'], r['harness_version'], (r.get('error_detail') or '')[:120])
print('files:', len(glob.glob('$H/results-killtest/*.json')))
"
echo "=== pilot20 result sample error ==="
python3 -c "
import json, glob
f = sorted(glob.glob('$H/results-pilot20/*.json'))[0]
r = json.load(open(f))
print(r['outcome'], r['failure_stage'], (r.get('error_detail') or '')[:160])
"
