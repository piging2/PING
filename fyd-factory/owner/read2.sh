#!/bin/bash
set -e
cd /home/nolan/projects/ping
for f in src/fyd/customize/README.md src/fyd/customize/types.ts src/fyd/customize/intent.ts; do
  echo "===== $f ====="
  cat "$f"
done
