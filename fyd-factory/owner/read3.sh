#!/bin/bash
set -e
cd /home/nolan/projects/ping
for f in src/fyd/customize/propose.ts src/fyd/customize/apply-layer.ts src/fyd/customize/server.ts src/fyd/customize/jest.config.cjs; do
  echo "===== $f ====="
  cat "$f"
done
echo "===== customize/__tests__ ====="
ls -la src/fyd/customize/__tests__/
