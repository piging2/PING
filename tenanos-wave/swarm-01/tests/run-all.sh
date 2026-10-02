#!/bin/bash
# SWARM-01 tenant-isolation test runner.
# The substrate lives on the Pig (/home/nolan/ping); each test is piped to
# `node -` / `python3 -` on stdin. Nothing is written to the Pig.
# Tests are read-only demonstrations: synthetic fixtures, stubbed I/O.
set -u
TDIR="$(cd "$(dirname "$0")" && pwd)"
PIG_SSH="ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes pigwsl"
pass=0; fail=0; harness_err=0
run_node() {
  echo "--- $1 ---"
  out=$($PIG_SSH "wsl -- node -" < "$TDIR/$1" 2>&1); code=$?
  echo "$out"
  if [ $code -eq 2 ]; then harness_err=$((harness_err+1)); echo "HARNESS FAILURE"; return; fi
  if echo "$out" | grep -q "LEAK DEMONSTRATED"; then fail=$((fail+1)); else pass=$((pass+1)); fi
}
for t in t1-namespace-override.js t2-bridge-laundering.js t3-missions-no-tenant.js t4-knowledge-caller-namespace.js t6-mission-control-no-filter.js t7-log-leak.js t8-qdrant-global-collections.js t9-orca-system-namespace.js; do
  run_node "$t"
done
echo "--- t5-mcp-no-tenant.py ---"
out=$($PIG_SSH "wsl -- python3 -" < "$TDIR/t5-mcp-no-tenant.py" 2>&1); code=$?
echo "$out"
if [ $code -eq 2 ]; then harness_err=$((harness_err+1)); else
  if echo "$out" | grep -q "LEAK DEMONSTRATED"; then fail=$((fail+1)); else pass=$((pass+1)); fi
fi
echo "==================================="
echo "BOUNDARY HOLDS: $pass | LEAKS DEMONSTRATED: $fail | HARNESS ERRORS: $harness_err"
echo "(Pre-fix expectation: 9 leaks demonstrated. Post-fix: 9 holds.)"
