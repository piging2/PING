#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== owner hero override search ==="
grep -rin "ownerHero\|owner-hero\|heroOverride\|ownerSelection\|hero-selection-override" src/fyd --include="*.ts" --include="*.tsx" -l | head
echo "=== synthetic search in fyd ==="
grep -rin "synthetic" src/fyd --include="*.ts" --include="*.tsx" -l | head
echo "=== renderers of hero media ==="
grep -rln "heroMediaFor\|listObjectMedia\|galleryMediaFor" src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "media/" | head
echo "=== scripts/image-pipeline.mjs ==="
ls scripts/image-pipeline.mjs 2>&1
find scripts -iname "*image*" -o -iname "*media*" 2>/dev/null | head
echo "=== circle-background.ts head ==="
head -50 src/fyd/media/circle-background.ts
