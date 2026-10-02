#!/bin/bash
# LANE BCQ: inspect existing adapter surface for duplication risk (read-only)
set -u
WT=/home/nolan/projects/ping-bcq-substrate
echo "=== src/fyd/adapters ==="
ls -R "$WT/src/fyd/adapters" 2>/dev/null | head -30
echo "=== acquisition-adapter head ==="
head -40 "$WT/src/fyd/acquisition/acquisition-adapter.ts"
echo "=== tsconfig paths ==="
grep -n '"paths"' -A 10 "$WT/tsconfig.json" | head -15
echo "=== test runner ==="
grep -n '"test"\|"typecheck"\|"type-check"' "$WT/package.json" | head -5
