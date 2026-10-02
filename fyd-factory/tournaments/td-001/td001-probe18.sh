#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== when was the eligibleComponents filter added to explorePage ====="
git log --oneline -S 'eligibleComponents(s).includes("ObjectFeed")' -- src/fyd/proceduralize/generator.ts
echo
echo "===== git show that commit (stat + diff of explorePage) ====="
C=$(git log --format=%H -S 'eligibleComponents(s).includes("ObjectFeed")' -- src/fyd/proceduralize/generator.ts | head -1)
echo "commit=$C"
git show --stat "$C" | head -20
echo "--- explorePage before that commit ---"
git show "$C^:src/fyd/proceduralize/generator.ts" | sed -n '/EXPLORE/,/^}/p' | head -40
