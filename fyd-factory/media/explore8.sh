#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== synthetic mentions ==="
grep -rin "synthetic" src/fyd/ask/visitor-answer.ts src/fyd/builder/object-builder.ts | head -20
echo
echo "=== renderer.tsx hero consumption ==="
grep -n "heroMedia\|Why this\|synthetic" src/fyd/components/renderer.tsx | head -30
echo
echo "=== view.ts media consumption ==="
grep -n "heroMediaFor\|listObjectMedia\|galleryMediaFor" src/fyd/object/view.ts | head
