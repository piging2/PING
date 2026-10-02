#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== where is SCHEMA_ROLES defined ====="
grep -rn "export const SCHEMA_ROLES\|export const KNOWLEDGE_WEBSITE" --include="*.ts" src | head
echo
echo "===== eligibility.ts around line 46 ====="
sed -n '1,120p' src/fyd/builder/eligibility.ts
