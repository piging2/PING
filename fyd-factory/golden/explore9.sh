#!/bin/bash
cd /home/nolan/projects/ping
echo "=== root package.json scripts ==="
python3 -c "import json; print(json.dumps(json.load(open('package.json')).get('scripts', {}), indent=1))"
echo "=== fyd jest configs ==="
find src/fyd -maxdepth 2 -name "jest.config.cjs" | sort
echo "=== test file counts per fyd area ==="
for d in proceduralize components sitespec builder archetypes customize owner-mode media; do
  n=$(find src/fyd/$d -name "*.test.*" 2>/dev/null | wc -l)
  echo "$d: $n"
done
