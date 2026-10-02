#!/bin/bash
for f in /home/nolan/fyd-compile-harness/results-shard-d.jsonl /home/nolan/fyd-compile-harness/results-shard-i.jsonl /home/nolan/shard15/results.jsonl /home/nolan/shard13/results.jsonl; do
  echo "$f: $(wc -l < $f 2>/dev/null) lines"
done
head -c 400 /home/nolan/fyd-compile-harness/results-shard-d.jsonl 2>/dev/null
echo
echo "=== any app import of compile-harness/shards? ==="
grep -rln -e 'compile-harness\|results-shard\|shard15\|shard13' /home/nolan/projects/ping/src 2>/dev/null | head -5
echo done
