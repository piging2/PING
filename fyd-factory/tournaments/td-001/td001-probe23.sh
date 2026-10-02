#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n '1,80p' src/fyd/sitespec/__tests__/validator.test.ts
echo "..."
grep -n "^});\|^describe\|^  test(" src/fyd/sitespec/__tests__/validator.test.ts | head -30
