#!/bin/bash
cd /home/nolan/projects/ping
sed -n '60,130p' src/app/sites/coppersmith-plumbing/page.tsx
echo "=== happy-place page diff ==="
diff <(sed 's/coppersmith-plumbing/X/g;s/Coppersmith/X/g' src/app/sites/coppersmith-plumbing/page.tsx) <(sed 's/happy-place/X/g;s/Happy Place/X/g' src/app/sites/happy-place/page.tsx) | head -20
echo "=== ping-object-source ==="
ls src/fyd/data/ | head -20
echo "=== proceduralize ==="
ls src/fyd/proceduralize/
