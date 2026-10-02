#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== fixture object counts ==="
for f in happy-place-graph coppersmith-graph happy-place-rich-graph; do
  p="src/fyd/proceduralize/__fixtures__/$f.ts"
  echo "$f: \"id\"-keys=$(grep -c -e '"id"' "$p")"
done
echo "=== fyd-wave2-clean dir ==="
ls /home/nolan/fyd-wave2-clean/ 2>/dev/null | head -30
find /home/nolan/fyd-wave2-clean -maxdepth 2 -type f 2>/dev/null | head -20
echo "=== wave2 1000-record store hunt ==="
find /home/nolan/fyd-wave2-clean /home/nolan/fyd-compile-harness -maxdepth 3 -type f 2>/dev/null | head -30
find /home/nolan -maxdepth 3 -type f -name '*.jsonl' 2>/dev/null | grep -v -e '.git' | head -20
