#!/bin/bash
set -u
WT=/home/nolan/projects/ping-bcq-substrate
cat "$WT/src/fyd/adapters/activitypub/jest.config.cjs"
echo "==="
grep -n '"jest"' -A 25 "$WT/package.json" | grep -v '^11\|^12\|^13\|^14\|^15\|^16\|^17\|^18\|^19' | head -30
echo "=== root jest config files ==="
ls "$WT"/jest* 2>/dev/null; find "$WT" -maxdepth 1 -name "*.cjs" -o -maxdepth 1 -name "jest*" | head
