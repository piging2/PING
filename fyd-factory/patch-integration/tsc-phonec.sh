#!/bin/bash
# tsc error file summary + phonec fixture hunt + full FYD lane loop.
set -u
REPO=/home/nolan/projects/ping
STAGE=/home/nolan/fyd-factory-patches
cd $REPO
echo "=== tsc error files ==="
npx tsc --noEmit > $STAGE/tsc-full.txt 2>&1
grep -e 'error TS' $STAGE/tsc-full.txt | cut -d'(' -f1 | sort | uniq -c | sort -rn > $STAGE/tsc-byfile.txt
cat $STAGE/tsc-byfile.txt
echo ""
echo "=== phonec fixture hunt ==="
grep -rl -e 'phonec' src/fyd --include='*.json' --include='*.ts' 2>/dev/null | head -10
echo ""
echo "=== phonec in renderer tests ==="
grep -rl -e 'phonec' src/fyd/components/__tests__ 2>/dev/null
