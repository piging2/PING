#!/bin/bash
cd /home/nolan/projects/ping
git status --porcelain -- src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts src/fyd/sitespec/schema-roles.ts src/fyd/object/owner-overlay.ts src/lib/ping/ask-composer.ts src/fyd/ask/context-builder.ts src/fyd/ask/visitor-answer.ts
echo "--- recent mtimes ---"
ls -l --time-style=full-iso src/fyd/sitespec/schemas.ts src/fyd/components/registry.ts src/fyd/sitespec/schema-roles.ts 2>/dev/null | awk '{print $6, $7, $9}'
