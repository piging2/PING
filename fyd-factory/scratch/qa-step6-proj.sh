#!/bin/bash
cd /home/nolan/projects/ping
echo "=== PingObject provenance type ==="
grep -n "provenance" src/lib/ping/types.ts | head -20
echo ""
echo "=== projection dir on Pig ==="
ls -la /home/nolan/ping/var/fyd-projections/ 2>&1 | head -20
echo ""
echo "=== dump tool ==="
ls /home/nolan/ping/tools/fyd-site-projection/ 2>&1
