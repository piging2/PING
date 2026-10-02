#!/bin/bash
python3 - <<'PYEOF'
import json
for line in open('/home/nolan/fyd-wave2/out6/results.jsonl'):
    r = json.loads(line)
    if r.get('failure_note') and 'Walkways' in r['failure_note']:
        print(json.dumps(r, indent=1)[:3000])
        break
PYEOF
