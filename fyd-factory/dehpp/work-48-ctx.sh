#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== ctx field reads in renderer ==="
grep -n "ctx\.siteId\|ctx\.now\|ctx\.ownerDecisions" src/fyd/components/renderer.tsx | head
echo ""
echo "=== ownerDecisions usage ==="
grep -rn "ownerDecisions" src/fyd/components/renderer.tsx | head -8
echo ""
echo "=== DisplayMedia import in renderer ==="
grep -n "DisplayMedia" src/fyd/components/renderer.tsx | head -3
