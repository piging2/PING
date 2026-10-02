#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== DC1: '65-83' outside fixtures/tenant-data (expect zero) ==="
grep -rn "65-83" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__fixtures__" | grep -v "__tests__" | grep -v "fyd-tenant-graph" | head -5
echo "(empty = pass)"