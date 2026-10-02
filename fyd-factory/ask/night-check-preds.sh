#!/bin/bash
cd /home/nolan/projects/ping
echo "=== services view predicates ==="
grep -n "offers\|provides" src/fyd/ask/concierge.ts | grep -i "predicat\|===\|includes\|=== \"" | head -20
echo ""
echo "=== claimsServices ==="
grep -n "function claimsServices" -A 30 src/fyd/ask/concierge.ts | head -40
echo ""
echo "=== person predicates (who) ==="
grep -n "employs\|employed_by\|works_for\|works for" src/fyd/ask/concierge.ts | head -10
