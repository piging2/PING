#!/bin/bash
cd /home/nolan/projects/ping
echo "--- temp file present? ---"
ls src/fyd/ask/__tests__/night-hostile-eval.test.ts 2>&1
echo "--- SCHEMA_ROLES cycle ---"
grep -n "SCHEMA_ROLES" src/fyd/components/registry.ts | head -3
grep -n "SCHEMA_ROLES" src/fyd/sitespec/schemas.ts | head -5
grep -n "^import\|from \"./registry\"\|from \"../components/registry\"" src/fyd/sitespec/schemas.ts | head -10
grep -n "import" src/fyd/components/registry.ts | head -10
echo "--- dirty count ---"
git status --porcelain | wc -l
