"""PROD-8: surface orphaned corrections in the customize panel load path. Edit 5: overrides route.ts GET"""

PATH = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/route.ts"

src = open(PATH, encoding="utf-8").read()

# --- import the detector ---
old = 'import { findBusinessObject, rawFieldValue } from "@/fyd/object/owner-overlay";'
new = (
    'import {\n'
    '  detectOrphanedCorrections,\n'
    '  findBusinessObject,\n'
    '  rawFieldValue,\n'
    '} from "@/fyd/object/owner-overlay";'
)
assert src.count(old) == 1, "import anchor not found"
src = src.replace(old, new, 1)

# --- GET response: include orphaned corrections ---
old = """  const history = readOverrides(objectId).history;
  return NextResponse.json({
    ...ctx.responseLabel(),
    ok: true,
    view,
    history,
    siteId: objectId,
  });
}"""
new = """  const history = readOverrides(objectId).history;
  // PROD-8: corrections active in the journal that apply to nothing in
  // the current graph. The customize panel renders these as warnings;
  // they are never silently dropped. Read-only: the journal is untouched.
  const orphanedCorrections = detectOrphanedCorrections(
    projection.graph,
    objectId,
  );
  return NextResponse.json({
    ...ctx.responseLabel(),
    ok: true,
    view,
    history,
    orphanedCorrections,
    siteId: objectId,
  });
}"""
assert src.count(old) == 1, "GET anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("route.ts edited OK")
