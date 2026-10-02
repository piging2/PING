#!/usr/bin/env bash
# run-lane1-proof.sh — fail-before / pass-after proof for P0-2 and P0-3.
#
# Builds two distribution snapshots from fixture/source/:
#   snapshot-pass — the complete distribution (what SHOULD have shipped)
#   snapshot-fail — the pruned distribution that Oracle received
#                   (ping-runtime/events/ removed, mirroring FL-20260919-ORACLE-006)
# Then runs the closure checker (P0-3) and the smoke test (P0-2) against both.
#
# Expected results:
#   1. checker on snapshot-fail -> FAIL (REQUIRED_NOT_DISTRIBUTED)
#   2. smoke   on snapshot-fail -> FAIL (Cannot find module .../legacy_ingress_adapter)
#   3. checker on snapshot-pass -> CERTIFIED
#   4. smoke   on snapshot-pass -> SMOKE PASS
#   5. checker with one row removed from classify.json -> FAIL (UNKNOWN blocks certification)
#   6. checker with optional provider pruned -> CERTIFIED with warning (optional stays optional)
#
# No npm install: the fixture is dependency-free by design.
set -u
cd "$(dirname "$0")"

PASS=0; FAIL=0
expect_fail() { # name, command...
  local name="$1"; shift
  if "$@" >/tmp/lane1-out.txt 2>&1; then
    echo "UNEXPECTED PASS: $name"; FAIL=$((FAIL+1));
  else
    echo "expected FAIL ok: $name (exit $?)"; PASS=$((PASS+1));
  fi
}
expect_pass() { # name, command...
  local name="$1"; shift
  if "$@" >/tmp/lane1-out.txt 2>&1; then
    echo "expected PASS ok: $name"; PASS=$((PASS+1));
  else
    echo "UNEXPECTED FAIL: $name (exit $?)"; FAIL=$((FAIL+1));
  fi
}

echo "== assembling snapshots =="
rm -rf fixture/snapshot-pass fixture/snapshot-fail fixture/snapshot-noopt
mkdir -p fixture/snapshot-pass fixture/snapshot-fail fixture/snapshot-noopt
cp -r fixture/source/. fixture/snapshot-pass/
cp -r fixture/source/. fixture/snapshot-fail/
cp -r fixture/source/. fixture/snapshot-noopt/
# The Oracle prune: ping-runtime/events/ absent from the deployment snapshot.
rm -rf fixture/snapshot-fail/ping-runtime/events
# Optional-provider prune: allowed shape, must warn but certify.
rm -rf fixture/snapshot-noopt/gateway/bootstrap/optional
echo "fail snapshot contents:"; find fixture/snapshot-fail -type f | sort
echo

DYN="--dynamic-targets gateway/bootstrap/optional/example_optional_provider.js"

echo "== 1. checker FAIL-BEFORE (pruned snapshot) =="
expect_fail "closure-certify on snapshot-fail" \
  node closure-certify.js --root fixture/source --entrypoints gateway/server.js \
    --snapshot fixture/snapshot-fail --classify fixture/classify.json $DYN
grep -E "DEFECT|FAILED" /tmp/lane1-out.txt | head -6
echo
echo "== 2. smoke FAIL-BEFORE (pruned snapshot) =="
expect_fail "gateway-smoke on snapshot-fail" \
  node gateway-smoke.js --snapshot fixture/snapshot-fail
grep -E "SMOKE|Cannot find module" /tmp/lane1-out.txt | head -6
echo
echo "== 3. checker PASS-AFTER (complete snapshot) =="
expect_pass "closure-certify on snapshot-pass" \
  node closure-certify.js --root fixture/source --entrypoints gateway/server.js \
    --snapshot fixture/snapshot-pass --classify fixture/classify.json $DYN
tail -3 /tmp/lane1-out.txt
echo
echo "== 4. smoke PASS-AFTER (complete snapshot) =="
expect_pass "gateway-smoke on snapshot-pass" \
  node gateway-smoke.js --snapshot fixture/snapshot-pass
cat /tmp/lane1-out.txt
echo
echo "== 5. UNKNOWN classification blocks certification =="
node -e "const m=require('./fixture/classify.json');delete m['ping-runtime/events/ingress_types.js'];require('fs').writeFileSync('/tmp/lane1-classify-nounknown.json',JSON.stringify(m))"
expect_fail "closure-certify with unclassified reachable module" \
  node closure-certify.js --root fixture/source --entrypoints gateway/server.js \
    --snapshot fixture/snapshot-pass --classify /tmp/lane1-classify-nounknown.json $DYN
grep -E "UNKNOWN|FAILED" /tmp/lane1-out.txt | head -4
echo
echo "== 6. optional provider pruned: warns, still certifies =="
expect_pass "closure-certify with optional provider absent" \
  node closure-certify.js --root fixture/source --entrypoints gateway/server.js \
    --snapshot fixture/snapshot-noopt --classify fixture/classify.json $DYN
grep -E "WARN|CERTIFIED" /tmp/lane1-out.txt | head -4
echo
echo "== 7. optional provider misclassified REQUIRED + pruned: fails =="
node -e "const m=require('./fixture/classify.json');m['gateway/bootstrap/optional/example_optional_provider.js']='REQUIRED_RUNTIME';require('fs').writeFileSync('/tmp/lane1-classify-promoted.json',JSON.stringify(m))"
expect_fail "closure-certify with promoted optional provider absent" \
  node closure-certify.js --root fixture/source --entrypoints gateway/server.js \
    --snapshot fixture/snapshot-noopt --classify /tmp/lane1-classify-promoted.json $DYN
grep -E "DEFECT|FAILED" /tmp/lane1-out.txt | head -4

echo
echo "== RESULT: $PASS expectations met, $FAIL violated =="
[ "$FAIL" -eq 0 ]
