#!/bin/bash
cd /home/nolan/projects/ping || exit 1
ls src/fyd/lineage 2>&1 | head -3
echo "--- acquisition ---"
ls src/fyd/acquisition
echo "--- object ---"
ls src/fyd/object
echo "--- claim ---"
ls src/fyd/claim
echo "--- ask ---"
ls src/fyd/ask
echo "--- sitespec ---"
ls src/fyd/sitespec
echo "--- evidence-ish ---"
grep -ril "evidence" src/fyd --include="*.ts" -l | grep -vi test | head -20
