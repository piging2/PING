#!/bin/bash
echo "=== composeObjectView signature + contact construction ==="
grep -n -A 40 'export function composeObjectView' /home/nolan/projects/ping/src/fyd/object/view.ts | head -70
echo "=== hostile fixture shape (first 1200 chars) ==="
for f in /home/nolan/fyd-compile-harness/fixtures/shard/hostile-*.json; do echo "--- $f"; head -c 1200 "$f"; echo; break; done
echo "=== object corpus listing ==="
ls /home/nolan/fyd-factory-shard2/corpus/ 2>/dev/null
find /home/nolan/fyd-factory-shard2/corpus/fixtures -name '*.json' 2>/dev/null | wc -l
echo "=== one object fixture shape ==="
for f in /home/nolan/fyd-factory-shard2/corpus/fixtures/*/*.json; do echo "--- $f"; head -c 600 "$f"; echo; break; done
