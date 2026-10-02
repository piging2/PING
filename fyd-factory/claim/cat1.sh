#!/bin/bash
cd /home/nolan/projects/ping
for f in src/fyd/claim/index.ts src/fyd/claim/types.ts src/fyd/claim/identity.ts; do
  echo "########## FILE: $f ##########"
  cat "$f"
  echo
done
