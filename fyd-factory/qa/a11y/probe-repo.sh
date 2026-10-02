#!/bin/bash
# QA-A11Y probe 1: repo state + existing a11y utilities (READ ONLY)
set -u
cd /home/nolan/projects/ping || { echo "NO_REPO"; exit 1; }
echo "=== git branch/status ==="
git branch --show-current
git status --porcelain | head -20
echo "=== a11y keyword search in package.json ==="
grep -il "axe\|pa11y\|lighthouse\|a11y" package.json 2>/dev/null; echo "(exit $?)"
echo "=== dep scan ==="
grep -oiE '"(axe-core|jest-axe|@axe-core/playwright|pa11y|@axe-core/puppeteer|lighthouse|eslint-plugin-jsx-a11y)[^"]*"' package.json 2>/dev/null || echo "no a11y deps in package.json"
echo "=== file scan for a11y utils ==="
grep -rliE "axe|a11y|accessibility" --include="*.ts" --include="*.tsx" --include="*.js" src/ 2>/dev/null | grep -viE "node_modules" | head -30
echo "=== test dirs ==="
ls test* tests __tests__ e2e 2>/dev/null
find src -type d -iname "*a11y*" -o -type d -iname "*access*" 2>/dev/null | head
echo "=== eslint a11y plugin? ==="
ls .eslintrc* eslint.config.* 2>/dev/null
grep -rl "jsx-a11y" .eslintrc* eslint.config.* 2>/dev/null || echo "none"
