#!/bin/bash
# AGENT-17 probe 10: frontend->API call graph + ask duplication (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== fetch('/api occurrences in non-route src ==="
grep -rhoP 'fetch\(\s*[`'"'"'"]/api/[a-z0-9/\-_\[\]]*' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api' | sort | uniq -c | sort -rn | head -50
echo ""
echo "=== string literal /api/ references (non-fetch, non-route) ==="
grep -rhoP '["'"'"'`]/api/[a-z0-9/\-_\[\]]+' src --include='*.ts' --include='*.tsx' | grep -v 'src/app/api' | sort -u | head -60
echo ""
echo "=== ask-object-panel calls which API ==="
grep -n 'api/' src/fyd/ui/ask-object-panel.tsx | head
echo "=== SiteClient / sites _shared calls ==="
ls src/app/sites/_shared/ 2>/dev/null
grep -rn 'api/' src/app/sites/_shared/*.tsx 2>/dev/null | head
