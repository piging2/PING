#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
grep -rn "FYDQuery" src/fyd/sitespec/*.ts | grep -v "query:" | head -10
echo "---"
grep -rn "type FYDQuery\|FYDQuery =" src/fyd/ --include="*.ts" | grep -v test | head -5
