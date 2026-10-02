#!/bin/bash
set -u
cd /home/nolan/projects/ping
python3 - <<'EOF'
import re
src = open('src/fyd/proceduralize/__fixtures__/happy-place-graph.ts').read()
m = re.search(r'"id": "website-business-6fa5ebd99d72c4cb-location".*?"fields": \{(.*?)\n      \},', src, re.S)
print(m.group(1)[:600] if m else "no match")
EOF
