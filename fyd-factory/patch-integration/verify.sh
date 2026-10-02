#!/bin/bash
# Per-family verification for patch integration. No commits, no resets.
set -u
REPO=/home/nolan/projects/ping
OUT=/home/nolan/fyd-factory-patches/verify-results.txt
cd $REPO
echo "=== VERIFY RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > $OUT
echo "node: $(node --version) npm: $(npm --version)" >> $OUT
echo "" >> $OUT

run_suite() {
  local lane="$1"; local cfg="$2"
  echo "### $lane" >> $OUT
  echo "cmd: npx jest --config $cfg --ci" >> $OUT
  npx jest --config "$cfg" --ci 2>&1 | grep -e '^Tests:' -e '^Test Suites:' -e '^Time:' -e 'FAIL' >> $OUT
  echo "" >> $OUT
}

run_suite "SEC-FIX boundary (data-boundary + projection-seam gauntlet)" "src/fyd/boundary/jest.config.cjs"
run_suite "SEC-FIX object (view.test.ts covers object/view.ts)" "src/fyd/object/jest.config.cjs"
run_suite "SEC-FIX media (select.test.ts covers media/select.ts)" "src/fyd/media/jest.config.cjs"
run_suite "SEC-FIX sitespec (safe-link.test.ts covers sitespec/safe-link.ts)" "src/fyd/sitespec/jest.config.cjs"
run_suite "CONCIERGE+ASK ask" "src/fyd/ask/jest.config.cjs"
run_suite "RAIL+PHONE-DIAL+VQ components" "src/fyd/components/jest.config.cjs"
run_suite "SYNTH customize" "src/fyd/customize/jest.config.cjs"
run_suite "SYNTH owner-mode" "src/fyd/owner-mode/jest.config.cjs"

echo "### WIRE tsc --noEmit (full repo)" >> $OUT
echo "cmd: npx tsc --noEmit" >> $OUT
TSC_OUT=$(npx tsc --noEmit 2>&1)
TSC_RC=$?
TSC_COUNT=$(echo "$TSC_OUT" | grep -c -e 'error TS' || true)
echo "exit: $TSC_RC | total error lines: $TSC_COUNT" >> $OUT
echo "errors in patch-touched files:" >> $OUT
echo "$TSC_OUT" | grep -e 'error TS' | grep -e 'src/fyd/object/view.ts' -e 'src/app/o/\[objectId\]/page.tsx' -e 'src/fyd/media/select.ts' -e 'src/fyd/boundary/data-boundary.ts' -e 'src/fyd/sitespec/safe-link.ts' -e 'src/fyd/ask/concierge.ts' -e 'src/fyd/ask/answer.ts' -e 'src/fyd/components/renderer.tsx' -e 'src/fyd/components/object-rail.tsx' -e 'src/fyd/object/owner-overlay.ts' -e 'src/fyd/owner-mode/visibility-policy.ts' -e 'src/app/sites/_shared/site-client.tsx' -e 'src/app/sites/coppersmith-plumbing/page.tsx' -e 'src/app/sites/happy-place/page.tsx' -e 'src/fyd/sitespec/sites-render-audit.ts' -e 'src/fyd/sitespec/binding-verifier.ts' -e 'src/fyd/sitespec/graph.ts' >> $OUT || echo "(none)" >> $OUT
echo "" >> $OUT
echo "=== END VERIFY ===" >> $OUT
echo "VERIFY COMPLETE"
