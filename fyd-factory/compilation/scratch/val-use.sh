#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "validateSiteSpec(" src --include=*.ts -B3 | grep -v test | head -20
echo ===
grep -rn "validateSiteSpec" src/fyd/sitespec/__tests__/validator.test.ts | head -5
sed -n '1,40p' src/fyd/sitespec/__tests__/validator.test.ts
