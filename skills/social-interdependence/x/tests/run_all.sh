#!/usr/bin/env bash
# Run the full x-platform autonomous interdependence test suite.
# Each suite is independent (scratch state per test); run in order.
set -u
cd "$(dirname "$0")"
fail=0
for t in test_01_guard_integration.py test_02_invariants.py \
         test_03_vertical_slice.py test_04_failure_injection.py \
         test_05_adversarial.py test_06_circuit.py \
         test_07_watchdog.py test_08_learner.py; do
  echo "=== $t ==="
  if ! python3 "$t"; then
    echo "SUITE FAILED: $t"
    fail=1
  fi
done
if [ "$fail" -eq 0 ]; then
  echo "ALL SUITES PASSED"
else
  echo "SOME SUITES FAILED"
fi
exit "$fail"
