#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== lane jest configs ==="
find src/fyd -name "jest.config.cjs" | sort
echo "=== their testMatch ==="
for c in $(find src/fyd -name "jest.config.cjs" | sort); do
  echo "--- $c"
  grep -E "testMatch|testPathPattern" "$c" | head -4
done
