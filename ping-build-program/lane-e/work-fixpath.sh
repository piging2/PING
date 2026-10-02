#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
p = "src/fyd/components/registry.ts"
s = open(p).read()
old_imp = 'import { SCHEMA_ROLES } from "./schema-roles";'
assert old_imp in s, "import anchor missing"
s = s.replace(old_imp, 'import { SCHEMA_ROLES } from "../sitespec/schema-roles";', 1)
old_doc = " * ./schema-roles (re-exported by ../sitespec/schemas):"
assert old_doc in s, "doc anchor missing"
s = s.replace(old_doc, " * ../sitespec/schema-roles (re-exported by ../sitespec/schemas):", 1)
open(p, "w").write(s)
print("path fix applied")
PYEOF
echo "=== rerun tests ==="
npx vitest run src/fyd/sitespec/__tests__/schemas.test.ts src/fyd/components/__tests__/registry.test.ts src/fyd/components/__tests__/compose.test.ts 2>&1 | tail -12
echo "=== tsc on touched files ==="
npx tsc --noEmit 2>&1 | grep -E "schema-roles|sitespec/schemas|components/registry" | head -20
echo "(blank above = clean)"
