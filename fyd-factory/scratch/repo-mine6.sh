#!/bin/bash
cd /home/nolan/projects/ping
echo "=== ObjectFeed acceptsSchemas / external_identity in HEAD ==="
grep -rn "external_identity" src/fyd --include='*.ts' --include='*.tsx' 2>/dev/null | head -10
echo "=== git log mentioning ObjectFeed or external_identity ==="
git log --format='%h %ad %s' --date=short -i --grep="ObjectFeed\|external_identity" | head -10
echo "=== fyd-factory diff stat (dirty files, first 40) ==="
git diff --stat | tail -45
echo "=== main..fyd-factory fyd commit count ==="
git rev-list --count main..fyd-factory 2>/dev/null || echo "no main relation"
