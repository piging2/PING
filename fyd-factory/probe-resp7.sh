#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== fyd-rail-auto-trigger source ==="
grep -rln "fyd-rail-auto-trigger" src/ | head -5
echo "=== ask-fyd-question source ==="
grep -rln "ask-fyd-question" src/ | head -5
echo "=== object-affordance width context ==="
sed -n '100,140p' src/fyd/components/object-affordance.tsx
