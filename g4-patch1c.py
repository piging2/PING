"""G4 patch 1c: import FYDSchemaRole type for real."""
P = "/home/nolan/projects/ping/src/fyd/sitespec/schemas.ts"
src = open(P).read()
old = 'import { schemaRole } from "./schema-roles";'
new = 'import { schemaRole, type FYDSchemaRole } from "./schema-roles";'
assert src.count(old) == 1, "import pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("type import fixed")
