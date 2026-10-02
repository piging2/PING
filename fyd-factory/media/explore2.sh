#!/bin/bash
cd /home/nolan/projects/ping || exit 1
for f in src/fyd/media/types.ts src/fyd/media/safe-fetch.ts src/fyd/media/provenance.ts src/fyd/media/derivatives.ts; do
  echo "===== FILE: $f ====="
  cat "$f"
  echo
done
