#!/bin/bash
H=/home/nolan/fyd-compile-harness
python3 -c "
import json
from collections import Counter
lines = [json.loads(l) for l in open('$H/results-killtest.jsonl')]
print('lines=%d' % len(lines))
c = Counter((l.get('harness_version'), (l.get('pipeline_code_version') or '?')[:12], l.get('dispatch_seq')) for l in lines)
for k, v in sorted(c.items(), key=str): print(k, v)
"
echo "--- killtest jsonl head/tail timestamps ---"
head -1 "$H/results-killtest.jsonl" | python3 -c "import json,sys; print(json.load(sys.stdin)['finished_at'])"
tail -1 "$H/results-killtest.jsonl" | python3 -c "import json,sys; print(json.load(sys.stdin)['finished_at'])"
