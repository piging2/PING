"""G4 patch 1b: schemas.ts needs a real import of schemaRole.

`export { schemaRole } from "./schema-roles"` is a re-export only; it
does not bind schemaRole in module scope. capabilityOptionsForSchema
uses it, so add an explicit import.
"""
P = "/home/nolan/projects/ping/src/fyd/sitespec/schemas.ts"
src = open(P).read()
old = 'import { componentsForSchema } from "../components/registry";'
new = ('import { componentsForSchema } from "../components/registry";\n'
       'import { schemaRole } from "./schema-roles";')
assert src.count(old) == 1
src = src.replace(old, new)
open(P, "w").write(src)
print("import fixed")
