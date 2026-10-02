"""G4 patch 2d: restore locality in the ask-evidence gate (was in pre-G4)."""
P = "/home/nolan/projects/ping/src/fyd/object/view.ts"
src = open(P).read()
old = """  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible) ||
    contact.phone !== null ||
    contact.email !== null ||
    contact.website !== null;"""
new = """  const hasAskEvidence =
    evidence.summary.trim().length > 0 ||
    evidence.services.some((s) => s.visible) ||
    contact.phone !== null ||
    contact.email !== null ||
    contact.website !== null ||
    contact.locality !== null;"""
assert src.count(old) == 1, "ask gate pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("locality restored in ask gate")
