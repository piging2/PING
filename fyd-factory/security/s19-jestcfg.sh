#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== jest configs in repo ==="
find . -name 'jest.config*' -not -path '*/node_modules/*' | head -20
echo "=== components test config (if any) ==="
find src/fyd/components -name '*.cjs' -o -name 'jest*' | head
echo "=== root jest config ==="
cat jest.config.cjs 2>/dev/null || cat jest.config.js 2>/dev/null || echo "no root jest config"
echo "=== how components tests declare css handling ==="
grep -rn 'moduleNameMapper\|identity-obj-proxy\|css' src/fyd/components/jest* 2>/dev/null | head; find src/fyd -name 'jest.config.cjs' | head
