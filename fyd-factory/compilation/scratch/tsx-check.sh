#!/bin/bash
cd /home/nolan/projects/ping
ls node_modules/.bin/tsx 2>/dev/null && echo TSX_OK || echo NO_TSX
node --version
grep -n "knownSchemas\|SCHEMA_ROLES\|knownSchemas:" src/fyd/sitespec/schemas.ts | head -10
ls node_modules/@/ 2>/dev/null | head -3 || echo no-scoped-at
cat tsconfig.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('compilerOptions',{}).get('paths'))"
