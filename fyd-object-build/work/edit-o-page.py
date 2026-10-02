"""Surgical edit: /o/[objectId]/page.tsx slug loader -> slug-or-ID resolver."""
import sys

p = "src/app/o/[objectId]/page.tsx"
s = open(p).read()

old_import = 'import { loadObjectView } from "@/fyd/object/view";'
new_import = 'import { loadObjectViewBySlugOrId } from "@/fyd/object/by-id";'
assert s.count(old_import) == 1, "import line not found exactly once"
s = s.replace(old_import, new_import)

old_call = "const view = loadObjectView(objectId);"
n = s.count(old_call)
assert n == 2, "expected 2 call sites, found %d" % n
s = s.replace(
    old_call, "const view = loadObjectViewBySlugOrId(objectId)?.view ?? null;"
)

rest = s.replace("loadObjectViewBySlugOrId(", "")
assert "loadObjectView(" not in rest, "stale loadObjectView call remains"

open(p, "w").write(s)
print("EDIT-OK")
