#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo '=== BRANCH ==='
git branch --show-current
echo '=== STATUS COUNT ==='
git status --short | wc -l
echo '=== STATUS (first 40) ==='
git status --short | head -40
echo '=== RECENT LOG ==='
git log --oneline -5
echo '=== TOP DIRS ==='
ls -d src 2>/dev/null && ls src | head -30
echo '=== FYD TREE (2 levels) ==='
ls src/fyd 2>/dev/null | head -40
echo '=== FIXTURE DIRS ==='
find . -maxdepth 3 -iname '*fixture*' -not -path './node_modules/*' 2>/dev/null | head -20
echo '=== SITES ROUTES ==='
ls src/app/sites 2>/dev/null || find src/app -maxdepth 2 -iname '*site*' 2>/dev/null | head
echo '=== PKG SCRIPTS ==='
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,1))" 2>/dev/null | head -30
