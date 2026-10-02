#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== mobile-visibility.test.ts ==="
cat src/fyd/components/__tests__/mobile-visibility.test.ts
echo ""
echo "=== site page files ==="
ls -la src/app/sites/_shared/ src/app/sites/coppersmith-plumbing/ src/app/sites/happy-place/
