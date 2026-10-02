#!/bin/bash
cd /home/nolan/projects/ping
echo "=== OwnerFieldCorrection full ==="; awk '/interface OwnerFieldCorrection/,/^}/' src/lib/ping/types.ts
echo "=== generator owner pick ==="; sed -n '89,135p' src/fyd/proceduralize/generator.ts
echo "=== renderer imports of react-dom? (harness needs server) ==="; grep -c "window\|document" src/fyd/components/renderer.tsx
