#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== branch/HEAD ==="
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
echo "=== 4a9cc919 exists? ==="
git log --oneline -1 4a9cc919
echo "=== is it ancestor of HEAD? ==="
git merge-base --is-ancestor 4a9cc919 HEAD && echo YES || echo NO
echo "=== generator.ts:265-295 ==="
sed -n '265,295p' src/fyd/proceduralize/generator.ts
echo "=== 4a9cc919 diff for generator.ts explorePage (first 60 lines) ==="
git show 4a9cc919 --stat | head -30
