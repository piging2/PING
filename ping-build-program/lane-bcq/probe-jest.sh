#!/bin/bash
set -u
WT=/home/nolan/projects/ping-bcq-substrate
find "$WT" -maxdepth 2 -name "jest.config.*" -not -path "*/node_modules/*" 2>/dev/null
grep -n '"jest"' -A 15 "$WT/package.json" | sed -n '1,20p'
