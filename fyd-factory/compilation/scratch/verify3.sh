#!/bin/bash
cd /home/nolan/projects/ping
echo "=== tsconfig paths/baseUrl ==="
python3 -c "
import json
d=json.load(open('tsconfig.json'))
co=d.get('compilerOptions',{})
print('baseUrl:', co.get('baseUrl'))
print('paths:', co.get('paths'))
"
echo "=== value (non-type) @/ imports in the pipeline's transitive closure ==="
grep -rn '^import .* from "@/' src/fyd/proceduralize/generator.ts src/fyd/sitespec/validator.ts src/fyd/sitespec/graph.ts src/fyd/sitespec/schemas.ts src/fyd/archetypes/apply.ts 2>/dev/null | grep -v "import type" | head -10
echo "=== all non-type @/ imports under src/fyd/sitespec + proceduralize ==="
grep -rn 'from "@/' src/fyd/sitespec/*.ts src/fyd/proceduralize/*.ts 2>/dev/null | grep -v "import type" | head -10
