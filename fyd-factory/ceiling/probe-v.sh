#!/bin/bash
# F5-CEILING probe V: FYDQuery reference shape, validator rules, existing reference usage
set -e
cd /home/nolan/projects/ping
grep -n -B3 -A12 '"reference"' src/fyd/sitespec/types.ts | head -40
echo "=== validator on queries ==="
grep -n "reference" src/fyd/sitespec/validator.ts | head
echo "=== existing kind:reference in src (non-test) ==="
grep -rn 'kind: "reference"' src/fyd --include="*.ts" | grep -v __tests__ | head
