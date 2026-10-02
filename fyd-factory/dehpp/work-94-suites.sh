#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
for cfg in builder sitespec components media customize archetypes; do
  echo "=== $cfg ==="
  node_modules/.bin/jest --config src/fyd/$cfg/jest.config.cjs 2>&1 | tail -4
done