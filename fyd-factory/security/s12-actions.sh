#!/bin/bash
set -u
cd /home/nolan/projects/ping
for f in src/fyd/ui/identity-object.tsx src/fyd/ui/ask-object-panel.tsx src/fyd/ui/object-layer/PeekCard.tsx src/fyd/ui/spatial/spatial-ask-panel.tsx; do
  echo "########## $f ##########"
  grep -n -B6 'action=' "$f" | head -30
done
