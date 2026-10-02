#!/bin/bash
set -u
cd /home/nolan/projects/ping
git status -sb | head -5
git rev-parse --abbrev-ref HEAD
git log --oneline -3
echo "=== grep ObjectFeed ==="
grep -rln "ObjectFeed" src --include="*.ts" --include="*.tsx" | head -20
echo "=== grep acceptsSchemas ==="
grep -rn "acceptsSchemas" src --include="*.ts" --include="*.tsx" | head -20
echo "=== grep external_identity ==="
grep -rn "external_identity" src --include="*.ts" --include="*.tsx" -l | head -20
echo "=== explore page ==="
grep -rln -i "explore" src --include="*.tsx" | head -20
