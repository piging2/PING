#!/bin/bash
python3 - <<'EOF'
import json
fs=[json.loads(l) for l in open('/home/nolan/fyd-projection-out/shard-0/findings.jsonl') if l.strip()]
for f in fs:
    if f['signature']=='leak:ask-answers:hidden-address':
        print(json.dumps(f, indent=1)[:1200])
        break
EOF
