#!/bin/bash
# fetch results back; verify line count
wc -l /home/nolan/fyd-shard3/results.jsonl
head -c 600 /home/nolan/fyd-shard3/results.jsonl
echo ""
echo "=== tail ==="
tail -2 /home/nolan/fyd-shard3/results.jsonl | cut -c1-400
