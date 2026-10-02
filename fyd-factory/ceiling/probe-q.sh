#!/bin/bash
# F5-CEILING probe Q: how render-model resolves section queries
set -e
cd /home/nolan/projects/ping
grep -n "query.kind\|case \"" src/fyd/sitespec/render-model.ts | head -20
echo "---"
sed -n '/function resolveObjects\|const resolveObjects/,+45p' src/fyd/sitespec/render-model.ts | head -60
