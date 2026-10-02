#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
for cfg in ask boundary identity net object placement spatial tenant ui wiring; do
  echo "=== $cfg ==="
  node_modules/.bin/jest --config src/fyd/$cfg/jest.config.cjs 2>&1 | grep -e "Tests:" -e "No tests" | head -2
done