#!/bin/bash
# W4 Audit A - reconnaissance script 1: PING tenant + fixture chain structure
# Read-only. Runs on the Pig against the clean worktree /tmp/w4-audit-ping.
set -u
WT=/tmp/w4-audit-ping
echo "=== 1. tenant dir ==="
ls "$WT/src/fyd/tenant/"
echo "=== 2. acquisition dir ==="
ls "$WT/src/fyd/acquisition/" | head -30
echo "=== 3. app routes (ask/customize/mission-control) ==="
find "$WT/src/app" -maxdepth 3 -type d | head -40
echo "=== 4. PING tenant definition search ==="
grep -rl "ping" "$WT/src/fyd/tenant/" 2>/dev/null | head
echo "=== 5. dogfood render generator ==="
grep -rln "fyd-dogfood-renders\|dogfood-renders" "$WT/src" "$WT/scripts" "$WT/tools" 2>/dev/null | grep -v __tests__ | head -10
echo "=== 6. ask API route ==="
find "$WT/src/app" -path "*ask*" -name "route.ts" | head -10
echo "=== 7. customize / approval routes ==="
find "$WT/src/app" -path "*customize*" -o -path "*approval*" -o -path "*proposal*" | grep -v node_modules | head -20
echo "=== 8. object graph store for ping tenant ==="
ls /home/nolan/ping/var/fyd-ownerloop-projections/
echo "=== 9. intake ==="
ls /home/nolan/projects/ping/var/fyd-intake 2>/dev/null | head; ls "$WT/var/fyd-intake" 2>/dev/null | head
echo "=== 10. journal tail (owner loop) ==="
wc -l /home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl 2>/dev/null
tail -c 1500 /home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl 2>/dev/null
