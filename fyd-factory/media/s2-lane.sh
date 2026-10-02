#!/bin/bash
cd /home/nolan/projects/ping || exit 1
for f in types.ts select.ts owner-hero.ts synthetic.ts circle-background.ts; do
  echo "===== src/fyd/media/$f ====="
  cat "src/fyd/media/$f"
  echo
done
