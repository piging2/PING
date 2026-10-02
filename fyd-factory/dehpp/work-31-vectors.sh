#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "COPPERSMITH_VECTOR\|PING_DOGFOOD_VECTOR" -A 12 src/fyd/builder/dimensions.ts | head -40
echo ""
echo "=== TenantCategory type? ==="
grep -rn "TenantCategory" src/fyd --include=*.ts | grep -v __tests__ | head -5
