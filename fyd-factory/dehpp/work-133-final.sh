#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== tsc ==="
npx tsc --noEmit -p tsconfig.json 2>&1 | head -10
echo "TSC done"
echo "=== all lane suites ==="
TOTAL_P=0; TOTAL_F=0
for cfg in src/fyd/*/jest.config.cjs; do
  lane=$(echo "$cfg" | cut -d/ -f3)
  out=$(node_modules/.bin/jest --config "$cfg" 2>&1 | grep -e "^Tests:")
  echo "$lane: $out"
done