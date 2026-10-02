#!/bin/bash
# LANE-ARCH: exact missing module in refresh tests (read-only)
set -u
cd /home/nolan/projects/ping
timeout 60 node --test src/fyd/refresh/__tests__/diff.test.ts 2>&1 | grep -A6 "ERR_MODULE_NOT_FOUND" | head -20
echo "=== imports of the test file ==="
head -12 src/fyd/refresh/__tests__/diff.test.ts
