#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== resolveQuery (lines 60-170) ==="
sed -n '60,170p' src/fyd/components/renderer.tsx
echo "=== render-model tests ==="
ls src/fyd/sitespec/__tests__/ 2>/dev/null; find src/fyd -name "*render-model*" -o -name "*render_model*" | grep -v node_modules
