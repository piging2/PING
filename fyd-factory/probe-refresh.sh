#!/bin/bash
# LANE-ARCH: refresh lane failure names (read-only)
set -u
cd /home/nolan/projects/ping
timeout 90 node --test src/fyd/refresh/__tests__/*.test.ts 2>&1 | grep -E "^(not ok|ok|# (tests|pass|fail))" | head -40
echo "=== failure detail (first) ==="
timeout 90 node --test src/fyd/refresh/__tests__/*.test.ts 2>&1 | grep -B2 -A12 "^not ok" | head -80
