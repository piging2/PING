#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== proceduralize lane (incl. new composition test) ==="
node_modules/.bin/jest --config src/fyd/proceduralize/jest.config.cjs 2>&1 | tail -8