#!/usr/bin/env bash
# r2-run-all.sh: run the full LANE-CHAOS R2 probe suite and collect verdicts.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OVERALL="PASS"
for p in p1 p2 p3 p4 p5 p6; do
  echo "================ $p ================"
  if "$HERE/r2-probe-$p-"*.sh > "$HERE/work-r2/$p-driver.log" 2>&1; then
    echo "$p: driver exit 0"
  else
    echo "$p: driver exit NONZERO"
    OVERALL="FAIL"
  fi
  tail -1 "$HERE/work-r2/$p-driver.log"
done
echo "================ summary ================"
node -e "
const fs = require('fs');
const rows = ['p1','p2','p3','p4','p5','p6'].map(p => {
  try {
    const v = JSON.parse(fs.readFileSync('$HERE/work-r2/' + p + '/verdict.json', 'utf8'));
    return { probe: p, verdict: v.verdict, passed: v.checks_passed, failed: v.checks_failed };
  } catch (e) { return { probe: p, verdict: 'NO_VERDICT', error: String(e.message).slice(0,80) }; }
});
for (const r of rows) console.log(JSON.stringify(r));
const allPass = rows.every(r => r.verdict === 'PASS');
console.log('SUITE: ' + (allPass ? 'PASS' : 'FAIL'));
process.exit(allPass ? 0 : 1);
"
