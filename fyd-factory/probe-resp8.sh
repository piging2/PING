#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== object-rail.tsx ==="
cat src/fyd/components/object-rail.tsx
echo ""
echo "=== ask-fyd-widget.tsx (first 80 lines) ==="
head -80 src/fyd/components/ask-fyd-widget.tsx
