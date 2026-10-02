#!/bin/bash
# FYD customer-journey attacker lane: regenerate artifacts, then run all hostile suites.
# Exit code = total failed CHECKS (parsed from suite report lines).
set -e
cd "$(dirname "$0")"
bash ./setup.sh > /tmp/fyd-attacker-setup.log 2>&1 || { echo "SETUP FAILED:"; tail -20 /tmp/fyd-attacker-setup.log; exit 99; }
set +e
total_fails=0
for s in suite-ask-evidence suite-classification-boundary suite-hide-override suite-generated-copy suite-route-reduction; do
  out=$(node "$s.mts" 2>&1)
  echo "$out"
  line=$(echo "$out" | grep -E "^-- $s: [0-9]+/[0-9]+ PASS")
  p=$(echo "$line" | sed -E 's/.* ([0-9]+)\/([0-9]+) PASS/\1/')
  n=$(echo "$line" | sed -E 's/.* ([0-9]+)\/([0-9]+) PASS/\2/')
  total_fails=$((total_fails + n - p))
done
echo ""
echo "=== TOTAL FAILED CHECKS: $total_fails ==="
exit $total_fails
