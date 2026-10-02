#!/bin/bash
rm -f /home/nolan/projects/ping/src/fyd/customize/__tests__/zz-debug.test.ts
cd /home/nolan/projects/ping
npx jest --config src/fyd/customize/jest.config.cjs 2>&1 | tail -8
echo "=== owner-mode recheck ==="
npx jest --config src/fyd/owner-mode/jest.config.cjs 2>&1 | tail -6
