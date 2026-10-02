#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== process.env refs (server code, non-test) ==="
grep -rhoE "process\.env\.[A-Z0-9_]+" src/ scripts/ --include="*.ts" --include="*.tsx" --include="*.mjs" 2>/dev/null | grep -v __tests__ | grep -v "\.test\." | sort | uniq -c | sort -rn | head -40
echo "=== which are read at module top-level of pages/components? ==="
grep -rn "process\.env\." src/fyd/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
