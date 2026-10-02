#!/bin/bash
# LANE-ARCH test baseline: run every FYD lane jest config + refresh node tests (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
OUT=/home/nolan/fyd-baseline.txt
: > "$OUT"
echo "BASELINE RUN $(date -u +%FT%TZ) node $(node --version)" >> "$OUT"
for cfg in $(find src/fyd -name 'jest.config.cjs' | sort); do
  lane=$(dirname "$cfg" | sed 's|src/fyd/||')
  echo "--- LANE: $lane" >> "$OUT"
  start=$(date +%s)
  summary=$(timeout 90 npx jest --config "$cfg" --ci --silent 2>&1 | grep -E "^(Tests|Test Suites|Snapshots):" | tr '\n' ' ')
  rc=$?
  end=$(date +%s)
  echo "rc=$rc secs=$((end-start)) $summary" >> "$OUT"
  if [ $rc -ne 0 ]; then
    timeout 90 npx jest --config "$cfg" --ci --silent 2>&1 | grep -E "✕|✗|●.*›" | head -25 >> "$OUT" || true
  fi
done
echo "--- LANE: refresh (node --test) ---" >> "$OUT"
start=$(date +%s)
timeout 90 node --test src/fyd/refresh/__tests__/*.test.ts 2>&1 | grep -E "^# (tests|pass|fail|cancelled|skipped)" | tr '\n' ' ' >> "$OUT"
end=$(date +%s)
echo "secs=$((end-start))" >> "$OUT"
echo "DONE" >> "$OUT"
cat "$OUT"
