#!/bin/bash
# Full FYD lane loop: every jest.config.cjs under src/fyd. Safety net for
# cross-lane breakage. Records per-lane suite/test counts.
set -u
REPO=/home/nolan/projects/ping
OUT=/home/nolan/fyd-factory-patches/full-loop.txt
TMP=/home/nolan/fyd-factory-patches/loop-tmp.txt
cd $REPO
echo "=== FULL LOOP $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > $OUT
for cfg in $(find src/fyd -name jest.config.cjs | sort); do
  lane=$(dirname $cfg | sed -e 's|src/fyd/||')
  npx jest --config $cfg --ci > $TMP 2>&1
  tests=$(grep -e '^Tests:' $TMP | head -1)
  suites=$(grep -e '^Test Suites:' $TMP | head -1)
  fails=$(grep -c -e '^FAIL' $TMP || true)
  echo "$lane | $suites | $tests | fail_suites=$fails" >> $OUT
done
echo "=== END FULL LOOP ===" >> $OUT
echo DONE
