#!/bin/bash
cd /home/nolan/projects/ping || exit 1
for f in src/fyd/media/bundle-media.ts src/fyd/media/run-ingest.ts src/fyd/media/jest.config.cjs src/fyd/media/attach.ts; do
  echo "===== FILE: $f ====="
  cat "$f"
  echo
done
echo "===== net/safe-fetch existence ====="
ls -la src/fyd/net/ 2>/dev/null | head -20
