#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git branch --show-current
git status --short | head -20
echo "=== grep external_identity ==="
grep -rn "external_identity" --include="*.ts" --include="*.tsx" -l src | head -20
echo "=== grep acceptsSchemas ==="
grep -rn "acceptsSchemas" --include="*.ts" --include="*.tsx" -l src | head -20
echo "=== grep ObjectFeed ==="
grep -rn "ObjectFeed" --include="*.ts" --include="*.tsx" -l src | head -20
