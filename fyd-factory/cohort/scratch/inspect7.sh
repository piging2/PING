#!/bin/bash
cd /home/nolan/projects/ping
echo "=== status of exact pipeline files I use ==="
for f in src/fyd/proceduralize/proceduralizer.ts src/fyd/proceduralize/generator.ts src/fyd/proceduralize/structured-data.ts src/fyd/proceduralize/service-cards.ts src/fyd/proceduralize/feed-parser.ts src/fyd/proceduralize/sha256.ts src/fyd/sitespec/validator.ts src/fyd/sitespec/render-model.ts src/fyd/sitespec/types.ts; do
  s=$(git status --porcelain "$f" | head -1)
  echo "${s:-CLEAN} $f"
done
echo "=== generator.ts imports ==="
grep -n "^import\|from \"" src/fyd/proceduralize/generator.ts | head -20
echo "=== proceduralizer.ts relative imports ==="
grep -n "^import\|from \"\./" src/fyd/proceduralize/proceduralizer.ts | head -20
