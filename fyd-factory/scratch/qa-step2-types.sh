#!/bin/bash
cd /home/nolan/projects/ping
for f in src/fyd/claim/types.ts src/fyd/sitespec/types.ts src/fyd/object/types.ts; do
  echo "=================== $f ==================="
  cat "$f"
done
