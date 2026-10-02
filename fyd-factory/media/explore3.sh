#!/bin/bash
cd /home/nolan/projects/ping || exit 1
for f in src/fyd/media/discover.ts src/fyd/media/ingest.ts src/fyd/media/select.ts; do
  echo "===== FILE: $f ====="
  cat "$f"
  echo
done
